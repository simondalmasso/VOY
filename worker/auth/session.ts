import type { Env } from '../contracts/env';

export const SESSION_COOKIE = '__Host-voy_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  theme: 'system' | 'light' | 'dark';
  analyticsEnabled: boolean;
}

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

export function readSessionToken(request: Request): string | null {
  const header = request.headers.get('Cookie') || '';
  for (const pair of header.split(';')) {
    const [rawName, ...rest] = pair.trim().split('=');
    if (rawName === SESSION_COOKIE) {
      const token = rest.join('=').trim();
      return token.length >= 32 && token.length <= 256 ? token : null;
    }
  }
  return null;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function issueSession(env: Env, userId: string, now = Math.floor(Date.now() / 1000)): Promise<{ token: string; cookie: string; expiresAt: number }> {
  if (!authEnabled(env) || !env.DB) throw new Error('auth_not_configured');
  const token = randomToken();
  const tokenHash = await hmacToken(token, String(env.VOY_AUTH_SESSION_SECRET_V1));
  const expiresAt = now + SESSION_TTL_SECONDS;
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(tokenHash, userId, now, expiresAt)
    .run();
  return {
    token,
    expiresAt,
    cookie: `${SESSION_COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`
  };
}

export async function getSessionUser(request: Request, env: Env, now = Math.floor(Date.now() / 1000)): Promise<SessionUser | null> {
  if (!authEnabled(env) || !env.DB) return null;
  const token = readSessionToken(request);
  if (!token) return null;
  const tokenHash = await hmacToken(token, String(env.VOY_AUTH_SESSION_SECRET_V1));
  const row = await env.DB.prepare(`
    SELECT users.id AS id, users.email AS email, users.display_name AS display_name,
           users.avatar_url AS avatar_url, users.theme AS theme, users.analytics_enabled AS analytics_enabled,
           sessions.expires_at AS expires_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `).bind(tokenHash).first<Record<string, unknown>>();
  if (!row) return null;
  const expiresAt = Number(row.expires_at);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
    return null;
  }
  const theme = row.theme === 'light' || row.theme === 'dark' ? row.theme : 'system';
  return {
    id: String(row.id),
    email: String(row.email),
    displayName: typeof row.display_name === 'string' ? row.display_name : null,
    avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    theme,
    analyticsEnabled: Number(row.analytics_enabled) === 1
  };
}

export async function deleteCurrentSession(request: Request, env: Env): Promise<void> {
  if (!authEnabled(env) || !env.DB) return;
  const token = readSessionToken(request);
  if (!token) return;
  const tokenHash = await hmacToken(token, String(env.VOY_AUTH_SESSION_SECRET_V1));
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
}

export async function deleteUserAccount(request: Request, env: Env): Promise<boolean> {
  if (!authEnabled(env) || !env.DB) return false;
  const user = await getSessionUser(request, env);
  if (!user) return false;
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();
  return true;
}
