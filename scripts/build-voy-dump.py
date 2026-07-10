#!/usr/bin/env python3
"""
Build /home/z/my-project/VOY-PROJECT-CODE.md
Single-file comprehensive code dump for AI review (Gemini / GPT).

Reads each source file as raw text and embeds COMPLETE content between
markdown code fences. No line is omitted. The HTML file is split into 3
sections (head+CSS / body / inline-JS) per the task spec.
"""
import os
import sys
from datetime import datetime

ROOT = "/home/z/my-project"
OUT = os.path.join(ROOT, "VOY-PROJECT-CODE.md")

HTML = os.path.join(ROOT, "public", "VOY-Lite.html")
WORKER = os.path.join(ROOT, "worker.js")
WRANGLER = os.path.join(ROOT, "wrangler.jsonc")
CORE = os.path.join(ROOT, "public", "core")

CORE_FILES = [
    ("mobilityEngine.js", "javascript"),
    ("pricingEngine.js", "javascript"),
    ("eventBus.js", "javascript"),
    ("telemetry.js", "javascript"),
    ("trend.js", "javascript"),
    ("favorites.js", "javascript"),
    ("ahorro.js", "javascript"),
    ("feedback.js", "javascript"),
]


def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def linecount(text):
    return text.count("\n") + (0 if text.endswith("\n") else 1)


# ---- Read all source files ----
html_raw = read(HTML)
worker_raw = read(WORKER)
wrangler_raw = read(WRANGLER)
core_raw = [(name, read(os.path.join(CORE, name))) for name, _ in CORE_FILES]

# ---- Split HTML into 3 sections ----
# Markers (verified via grep):
#   line 61:  <style>
#   line 1155: </style>
#   line 1156: </head>
#   line 1157: <body data-theme="light">
#   line 1270: <script>            (inline JS start)
#   line 3226: </script>
#   line 3227: </body>
html_lines = html_raw.split("\n")
# Note: html_lines is 0-indexed; line N in editor = index N-1
# Section 1: head + CSS = lines 1..1156 (index 0..1155) — includes <!DOCTYPE>, <head>, <style>...</style>, </head>
sec1 = "\n".join(html_lines[0:1156])   # up to and including line 1156 (</head>)
# Section 2: body HTML = lines 1157..1270 (index 1156..1269) — <body> through external <script src> tags + the inline <script> opening tag
sec2 = "\n".join(html_lines[1156:1270])  # lines 1157..1270 (includes <script> at 1270)
# Section 3: inline JS = lines 1271..3225 (index 1270..3224) — JS content INSIDE <script>...</script> (excludes the tag pair)
sec3 = "\n".join(html_lines[1270:3225])  # lines 1271..3225
# Section 2b: closing tags = lines 3226..3228 (</script>, </body>, </html>) — tiny HTML block after the JS
sec2b = "\n".join(html_lines[3225:3228])  # lines 3226..3228

# ---- Build markdown ----
parts = []

# ---- Header / overview ----
parts.append("""# VOY — Project Code Dump (V7.18.2)

> Single-file reference for AI code review. Generated 2026-06-25.
> Production: https://voy-app.simondalmasso44.workers.dev
> GitHub: https://github.com/simonkey888/VOY
> Current version: V7.18.2 (UI) / V7.8.0 (worker)

## Project Overview

**VOY** is a zero-install, mobile-first web app for urban mobility comparison in
Santa Fe, Argentina. The user enters a destination; VOY estimates prices and ETAs
across **ride-hailing apps** (Uber, DiDi, Maxim, Cabify), **taxi / remis**
(radio-taxi companies), and **public transit** (colectivo / bus with SUBE card),
then deep-links the user's chosen provider. The product thesis is *one URL, every
provider, no app install* — a comparison layer that lives between the user's
intent ("go to X") and the siloed provider apps.

**Architecture.** The frontend is a single HTML page (`public/VOY-Lite.html`,
~3229 lines) that ships with an inline `<style>` block (V7.18.2 "Corporate
Minimal" design system, ~1095 lines of CSS) and an inline `<script>` block
(~1957 lines of vanilla JS — no framework, no build step). The page loads
MapLibre GL JS 4.7.1 from unpkg for the ambient full-bleed map, and four
`core/*.js` modules (`mobilityEngine`, `pricingEngine`, `eventBus`,
`telemetry`, `trend`, `favorites`, `ahorro`, `feedback`) for pure computation,
analytics, persistence, and feature services. A separate `ui/mobilityController.js`
(not included in this dump) acts as the controller layer; the inline script in
`VOY-Lite.html` is the view + controller glue for the Lite build.

**Backend.** A single Cloudflare Worker (`worker.js`, 401 lines) serves the
static assets from `public/`, rewrites `/` → `/VOY-Lite.html`, hides the internal
path (`/VOY-Lite.html` → 301 → `/`), ingests analytics events at `/api/events`
and telemetry beacons at `/api/telemetry` into Cloudflare Analytics Engine
(binding `VOY_METRICS`), exposes `/api/health` + `/api/whoami`, and runs a weekly
cron (Mon 06:00 UTC) as a tariff-review reminder. HTML is served with
`Cache-Control: no-store` so the edge never serves a stale UI; a `voy_sid`
cookie provides anonymous sessionID for retention analytics. Build hash is
injected at deploy time by `scripts/inject-build-hash.mjs` (replaces
`__BUILD_HASH__` placeholders in both `worker.js` and `VOY-Lite.html`).

**Privacy posture.** Anonymous-ID only (no PII, no accounts). Geo is coarsened
to ~500m grid clusters before transport. Owner / dev / bot / headless / GLM-agent
exclusion filters (configurable via `wrangler.jsonc` vars) keep test traffic out
of the analytics dataset. The `/api/whoami` endpoint lets the owner self-detect
their IP / SHA-256 hash to populate `VOY_OWNER_IPS` / `VOY_OWNER_IP_HASHES`.

## File Map

| # | File | LOC | Role |
|---|---|---|---|
| 1 | `public/VOY-Lite.html` — `<head>` + `<style>` | 1156 | Meta, resource hints, manifest, COMPLETE CSS design system (V7.18.2 Corporate Minimal) |
| 2 | `public/VOY-Lite.html` — `<body>` | 113 | Semantic HTML structure: splash, map, search bar, origin pill, mode selector, decision sheet, dialog, footer |
| 3 | `public/VOY-Lite.html` — inline `<script>` | 1956 | Main app JS: map init, search, estimation, rendering, deep-link routing, analytics, category manager |
| 4 | `worker.js` | 401 | Cloudflare Worker: routing, /api/events, /api/telemetry, /api/health, /api/whoami, sessionID cookie, cron |
| 5 | `public/core/mobilityEngine.js` | 442 | PURE mobility computation: haversine, fare calc, estimateAuto/estimateBus, rankProviders, searchLocal |
| 6 | `public/core/pricingEngine.js` | 248 | PURE pricing v2: surge multipliers (time/weather/demand), Bayesian fare confidence, fare range |
| 7 | `public/core/eventBus.js` | 217 | Event bus + batched transport to /api/events (sendBeacon + fetch keepalive), local localStorage fallback |
| 8 | `public/core/telemetry.js` | 252 | VoyHealthMonitor (LCP + JS errors + promise rejections → /api/telemetry) + VoyDebugPanel (konami / 7-tap) |
| 9 | `public/core/trend.js` | 245 | VoyHistoryDB (IndexedDB, 30d retention) + VoyTrendEngine (SMA deviation → STABLE/RISING/FALLING badges) |
| 10 | `public/core/favorites.js` | 192 | VoyFavoritesService — frequent destinations (LocalStorage primary + IDB mirror), recency sort |
| 11 | `public/core/ahorro.js` | 84 | VoyAhorroService — colectivo-vs-ridehailing savings observer + idempotent badge renderer |
| 12 | `public/core/feedback.js` | 89 | VoyFeedbackService — in-flow price-accuracy flagging via sendBeacon → /api/telemetry |
| 13 | `wrangler.jsonc` | 87 | Cloudflare Workers config: name, assets binding, VOY_METRICS analytics engine, exclusion-filter vars, cron |

## Known Issues (active)

- **UF-01: black_squares** — FIXED in V7.18.2. 11 UI selectors (modePill, searchBar, originPill, …) now use `rgba(0,0,0,0.78)` + `backdrop-filter:blur(16px) saturate(1.2)` instead of opaque `#000000`. VLM-verified in production.
- **UF-02: didi_button no prefill** — PARTIALLY FIXED in V7.18.2. DiDi's deep-link doesn't accept a destination, so the confirm handler now copies the destination address to `navigator.clipboard` *before* `launchDeepLink`, with a toast prompting the user to paste. Workaround, not a true prefill.
- **UF-03: css_specificity_debt** — ACTIVE. ~153 `!important` declarations across the CSS (grep count). Mostly from V7.14 hardened mode-pill overrides. Technical debt; needs a refactor pass.
- **UF-04: dead code L687 `.mp-lbl` 11px** — ACTIVE. Orphaned selector, no matching DOM element. Safe to delete.
- **UF-05: launchDeepLink 1500ms race condition** — ACTIVE. `launchDeepLink()` uses a 1500ms fallback timer that can fire after the user has navigated away from the dialog, causing a double-launch or a launch-after-cancel. Needs a cancellation token.
- **UF-06: dev-only /api/events 404** — Local dev (`wrangler dev` without `--local`) sometimes 404s `/api/events` because the WAE binding is missing. Production is fine. Workaround: `wrangler dev --local`.
- **UF-07: map timeout false positive** — The 8s map-init timeout fires a "map failed" toast even when the map eventually loads (e.g. on slow 3G). Needs a success-clears-timeout guard.
- **UF-08: LCP variability 268ms-10s** — LCP ranges from 268ms (cached, fast 3G) to 10s (cold, slow 3G). The 10s tail is the map tile load blocking LCP. Candidate fix: `content-visibility: auto` on the map container, or a skeleton.
- **UF-09: hero default didi mismatch** — FIXED in V7.18.2 → `uber`. The hero CTA default was `didi` (worst deep-link support); now `uber` (best universal-link support). DiDi appears as hero only when the recommendation engine explicitly ranks it #1.

---

""")

# ---- Section 1: HTML head + CSS ----
parts.append("## 1. `public/VOY-Lite.html` — `<head>` + `<style>` (CSS)\n\n")
parts.append("The document head: `<!DOCTYPE>`, meta tags (viewport, theme-color, "
             "voy-version, voy-build), title, resource hints (preconnect to unpkg / "
             "cartocdn / OSM / OSRM), MapLibre GL JS 4.7.1 stylesheet + script (with "
             "integrity hashes), external core-module script tags, then the COMPLETE "
             "inline `<style>` block (V7.18.2 Corporate Minimal design system, ~1095 "
             "lines). Every line below is verbatim from the source file.\n\n")
parts.append("```html\n")
parts.append(sec1)
parts.append("\n```\n\n")

# ---- Section 2: HTML body ----
parts.append("## 2. `public/VOY-Lite.html` — `<body>` structure (HTML)\n\n")
parts.append("Semantic HTML body: splash screen, ambient full-bleed map (`#map`), "
             "map grid overlay, top scrim, floating search bar (`destInput` + map/locate/"
             "mic buttons + dropdown), origin pill, memory chips row, transport mode "
             "selector, decision sheet, map floating chip (FULL_MAP state), offline chip, "
             "footer + disclosure menu (share / support), deep-link confirmation dialog, "
             "toast container, analytics dashboard div, and the external core-module "
             "script tags (`ahorro.js`, `trend.js`, `telemetry.js`, `favorites.js`, "
             "`feedback.js`) loaded before the main inline script.\n\n")
parts.append("```html\n")
parts.append(sec2)
parts.append("\n```\n\n")

# ---- Section 3: inline JS ----
parts.append("## 3. `public/VOY-Lite.html` — inline `<script>` (JS)\n\n")
parts.append("The main inline JavaScript (~1957 lines, vanilla JS, no framework). "
             "Contains: version pin (`VOY_VERSION='V7.18.2'`, `VOY_BUILD_HASH`), SVG "
             "icon system, `BUS_STOPS` / `BIKE_STATIONS` / `LANDMARKS` / `FARE_REGISTRY` "
             "data tables, `MobilityController` (MC) object with GPS, map init "
             "(`initMap` + `attachContextLossHandlers`), search (Nominatim + local "
             "catalog), estimation pipeline (`runAllEstimations` → render), category "
             "manager (3 groups: Privados / Activos / Público), provider ranking, "
             "decision sheet rendering (`renderSheet`), deep-link routing "
             "(`buildAppLink` + `launchDeepLink`), confirmation dialog, analytics "
             "dashboard (5-tap), favorites wiring, feedback wiring, ahorro wiring, "
             "trend wiring, and DOMContentLoaded boot. Complete verbatim.\n\n")
parts.append("```javascript\n")
parts.append(sec3)
parts.append("\n```\n\n")

# ---- Section 3b: HTML closing tags (</script></body></html>) ----
parts.append("## 3b. `public/VOY-Lite.html` — closing tags\n\n")
parts.append("The closing `</script>`, `</body>`, and `</html>` tags that follow "
             "the inline JavaScript block. Included for completeness so that every "
             "line of the source file is represented in this dump.\n\n")
parts.append("```html\n")
parts.append(sec2b)
parts.append("\n```\n\n")

# ---- Section 4: worker.js ----
parts.append("## 4. `worker.js` — Cloudflare Worker backend\n\n")
parts.append("Single Cloudflare Worker (`voy-app`). Routing rules: hide "
             "`/VOY-Lite.html` → 301 → `/`; `/api/events` POST → 3 canonical events "
             "(`estimation` / `provider_tap` / `search`) → Cloudflare Analytics Engine "
             "via `ctx.waitUntil(env.VOY_METRICS.writeDataPoint(...))`; `/api/telemetry` "
             "POST → fire-and-forget beacon ingestion (LCP + JS errors); `/api/whoami` → "
             "owner self-detect IP + SHA-256; `/api/health` → version + build_hash + "
             "filter counts; `/` → internal rewrite to `/VOY-Lite.html` with "
             "`Cache-Control: no-store` + `Set-Cookie: voy_sid`. Exclusion filters: "
             "localhost, headless, bot, `GLM_*` UA, owner_ip, owner_ip_hash (SHA-256), "
             "dev_ip, custom UA regex patterns. Cron trigger Mon 06:00 UTC. "
             "Complete verbatim, 401 lines.\n\n")
parts.append("```javascript\n")
parts.append(worker_raw)
parts.append("\n```\n\n")

# ---- Sections 5-12: core modules ----
core_intros = {
    "mobilityEngine.js": (
        "## 5. `public/core/mobilityEngine.js`\n\n",
        "PURE mobility computation module (v2.0.0). No DOM, no fetch, no localStorage — "
        "fully deterministic and testable. Exposes: `haversine`, `formatPrice`, "
        "`formatMin`, `normalize`, `fuzzyScore`, `calcAppPrice`, `estimateTaxi`, "
        "`estimateAuto` (per-provider prices + times for Uber/DiDi/Maxim/Cabify/taxi/"
        "remis/TaxiApp), `estimateBus` (direct-route only, no fake fallback), "
        "`findNearestBikeStation`, `runAllEstimations` (orchestrator → sorted array), "
        "`rankProviders` (MOBILITY_CORE_RANKING_V1: 0.7×price + 0.3×time, normalized), "
        "`searchLocal`, `dedupResults`, `formatBusText`. Bike gated to ≤3km "
        "(`BIKE_MAX_DISTANCE_KM`). Complete verbatim, 442 lines.\n\n"
    ),
    "pricingEngine.js": (
        "## 6. `public/core/pricingEngine.js`\n\n",
        "PURE pricing v2 module (spec: `multi_variable_bayes_estimation`). Additive to "
        "MobilityEngine — legacy path remains source of truth when this is absent. "
        "Surge multipliers: `timeSurge` (night 1.1×, 2-5am dead zone 1.3×), "
        "`weatherSurge` (rain 1.15×, heavy 1.25×), `demandSurge` (event 1.2×, rush "
        "1.1×), combined via `surgeMultiplier` clamped to [1.0, 2.5]. Bayesian "
        "`fareConfidence` (prior × Gaussian likelihood over fare deviation, blended "
        "with distance/time factors, clamped 0.55-0.95). `fareRange` produces "
        "surge-aware low/high spread. `taxiTariff` returns active diurno/nocturno "
        "tariff. Complete verbatim, 248 lines.\n\n"
    ),
    "eventBus.js": (
        "## 7. `public/core/eventBus.js`\n\n",
        "Event bus + batched transport (V7.8, spec v1.4). Emits to 3 canonical events "
        "+ legacy names (worker normalizes). Three-layer delivery: (1) local_fallback "
        "— always persists to `localStorage` (`voy_events_v14`, max 500, guaranteeing "
        "no event is lost); (2) PostHog if `window.posthog` is present; (3) Cloudflare "
        "worker transport — batched flush every 15s (max 25/batch) via `sendBeacon` "
        "(survives page unload) with `fetch keepalive` fallback. Anonymous ID "
        "(`voy_anon_id`) generated once, persisted. Coarse geo cluster (~500m grid) — "
        "no raw lat/lon transported. Flushes on `pagehide` + `visibilitychange`. "
        "Complete verbatim, 217 lines.\n\n"
    ),
    "telemetry.js": (
        "## 8. `public/core/telemetry.js`\n\n",
        "Two globals. **VoyHealthMonitor**: vanilla-JS ErrorBoundary — captures LCP "
        "via `PerformanceObserver` (buffered:true), uncaught `error` (capture phase) "
        "and `unhandledrejection` events; sends to `/api/telemetry` via "
        "`navigator.sendBeacon` (fire-and-forget, throttled 5s per event-type). "
        "**VoyDebugPanel**: hidden diagnostic panel (FPS, Memory, Cache, SW, Latency, "
        "LCP, Trend, Ahorro). Trigger: konami code (↑↑↓↓←→←→BA) on desktop OR 7 taps "
        "on footer text on mobile (excludes the ·· button). Boots on DOMReady. "
        "Complete verbatim, 252 lines.\n\n"
    ),
    "trend.js": (
        "## 9. `public/core/trend.js`\n\n",
        "Two globals + one renderer. **VoyHistoryDB**: IndexedDB wrapper "
        "(`voy-history` / `estimates` store, schema `{timestamp, routeKey, "
        "origin_zone, destination_zone, price, mode}`, 30-day retention, async, "
        "with `queryByRouteSince` / `queryRecent` / `pruneOlderThan`). "
        "**VoyTrendEngine**: Simple Moving Average deviation over a 3-hour window "
        "(`WINDOW_MS=3h`, `MIN_DATAPOINTS=3` gate). States: STABLE "
        "(0.95≤ratio≤1.05) / RISING (>1.05) / FALLING (<0.95). `processEstimate` "
        "runs analyze-then-record per provider (sequential, avoids write-before-read "
        "race) with a generation counter so only the latest render paints badges. "
        "**renderTrendBadges()**: idempotent — mounts `price-trend-badge` next to every "
        "`[data-trend-provider]` element. Complete verbatim, 245 lines.\n\n"
    ),
    "favorites.js": (
        "## 10. `public/core/favorites.js`\n\n",
        "VoyFavoritesService (V7.9 Field_Ops_and_Persistent_Context). Persistence "
        "layer for frequent destinations — reduces Time-to-Search ('Casa' / 'Trabajo' "
        "to one tap). Storage: LocalStorage (`voy_favorites`) PRIMARY (fast sync read "
        "for UI) + MC.v5* IndexedDB mirror (best-effort, future cross-device). Schema: "
        "`{id, name, coords:{lat,lon}, full_address, label, ts, last_used}`. Sorted by "
        "`last_used` desc. Match threshold 0.001° (~111m). Max 20 favorites. One-time "
        "IDB→LS migration on first load. Public API: `getAll`, `isFavorite`, "
        "`findFavorite`, `add`, `remove`, `toggle`, `touch`, `refresh`. Complete "
        "verbatim, 192 lines.\n\n"
    ),
    "ahorro.js": (
        "## 11. `public/core/ahorro.js`\n\n",
        "VoyAhorroService (V7.5 Ahorro_Inteligente) + `renderAhorroBadges()`. "
        "Comparative cost engine: `isRecommendationAvailable = (PublicTransportPrice "
        "< RideHailingPrice * 0.5)`. Observer pattern — `recompute()` called from "
        "`renderSheet()` after each estimate; `_set()` emits to listeners + triggers "
        "idempotent `renderAhorroBadges()`. Badges: '¡Ahorrá un X%!' on every Colectivo "
        "mode-pill + highlight dot on the Ahorro cat-tab. `REFRESH_MS=300000` (5 min). "
        "Complete verbatim, 84 lines.\n\n"
    ),
    "feedback.js": (
        "## 12. `public/core/feedback.js`\n\n",
        "VoyFeedbackService (V7.9). In-flow price-accuracy reporting — flag icon on "
        "each provider price card (hero + alts + taxi/remis). Capture: "
        "`{routeKey, provider, price_shown, user_note, ts}`. Transport: `sendBeacon` "
        "→ `/api/telemetry` (event: `data_accuracy_issue`), non-blocking, "
        "fire-and-forget. Event delegation on `#decisionSheet` via `[data-fb-provider]` "
        "attribute. Visual feedback: 600ms `.fb-pulse` on the flag icon. Toast "
        "confirmation. Creates training dataset for future TrendEngine calibration. "
        "Complete verbatim, 89 lines.\n\n"
    ),
}

for fname, lang in CORE_FILES:
    intro, desc = core_intros[fname]
    parts.append(intro)
    parts.append(desc)
    parts.append("```" + lang + "\n")
    for name, content in core_raw:
        if name == fname:
            parts.append(content)
            break
    parts.append("\n```\n\n")

# ---- Section 13: wrangler.jsonc ----
parts.append("## 13. `wrangler.jsonc`\n\n")
parts.append("Cloudflare Workers config. `name: voy-app` (updates the EXISTING "
             "production worker at `voy-app.simondalmasso44.workers.dev`). "
             "`compatibility_date: 2026-01-01`, `main: ./worker.js`, `workers_dev: true` "
             "(required — is-a.dev CNAME resolves to the workers.dev URL). Assets "
             "binding `ASSETS` serves `./public` with `html_handling: none` + "
             "`not_found_handling: none` (no SPA fallback, no directory listing). "
             "Analytics Engine dataset `voy_metrics` bound as `VOY_METRICS` (WAE free "
             "tier: 100k data points/day). Vars block configures the 7 exclusion-filter "
             "knobs (`VOY_OWNER_IPS`, `VOY_OWNER_IP_HASHES`, `VOY_DEV_IPS`, "
             "`VOY_EXCLUDE_LOCALHOST/HEADLESS/BOT/GLM`, `VOY_EXCLUDE_UA_PATTERNS`). "
             "Observability enabled. Cron: `0 6 * * 1` (Mon 06:00 UTC). Complete "
             "verbatim, 87 lines.\n\n")
parts.append("```jsonc\n")
parts.append(wrangler_raw)
parts.append("\n```\n\n")

# ---- Appendix: version history ----
parts.append("""---

## Appendix: Version History (recent)

- **V7.16** — Forced `system-ui !important` typography (removed Inter dependency). Triple render path (fallback → Inter → system-ui) eliminated.
- **V7.17** — SURGICAL_FIX: removed Google Fonts Inter `<link>` (was the third render path). Added resource hints (`preconnect`) for unpkg / cartocdn / OSM / OSRM.
- **V7.18.0** — `WEBGL_CONTEXT_GUARD`: added `contain:strict` on `#map` + canvas cap. Caused map freeze on some devices (contain:strict isolated the map subtree's layout/paint and broke MapLibre's resize observer).
- **V7.18.1** — HOTFIX: removed `contain:strict` (reverted V7.18.0's containment). Null-guarded `map.getCanvas()` calls so a lost WebGL context doesn't throw. Deployed to production; build hash `3d08faf`.
- **V7.18.2** — SAKANA fixes (current): (1) `black_squares` — 11 UI selectors switched from opaque `#000000` to `rgba(0,0,0,0.78)` + `backdrop-filter:blur(16px) saturate(1.2)` (frosted glass); (2) `didi_clipboard` — DiDi confirm handler copies destination address to clipboard before `launchDeepLink` (workaround for DiDi's no-prefill deep-link); (3) `hero_default` — heroProvider default `didi` → `uber` (best deep-link app is now the fallback hero CTA). Deployed to production; build hash `e0a5366`.

## Appendix: Build / Deploy Notes

- **Build hash injection**: `scripts/inject-build-hash.mjs` replaces `__BUILD_HASH__` placeholders in both `worker.js` (line 36, `const BUILD_HASH`) and `public/VOY-Lite.html` (line 1278, `window.VOY_BUILD_HASH`) with the git short SHA at deploy time. CI runs this before `wrangler deploy`. The committed source retains `__BUILD_HASH__` so the placeholder is visible. `verify-production.sh` checks `/api/health.build_hash === git rev-parse --short HEAD`.
- **Two version constants**: `worker.js WORKER_VERSION="V7.8.0"` (API/worker version, bumped independently) and `public/VOY-Lite.html window.VOY_VERSION="V7.18.2"` (UI version). This is a pre-existing convention — the UI version moves faster than the worker version.
- **Cache strategy**: HTML served with `Cache-Control: no-store, max-age=0, must-revalidate` so the edge never serves a stale UI. Static assets (JS/CSS/icons) served with default caching. MapLibre GL JS loaded from unpkg with SRI integrity hash.
- **No build step**: The frontend is plain HTML/CSS/JS — no bundler, no transpiler, no framework. The `core/*.js` modules are loaded via `<script src>` tags in order. The inline `<script>` in `VOY-Lite.html` is the view+controller glue.
- **Analytics privacy**: Anonymous ID only (`voy_anon_id`), sessionID via `voy_sid` cookie (30-day, SameSite=Lax). Geo coarsened to ~500m grid before transport. Owner/dev/bot/headless/GLM-agent exclusion filters keep test traffic out of the dataset. No PII stored server-side.

## Appendix: Verification (run after generating this file)

```
wc -l /home/z/my-project/VOY-PROJECT-CODE.md
grep -c 'buildAppLink'        /home/z/my-project/VOY-PROJECT-CODE.md
grep -c 'launchDeepLink'      /home/z/my-project/VOY-PROJECT-CODE.md
grep -c 'VOY_VERSION'         /home/z/my-project/VOY-PROJECT-CODE.md
grep -c 'contain:strict'      /home/z/my-project/VOY-PROJECT-CODE.md
grep -c 'attachContextLossHandlers' /home/z/my-project/VOY-PROJECT-CODE.md
grep -c 'WORKER_VERSION'      /home/z/my-project/VOY-PROJECT-CODE.md
stat -c '%s bytes' /home/z/my-project/VOY-PROJECT-CODE.md
```
""")

# ---- Write output ----
output = "".join(parts)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(output)

# ---- Report ----
print(f"Wrote: {OUT}")
print(f"Total lines: {linecount(output)}")
print(f"Total bytes: {len(output.encode('utf-8'))}")
print()
print("Section line counts (content only, excl. fences):")
print(f"  Section 1 (head+CSS):  {linecount(sec1)} lines")
print(f"  Section 2 (body):      {linecount(sec2)} lines")
print(f"  Section 3 (inline JS): {linecount(sec3)} lines")
print(f"  Section 3b (closing):  {linecount(sec2b)} lines")
html_total = linecount(sec1) + linecount(sec2) + linecount(sec3) + linecount(sec2b)
print(f"  HTML total (1+2+3+3b): {html_total} lines (source file wc -l = 3228)")
print(f"  worker.js:             {linecount(worker_raw)} lines")
for name, content in core_raw:
    print(f"  core/{name:22s} {linecount(content)} lines")
print(f"  wrangler.jsonc:        {linecount(wrangler_raw)} lines")
