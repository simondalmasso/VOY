#!/usr/bin/env node
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import {
  REQUIRED_CITY_PLATFORM_ASSETS,
  assertCanonicalAssetSet,
  evaluateRemoteAsset,
  validateAssetBody
} from '../scripts/required-city-platform-assets.mjs';

const required = name => {
  const value = process.env[name];
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
};
const sleep = ms => new Promise(resolvePromise => setTimeout(resolvePromise, ms));
const sha256 = body => createHash('sha256').update(body).digest('hex');
const out = required('EVIDENCE_DIR');
mkdirSync(out, { recursive: true });

const workerName = required('WORKER_NAME');
const workerUrl = required('WORKER_URL');
const accountId = required('CLOUDFLARE_ACCOUNT_ID');
const token = required('CLOUDFLARE_API_TOKEN');
const sourceSha = required('EXACT_MAIN_SHA');
const expectedBuild = sourceSha.slice(0, 7);
const expectedVersion = required('EXPECTED_APP_VERSION');
const activeVersionId = required('ACTIVE_VERSION_ID');
const activeDeploymentId = required('ACTIVE_DEPLOYMENT_ID');
const previousVersionId = required('PREVIOUS_VERSION_ID');
const intervalMs = Number(process.env.CONVERGENCE_INTERVAL_MS || 7000);
const apiRoot = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`;

async function fetchResponse(url, options = {}) {
  return fetch(url, {
    ...options,
    redirect: 'manual',
    signal: AbortSignal.timeout(25_000),
    headers: {
      Accept: '*/*',
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      ...(options.headers || {})
    }
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetchResponse(url, { ...options, headers: { Accept: 'application/json', ...(options.headers || {}) } });
  if (response.status !== 200) throw new Error(`http_${response.status}:${url}`);
  return response.json();
}

function activeDeployment(payload) {
  if (!payload?.success) throw new Error('deployments_api_failed');
  const list = payload.result?.deployments || payload.result;
  if (!Array.isArray(list) || !list[0]) throw new Error('active_deployment_missing');
  return list[0];
}

function assertRouting(active) {
  if (active.id !== activeDeploymentId) throw new Error(`deployment_id_mismatch:${active.id}`);
  if (!Array.isArray(active.versions) || active.versions.length !== 1) throw new Error('production_version_count_mismatch');
  const version = active.versions[0];
  if (version.version_id !== activeVersionId || Number(version.percentage) !== 100) {
    throw new Error(`production_routing_mismatch:${version.version_id}:${version.percentage}`);
  }
}

function deriveHtmlMaterialization(remoteBody) {
  let template = readFileSync(resolve('public/VOY-Lite.html'), 'utf8');
  if (!template.includes('__BUILD_HASH__') || !template.includes('__DEPLOY_TS__')) throw new Error('html_placeholders_missing');
  template = template.replaceAll('__BUILD_HASH__', expectedBuild);
  const parts = template.split('__DEPLOY_TS__');
  if (parts.length < 2) throw new Error('deploy_timestamp_placeholder_missing');
  const prefix = parts[0];
  const suffix = parts[1];
  if (!remoteBody.startsWith(prefix)) throw new Error('deployed_html_prefix_mismatch');
  const suffixIndex = remoteBody.indexOf(suffix, prefix.length);
  if (suffixIndex < 0) throw new Error('deployed_html_suffix_mismatch');
  const deployTimestamp = remoteBody.slice(prefix.length, suffixIndex);
  const materialized = template.replaceAll('__DEPLOY_TS__', deployTimestamp);
  if (materialized !== remoteBody) throw new Error('deployed_html_not_exact_source_transform');
  writeFileSync(`${out}/derived-deploy-timestamp.txt`, `${deployTimestamp}\n`);
  return Buffer.from(materialized);
}

function expectedManifest(htmlBuffer) {
  assertCanonicalAssetSet();
  return REQUIRED_CITY_PLATFORM_ASSETS.map(asset => {
    const body = asset.kind === 'html' ? htmlBuffer : readFileSync(resolve(asset.sourcePath));
    const validation = validateAssetBody(asset, body);
    if (!validation.schemaResult) throw new Error(`invalid_local_asset:${asset.path}:${validation.error}`);
    return { ...asset, expectedSha256: validation.bodySha256, expectedBytes: validation.bodyBytes };
  });
}

async function preflight() {
  const [pr, deployments, version, health, remoteHtml] = await Promise.all([
    fetchJson('https://api.github.com/repos/simonkey888/VOY/pulls/22'),
    fetchJson(`${apiRoot}/deployments`, { headers: { Authorization: `Bearer ${token}` } }),
    fetchJson(`${apiRoot}/versions/${activeVersionId}`, { headers: { Authorization: `Bearer ${token}` } }),
    fetchJson(`${workerUrl}/api/health?exact_main_preflight=${Date.now()}`),
    fetchResponse(`${workerUrl}/VOY-Lite.html?exact_main_materialization=${Date.now()}`)
  ]);
  if (pr.merged_at === null || pr.merge_commit_sha !== sourceSha) throw new Error('final_main_pr_merge_mapping_failed');
  const active = activeDeployment(deployments);
  assertRouting(active);
  if (health.ok !== true || health.version !== expectedVersion || health.build_hash !== expectedBuild) throw new Error('production_health_mismatch');
  if (remoteHtml.status !== 200) throw new Error(`html_materialization_http_${remoteHtml.status}`);
  const htmlBuffer = Buffer.from(await remoteHtml.arrayBuffer());
  const manifest = expectedManifest(deriveHtmlMaterialization(htmlBuffer.toString('utf8')));
  const bindings = version.result?.resources?.bindings;
  if (!Array.isArray(bindings) || bindings.length !== 13) throw new Error('binding_count_mismatch');
  const names = bindings.map(binding => binding.name);
  for (const name of ['ASSETS', 'VOY_METRICS', 'NOMINATIM_COORDINATOR']) if (!names.includes(name)) throw new Error(`required_binding_missing:${name}`);
  writeFileSync(`${out}/preflight.json`, JSON.stringify({
    source_sha: sourceSha,
    build_hash: expectedBuild,
    deployment_id: active.id,
    version_id: activeVersionId,
    previous_version_id: previousVersionId,
    traffic: 100,
    binding_count: bindings.length,
    bindings: bindings.map(binding => `${binding.name}:${binding.type}`).sort(),
    health,
    checked_at: new Date().toISOString()
  }, null, 2));
  writeFileSync(`${out}/expected-assets.json`, JSON.stringify(manifest, null, 2));
  return manifest;
}

async function probeAsset(asset, expected, round) {
  const separator = asset.path.includes('?') ? '&' : '?';
  const requestedUrl = `${workerUrl}${asset.path}${separator}exact_main_round=${round}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
    const response = await fetchResponse(requestedUrl);
    const body = Buffer.from(await response.arrayBuffer());
    const headers = response.headers;
    return evaluateRemoteAsset(asset, body, {
      timestamp: new Date().toISOString(),
      round,
      requested_url: requestedUrl,
      effective_url: response.url,
      status: response.status,
      content_type: headers.get('content-type'),
      content_length: headers.get('content-length'),
      etag: headers.get('etag'),
      age: headers.get('age'),
      cache_status: headers.get('cf-cache-status'),
      cf_ray: headers.get('cf-ray'),
      colo: (headers.get('cf-ray') || '').split('-').at(-1) || null,
      remote_body_sha256: sha256(body)
    }, expected);
  } catch (error) {
    return { timestamp: new Date().toISOString(), round, path: asset.path, status: 0, pass: false, error: String(error?.stack || error) };
  }
}

async function converge(manifest) {
  const started = Date.now();
  let consecutive = 0;
  let attempts = 0;
  const logPath = `${out}/production-convergence.jsonl`;
  writeFileSync(logPath, '');
  while (attempts < 120) {
    attempts += 1;
    const [deployments, health, assets] = await Promise.all([
      fetchJson(`${apiRoot}/deployments`, { headers: { Authorization: `Bearer ${token}` } }),
      fetchJson(`${workerUrl}/api/health?exact_main_convergence=${attempts}-${Date.now()}`),
      Promise.all(REQUIRED_CITY_PLATFORM_ASSETS.map((asset, index) => probeAsset(asset, manifest[index], attempts)))
    ]);
    let deploymentPass = true;
    try { assertRouting(activeDeployment(deployments)); } catch { deploymentPass = false; }
    const healthPass = health.ok === true && health.version === expectedVersion && health.build_hash === expectedBuild;
    const assetsPass = assets.length === 13 && assets.every(asset => asset.pass === true);
    consecutive = deploymentPass && healthPass && assetsPass ? consecutive + 1 : 0;
    const elapsedMs = Date.now() - started;
    const record = { timestamp: new Date().toISOString(), attempt: attempts, consecutive, elapsed_ms: elapsedMs, deployment_pass: deploymentPass, health_pass: healthPass, assets_pass: assetsPass, health, assets };
    appendFileSync(logPath, `${JSON.stringify(record)}\n`);
    if (consecutive >= 20 && elapsedMs >= 120_000) {
      writeFileSync(`${out}/production-convergence-proof.json`, JSON.stringify(record, null, 2));
      return record;
    }
    await sleep(intervalMs);
  }
  throw new Error('exact_main_production_did_not_converge');
}

async function final() {
  const [deployments, health] = await Promise.all([
    fetchJson(`${apiRoot}/deployments`, { headers: { Authorization: `Bearer ${token}` } }),
    fetchJson(`${workerUrl}/api/health?exact_main_final=${Date.now()}`)
  ]);
  assertRouting(activeDeployment(deployments));
  if (health.ok !== true || health.version !== expectedVersion || health.build_hash !== expectedBuild) throw new Error('final_health_mismatch');
  const tail = readFileSync(`${out}/production-tail.log`, 'utf8');
  const versionIds = [...tail.matchAll(/"scriptVersion"\s*:\s*\{\s*"id"\s*:\s*"([^"]+)"/g)].map(match => match[1]);
  const outcomes = [...tail.matchAll(/"outcome"\s*:\s*"([^"]+)"/g)].map(match => match[1]);
  const exactEvents = versionIds.filter(id => id === activeVersionId).length;
  const nonOk = outcomes.filter(outcome => outcome !== 'ok');
  if (exactEvents < 1 || nonOk.length) throw new Error(`tail_proof_failed:${exactEvents}:${nonOk.length}`);
  const state = {
    main_sha: sourceSha,
    production_source_sha: sourceSha,
    main_sha_equals_production_sha: true,
    build_hash: expectedBuild,
    version_id: activeVersionId,
    deployment_id: activeDeploymentId,
    traffic: 100,
    health,
    tail_exact_events: exactEvents,
    tail_non_ok: nonOk,
    rollback_executed: false,
    verified_at: new Date().toISOString()
  };
  writeFileSync(`${out}/final-production-state.json`, JSON.stringify(state, null, 2));
}

const mode = process.argv[2];
if (mode === 'run') {
  const manifest = await preflight();
  await converge(manifest);
} else if (mode === 'final') {
  await final();
} else {
  throw new Error(`unknown_mode:${mode}`);
}
