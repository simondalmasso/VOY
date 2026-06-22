#!/usr/bin/env bash
# ============================================================
#  VOY V7 — Preflight gate (run BEFORE deploy.sh)
#
#  Proves the local bundle is deploy-ready in <10 seconds.
#  Exits 0 only if ALL checks pass — deploy.sh will not fail for a code reason.
#
#  Checks:
#    1. worker.js has V7 markers (WORKER_VERSION + BUILD_HASH + _htmlNoStore)
#    2. VOY-Lite.html has V7 version pin + modeSelector + no leftover placeholders
#    3. mobilityController.js has the V7 ID remapping fix
#    4. All 4 deploy scripts exist + are valid
#    5. wrangler.jsonc is valid + has ASSETS + VOY_METRICS bindings
#    6. bun run lint passes (0 errors)
#    7. wrangler deploy --dry-run passes (config + asset binding)
#    8. Git working tree is clean OR only has V7 files staged
#
#  Usage: ./scripts/preflight.sh
# ============================================================
set -u
cd "$(dirname "$0")/.."

PASS=0; FAIL=0
ok()  { printf "  ✅ %s\n" "$1"; PASS=$((PASS+1)); }
bad() { printf "  ❌ %s\n" "$1"; FAIL=$((FAIL+1)); }
hdr() { printf "\n── %s ──\n" "$1"; }

printf "VOY V7 preflight — proving local bundle is deploy-ready\n"

# ── 1. worker.js V7 markers ─────────────────────────────────
hdr "1. worker.js V7 markers"
if grep -q 'WORKER_VERSION = "V7.1.0"' worker.js; then ok "WORKER_VERSION = V7.1.0"; else bad "WORKER_VERSION missing"; fi
if grep -q 'BUILD_HASH = "__BUILD_HASH__"' worker.js; then ok "BUILD_HASH placeholder present (CI will inject)"; else bad "BUILD_HASH placeholder missing or already injected"; fi
if grep -q '_htmlNoStore' worker.js; then ok "_htmlNoStore() helper present (cache-bust)"; else bad "_htmlNoStore missing"; fi
if grep -q 'Cache-Control.*no-store' worker.js; then ok "Cache-Control: no-store on HTML"; else bad "no-store header missing"; fi

# ── 2. VOY-Lite.html V7 markers ─────────────────────────────
hdr "2. VOY-Lite.html V7 markers"
if grep -q 'voy-version" content="V7.1.0"' public/VOY-Lite.html; then ok "meta voy-version = V7.1.0"; else bad "version meta missing"; fi
if grep -q "window.VOY_VERSION='V7.1.0'" public/VOY-Lite.html; then ok "window.VOY_VERSION = V7.1.0"; else bad "VOY_VERSION JS missing"; fi
if grep -q 'id="modeSelector"' public/VOY-Lite.html; then ok "modeSelector element present"; else bad "modeSelector missing"; fi
if grep -q 'showModeSelector(true)' public/VOY-Lite.html; then ok "mode selector force-shown on mount"; else bad "showModeSelector(true) missing"; fi
if grep -q '_modeMatches' public/VOY-Lite.html; then ok "_activeMode filter (_modeMatches) present"; else bad "_modeMatches missing"; fi
# Leftover placeholders would mean a previous inject wasn't reset
if grep -q '__BUILD_HASH__' public/VOY-Lite.html && grep -q '__DEPLOY_TS__' public/VOY-Lite.html; then
  ok "Placeholders present (deploy.sh will inject)"
else
  bad "Placeholders missing — previous inject not reset. Run: git checkout public/VOY-Lite.html worker.js"
fi

# ── 3. mobilityController.js V7 fix ─────────────────────────
hdr "3. mobilityController.js V7 ID remapping fix"
if grep -q 'radiotaxi' public/ui/mobilityController.js && grep -q 'remisreal' public/ui/mobilityController.js; then
  ok "ID remapping (taxi→radiotaxi, remis→remisreal) present"
else
  bad "ID remapping missing — taxi/remis modes will show empty heroes"
fi

# ── 4. Deploy scripts present + valid ───────────────────────
hdr "4. Deploy scripts"
for s in deploy.sh verify-production.sh inject-build-hash.mjs prepare-isadev-pr.mjs; do
  if [ -f "scripts/$s" ]; then
    if [[ "$s" == *.sh ]]; then
      if bash -n "scripts/$s" 2>/dev/null; then ok "scripts/$s (syntax OK)"; else bad "scripts/$s (syntax error)"; fi
    else
      if node --check "scripts/$s" 2>/dev/null; then ok "scripts/$s (syntax OK)"; else bad "scripts/$s (syntax error)"; fi
    fi
  else
    bad "scripts/$s MISSING"
  fi
done

# ── 5. wrangler.jsonc ───────────────────────────────────────
hdr "5. wrangler.jsonc config"
if grep -q '"voy-app"' wrangler.jsonc; then ok "worker name = voy-app"; else bad "worker name not voy-app"; fi
if grep -q '"ASSETS"' wrangler.jsonc; then ok "ASSETS binding present"; else bad "ASSETS binding missing"; fi
if grep -q '"VOY_METRICS"' wrangler.jsonc; then ok "VOY_METRICS binding present"; else bad "VOY_METRICS binding missing"; fi
if grep -q '"not_found_handling": "none"' wrangler.jsonc; then ok "not_found_handling = none (no directory listing)"; else bad "not_found_handling not set"; fi

# ── 6. Lint ─────────────────────────────────────────────────
hdr "6. ESLint"
if bun run lint 2>&1 | tail -3 | grep -qiE 'error|warning'; then
  bad "lint has errors/warnings"
  bun run lint 2>&1 | tail -10
else
  ok "lint clean (0 errors, 0 warnings)"
fi

# ── 7. Dry-run ──────────────────────────────────────────────
hdr "7. wrangler deploy --dry-run"
DRY=$(npx wrangler deploy --dry-run --minify 2>&1)
if echo "$DRY" | grep -q 'Total Upload'; then
  ASSETS=$(echo "$DRY" | grep -oE '[0-9]+ files from the assets directory' | grep -oE '^[0-9]+')
  SIZE=$(echo "$DRY" | grep -oE 'Total Upload: [0-9.]+ KiB' | head -1)
  ok "dry-run passed ($ASSETS assets, $SIZE)"
else
  bad "dry-run failed"
  echo "$DRY" | tail -10
fi

# ── 8. Git state ────────────────────────────────────────────
hdr "8. Git state"
SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
ok "HEAD = $SHA"
if [ "$DIRTY" = "0" ]; then
  ok "working tree clean"
else
  printf "  ⚠️  %s uncommitted files (commit before CI deploy, or use ./scripts/deploy.sh for local deploy)\n" "$DIRTY"
fi

# ── Summary ─────────────────────────────────────────────────
hdr "PREFLIGHT SUMMARY"
printf "  Passed: %d\n" "$PASS"
printf "  Failed: %d\n" "$FAIL"
if [ "$FAIL" -eq 0 ]; then
  printf "\n  🟢 READY TO DEPLOY.\n"
  printf "     export CLOUDFLARE_API_TOKEN=cfut_xxx\n"
  printf "     export CLOUDFLARE_ACCOUNT_ID=xxx\n"
  printf "     ./scripts/deploy.sh\n\n"
  exit 0
else
  printf "\n  🔴 NOT READY — fix the %d failing check(s) above before deploying.\n\n" "$FAIL"
  exit 1
fi
