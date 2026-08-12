#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:-}"
SOURCE_DIR="${SOURCE_DIR:-source}"
EVIDENCE_DIR="${EVIDENCE_DIR:-test-results/map-first-production-promote-v3}"

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

if [[ "$MODE" != "verify-or-rollback" ]]; then
  echo "unsupported mode: $MODE" >&2
  exit 64
fi

cd "$SOURCE_DIR"
mkdir -p "$EVIDENCE_DIR"
API_ROOT="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$WORKER_NAME"
tail_pid=''
rollback_done=0

stop_tail() {
  if [[ -n "$tail_pid" ]] && kill -0 "$tail_pid" 2>/dev/null; then
    kill "$tail_pid" 2>/dev/null || true
    wait "$tail_pid" 2>/dev/null || true
  fi
  tail_pid=''
}

fetch_runtime_snapshot() {
  local suffix="$1"
  curl -fsS --retry 3 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API_ROOT/deployments" > "$EVIDENCE_DIR/deployments-${suffix}.json"
  curl -fsS --retry 3 "$WORKER_URL/api/health?${suffix}=$(date +%s%N)" > "$EVIDENCE_DIR/health-${suffix}.json"
}

classify_snapshot() {
  local suffix="$1"
  SNAPSHOT_SUFFIX="$suffix" node - <<'NODE'
const fs=require('node:fs');
const e=process.env.EVIDENCE_DIR;
const suffix=process.env.SNAPSHOT_SUFFIX;
const payload=JSON.parse(fs.readFileSync(`${e}/deployments-${suffix}.json`,'utf8'));
const list=payload.result?.deployments||payload.result||[];
const active=list[0];
if(!active||!Array.isArray(active.versions)){ process.stdout.write('invalid'); process.exit(0); }
const stable=active.versions.find(v=>v.version_id===process.env.STABLE_VERSION_ID);
const candidate=active.versions.find(v=>v.version_id===process.env.CANDIDATE_VERSION_ID);
const sp=stable ? Number(stable.percentage) : -1;
const cp=candidate ? Number(candidate.percentage) : -1;
if(sp===100 && cp===0) process.stdout.write('stable');
else if(sp===0 && cp===100) process.stdout.write('candidate');
else process.stdout.write('mixed');
NODE
}

verify_stable_snapshot() {
  local suffix="$1"
  SNAPSHOT_SUFFIX="$suffix" node - <<'NODE'
const fs=require('node:fs');
const e=process.env.EVIDENCE_DIR;
const suffix=process.env.SNAPSHOT_SUFFIX;
const payload=JSON.parse(fs.readFileSync(`${e}/deployments-${suffix}.json`,'utf8'));
const list=payload.result?.deployments||payload.result||[];
const active=list[0];
if(!active||!Array.isArray(active.versions)) throw new Error('active_deployment_missing');
const stable=active.versions.find(v=>v.version_id===process.env.STABLE_VERSION_ID);
const candidate=active.versions.find(v=>v.version_id===process.env.CANDIDATE_VERSION_ID);
if(!stable||Number(stable.percentage)!==100) throw new Error('stable_not_100');
if(candidate&&Number(candidate.percentage)!==0) throw new Error('candidate_not_0');
const h=JSON.parse(fs.readFileSync(`${e}/health-${suffix}.json`,'utf8'));
if(h.ok!==true||h.version!==process.env.EXPECTED_STABLE_VERSION||h.build_hash!==process.env.EXPECTED_STABLE_HASH) throw new Error('stable_health_mismatch');
NODE
}

verify_candidate_snapshot() {
  local suffix="$1"
  SNAPSHOT_SUFFIX="$suffix" node - <<'NODE'
const fs=require('node:fs');
const e=process.env.EVIDENCE_DIR;
const suffix=process.env.SNAPSHOT_SUFFIX;
const payload=JSON.parse(fs.readFileSync(`${e}/deployments-${suffix}.json`,'utf8'));
const list=payload.result?.deployments||payload.result||[];
const active=list[0];
if(!active||!Array.isArray(active.versions)) throw new Error('active_deployment_missing');
const stable=active.versions.find(v=>v.version_id===process.env.STABLE_VERSION_ID);
const candidate=active.versions.find(v=>v.version_id===process.env.CANDIDATE_VERSION_ID);
if(!candidate||Number(candidate.percentage)!==100) throw new Error('candidate_not_100');
if(stable&&Number(stable.percentage)!==0) throw new Error('stable_not_0');
const h=JSON.parse(fs.readFileSync(`${e}/health-${suffix}.json`,'utf8'));
if(h.ok!==true||h.version!==process.env.EXPECTED_CANDIDATE_VERSION||h.build_hash!==process.env.CANDIDATE_SHORT_SHA) throw new Error('candidate_health_mismatch');
process.stdout.write(active.id||'');
NODE
}

rollback_once() {
  if [[ "$rollback_done" == '1' ]]; then
    echo "rollback_already_attempted" >&2
    return 1
  fi
  rollback_done=1
  echo "ROLLBACK_ATTEMPT=1" | tee "$EVIDENCE_DIR/rollback.log"
  wrangler versions deploy "$STABLE_VERSION_ID@100%" "$CANDIDATE_VERSION_ID@0%" --message "VOY Map-First rollback after failed production validation" --yes | tee -a "$EVIDENCE_DIR/rollback.log"
  for round in 1 2 3; do
    fetch_runtime_snapshot "rollback-${round}"
    verify_stable_snapshot "rollback-${round}"
    sleep 3
  done
  echo "ROLLBACK_VERIFIED=YES" | tee -a "$EVIDENCE_DIR/rollback.log"
}

post_promotion_failure() {
  local rc=$?
  trap - ERR
  stop_tail
  echo "POST_PROMOTION_VALIDATION_FAILURE_RC=$rc" | tee "$EVIDENCE_DIR/post-promotion-failure.txt"
  if rollback_once; then
    exit "$rc"
  fi
  echo "EMERGENCY=ROLLBACK_FAILED_OR_UNVERIFIED" | tee -a "$EVIDENCE_DIR/post-promotion-failure.txt"
  exit 99
}

export EVIDENCE_DIR STABLE_VERSION_ID CANDIDATE_VERSION_ID EXPECTED_STABLE_VERSION EXPECTED_STABLE_HASH EXPECTED_CANDIDATE_VERSION CANDIDATE_SHORT_SHA

fetch_runtime_snapshot "entry"
state="$(classify_snapshot entry)"
printf '%s\n' "$state" > "$EVIDENCE_DIR/entry-state.txt"
if [[ "$state" == 'stable' ]]; then
  verify_stable_snapshot entry
  echo "PROMOTION_NOT_EFFECTIVE=YES" >&2
  exit 20
fi
if [[ "$state" != 'candidate' ]]; then
  echo "UNEXPECTED_TRAFFIC_STATE=$state" >&2
  rollback_once
  exit 21
fi
verify_candidate_snapshot entry > "$EVIDENCE_DIR/entry-deployment-id.txt"

trap post_promotion_failure ERR

start_ms=$(date +%s%3N)
consecutive=0
final_deployment_id=''
: > "$EVIDENCE_DIR/production-convergence.jsonl"
for round in $(seq 1 60); do
  fetch_runtime_snapshot "converge-${round}"
  if final_deployment_id="$(verify_candidate_snapshot "converge-${round}")"; then
    consecutive=$((consecutive+1))
    ok=true
  else
    consecutive=0
    ok=false
  fi
  elapsed=$(( $(date +%s%3N) - start_ms ))
  printf '{"round":%d,"elapsed_ms":%d,"ok":%s,"consecutive":%d,"deployment_id":"%s"}\n' "$round" "$elapsed" "$ok" "$consecutive" "$final_deployment_id" >> "$EVIDENCE_DIR/production-convergence.jsonl"
  if (( consecutive >= 20 && elapsed >= 120000 )); then
    break
  fi
  sleep 7
done
elapsed=$(( $(date +%s%3N) - start_ms ))
if (( consecutive < 20 || elapsed < 120000 )); then
  echo "production_convergence_failed consecutive=$consecutive elapsed_ms=$elapsed" >&2
  false
fi

timeout 1200s wrangler tail "$WORKER_NAME" --format json --version-id "$CANDIDATE_VERSION_ID" > "$EVIDENCE_DIR/production-tail.log" 2>&1 &
tail_pid=$!
sleep 5

VOY_BASE_URL="$WORKER_URL" \
VOY_EXTERNAL_SERVER=1 \
VOY_REAL_BASEMAP=1 \
VOY_EVIDENCE_DIR="$EVIDENCE_DIR/production-browser-screens" \
VOY_OUTPUT_DIR="$EVIDENCE_DIR/production-browser-output" \
VOY_REPORT_DIR="$EVIDENCE_DIR/production-browser-report" \
bunx playwright test -c browser-tests/playwright.config.ts | tee "$EVIDENCE_DIR/production-browser.log"

curl -fsS --retry 3 "$WORKER_URL/api/health?production_final=$(date +%s%N)" > "$EVIDENCE_DIR/production-health-final.json"
curl -fsS --retry 3 "$WORKER_URL/api/mobility/trust?production_final=$(date +%s%N)" > "$EVIDENCE_DIR/production-mobility-trust-final.json"
curl -fsS --retry 3 -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API_ROOT/deployments" > "$EVIDENCE_DIR/deployments-final.json"
stop_tail

FINAL_DEPLOYMENT_ID="$final_deployment_id" FINAL_CONSECUTIVE="$consecutive" FINAL_ELAPSED="$elapsed" node --input-type=module - <<'NODE'
import fs from 'node:fs';
import { analyzeCandidateTail } from './scripts/tail-runtime-proof.mjs';
const e=process.env.EVIDENCE_DIR;
const health=JSON.parse(fs.readFileSync(`${e}/production-health-final.json`,'utf8'));
if(health.ok!==true||health.version!==process.env.EXPECTED_CANDIDATE_VERSION||health.build_hash!==process.env.CANDIDATE_SHORT_SHA) throw new Error('final_production_health_mismatch');
const trust=JSON.parse(fs.readFileSync(`${e}/production-mobility-trust-final.json`,'utf8'));
if(trust.ok!==true||trust.operational_bus_activation!==false||trust.santa_fe?.bus_activation!==false||trust.mobility_database_role!=='DISCOVERY_ONLY') throw new Error('final_mobility_trust_drift');
const dp=JSON.parse(fs.readFileSync(`${e}/deployments-final.json`,'utf8'));
const list=dp.result?.deployments||dp.result||[];
const active=list[0];
const stable=active?.versions?.find(v=>v.version_id===process.env.STABLE_VERSION_ID);
const candidate=active?.versions?.find(v=>v.version_id===process.env.CANDIDATE_VERSION_ID);
if(!candidate||Number(candidate.percentage)!==100||(stable&&Number(stable.percentage)!==0)) throw new Error('final_control_plane_mismatch');
const tail=analyzeCandidateTail(fs.readFileSync(`${e}/production-tail.log`,'utf8'),process.env.CANDIDATE_VERSION_ID);
if(tail.exactEvents<1||tail.nonOkOutcomes.length||tail.exceptions) throw new Error(`production_tail_failed:${JSON.stringify(tail)}`);
fs.writeFileSync(`${e}/production-tail-proof.json`,JSON.stringify({result:'PASS',...tail},null,2));
fs.writeFileSync(`${e}/production-final-state.json`,JSON.stringify({
  result:'PASS',
  source_sha:process.env.CANDIDATE_SOURCE_SHA,
  production_version_id:process.env.CANDIDATE_VERSION_ID,
  production_build_hash:process.env.CANDIDATE_SHORT_SHA,
  previous_stable_version_id:process.env.STABLE_VERSION_ID,
  production_traffic:100,
  previous_stable_traffic:0,
  deployment_id:process.env.FINAL_DEPLOYMENT_ID,
  convergence_rounds:Number(process.env.FINAL_CONSECUTIVE),
  convergence_duration_ms:Number(process.env.FINAL_ELAPSED),
  bus_activation:false,
  rollback_executed:false,
  verified_at:new Date().toISOString()
},null,2));
NODE

trap - ERR
printf 'FINAL_DEPLOYMENT_ID=%s\nFINAL_CONSECUTIVE=%s\nFINAL_ELAPSED=%s\n' "$final_deployment_id" "$consecutive" "$elapsed" >> "$GITHUB_ENV"
echo "PRODUCTION_PROMOTION_VERIFIED=YES" > "$EVIDENCE_DIR/result.txt"
