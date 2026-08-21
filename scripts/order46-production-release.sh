#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_DIR="${SOURCE_DIR:-source}"
EVIDENCE_DIR="${EVIDENCE_DIR:-test-results/order46-production-release}"

: "${CLOUDFLARE_API_TOKEN:?missing CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?missing CLOUDFLARE_ACCOUNT_ID}"
: "${WORKER_NAME:?missing WORKER_NAME}"
: "${WORKER_URL:?missing WORKER_URL}"
: "${STABLE_VERSION_ID:?missing STABLE_VERSION_ID}"
: "${CANDIDATE_VERSION_ID:?missing CANDIDATE_VERSION_ID}"
: "${EXPECTED_STABLE_VERSION:?missing EXPECTED_STABLE_VERSION}"
: "${EXPECTED_STABLE_HASH:?missing EXPECTED_STABLE_HASH}"
: "${EXPECTED_CANDIDATE_VERSION:?missing EXPECTED_CANDIDATE_VERSION}"
: "${CANDIDATE_SHORT_SHA:?missing CANDIDATE_SHORT_SHA}"
: "${CANDIDATE_SOURCE_SHA:?missing CANDIDATE_SOURCE_SHA}"

cd "$SOURCE_DIR"
mkdir -p "$EVIDENCE_DIR"
export EVIDENCE_DIR STABLE_VERSION_ID CANDIDATE_VERSION_ID EXPECTED_STABLE_VERSION EXPECTED_STABLE_HASH EXPECTED_CANDIDATE_VERSION CANDIDATE_SHORT_SHA CANDIDATE_SOURCE_SHA WORKER_NAME WORKER_URL
API_ROOT="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$WORKER_NAME"
rollback_attempted=0
candidate_active=0
tail_pid=''

stop_tail() {
  if [[ -n "$tail_pid" ]] && kill -0 "$tail_pid" 2>/dev/null; then
    kill "$tail_pid" 2>/dev/null || true
    wait "$tail_pid" 2>/dev/null || true
  fi
  tail_pid=''
}

fetch_snapshot() {
  local suffix="$1"
  curl -fsS --retry 3 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API_ROOT/deployments" > "$EVIDENCE_DIR/deployments-${suffix}.json"
  curl -fsS --retry 3 "$WORKER_URL/api/health?${suffix}=$(date +%s%N)" > "$EVIDENCE_DIR/health-${suffix}.json"
  curl -fsS --retry 3 "$WORKER_URL/api/auth/session?${suffix}=$(date +%s%N)" > "$EVIDENCE_DIR/auth-${suffix}.json"
}

control_state() {
  local suffix="$1"
  SNAPSHOT_SUFFIX="$suffix" node - <<'NODE'
const fs=require('node:fs');
const e=process.env.EVIDENCE_DIR, s=process.env.SNAPSHOT_SUFFIX;
const p=JSON.parse(fs.readFileSync(`${e}/deployments-${s}.json`,'utf8'));
if(p.success!==true){process.stdout.write('invalid');process.exit(0)}
const list=p.result?.deployments||p.result||[], a=list[0];
if(!a||!Array.isArray(a.versions)){process.stdout.write('invalid');process.exit(0)}
const stable=a.versions.find(v=>v.version_id===process.env.STABLE_VERSION_ID);
const candidate=a.versions.find(v=>v.version_id===process.env.CANDIDATE_VERSION_ID);
const sp=stable?Number(stable.percentage):-1, cp=candidate?Number(candidate.percentage):-1;
if(sp===100&&cp===0) process.stdout.write('stable');
else if(sp===0&&cp===100) process.stdout.write('candidate');
else process.stdout.write('mixed');
NODE
}

health_state() {
  local suffix="$1"
  SNAPSHOT_SUFFIX="$suffix" node - <<'NODE'
const fs=require('node:fs');
const e=process.env.EVIDENCE_DIR, s=process.env.SNAPSHOT_SUFFIX;
const h=JSON.parse(fs.readFileSync(`${e}/health-${s}.json`,'utf8'));
if(h.ok===true&&h.version===process.env.EXPECTED_CANDIDATE_VERSION&&h.build_hash===process.env.CANDIDATE_SHORT_SHA) process.stdout.write('candidate');
else if(h.ok===true&&h.version===process.env.EXPECTED_STABLE_VERSION&&h.build_hash===process.env.EXPECTED_STABLE_HASH) process.stdout.write('stable');
else process.stdout.write('other');
NODE
}

auth_state() {
  local suffix="$1"
  SNAPSHOT_SUFFIX="$suffix" node - <<'NODE'
const fs=require('node:fs');
const e=process.env.EVIDENCE_DIR, s=process.env.SNAPSHOT_SUFFIX;
const a=JSON.parse(fs.readFileSync(`${e}/auth-${s}.json`,'utf8'));
if(a.ok===true&&a.enabled===false&&a.authenticated===false&&a.persistent_account===false&&a.trip_history_persisted===false) process.stdout.write('safe');
else process.stdout.write('other');
NODE
}

verify_stable_round() {
  local suffix="$1"
  [[ "$(control_state "$suffix")" == stable && "$(health_state "$suffix")" == stable && "$(auth_state "$suffix")" == safe ]]
}

rollback_once() {
  stop_tail
  if [[ "$rollback_attempted" == 1 ]]; then
    echo 'EMERGENCY=SECOND_ROLLBACK_ATTEMPT_BLOCKED' | tee -a "$EVIDENCE_DIR/rollback.log"
    return 1
  fi
  rollback_attempted=1
  echo 'ROLLBACK_ATTEMPT=1' | tee "$EVIDENCE_DIR/rollback.log"
  wrangler versions deploy "$STABLE_VERSION_ID@100%" "$CANDIDATE_VERSION_ID@0%" --message "VOY ORDER-046 single rollback after failed production validation" --yes | tee -a "$EVIDENCE_DIR/rollback.log"
  local consecutive=0
  for round in $(seq 1 20); do
    fetch_snapshot "rollback-${round}"
    if verify_stable_round "rollback-${round}"; then consecutive=$((consecutive+1)); else consecutive=0; fi
    if (( consecutive >= 3 )); then
      echo 'ROLLBACK_VERIFIED=YES' | tee -a "$EVIDENCE_DIR/rollback.log"
      return 0
    fi
    sleep 3
  done
  echo 'EMERGENCY=ROLLBACK_NOT_VERIFIED' | tee -a "$EVIDENCE_DIR/rollback.log"
  return 1
}

post_candidate_failure() {
  local rc=$?
  trap - ERR
  echo "POST_CANDIDATE_FAILURE_RC=$rc" | tee "$EVIDENCE_DIR/failure.txt"
  if [[ "$candidate_active" == 1 ]]; then
    if rollback_once; then exit "$rc"; fi
    exit 99
  fi
  exit "$rc"
}

trap post_candidate_failure ERR

# Authorization requires an exact stable 100 / candidate 0 entry state. Any drift stops before write.
fetch_snapshot entry
initial_control="$(control_state entry)"
initial_health="$(health_state entry)"
initial_auth="$(auth_state entry)"
printf 'CONTROL=%s\nHEALTH=%s\nAUTH=%s\n' "$initial_control" "$initial_health" "$initial_auth" | tee "$EVIDENCE_DIR/entry-state.txt"
if [[ "$initial_control" != stable || "$initial_health" != stable || "$initial_auth" != safe ]]; then
  echo "preflight_state_mismatch control=$initial_control health=$initial_health auth=$initial_auth" >&2
  exit 20
fi

printf '%s\n' 'PROMOTION_COMMAND_ATTEMPTED=YES' > "$EVIDENCE_DIR/promotion-state.txt"
wrangler versions deploy "$STABLE_VERSION_ID@0%" "$CANDIDATE_VERSION_ID@100%" --message "VOY ORDER-046 production promotion source $CANDIDATE_SOURCE_SHA" --yes | tee "$EVIDENCE_DIR/production-promotion.log"
candidate_active=1

# Cloudflare edge convergence: 20 consecutive exact rounds and at least 120 seconds.
start_ms=$(date +%s%3N)
consecutive=0
final_deployment_id=''
: > "$EVIDENCE_DIR/production-convergence.jsonl"
for round in $(seq 1 60); do
  fetch_snapshot "converge-${round}"
  cs="$(control_state "converge-${round}")"
  hs="$(health_state "converge-${round}")"
  as="$(auth_state "converge-${round}")"
  if [[ "$cs" == candidate && "$hs" == candidate && "$as" == safe ]]; then consecutive=$((consecutive+1)); ok=true; else consecutive=0; ok=false; fi
  elapsed=$(( $(date +%s%3N) - start_ms ))
  final_deployment_id="$(SNAPSHOT_SUFFIX="converge-${round}" node - <<'NODE'
const fs=require('node:fs'); const e=process.env.EVIDENCE_DIR,s=process.env.SNAPSHOT_SUFFIX;
try{const p=JSON.parse(fs.readFileSync(`${e}/deployments-${s}.json`,'utf8'));const a=(p.result?.deployments||p.result||[])[0];process.stdout.write(a?.id||'')}catch{}
NODE
)"
  printf '{"round":%d,"elapsed_ms":%d,"control":"%s","health":"%s","auth":"%s","ok":%s,"consecutive":%d,"deployment_id":"%s"}\n' "$round" "$elapsed" "$cs" "$hs" "$as" "$ok" "$consecutive" "$final_deployment_id" >> "$EVIDENCE_DIR/production-convergence.jsonl"
  if (( consecutive >= 20 && elapsed >= 120000 )); then break; fi
  sleep 7
done
elapsed=$(( $(date +%s%3N) - start_ms ))
if (( consecutive < 20 || elapsed < 120000 )); then
  echo "production_convergence_failed consecutive=$consecutive elapsed_ms=$elapsed" >&2
  false
fi

# Observe the exact production version while API and public browser gates execute.
timeout 1500s wrangler tail "$WORKER_NAME" --format json --version-id "$CANDIDATE_VERSION_ID" > "$EVIDENCE_DIR/production-tail.log" 2>&1 &
tail_pid=$!
sleep 5

# Reuse the audited ORDER-046 API contract against the promoted version.
SHORT_SHA="$CANDIDATE_SHORT_SHA" CANDIDATE_VERSION_ID="$CANDIDATE_VERSION_ID" node scripts/svelte-candidate-api-gate.mjs 2>&1 | tee "$EVIDENCE_DIR/version-api-gate.log"
CANDIDATE_VERSION_ID="$CANDIDATE_VERSION_ID" node scripts/verify-retired-candidate-assets.mjs 2>&1 | tee "$EVIDENCE_DIR/retired-routes.log"

# Public production browser: no version override; includes real basemap proof.
VOY_BASE_URL="$WORKER_URL" \
VOY_EXTERNAL_SERVER=1 \
VOY_REAL_BASEMAP=1 \
VOY_EVIDENCE_DIR="$EVIDENCE_DIR/production-browser-screens" \
VOY_OUTPUT_DIR="$EVIDENCE_DIR/production-browser-output" \
VOY_REPORT_DIR="$EVIDENCE_DIR/production-browser-report" \
bunx playwright test -c browser-tests/playwright.config.ts --retries=1 | tee "$EVIDENCE_DIR/production-browser.log"

# Public no-override runtime/API truth after browser load.
curl -fsS --retry 3 "$WORKER_URL/api/health?production_final=$(date +%s%N)" > "$EVIDENCE_DIR/production-health-final.json"
curl -fsS --retry 3 "$WORKER_URL/api/auth/session?production_final=$(date +%s%N)" > "$EVIDENCE_DIR/production-auth-final.json"
curl -fsS --retry 3 "$WORKER_URL/api/mobility/trust?production_final=$(date +%s%N)" > "$EVIDENCE_DIR/production-mobility-trust-final.json"
curl -fsS --retry 3 "$WORKER_URL/api/territory?lat=-31.4201&lon=-64.1888" > "$EVIDENCE_DIR/production-territory-cordoba.json"
outside_status="$(curl -sS -o "$EVIDENCE_DIR/production-territory-outside.json" -w '%{http_code}' "$WORKER_URL/api/territory?lat=0&lon=0")"
route_status="$(curl -sS -o "$EVIDENCE_DIR/production-route.json" -w '%{http_code}' -H 'Content-Type: application/json' -X POST --data '{"origin":{"lat":-31.633,"lon":-60.706},"destination":{"lat":-31.648,"lon":-60.710},"profile":"driving"}' "$WORKER_URL/api/route")"
curl -fsS --retry 3 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API_ROOT/deployments" > "$EVIDENCE_DIR/deployments-final.json"
stop_tail

FINAL_DEPLOYMENT_ID="$final_deployment_id" FINAL_CONSECUTIVE="$consecutive" FINAL_ELAPSED="$elapsed" OUTSIDE_STATUS="$outside_status" ROUTE_STATUS="$route_status" node --input-type=module - <<'NODE'
import fs from 'node:fs';
import { analyzeCandidateTail } from './scripts/tail-runtime-proof.mjs';
const e=process.env.EVIDENCE_DIR;
const health=JSON.parse(fs.readFileSync(`${e}/production-health-final.json`,'utf8'));
if(health.ok!==true||health.version!==process.env.EXPECTED_CANDIDATE_VERSION||health.build_hash!==process.env.CANDIDATE_SHORT_SHA||health.features?.national_territory!==true||health.features?.core_without_login_voice_ai!==true) throw new Error('final_production_health_mismatch');
const auth=JSON.parse(fs.readFileSync(`${e}/production-auth-final.json`,'utf8'));
if(auth.ok!==true||auth.enabled!==false||auth.authenticated!==false||auth.persistent_account!==false||auth.trip_history_persisted!==false) throw new Error('final_auth_contract_failed');
const trust=JSON.parse(fs.readFileSync(`${e}/production-mobility-trust-final.json`,'utf8'));
if(trust.ok!==true||trust.operational_bus_activation!==false||trust.santa_fe?.bus_activation!==false||trust.mobility_database_role!=='DISCOVERY_ONLY') throw new Error('final_mobility_trust_drift');
const cordoba=JSON.parse(fs.readFileSync(`${e}/production-territory-cordoba.json`,'utf8'));
if(cordoba.ok!==true||cordoba.territory?.provinceId!=='14'||cordoba.territory?.provinceIsoId!=='AR-X'||cordoba.territory?.coverageKey!=='_default') throw new Error('final_territory_contract_failed');
const outside=JSON.parse(fs.readFileSync(`${e}/production-territory-outside.json`,'utf8'));
if(Number(process.env.OUTSIDE_STATUS)!==422||outside.error!=='territory_unresolved') throw new Error('final_non_argentina_gate_failed');
const route=JSON.parse(fs.readFileSync(`${e}/production-route.json`,'utf8'));
if(Number(process.env.ROUTE_STATUS)!==200||route.ok!==true||route.country!=='AR'||!Number.isFinite(route.distance_km)||route.distance_km<0||!Array.isArray(route.geometry)||route.geometry.length<2) throw new Error('final_route_contract_failed');
const dp=JSON.parse(fs.readFileSync(`${e}/deployments-final.json`,'utf8'));
const list=dp.result?.deployments||dp.result||[], active=list[0];
const stable=active?.versions?.find(v=>v.version_id===process.env.STABLE_VERSION_ID);
const candidate=active?.versions?.find(v=>v.version_id===process.env.CANDIDATE_VERSION_ID);
if(!candidate||Number(candidate.percentage)!==100||!stable||Number(stable.percentage)!==0) throw new Error('final_control_plane_mismatch');
const tail=analyzeCandidateTail(fs.readFileSync(`${e}/production-tail.log`,'utf8'),process.env.CANDIDATE_VERSION_ID);
if(tail.exactEvents<1||tail.nonOkOutcomes.length||tail.exceptions) throw new Error(`production_tail_failed:${JSON.stringify(tail)}`);
fs.writeFileSync(`${e}/production-tail-proof.json`,JSON.stringify({result:'PASS',...tail},null,2));
fs.writeFileSync(`${e}/production-final-state.json`,JSON.stringify({
  result:'PASS', source_sha:process.env.CANDIDATE_SOURCE_SHA,
  production_version_id:process.env.CANDIDATE_VERSION_ID,
  production_build_hash:process.env.CANDIDATE_SHORT_SHA,
  previous_stable_version_id:process.env.STABLE_VERSION_ID,
  production_traffic:100, previous_stable_traffic:0,
  deployment_id:process.env.FINAL_DEPLOYMENT_ID,
  convergence_rounds:Number(process.env.FINAL_CONSECUTIVE),
  convergence_duration_ms:Number(process.env.FINAL_ELAPSED),
  google_auth_enabled:false, persistent_account:false, trip_history_persisted:false,
  bus_activation:false, rollback_executed:false, verified_at:new Date().toISOString()
},null,2));
NODE

trap - ERR
candidate_active=0
printf 'FINAL_DEPLOYMENT_ID=%s\nFINAL_CONSECUTIVE=%s\nFINAL_ELAPSED=%s\n' "$final_deployment_id" "$consecutive" "$elapsed" >> "$GITHUB_ENV"
echo 'PRODUCTION_PROMOTION_VERIFIED=YES' | tee "$EVIDENCE_DIR/result.txt"
