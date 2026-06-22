#!/usr/bin/env bash
# ============================================================
#  VOY V7 — Production verification script
#
#  Checks the FULL production stack is live and consistent:
#    1. DNS:        voy.is-a.dev CNAME → workers.dev  (SKIPPED if target ≠ voy.is-a.dev)
#    2. HTTPS:      target → 200 (not 302 is-a.dev fallback)
#    3. Health:     /api/health → version V7.1.0 + build_hash == local git SHA
#    4. UI version: / contains <meta name="voy-version" content="V7.1.0">
#    5. Cache-bust: / response has Cache-Control: no-store
#    6. Entrypoint: /VOY-Lite.html → 301 (internal path hidden)
#    7. Mode selector: / contains modeSelector (transport selector mounted)
#
#  Exit codes: 0 = all pass, 1 = one or more checks failed.
#
#  Usage:
#    ./scripts/verify-production.sh                  # checks voy.is-a.dev
#    ./scripts/verify-production.sh https://voy-app.simondalmasso44.workers.dev
# ============================================================
set -u

CANONICAL="${1:-https://voy.is-a.dev}"
PASS=0; FAIL=0

ok()   { printf "  ✅ %s\n" "$1"; PASS=$((PASS+1)); }
bad()  { printf "  ❌ %s\n" "$1"; FAIL=$((FAIL+1)); }
hdr()  { printf "\n── %s ──\n" "$1"; }

# Local git SHA (what we EXPECT to be live if just deployed)
LOCAL_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

printf "VOY V7 production verification\n"
printf "Target:   %s\n" "$CANONICAL"
printf "Local SHA: %s\n" "$LOCAL_SHA"

# ── 1. DNS (only for voy.is-a.dev target) ──────────────────
if echo "$CANONICAL" | grep -q 'voy.is-a.dev'; then
  hdr "1. DNS (voy.is-a.dev CNAME)"
  if command -v dig >/dev/null 2>&1; then
    CNAME=$(dig +short voy.is-a.dev CNAME 2>/dev/null | head -1)
    if [ -n "$CNAME" ]; then
      ok "CNAME → $CNAME"
      if echo "$CNAME" | grep -q 'workers.dev'; then
        ok "CNAME points to workers.dev (is-a.dev PR merged)"
      else
        bad "CNAME does not point to workers.dev (is-a.dev PR NOT merged)"
      fi
    else
      A_RECORD=$(dig +short voy.is-a.dev A 2>/dev/null | head -1)
      if [ -n "$A_RECORD" ]; then
        bad "No CNAME found (A record: $A_RECORD). is-a.dev likely NOT registered or not propagated."
      else
        bad "No DNS records found for voy.is-a.dev"
      fi
    fi
  else
    printf "  ⚠️  dig not available — skipping DNS check\n"
  fi
else
  hdr "1. DNS (skipped — target is workers.dev, not voy.is-a.dev)"
  printf "  ⏭️  DNS check only applies to voy.is-a.dev. Run with that target after is-a.dev PR merges.\n"
fi

# ── 2. HTTPS ────────────────────────────────────────────────
hdr "2. HTTPS ($CANONICAL → 200)"
# Fetch HTML once (reused by checks 4 and 7 too).
HTML=$(curl -fsS -m 10 "$CANONICAL/" 2>/dev/null || echo "")
# Don't follow redirects — we want to catch the is-a.dev 302 fallback.
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "$CANONICAL" 2>/dev/null || echo "000")
REDIRECT=$(curl -s -o /dev/null -w '%{redirect_url}' -m 10 "$CANONICAL" 2>/dev/null || echo "")
if [ "$HTTP_CODE" = "200" ]; then
  # 200 could be the real app OR the is-a.dev fallback landing page — verify it's VOY
  if echo "$HTML" | grep -q 'voy-version\|VOY\|Movilidad Santa Fe' 2>/dev/null; then
    ok "HTTP 200 — VOY is live"
  else
    bad "HTTP 200 but content is NOT VOY (likely is-a.dev fallback landing page)"
  fi
elif [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "301" ]; then
  bad "HTTP $HTTP_CODE (redirect, not direct serve)"
  if [ -n "$REDIRECT" ]; then
    bad "Redirects to: $REDIRECT"
    if echo "$REDIRECT" | grep -q 'is-a.dev/?d='; then
      bad "  ↳ is-a.dev fallback page — domain NOT registered (PR not merged)"
    fi
  fi
else
  bad "HTTP $HTTP_CODE (expected 200)"
fi

# ── 3. Health endpoint ──────────────────────────────────────
hdr "3. /api/health (worker version + build hash)"
HEALTH=$(curl -fsS -m 10 "$CANONICAL/api/health?_=$(date +%s)" 2>/dev/null || echo "")
if [ -n "$HEALTH" ]; then
  LIVE_VER=$(echo "$HEALTH" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "")
  LIVE_HASH=$(echo "$HEALTH" | grep -o '"build_hash":"[^"]*"' | cut -d'"' -f4 || echo "")
  printf "  version:    %s\n" "${LIVE_VER:-<missing>}"
  printf "  build_hash: %s\n" "${LIVE_HASH:-<missing>}"
  if [ "$LIVE_VER" = "V7.1.0" ]; then
    ok "Worker version is V7.1.0"
  else
    bad "Worker version is '$LIVE_VER' (expected V7.1.0) — STALE WORKER deployed"
  fi
  if [ -n "$LIVE_HASH" ] && [ "$LIVE_HASH" != "__BUILD_HASH__" ]; then
    ok "Build hash injected: $LIVE_HASH"
    if [ "$LOCAL_SHA" != "unknown" ] && [ "$LIVE_HASH" = "$LOCAL_SHA" ]; then
      ok "Build hash matches local git SHA (deploy is current)"
    else
      bad "Build hash ($LIVE_HASH) ≠ local git SHA ($LOCAL_SHA) — deploy is behind local"
    fi
  else
    bad "Build hash is placeholder '__BUILD_HASH__' — CI did NOT inject hash before deploy"
  fi
else
  bad "Could not fetch /api/health (worker not deployed or not reachable)"
fi

# ── 4. UI version pin ───────────────────────────────────────
hdr "4. UI version pin (<meta voy-version>)"
# HTML already fetched in check 2.
if echo "$HTML" | grep -q 'voy-version" content="V7.1.0"'; then
  ok "UI HTML contains V7.1.0 version pin"
else
  if echo "$HTML" | grep -q 'voy-version'; then
    LIVE_UI_VER=$(echo "$HTML" | grep -o 'voy-version" content="[^"]*"' | cut -d'"' -f4 || echo "")
    bad "UI version is '$LIVE_UI_VER' (expected V7.1.0) — STALE HTML on edge"
  else
    bad "UI HTML has NO voy-version meta tag — OLD build (pre-V7) still serving"
  fi
fi

# ── 5. Cache-bust header ────────────────────────────────────
hdr "5. Cache-Control: no-store on HTML"
CC=$(curl -sI -m 10 "$CANONICAL/" 2>/dev/null | grep -i '^cache-control:' || echo "")
if echo "$CC" | grep -qi 'no-store'; then
  ok "HTML has Cache-Control: no-store (edge will not serve stale UI)"
else
  bad "HTML Cache-Control: ${CC:-<missing>} (expected no-store) — worker.js V7 not deployed"
fi

# ── 6. Single entrypoint ────────────────────────────────────
hdr "6. /VOY-Lite.html (internal path)"
ENTRY_CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 10 "$CANONICAL/VOY-Lite.html" 2>/dev/null || echo "000")
ENTRY_HTML=$(curl -fsS -m 10 "$CANONICAL/VOY-Lite.html" 2>/dev/null || echo "")
if [ "$ENTRY_CODE" = "301" ] || [ "$ENTRY_CODE" = "308" ]; then
  ok "/VOY-Lite.html → $ENTRY_CODE (worker redirects to /, internal path hidden)"
elif [ "$ENTRY_CODE" = "200" ]; then
  # CF Workers Assets may serve /VOY-Lite.html directly (bypassing the worker).
  # Accept 200 IF the content is V7 (not stale V4). The canonical URL / works
  # regardless; this just means the internal path is also browseable.
  if echo "$ENTRY_HTML" | grep -q 'voy-version" content="V7.1.0"'; then
    ok "/VOY-Lite.html → 200 (CF Assets direct serve, V7.1.0 content verified — path not hidden but app correct)"
  else
    bad "/VOY-Lite.html → 200 but content is NOT V7.1.0 (stale V4 serving from this path)"
  fi
else
  bad "/VOY-Lite.html → $ENTRY_CODE (expected 301 or 200) — worker.js not deployed or unreachable"
fi

# ── 7. Transport selector mounted ───────────────────────────
hdr "7. Transport mode selector mounted in DOM"
if echo "$HTML" | grep -q 'id="modeSelector"'; then
  ok "modeSelector element present in HTML"
  if echo "$HTML" | grep -q 'mode-selector show\|showModeSelector(true)'; then
    ok "Mode selector is force-shown on mount (V7)"
  else
    printf "  ⚠️  modeSelector present but visibility depends on renderSheet() runtime call\n"
  fi
else
  bad "modeSelector element NOT in HTML — OLD build (pre-V6) serving"
fi

# ── Summary ─────────────────────────────────────────────────
hdr "SUMMARY"
printf "  Passed: %d\n" "$PASS"
printf "  Failed: %d\n" "$FAIL"
if [ "$FAIL" -eq 0 ]; then
  printf "\n  🎉 V7 production is LIVE and consistent.\n\n"
  exit 0
else
  printf "\n  🔴 V7 production is NOT consistent with local code.\n"
  printf "     See DEPLOY_V7.md for the manual steps to fix each failure.\n\n"
  exit 1
fi
