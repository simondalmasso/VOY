const SESSION_COOKIE = '__Host-voy_session';
const CSRF_COOKIE = '__Host-voy_csrf';
const NONCE_COOKIE = '__Host-voy_auth_nonce';
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const FORM_MAX_BYTES = 16 * 1024;
const CLOCK_SKEW_SECONDS = 300;
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
let jwksCache = { expiresAt: 0, keys: [] };

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function utf8(value) {
  return new TextEncoder().encode(String(value));
}

function text(bytes) {
  return new TextDecoder().decode(bytes);
}

function parseCookies(request) {
  const cookies = {};
  for (const part of String(request.headers.get('Cookie') || '').split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

function cookie(name, value, options = {}) {
  const pieces = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'Secure'];
  if (options.httpOnly) pieces.push('HttpOnly');
  pieces.push(`SameSite=${options.sameSite || 'Lax'}`);
  if (Number.isFinite(options.maxAge)) pieces.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  return pieces.join('; ');
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers
    }
  });
}

function configured(env) {
  return Boolean(String(env.VOY_GOOGLE_CLIENT_ID || '').trim() && String(env.VOY_AUTH_SESSION_SECRET_V1 || '').trim());
}

function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

function allowedGooglePostOrigin(request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin || origin === 'https://accounts.google.com';
}

async function readForm(request) {
  const contentType = String(request.headers.get('Content-Type') || '').toLowerCase();
  if (!contentType.startsWith('application/x-www-form-urlencoded')) throw new Error('form_content_type_required');
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > FORM_MAX_BYTES) throw new Error('form_too_large');
  const raw = await request.text();
  if (utf8(raw).byteLength > FORM_MAX_BYTES) throw new Error('form_too_large');
  return new URLSearchParams(raw);
}

async function aesKey(secret) {
  const raw = await crypto.subtle.digest('SHA-256', utf8(`voy-auth-session-v1:${secret}`));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function subjectDigest(secret, subject) {
  const key = await crypto.subtle.importKey('raw', utf8(`voy-auth-subject-v1:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(subject)));
  return base64UrlEncode(digest.slice(0, 18));
}

async function sealSession(payload, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: utf8('voy-session-v1') },
    await aesKey(secret),
    utf8(JSON.stringify(payload))
  ));
  return `v1.${base64UrlEncode(iv)}.${base64UrlEncode(encrypted)}`;
}

async function openSession(value, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  try {
    const [version, ivRaw, encryptedRaw] = String(value || '').split('.');
    if (version !== 'v1' || !ivRaw || !encryptedRaw) return null;
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64UrlDecode(ivRaw), additionalData: utf8('voy-session-v1') },
      await aesKey(secret),
      base64UrlDecode(encryptedRaw)
    );
    const payload = JSON.parse(text(new Uint8Array(decrypted)));
    if (!payload || payload.version !== 1 || payload.auth_provider !== 'google') return null;
    if (!payload.session_id || !payload.subject || !Number.isFinite(payload.expires_at)) return null;
    if (payload.expires_at <= nowSeconds) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseJwtPart(value) {
  return JSON.parse(text(base64UrlDecode(value)));
}

async function loadGoogleKeys(fetcher = fetch) {
  const now = Date.now();
  if (jwksCache.expiresAt > now && jwksCache.keys.length) return jwksCache.keys;
  const response = await fetcher(GOOGLE_JWKS_URL, { headers: { Accept: 'application/json' }, redirect: 'error' });
  if (!response.ok) throw new Error('google_jwks_unavailable');
  const body = await response.json();
  if (!body || !Array.isArray(body.keys) || !body.keys.length) throw new Error('google_jwks_invalid');
  const cacheControl = response.headers.get('Cache-Control') || '';
  const match = cacheControl.match(/max-age=(\d+)/i);
  const maxAge = match ? Math.min(Number(match[1]), 24 * 60 * 60) : 60 * 60;
  jwksCache = { expiresAt: now + Math.max(300, maxAge) * 1000, keys: body.keys };
  return jwksCache.keys;
}

async function verifyGoogleCredential(credential, options) {
  const parts = String(credential || '').split('.');
  if (parts.length !== 3) throw new Error('google_credential_malformed');
  const header = parseJwtPart(parts[0]);
  const claims = parseJwtPart(parts[1]);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) throw new Error('google_credential_algorithm');
  const keys = await loadGoogleKeys(options.fetcher || fetch);
  const jwk = keys.find(item => item && item.kid === header.kid && item.kty === 'RSA');
  if (!jwk) throw new Error('google_credential_unknown_key');
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    base64UrlDecode(parts[2]),
    utf8(`${parts[0]}.${parts[1]}`)
  );
  if (!verified) throw new Error('google_credential_signature');
  const now = Number.isFinite(options.nowSeconds) ? options.nowSeconds : Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(options.clientId)) throw new Error('google_credential_audience');
  if (audiences.length > 1 && claims.azp !== options.clientId) throw new Error('google_credential_authorized_party');
  if (!GOOGLE_ISSUERS.has(claims.iss)) throw new Error('google_credential_issuer');
  if (!Number.isFinite(claims.exp) || claims.exp <= now - CLOCK_SKEW_SECONDS) throw new Error('google_credential_expired');
  if (!Number.isFinite(claims.iat) || claims.iat > now + CLOCK_SKEW_SECONDS || claims.iat < now - 24 * 60 * 60) {
    throw new Error('google_credential_iat');
  }
  if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 255) throw new Error('google_credential_subject');
  if (options.nonce && claims.nonce !== options.nonce) throw new Error('google_credential_nonce');
  return claims;
}

function errorResponse(error) {
  const code = String(error?.message || 'auth_internal_error').slice(0, 120);
  let status = 400;
  if (code === 'auth_not_configured' || code.includes('jwks_unavailable')) status = 503;
  else if (code.includes('origin')) status = 403;
  else if (code.includes('too_large')) status = 413;
  else if (code.includes('method')) status = 405;
  return json({ ok: false, error: code }, status);
}

function appendSessionBootstrapCookies(headers, csrfToken, nonce) {
  headers.append('Set-Cookie', cookie(CSRF_COOKIE, csrfToken, { maxAge: SESSION_MAX_AGE_SECONDS }));
  headers.append('Set-Cookie', cookie(NONCE_COOKIE, nonce, { maxAge: 10 * 60, sameSite: 'None' }));
}

export async function handleAuthRequest(request, env = {}) {
  const url = new URL(request.url);
  const path = url.pathname.toLowerCase();
  if (!path.startsWith('/api/auth/')) return null;
  const authConfigured = configured(env);

  try {
    if (request.method === 'OPTIONS') {
      if (!sameOrigin(request)) throw new Error('origin_not_allowed');
      return new Response(null, { status: 204, headers: { Allow: 'GET, POST, OPTIONS', 'Cache-Control': 'no-store' } });
    }

    if (path === '/api/auth/session' && request.method === 'GET') {
      if (!sameOrigin(request)) throw new Error('origin_not_allowed');
      const cookies = parseCookies(request);
      const session = authConfigured
        ? await openSession(cookies[SESSION_COOKIE], String(env.VOY_AUTH_SESSION_SECRET_V1))
        : null;
      const csrfToken = crypto.randomUUID();
      const nonce = crypto.randomUUID();
      const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      appendSessionBootstrapCookies(headers, csrfToken, nonce);
      return new Response(JSON.stringify({
        ok: true,
        enabled: authConfigured,
        authenticated: Boolean(session),
        auth_provider: session?.auth_provider || null,
        expires_at: session?.expires_at || null,
        csrf_token: csrfToken,
        nonce: authConfigured ? nonce : null,
        persistent_account: false,
        trip_history_persisted: false
      }), { status: 200, headers });
    }

    if (path === '/api/auth/google' && request.method === 'POST') {
      if (!authConfigured) throw new Error('auth_not_configured');
      if (!allowedGooglePostOrigin(request)) throw new Error('origin_not_allowed');
      const form = await readForm(request);
      const cookies = parseCookies(request);
      const bodyCsrf = form.get('g_csrf_token') || '';
      if (!bodyCsrf || cookies.g_csrf_token !== bodyCsrf) throw new Error('google_csrf_mismatch');
      const credential = form.get('credential') || '';
      if (!credential || credential.length > 12_000) throw new Error('google_credential_invalid');
      const verifier = typeof env.__VOY_AUTH_TEST_VERIFY === 'function'
        ? env.__VOY_AUTH_TEST_VERIFY
        : verifyGoogleCredential;
      const nonce = cookies[NONCE_COOKIE] || '';
      if (!nonce) throw new Error('google_nonce_missing');
      const claims = await verifier(credential, {
        clientId: String(env.VOY_GOOGLE_CLIENT_ID),
        nonce,
        fetcher: env.__VOY_AUTH_TEST_FETCH || fetch
      });
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = Math.min(Number(claims.exp), now + SESSION_MAX_AGE_SECONDS);
      const payload = {
        version: 1,
        session_id: crypto.randomUUID(),
        subject: await subjectDigest(String(env.VOY_AUTH_SESSION_SECRET_V1), claims.sub),
        issued_at: now,
        expires_at: expiresAt,
        auth_provider: 'google'
      };
      const sealed = await sealSession(payload, String(env.VOY_AUTH_SESSION_SECRET_V1));
      const headers = new Headers({ Location: '/', 'Cache-Control': 'no-store' });
      headers.append('Set-Cookie', cookie(SESSION_COOKIE, sealed, { httpOnly: true, maxAge: expiresAt - now }));
      headers.append('Set-Cookie', cookie(NONCE_COOKIE, '', { maxAge: 0, sameSite: 'None' }));
      return new Response(null, { status: 303, headers });
    }

    if (path === '/api/auth/logout' && request.method === 'POST') {
      if (!sameOrigin(request)) throw new Error('origin_not_allowed');
      const cookies = parseCookies(request);
      const supplied = request.headers.get('X-VOY-CSRF') || '';
      if (!supplied || supplied !== cookies[CSRF_COOKIE]) throw new Error('logout_csrf_mismatch');
      const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      headers.append('Set-Cookie', cookie(SESSION_COOKIE, '', { httpOnly: true, maxAge: 0 }));
      headers.append('Set-Cookie', cookie(CSRF_COOKIE, '', { maxAge: 0 }));
      headers.append('Set-Cookie', cookie(NONCE_COOKIE, '', { maxAge: 0, sameSite: 'None' }));
      return new Response(JSON.stringify({ ok: true, authenticated: false }), { status: 200, headers });
    }

    if (path === '/api/auth/google' || path === '/api/auth/logout' || path === '/api/auth/session') {
      throw new Error('method_not_allowed');
    }
    return json({ ok: false, error: 'auth_route_not_found' }, 404);
  } catch (error) {
    return errorResponse(error);
  }
}

export const authContract = Object.freeze({
  sessionCookie: SESSION_COOKIE,
  csrfCookie: CSRF_COOKIE,
  nonceCookie: NONCE_COOKIE,
  maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
  formMaxBytes: FORM_MAX_BYTES,
  googleJwksUrl: GOOGLE_JWKS_URL,
  persistentAccount: false,
  tripHistoryPersisted: false,
  rawGoogleTokenPersisted: false,
  emailIdentifier: false
});

export const __authTest = Object.freeze({
  base64UrlEncode,
  base64UrlDecode,
  sealSession,
  openSession,
  subjectDigest,
  verifyGoogleCredential,
  parseCookies,
  configured,
  resetJwksCache() { jwksCache = { expiresAt: 0, keys: [] }; }
});
