#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  REQUIRED_CITY_PLATFORM_ASSETS,
  REQUIRED_CITY_PLATFORM_ASSET_COUNT,
  assertCanonicalAssetSet,
  expectedAssetManifest,
  evaluateRemoteAsset
} from './required-city-platform-assets.mjs';

export const REQUIRED_CONSECUTIVE_ASSET_ROUNDS = 20;
export const MINIMUM_CONVERGENCE_DURATION_MS = 120_000;
export const DEFAULT_CONVERGENCE_INTERVAL_MS = 7_000;
export const MAX_REQUIRED_ASSET_BYTES = 4 * 1024 * 1024;

function requireValue(env, name) {
  const value = env[name];
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function deploymentsFromPayload(payload) {
  if (!payload || payload.success !== true) throw new Error('deployments_api_failed');
  const deployments = payload.result?.deployments || payload.result;
  if (!Array.isArray(deployments)) throw new Error('deployments_shape_unknown');
  return deployments;
}

export function inspectDeployment(payload, stableVersionId, candidateVersionId) {
  const active = deploymentsFromPayload(payload)[0];
  if (!active || !Array.isArray(active.versions)) throw new Error('active_deployment_missing');
  const byId = new Map(active.versions.map(version => [version.version_id, Number(version.percentage)]));
  return {
    active,
    byId,
    stableTraffic: byId.get(stableVersionId),
    candidateTraffic: byId.get(candidateVersionId),
    exactPair: active.versions.length === 2,
    valid: active.versions.length === 2 && byId.get(stableVersionId) === 100 && byId.get(candidateVersionId) === 0
  };
}

export function healthMatches(health, expectedVersion, expectedHash) {
  return Boolean(health && health.ok === true && health.version === expectedVersion && health.build_hash === expectedHash);
}

export function extractTailProof(text, candidateVersionId) {
  const versionIds = [...String(text || '').matchAll(/"scriptVersion"\s*:\s*\{\s*"id"\s*:\s*"([^"]+)"/g)]
    .map(match => match[1]);
  const outcomes = [...String(text || '').matchAll(/"outcome"\s*:\s*"([^"]+)"/g)]
    .map(match => match[1]);
  return {
    exactEvents: versionIds.filter(id => id === candidateVersionId).length,
    observedVersionIds: [...new Set(versionIds)],
    nonOkOutcomes: outcomes.filter(outcome => outcome !== 'ok')
  };
}

async function fetchResponse(url, options = {}, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, {
        ...options,
        redirect: 'manual',
        signal: AbortSignal.timeout(options.timeoutMs || 25_000),
        headers: { Accept: '*/*', ...(options.headers || {}) }
      });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 1_000);
    }
  }
  throw lastError;
}

async function readBoundedBody(response, maximumBytes = MAX_REQUIRED_ASSET_BYTES) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    await response.body?.cancel('declared_body_too_large');
    throw new Error(`asset_content_length_exceeded:${declaredLength}`);
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximumBytes) {
        await reader.cancel('stream_body_too_large');
        throw new Error(`asset_stream_limit_exceeded:${bytes}`);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, bytes);
}

async function fetchJson(url, options = {}, attempts = 3) {
  const response = await fetchResponse(url, {
    ...options,
    headers: { Accept: 'application/json', ...(options.headers || {}) }
  }, attempts);
  if (response.status !== 200) throw new Error(`http_${response.status}:${url}`);
  const body = await readBoundedBody(response, 1024 * 1024);
  return JSON.parse(body.toString('utf8'));
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

async function probeCandidateAsset(workerUrl, override, candidateVersionId, round, asset, expected) {
  const separator = asset.path.includes('?') ? '&' : '?';
  const stamp = `${Date.now()}-${round}-${crypto.randomUUID()}`;
  const requestedUrl = `${workerUrl}${asset.path}${separator}candidate_asset_convergence=${encodeURIComponent(stamp)}`;
  try {
    const response = await fetchResponse(requestedUrl, {
      headers: {
        'Cloudflare-Workers-Version-Overrides': override,
        'Cache-Control': 'no-cache, no-store, max-age=0',
        Pragma: 'no-cache',
        'X-VOY-Candidate-Probe': stamp
      }
    });
    const body = await readBoundedBody(response);
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

async function probeCandidateAssets(workerUrl, override, candidateVersionId, round, manifest) {
  const expectedByPath = new Map(manifest.map(asset => [asset.path, asset]));
  return Promise.all(REQUIRED_CITY_PLATFORM_ASSETS.map(asset => (
    probeCandidateAsset(workerUrl, override, candidateVersionId, round, asset, expectedByPath.get(asset.path))
  )));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function appendGithubEnv(name, value, env) {
  appendFileSync(requireValue(env, 'GITHUB_ENV'), `${name}=${value}\n`);
}

export function convergenceSatisfied({ consecutive, startedAt, now = Date.now() }) {
  return consecutive >= REQUIRED_CONSECUTIVE_ASSET_ROUNDS && now - startedAt >= MINIMUM_CONVERGENCE_DURATION_MS;
}

export async function converge(env = process.env) {
  assertCanonicalAssetSet();
  const accountId = requireValue(env, 'CLOUDFLARE_ACCOUNT_ID');
  const token = requireValue(env, 'CLOUDFLARE_API_TOKEN');
  const workerName = requireValue(env, 'WORKER_NAME');
  const workerUrl = requireValue(env, 'WORKER_URL').replace(/\/$/, '');
  const stableVersionId = requireValue(env, 'STABLE_VERSION_ID');
  const candidateVersionId = requireValue(env, 'CANDIDATE_VERSION_ID');
  const expectedVersion = requireValue(env, 'EXPECTED_PRODUCTION_VERSION');
  const stableHash = requireValue(env, 'EXPECTED_PRODUCTION_HASH');
  const candidateHash = requireValue(env, 'SHORT_SHA');
  const evidenceDir = requireValue(env, 'EVIDENCE_DIR');
  const sourceRoot = env.EXPECTED_SOURCE_ROOT || process.cwd();
  const intervalMs = Number(env.CONVERGENCE_INTERVAL_MS || DEFAULT_CONVERGENCE_INTERVAL_MS);
  if (!Number.isFinite(intervalMs) || intervalMs < 6_000) throw new Error(`convergence_interval_too_short:${intervalMs}`);
  const manifest = expectedAssetManifest(sourceRoot);
  if (manifest.length !== REQUIRED_CITY_PLATFORM_ASSET_COUNT) throw new Error(`required_asset_manifest_count:${manifest.length}`);
  writeJson(`${evidenceDir}/required-assets-manifest.json`, manifest);

  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/deployments`;
  const override = `${workerName}="${candidateVersionId}"`;
  const logPath = `${evidenceDir}/convergence.log`;
  const assetLogPath = `${evidenceDir}/convergence-assets.jsonl`;
  writeFileSync(logPath, '');
  writeFileSync(assetLogPath, '');
  let consecutive = 0;
  const startedAt = Date.now();

  for (let attempt = 1; attempt <= 120; attempt += 1) {
    const timestamp = `${Date.now()}-${attempt}`;
    let deploymentResult = null;
    let candidateHealth = null;
    let stableHealth = null;
    let assetResults = [];
    let error = null;
    try {
      [deploymentResult, candidateHealth, stableHealth, assetResults] = await Promise.all([
        fetchJson(apiUrl, { headers: { Authorization: `Bearer ${token}` } }),
        fetchJson(`${workerUrl}/api/health?candidate_convergence=${timestamp}`, {
          headers: {
            'Cloudflare-Workers-Version-Overrides': override,
            'Cache-Control': 'no-cache, no-store, max-age=0',
            Pragma: 'no-cache'
          }
        }),
        fetchJson(`${workerUrl}/api/health?stable_convergence=${timestamp}`, {
          headers: { 'Cache-Control': 'no-cache, no-store, max-age=0', Pragma: 'no-cache' }
        }),
        probeCandidateAssets(workerUrl, override, candidateVersionId, attempt, manifest)
      ]);
    } catch (caught) {
      error = String(caught?.stack || caught);
    }

    let deployment = null;
    try {
      if (deploymentResult) deployment = inspectDeployment(deploymentResult, stableVersionId, candidateVersionId);
    } catch (caught) {
      error = error || String(caught?.stack || caught);
    }
    const deploymentOk = deployment?.valid === true;
    const candidateOk = healthMatches(candidateHealth, expectedVersion, candidateHash);
    const stableOk = healthMatches(stableHealth, expectedVersion, stableHash);
    const assetsOk = assetResults.length === REQUIRED_CITY_PLATFORM_ASSET_COUNT && assetResults.every(result => result.pass);
    consecutive = deploymentOk && candidateOk && stableOk && assetsOk ? consecutive + 1 : 0;
    for (const assetResult of assetResults) appendFileSync(assetLogPath, `${JSON.stringify(assetResult)}\n`);
    const elapsedMs = Date.now() - startedAt;
    const record = {
      timestamp: new Date().toISOString(),
      attempt,
      elapsed_ms: elapsedMs,
      deployment_id: deployment?.active?.id || null,
      deployment_ok: deploymentOk,
      candidate_ok: candidateOk,
      stable_ok: stableOk,
      assets_ok: assetsOk,
      required_assets: REQUIRED_CITY_PLATFORM_ASSET_COUNT,
      passed_assets: assetResults.filter(result => result.pass).length,
      body_hash_pass: assetResults.filter(result => result.hash_pass).length,
      asset_statuses: Object.fromEntries(assetResults.map(result => [result.path, result.status])),
      consecutive,
      required_consecutive: REQUIRED_CONSECUTIVE_ASSET_ROUNDS,
      minimum_duration_ms: MINIMUM_CONVERGENCE_DURATION_MS,
      candidate_build_hash: candidateHealth?.build_hash || null,
      stable_build_hash: stableHealth?.build_hash || null,
      error
    };
    appendFileSync(logPath, `${JSON.stringify(record)}\n`);

    if (convergenceSatisfied({ consecutive, startedAt })) {
      appendGithubEnv('CANDIDATE_DEPLOYMENT_ID', deployment.active.id, env);
      writeJson(`${evidenceDir}/candidate-health-converged.json`, candidateHealth);
      writeJson(`${evidenceDir}/stable-health-converged.json`, stableHealth);
      writeJson(`${evidenceDir}/candidate-assets-converged.json`, assetResults);
      writeJson(`${evidenceDir}/api-deployments-converged.json`, deploymentResult);
      writeJson(`${evidenceDir}/convergence-proof.json`, record);
      return record;
    }
    await sleep(intervalMs);
  }
  throw new Error('candidate_deployment_did_not_converge');
}

export async function verifyFinal(env = process.env) {
  assertCanonicalAssetSet();
  const accountId = requireValue(env, 'CLOUDFLARE_ACCOUNT_ID');
  const token = requireValue(env, 'CLOUDFLARE_API_TOKEN');
  const workerName = requireValue(env, 'WORKER_NAME');
  const workerUrl = requireValue(env, 'WORKER_URL').replace(/\/$/, '');
  const stableVersionId = requireValue(env, 'STABLE_VERSION_ID');
  const candidateVersionId = requireValue(env, 'CANDIDATE_VERSION_ID');
  const expectedVersion = requireValue(env, 'EXPECTED_PRODUCTION_VERSION');
  const stableHash = requireValue(env, 'EXPECTED_PRODUCTION_HASH');
  const candidateHash = requireValue(env, 'SHORT_SHA');
  const evidenceDir = requireValue(env, 'EVIDENCE_DIR');
  const sourceRoot = env.EXPECTED_SOURCE_ROOT || process.cwd();
  const manifest = expectedAssetManifest(sourceRoot);
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/deployments`;
  const override = `${workerName}="${candidateVersionId}"`;
  const stamp = Date.now();
  const [payload, stableHealth, candidateHealth, assetResults] = await Promise.all([
    fetchJson(apiUrl, { headers: { Authorization: `Bearer ${token}` } }),
    fetchJson(`${workerUrl}/api/health?final_normal_verification=${stamp}`, {
      headers: { 'Cache-Control': 'no-cache, no-store, max-age=0', Pragma: 'no-cache' }
    }),
    fetchJson(`${workerUrl}/api/health?final_candidate_verification=${stamp}`, {
      headers: {
        'Cloudflare-Workers-Version-Overrides': override,
        'Cache-Control': 'no-cache, no-store, max-age=0',
        Pragma: 'no-cache'
      }
    }),
    probeCandidateAssets(workerUrl, override, candidateVersionId, 1, manifest)
  ]);
  const deployment = inspectDeployment(payload, stableVersionId, candidateVersionId);
  if (!deployment.valid || !deployment.exactPair) throw new Error('final_deployment_contract_failed');
  if (!healthMatches(stableHealth, expectedVersion, stableHash)) throw new Error('final_production_health_changed');
  if (!healthMatches(candidateHealth, expectedVersion, candidateHash)) throw new Error('final_candidate_health_changed');
  if (assetResults.length !== REQUIRED_CITY_PLATFORM_ASSET_COUNT || assetResults.some(result => !result.pass)) {
    throw new Error('final_required_asset_contract_failed');
  }

  const convergencePath = `${evidenceDir}/convergence-proof.json`;
  if (!existsSync(convergencePath)) throw new Error('convergence_proof_missing');
  const convergence = JSON.parse(readFileSync(convergencePath, 'utf8'));
  if (convergence.consecutive < REQUIRED_CONSECUTIVE_ASSET_ROUNDS || convergence.elapsed_ms < MINIMUM_CONVERGENCE_DURATION_MS) {
    throw new Error('convergence_proof_insufficient');
  }

  const candidateVersionPath = `${evidenceDir}/candidate-version.json`;
  if (!existsSync(candidateVersionPath)) throw new Error('candidate_version_evidence_missing');
  const candidateVersionEvidence = JSON.parse(readFileSync(candidateVersionPath, 'utf8'));
  if (candidateVersionEvidence.version_id !== candidateVersionId || candidateVersionEvidence.source_sha !== requireValue(env, 'GITHUB_SHA')) {
    throw new Error('candidate_version_source_mapping_failed');
  }

  const tailPath = `${evidenceDir}/candidate-tail.log`;
  const tail = existsSync(tailPath) ? readFileSync(tailPath, 'utf8') : '';
  const proof = extractTailProof(tail, candidateVersionId);
  if (proof.exactEvents < 1) throw new Error('candidate_tail_version_proof_missing');
  if (proof.nonOkOutcomes.length) throw new Error(`candidate_tail_non_ok:${proof.nonOkOutcomes.join(',')}`);
  writeJson(`${evidenceDir}/api-deployments-final.json`, payload);
  writeJson(`${evidenceDir}/production-health-final.json`, stableHealth);
  writeJson(`${evidenceDir}/candidate-health-final.json`, candidateHealth);
  writeJson(`${evidenceDir}/candidate-assets-final.json`, assetResults);
  const finalState = {
    exact_source_sha: requireValue(env, 'GITHUB_SHA'),
    source_short_sha: candidateHash,
    deployment_id: deployment.active.id,
    previous_deployment_id: env.PREVIOUS_DEPLOYMENT_ID || null,
    stable_version_id: stableVersionId,
    stable_traffic: 100,
    candidate_version_id: candidateVersionId,
    candidate_traffic: 0,
    production_health: { version: stableHealth.version, build_hash: stableHealth.build_hash },
    candidate_health: { version: candidateHealth.version, build_hash: candidateHealth.build_hash },
    required_assets: REQUIRED_CITY_PLATFORM_ASSET_COUNT,
    final_asset_pass: assetResults.filter(result => result.pass).length,
    body_hash_pass: assetResults.filter(result => result.hash_pass).length,
    convergence_rounds: convergence.consecutive,
    convergence_duration_ms: convergence.elapsed_ms,
    version_id_proof: {
      result: 'PASS',
      sources: ['candidate-version-api', 'deployment-api', 'override-health-build-hash', 'browser-same-origin-override-headers', 'exact-version-tail'],
      candidate_version_source_sha: candidateVersionEvidence.source_sha
    },
    candidate_tail_events: proof.exactEvents,
    observed_candidate_version_ids: proof.observedVersionIds,
    non_ok_tail_outcomes: proof.nonOkOutcomes,
    rollback_executed: false,
    production_promoted: false,
    verified_at: new Date().toISOString()
  };
  writeJson(`${evidenceDir}/final-state.json`, finalState);
  return finalState;
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'converge') await converge();
  else if (mode === 'final') await verifyFinal();
  else throw new Error(`unknown_mode:${mode}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error?.stack || error);
    process.exit(1);
  });
}
