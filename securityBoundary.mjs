const WRITE_PATHS = new Set(['/api/events', '/api/telemetry']);
const EVENT_BODY_MAX_BYTES = 16 * 1024;
const TELEMETRY_BODY_MAX_BYTES = 4 * 1024;
const MAX_EVENTS_PER_REQUEST = 20;
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

const PRODUCT_EVENT_NAMES = new Set([
  'estimation', 'route_calculated', 'ride_estimated', 'route_selected', 'destination_selected',
  'provider_tap', 'provider_click', 'provider_clicked', 'deeplink_opened', 'vehicle_viewed',
  'search', 'search_performed', 'voice_search'
]);
const TELEMETRY_EVENT_NAMES = new Set(['lcp', 'js_error', 'promise_rejection']);
const SAFE_TOKEN = /^[a-z0-9_-]{1,32}$/i;
const SAFE_PATH = /^\/[a-zA-Z0-9/_-]{0,119}$/;

const CSP_ENFORCED = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://unpkg.com https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com",
  "img-src 'self' data: blob: https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://tile.openstreetmap.org",
  "connect-src 'self' https://router.project-osrm.org https://accounts.google.com https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://tile.openstreetmap.org",
  "frame-src https://accounts.google.com",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "manifest-src 'self'"
].join('; ');

function list(value) {
  return value ? String(value).split(',').map(item => item.trim()).filter(Boolean) : [];
}

function callerIp(request) {
  return (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '')
    .split(',')[0].trim();
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function operatorDiagnosticsAllowed(request, env) {
  if (String(env.VOY_OPERATOR_DIAGNOSTICS || '').toLowerCase() !== 'true') return false;
  const ip = callerIp(request);
  if (!ip) return false;
  if (list(env.VOY_OWNER_IPS).includes(ip) || list(env.VOY_DEV_IPS).includes(ip)) return true;
  const allowedHashes = list(env.VOY_OWNER_IP_HASHES).map(value => value.toLowerCase());
  return allowedHashes.length > 0 && allowedHashes.includes(await sha256Hex(ip));
}

function allowedOrigins(request, env) {
  const requestOrigin = new URL(request.url).origin;
  return new Set([requestOrigin, ...list(env.VOY_ALLOWED_ORIGINS)]);
}

function isAllowedWriteOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  return allowedOrigins(request, env).has(origin);
}

function analyticsExclusionReason(request) {
  if (request.headers.get('Sec-GPC') === '1') return 'global_privacy_control';
  if (request.headers.get('DNT') === '1') return 'do_not_track';
  if (request.headers.get('X-VOY-Test') === '1') return 'test_traffic';
  return '';
}

function jsonResponse(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
  });
}

function applyWriteCors(response, request, env) {
  const headers = new Headers(response.headers);
  const origin = request.headers.get('Origin');
  headers.delete('Access-Control-Allow-Origin');
  headers.delete('Access-Control-Allow-Credentials');
  if (origin && allowedOrigins(request, env).has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.append('Vary', 'Origin');
  }
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, DNT, Sec-GPC, X-VOY-Test');
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function applySecurityHeaders(response, request) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), geolocation=(self), microphone=(self)');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  const contentType = headers.get('Content-Type') || '';
  if (contentType.includes('text/html') || new URL(request.url).pathname === '/') {
    headers.set('Content-Security-Policy', CSP_ENFORCED);
    headers.set('Content-Security-Policy-Report-Only', CSP_ENFORCED);
    const cookie = headers.get('Set-Cookie');
    if (cookie && /\bvoy_sid=/.test(cookie)) {
      const exclusionReason = analyticsExclusionReason(request);
      if (exclusionReason) {
        headers.delete('Set-Cookie');
        headers.set('X-VOY-Analytics', `excluded; reason=${exclusionReason}`);
      } else {
        const hardened = cookie
          .replace(/Max-Age=\d+/i, `Max-Age=${SESSION_MAX_AGE_SECONDS}`)
          .replace(/;\s*Secure/ig, '')
          .replace(/;\s*HttpOnly/ig, '') + '; Secure; HttpOnly';
        headers.set('Set-Cookie', hardened);
      }
    }
  }

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function readJsonWithinLimit(request, limit) {
  const declared = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > limit) return { error: 'body_too_large' };
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > limit) return { error: 'body_too_large' };
  try {
    return { value: JSON.parse(text) };
  } catch (_) {
    return { error: 'bad_json' };
  }
}

function finiteMetric(value, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > maximum) return 0;
  return number;
}

function safeToken(value) {
  const token = String(value || '').trim();
  return SAFE_TOKEN.test(token) ? token.toLowerCase() : '';
}

function sanitizeProductEvent(event) {
  if (!event || !PRODUCT_EVENT_NAMES.has(String(event.name || ''))) return null;
  const data = event.data && typeof event.data === 'object' && !Array.isArray(event.data) ? event.data : {};
  return {
    name: String(event.name),
    data: {
      provider: safeToken(data.provider),
      mode: safeToken(data.mode),
      price: finiteMetric(data.price, 100_000_000),
      time_min: finiteMetric(data.time_min, 24 * 60),
      distance_km: finiteMetric(data.distance_km, 5_000)
    }
  };
}

function sanitizeTelemetry(body) {
  const event = String(body && body.event || '');
  if (!TELEMETRY_EVENT_NAMES.has(event)) return null;
  const rawRoute = String(body && body.route || '').split(/[?#]/, 1)[0];
  const route = SAFE_PATH.test(rawRoute) ? rawRoute : '/';
  return {
    event,
    value: finiteMetric(body && body.value, 120_000),
    route,
    ts: Date.now()
  };
}

function forwardedRequest(request, body) {
  const headers = new Headers(request.headers);
  headers.set('Content-Type', 'application/json');
  headers.delete('Content-Length');
  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify(body),
    redirect: request.redirect
  });
}

async function stripSessionId(response) {
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) return response;
  const text = await response.text();
  try {
    const body = JSON.parse(text);
    if (body && typeof body === 'object') delete body.session_id;
    return new Response(JSON.stringify(body), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  } catch (_) {
    return new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }
}

async function handleWriteBoundary(baseWorker, request, env, ctx, path) {
  if (!isAllowedWriteOrigin(request, env)) {
    return applyWriteCors(jsonResponse({ ok: false, error: 'origin_not_allowed' }, 403), request, env);
  }

  if (request.method === 'OPTIONS') {
    return applyWriteCors(new Response(null, { status: 204 }), request, env);
  }
  if (request.method !== 'POST') {
    return applyWriteCors(jsonResponse({ ok: false, error: 'method_not_allowed' }, 405), request, env);
  }

  const exclusionReason = analyticsExclusionReason(request);
  if (exclusionReason) {
    return applyWriteCors(jsonResponse({
      ok: true,
      received: 0,
      written: 0,
      excluded: true,
      reason: exclusionReason
    }, 202), request, env);
  }

  const parsed = await readJsonWithinLimit(
    request,
    path === '/api/events' ? EVENT_BODY_MAX_BYTES : TELEMETRY_BODY_MAX_BYTES
  );
  if (parsed.error) {
    return applyWriteCors(jsonResponse({ ok: false, error: parsed.error }, parsed.error === 'body_too_large' ? 413 : 400), request, env);
  }

  let sanitized;
  if (path === '/api/events') {
    const inputEvents = parsed.value && Array.isArray(parsed.value.events) ? parsed.value.events : null;
    if (!inputEvents || inputEvents.length < 1 || inputEvents.length > MAX_EVENTS_PER_REQUEST) {
      return applyWriteCors(jsonResponse({ ok: false, error: 'invalid_events' }, 400), request, env);
    }
    const events = inputEvents.map(sanitizeProductEvent).filter(Boolean);
    if (!events.length) {
      return applyWriteCors(jsonResponse({ ok: true, received: inputEvents.length, written: 0, note: 'no_canonical_events' }, 202), request, env);
    }
    sanitized = { events };
  } else {
    sanitized = sanitizeTelemetry(parsed.value);
    if (!sanitized) {
      return applyWriteCors(jsonResponse({ ok: false, error: 'invalid_telemetry_event' }, 400), request, env);
    }
  }

  const upstream = await baseWorker.fetch(forwardedRequest(request, sanitized), env, ctx);
  const cleaned = path === '/api/events' ? await stripSessionId(upstream) : upstream;
  return applyWriteCors(cleaned, request, env);
}

export function createSecurityBoundary(baseWorker) {
  if (!baseWorker || typeof baseWorker.fetch !== 'function') {
    throw new TypeError('baseWorker.fetch is required');
  }

  return {
    ...baseWorker,
    async fetch(request, env = {}, ctx = {}) {
      const path = new URL(request.url).pathname.toLowerCase();

      if (path === '/api/whoami') {
        if (!(await operatorDiagnosticsAllowed(request, env))) {
          return applySecurityHeaders(jsonResponse({ error: 'not_found' }, 404, { 'Cache-Control': 'no-store' }), request);
        }
        const diagnostic = await baseWorker.fetch(request, env, ctx);
        const headers = new Headers(diagnostic.headers);
        headers.set('Cache-Control', 'no-store');
        return applySecurityHeaders(new Response(diagnostic.body, {
          status: diagnostic.status,
          statusText: diagnostic.statusText,
          headers
        }), request);
      }

      if (WRITE_PATHS.has(path)) {
        return handleWriteBoundary(baseWorker, request, env, ctx, path);
      }

      const response = await baseWorker.fetch(request, env, ctx);
      return applySecurityHeaders(response, request);
    }
  };
}

export const securityBoundaryContract = Object.freeze({
  eventBodyMaxBytes: EVENT_BODY_MAX_BYTES,
  telemetryBodyMaxBytes: TELEMETRY_BODY_MAX_BYTES,
  maxEventsPerRequest: MAX_EVENTS_PER_REQUEST,
  sessionMaxAgeSeconds: SESSION_MAX_AGE_SECONDS,
  csp: CSP_ENFORCED,
  cspReportOnly: CSP_ENFORCED,
  optOutHeaders: ['Sec-GPC', 'DNT', 'X-VOY-Test']
});
