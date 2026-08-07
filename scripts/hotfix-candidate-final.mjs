#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { inspectDeployment, convergenceSatisfied, extractTailProof } from './svelte-candidate-gate.mjs';

const required = name => { const value = process.env[name]; if (!value) throw new Error(`missing_environment:${name}`); return value; };
const evidence = required('EVIDENCE_DIR');
const account = required('CLOUDFLARE_ACCOUNT_ID');
const token = required('CLOUDFLARE_API_TOKEN');
const worker = required('WORKER_NAME');
const stableId = required('STABLE_VERSION_ID');
const candidateId = required('CANDIDATE_VERSION_ID');
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${worker}/deployments`, { headers: { Authorization: `Bearer ${token}` } });
if (!response.ok) throw new Error(`deployment_http_${response.status}`);
const payload = await response.json();
const deployment = inspectDeployment(payload, stableId, candidateId);
if (!deployment.valid) throw new Error('final_deployment_invalid');
const proof = JSON.parse(readFileSync(`${evidence}/convergence-proof.json`, 'utf8'));
if (!convergenceSatisfied(proof.consecutive, proof.elapsed_ms)) throw new Error('convergence_proof_invalid');
const tailText = existsSync(`${evidence}/candidate-tail.log`) ? readFileSync(`${evidence}/candidate-tail.log`, 'utf8') : '';
const tail = extractTailProof(tailText, candidateId);
let exceptions = 0;
for (const line of tailText.split(/\r?\n/)) {
  if (!line.trim().startsWith('{')) continue;
  try {
    const event = JSON.parse(line);
    if (Array.isArray(event.exceptions)) exceptions += event.exceptions.length;
  } catch {}
}
if (tail.nonOkOutcomes.length > 0 || exceptions > 0) throw new Error('tail_runtime_failure');
const observability = tail.exactEvents > 0 ? 'PASS' : 'DEGRADED_NO_EVENTS';
const state = {
  result: 'PASS',
  exact_source_sha: required('GITHUB_SHA'),
  source_short_sha: required('SHORT_SHA'),
  stable_version_id: stableId,
  stable_traffic: 100,
  candidate_version_id: candidateId,
  candidate_traffic: 0,
  deployment_id: deployment.active.id,
  previous_deployment_id: process.env.PREVIOUS_DEPLOYMENT_ID || null,
  stable_health: { version: required('EXPECTED_STABLE_VERSION'), build_hash: required('EXPECTED_STABLE_HASH') },
  candidate_health: { version: required('EXPECTED_CANDIDATE_VERSION'), build_hash: required('SHORT_SHA') },
  convergence_rounds: proof.consecutive,
  convergence_duration_ms: proof.elapsed_ms,
  observability,
  exact_version_tail_events: tail.exactEvents,
  observed_version_ids: tail.observedVersionIds,
  non_ok_tail_outcomes: tail.nonOkOutcomes,
  tail_exceptions: exceptions,
  production_promoted: false,
  rollback_executed: false,
  verified_at: new Date().toISOString()
};
writeFileSync(`${evidence}/final-state.json`, `${JSON.stringify(state, null, 2)}\n`);
console.log(JSON.stringify(state));
