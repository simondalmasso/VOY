#!/usr/bin/env bash
set -euo pipefail

WORKER_NAME="${WORKER_NAME:-voy-app}"
WORKER_URL="${WORKER_URL:-https://voy-app.simondalmasso44.workers.dev}"
EXPECTED_PRODUCTION_VERSION="${EXPECTED_PRODUCTION_VERSION:-V7.8.0}"
EXPECTED_PRODUCTION_HASH="${EXPECTED_PRODUCTION_HASH:-1374f09}"
EXPECTED_STABLE_VERSION_ID="${EXPECTED_STABLE_VERSION_ID:-b4f1833a-f2a1-4a44-b351-13ae48972c20}"
EVIDENCE_DIR="${EVIDENCE_DIR:-test-results/voice-candidate}"
EXPECTED_SOURCE_ROOT="${EXPECTED_SOURCE_ROOT:-$PWD}"
CONVERGENCE_INTERVAL_MS="${CONVERGENCE_INTERVAL_MS:-7000}"

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"

SHORT_SHA="${GITHUB_SHA:0:7}"
API_ROOT="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$WORKER_NAME"
VOICE_SAMPLE_WAV="$EVIDENCE_DIR/voice-sample-es-ar.wav"
mkdir -p "$EVIDENCE_DIR"
export WORKER_NAME WORKER_URL EXPECTED_PRODUCTION_VERSION EXPECTED_PRODUCTION_HASH EXPECTED_SOURCE_ROOT
export CONVERGENCE_INTERVAL_MS EVIDENCE_DIR SHORT_SHA VOICE_SAMPLE_WAV

printf '%s\n' "$GITHUB_SHA" > "$EVIDENCE_DIR/exact-source-sha.txt"
test "$(git rev-parse HEAD)" = "$GITHUB_SHA"
git diff --check

echo '[voice-candidate] frozen static gates'
bun run lint 2>&1 | tee "$EVIDENCE_DIR/eslint.log"
bun run test 2>&1 | tee "$EVIDENCE_DIR/node-tests.log"
wrangler deploy --dry-run --minify 2>&1 | tee "$EVIDENCE_DIR/wrangler-dry-run.log"

echo '[voice-candidate] materialize exact build'
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

echo '[voice-candidate] generate synthetic Spanish speech'
espeak-ng -v es -s 125 -w "$VOICE_SAMPLE_WAV" 'Hola VOY quiero ir a la terminal de omnibus' 2>&1 | tee "$EVIDENCE_DIR/espeak.log"
test -s "$VOICE_SAMPLE_WAV"
sha256sum "$VOICE_SAMPLE_WAV" > "$EVIDENCE_DIR/voice-sample.sha256"

echo '[voice-candidate] existing local browser with one evidence-preserving retry'
if ! bash scripts/run-browser-smoke.sh > "$EVIDENCE_DIR/local-browser-attempt-1.log" 2>&1; then
  sleep 3
  bash scripts/run-browser-smoke.sh > "$EVIDENCE_DIR/local-browser-attempt-2.log" 2>&1
  printf 'PASS_ON_RETRY\n' > "$EVIDENCE_DIR/local-browser-result.txt"
else
  printf 'PASS_FIRST_ATTEMPT\n' > "$EVIDENCE_DIR/local-browser-result.txt"
fi

echo '[voice-candidate] local Voice browser desktop Android and iPhone'
VOY_OUTPUT_DIR="$EVIDENCE_DIR/local-voice-output" \
VOY_REPORT_DIR="$EVIDENCE_DIR/local-voice-report" \
WRANGLER_LOG="$EVIDENCE_DIR/local-voice-wrangler.log" \
bash scripts/run-voice-browser-smoke.sh 2>&1 | tee "$EVIDENCE_DIR/local-voice-browser.log"

echo '[voice-candidate] snapshot exact production baseline'
wrangler deployments list --json > "$EVIDENCE_DIR/wrangler-deployments-before.json"
curl --fail --silent --show-error --retry 3 \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "$API_ROOT/deployments" > "$EVIDENCE_DIR/api-deployments-before.json"
curl --fail --silent --show-error --retry 3 \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "$API_ROOT/versions?per_page=100" > /tmp/voice-versions-before.json
curl --fail --silent --show-error --max-time 20 \
  "$WORKER_URL/api/health?voice_candidate_baseline=$(date +%s%N)" \
  > "$EVIDENCE_DIR/production-health-before.json"

PREVIOUS_DEPLOYMENT_ID="$(node <<'NODE'
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(process.env.EVIDENCE_DIR + '/api-deployments-before.json', 'utf8'));
if (payload.success !== true) throw new Error('deployments_query_failed');
const deployments = payload.result?.deployments || payload.result || [];
const active = deployments[0];
if (!active || !Array.isArray(active.versions)) throw new Error('active_deployment_missing');
const stable = active.versions.find(version => version.version_id === process.env.EXPECTED_STABLE_VERSION_ID);
if (!stable || Number(stable.percentage) !== 100) throw new Error('stable_version_or_traffic_changed');
if (active.versions.some(version => version.version_id !== process.env.EXPECTED_STABLE_VERSION_ID && Number(version.percentage) !== 0)) {
  throw new Error('unexpected_nonzero_version');
}
const health = JSON.parse(fs.readFileSync(process.env.EVIDENCE_DIR + '/production-health-before.json', 'utf8'));
if (health.ok !== true || health.version !== process.env.EXPECTED_PRODUCTION_VERSION || health.build_hash !== process.env.EXPECTED_PRODUCTION_HASH) {
  throw new Error('production_baseline_mismatch');
}
fs.writeFileSync(process.env.EVIDENCE_DIR + '/production-baseline.json', JSON.stringify({
  deployment_id: active.id,
  stable_version_id: stable.version_id,
  stable_traffic: Number(stable.percentage),
  all_versions: active.versions,
  health,
  checked_at: new Date().toISOString()
}, null, 2));
process.stdout.write(active.id);
NODE
)"
STABLE_VERSION_ID="$EXPECTED_STABLE_VERSION_ID"
export PREVIOUS_DEPLOYMENT_ID STABLE_VERSION_ID

curl --fail --silent --show-error --retry 3 \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "$API_ROOT/versions/$STABLE_VERSION_ID" > /tmp/voice-stable-version-detail.json

echo '[voice-candidate] upload exactly one new version'
CANDIDATE_TAG="voice-copilot-v1-${GITHUB_SHA:0:12}"
export CANDIDATE_TAG
wrangler versions upload --minify \
  --tag "$CANDIDATE_TAG" \
  --message "PR #23 Voice Copilot exact-head candidate $GITHUB_SHA" \
  2>&1 | tee "$EVIDENCE_DIR/version-upload.log"
curl --fail --silent --show-error --retry 3 \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "$API_ROOT/versions?per_page=100" > /tmp/voice-versions-after.json

CANDIDATE_VERSION_ID="$(node <<'NODE'
const fs = require('node:fs');
function versions(path) {
  const payload = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (payload.success !== true) throw new Error('versions_query_failed');
  if (Array.isArray(payload.result)) return payload.result;
  if (Array.isArray(payload.result?.items)) return payload.result.items;
  if (Array.isArray(payload.result?.versions)) return payload.result.versions;
  throw new Error('versions_shape_unknown');
}
const before = new Set(versions('/tmp/voice-versions-before.json').map(version => version.id).filter(Boolean));
const added = versions('/tmp/voice-versions-after.json').filter(version => version.id && !before.has(version.id));
if (added.length !== 1) throw new Error(`candidate_version_not_unique:${added.length}`);
const candidate = added[0];
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
export CANDIDATE_VERSION_ID

curl --fail --silent --show-error --retry 3 \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "$API_ROOT/versions/$CANDIDATE_VERSION_ID" > /tmp/voice-candidate-version-detail.json

echo '[voice-candidate] verify stable bindings plus exact Voice additions'
node <<'NODE'
const fs = require('node:fs');
function bindings(path) {
  const payload = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (payload.success !== true) throw new Error('version_detail_failed');
  const list = payload.result?.resources?.bindings;
  if (!Array.isArray(list)) throw new Error('version_bindings_missing');
  return list.map(binding => ({ name: binding.name, type: binding.type })).sort((a, b) => `${a.name}:${a.type}`.localeCompare(`${b.name}:${b.type}`));
}
const stable = bindings('/tmp/voice-stable-version-detail.json');
const candidate = bindings('/tmp/voice-candidate-version-detail.json');
const stableKeys = new Set(stable.map(binding => `${binding.name}:${binding.type}`));
const candidateKeys = new Set(candidate.map(binding => `${binding.name}:${binding.type}`));
const missing = [...stableKeys].filter(key => !candidateKeys.has(key));
const additions = candidate.filter(binding => !stableKeys.has(`${binding.name}:${binding.type}`));
if (missing.length) throw new Error(`stable_binding_missing:${missing.join(',')}`);
if (additions.length !== 2) throw new Error(`voice_binding_addition_count:${additions.length}`);
const additionMap = new Map(additions.map(binding => [binding.name, binding.type]));
if (additionMap.get('AI') !== 'ai') throw new Error(`ai_binding_invalid:${additionMap.get('AI')}`);
if (additionMap.get('VOY_VOICE_TEST_MODE') !== 'plain_text') throw new Error(`voice_test_mode_binding_invalid:${additionMap.get('VOY_VOICE_TEST_MODE')}`);
if (candidate.length !== stable.length + 2) throw new Error('candidate_binding_count_invalid');
fs.writeFileSync(process.env.EVIDENCE_DIR + '/binding-contract.json', JSON.stringify({
  result: 'PASS',
  stable_binding_count: stable.length,
  candidate_binding_count: candidate.length,
  stable_bindings: stable,
  candidate_bindings: candidate,
  exact_additions: additions
}, null, 2));
NODE

echo '[voice-candidate] create production 100% / Voice candidate 0% deployment'
wrangler versions deploy \
  "$STABLE_VERSION_ID@100%" \
  "$CANDIDATE_VERSION_ID@0%" \
  --message "PR #23 Voice Copilot candidate 0% $GITHUB_SHA" \
  --yes 2>&1 | tee "$EVIDENCE_DIR/candidate-deployment.log"

TAIL_PID=''
stop_tail() {
  if [[ -n "$TAIL_PID" ]] && kill -0 "$TAIL_PID" 2>/dev/null; then
    kill "$TAIL_PID" 2>/dev/null || true
    wait "$TAIL_PID" 2>/dev/null || true
  fi
}
trap stop_tail EXIT

echo '[voice-candidate] start exact-version tail'
timeout 1200s wrangler tail "$WORKER_NAME" \
  --format json \
  --version-id "$CANDIDATE_VERSION_ID" \
  > "$EVIDENCE_DIR/candidate-tail.log" 2>&1 &
TAIL_PID="$!"
sleep 5
kill -0 "$TAIL_PID"

echo '[voice-candidate] require 20 rounds, 13 exact assets and >=120 seconds'
node scripts/candidate-runtime-gate.mjs converge

echo '[voice-candidate] real Workers AI API gate'
node scripts/voice-candidate-api-gate.mjs 2>&1 | tee "$EVIDENCE_DIR/voice-api-gate.log"

echo '[voice-candidate] existing application browser through exact override'
export VOY_BASE_URL="$WORKER_URL"
export VOY_WORKER_NAME="$WORKER_NAME"
export VOY_CANDIDATE_VERSION_ID="$CANDIDATE_VERSION_ID"
export VOY_EXPECTED_BUILD_HASH="$SHORT_SHA"
export VOY_EVIDENCE_DIR="$EVIDENCE_DIR/city-browser"
export VOY_OUTPUT_DIR="$EVIDENCE_DIR/city-browser-output"
export VOY_REPORT_DIR="$EVIDENCE_DIR/city-browser-report"
npm exec --yes --package=@playwright/test@1.61.1 -- sh -c '
  PLAYWRIGHT_BIN=$(command -v playwright)
  NODE_PATH=$(cd "$(dirname "$PLAYWRIGHT_BIN")/.." && pwd)
  export NODE_PATH
  playwright test --config=candidate-tests/playwright.config.js
' 2>&1 | tee "$EVIDENCE_DIR/city-candidate-browser.log"

echo '[voice-candidate] clean Voice desktop/mobile through exact override'
export VOY_EVIDENCE_DIR="$EVIDENCE_DIR/voice-browser"
export VOY_OUTPUT_DIR="$EVIDENCE_DIR/voice-browser-output"
export VOY_REPORT_DIR="$EVIDENCE_DIR/voice-browser-report"
npm exec --yes --package=@playwright/test@1.61.1 -- sh -c '
  PLAYWRIGHT_BIN=$(command -v playwright)
  NODE_PATH=$(cd "$(dirname "$PLAYWRIGHT_BIN")/.." && pwd)
  export NODE_PATH
  playwright test --config=voice-candidate-tests/playwright.config.js
' 2>&1 | tee "$EVIDENCE_DIR/voice-candidate-browser.log"

echo '[voice-candidate] clean-cache territorial acquisition'
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

echo '[voice-candidate] final exact state and tail verification'
export EVIDENCE_DIR
node scripts/candidate-runtime-gate.mjs final
stop_tail
trap - EXIT

echo "CANDIDATE_VERSION_ID=$CANDIDATE_VERSION_ID" >> "$GITHUB_ENV"
if [[ -f "$EVIDENCE_DIR/final-state.json" ]]; then
  CANDIDATE_DEPLOYMENT_ID="$(node -p "require('./$EVIDENCE_DIR/final-state.json').deployment_id")"
  echo "CANDIDATE_DEPLOYMENT_ID=$CANDIDATE_DEPLOYMENT_ID" >> "$GITHUB_ENV"
fi

echo '[voice-candidate] complete: production unchanged at 100%, Voice candidate at 0%'
