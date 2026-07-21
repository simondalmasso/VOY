#!/usr/bin/env node
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  REQUIRED_CITY_PLATFORM_ASSETS,
  assertCanonicalAssetSet,
  expectedAssetManifest,
  evaluateRemoteAsset
} from './required-city-platform-assets.mjs';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
}

function sleep(ms) {
  return new Promise(resolvePromise => setTimeout(resolvePromise, ms));
}

function deployments(payload) {
  if (payload?.success !== true) throw new Error('deployments_api_failed');
  const value = payload.result?.deployments || payload.result;
  if (!Array.isArray(value)) throw new Error('deployments_shape_unknown');
  return value;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    redirect: 'manual',
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: 'application/json', ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error(`http_${response.status}:${url}`);
  return response.json();
}

function inspectDeployment(payload, stableVersionId, candidateVersionId) {
  const active = deployments(payload)[0];
  if (!active || !Array.isArray(active.versions)) throw new Error('active_deployment_missing');
  const traffic = new Map(active.versions.map(version => [version.version_id, Number(version.percentage)]));
  if (traffic.get(stableVersionId) !== 100) throw new Error(`stable_traffic_changed:${traffic.get(stableVersionId)}`);
  if (traffic.get(candidateVersionId) !== 0) throw new Error(`failed_candidate_not_zero:${traffic.get(candidateVersionId)}`);
  return {
    deployment_id: active.id,
    stable_version_id: stableVersionId,
    stable_traffic: traffic.get(stableVersionId),
    candidate_version_id: candidateVersionId,
    candidate_traffic: traffic.get(candidateVersionId),
    versions: active.versions
  };
}

function responseMetadata(response, requestedUrl, round, candidateVersionId) {
  const cfRay = response.headers.get('cf-ray');
  return {
    timestamp: new Date().toISOString(),
    round,
    requested_url: requestedUrl,
    effective_url: response.url,
    status: response.status,
    content_type: response.headers.get('content-type'),
    content_length: response.headers.get('content-length'),
    etag: response.headers.get('etag'),
    age: response.headers.get('age'),
    cache_status: response.headers.get('cf-cache-status'),
    cf_ray: cfRay,
    colo: cfRay?.includes('-') ? cfRay.split('-').at(-1) : null,
    version_id: candidateVersionId
  };
}

async function probeAsset(workerUrl, workerName, candidateVersionId, round, asset, expected) {
  const separator = asset.path.includes('?') ? '&' : '?';
  const probe = `${Date.now()}-${round}-${crypto.randomUUID()}`;
  const requestedUrl = `${workerUrl}${asset.path}${separator}failed_candidate_probe=${encodeURIComponent(probe)}`;
  try {
    const response = await fetch(requestedUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(25_000),
      headers: {
        Accept: '*/*',
        'Cloudflare-Workers-Version-Overrides': `${workerName}="${candidateVersionId}"`,
        'Cache-Control': 'no-cache, no-store, max-age=0',
        Pragma: 'no-cache',
        'X-VOY-Failed-Candidate-Probe': probe
      }
    });
    const body = Buffer.from(await response.arrayBuffer());
    return evaluateRemoteAsset(asset, body, responseMetadata(response, requestedUrl, round, candidateVersionId), expected);
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      round,
      requested_url: requestedUrl,
      effective_url: null,
      status: 0,
      content_type: null,
      content_length: null,
      etag: null,
      age: null,
      cache_status: null,
      cf_ray: null,
      colo: null,
      path: asset.path,
      source_path: asset.sourcePath,
      expected_source_sha256: expected.expectedSha256,
      expected_source_bytes: expected.expectedBytes,
      body_sha256: null,
      body_bytes: 0,
      json_parse_result: null,
      schema_result: false,
      city_id: null,
      version_id: candidateVersionId,
      status_pass: false,
      body_pass: false,
      hash_pass: false,
      city_pass: false,
      validation_error: String(error?.stack || error),
      pass: false
    };
  }
}

function classify(records) {
  const byPath = new Map();
  for (const record of records) {
    if (!byPath.has(record.path)) byPath.set(record.path, []);
    byPath.get(record.path).push(record);
  }
  const allPass = records.length === 30 * REQUIRED_CITY_PLATFORM_ASSETS.length && records.every(record => record.pass);
  if (allPass) return 'TRANSIENT_EDGE_OR_PROPAGATION_EVENT';

  const contentFailure = records.some(record => record.status === 200 && (!record.body_pass || !record.hash_pass || record.json_parse_result === false || record.schema_result === false || !record.city_pass));
  if (contentFailure) return 'CONTENT_OR_SCHEMA_INCORRECT';

  const intermittent404 = [...byPath.values()].some(values => {
    const statuses = new Set(values.map(value => value.status));
    return statuses.has(200) && statuses.has(404);
  });
  if (intermittent404) return 'INTERMITTENT_404';

  const providersPath = '/cities/santa-fe/providers.json';
  const providers = byPath.get(providersPath) || [];
  const providersAlways404 = providers.length === 30 && providers.every(record => record.status === 404);
  const allOthersPass = records.filter(record => record.path !== providersPath).every(record => record.pass);
  if (providersAlways404 && allOthersPass) return 'PERSISTENT_PROVIDERS_404';

  return 'UNCLASSIFIED_REQUIRED_ASSET_FAILURE';
}

async function main() {
  assertCanonicalAssetSet();
  const workerUrl = requireEnv('WORKER_URL').replace(/\/$/, '');
  const workerName = requireEnv('WORKER_NAME');
  const candidateVersionId = requireEnv('FAILED_CANDIDATE_VERSION_ID');
  const stableVersionId = requireEnv('STABLE_VERSION_ID');
  const expectedSourceRoot = resolve(requireEnv('EXPECTED_SOURCE_ROOT'));
  const evidenceDir = resolve(requireEnv('EVIDENCE_DIR'));
  const accountId = requireEnv('CLOUDFLARE_ACCOUNT_ID');
  const token = requireEnv('CLOUDFLARE_API_TOKEN');
  const rounds = Number(process.env.DIRECT_ASSET_ROUNDS || 30);
  const intervalMs = Number(process.env.DIRECT_ASSET_INTERVAL_MS || 5000);
  if (rounds !== 30) throw new Error(`diagnostic_rounds_must_be_30:${rounds}`);
  if (intervalMs < 5000) throw new Error(`diagnostic_interval_too_short:${intervalMs}`);

  mkdirSync(evidenceDir, { recursive: true });
  const manifest = expectedAssetManifest(expectedSourceRoot);
  const expectedByPath = new Map(manifest.map(asset => [asset.path, asset]));
  writeFileSync(`${evidenceDir}/expected-source-manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(`${evidenceDir}/direct-asset-records.jsonl`, '');

  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/deployments`;
  const deploymentBeforePayload = await fetchJson(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
  const deploymentBefore = inspectDeployment(deploymentBeforePayload, stableVersionId, candidateVersionId);
  writeFileSync(`${evidenceDir}/deployment-before.json`, `${JSON.stringify(deploymentBefore, null, 2)}\n`);

  const records = [];
  const startedAt = Date.now();
  for (let round = 1; round <= rounds; round += 1) {
    const roundRecords = await Promise.all(REQUIRED_CITY_PLATFORM_ASSETS.map(asset => (
      probeAsset(workerUrl, workerName, candidateVersionId, round, asset, expectedByPath.get(asset.path))
    )));
    for (const record of roundRecords) {
      records.push(record);
      appendFileSync(`${evidenceDir}/direct-asset-records.jsonl`, `${JSON.stringify(record)}\n`);
    }
    const roundSummary = {
      timestamp: new Date().toISOString(),
      round,
      pass: roundRecords.filter(record => record.pass).length,
      fail: roundRecords.filter(record => !record.pass).length,
      statuses: Object.fromEntries(roundRecords.map(record => [record.path, record.status]))
    };
    appendFileSync(`${evidenceDir}/rounds.jsonl`, `${JSON.stringify(roundSummary)}\n`);
    if (round < rounds) await sleep(intervalMs);
  }

  const deploymentAfterPayload = await fetchJson(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
  const deploymentAfter = inspectDeployment(deploymentAfterPayload, stableVersionId, candidateVersionId);
  writeFileSync(`${evidenceDir}/deployment-after.json`, `${JSON.stringify(deploymentAfter, null, 2)}\n`);

  const classification = classify(records);
  const pathSummary = Object.fromEntries(REQUIRED_CITY_PLATFORM_ASSETS.map(asset => {
    const values = records.filter(record => record.path === asset.path);
    return [asset.path, {
      rounds: values.length,
      pass: values.filter(value => value.pass).length,
      statuses: Object.fromEntries([...new Set(values.map(value => value.status))].map(status => [status, values.filter(value => value.status === status).length])),
      colos: [...new Set(values.map(value => value.colo).filter(Boolean))],
      body_hash_pass: values.filter(value => value.hash_pass).length,
      schema_pass: values.filter(value => value.schema_result).length
    }];
  }));
  const summary = {
    root_cause_class: classification,
    failed_candidate_version_id: candidateVersionId,
    stable_version_id: stableVersionId,
    deployment_before: deploymentBefore.deployment_id,
    deployment_after: deploymentAfter.deployment_id,
    rounds,
    required_assets: REQUIRED_CITY_PLATFORM_ASSETS.length,
    total_requests: records.length,
    passed_requests: records.filter(record => record.pass).length,
    failed_requests: records.filter(record => !record.pass).length,
    body_hash_pass: records.filter(record => record.hash_pass).length,
    duration_ms: Date.now() - startedAt,
    path_summary: pathSummary,
    production_traffic_changed: false,
    candidate_traffic_changed: false,
    completed_at: new Date().toISOString()
  };
  writeFileSync(`${evidenceDir}/diagnostic-summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => {
  console.error(error?.stack || error);
  process.exit(1);
});
