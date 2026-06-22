#!/usr/bin/env bash
# ============================================================
#  VOY V7 — Rollback (undo a bad deploy)
#
#  Cloudflare Workers keeps the last 10 deployments. This script:
#    1. Lists recent deployments (with datetime + version marker)
#    2. Identifies the previous-known-good version
#    3. Rolls back to it with a reason message
#
#  Usage:
#    ./scripts/rollback.sh                # list + prompt to select
#    ./scripts/rollback.sh <version-id>   # roll back to specific version
#    ./scripts/rollback.sh <version-id> "V7 health check failed"
#
#  Requires: CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID env vars
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] || [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  echo "❌ Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID first."
  echo "   export CLOUDFLARE_API_TOKEN=cfut_xxx"
  echo "   export CLOUDFLARE_ACCOUNT_ID=xxx"
  exit 1
fi

TARGET_VERSION="${1:-}"
REASON="${2:-V7 rollback: production verification failed}"

echo "── Recent deployments for voy-core ──"
npx wrangler deployments list 2>&1 | tee /tmp/voy-deployments.txt

echo ""
echo "── How to identify the previous-good version ──"
echo "  Look for the deployment BEFORE your latest V7 deploy."
echo "  The latest is V7.0.0 (check /api/health). The one before it is V4 legacy"
echo "  — that's your known-good rollback target if V7 is broken."
echo ""
echo "  To verify a version's identity before rolling back:"
echo "    curl -s https://voy-app.simondalmasso44.workers.dev/api/health | jq ."
echo ""

if [ -z "$TARGET_VERSION" ]; then
  echo "No version-id specified. To roll back:"
  echo "  1. Copy a Version ID from the list above"
  echo "  2. Run: ./scripts/rollback.sh <version-id> \"reason\""
  echo ""
  echo "  Or roll back interactively (wrangler will prompt):"
  echo "    npx wrangler rollback"
  exit 0
fi

echo "── Rolling back to: $TARGET_VERSION ──"
echo "   Reason: $REASON"
echo ""
read -p "Confirm rollback? (y/N) " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Aborted."
  exit 0
fi

npx wrangler rollback "$TARGET_VERSION" -m "$REASON" -y

echo ""
echo "── Post-rollback verification ──"
sleep 3
bash scripts/verify-production.sh https://voy-app.simondalmasso44.workers.dev || true

echo ""
echo "✅ Rollback complete. Investigate the V7 failure before re-deploying:"
echo "   - Check wrangler tail logs: npx wrangler tail"
echo "   - Re-run preflight: ./scripts/preflight.sh"
echo "   - Fix the issue, then: ./scripts/deploy.sh"
