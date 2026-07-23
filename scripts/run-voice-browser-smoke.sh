#!/usr/bin/env bash
set -euo pipefail

PLAYWRIGHT_VERSION="1.61.1"
WRANGLER_LOG="${WRANGLER_LOG:-test-results/voice-wrangler-local.log}"
VOY_OUTPUT_DIR="${VOY_OUTPUT_DIR:-test-results/voice-playwright}"
VOY_REPORT_DIR="${VOY_REPORT_DIR:-playwright-report-voice}"
mkdir -p "$(dirname "$WRANGLER_LOG")" "$VOY_OUTPUT_DIR" "$VOY_REPORT_DIR"

npx wrangler dev --local --port 8787 >"$WRANGLER_LOG" 2>&1 &
WRANGLER_PID=$!
cleanup() {
  kill "$WRANGLER_PID" 2>/dev/null || true
  wait "$WRANGLER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for attempt in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8787/api/health >/dev/null; then
    break
  fi
  if ! kill -0 "$WRANGLER_PID" 2>/dev/null; then
    echo "Wrangler local exited before Voice browser tests" >&2
    cat "$WRANGLER_LOG" >&2 || true
    exit 1
  fi
  if [ "$attempt" -eq 60 ]; then
    echo "Timed out waiting for local Voice candidate" >&2
    cat "$WRANGLER_LOG" >&2 || true
    exit 1
  fi
  sleep 1
done

export VOY_BASE_URL="http://127.0.0.1:8787"
export VOY_OUTPUT_DIR
export VOY_REPORT_DIR
npm exec --yes --package="@playwright/test@${PLAYWRIGHT_VERSION}" -- sh -c '
  PLAYWRIGHT_BIN=$(command -v playwright)
  NODE_PATH=$(cd "$(dirname "$PLAYWRIGHT_BIN")/.." && pwd)
  export NODE_PATH
  playwright test --config=voice-tests/playwright.config.js
'
