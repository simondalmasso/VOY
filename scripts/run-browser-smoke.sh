#!/usr/bin/env bash
set -euo pipefail

PLAYWRIGHT_VERSION="1.61.1"
WRANGLER_LOG="${WRANGLER_LOG:-test-results/wrangler-local.log}"
mkdir -p test-results

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
    echo "Wrangler local exited before becoming healthy" >&2
    exit 1
  fi
  if [ "$attempt" -eq 60 ]; then
    echo "Timed out waiting for Wrangler local health" >&2
    exit 1
  fi
  sleep 1
done

npm exec --yes --package="@playwright/test@${PLAYWRIGHT_VERSION}" -- sh -c '
  PLAYWRIGHT_BIN=$(command -v playwright)
  NODE_PATH=$(cd "$(dirname "$PLAYWRIGHT_BIN")/.." && pwd)
  export NODE_PATH
  playwright test --config=playwright.config.js
'
