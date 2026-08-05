import legacyWorker, { NominatimCoordinator } from '../worker-entry.js';
import type { Env } from './contracts/env';
import { handleRoute } from './routes/route';
export { NominatimCoordinator };
const API_PREFIX = '/api/';
const VERSION = 'V8.0.0';
const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com; connect-src 'self' https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com; font-src 'self' data:; worker-src 'self' blob:; manifest-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), geolocation=(self), microphone=(self)', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Resource-Policy': 'same-origin', 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
});
function secure(response: Response, request: Request): Response {
  const headers = new Headers(response.headers); for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  const contentType = headers.get('Content-Type') || ''; const path = new URL(request.url).pathname;
  if (contentType.includes('text/html')) headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  else if (/\/assets\/[^/]+-[A-Za-z0-9_-]+\.(js|css)$/.test(path)) headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  if (path.startsWith('/api/')) headers.set('Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
function authConfigured(env: Env): boolean { return Boolean(String(env.VOY_GOOGLE_CLIENT_ID || '').trim() && String(env.VOY_AUTH_SESSION_SECRET_V1 || '').trim()); }
function health(env: Env): Response {
  const voice = env.VOY_VOICE_ENABLED === 'true' && Boolean(env.AI);
  const auth = authConfigured(env);
  return new Response(JSON.stringify({ ok: true, service: 'voy-app', version: VERSION, build_hash: String(env.VOY_BUILD_HASH || 'dev'), features: { voice, auth, collective_recommendations: false, core_without_login_voice_ai: true, pwa: true } }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
async function assets(request: Request, env: Env): Promise<Response> {
  const response = await env.ASSETS.fetch(request); if (response.status !== 404 || request.method !== 'GET') return secure(response, request);
  const accept = request.headers.get('Accept') || ''; if (!accept.includes('text/html')) return secure(response, request);
  const indexUrl = new URL('/index.html', request.url); return secure(await env.ASSETS.fetch(new Request(indexUrl, request)), request);
}
const worker: ExportedHandler<Env> = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health' && request.method === 'GET') return secure(health(env), request);
    if (url.pathname === '/api/route') return secure(await handleRoute(request, env), request);
    if (url.pathname === '/api/auth/session' && request.method === 'GET' && !authConfigured(env)) {
      return secure(new Response(JSON.stringify({ ok: true, enabled: false, authenticated: false, persistent_account: false, trip_history_persisted: false }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }), request);
    }
    if (url.pathname.startsWith('/api/auth/') && !authConfigured(env)) return secure(new Response(JSON.stringify({ ok: false, error: 'auth_not_configured' }), { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }), request);
    if (url.pathname.startsWith(API_PREFIX)) return secure(await legacyWorker.fetch(request, env, ctx), request);
    return assets(request, env);
  },
  scheduled(event, env, ctx) { return legacyWorker.scheduled?.(event, env, ctx); }
};
export default worker;
