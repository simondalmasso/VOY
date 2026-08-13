import { VOICE_LIMITS, boundedString } from './voiceCopilotContracts.mjs';

export const VOICE_TEST_HEADER = 'synthetic-ci-v1';
const testRateBuckets = new Map();
const MAX_RATE_BUCKETS = 2000;

export function voiceMode(request, env = {}) {
  const product = env.VOY_VOICE_ENABLED === 'true' && Boolean(env.AI);
  const test = env.VOY_VOICE_TEST_MODE === 'true'
    && request.headers.get('X-VOY-Voice-Test') === VOICE_TEST_HEADER;
  return product ? 'product' : (test ? 'test' : null);
}

export function voiceEnabled(request, env) {
  return Boolean(voiceMode(request, env));
}

export function voiceOriginAllowed(request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
}

export function voiceJson(body, status = 200, headers = {}) {
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

export function voiceErrorResponse(error, requestId = null) {
  const code = boundedString(error?.message, 160, { allowEmpty: true }) || 'voice_internal_error';
  let status = 400;
  if (code.includes('rate_limit')) status = 429;
  else if (code.includes('too_large') || code.includes('size')) status = 413;
  else if (code.includes('unavailable') || code.includes('offline')) status = 503;
  else if (code.includes('expired') || code.includes('limit') || code.includes('replay')) status = 409;
  return voiceJson({ ok: false, error: code, request_id: requestId }, status);
}

async function clientKey(request) {
  const source = (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'anonymous')
    .split(',')[0].trim();
  const digest = new Uint8Array(await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`voy-voice-v1:${source}`)
  ));
  return [...digest].slice(0, 12).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function testRateAllowed(key, kind, day, limit, now) {
  if (testRateBuckets.size > MAX_RATE_BUCKETS) {
    for (const [bucketKey, bucket] of testRateBuckets) {
      if (bucket.expires_at <= now) testRateBuckets.delete(bucketKey);
    }
  }
  const bucketKey = `${key}:${kind}:${day}`;
  const bucket = testRateBuckets.get(bucketKey) || { count: 0, expires_at: (day + 1) * 86_400_000 };
  bucket.count += 1;
  testRateBuckets.set(bucketKey, bucket);
  return bucket.count <= limit;
}

export async function voiceRateAllowed(request, env, kind, limit) {
  const now = Date.now();
  const day = Math.floor(now / 86_400_000);
  const key = await clientKey(request);
  if (env?.NOMINATIM_COORDINATOR) {
    try {
      const coordinatorId = env.NOMINATIM_COORDINATOR.idFromName('nominatim-global');
      const coordinator = env.NOMINATIM_COORDINATOR.get(coordinatorId);
      const response = await coordinator.fetch('https://nominatim-coordinator.internal/voice-quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, kind, day, limit })
      });
      if (!response.ok) return false;
      const result = await response.json();
      return result?.ok === true && result?.allowed === true;
    } catch {
      return false;
    }
  }
  // Synthetic CI may not construct the production Durable Object binding. Keep
  // an isolate-local test-only limiter so tests remain deterministic; product
  // mode fails closed when the global coordinator is unavailable.
  if (env?.VOY_VOICE_TEST_MODE === 'true') return testRateAllowed(key, kind, day, limit, now);
  return false;
}

export async function boundedRequestText(request, maxBytes = VOICE_LIMITS.maxContextBytes) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new Error('request_too_large');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error('request_too_large');
  return text;
}

export const __voiceApiUtilsTest = Object.freeze({ rateBuckets: testRateBuckets, clientKey, testRateAllowed });
