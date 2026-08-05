#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
}

const policy = JSON.parse(readFileSync('config/production-assets.json', 'utf8'));
const base = required('WORKER_URL').replace(/\/$/, '');
const worker = required('WORKER_NAME');
const version = required('CANDIDATE_VERSION_ID');
const evidence = required('EVIDENCE_DIR');
const paths = [...policy.retired_public_paths, '/navigator/other.js'];
const results = [];

for (const path of paths) {
  const response = await fetch(`${base}${path}?voy_retired_probe=${crypto.randomUUID()}`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(25_000),
    headers: {
      Accept: 'text/html,application/json',
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
      'Cloudflare-Workers-Version-Overrides': `${worker}="${version}"`
    }
  });
  const body = await response.text();
  const forbidden = policy.forbidden_public_markers.filter(marker => body.includes(marker));
  const pass = response.status === 410
    && body === 'Recurso público retirado.'
    && forbidden.length === 0
    && !response.headers.get('location');
  results.push({ path, status: response.status, content_type: response.headers.get('content-type'), bytes: Buffer.byteLength(body), forbidden, pass });
}

const output = {
  result: results.every(item => item.pass) ? 'PASS' : 'FAIL',
  candidate_version_id: version,
  checked_at: new Date().toISOString(),
  routes: results
};
writeFileSync(`${evidence}/retired-public-routes.json`, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
if (output.result !== 'PASS') process.exit(1);
