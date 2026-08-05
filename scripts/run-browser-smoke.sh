#!/usr/bin/env bash
set -euo pipefail

PLAYWRIGHT_VERSION="1.61.1"
WRANGLER_LOG="${WRANGLER_LOG:-test-results/wrangler-local.log}"
BASE_OUTPUT_DIR="${VOY_OUTPUT_DIR:-test-results/playwright-local}"
BASE_REPORT_DIR="${VOY_REPORT_DIR:-playwright-report}"
mkdir -p test-results "$(dirname "$WRANGLER_LOG")"

if command -v wrangler >/dev/null 2>&1; then
  WRANGLER_CMD=(wrangler)
else
  WRANGLER_CMD=(npx wrangler)
fi

WRANGLER_PID=''
CURRENT_LOG=''

stop_wrangler() {
  if [[ -n "$WRANGLER_PID" ]] && kill -0 "$WRANGLER_PID" 2>/dev/null; then
    kill "$WRANGLER_PID" 2>/dev/null || true
    wait "$WRANGLER_PID" 2>/dev/null || true
  fi
  WRANGLER_PID=''
}

cleanup() {
  stop_wrangler
}
trap cleanup EXIT INT TERM

start_wrangler() {
  local label="$1"
  CURRENT_LOG="${WRANGLER_LOG%.log}-${label}.log"
  "${WRANGLER_CMD[@]}" dev --local --port 8787 >"$CURRENT_LOG" 2>&1 &
  WRANGLER_PID=$!

  for attempt in $(seq 1 60); do
    if curl -fsS http://127.0.0.1:8787/api/health >/dev/null; then
      return 0
    fi
    if ! kill -0 "$WRANGLER_PID" 2>/dev/null; then
      echo "Wrangler local exited before becoming healthy: $CURRENT_LOG" >&2
      return 1
    fi
    if [[ "$attempt" -eq 60 ]]; then
      echo "Timed out waiting for Wrangler local health: $CURRENT_LOG" >&2
      return 1
    fi
    sleep 1
  done
}

run_case() {
  local project="$1"
  local spec="$2"
  local base label status
  base="$(basename "$spec" .spec.js)"
  label="${project}-${base}"

  for attempt in 1 2; do
    stop_wrangler
    if ! start_wrangler "${label}-attempt-${attempt}"; then
      status=1
    else
      set +e
      VOY_OUTPUT_DIR="${BASE_OUTPUT_DIR}/${label}-attempt-${attempt}" \
      VOY_REPORT_DIR="${BASE_REPORT_DIR}/${label}-attempt-${attempt}" \
      npm exec --yes --package="@playwright/test@${PLAYWRIGHT_VERSION}" -- sh -c '
        PLAYWRIGHT_BIN=$(command -v playwright)
        NODE_PATH=$(cd "$(dirname "$PLAYWRIGHT_BIN")/.." && pwd)
        export NODE_PATH
        playwright test --config=playwright.config.js --project="$VOY_CASE_PROJECT" "$VOY_CASE_SPEC" --reporter=line
      ' \
      VOY_CASE_PROJECT="$project" \
      VOY_CASE_SPEC="$spec"
      status=$?
      set -e
    fi
    stop_wrangler

    if [[ "$status" -eq 0 ]]; then
      return 0
    fi
    if [[ "$attempt" -eq 1 ]]; then
      echo "Retrying isolated browser case after recoverable local-runtime failure: $label" >&2
      sleep 2
    fi
  done

  echo "Browser case failed after isolated retry: $label; last Wrangler log: $CURRENT_LOG" >&2
  return "$status"
}

mapfile -t SPECS < <(find browser-tests -maxdepth 1 -type f -name '*.spec.js' -print | sort)
if [[ "${#SPECS[@]}" -eq 0 ]]; then
  echo 'No browser smoke specifications found' >&2
  exit 1
fi

for project in desktop mobile; do
  for spec in "${SPECS[@]}"; do
    run_case "$project" "$spec"
  done
done
