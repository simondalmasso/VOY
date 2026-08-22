#!/usr/bin/env node
import { writeFileSync } from 'node:fs';

const base = process.env.WORKER_URL?.replace(/\/$/, '');
const worker = process.env.WORKER_NAME;
const versionId = process.env.CANDIDATE_VERSION_ID;
const hash = process.env.SHORT_SHA;
const out = process.env.EVIDENCE_DIR;
if (!base || !worker || !versionId || !hash || !out) throw new Error('candidate_api_environment_missing');

const headers = {
  'Cloudflare-Workers-Version-Overrides': `${worker}="${versionId}"`,
  'Cache-Control': 'no-cache, no-store',
  Accept: 'application/json'
};
const UPSTREAM_RETRY_MS = 60_000;
const MAX_UPSTREAM_ATTEMPTS = 6;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function json(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
    signal: AbortSignal.timeout(25_000)
  });
  const rawText = await response.text();
  let body = null;
  try { body = JSON.parse(rawText); } catch {}
  return { response, body, rawText };
}

function retryDelay(result, attempt) {
  if (result?.response?.status === 503 && result?.body?.error === 'territory_upstream_unavailable') return UPSTREAM_RETRY_MS;
  return Math.min(attempt * 1_000, 5_000);
}

async function retryJson(path, predicate, options = {}) {
  const attempts = options.attempts ?? MAX_UPSTREAM_ATTEMPTS;
  let result = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = await json(path, options.requestOptions || {});
    options.onAttempt?.(attempt, result);
    if (predicate(result)) return result;
    if (attempt < attempts) await sleep(retryDelay(result, attempt));
  }
  return result;
}

function territoryAttempt(attempt, result) {
  const body = result?.body;
  return {
    attempt,
    http_status: result?.response?.status ?? null,
    body_class: body && typeof body === 'object' && !Array.isArray(body) ? 'json_object' : body === null ? 'non_json' : typeof body,
    error: body && typeof body === 'object' ? body.error ?? null : null,
    ok: body && typeof body === 'object' ? body.ok ?? null : null,
    provinceId: body?.territory?.provinceId ?? null,
    provinceIsoId: body?.territory?.provinceIsoId ?? null,
    coverageKey: body?.territory?.coverageKey ?? null
  };
}

function assertCordoba(result) {
  if (!result || result.response.status !== 200) {
    if (result?.response?.status === 503 && result?.body?.error === 'territory_upstream_unavailable') throw new Error('territory_upstream_unavailable_after_retry');
    throw new Error('territory_http_status_failed');
  }
  if (result.body?.ok !== true) throw new Error('territory_ok_failed');
  if (result.body?.territory?.provinceId !== '14') throw new Error('territory_province_id_failed');
  if (result.body?.territory?.provinceIsoId !== 'AR-X') throw new Error('territory_iso_failed');
  if (result.body?.territory?.coverageKey !== '_default') throw new Error('territory_coverage_failed');
}

const health = await json('/api/health?api_gate=1');
if (health.response.status !== 200 || health.body?.version !== 'V8.0.0' || health.body?.build_hash !== hash || health.body?.features?.collective_recommendations !== false || health.body?.features?.core_without_login_voice_ai !== true || health.body?.features?.national_territory !== true) throw new Error('health_contract_failed');

const auth = await json('/api/auth/session');
if (auth.response.status !== 200 || auth.body?.enabled !== false || auth.body?.authenticated !== false || auth.body?.trip_history_persisted !== false || auth.response.headers.get('set-cookie')) throw new Error('auth_safe_disabled_failed');

const invalid = await json('/api/route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
if (invalid.response.status !== 400 || invalid.body?.error !== 'invalid_route_request') throw new Error('route_invalid_gate_failed');

const cordobaAttempts = [];
const cordoba = await retryJson(
  '/api/territory?lat=-31.4201&lon=-64.1888',
  value => value?.response?.status === 200 && value?.body?.ok === true && value?.body?.territory?.provinceId === '14' && value?.body?.territory?.provinceIsoId === 'AR-X' && value?.body?.territory?.coverageKey === '_default',
  { onAttempt: (attempt, result) => cordobaAttempts.push(territoryAttempt(attempt, result)) }
);
writeFileSync(`${out}/territory-cordoba-attempts.json`, JSON.stringify({
  result: 'CAPTURED',
  target_version_id: versionId,
  retry_policy: { max_attempts: MAX_UPSTREAM_ATTEMPTS, upstream_retry_ms: UPSTREAM_RETRY_MS },
  attempts: cordobaAttempts
}, null, 2) + '\n');
assertCordoba(cordoba);

const outside = await retryJson('/api/territory?lat=0&lon=0', value => value?.response?.status === 422);
if (!outside || outside.response.status !== 422 || outside.body?.error !== 'territory_unresolved') {
  if (outside?.response?.status === 503 && outside?.body?.error === 'territory_upstream_unavailable') throw new Error('non_argentina_territory_upstream_unavailable_after_retry');
  throw new Error('non_argentina_fail_closed_gate_failed');
}

const routeRequest = {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    origin: { lat: -31.633, lon: -60.706 },
    destination: { lat: -31.648, lon: -60.710 },
    profile: 'driving'
  })
};
const valid = await retryJson('/api/route', value => value?.response?.status === 200 && value?.body?.ok === true, { requestOptions: routeRequest });
if (!valid || valid.response.status !== 200 || valid.body?.ok !== true || valid.body?.country !== 'AR' || !Number.isFinite(valid.body?.distance_km) || valid.body.distance_km < 0 || !Array.isArray(valid.body?.geometry) || valid.body.geometry.length < 2) {
  if (valid?.response?.status === 503 && valid?.body?.error === 'territory_upstream_unavailable') throw new Error('route_territory_upstream_unavailable_after_retry');
  throw new Error('route_real_gate_failed');
}

const root = await fetch(`${base}/?api_gate=1`, { headers: { ...headers, Accept: 'text/html' }, signal: AbortSignal.timeout(25_000) });
const rootText = await root.text();
if (root.status !== 200 || !rootText.includes('<div id="app"></div>') || !rootText.includes(`content="${hash}"`) || root.headers.get('set-cookie') || !String(root.headers.get('content-security-policy')).includes("frame-ancestors 'none'") || !String(root.headers.get('content-security-policy')).includes('https://accounts.google.com')) throw new Error('root_security_contract_failed');

const voice = await json('/api/voice/capabilities');
if (health.body?.features?.voice === true && (voice.response.status !== 200 || voice.body?.enabled !== true || voice.body?.audio_persisted !== false || voice.body?.transcript_logged !== false)) throw new Error('voice_capability_gate_failed');

const result = {
  result: 'PASS',
  health: health.body,
  auth: auth.body,
  territory: {
    cordoba: {
      province_id: cordoba.body.territory.provinceId,
      province_iso_id: cordoba.body.territory.provinceIsoId,
      coverage_key: cordoba.body.territory.coverageKey,
      attempts: cordobaAttempts.length
    },
    non_argentina_status: outside.response.status
  },
  route: {
    distance_km: valid.body.distance_km,
    duration_min: valid.body.duration_min,
    geometry_points: valid.body.geometry.length
  },
  root: { status: root.status, csp: root.headers.get('content-security-policy'), set_cookie: false },
  voice_status: voice.response.status,
  verified_at: new Date().toISOString()
};
writeFileSync(`${out}/api-gate.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
