#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

function requireValue(env, name) {
  const value = env[name];
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
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
    valid: byId.get(stableVersionId) === 100 && byId.get(candidateVersionId) === 0
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

async function fetchJson(url, options = {}, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(20_000),
        headers: { Accept: 'application/json', ...(options.headers || {}) }
      });
      if (!response.ok) throw new Error(`http_${response.status}:${url}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError;
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function appendGithubEnv(name, value, env) {
  appendFileSync(requireValue(env, 'GITHUB_ENV'), `${name}=${value}\n`);
}

export async function converge(env = process.env) {
  const accountId = requireValue(env, 'CLOUDFLARE_ACCOUNT_ID');
  const token = requireValue(env, 'CLOUDFLARE_API_TOKEN');
  const workerName = requireValue(env, 'WORKER_NAME');
  const workerUrl = requireValue(env, 'WORKER_URL');
  const stableVersionId = requireValue(env, 'STABLE_VERSION_ID');
  const candidateVersionId = requireValue(env, 'CANDIDATE_VERSION_ID');
  const expectedVersion = requireValue(env, 'EXPECTED_PRODUCTION_VERSION');
  const stableHash = requireValue(env, 'EXPECTED_PRODUCTION_HASH');
  const candidateHash = requireValue(env, 'SHORT_SHA');
  const evidenceDir = requireValue(env, 'EVIDENCE_DIR');
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/deployments`;
  const override = `${workerName}="${candidateVersionId}"`;
  const logPath = `${evidenceDir}/convergence.log`;
  writeFileSync(logPath, '');
  let consecutive = 0;

  for (let attempt = 1; attempt <= 120; attempt += 1) {
    const timestamp = `${Date.now()}-${attempt}`;
    let deploymentResult = null;
    let candidateHealth = null;
    let stableHealth = null;
    let error = null;
    try {
      [deploymentResult, candidateHealth, stableHealth] = await Promise.all([
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
        })
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
    consecutive = deploymentOk && candidateOk && stableOk ? consecutive + 1 : 0;
    const record = {
      timestamp: new Date().toISOString(),
      attempt,
      deployment_id: deployment?.active?.id || null,
      deployment_ok: deploymentOk,
      candidate_ok: candidateOk,
      stable_ok: stableOk,
      consecutive,
      candidate_build_hash: candidateHealth?.build_hash || null,
      stable_build_hash: stableHealth?.build_hash || null,
      error
    };
    appendFileSync(logPath, `${JSON.stringify(record)}\n`);

    if (consecutive >= 3) {
      appendGithubEnv('CANDIDATE_DEPLOYMENT_ID', deployment.active.id, env);
      writeJson(`${evidenceDir}/candidate-health-converged.json`, candidateHealth);
      writeJson(`${evidenceDir}/stable-health-converged.json`, stableHealth);
      writeJson(`${evidenceDir}/api-deployments-converged.json`, deploymentResult);
      writeJson(`${evidenceDir}/convergence-proof.json`, record);
      return record;
    }
    await new Promise(resolve => setTimeout(resolve, 5_000));
  }
  throw new Error('candidate_deployment_did_not_converge');
}

export async function verifyFinal(env = process.env) {
  const accountId = requireValue(env, 'CLOUDFLARE_ACCOUNT_ID');
  const token = requireValue(env, 'CLOUDFLARE_API_TOKEN');
  const workerName = requireValue(env, 'WORKER_NAME');
  const workerUrl = requireValue(env, 'WORKER_URL');
  const stableVersionId = requireValue(env, 'STABLE_VERSION_ID');
  const candidateVersionId = requireValue(env, 'CANDIDATE_VERSION_ID');
  const expectedVersion = requireValue(env, 'EXPECTED_PRODUCTION_VERSION');
  const stableHash = requireValue(env, 'EXPECTED_PRODUCTION_HASH');
  const evidenceDir = requireValue(env, 'EVIDENCE_DIR');
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/deployments`;
  const [payload, health] = await Promise.all([
    fetchJson(apiUrl, { headers: { Authorization: `Bearer ${token}` } }),
    fetchJson(`${workerUrl}/api/health?final_normal_verification=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache, no-store, max-age=0', Pragma: 'no-cache' }
    })
  ]);
  const deployment = inspectDeployment(payload, stableVersionId, candidateVersionId);
  if (!deployment.valid || !deployment.exactPair) throw new Error('final_deployment_contract_failed');
  if (!healthMatches(health, expectedVersion, stableHash)) throw new Error('final_production_health_changed');
  const tailPath = `${evidenceDir}/candidate-tail.log`;
  const tail = existsSync(tailPath) ? readFileSync(tailPath, 'utf8') : '';
  const proof = extractTailProof(tail, candidateVersionId);
  if (proof.exactEvents < 1) throw new Error(`candidate_version_proof_insufficient:${proof.exactEvents}`);
  if (proof.nonOkOutcomes.length) throw new Error(`candidate_tail_non_ok:${proof.nonOkOutcomes.join(',')}`);
  writeJson(`${evidenceDir}/api-deployments-final.json`, payload);
  writeJson(`${evidenceDir}/production-health-final.json`, health);
  const finalState = {
    exact_source_sha: requireValue(env, 'GITHUB_SHA'),
    source_short_sha: requireValue(env, 'SHORT_SHA'),
    deployment_id: deployment.active.id,
    previous_deployment_id: env.PREVIOUS_DEPLOYMENT_ID || null,
    stable_version_id: stableVersionId,
    stable_traffic: 100,
    candidate_version_id: candidateVersionId,
    candidate_traffic: 0,
    production_health: { version: health.version, build_hash: health.build_hash },
    candidate_tail_events: proof.exactEvents,
    minimum_candidate_tail_events: 1,
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
