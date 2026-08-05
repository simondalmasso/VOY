#!/usr/bin/env bash
set -euo pipefail

WORKER_NAME="${WORKER_NAME:-voy-app}"
WORKER_URL="${WORKER_URL:-https://voy-app.simondalmasso44.workers.dev}"
EXPECTED_STABLE_VERSION="${EXPECTED_STABLE_VERSION:-V7.8.0}"
EXPECTED_STABLE_HASH="${EXPECTED_STABLE_HASH:-1374f09}"
EXPECTED_STABLE_VERSION_ID="${EXPECTED_STABLE_VERSION_ID:-b4f1833a-f2a1-4a44-b351-13ae48972c20}"
EXPECTED_CANDIDATE_VERSION="${EXPECTED_CANDIDATE_VERSION:-V8.0.0}"
EVIDENCE_DIR="${EVIDENCE_DIR:-test-results/svelte-final-candidate}"
CONVERGENCE_INTERVAL_MS="${CONVERGENCE_INTERVAL_MS:-7000}"
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"
SHORT_SHA="${GITHUB_SHA:0:7}"
API_ROOT="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$WORKER_NAME"
STATIC_MANIFEST_PATH="$EVIDENCE_DIR/static-manifest.json"
VOICE_SAMPLE_WAV="$EVIDENCE_DIR/voice-sample-es-ar.wav"
mkdir -p "$EVIDENCE_DIR"
export WORKER_NAME WORKER_URL EXPECTED_STABLE_VERSION EXPECTED_STABLE_HASH EXPECTED_STABLE_VERSION_ID EXPECTED_CANDIDATE_VERSION EVIDENCE_DIR CONVERGENCE_INTERVAL_MS SHORT_SHA STATIC_MANIFEST_PATH VOICE_SAMPLE_WAV

test "$(git rev-parse HEAD)" = "$GITHUB_SHA"
git diff --check
printf '%s\n' "$GITHUB_SHA" > "$EVIDENCE_DIR/exact-source-sha.txt"

bun run typecheck 2>&1 | tee "$EVIDENCE_DIR/typecheck.log"
bun run lint 2>&1 | tee "$EVIDENCE_DIR/lint.log"
bun run test 2>&1 | tee "$EVIDENCE_DIR/unit-tests.log"
BUILD_HASH="$SHORT_SHA" VOY_METRICS_PATH="$EVIDENCE_DIR/build-metrics.json" bun run build 2>&1 | tee "$EVIDENCE_DIR/vite-build.log"
VOY_METRICS_PATH="$EVIDENCE_DIR/build-metrics.json" bun run budget 2>&1 | tee "$EVIDENCE_DIR/bundle-budget.log"
STATIC_ROOT="" SHORT_SHA="$SHORT_SHA" EXPECTED_CANDIDATE_VERSION="$EXPECTED_CANDIDATE_VERSION" STATIC_MANIFEST_PATH="$STATIC_MANIFEST_PATH" node scripts/build-static-manifest.mjs 2>&1 | tee "$EVIDENCE_DIR/static-manifest.log"

DEPLOY_CONFIG="dist/voy_app/wrangler.json"
if [[ ! -f "$DEPLOY_CONFIG" ]]; then
  echo "validated_deploy_config_missing:$DEPLOY_CONFIG" >&2
  exit 1
fi
CANDIDATE_CONFIG="$(dirname "$DEPLOY_CONFIG")/candidate-config.json"
export DEPLOY_CONFIG CANDIDATE_CONFIG
node --input-type=module <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';
const source=process.env.DEPLOY_CONFIG;
const config=JSON.parse(readFileSync(source,'utf8'));
if (typeof config.main !== 'string' || !config.main) throw new Error('candidate_main_missing');
if (!config.assets || typeof config.assets.directory !== 'string') throw new Error('candidate_assets_missing');
if ('auxiliaryWorkers' in config) throw new Error('candidate_internal_vite_field_present');
config.vars ||= {};
config.vars.VOY_BUILD_HASH=process.env.SHORT_SHA;
writeFileSync(process.env.CANDIDATE_CONFIG,JSON.stringify(config,null,2)+'\n');
NODE
wrangler deploy --config "$CANDIDATE_CONFIG" --dry-run --minify 2>&1 | tee "$EVIDENCE_DIR/wrangler-dry-run.log"
node --check public/sw.js
node --check scripts/svelte-candidate-gate.mjs
node --check scripts/svelte-candidate-api-gate.mjs

if command -v espeak-ng >/dev/null 2>&1; then
  espeak-ng -v es -s 125 -w "$VOICE_SAMPLE_WAV" 'Hola VOY quiero ir a la terminal de omnibus'
  sha256sum "$VOICE_SAMPLE_WAV" > "$EVIDENCE_DIR/voice-sample.sha256"
fi

BUILD_HASH="$SHORT_SHA" VOY_EVIDENCE_DIR="$EVIDENCE_DIR/local-browser-screens" VOY_OUTPUT_DIR="$EVIDENCE_DIR/local-browser-output" VOY_REPORT_DIR="$EVIDENCE_DIR/local-browser-report" WRANGLER_LOG="$EVIDENCE_DIR/local-vite.log" bash scripts/run-browser-smoke.sh 2>&1 | tee "$EVIDENCE_DIR/local-browser.log"

wrangler deployments list --json > "$EVIDENCE_DIR/wrangler-deployments-before.json"
curl --fail --silent --show-error --retry 3 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API_ROOT/deployments" > "$EVIDENCE_DIR/api-deployments-before.json"
curl --fail --silent --show-error --retry 3 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API_ROOT/versions?per_page=100" > /tmp/svelte-versions-before.json
curl --fail --silent --show-error --retry 3 "$WORKER_URL/api/health?baseline=$(date +%s%N)" > "$EVIDENCE_DIR/production-health-before.json"

PREVIOUS_DEPLOYMENT_ID="$(node <<'NODE'
const fs=require('node:fs'); const e=process.env.EVIDENCE_DIR;
const payload=JSON.parse(fs.readFileSync(`${e}/api-deployments-before.json`,'utf8')); if(payload.success!==true)throw new Error('deployments_query_failed');
const list=payload.result?.deployments||payload.result||[]; const active=list[0]; if(!active||!Array.isArray(active.versions))throw new Error('active_deployment_missing');
const stable=active.versions.find(v=>v.version_id===process.env.EXPECTED_STABLE_VERSION_ID); if(!stable||Number(stable.percentage)!==100)throw new Error('stable_version_or_traffic_changed');
if(active.versions.some(v=>v.version_id!==process.env.EXPECTED_STABLE_VERSION_ID&&Number(v.percentage)!==0))throw new Error('unexpected_nonzero_version');
const health=JSON.parse(fs.readFileSync(`${e}/production-health-before.json`,'utf8')); if(health.ok!==true||health.version!==process.env.EXPECTED_STABLE_VERSION||health.build_hash!==process.env.EXPECTED_STABLE_HASH)throw new Error('production_baseline_mismatch');
fs.writeFileSync(`${e}/production-baseline.json`,JSON.stringify({deployment_id:active.id,stable_version_id:stable.version_id,stable_traffic:100,all_versions:active.versions,health,checked_at:new Date().toISOString()},null,2)); process.stdout.write(active.id);
NODE
)"
STABLE_VERSION_ID="$EXPECTED_STABLE_VERSION_ID"
export PREVIOUS_DEPLOYMENT_ID STABLE_VERSION_ID
curl --fail --silent --show-error --retry 3 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API_ROOT/versions/$STABLE_VERSION_ID" > /tmp/svelte-stable-version.json

CANDIDATE_TAG="voy-svelte-mobile-${GITHUB_SHA:0:12}"
export CANDIDATE_TAG
wrangler versions upload --config "$CANDIDATE_CONFIG" --minify --tag "$CANDIDATE_TAG" --message "VOY Svelte mobile exact-head candidate $GITHUB_SHA" 2>&1 | tee "$EVIDENCE_DIR/version-upload.log"
curl --fail --silent --show-error --retry 3 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API_ROOT/versions?per_page=100" > /tmp/svelte-versions-after.json
CANDIDATE_VERSION_ID="$(node <<'NODE'
const fs=require('node:fs');
function versions(path){const p=JSON.parse(fs.readFileSync(path,'utf8'));if(p.success!==true)throw new Error('versions_query_failed');return Array.isArray(p.result)?p.result:(p.result?.items||p.result?.versions||[]);}
const before=new Set(versions('/tmp/svelte-versions-before.json').map(v=>v.id)); const added=versions('/tmp/svelte-versions-after.json').filter(v=>v.id&&!before.has(v.id)); if(added.length!==1)throw new Error(`candidate_version_not_unique:${added.length}`);
const c=added[0]; fs.writeFileSync(`${process.env.EVIDENCE_DIR}/candidate-version.json`,JSON.stringify({version_id:c.id,version_number:c.number||null,source_sha:process.env.GITHUB_SHA,source_short_sha:process.env.SHORT_SHA,tag:process.env.CANDIDATE_TAG,created_on:c.metadata?.created_on||null},null,2)); process.stdout.write(c.id);
NODE
)"
export CANDIDATE_VERSION_ID
curl --fail --silent --show-error --retry 3 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API_ROOT/versions/$CANDIDATE_VERSION_ID" > /tmp/svelte-candidate-version.json
node <<'NODE'
const fs=require('node:fs');
function bindings(path){const p=JSON.parse(fs.readFileSync(path,'utf8'));if(p.success!==true)throw new Error('version_detail_failed');const list=p.result?.resources?.bindings;if(!Array.isArray(list))throw new Error('bindings_missing');return list.map(b=>({name:b.name,type:b.type})).sort((a,b)=>`${a.name}:${a.type}`.localeCompare(`${b.name}:${b.type}`));}
const stable=bindings('/tmp/svelte-stable-version.json'), candidate=bindings('/tmp/svelte-candidate-version.json'); const stableSet=new Set(stable.map(x=>`${x.name}:${x.type}`)); const missing=stable.filter(x=>!candidate.some(y=>y.name===x.name&&y.type===x.type)); if(missing.length)throw new Error(`stable_binding_missing:${missing.map(x=>x.name).join(',')}`);
const additions=candidate.filter(x=>!stableSet.has(`${x.name}:${x.type}`)); const map=new Map(additions.map(x=>[x.name,x.type])); for(const [name,type] of [['AI','ai'],['VOY_VOICE_ENABLED','plain_text'],['VOY_BUILD_HASH','plain_text']])if(map.get(name)!==type)throw new Error(`binding_addition_invalid:${name}:${map.get(name)}`);
if(additions.length!==3)throw new Error(`binding_addition_count:${additions.length}`);
fs.writeFileSync(`${process.env.EVIDENCE_DIR}/binding-contract.json`,JSON.stringify({result:'PASS',stable_binding_count:stable.length,candidate_binding_count:candidate.length,stable_bindings:stable,candidate_bindings:candidate,exact_additions:additions},null,2));
NODE

wrangler versions deploy "$STABLE_VERSION_ID@100%" "$CANDIDATE_VERSION_ID@0%" --message "VOY Svelte candidate 0% $GITHUB_SHA" --yes 2>&1 | tee "$EVIDENCE_DIR/candidate-deployment.log"
TAIL_PID=''
stop_tail(){ if [[ -n "$TAIL_PID" ]] && kill -0 "$TAIL_PID" 2>/dev/null; then kill "$TAIL_PID" 2>/dev/null||true; wait "$TAIL_PID" 2>/dev/null||true; fi; }
trap stop_tail EXIT
timeout 1200s wrangler tail "$WORKER_NAME" --format json --version-id "$CANDIDATE_VERSION_ID" > "$EVIDENCE_DIR/candidate-tail.log" 2>&1 & TAIL_PID=$!; sleep 5; kill -0 "$TAIL_PID"
node scripts/svelte-candidate-gate.mjs converge
node scripts/svelte-candidate-api-gate.mjs 2>&1 | tee "$EVIDENCE_DIR/api-gate.log"
if [[ -s "$VOICE_SAMPLE_WAV" ]]; then node scripts/voice-candidate-api-gate.mjs 2>&1 | tee "$EVIDENCE_DIR/voice-api-gate.log"; fi
VOY_BASE_URL="$WORKER_URL" VOY_EXTERNAL_SERVER=1 VOY_WORKER_NAME="$WORKER_NAME" VOY_CANDIDATE_VERSION_ID="$CANDIDATE_VERSION_ID" VOY_EVIDENCE_DIR="$EVIDENCE_DIR/candidate-browser-screens" VOY_OUTPUT_DIR="$EVIDENCE_DIR/candidate-browser-output" VOY_REPORT_DIR="$EVIDENCE_DIR/candidate-browser-report" bunx playwright test -c browser-tests/playwright.config.ts 2>&1 | tee "$EVIDENCE_DIR/candidate-browser.log"
node scripts/svelte-candidate-gate.mjs final
stop_tail; trap - EXIT
printf 'CANDIDATE_VERSION_ID=%s\n' "$CANDIDATE_VERSION_ID" >> "$GITHUB_ENV"
CANDIDATE_DEPLOYMENT_ID="$(node -p "JSON.parse(require('fs').readFileSync('$EVIDENCE_DIR/final-state.json','utf8')).deployment_id")"
printf 'CANDIDATE_DEPLOYMENT_ID=%s\n' "$CANDIDATE_DEPLOYMENT_ID" >> "$GITHUB_ENV"
