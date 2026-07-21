#!/usr/bin/env bash
set -euo pipefail

WORKER_NAME="${WORKER_NAME:-voy-app}"
WORKER_URL="${WORKER_URL:-https://voy-app.simondalmasso44.workers.dev}"
EXPECTED_PRODUCTION_VERSION="${EXPECTED_PRODUCTION_VERSION:-V7.8.0}"
EXPECTED_PRODUCTION_HASH="${EXPECTED_PRODUCTION_HASH:-4a8b91e}"
EXPECTED_STABLE_VERSION_ID="${EXPECTED_STABLE_VERSION_ID:-9508254e-6bbe-48ee-a126-d57d405b70a6}"
EXPECTED_FAILED_CANDIDATE_VERSION_ID="${EXPECTED_FAILED_CANDIDATE_VERSION_ID:-aec70bcf-d02c-416a-b9f5-be4d83b34b32}"
EVIDENCE_DIR="${EVIDENCE_DIR:-test-results/exact-final-candidate}"
EXPECTED_SOURCE_ROOT="${EXPECTED_SOURCE_ROOT:-$PWD}"
CONVERGENCE_INTERVAL_MS="${CONVERGENCE_INTERVAL_MS:-7000}"

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"

SHORT_SHA="${GITHUB_SHA:0:7}"
API_ROOT="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$WORKER_NAME"
mkdir -p "$EVIDENCE_DIR"

git rev-parse HEAD | tee "$EVIDENCE_DIR/exact-source-sha.txt"
test "$(git rev-parse HEAD)" = "$GITHUB_SHA"
git diff --check

echo '[candidate] lint'
bun run lint 2>&1 | tee "$EVIDENCE_DIR/eslint.log"
echo '[candidate] tests'
bun run test 2>&1 | tee "$EVIDENCE_DIR/node-tests.log"
echo '[candidate] Wrangler dry-run'
wrangler deploy --dry-run --minify 2>&1 | tee "$EVIDENCE_DIR/wrangler-dry-run.log"

echo '[candidate] materialize exact build'
BUILD_HASH="$SHORT_SHA" node scripts/inject-build-hash.mjs 2>&1 | tee "$EVIDENCE_DIR/inject-build-hash.log"
grep -F "const BUILD_HASH = \"$SHORT_SHA\";" worker.js
grep -F "window.VOY_BUILD_HASH='$SHORT_SHA'" public/VOY-Lite.html
node --input-type=module <<'NODE'
import { writeFileSync } from 'node:fs';
import { expectedAssetManifest } from './scripts/required-city-platform-assets.mjs';
const manifest = expectedAssetManifest(process.cwd());
if (manifest.length !== 13) throw new Error(`materialized_asset_count:${manifest.length}`);
writeFileSync(`${process.env.EVIDENCE_DIR}/materialized-required-assets.json`, JSON.stringify(manifest, null, 2));
NODE

echo '[candidate] local desktop/mobile browser'
bash scripts/run-browser-smoke.sh 2>&1 | tee "$EVIDENCE_DIR/local-browser.log"

echo '[candidate] snapshot stable production and failed candidate'
wrangler deployments list --json > "$EVIDENCE_DIR/wrangler-deployments-before.json"
curl --fail --silent --show-error --retry 3 \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "$API_ROOT/deployments" > "$EVIDENCE_DIR/api-deployments-before.json"
curl --fail --silent --show-error --retry 3 \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "$API_ROOT/versions?per_page=100" > /tmp/versions-before.json
curl --fail --silent --show-error --max-time 20 \
  "$WORKER_URL/api/health?exact_repair_baseline=$(date +%s%N)" \
  > "$EVIDENCE_DIR/production-health-before.json"

PREVIOUS_DEPLOYMENT_ID="$(node <<'NODE'
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(process.env.EVIDENCE_DIR + '/api-deployments-before.json', 'utf8'));
if (!payload.success) throw new Error('deployments_query_failed');
const deployments = payload.result?.deployments || payload.result || [];
const active = deployments[0];
if (!active || !Array.isArray(active.versions)) throw new Error('active_deployment_missing');
const traffic = new Map(active.versions.map(version => [version.version_id, Number(version.percentage)]));
if (active.versions.length !== 2) throw new Error(`preflight_version_count:${active.versions.length}`);
if (traffic.get(process.env.EXPECTED_STABLE_VERSION_ID) !== 100) throw new Error('stable_version_or_traffic_changed');
if (traffic.get(process.env.EXPECTED_FAILED_CANDIDATE_VERSION_ID) !== 0) throw new Error('failed_candidate_version_or_traffic_changed');
const health = JSON.parse(fs.readFileSync(process.env.EVIDENCE_DIR + '/production-health-before.json', 'utf8'));
if (health.ok !== true || health.version !== process.env.EXPECTED_PRODUCTION_VERSION || health.build_hash !== process.env.EXPECTED_PRODUCTION_HASH) throw new Error('production_baseline_mismatch');
fs.writeFileSync(process.env.EVIDENCE_DIR + '/deployment-before.json', JSON.stringify({
  deployment_id: active.id,
  stable_version_id: process.env.EXPECTED_STABLE_VERSION_ID,
  stable_traffic: 100,
  failed_candidate_version_id: process.env.EXPECTED_FAILED_CANDIDATE_VERSION_ID,
  failed_candidate_traffic: 0,
  production_health: { version: health.version, build_hash: health.build_hash },
  checked_at: new Date().toISOString()
}, null, 2));
process.stdout.write(active.id);
NODE
)"
STABLE_VERSION_ID="$EXPECTED_STABLE_VERSION_ID"
export PREVIOUS_DEPLOYMENT_ID STABLE_VERSION_ID SHORT_SHA EXPECTED_SOURCE_ROOT CONVERGENCE_INTERVAL_MS EVIDENCE_DIR WORKER_NAME WORKER_URL EXPECTED_PRODUCTION_VERSION EXPECTED_PRODUCTION_HASH

curl --fail --silent --show-error --retry 3 \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "$API_ROOT/versions/$STABLE_VERSION_ID" > /tmp/stable-version-detail.json

echo '[candidate] upload exactly one new version'
CANDIDATE_TAG="city-platform-v1-repair-${GITHUB_SHA:0:12}"
wrangler versions upload --minify \
  --tag "$CANDIDATE_TAG" \
  --message "PR #21 repaired exact-head candidate $GITHUB_SHA" \
  2>&1 | tee "$EVIDENCE_DIR/version-upload.log"
curl --fail --silent --show-error --retry 3 \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "$API_ROOT/versions?per_page=100" > /tmp/versions-after.json

CANDIDATE_VERSION_ID="$(node <<'NODE'
const fs = require('node:fs');
function list(path) {
  const payload = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (!payload.success) throw new Error('versions_query_failed');
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.result?.items)) return payload.result.items;
  if (Array.isArray(payload.result?.versions)) return payload.result.versions;
  throw new Error('versions_shape_unknown');
}
const before = new Set(list('/tmp/versions-before.json').map(version => version.id).filter(Boolean));
const added = list('/tmp/versions-after.json').filter(version => version.id && !before.has(version.id));
if (added.length !== 1) throw new Error(`candidate_version_not_unique:${added.length}`);
const candidate = added[0];
if (candidate.id === process.env.EXPECTED_FAILED_CANDIDATE_VERSION_ID) throw new Error('failed_candidate_reused');
fs.writeFileSync(process.env.EVIDENCE_DIR + '/candidate-version.json', JSON.stringify({
  version_id: candidate.id,
  version_number: candidate.number || null,
  source_sha: process.env.GITHUB_SHA,
  source_short_sha: process.env.SHORT_SHA,
  tag: process.env.CANDIDATE_TAG,
  created_on: candidate.metadata?.created_on || null
}, null, 2));
process.stdout.write(candidate.id);
NODE
)"
export CANDIDATE_VERSION_ID CANDIDATE_TAG

echo '[candidate] verify binding parity'
curl --fail --silent --show-error --retry 3 \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "$API_ROOT/versions/$CANDIDATE_VERSION_ID" > /tmp/candidate-version-detail.json
node <<'NODE'
const fs = require('node:fs');
function contract(path) {
  const payload = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (!payload.success) throw new Error('version_detail_failed');
  const bindings = payload.result?.resources?.bindings;
  if (!Array.isArray(bindings)) throw new Error('version_bindings_missing');
  return bindings.map(binding => `${binding.name}:${binding.type}`).sort();
}
const stable = contract('/tmp/stable-version-detail.json');
const candidate = contract('/tmp/candidate-version-detail.json');
if (stable.length !== candidate.length || stable.some((value, index) => value !== candidate[index])) throw new Error('binding_contract_mismatch');
for (const required of ['ASSETS', 'VOY_METRICS', 'NOMINATIM_COORDINATOR']) {
  if (!candidate.some(value => value.startsWith(`${required}:`))) throw new Error(`required_binding_missing:${required}`);
}
fs.writeFileSync(process.env.EVIDENCE_DIR + '/binding-contract.json', JSON.stringify({
  contracts_equal: true,
  stable_binding_count: stable.length,
  candidate_binding_count: candidate.length,
  bindings: candidate,
  required_bindings_present: ['ASSETS', 'VOY_METRICS', 'NOMINATIM_COORDINATOR']
}, null, 2));
NODE

echo '[candidate] create stable 100% / candidate 0% deployment'
wrangler versions deploy \
  "$STABLE_VERSION_ID@100%" \
  "$CANDIDATE_VERSION_ID@0%" \
  --message "PR #21 repaired candidate 0% $GITHUB_SHA" \
  --yes 2>&1 | tee "$EVIDENCE_DIR/candidate-deployment.log"

TAIL_PID=''
stop_tail() {
  if [[ -n "$TAIL_PID" ]] && kill -0 "$TAIL_PID" 2>/dev/null; then
    kill "$TAIL_PID" 2>/dev/null || true
    wait "$TAIL_PID" 2>/dev/null || true
  fi
}
trap stop_tail EXIT

echo '[candidate] start exact-version tail'
timeout 600s wrangler tail "$WORKER_NAME" \
  --format json \
  --version-id "$CANDIDATE_VERSION_ID" \
  > "$EVIDENCE_DIR/candidate-tail.log" 2>&1 &
TAIL_PID="$!"
sleep 5
kill -0 "$TAIL_PID"

echo '[candidate] require 20 rounds, 13 assets, >=120 seconds'
node scripts/candidate-runtime-gate.mjs converge

echo '[candidate] browser exact candidate desktop/mobile'
export VOY_BASE_URL="$WORKER_URL"
export VOY_WORKER_NAME="$WORKER_NAME"
export VOY_CANDIDATE_VERSION_ID="$CANDIDATE_VERSION_ID"
export VOY_EXPECTED_BUILD_HASH="$SHORT_SHA"
export VOY_EVIDENCE_DIR="$EVIDENCE_DIR/browser"
export VOY_OUTPUT_DIR="$EVIDENCE_DIR/playwright-output"
export VOY_REPORT_DIR="$EVIDENCE_DIR/playwright-report"
npm exec --yes --package=@playwright/test@1.61.1 -- sh -c '
  PLAYWRIGHT_BIN=$(command -v playwright)
  NODE_PATH=$(cd "$(dirname "$PLAYWRIGHT_BIN")/.." && pwd)
  export NODE_PATH
  playwright test --config=candidate-tests/playwright.config.js
' 2>&1 | tee "$EVIDENCE_DIR/candidate-browser.log"

echo '[candidate] browser clean-cache network acquisition'
export VOY_EXPECTED_SOURCE_ROOT="$EXPECTED_SOURCE_ROOT"
export VOY_EVIDENCE_DIR="$EVIDENCE_DIR/cache-isolation"
export VOY_OUTPUT_DIR="$EVIDENCE_DIR/cache-isolation-output"
export VOY_REPORT_DIR="$EVIDENCE_DIR/cache-isolation-report"
npm exec --yes --package=@playwright/test@1.61.1 -- sh -c '
  PLAYWRIGHT_BIN=$(command -v playwright)
  NODE_PATH=$(cd "$(dirname "$PLAYWRIGHT_BIN")/.." && pwd)
  export NODE_PATH
  playwright test --config=candidate-tests/playwright.cache-isolation.config.js
' 2>&1 | tee "$EVIDENCE_DIR/cache-isolation-browser.log"

echo '[candidate] final exact state verification'
node scripts/candidate-runtime-gate.mjs final
stop_tail
trap - EXIT

echo "CANDIDATE_VERSION_ID=$CANDIDATE_VERSION_ID" >> "$GITHUB_ENV"
if [[ -f "$EVIDENCE_DIR/final-state.json" ]]; then
  CANDIDATE_DEPLOYMENT_ID="$(node -p "require('./$EVIDENCE_DIR/final-state.json').deployment_id")"
  echo "CANDIDATE_DEPLOYMENT_ID=$CANDIDATE_DEPLOYMENT_ID" >> "$GITHUB_ENV"
fi

echo '[candidate] complete: production unchanged, candidate at 0%'
