#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inspectDeployment, convergenceSatisfied } from './svelte-candidate-gate.mjs';
import { analyzeCandidateTail } from './tail-runtime-proof.mjs';

const required = name => { const value = process.env[name]; if (!value) throw new Error(`missing_environment:${name}`); return value; };
const evidence = required('EVIDENCE_DIR');
const account = required('CLOUDFLARE_ACCOUNT_ID');
const token = required('CLOUDFLARE_API_TOKEN');
const worker = required('WORKER_NAME');
const stableId = required('STABLE_VERSION_ID');
const candidateId = required('CANDIDATE_VERSION_ID');
const blockedCandidateId = process.env.BLOCKED_CANDIDATE_VERSION_ID || null;

function findFiles(root, suffix) {
  const found = [];
  if (!existsSync(root)) return found;
  const walk = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && entry.name.endsWith(suffix)) found.push(path);
    }
  };
  walk(root);
  return found.sort();
}

function verifyPixelProofs(root, label) {
  const files = findFiles(root, '-map-pixel-proof.json');
  if (files.length < 6) throw new Error(`${label}_pixel_proof_count:${files.length}`);
  for (const file of files) {
    const proof = JSON.parse(readFileSync(file, 'utf8'));
    if (proof.result !== 'PASS' || !Array.isArray(proof.images) || proof.images.length !== 1) throw new Error(`${label}_pixel_proof_invalid:${file}`);
    const checks = proof.images[0]?.checks || {};
    if (checks.basemap_non_flat !== true || checks.route_visible !== true || checks.origin_marker_visible !== true || checks.destination_marker_visible !== true) throw new Error(`${label}_pixel_components_invalid:${file}`);
  }
  return files;
}

function verifyGeometryProofs(root, label) {
  const files = findFiles(root, '-map-render-geometry.json');
  if (files.length < 6) throw new Error(`${label}_geometry_proof_count:${files.length}`);
  for (const file of files) {
    const proof = JSON.parse(readFileSync(file, 'utf8'));
    if (proof.geometry?.geometryPass !== true) throw new Error(`${label}_geometry_invalid:${file}`);
    if (!Array.isArray(proof.tileResponses) || !proof.tileResponses.some(item => item.status === 200 && String(item.contentType || '').includes('image'))) throw new Error(`${label}_real_tile_missing:${file}`);
    if (proof.tileResponses.some(item => item.status >= 400)) throw new Error(`${label}_real_tile_failure:${file}`);
  }
  return files;
}

const localPixelFiles = verifyPixelProofs(`${evidence}/local-browser-screens`, 'local');
const localGeometryFiles = verifyGeometryProofs(`${evidence}/local-browser-screens`, 'local');
const candidatePixelFiles = verifyPixelProofs(`${evidence}/candidate-browser-screens`, 'candidate');
const candidateGeometryFiles = verifyGeometryProofs(`${evidence}/candidate-browser-screens`, 'candidate');

const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${worker}/deployments`, { headers: { Authorization: `Bearer ${token}` } });
if (!response.ok) throw new Error(`deployment_http_${response.status}`);
const payload = await response.json();
const deployment = inspectDeployment(payload, stableId, candidateId);
if (!deployment.valid) throw new Error('final_deployment_invalid');
if (blockedCandidateId && deployment.active.versions.some(version => version.version_id === blockedCandidateId)) throw new Error('blocked_candidate_still_active');
const proof = JSON.parse(readFileSync(`${evidence}/convergence-proof.json`, 'utf8'));
if (!convergenceSatisfied(proof.consecutive, proof.elapsed_ms)) throw new Error('convergence_proof_invalid');
const tailText = existsSync(`${evidence}/candidate-tail.log`) ? readFileSync(`${evidence}/candidate-tail.log`, 'utf8') : '';
const tail = analyzeCandidateTail(tailText, candidateId);
if (tail.nonOkOutcomes.length > 0 || tail.exceptions > 0) throw new Error('tail_runtime_failure');
const observability = tail.exactEvents > 0 ? 'PASS' : 'DEGRADED_NO_EVENTS';
const state = {
  result: 'PASS',
  exact_source_sha: required('GITHUB_SHA'),
  source_short_sha: required('SHORT_SHA'),
  stable_version_id: stableId,
  stable_traffic: 100,
  candidate_version_id: candidateId,
  candidate_traffic: 0,
  superseded_blocked_candidate_version_id: blockedCandidateId,
  blocked_candidate_active: false,
  deployment_id: deployment.active.id,
  previous_deployment_id: process.env.PREVIOUS_DEPLOYMENT_ID || null,
  stable_health: { version: required('EXPECTED_STABLE_VERSION'), build_hash: required('EXPECTED_STABLE_HASH') },
  candidate_health: { version: required('EXPECTED_CANDIDATE_VERSION'), build_hash: required('SHORT_SHA') },
  convergence_rounds: proof.consecutive,
  convergence_duration_ms: proof.elapsed_ms,
  local_real_map_pixel_proof: 'PASS',
  local_real_map_pixel_proof_files: localPixelFiles.length,
  local_real_map_geometry_proof_files: localGeometryFiles.length,
  candidate_real_map_pixel_proof: 'PASS',
  candidate_real_map_pixel_proof_files: candidatePixelFiles.length,
  candidate_real_map_geometry_proof_files: candidateGeometryFiles.length,
  basemap_visible: true,
  origin_marker_visible: true,
  destination_marker_visible: true,
  route_visible: true,
  observability,
  exact_version_tail_events: tail.exactEvents,
  observed_version_ids: tail.observedVersionIds,
  non_ok_tail_outcomes: tail.nonOkOutcomes,
  tail_exceptions: tail.exceptions,
  benign_client_cancellations: tail.benignClientCancellations,
  benign_client_cancellation_paths: tail.benignClientCancellationPaths,
  production_promoted: false,
  rollback_executed: false,
  verified_at: new Date().toISOString()
};
writeFileSync(`${evidence}/final-state.json`, `${JSON.stringify(state, null, 2)}\n`);
console.log(JSON.stringify(state));
