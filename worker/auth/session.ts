import type { Env } from '../contracts/env';

export const SESSION_COOKIE = '__Host-voy_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const LAST_SEEN_WRITE_INTERVAL_SECONDS = 60 * 60;

export type AccountTheme = 'system' | 'light' | 'dark';
export type PreferredMode = 'app' | 'taxi' | 'remis' | 'walk' | 'bike' | 'bus';

export interface AccountPreferences {
  theme: AccountTheme;
  analytics: boolean;
  reducedMotion: boolean;
  preferredModes: PreferredMode[];
  defaultProvinceId: string | null;
  defaultLocalityId: string | null;
}

export interface SessionUser {
  preferences: AccountPreferences;
}

const MODE_SET = new Set<PreferredMode>(['app', 'taxi', 'remis', 'walk', 'bike', 'bus']);

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function authEnabled(env: Env): boolean {
  return env.GOOGLE_AUTH_ENABLED === 'true'
    && Boolean(env.DB)
    && Boolean(String(env.VOY_GOOGLE_CLIENT_ID || '').trim())
    && Boolean(String(env.VOY_AUTH_SESSION_SECRET_V1 || '').trim());
}

async function hmacToken(token: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(token));
  return bytesToHex(new Uint8Array(signature));
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

function nullableId(value: unknown, max = 64): string | null {
  if (value === null || value === undefined || value === '') return null;
  return typeof value === 'string' && /^[A-Za-z0-9:_-]+$/.test(value) && value.length <= max ? value : null;
}

export function normalizePreferences(value: unknown): AccountPreferences {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const theme: AccountTheme = raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : 'system';
  const preferredModes = Array.isArray(raw.preferredModes)
    ? [...new Set(raw.preferredModes.filter((item): item is PreferredMode => typeof item === 'string' && MODE_SET.has(item as PreferredMode)))].slice(0, 6)
    : [];
  return {
    theme,
    analytics: raw.analytics === true,
    reducedMotion: raw.reducedMotion === true,
    preferredModes,
    defaultProvinceId: nullableId(raw.defaultProvinceId, 8),
    defaultLocalityId: nullableId(raw.defaultLocalityId, 64)
  };
}

export function parsePreferencesJson(value: unknown): AccountPreferences {
  if (typeof value !== 'string' || value.length > 4096) return normalizePreferences({});
  try { return normalizePreferences(JSON.parse(value)); }
  catch { return normalizePreferences({}); }
}

export function preferencesJson(value: unknown): string {
  const json = JSON.stringify(normalizePreferences(value));
  if (new TextEncoder().encode(json).byteLength > 2048) throw new Error('preferences_too_large');
  return json;
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie') || '';
  for (const pair of header.split(';')) {
    const [rawName, ...rest] = pair.trim().split('=');
    if (rawName === name) {
      const token = rest.join('=').trim();
      return token && token.length <= 512 ? token : null;
    }
  }
  return null;
}

export function readSessionToken(request: Request): string | null {
  const token = readCookie(request, SESSION_COOKIE);
  return token && token.length >= 32 && token.length <= 256 ? token : null;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function issueSession(env: Env, userId: string, now = Math.floor(Date.now() / 1000)): Promise<{ cookie: string; expiresAt: number }> {
  if (!authEnabled(env) || !env.DB) throw new Error('auth_not_configured');
  const token = randomToken();
  const idHash = await hmacToken(token, String(env.VOY_AUTH_SESSION_SECRET_V1));
  const expiresAt = now + SESSION_TTL_SECONDS;
  await env.DB.prepare('INSERT INTO voy_sessions (id_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)')
    .bind(idHash, userId, now, expiresAt, now)
    .run();
  return {
    expiresAt,
    cookie: `${SESSION_COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`
  };
}

async function currentSession(request: Request, env: Env, now: number): Promise<{ idHash: string; userId: string; preferences: AccountPreferences; lastSeenAt: number } | null> {
  if (!authEnabled(env) || !env.DB) return null;
  const token = readSessionToken(request);
  if (!token) return null;
  const idHash = await hmacToken(token, String(env.VOY_AUTH_SESSION_SECRET_V1));
  const row = await env.DB.prepare(`
    SELECT voy_users.id AS user_id, voy_users.preferences_json AS preferences_json,
           voy_sessions.expires_at AS expires_at, voy_sessions.last_seen_at AS last_seen_at
    FROM voy_sessions JOIN voy_users ON voy_users.id = voy_sessions.user_id
    WHERE voy_sessions.id_hash = ?
  `).bind(idHash).first<Record<string, unknown>>();
  if (!row) return null;
  const expiresAt = Number(row.expires_at);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    await env.DB.prepare('DELETE FROM voy_sessions WHERE id_hash = ?').bind(idHash).run();
    return null;
  }
  const lastSeenAt = Number(row.last_seen_at) || 0;
  return { idHash, userId: String(row.user_id), preferences: parsePreferencesJson(row.preferences_json), lastSeenAt };
}

export async function getSessionUser(request: Request, env: Env, now = Math.floor(Date.now() / 1000)): Promise<SessionUser | null> {
  const session = await currentSession(request, env, now);
  if (!session) return null;
  if (env.DB && now - session.lastSeenAt >= LAST_SEEN_WRITE_INTERVAL_SECONDS) {
    await env.DB.prepare('UPDATE voy_sessions SET last_seen_at = ? WHERE id_hash = ?').bind(now, session.idHash).run();
  }
  return { preferences: session.preferences };
}

export async function deleteCurrentSession(request: Request, env: Env): Promise<void> {
  if (!authEnabled(env) || !env.DB) return;
  const token = readSessionToken(request);
  if (!token) return;
  const idHash = await hmacToken(token, String(env.VOY_AUTH_SESSION_SECRET_V1));
  await env.DB.prepare('DELETE FROM voy_sessions WHERE id_hash = ?').bind(idHash).run();
}

export async function rotateSession(request: Request, env: Env, userId: string): Promise<{ cookie: string; expiresAt: number }> {
  await deleteCurrentSession(request, env);
  return issueSession(env, userId);
}

export async function sessionUserId(request: Request, env: Env, now = Math.floor(Date.now() / 1000)): Promise<string | null> {
  return (await currentSession(request, env, now))?.userId || null;
}

export async function deleteUserAccount(request: Request, env: Env): Promise<boolean> {
  if (!authEnabled(env) || !env.DB) return false;
  const userId = await sessionUserId(request, env);
  if (!userId) return false;
  await env.DB.prepare('DELETE FROM voy_users WHERE id = ?').bind(userId).run();
  return true;
}
