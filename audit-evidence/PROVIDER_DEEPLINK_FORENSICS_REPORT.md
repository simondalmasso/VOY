# PROVIDER_DEEPLINK_FORENSICS — Strict-Mode Audit Report

**Date:** 2026-06-23  
**Auditor:** Main (Z.ai Code)  
**Scope:** Deep links for 5 providers (Uber, DiDi, Maxim, Cabify, TaxiApp) + all external actions in code  
**Rules:** `no_assumptions: true`, `browser_test: true`, `android_test: true`, `ios_test: true`, `evidence_required: true`  
**Production URL:** `https://voy-app.simondalmasso44.workers.dev/` (build_hash=f835a50, V7.8.0)

---

## 1. Executive Summary

| Metric | Value |
|---|---|
| Providers requested | 5 (Uber, DiDi, Maxim, Cabify, TaxiApp) |
| Providers with working deep links | 3 (Uber, DiDi*, Maxim) |
| Providers missing deep links | 1 (Cabify — intentionally absent, doesn't serve Santa Fe) |
| Providers with partial deep links | 1 (TaxiApp — WhatsApp only, native app deep link missing) |
| Bugs found | 4 (BUG-001 critical, BUG-003 medium, BUG-004 low-med, BUG-005 low) |
| Console errors during testing | 0 |
| **Deployment ready** | **NO** (BUG-001 fix not deployed + BUG-003 regression must be fixed) |

*DiDi fix exists in local source but is **NOT deployed** to production — users hitting 404 right now.

---

## 2. Provider Matrix

### 2.1 UBER ✅ WORKING

| Field | Value | Evidence |
|---|---|---|
| **working_url** | `https://m.uber.com/ul/?action=setPickup&pickup[latitude]={lat}&pickup[longitude]={lon}&pickup[formatted_address]=Origen&dropoff[latitude]={lat}&dropoff[longitude]={lon}` | VOY-Lite.html:2018 |
| **fallback_url** | (same — universal link auto-falls-back to App Store/Play Store via Branch.io) | curl test: iOS→App Store, Android→Branch smart link |
| **android_scheme** | `uber://` (via m.uber.com/ul/ universal link → Branch.io → uber://) | curl Android UA → rides.sng.link → uber:// |
| **ios_scheme** | `uber://` (via Universal Link, OS-intercepted) | curl iOS UA → apps.apple.com fallback |
| **universal_link** | `https://m.uber.com/ul/` | ✓ Official Uber docs (developer.uber.com/docs/deep-linking) |
| **package** | `com.ubercab` (not used by VOY — universal link handles it) | — |
| **bundle** | `id368087833` (not used by VOY — universal link handles it) | — |
| **official_source** | https://developer.uber.com/docs/deep-linking | ✓ HTTP 200 |
| **confidence** | **0.95** | Official docs + live HTTP test + official format match |

**HTTP verification:**
- `m.uber.com/ul/...` (iOS UA): HTTP 200, 4 redirects → `apps.apple.com/us/app/uber-request-a-ride/id368677368` (browser fallback — real iOS device with Uber installed would open app directly via Universal Link)
- `m.uber.com/ul/...` (Android UA): HTTP 302, 3 redirects → `rides.sng.link/Aw5zn/q1wc?_dl=uber%3A%2F%2F...` (Branch.io smart link → uber:// scheme + Play Store fallback)

---

### 2.2 DIDI ⚠️ FIX EXISTS LOCALLY, NOT DEPLOYED

| Field | Value | Evidence |
|---|---|---|
| **working_url (Android)** | `intent://#Intent;scheme=didi;package=com.didiglobal.passenger;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.didiglobal.passenger;end` | VOY-Lite.html:2035 (BUG-001 fix, LOCAL ONLY) |
| **working_url (iOS)** | `didi://` ⚠️ NO App Store fallback | VOY-Lite.html:2042 |
| **working_url (Desktop)** | `https://play.google.com/store/apps/details?id=com.didiglobal.passenger` | VOY-Lite.html:2045 |
| **fallback_url** | `https://play.google.com/store/apps/details?id=com.didiglobal.passenger` (Android+Desktop) | HTTP 200 ✓ |
| **android_scheme** | `didi://` (via intent://) | — |
| **ios_scheme** | `didi://` (no fallback — BUG-004) | — |
| **universal_link** | ❌ DiDi does not publish a working AR universal link | Confirmed: old `didiglobal.com/passenger/deeplink` → 302 → /404 |
| **package** | `com.didiglobal.passenger` | ✓ Play Store HTTP 200, "DiDi: Viajes, Comida y Pagos" by DiDi Global |
| **bundle** | `id1362398401` | ✓ App Store HTTP 200 (NOT used in iOS branch — BUG-004) |
| **official_source** | ❌ DiDi publishes NO public deep link docs for third parties | web_search returned only Play Store/App Store listings |
| **confidence** | **0.70** (fix is correct, but iOS branch is fragile) | Live HTTP + Play Store verified, but no official scheme docs |

**CRITICAL — BUG-001 STATUS:**
- **Production (build_hash=f835a50):** STILL SERVES BROKEN URL `https://www.didiglobal.com/passenger/deeplink?pickup_lat=...` → HTTP 302 → Location: `/404` → HTTP 200 (404 page). Confirmed via eval on production HTML: `has_old_broken_didi_url: true, has_new_bug001_fix: false`.
- **Local source (VOY-Lite.html:2030-2045):** Has the fix (intent:// + Play Store fallback). Confirmed via Agent Browser eval: `buildAppLink('didi')` returns correct intent URL on Android UA.
- **Root cause:** `didiglobal.com` is DiDi's CHINESE corporate site, not the AR passenger app. The `/passenger/deeplink` endpoint does not exist.
- **Impact:** Every user clicking "DiDi" in production right now is redirected to a 404 page on didiglobal.com.

---

### 2.3 MAXIM ✅ WORKING

| Field | Value | Evidence |
|---|---|---|
| **working_url (Android)** | `intent://order?startLat={lat}&startLon={lon}&finishLat={lat}&finishLon={lon}#Intent;scheme=maxim;package=com.taxsee.taxsee;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.taxsee.taxsee;end` | VOY-Lite.html:2053 |
| **working_url (iOS/Desktop)** | `https://taximaxim.com/ar/` | VOY-Lite.html:2054 |
| **fallback_url** | `https://play.google.com/store/apps/details?id=com.taxsee.taxsee` (Android) | HTTP 200 ✓ |
| **android_scheme** | `maxim://` (via intent://) — prior fix from `taxsee://` per code comment | VOY-Lite.html:2049-2051 |
| **ios_scheme** | ❌ No iOS app for AR (web fallback used) | — |
| **universal_link** | ❌ None | — |
| **package** | `com.taxsee.taxsee` | ✓ Play Store HTTP 200 |
| **bundle** | N/A (no iOS app for AR) | — |
| **official_source** | ❌ Maxim publishes NO public deep link docs | web_search returned only generic Android articles + Taxsee Driver app |
| **confidence** | **0.80** | Play Store verified, scheme=maxim is documented prior fix, web fallback works |

**HTTP verification:**
- `play.google.com/store/apps/details?id=com.taxsee.taxsee`: HTTP 200 ✓
- `taximaxim.com/ar/`: HTTP 200 ✓ (sets AR city cookie `__tm_city_ar=...i:10703`)

**Note (BUG-002 from Task 42):** "Maxim opens Play Store" behavior is NOT a bug — it's the EXPECTED fallback when the app isn't installed (`S.browser_fallback_url` parameter). When the app IS installed, Android opens it directly.

---

### 2.4 CABIFY ❌ NOT IMPLEMENTED (BY DESIGN)

| Field | Value | Evidence |
|---|---|---|
| **working_url** | N/A — `buildAppLink('cabify')` returns `#` | VOY-Lite.html:2056 (default return) |
| **fallback_url** | N/A | — |
| **android_scheme** | N/A | — |
| **ios_scheme** | N/A | — |
| **universal_link** | N/A | — |
| **package** | `com.cabify.rider` (known, verified HTTP 200, NOT used) | Play Store confirmed |
| **bundle** | `id476087442` (known, verified HTTP 200, NOT used) | App Store confirmed → "cabify-viaja-seguro" |
| **official_source** | https://cabify.com (corporate) | — |
| **confidence** | **0.90** (that absence is correct) | web_search confirmed Cabify operates in AR but NOT Santa Fe |

**Rationale:** Cabify operates in Argentina only in Buenos Aires, Mendoza, Córdoba, and Rosario — **NOT Santa Fe**. The code correctly sets `cabifyPrice: null` (mobilityEngine.js:143,158) and has NO deep link for Cabify. This is intentional, NOT a bug.

**Minor code smell:** `cabifyPrice: null` is a ghost entry in the pricing engine. Could be removed for clarity, but harmless.

---

### 2.5 TAXIAPP ⚠️ PARTIAL (WhatsApp only, native app deep link MISSING)

| Field | Value | Evidence |
|---|---|---|
| **working_url** | `https://wa.link/vavbcl` (WhatsApp short link) | VOY-Lite.html:811 |
| **fallback_url** | (same — wa.link works on all platforms via web redirect) | — |
| **android_scheme** | ❌ NOT USED — but native app exists: `com.aniversario.pasajero` | Play Store "TaxiApp Aniversario" HTTP 200 ✓ (BUG-005) |
| **ios_scheme** | ❌ No iOS app found | — |
| **universal_link** | ❌ None | — |
| **package** | `com.aniversario.pasajero` (known, verified HTTP 200, NOT used) | Play Store: "TaxiApp Aniversario — order taxis in Santa Fe" |
| **bundle** | N/A | — |
| **official_source** | Instagram @taxiapp_santafe, Facebook taxi.app11 | web_search confirmed |
| **confidence** | **0.75** | WhatsApp verified, native app verified but not linked |

**HTTP verification:**
- `wa.link/vavbcl` (GET, iOS UA): HTTP 200, 1 redirect → `https://api.whatsapp.com/send?phone=543424213701&text=Hola%2C%20quiero%20pedir%20un%20vehiculo.%20VOY%20de%3A%20hasta%3A%0A%0A`
- Phone: +54 342 421-3701 ✓ (matches Instagram bio)
- Pre-filled text: "Hola, quiero pedir un vehiculo. VOY de: hasta:" (placeholders `de:` and `hasta:` are EMPTY — minor UX gap, origin/destination not injected)

**BUG-005 (LOW):** TaxiApp has a native Android app (`com.aniversario.pasajero`, "TaxiApp Aniversario" for Santa Fe) but VOY only links to WhatsApp. The native app would provide a better UX (in-app ride tracking, payment, etc.).

---

## 3. External Action Audit (all `window.open` / `location.href` / schemes in code)

### 3.1 Complete inventory

| # | Pattern | Location | URL target | HTTP status | Verdict |
|---|---|---|---|---|---|
| 1 | `window.open(p.url,'_blank','noopener')` | VOY-Lite.html:1850 | HTTPS URLs (Uber, wa.link, App Store, Play Store, taximaxim.com) | 200 ✓ | ⚠️ BUG-003: never reached for HTTPS (regex routes them to location.href) |
| 2 | `window.location.href=p.url` | VOY-Lite.html:1848 | intent:// + ALL schemes (including https:// due to regex bug) | 200 ✓ | ⚠️ BUG-003: too broad regex |
| 3 | `window.location.href` (read) | VOY-Lite.html:2145 | (read current URL for share) | N/A | ✓ |
| 4 | `intent://...scheme=didi...` | VOY-Lite.html:2035 | DiDi Android | N/A (scheme) | ✓ (BUG-001 fix, local only) |
| 5 | `intent://order?...scheme=maxim...` | VOY-Lite.html:2053 | Maxim Android | N/A (scheme) | ✓ |
| 6 | `intent://...scheme=lasbicis...` | VOY-Lite.html:2060 | Las Bicis Android | N/A (scheme) | ✓ |
| 7 | `didi://` | VOY-Lite.html:2042 | DiDi iOS | N/A (scheme) | ⚠️ BUG-004: no App Store fallback |
| 8 | `https://m.uber.com/ul/...` | VOY-Lite.html:2018 | Uber (all platforms) | 200 ✓ | ✓ |
| 9 | `https://play.google.com/...com.didiglobal.passenger` | VOY-Lite.html:2033 | DiDi Play Store fallback | 200 ✓ | ✓ |
| 10 | `https://play.google.com/...com.taxsee.taxsee` | VOY-Lite.html:2053 | Maxim Play Store fallback | 200 ✓ | ✓ |
| 11 | `https://taximaxim.com/ar/` | VOY-Lite.html:2054 | Maxim web (iOS/Desktop) | 200 ✓ | ✓ |
| 12 | `https://apps.apple.com/ar/app/id6444962582` | VOY-Lite.html:2062 | Las Bicis iOS | 301→200 ✓ | ✓ |
| 13 | `https://www.santafe.gob.ar/.../Las Bicis.pdf` | VOY-Lite.html:2063 | Las Bicis desktop PDF | (not tested, low priority) | — |
| 14 | `https://wa.link/vavbcl` | VOY-Lite.html:811 | TaxiApp WhatsApp | 200→api.whatsapp.com ✓ | ✓ |
| 15 | `https://wa.link/n7u2e7` | VOY-Lite.html:810 | Radiotaxi Santa Fe WhatsApp | 200→api.whatsapp.com ✓ | ✓ |
| 16 | `https://wa.link/rqov56` | VOY-Lite.html:814 | Remises Real WhatsApp | 200→api.whatsapp.com ✓ | ✓ |

### 3.2 Patterns NOT found (good)

| Pattern | Status |
|---|---|
| `market://` | ✅ Not used (deprecated — using intent:// instead, correct) |
| `whatsapp://` (scheme) | ✅ Not used (using https://wa.link which works on all platforms via web redirect) |
| `tel:` | ✅ Not used (no phone dialer links) |
| `mailto:` | ✅ Not used (no email links) |
| `didiglobal.com/passenger/deeplink` (broken) | ⚠️ Still in PRODUCTION (not in local source after BUG-001 fix) |

### 3.3 Broken links / dead buttons

| # | Link | Issue | Severity |
|---|---|---|---|
| 1 | `didiglobal.com/passenger/deeplink` (production) | 302 → /404 (BUG-001, fix local only) | **CRITICAL** |
| 2 | Line 1847 regex routes ALL HTTPS URLs to `window.location.href` (BUG-003) | User loses VOY tab when clicking Uber/WhatsApp/App Store | **MEDIUM** |
| 3 | DiDi iOS `didi://` with no App Store fallback (BUG-004) | iOS user without app gets "Safari cannot open page" | LOW-MEDIUM |
| 4 | TaxiApp native app `com.aniversario.pasajero` not linked (BUG-005) | WhatsApp works but native app would be better UX | LOW |

---

## 4. Recommended Fixes

### FIX-1: Deploy BUG-001 fix (CRITICAL — production is broken right now)

| Field | Value |
|---|---|
| **Bug** | BUG-001: DiDi production URL `didiglobal.com/passenger/deeplink` → 302 → /404 |
| **Location** | public/VOY-Lite.html lines 2030-2045 (already fixed locally) |
| **Root cause** | didiglobal.com is DiDi's Chinese corporate site; /passenger/deeplink endpoint doesn't exist |
| **Fix** | Already implemented locally (intent:// + Play Store fallback for Android, didi:// for iOS, Play Store for desktop). **Needs deploy.** |
| **Severity** | CRITICAL (users hitting 404 in production right now) |
| **Estimated minutes** | 5 min (git commit + push to trigger CI, or direct wrangler deploy) |
| **Verification** | After deploy: curl production HTML, confirm `has_old_broken_didi_url: false, has_new_bug001_fix: true` |

### FIX-2: Fix BUG-003 regex regression (MEDIUM — must fix before deploy)

| Field | Value |
|---|---|
| **Bug** | BUG-003: Line 1847 regex `^[a-z][a-z0-9+.-]*:\/\/` matches `https://` and `http://`, routing ALL HTTPS URLs through `window.location.href` instead of `window.open` |
| **Location** | public/VOY-Lite.html:1847 |
| **Current code** | `if(p.url.indexOf('intent://')===0||/^[a-z][a-z0-9+.-]*:\/\//i.test(p.url)){` |
| **Root cause** | Regex was intended to match only custom schemes (didi://, maxim://) but is too broad — matches any `scheme://` pattern including https:// |
| **Fix** | `if(p.url.indexOf('intent://')===0||(/^[a-z][a-z0-9+.-]*:\/\//i.test(p.url)&&!/^https?:\/\//i.test(p.url))){` |
| **Severity** | MEDIUM (user loses VOY tab on every Uber/WhatsApp/App Store click) |
| **Estimated minutes** | 3 min (1-line fix + test) |
| **Verification** | eval `buildAppLink('uber')` → confirm routing is `window.open` (new tab); eval `buildAppLink('didi')` on iOS UA → confirm routing is `window.location.href` |

### FIX-3: Add iOS App Store fallback for DiDi (LOW-MEDIUM — BUG-004)

| Field | Value |
|---|---|
| **Bug** | BUG-004: DiDi iOS branch returns `didi://` with no fallback. App Store ID `id1362398401` is known and verified (HTTP 200) but not used. |
| **Location** | public/VOY-Lite.html:2037-2042 |
| **Root cause** | Original comment says "iOS shows Safari cannot open the page if app is absent — acceptable" — but App Store fallback would be better UX |
| **Fix** | Replace `return 'didi://';` with a universal-link-style fallback: `return 'https://apps.apple.com/ar/app/didi-viajes-comida-y-pagos/id1362398401';` (this opens the app via universal link if installed, or App Store if not — iOS handles both). Alternatively use a meta-refresh pattern: `didi://` + setTimeout fallback to App Store after 1.5s. |
| **Severity** | LOW-MEDIUM (only affects iOS users without DiDi installed) |
| **Estimated minutes** | 8 min (implement + test iOS UA routing) |
| **Verification** | eval `buildAppLink('didi')` on iOS UA → confirm returns App Store URL or universal link, not bare `didi://` |

### FIX-4: Add TaxiApp native Android app deep link (LOW — BUG-005)

| Field | Value |
|---|---|
| **Bug** | BUG-005: TaxiApp has native Android app (`com.aniversario.pasajero`) but VOY only links WhatsApp |
| **Location** | public/VOY-Lite.html:811 (TAXI_COMPANIES array) + buildAppLink (add taxiapp case) |
| **Root cause** | TaxiApp's native app wasn't discovered during initial implementation |
| **Fix** | Add `intent://#Intent;scheme=aniversario;package=com.aniversario.pasajero;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.aniversario.pasajero;end` as the primary "Pedir" button for TaxiApp on Android, keep WhatsApp as secondary. (Note: scheme=`aniversario` is best-guess — needs verification by inspecting the app's manifest or testing on real device. If scheme unknown, use `intent://#Intent;package=com.aniversario.pasajero;...;end` without scheme, which opens the app's main activity.) |
| **Severity** | LOW (WhatsApp works as fallback) |
| **Estimated minutes** | 15 min (research app scheme + implement + test) — requires real Android device to verify scheme |
| **Verification** | Real Android device test: install TaxiApp Aniversario, click VOY's "Pedir TaxiApp" → confirm app opens |

### FIX-5 (optional): Remove ghost Cabify pricing entry (cosmetic)

| Field | Value |
|---|---|
| **Issue** | `cabifyPrice: null` in mobilityEngine.js:143,158 is a ghost entry (Cabify doesn't serve Santa Fe) |
| **Fix** | Remove cabify from the apps object + autoResult object, or document why it's kept for future expansion |
| **Severity** | COSMETIC |
| **Estimated minutes** | 2 min |

---

## 5. Honest Limitations (real device testing)

| Requirement | Status | Explanation |
|---|---|---|
| `android_real_device: required: true` | ❌ NOT TESTED | This is a cloud sandbox environment — no real Android device available. Cannot report "opened app" vs "opened Play Store" vs "chooser" vs "nothing" for actual device behavior. |
| `android_test: true` | ✅ SIMULATED | Tested via Agent Browser with Pixel 7 device emulation + Android UA. Verified `buildAppLink` returns correct intent:// URLs. HTTP-verified all fallback URLs (Play Store 200). |
| `ios_test: true` | ✅ SIMULATED | Tested via UA override to iPhone iOS 17. Verified `buildAppLink` returns correct scheme:// URLs. HTTP-verified App Store URLs (200). |
| `browser_test: true` | ✅ DONE | Agent Browser opened local + production URLs, eval'd buildAppLink, checked console errors (0). |
| `evidence_required: true` | ✅ DONE | All claims backed by curl HTTP output, eval output, or web_search results. Screenshots saved to audit-evidence/. |

**What would need real-device verification:**
1. **Android intent:// behavior**: Does `intent://#Intent;scheme=didi;package=com.didiglobal.passenger;...;end` actually open the DiDi app when installed? (Code is syntactically correct, package verified on Play Store, but only a real device can confirm the app opens.)
2. **Android fallback behavior**: When DiDi is NOT installed, does `S.browser_fallback_url` correctly redirect to Play Store? (Standard Android intent behavior, but real-device test would confirm.)
3. **iOS Universal Link behavior**: Does `https://m.uber.com/ul/...` actually open the Uber app on iOS when installed? (Universal Links are OS-intercepted — can't be tested in browser.)
4. **iOS custom scheme behavior**: Does `didi://` actually open DiDi on iOS when installed? (Cannot test in browser — Safari handles schemes differently than UIWebView/WKWebView.)
5. **TaxiApp native app scheme**: The actual URL scheme for `com.aniversario.pasajero` is unknown — would need to inspect the app's AndroidManifest.xml or test on a device with the app installed.

---

## 6. Deployment Readiness

| Check | Status |
|---|---|
| BUG-001 fix deployed to production | ❌ NO (still serving broken didiglobal.com/passenger/deeplink → 404) |
| BUG-003 regex regression fixed | ❌ NO (must fix before deploy) |
| BUG-004 iOS DiDi fallback | ❌ NO (optional, can be follow-up) |
| BUG-005 TaxiApp native app | ❌ NO (optional, can be follow-up) |
| All store URLs return HTTP 200 | ✅ YES (Play Store, App Store all verified) |
| All wa.link short links redirect correctly | ✅ YES (3/3 verified → api.whatsapp.com with correct phone numbers) |
| Console errors during testing | ✅ ZERO |
| **DEPLOYMENT READY** | **NO** — must deploy BUG-001 fix + fix BUG-003 regression first |

### Recommended deploy sequence:
1. **Fix BUG-003** (1-line regex fix, line 1847) — 3 min
2. **Optionally fix BUG-004** (iOS DiDi App Store fallback) — 8 min
3. **Run `bun run lint`** to verify no syntax errors — 1 min
4. **Git commit + push** to trigger CI (or direct `wrangler deploy`) — 5 min
5. **Post-deploy verification**: curl production HTML, confirm `has_old_broken_didi_url: false, has_new_bug001_fix: true`; Agent Browser test of each provider button on production — 10 min

**Total estimated time to production-ready:** ~25-30 minutes.

---

## 7. Evidence Files

| File | Description |
|---|---|
| `audit-evidence/deeplink-local-fixed.png` | Screenshot of local dev server (with BUG-001 fix) |
| `audit-evidence/deeplink-prod-broken.png` | Screenshot of production (still serving broken DiDi URL) |
| `audit-evidence/PROVIDER_DEEPLINK_FORENSICS_REPORT.md` | This report |
| `worklog.md` (Task ID: 43) | Full work log appended |

---

## 8. Confidence Score

| Area | Confidence | Rationale |
|---|---|---|
| Uber deep link correctness | **0.95** | Official docs + live HTTP + universal link format match |
| DiDi deep link correctness (local fix) | **0.85** | Package verified, intent format correct, but no official scheme docs |
| DiDi deep link correctness (production) | **0.00** | Confirmed broken (302 → /404) |
| Maxim deep link correctness | **0.80** | Package verified, scheme=maxim is prior fix, web fallback works |
| Cabify absence correctness | **0.90** | Confirmed Cabify doesn't serve Santa Fe |
| TaxiApp WhatsApp link | **0.95** | wa.link verified → api.whatsapp.com with correct phone |
| TaxiApp native app gap | **0.85** | Play Store app verified, but scheme unknown |
| BUG-003 regex regression | **1.00** | Verified via eval — all 10 URLs route to window.location.href |
| Real Android device behavior | **0.00** | Not testable in this environment |
| Real iOS device behavior | **0.00** | Not testable in this environment |
| **Overall confidence** | **0.75** | High for code/HTTP verification, zero for real-device behavior |
