import type { Env } from '../contracts/env';
import { verifyGoogleIdToken } from '../auth/google';
import {
  authEnabled,
  clearSessionCookie,
  deleteCurrentSession,
  deleteUserAccount,
  getSessionUser,
  normalizePreferences,
  preferencesJson,
  readCookie,
  rotateSession,
  sessionUserId
} from '../auth/session';

const CSRF_COOKIE = '__Host-voy_csrf';
const NONCE_COOKIE = '__Host-voy_nonce';
const AUTH_BOOTSTRAP_TTL = 10 * 60;
const MAX_AUTH_BODY_BYTES = 10 * 1024;

type JsonRecord = Record<string, unknown>;

function json(body: unknown, status = 200, headersInit: HeadersInit = {}): Response {
  const headers = new Headers(headersInit);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(JSON.stringify(body), { status, headers });
}

function randomToken(bytesLength = 24): string {
  const bytes = new Uint8Array(bytesLength);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function ephemeralCookie(name: string, value: string): string {
  return `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${AUTH_BOOTSTRAP_TTL}`;
}

function clearCookie(name: string): string {
  return `${name}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function appendCookie(headers: Headers, cookie: string): void {
  headers.append('Set-Cookie', cookie);
}

function writeOriginAllowed(request: Request): boolean {
  const expected = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  return origin === expected && (!fetchSite || fetchSite === 'same-origin');
}

async function boundedJson(request: Request): Promise<JsonRecord | null> {
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return null;
  const declared = request.headers.get('Content-Length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_AUTH_BODY_BYTES)) return null;
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_AUTH_BODY_BYTES) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
  } catch {
    return null;
  }
}

function exactKeys(value: JsonRecord, allowed: readonly string[]): boolean {
  const expected = new Set(allowed);
  return Object.keys(value).every(key => expected.has(key)) && allowed.every(key => key in value);
}

function csrfMatches(request: Request, bodyToken: unknown): boolean {
  const cookie = readCookie(request, CSRF_COOKIE);
  return typeof bodyToken === 'string' && bodyToken.length >= 16 && bodyToken.length <= 256 && cookie === bodyToken;
}

function disabledSession(): Response {
  return json({ ok: true, enabled: false, authenticated: false, provider: null, persistent_account: false, trip_history_persisted: false });
}

async function upsertGoogleUser(env: Env, sub: string, now: number): Promise<string> {
  if (!env.DB) throw new Error('auth_not_configured');
  const existing = await env.DB.prepare("SELECT id FROM voy_users WHERE provider = 'google' AND provider_sub = ?")
    .bind(sub)
    .first<Record<string, unknown>>();
  if (existing?.id) {
    const id = String(existing.id);
    await env.DB.prepare('UPDATE voy_users SET updated_at = ?, last_login_at = ? WHERE id = ?').bind(now, now, id).run();
    return id;
  }
  const id = `usr_${randomToken(18)}`;
  try {
    await env.DB.prepare(`
      INSERT INTO voy_users (id, provider, provider_sub, preferences_json, created_at, updated_at, last_login_at)
      VALUES (?, 'google', ?, '{}', ?, ?, ?)
    `).bind(id, sub, now, now, now).run();
    return id;
  } catch {
    const raced = await env.DB.prepare("SELECT id FROM voy_users WHERE provider = 'google' AND provider_sub = ?").bind(sub).first<Record<string, unknown>>();
    if (!raced?.id) throw new Error('account_upsert_failed');
    const racedId = String(raced.id);
    await env.DB.prepare('UPDATE voy_users SET updated_at = ?, last_login_at = ? WHERE id = ?').bind(now, now, racedId).run();
    return racedId;
  }
}

export function handleAuthBootstrap(_request: Request, env: Env): Response {
  if (!authEnabled(env)) return disabledSession();
  const csrf = randomToken();
  const nonce = randomToken();
  const headers = new Headers();
  appendCookie(headers, ephemeralCookie(CSRF_COOKIE, csrf));
  appendCookie(headers, ephemeralCookie(NONCE_COOKIE, nonce));
  return json({ ok: true, enabled: true, client_id: String(env.VOY_GOOGLE_CLIENT_ID), csrf, nonce }, 200, headers);
}

export async function handleGoogleAuth(request: Request, env: Env): Promise<Response> {
  if (!authEnabled(env)) return json({ ok: false, error: 'auth_not_configured' }, 404);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  if (!writeOriginAllowed(request)) return json({ ok: false, error: 'origin_not_allowed' }, 403);
  const body = await boundedJson(request);
  if (!body || !exactKeys(body, ['credential', 'csrf'])) return json({ ok: false, error: 'invalid_auth_payload' }, 400);
  if (!csrfMatches(request, body.csrf)) return json({ ok: false, error: 'csrf_mismatch' }, 403);
  const nonce = readCookie(request, NONCE_COOKIE);
  if (!nonce) return json({ ok: false, error: 'nonce_missing' }, 403);
  if (typeof body.credential !== 'string') return json({ ok: false, error: 'credential_missing' }, 400);

  let identity;
  try {
    identity = await verifyGoogleIdToken(body.credential, env, nonce);
  } catch {
    return json({ ok: false, error: 'google_credential_invalid' }, 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const userId = await upsertGoogleUser(env, identity.sub, now);
  const session = await rotateSession(request, env, userId);
  const user = await getSessionUser(new Request(request.url, { headers: { Cookie: session.cookie.split(';', 1)[0]! } }), env, now);
  const headers = new Headers();
  appendCookie(headers, session.cookie);
  appendCookie(headers, clearCookie(CSRF_COOKIE));
  appendCookie(headers, clearCookie(NONCE_COOKIE));
  return json({ ok: true, enabled: true, authenticated: true, provider: 'google', preferences: user?.preferences || normalizePreferences({}) }, 200, headers);
}

export async function handleAuthSession(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405);
  if (!authEnabled(env)) return disabledSession();
  const user = await getSessionUser(request, env);
  return json({
    ok: true,
    enabled: true,
    authenticated: Boolean(user),
    provider: user ? 'google' : null,
    persistent_account: true,
    trip_history_persisted: false,
    preferences: user?.preferences || null
  });
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  if (!authEnabled(env)) return json({ ok: false, error: 'auth_not_configured' }, 404);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  if (!writeOriginAllowed(request)) return json({ ok: false, error: 'origin_not_allowed' }, 403);
  const body = await boundedJson(request);
  if (!body || !exactKeys(body, ['csrf']) || !csrfMatches(request, body.csrf)) return json({ ok: false, error: 'csrf_mismatch' }, 403);
  await deleteCurrentSession(request, env);
  const headers = new Headers();
  appendCookie(headers, clearSessionCookie());
  appendCookie(headers, clearCookie(CSRF_COOKIE));
  appendCookie(headers, clearCookie(NONCE_COOKIE));
  return json({ ok: true, authenticated: false }, 200, headers);
}

export async function handleAccount(request: Request, env: Env): Promise<Response> {
  if (!authEnabled(env) || !env.DB) return json({ ok: false, error: 'auth_not_configured' }, 404);
  const user = await getSessionUser(request, env);
  if (!user) return json({ ok: false, error: 'authentication_required' }, 401);

  if (request.method === 'GET') {
    return json({ ok: true, provider: 'google', preferences: user.preferences });
  }

  if (!writeOriginAllowed(request)) return json({ ok: false, error: 'origin_not_allowed' }, 403);
  const body = await boundedJson(request);
  if (!body || !exactKeys(body, request.method === 'PATCH' ? ['csrf', 'preferences'] : ['csrf']) || !csrfMatches(request, body.csrf)) {
    return json({ ok: false, error: 'csrf_mismatch' }, 403);
  }

  if (request.method === 'PATCH') {
    const userId = await sessionUserId(request, env);
    if (!userId) return json({ ok: false, error: 'authentication_required' }, 401);
    const preferences = normalizePreferences(body.preferences);
    await env.DB.prepare('UPDATE voy_users SET preferences_json = ?, updated_at = ? WHERE id = ?')
      .bind(preferencesJson(preferences), Math.floor(Date.now() / 1000), userId)
      .run();
    return json({ ok: true, preferences });
  }

  if (request.method === 'DELETE') {
    const deleted = await deleteUserAccount(request, env);
    if (!deleted) return json({ ok: false, error: 'authentication_required' }, 401);
    const headers = new Headers();
    appendCookie(headers, clearSessionCookie());
    appendCookie(headers, clearCookie(CSRF_COOKIE));
    appendCookie(headers, clearCookie(NONCE_COOKIE));
    return json({ ok: true, deleted: true }, 200, headers);
  }

  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
