#!/usr/bin/env bash
set -euo pipefail

WORKER_NAME="${WORKER_NAME:-voy-app}"
WORKER_URL="${WORKER_URL:-https://voy-app.simondalmasso44.workers.dev}"
EXPECTED_STABLE_VERSION="${EXPECTED_STABLE_VERSION:-V8.0.0}"
EXPECTED_STABLE_HASH="${EXPECTED_STABLE_HASH:?EXPECTED_STABLE_HASH is required}"
EXPECTED_STABLE_VERSION_ID="${EXPECTED_STABLE_VERSION_ID:?EXPECTED_STABLE_VERSION_ID is required}"
EXPECTED_CANDIDATE_VERSION="${EXPECTED_CANDIDATE_VERSION:-V8.0.0}"
EVIDENCE_DIR="${EVIDENCE_DIR:-test-results/order46-final-candidate}"
CONVERGENCE_INTERVAL_MS="${CONVERGENCE_INTERVAL_MS:-7000}"
D1_NAME="${D1_NAME:-voy-auth}"
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required}"
: "${GITHUB_SHA:?GITHUB_SHA is required}"
SHORT_SHA="${GITHUB_SHA:0:7}"
API_ROOT="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$WORKER_NAME"
STATIC_MANIFEST_PATH="$EVIDENCE_DIR/static-manifest.json"
mkdir -p "$EVIDENCE_DIR"
export WORKER_NAME WORKER_URL EXPECTED_STABLE_VERSION EXPECTED_STABLE_HASH EXPECTED_STABLE_VERSION_ID EXPECTED_CANDIDATE_VERSION EVIDENCE_DIR CONVERGENCE_INTERVAL_MS D1_NAME SHORT_SHA STATIC_MANIFEST_PATH

test "$(git rev-parse HEAD)" = "$GITHUB_SHA"
remote_head="$(git ls-remote origin refs/heads/feat/order-046-serious-product | awk '{print $1}')"
test "$remote_head" = "$GITHUB_SHA"
git diff --check
printf '%s\n' "$GITHUB_SHA" > "$EVIDENCE_DIR/exact-source-sha.txt"
printf '%s\n' 'PRODUCTION_PROMOTION_AUTHORIZED=NO' > "$EVIDENCE_DIR/authority.txt"
printf '%s\n' 'MERGE_AUTHORIZED=NO' >> "$EVIDENCE_DIR/authority.txt"
printf '%s\n' 'CANDIDATE_TRAFFIC_TARGET=0%' >> "$EVIDENCE_DIR/authority.txt"
printf '%s\n' 'GOOGLE_AUTH_ENABLED_TARGET=false' >> "$EVIDENCE_DIR/authority.txt"

bun run typecheck 2>&1 | tee "$EVIDENCE_DIR/typecheck.log"
bun run lint 2>&1 | tee "$EVIDENCE_DIR/lint.log"
bun run assets:source 2>&1 | tee "$EVIDENCE_DIR/source-assets.log"
bun run test 2>&1 | tee "$EVIDENCE_DIR/unit-tests.log"
BUILD_HASH="$SHORT_SHA" VOY_METRICS_PATH="$EVIDENCE_DIR/build-metrics.json" bun run build 2>&1 | tee "$EVIDENCE_DIR/vite-build.log"
bun run assets:build 2>&1 | tee "$EVIDENCE_DIR/build-assets.log"
VOY_METRICS_PATH="$EVIDENCE_DIR/build-metrics.json" bun run budget 2>&1 | tee "$EVIDENCE_DIR/bundle-budget.log"
STATIC_ROOT="" SHORT_SHA="$SHORT_SHA" EXPECTED_CANDIDATE_VERSION="$EXPECTED_CANDIDATE_VERSION" STATIC_MANIFEST_PATH="$STATIC_MANIFEST_PATH" node scripts/build-static-manifest.mjs 2>&1 | tee "$EVIDENCE_DIR/static-manifest.log"

DEPLOY_CONFIG="dist/voy_app/wrangler.json"
test -f "$DEPLOY_CONFIG"
CANDIDATE_CONFIG="$(dirname "$DEPLOY_CONFIG")/order46-candidate-config.json"
export DEPLOY_CONFIG CANDIDATE_CONFIG
node --input-type=module <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';
const config=JSON.parse(readFileSync(process.env.DEPLOY_CONFIG,'utf8'));
if(typeof config.main!=='string'||!config.main)throw new Error('candidate_main_missing');
if(!config.assets||typeof config.assets.directory!=='string')throw new Error('candidate_assets_missing');
if(!Array.isArray(config.d1_databases)||!config.d1_databases.some(item=>item.binding==='DB'&&item.database_name==='voy-auth'))throw new Error('candidate_d1_binding_missing');
if(config.vars?.GOOGLE_AUTH_ENABLED!=='false')throw new Error('candidate_auth_must_remain_disabled');
if(!String(config.vars?.VOY_GOOGLE_CLIENT_ID||'').endsWith('.apps.googleusercontent.com'))throw new Error('candidate_google_client_id_missing');
config.vars ||= {};
config.vars.VOY_BUILD_HASH=process.env.SHORT_SHA;
writeFileSync(process.env.CANDIDATE_CONFIG,JSON.stringify(config,null,2)+'\n');
NODE
wrangler deploy --config "$CANDIDATE_CONFIG" --dry-run --minify 2>&1 | tee "$EVIDENCE_DIR/wrangler-dry-run.log"
node --check public/sw.js
node --check scripts/svelte-candidate-gate.mjs
node --check scripts/svelte-candidate-api-gate.mjs
bash -n scripts/run-browser-smoke.sh scripts/run-order46-candidate.sh

BUILD_HASH="$SHORT_SHA" VOY_EVIDENCE_DIR="$EVIDENCE_DIR/local-browser-screens" VOY_OUTPUT_DIR="$EVIDENCE_DIR/local-browser-output" VOY_REPORT_DIR="$EVIDENCE_DIR/local-browser-report" VOY_LOCAL_SERVER_LOG="$EVIDENCE_DIR/local-static.log" bash scripts/run-browser-smoke.sh 2>&1 | tee "$EVIDENCE_DIR/local-browser.log"

wrangler deployments list --json > "$EVIDENCE_DIR/wrangler-deployments-before.json"
curl --fail --silent --show-error --retry 3 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API_ROOT/deployments" > "$EVIDENCE_DIR/api-deployments-before.json"
curl --fail --silent --show-error --retry 3 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API_ROOT/versions?per_page=100" > /tmp/order46-versions-before.json
curl --fail --silent --show-error --retry 3 "$WORKER_URL/api/health?order46_preflight=$(date +%s%N)" > "$EVIDENCE_DIR/production-health-before.json"

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
curl --fail --silent --show-error --retry 3 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API_ROOT/versions/$STABLE_VERSION_ID" > /tmp/order46-stable-version.json

# ORDER-046 explicitly owns the optional account schema. Migration is idempotent and auth remains disabled.
wrangler d1 migrations list "$D1_NAME" --remote 2>&1 | tee "$EVIDENCE_DIR/d1-migrations-before.log"
wrangler d1 migrations apply "$D1_NAME" --remote 2>&1 | tee "$EVIDENCE_DIR/d1-migrations-apply.log"
wrangler d1 execute "$D1_NAME" --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('voy_users','voy_sessions') ORDER BY name" --json > "$EVIDENCE_DIR/d1-schema.json"
node <<'NODE'
const fs=require('node:fs'); const p=JSON.parse(fs.readFileSync(`${process.env.EVIDENCE_DIR}/d1-schema.json`,'utf8'));
const rows=Array.isArray(p)?p.flatMap(x=>x.results||[]):p?.results||[]; const names=rows.map(x=>x.name).sort();
if(JSON.stringify(names)!==JSON.stringify(['voy_sessions','voy_users']))throw new Error(`d1_schema_mismatch:${JSON.stringify(names)}`);
NODE

CANDIDATE_TAG="voy-order46-${GITHUB_SHA:0:12}"
export CANDIDATE_TAG
wrangler versions upload --config "$CANDIDATE_CONFIG" --minify --tag "$CANDIDATE_TAG" --message "VOY ORDER-046 candidate $GITHUB_SHA" 2>&1 | tee "$EVIDENCE_DIR/version-upload.log"
curl --fail --silent --show-error --retry 3 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API_ROOT/versions?per_page=100" > /tmp/order46-versions-after.json
CANDIDATE_VERSION_ID="$(node <<'NODE'
const fs=require('node:fs');
function versions(path){const p=JSON.parse(fs.readFileSync(path,'utf8'));if(p.success!==true)throw new Error('versions_query_failed');return Array.isArray(p.result)?p.result:(p.result?.items||p.result?.versions||[]);}
const before=new Set(versions('/tmp/order46-versions-before.json').map(v=>v.id)); const added=versions('/tmp/order46-versions-after.json').filter(v=>v.id&&!before.has(v.id)); if(added.length!==1)throw new Error(`candidate_version_not_unique:${added.length}`);
const c=added[0]; fs.writeFileSync(`${process.env.EVIDENCE_DIR}/candidate-version.json`,JSON.stringify({version_id:c.id,version_number:c.number||null,source_sha:process.env.GITHUB_SHA,source_short_sha:process.env.SHORT_SHA,tag:process.env.CANDIDATE_TAG,created_on:c.metadata?.created_on||null},null,2)); process.stdout.write(c.id);
NODE
)"
export CANDIDATE_VERSION_ID
curl --fail --silent --show-error --retry 3 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API_ROOT/versions/$CANDIDATE_VERSION_ID" > /tmp/order46-candidate-version.json
node <<'NODE'
const fs=require('node:fs');
function bindings(path){const p=JSON.parse(fs.readFileSync(path,'utf8'));if(p.success!==true)throw new Error('version_detail_failed');const list=p.result?.resources?.bindings;if(!Array.isArray(list))throw new Error('bindings_missing');return list.map(b=>({name:b.name,type:b.type})).sort((a,b)=>`${a.name}:${a.type}`.localeCompare(`${b.name}:${b.type}`));}
const stable=bindings('/tmp/order46-stable-version.json'), candidate=bindings('/tmp/order46-candidate-version.json');
const stableMap=new Map(stable.map(x=>[x.name,x.type])), candidateMap=new Map(candidate.map(x=>[x.name,x.type]));
for(const [name,type] of stableMap){if(candidateMap.get(name)!==type)throw new Error(`stable_binding_drift:${name}:${type}:${candidateMap.get(name)}`);}
const added=candidate.filter(x=>!stableMap.has(x.name)); const names=added.map(x=>x.name).sort(); const allowed=['DB','GOOGLE_AUTH_ENABLED','VOY_GOOGLE_CLIENT_ID'].sort();
if(JSON.stringify(names)!==JSON.stringify(allowed))throw new Error(`unexpected_binding_additions:${JSON.stringify(names)}`);
const db=added.find(x=>x.name==='DB'); if(!db||!/d1/i.test(String(db.type)))throw new Error(`db_binding_type_invalid:${db?.type}`);
fs.writeFileSync(`${process.env.EVIDENCE_DIR}/binding-contract.json`,JSON.stringify({result:'PASS',stable_binding_count:stable.length,candidate_binding_count:candidate.length,stable_bindings:stable,candidate_bindings:candidate,allowed_additions:added},null,2));
NODE

wrangler versions deploy "$STABLE_VERSION_ID@100%" "$CANDIDATE_VERSION_ID@0%" --message "VOY ORDER-046 candidate 0% $GITHUB_SHA" --yes 2>&1 | tee "$EVIDENCE_DIR/candidate-deployment.log"
TAIL_PID=''
stop_tail(){ if [[ -n "$TAIL_PID" ]] && kill -0 "$TAIL_PID" 2>/dev/null; then kill "$TAIL_PID" 2>/dev/null||true; wait "$TAIL_PID" 2>/dev/null||true; fi; }
trap stop_tail EXIT
timeout 1500s wrangler tail "$WORKER_NAME" --format json --version-id "$CANDIDATE_VERSION_ID" > "$EVIDENCE_DIR/candidate-tail.log" 2>&1 & TAIL_PID=$!
sleep 5

node scripts/svelte-candidate-gate.mjs converge
node scripts/svelte-candidate-api-gate.mjs 2>&1 | tee "$EVIDENCE_DIR/api-gate.log"
node scripts/verify-retired-candidate-assets.mjs 2>&1 | tee "$EVIDENCE_DIR/retired-routes.log"
VOY_BASE_URL="$WORKER_URL" VOY_EXTERNAL_SERVER=1 VOY_REAL_BASEMAP=1 VOY_WORKER_NAME="$WORKER_NAME" VOY_CANDIDATE_VERSION_ID="$CANDIDATE_VERSION_ID" VOY_EVIDENCE_DIR="$EVIDENCE_DIR/candidate-browser-screens" VOY_OUTPUT_DIR="$EVIDENCE_DIR/candidate-browser-output" VOY_REPORT_DIR="$EVIDENCE_DIR/candidate-browser-report" bunx playwright test -c browser-tests/playwright.config.ts 2>&1 | tee "$EVIDENCE_DIR/candidate-browser.log"
stop_tail; trap - EXIT
node scripts/svelte-candidate-gate.mjs final 2>&1 | tee "$EVIDENCE_DIR/final-state.log"

curl --fail --silent --show-error --retry 3 "$WORKER_URL/api/health?order46_after=$(date +%s%N)" > "$EVIDENCE_DIR/production-health-after.json"
node <<'NODE'
const fs=require('node:fs'); const e=process.env.EVIDENCE_DIR; const h=JSON.parse(fs.readFileSync(`${e}/production-health-after.json`,'utf8'));
if(h.ok!==true||h.version!==process.env.EXPECTED_STABLE_VERSION||h.build_hash!==process.env.EXPECTED_STABLE_HASH)throw new Error('production_changed_after_candidate');
NODE

find "$EVIDENCE_DIR" -type f ! -name manifest.sha256 ! -name digest.txt -print0 | sort -z | xargs -0 -r sha256sum > "$EVIDENCE_DIR/manifest.sha256"
sha256sum "$EVIDENCE_DIR/manifest.sha256" > "$EVIDENCE_DIR/digest.txt"
printf 'CANDIDATE_VERSION_ID=%s\n' "$CANDIDATE_VERSION_ID" >> "$GITHUB_ENV"
CANDIDATE_DEPLOYMENT_ID="$(node -p "JSON.parse(require('fs').readFileSync('$EVIDENCE_DIR/final-state.json','utf8')).deployment_id")"
printf 'CANDIDATE_DEPLOYMENT_ID=%s\n' "$CANDIDATE_DEPLOYMENT_ID" >> "$GITHUB_ENV"
