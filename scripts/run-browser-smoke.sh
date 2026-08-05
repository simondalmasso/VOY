#!/usr/bin/env bash
set -euo pipefail
PORT="${VOY_PORT:-8787}"
BASE_URL="${VOY_BASE_URL:-http://127.0.0.1:$PORT}"
LOG="${WRANGLER_LOG:-test-results/vite-local.log}"
mkdir -p "$(dirname "$LOG")"
BUILD_HASH="${BUILD_HASH:-browser}" bun run dev -- --host 127.0.0.1 --port "$PORT" >"$LOG" 2>&1 &
PID=$!
cleanup(){ kill "$PID" 2>/dev/null || true; wait "$PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
for attempt in $(seq 1 90); do
  if curl --fail --silent "$BASE_URL/api/health" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$PID" 2>/dev/null; then cat "$LOG"; exit 1; fi
  sleep 1
  if [[ "$attempt" = 90 ]]; then cat "$LOG"; exit 1; fi
done
VOY_BASE_URL="$BASE_URL" VOY_EXTERNAL_SERVER=1 bunx playwright test -c browser-tests/playwright.config.ts
