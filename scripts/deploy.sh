#!/usr/bin/env bash
# ============================================================
#  VOY V7 — One-command deploy
#
#  Collapses the 6 manual steps into a single command:
#    1. Check CF credentials are set
#    2. bun run lint (fail → stop)
#    3. wrangler deploy --dry-run (fail → stop)
#    4. node scripts/inject-build-hash.mjs (git SHA → worker.js + HTML)
#    5. wrangler deploy --minify (REAL deploy)
#    6. bash scripts/verify-production.sh (7-point check)
#
#  Usage:
#    CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=yyy ./scripts/deploy.sh
#    CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=yyy ./scripts/deploy.sh https://voy-app.simondalmasso44.workers.dev
#
#  If you've changed your account subdomain to "voy", the script auto-detects
#  the worker URL from the deploy output. Otherwise pass the staging URL.
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

TARGET_URL="${1:-}"

# ── 0. Pre-flight: credentials ──────────────────────────────
echo "── 0. Pre-flight checks ──"
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "❌ CLOUDFLARE_API_TOKEN is not set."
  echo "   Create one at: https://dash.cloudflare.com/profile/api-tokens"
  echo "   Required perms: Account → Workers Scripts → Edit"
  echo "   Then run:"
  echo "     export CLOUDFLARE_API_TOKEN=cfut_your_new_token"
  echo "     export CLOUDFLARE_ACCOUNT_ID=your_account_id"
  echo "     ./scripts/deploy.sh"
  exit 1
fi
if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  echo "❌ CLOUDFLARE_ACCOUNT_ID is not set."
  echo "   Find it in the CF dashboard right sidebar (a hex string)."
  echo "     export CLOUDFLARE_ACCOUNT_ID=abc123..."
  exit 1
fi
echo "  ✅ CLOUDFLARE_API_TOKEN set (len=${#CLOUDFLARE_API_TOKEN})"
echo "  ✅ CLOUDFLARE_ACCOUNT_ID set"
echo "  ✅ git SHA: $(git rev-parse --short HEAD)"

# ── 1. Lint ─────────────────────────────────────────────────
echo ""
echo "── 1. Lint ──"
bun run lint
echo "  ✅ lint clean"

# ── 1b. Tests (gate — deploy aborts if tests fail) ──────────
echo ""
echo "── 1b. Tests ──"
if ls __tests__/*.test.js >/dev/null 2>&1; then
  node --test "__tests__/**/*.test.js" 2>&1 | tail -15
  TEST_EXIT=${PIPESTATUS[0]}
  if [ "$TEST_EXIT" -ne 0 ]; then
    echo "❌ Tests FAILED — deploy aborted."
    exit 1
  fi
  echo "  ✅ tests passed"
else
  echo "  ⏭️  no tests found — skipping"
fi

# ── 2. Dry-run (config + asset binding) ─────────────────────
echo ""
echo "── 2. Dry-run (config + asset binding) ──"
npx wrangler deploy --dry-run --minify 2>&1 | tail -8
echo "  ✅ dry-run passed"

# ── 3. Inject build hash (V7 guardrail) ─────────────────────
echo ""
echo "── 3. Inject build hash (git SHA → worker.js + HTML) ──"
node scripts/inject-build-hash.mjs
echo "  ✅ build hash injected"

# ── 4. REAL deploy ──────────────────────────────────────────
echo ""
echo "── 4. Deploy to Cloudflare Workers ──"
DEPLOY_LOG=$(mktemp)
npx wrangler deploy --minify 2>&1 | tee "$DEPLOY_LOG"
echo "  ✅ deploy command completed"

# Extract worker URL from deploy output
if [ -z "$TARGET_URL" ]; then
  TARGET_URL=$(grep -oE 'https://[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev' "$DEPLOY_LOG" | head -1 || true)
fi
rm -f "$DEPLOY_LOG"

if [ -z "$TARGET_URL" ]; then
  echo "  ⚠️  could not extract worker URL from deploy log"
  echo "     falling back to: https://voy-app.simondalmasso44.workers.dev"
  TARGET_URL="https://voy-app.simondalmasso44.workers.dev"
fi
echo "  → Worker URL: $TARGET_URL"

# ── 5. Wait for edge propagation ────────────────────────────
echo ""
echo "── 5. Waiting 4s for edge propagation ──"
sleep 4

# ── 6. Verify (7-point check) ───────────────────────────────
echo ""
echo "── 6. Production verification ──"
bash scripts/verify-production.sh "$TARGET_URL" || {
  echo ""
  echo "🔴 DEPLOY COMPLETED BUT VERIFICATION FAILED."
  echo "   The deploy went through, but the edge is not serving the new build yet."
  echo "   Likely causes:"
  echo "     - CF cache still serving old HTML (wait 30s, re-run verify)"
  echo "     - Worker version still propagating (wait 10s, re-run verify)"
  echo "     - If persists: purge cache in CF dashboard → Caching → Purge Everything"
  echo ""
  echo "   Re-run verification:"
  echo "     bash scripts/verify-production.sh $TARGET_URL"
  exit 1
}

echo ""
echo "═══════════════════════════════════════════════════════════"
# Dynamic version: extracted from worker.js WORKER_VERSION constant.
DEPLOY_VER=$(grep -oE 'WORKER_VERSION = "[^"]+"' worker.js | head -1 | cut -d'"' -f2)
echo "  🎉 V7 DEPLOY SUCCESSFUL"
echo "  Worker: $TARGET_URL"
echo "  Version: ${DEPLOY_VER:-unknown}"
echo "  Build:   $(git rev-parse --short HEAD)"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Next: register voy.is-a.dev (see DEPLOY_V7.md step E)"
echo "  Then: bash scripts/verify-production.sh https://voy.is-a.dev"
