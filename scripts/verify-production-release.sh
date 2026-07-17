#!/usr/bin/env bash
set -euo pipefail

: "${EXPECTED_HASH:?EXPECTED_HASH is required}"

BASE_URL="${VOY_BASE_URL:-https://voy-app.simondalmasso44.workers.dev}"
EXPECTED_VERSION="${EXPECTED_VERSION:-V7.8.0}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-30}"
POLL_SECONDS="${POLL_SECONDS:-2}"
SHORT_SHA="${EXPECTED_HASH:0:7}"
LAST_HEALTH=""
LAST_ERROR=""

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  if HEALTH=$(curl -fsS --max-time 10 "$BASE_URL/api/health" 2>&1); then
    LAST_HEALTH="$HEALTH"
    LIVE_HASH=$(printf '%s' "$HEALTH" | jq -er '.build_hash // empty' 2>/dev/null || true)
    LIVE_VERSION=$(printf '%s' "$HEALTH" | jq -er '.version // empty' 2>/dev/null || true)
    LIVE_OK=$(printf '%s' "$HEALTH" | jq -er '.ok // false' 2>/dev/null || true)

    echo "Health attempt ${attempt}/${MAX_ATTEMPTS}: hash=${LIVE_HASH:-missing} version=${LIVE_VERSION:-missing} ok=${LIVE_OK:-missing}"

    if [ "$LIVE_HASH" = "$SHORT_SHA" ] && [ "$LIVE_VERSION" = "$EXPECTED_VERSION" ] && [ "$LIVE_OK" = "true" ]; then
      printf '%s\n' "$HEALTH" | jq .
      echo "Production release verified: ${SHORT_SHA} (${EXPECTED_VERSION})."
      exit 0
    fi

    LAST_ERROR="release mismatch: expected hash=${SHORT_SHA}, version=${EXPECTED_VERSION}, ok=true; got hash=${LIVE_HASH:-missing}, version=${LIVE_VERSION:-missing}, ok=${LIVE_OK:-missing}"
  else
    LAST_ERROR="health request failed: ${HEALTH}"
    echo "Health attempt ${attempt}/${MAX_ATTEMPTS}: ${LAST_ERROR}" >&2
  fi

  if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
    sleep "$POLL_SECONDS"
  fi
done

echo "::error::Production release did not converge after ${MAX_ATTEMPTS} attempts: ${LAST_ERROR}" >&2
if [ -n "$LAST_HEALTH" ]; then
  printf '%s\n' "$LAST_HEALTH" | jq . >&2 2>/dev/null || printf '%s\n' "$LAST_HEALTH" >&2
fi
exit 1
