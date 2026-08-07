#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const REQUIRED_CONSECUTIVE_ROUNDS = 20;
export const MINIMUM_CONVERGENCE_MS = 120_000;
export const DEFAULT_INTERVAL_MS = 7_000;
const MAX_ASSET_BYTES = 5 * 1024 * 1024;

function required(env, name) { const value = env[name]; if (!value) throw new Error(`missing_environment:${name}`); return value; }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function writeJson(path, value) { writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); }
function sha256(buffer) { return createHash('sha256').update(buffer).digest('hex'); }

export function deploymentsFromPayload(payload) {
  if (!payload || payload.success !== true) throw new Error('deployments_api_failed');
  const deployments = payload.result?.deployments || payload.result;
  if (!Array.isArray(deployments)) throw new Error('deployments_shape_unknown');
  return deployments;
}
export function inspectDeployment(payload, stableId, candidateId) {
  const active = deploymentsFromPayload(payload)[0];
  if (!active || !Array.isArray(active.versions)) throw new Error('active_deployment_missing');
  const values = active.versions.map(version => ({ id: version.version_id, percentage: Number(version.percentage) }));
  return { active, values, valid: values.length === 2 && values.some(v => v.id === stableId && v.percentage === 100) && values.some(v => v.id === candidateId && v.percentage === 0) };
}
export function healthMatches(health, version, hash) { return Boolean(health?.ok === true && health.version === version && health.build_hash === hash); }
export function convergenceSatisfied(consecutive, elapsedMs) { return consecutive >= REQUIRED_CONSECUTIVE_ROUNDS && elapsedMs >= MINIMUM_CONVERGENCE_MS; }
export function extractTailProof(text, candidateId) {
  const ids = [...String(text || '').matchAll(/"scriptVersion"\s*:\s*\{\s*"id"\s*:\s*"([^"]+)"/g)].map(match => match[1]);
  const outcomes = [...String(text || '').matchAll(/"outcome"\s*:\s*"([^"]+)"/g)].map(match => match[1]);
  return { exactEvents: ids.filter(id => id === candidateId).length, observedVersionIds: [...new Set(ids)], nonOkOutcomes: outcomes.filter(value => value !== 'ok') };
}

async function responseBody(response, max = MAX_ASSET_BYTES) {
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > max) throw new Error(`content_length_exceeded:${length}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > max) throw new Error(`body_limit_exceeded:${bytes.byteLength}`);
  return Buffer.from(bytes);
}
async function fetchRetry(url, options = {}, attempts = 3) {
  let last;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await fetch(url, { ...options, signal: AbortSignal.timeout(25_000) }); }
    catch (error) { last = error; if (attempt < attempts) await sleep(attempt * 800); }
  }
  throw last;
}
async function fetchJson(url, options = {}) {
  const response = await fetchRetry(url, { ...options, headers: { Accept: 'application/json', ...(options.headers || {}) } });
  if (response.status !== 200) throw new Error(`http_${response.status}:${url}`);
  return JSON.parse((await responseBody(response, 1024 * 1024)).toString('utf8'));
}
function candidateHeaders(env) {
  return { 'Cloudflare-Workers-Version-Overrides': `${required(env,'WORKER_NAME')}="${required(env,'CANDIDATE_VERSION_ID')}"`, 'Cache-Control': 'no-cache, no-store, max-age=0', Pragma: 'no-cache' };
}
function htmlContract(body, headers, env) {
  const text = body.toString('utf8');
  const hash = required(env, 'SHORT_SHA');
  const checks = {
    doctype: /<!doctype html>/i.test(text),
    app_mount: text.includes('<div id="app"></div>'),
    version: text.includes('content="V8.0.0"'),
    build: text.includes(`content="${hash}"`),
    module_asset: /<script[^>]+type="module"[^>]+src="\/assets\/[^"]+\.js"/.test(text),
    no_legacy_runtime: !text.includes('VOY-Lite.html') && !text.includes('window.VOY_BUILD_HASH'),
    content_type: String(headers.get('content-type') || '').includes('text/html'),
    csp: String(headers.get('content-security-policy') || '').includes("frame-ancestors 'none'"),
    no_cookie: !headers.get('set-cookie'),
    no_store: /no-store/.test(String(headers.get('cache-control') || ''))
  };
  return { checks, pass: Object.values(checks).every(Boolean) };
}
async function probeStatic(env, round) {
  const base = required(env, 'WORKER_URL').replace(/\/$/, '');
  const manifest = JSON.parse(readFileSync(required(env, 'STATIC_MANIFEST_PATH'), 'utf8'));
  const headers = candidateHeaders(env);
  const results = [];
  for (const entry of manifest.files) {
    const route = entry.route;
    const response = await fetchRetry(`${base}${route}${route.includes('?') ? '&' : '?'}voy_probe=${round}-${crypto.randomUUID()}`, { headers });
    const body = await responseBody(response);
    const contentType = response.headers.get('content-type') || '';
    const hash = sha256(body);
    const html = entry.relative_path === 'index.html' ? htmlContract(body, response.headers, env) : null;
    const pass = response.status === 200 && body.byteLength > 0 && hash === entry.sha256 && (!html || html.pass);
    results.push({ route, status: response.status, content_type: contentType, bytes: body.byteLength, sha256: hash, expected_sha256: entry.sha256, html, pass });
  }
  for (const spa of manifest.spa_routes) {
    const response = await fetchRetry(`${base}${spa.route}?voy_spa_probe=${round}-${crypto.randomUUID()}`, { headers: { ...headers, Accept: 'text/html' } });
    const body = await responseBody(response);
    const contract = htmlContract(body, response.headers, env);
    results.push({ route: spa.route, status: response.status, bytes: body.byteLength, sha256: sha256(body), expected_sha256: spa.expected_sha256, html: contract, pass: response.status === 200 && sha256(body) === spa.expected_sha256 && contract.pass });
  }
  return results;
}
async function apiDeployment(env) {
  const account = required(env, 'CLOUDFLARE_ACCOUNT_ID'); const worker = required(env, 'WORKER_NAME'); const token = required(env, 'CLOUDFLARE_API_TOKEN');
  return fetchJson(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${worker}/deployments`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function converge(env = process.env) {
  const evidence = required(env, 'EVIDENCE_DIR'); const base = required(env, 'WORKER_URL').replace(/\/$/, '');
  const interval = Number(env.CONVERGENCE_INTERVAL_MS || DEFAULT_INTERVAL_MS); if (!Number.isFinite(interval) || interval < 6000) throw new Error('interval_too_short');
  const started = Date.now(); let consecutive = 0;
  writeFileSync(`${evidence}/convergence.jsonl`, ''); writeFileSync(`${evidence}/asset-probes.jsonl`, '');
  for (let round = 1; round <= 120; round += 1) {
    let deployment = null, stableHealth = null, candidateHealth = null, assets = [], error = null;
    try {
      const [payload, stable, candidate, probes] = await Promise.all([
        apiDeployment(env),
        fetchJson(`${base}/api/health?stable=${round}-${Date.now()}`, { headers: { 'Cache-Control': 'no-cache, no-store' } }),
        fetchJson(`${base}/api/health?candidate=${round}-${Date.now()}`, { headers: candidateHeaders(env) }),
        probeStatic(env, round)
      ]);
      deployment = inspectDeployment(payload, required(env,'STABLE_VERSION_ID'), required(env,'CANDIDATE_VERSION_ID'));
      stableHealth = stable; candidateHealth = candidate; assets = probes;
    } catch (caught) { error = String(caught?.stack || caught); }
    const deploymentOk = deployment?.valid === true;
    const stableOk = healthMatches(stableHealth, required(env,'EXPECTED_STABLE_VERSION'), required(env,'EXPECTED_STABLE_HASH'));
    const candidateOk = healthMatches(candidateHealth, required(env,'EXPECTED_CANDIDATE_VERSION'), required(env,'SHORT_SHA'));
    const assetsOk = assets.length > 0 && assets.every(asset => asset.pass);
    consecutive = deploymentOk && stableOk && candidateOk && assetsOk ? consecutive + 1 : 0;
    for (const asset of assets) appendFileSync(`${evidence}/asset-probes.jsonl`, `${JSON.stringify({ round, ...asset })}\n`);
    const record = { timestamp: new Date().toISOString(), round, elapsed_ms: Date.now()-started, deployment_id: deployment?.active?.id || null, deployment_ok: deploymentOk, stable_ok: stableOk, candidate_ok: candidateOk, assets_ok: assetsOk, asset_count: assets.length, asset_pass: assets.filter(asset=>asset.pass).length, consecutive, error };
    appendFileSync(`${evidence}/convergence.jsonl`, `${JSON.stringify(record)}\n`);
    if (convergenceSatisfied(consecutive, record.elapsed_ms)) {
      writeJson(`${evidence}/convergence-proof.json`, record); writeJson(`${evidence}/candidate-assets-converged.json`, assets); writeJson(`${evidence}/stable-health-converged.json`, stableHealth); writeJson(`${evidence}/candidate-health-converged.json`, candidateHealth);
      appendFileSync(required(env,'GITHUB_ENV'), `CANDIDATE_DEPLOYMENT_ID=${deployment.active.id}\n`);
      return record;
    }
    await sleep(interval);
  }
  throw new Error('svelte_candidate_did_not_converge');
}

export async function final(env = process.env) {
  const evidence = required(env,'EVIDENCE_DIR'); const payload = await apiDeployment(env); const deployment = inspectDeployment(payload, required(env,'STABLE_VERSION_ID'), required(env,'CANDIDATE_VERSION_ID'));
  if (!deployment.valid) throw new Error('final_deployment_invalid');
  const proof = JSON.parse(readFileSync(`${evidence}/convergence-proof.json`, 'utf8'));
  if (!convergenceSatisfied(proof.consecutive, proof.elapsed_ms)) throw new Error('convergence_proof_invalid');
  const tail = extractTailProof(existsSync(`${evidence}/candidate-tail.log`) ? readFileSync(`${evidence}/candidate-tail.log`, 'utf8') : '', required(env,'CANDIDATE_VERSION_ID'));
  if (tail.exactEvents < 1 || tail.nonOkOutcomes.length) throw new Error('tail_proof_invalid');
  const state = {
    result: 'PASS', exact_source_sha: required(env,'GITHUB_SHA'), source_short_sha: required(env,'SHORT_SHA'),
    stable_version_id: required(env,'STABLE_VERSION_ID'), stable_traffic: 100,
    candidate_version_id: required(env,'CANDIDATE_VERSION_ID'), candidate_traffic: 0,
    deployment_id: deployment.active.id, previous_deployment_id: env.PREVIOUS_DEPLOYMENT_ID || null,
    stable_health: { version: required(env,'EXPECTED_STABLE_VERSION'), build_hash: required(env,'EXPECTED_STABLE_HASH') },
    candidate_health: { version: required(env,'EXPECTED_CANDIDATE_VERSION'), build_hash: required(env,'SHORT_SHA') },
    convergence_rounds: proof.consecutive, convergence_duration_ms: proof.elapsed_ms,
    exact_version_tail_events: tail.exactEvents, observed_version_ids: tail.observedVersionIds, non_ok_tail_outcomes: tail.nonOkOutcomes,
    production_promoted: false, rollback_executed: false, verified_at: new Date().toISOString()
  };
  writeJson(`${evidence}/final-state.json`, state); return state;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  (mode === 'converge' ? converge() : mode === 'final' ? final() : Promise.reject(new Error(`unknown_mode:${mode}`))).catch(error => { console.error(error?.stack || error); process.exit(1); });
}
