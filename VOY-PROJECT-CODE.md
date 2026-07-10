# VOY — Project Code Dump (V7.18.2)

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

## 1. `public/VOY-Lite.html` — `<head>` + `<style>` (CSS)

The document head: `<!DOCTYPE>`, meta tags (viewport, theme-color, voy-version, voy-build), title, resource hints (preconnect to unpkg / cartocdn / OSM / OSRM), MapLibre GL JS 4.7.1 stylesheet + script (with integrity hashes), external core-module script tags, then the COMPLETE inline `<style>` block (V7.18.2 Corporate Minimal design system, ~1095 lines). Every line below is verbatim from the source file.

```html
<!--
VOY V7.8.0 — Single source of truth (atomic deploy + cache bust + version pin)
Build: 2026 VOY_V7_CLEAN_DEPLOY
Architecture: floating_search + ambient_interactive_map + bottom_decision_sheet + transport_mode_selector
Engine: core/mobilityEngine.js (UNTOUCHED — pure functions)
Controller: ui/mobilityController.js (V5 extensions: IndexedDB AES-GCM + inference + fare confidence)
V7 deploy fixes:
  - HARD VERSION PIN: <meta name="voy-version" content="V7.8.0"> + window.VOY_BUILD_HASH
  - V7.2 UI patches: ButtonRouterFix (DiDi universal link + Maxim scheme=maxim), SheetCompression (38vh cap + internal scroll), MapAlwaysVisible (portrait fitBounds), DestinationInstantFeedback (1-char trigger)
  - V7.3 VOY_PROVIDER_ROUTER_V1: confirmation dialog split into message_short + message_extended per spec; provider-appropriate icon (car/taxi/whatsapp) now shown in dialog; all 5 providers verified (Uber universal link, DiDi deeplink exact coords, Maxim intent first via window.location.href not window.open, Taxi/Remis company accordions with WhatsApp CTA, confirmation gate before leaving VOY)
  - V7.4 CATEGORY_MANAGER + MAP_STATE_MANAGER: 3 semantic groups (Privados/Activos/Público) with horizontal swipe + slide-fade animation; 3-state map machine (SEARCH_FOCUS/ROUTE_PREVIEW/FULL_MAP) with floating chip; VoyMapContext observer (decoupled from rendering); hardware-accelerated transforms (translateY, never height); rollback via window.VOY_CATEGORY_MANAGER_ENABLED=false
  - worker.js: Cache-Control: no-store on HTML (edge never serves stale UI)
  - SINGLE ENTRYPOINT: ONLY / serves UI (/VOY-Lite.html → 301 → /)
  - Mode selector force-rendered on initial mount
  - Script cache versions bumped to ?v=9 (V7)
Constraints honored:
  - mobilityEngine.js NOT modified
  - Single page application, mobile-first, 60fps target
  - No emojis (SVG icon system only)
  - Map opacity 1, blur 0, native gestures, never dimmed after search
  - IndexedDB encrypted memory, user can erase everything
  - Deep-link confirmation dialog before opening external apps
  - 48px min touch targets, spring animations, reduced-motion support
-->
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,viewport-fit=cover">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<meta name="description" content="VOY — Asistente de movilidad urbana para Santa Fe. Compará Uber, DiDi, Maxim, taxi, remis y colectivo en un solo lugar.">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="VOY">
<meta name="mobile-web-app-capable" content="yes">
<meta name="voy-version" content="V7.8.0">
<meta name="voy-build" content="__BUILD_HASH__">
<title>VOY — Movilidad Santa Fe</title>
<!-- V7.7 PERFORMANCE_AUDIT_AND_TELEMETRY — Resource Hinting: preconnect to third-party API/tile origins
     so DNS+TCP+TLS completes before the first map tile / geocode / route request fires. -->
<link rel="preconnect" href="https://unpkg.com" crossorigin>
<link rel="preconnect" href="https://basemaps.cartocdn.com">
<link rel="preconnect" href="https://tile.openstreetmap.org">
<link rel="preconnect" href="https://nominatim.openstreetmap.org">
<link rel="preconnect" href="https://router.project-osrm.org">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" integrity="sha384-MinO0mNliZ3vwppuPOUnGa+iq619pfMhLVUXfC4LHwSCvF9H+6P/KO4Q7qBOYV5V" crossorigin="anonymous">
<!-- V7.17 SURGICAL_FIX: Google Fonts Inter <link> REMOVED (was causing triple render path: fallback→Inter→system-ui). V7.16 already forces system-ui!important. -->
<link rel="icon" href="/icons/app-icon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-180.png">
<link rel="apple-touch-icon" sizes="167x167" href="/icons/apple-touch-167.png">
<link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-152.png">
<link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-touch-120.png">
<link rel="apple-touch-icon" sizes="1024x1024" href="/icons/apple-touch-1024.png">
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js" integrity="sha384-SYKAG6cglRMN0RVvhNeBY0r3FYKNOJtznwA0v7B5Vp9tr31xAHsZC0DqkQ/pZDmj" crossorigin="anonymous"></script>
<script src="core/mobilityEngine.js?v=10"></script>
<script src="core/pricingEngine.js?v=10"></script>
<script src="core/eventBus.js?v=10"></script>
<script src="ui/mobilityController.js?v=10"></script>
<style>
/* ============================================================
   VOY V7.8.0 — CORPORATE MINIMAL (Uber Design Systems 2026)
   Brand: #FFFFFF / #0B0B0B / #000000 (light) · #000 / #F5F5F5 / #FFF (dark)
   Typography: Inter
   No shadows — borders + spacing only
   Map: ambient full-bleed, opacity 1, native gestures
   Search: floating centered persistent
   Sheet: bottom spring slide-up
   Icons: SVG only (no emojis)
   ============================================================ */
:root{
  --bg:#FFFFFF;--surface:#FFFFFF;--surface2:#F5F5F5;--bg3:#F5F5F5;
  --text:#0B0B0B;--text2:#6B6B6B;--text3:#9B9B9B;
  --accent:#000000;--primary:#007AFF;--success:#34C759;--red:#FF3B30;--orange:#FF9500;--yellow:#FFCC00;
  --border:rgba(0,0,0,0.08);--border-subtle:rgba(0,0,0,0.05);--border-strong:rgba(0,0,0,0.12);
  --sp-1:4px;--sp-2:8px;--sp-3:12px;--sp-4:16px;--sp-5:20px;--sp-6:32px;
  --radius-card:20px;--radius-button:14px;--radius-input:14px;--radius-sm:10px;--radius-xs:8px;
  --font-display:30px;--font-title:17px;--font-body:15px;--font-caption:13px;--font-micro:11px;
  --fw-display:800;--fw-title:700;--fw-body:500;--fw-bold:600;
  --header-bg:rgba(255,255,255,0.92);
  --footer-bg:rgba(255,255,255,0.96);
  /* V7.3 BLACK_BOX_FIX: scrim softened further (0.60→0.25, 0.30→0.08). Task 11
     softened from 0.92→0.60, but users still reported a visible white rectangle
     behind the search bar. 0.25 is subtle enough to blend with the map while
     still helping label legibility at the very top. The search bar has its own
     solid #0F0F0F background + box-shadow, so it doesn't depend on the scrim. */
  --top-scrim:linear-gradient(180deg,rgba(255,255,255,0.25) 0%,rgba(255,255,255,0.08) 60%,rgba(255,255,255,0) 100%);
  /* UX_CORE_REDESIGN — floating_input_v2: dark focal pill (FOCUS_SINGLE_ACTION_DESTINATION).
     Spec bg #0F0F0F honored in light theme; lifted to #1A1A1A in dark theme for legibility
     (on pure-black --bg, #0F0F0F would be near-invisible). Intent (dark focal pill) preserved. */
  --fi-bg:#0F0F0F;--fi-text:#FFFFFF;--fi-sub:rgba(255,255,255,0.55);--fi-border:rgba(255,255,255,0.08);--fi-hover:rgba(255,255,255,0.06);
  --ease-spring:320ms cubic-bezier(0.22,1.2,0.36,1);
  --ease-out:200ms cubic-bezier(0.22,0.61,0.36,1);
  --ease-sheet:380ms cubic-bezier(0.22,1.1,0.36,1);
}
[data-theme="dark"]{
  --bg:#000000;--surface:#0A0A0A;--surface2:#1A1A1A;--bg3:#1A1A1A;
  --text:#F5F5F5;--text2:#999999;--text3:#666666;
  --accent:#FFFFFF;--primary:#0A84FF;--success:#30D158;--red:#FF453A;--orange:#FF9F0A;
  --border:rgba(255,255,255,0.10);--border-subtle:rgba(255,255,255,0.06);--border-strong:rgba(255,255,255,0.15);
  --header-bg:rgba(0,0,0,0.92);--footer-bg:rgba(0,0,0,0.96);
  /* V7.3 BLACK_BOX_FIX: dark-theme scrim softened further (0.45→0.18, 0.20→0.06).
     Task 11 softened from 0.92→0.45, but users still reported a visible "black
     box" behind the search bar. 0.18 is subtle enough to blend with the map
     while still improving label legibility at the very top. The search bar
     has its own solid #1A1A1A background + box-shadow, so it's fully legible
     without relying on the scrim. */
  --top-scrim:linear-gradient(180deg,rgba(0,0,0,0.18) 0%,rgba(0,0,0,0.06) 60%,rgba(0,0,0,0) 100%);
  --fi-bg:#1A1A1A;--fi-text:#FFFFFF;--fi-sub:rgba(255,255,255,0.50);--fi-border:rgba(255,255,255,0.10);--fi-hover:rgba(255,255,255,0.08);
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;height:100%}
body{
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Helvetica Neue',Helvetica,Arial,'Segoe UI',Roboto,sans-serif;
  background:var(--bg);color:var(--text);font-size:var(--font-body);
  min-height:100dvh;display:flex;flex-direction:column;
  -webkit-tap-highlight-color:transparent;letter-spacing:-0.01em;
  overflow-x:hidden;
}
button{font-family:inherit;letter-spacing:inherit}
:focus-visible{outline:2px solid var(--primary);outline-offset:2px;border-radius:4px}

/* === AMBIENT MAP (V7.14 HARDENED: z-0) — full-bleed, capa 0 absoluta ============
   V7.14: z-index 1→0 (blueprint spec: map_layer=0). El mapa es la capa base.
   Todo UI arriba tiene z-index:10. No hay z-index intermedios. ====================== */
#map{
  position:fixed;inset:0;z-index:0!important;width:100%;height:100%;
  max-height:100vh;max-height:100dvh; /* V7.18: hard cap — prevents GPU-killing 2399px canvas */
  opacity:1;filter:none;background:transparent!important;
  will-change:transform; /* V7.18: force GPU layer — browser won't discard canvas on memory pressure */
  /* V7.18.1 HOTFIX: REMOVED `contain:strict` — it isolated the map subtree's layout/paint
     from the rest of the document, which broke MapLibre GL's dynamic container-size
     calculation on mobile devices, collapsing the drawing buffer to wrong/null dimensions
     and freezing the map. GPU acceleration is preserved via `will-change:transform` above. */
}
#map.crosshair .maplibregl-canvas{cursor:crosshair!important}
.maplibregl-ctrl-attrib{display:none!important}

/* === TOP SCRIM (V7.14: eliminado — sin scrim, sin blur) ============================ */
#scrim{position:fixed;top:0;left:0;right:0;height:0;z-index:0;background:transparent!important;pointer-events:none;display:none}

/* === APP (V7.14 HARDENED: z-10, flex column rígido, sin absolute) ================
   V7.14: z-index 5→10 (blueprint spec: ui_layer=10). Layout flex column estricto:
   .topbar (top-header 60px) → .origin-pill (auto) → .memory-row (auto) → .stage (flex:1)
   → .category-wrapper (bottom-actions 50px) → .sheet-wrap (auto).
   El mapa (z-0) se ve a través de .stage. Los elementos UI NO usan position:absolute.
   pointer-events:none en contenedores, auto solo en botones/inputs. ================== */
.app{position:relative;z-index:10!important;max-width:560px;margin:0 auto;width:100%;flex:1 0 auto;display:flex;flex-direction:column;min-height:0;pointer-events:none;background:transparent!important}
.app>.topbar,.app>.origin-pill,.app>.memory-row,.app>.mode-selector,.app>.category-wrapper,.app>.sheet-wrap{pointer-events:auto}

/* === V7.14 HARDENED TOPBAR (Safe Zone Layout) ===================================
   Blueprint fase_1: 'Barra de búsqueda en Top-Header (60px)'. position:relative (no absolute).
   Flex shrink:0 para reservar espacio fijo arriba. El mapa se ve debajo, sin superposición. */
.topbar{
  position:relative!important; /* V7.14: absolute→relative (no más flotante) */
  flex-shrink:0;
  z-index:10;
  padding:calc(env(safe-area-inset-top,0px) + 8px) var(--sp-4) 4px;
  background:transparent;
}
/* V7.14 HARDENED search-bar: bg SOLID #000000 (no transparent, no blur, no glassmorphism).
   Border 2px #FFFFFF sólido (define dónde termina UI y empieza mapa).
   Texto #FFFFFF weight 700 + text-stroke 1px para legibilidad absoluta. */
.search-bar{
  position:relative;display:flex;align-items:center;gap:var(--sp-1);
  background:#000000!important; /* V7.14: rgba(0,0,0,0.42)→solid #000 (0.9 opacidad via rgba abajo) */
  background:rgba(0,0,0,0.9)!important; /* spec: opacidad 0.9 */
  border:2px solid #FFFFFF!important; /* V7.14: 1px rgba(255,255,255,0.1)→2px solid #FFFFFF */
  backdrop-filter:none!important;-webkit-backdrop-filter:none!important; /* V7.14: ELIMINADO blur */
  border-radius:14px;
  padding:0 var(--sp-2);height:48px;min-height:48px;
  box-shadow:none;
  animation:fadeUpSoftWake 420ms ease-out both;
}
@keyframes fadeUpSoftWake{
  0%{opacity:0;transform:translateY(10px)}
  100%{opacity:1;transform:translateY(0)}
}
@media(prefers-reduced-motion:reduce){.search-bar{animation:none;opacity:1;transform:none}}
/* V7.14 HARDENED typography: weight 700 + text-stroke 1px negro para legibilidad absoluta.
   Texto blanco sobre fondo negro sólido = contraste máximo. Sin text-shadow (reemplazado por stroke). */
.search-bar .sb-icon{color:#FFFFFF;flex-shrink:0;display:flex;align-items:center;padding-left:var(--sp-1);-webkit-text-stroke:1px #000;text-stroke:1px #000}
#destInput{
  flex:1;border:none;background:transparent;outline:none;
  font-size:calc(var(--font-body) * 1.05);
  font-weight:700;color:#FFFFFF; /* V7.14: var(--fw-body)→700, #FFFFFF */
  min-width:0;letter-spacing:-0.01em;padding:var(--sp-1) 0;min-height:32px;
  -webkit-text-stroke:1px #000;text-stroke:1px #000; /* V7.14: stroke agresivo */
}
#destInput::placeholder{color:rgba(255,255,255,0.85);-webkit-text-stroke:1px #000;text-stroke:1px #000}
.sb-btn{
  border:none;background:transparent;cursor:pointer;flex-shrink:0;
  width:40px;height:40px;border-radius:var(--radius-sm);
  display:flex;align-items:center;justify-content:center;color:#FFFFFF;
  transition:transform var(--ease-out),background var(--ease-out),opacity var(--ease-out);
  -webkit-tap-highlight-color:transparent;
  -webkit-text-stroke:1px #000;text-stroke:1px #000; /* V7.14: stroke agresivo */
}
.sb-btn:active{transform:scale(0.9);background:var(--fi-hover)}
.sb-btn[disabled]{opacity:0.3;cursor:not-allowed}
/* Secondary actions (map-pick, locate) — muted so the INPUT is the single action focus.
   Lift to full opacity on hover/focus (desktop) and active (mobile). */
.sb-btn.sb-sec{opacity:0.55}
.sb-btn.sb-sec:hover,.sb-btn.sb-sec:focus-visible{opacity:1;background:var(--fi-hover)}
.sb-btn.sb-sec:active{opacity:1}
/* Mic (inside_input_right) — primary voice action, full opacity, push-to-talk.
   touch-action:none so pointerdown isn't hijacked by scroll/pan during hold. */
.sb-btn.sb-mic{color:var(--fi-text);touch-action:none;order:99 /* rightmost = inside_input_right */}
.sb-btn.sb-mic.listening{color:var(--red);background:rgba(255,59,48,0.18);animation:micPulse 1.1s ease-in-out infinite}
@keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,59,48,0.35)}50%{box-shadow:0 0 0 6px rgba(255,59,48,0)}}
@media(prefers-reduced-motion:reduce){.sb-btn.sb-mic.listening{animation:none}}

/* === V7.14 HARDENED ORIGIN PILL: bg sólido negro + border 2px blanco, sin blur === */
.origin-pill{
  display:none;align-items:center;gap:var(--sp-2);margin:calc(env(safe-area-inset-top,0px) + var(--sp-2)) var(--sp-4) 0;
  padding:8px 12px;background:rgba(0,0,0,0.9)!important;border:2px solid #FFFFFF!important;
  backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  border-radius:999px;width:fit-content;max-width:calc(100% - 32px);
  cursor:pointer;transition:transform var(--ease-out);min-height:36px;
  flex-shrink:0;
}
.origin-pill.show{display:flex}
.origin-pill:active{transform:scale(0.98)}
.origin-pill .op-dot{width:8px;height:8px;border-radius:50%;background:var(--success);flex-shrink:0}
.origin-pill .op-dot.err{background:var(--red)}
.origin-pill .op-text{font-size:var(--font-caption);color:#FFFFFF;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;-webkit-text-stroke:1px #000;text-stroke:1px #000}

/* === SEARCH DROPDOWN (V7.14 HARDENED: bg sólido negro, sin blur, border 2px blanco) === */
.search-dropdown{
  position:absolute;top:calc(100% + 8px);left:0;right:0;z-index:30;
  background:rgba(0,0,0,0.95)!important;border:2px solid #FFFFFF!important;
  backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  border-radius:14px;overflow:hidden;
  max-height:40vh;overflow-y:auto;-webkit-overflow-scrolling:touch;
  box-shadow:none;
}
.search-dropdown.hidden{display:none}
.sd-section{padding:var(--sp-1) 0}
.sd-section-title{font-size:var(--font-micro);font-weight:700;color:var(--fi-sub);text-transform:uppercase;letter-spacing:0.04em;padding:var(--sp-2) var(--sp-4) var(--sp-1)}
.search-item{
  display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3) var(--sp-4);cursor:pointer;
  border:none;background:transparent;width:100%;text-align:left;
  font-size:var(--font-body);line-height:1.35;min-height:52px;
  transition:background var(--ease-out);color:var(--fi-text);
}
.search-item:active,.search-item:hover{background:var(--fi-hover)}
.search-item-icon{color:var(--fi-sub);flex-shrink:0;width:24px;display:flex;justify-content:center}
.search-item-icon.ic-fav{color:var(--orange)}
.search-item-icon.ic-recent{color:var(--fi-sub)}
.search-item-icon.ic-home{color:var(--primary)}
.search-item-icon.ic-work{color:var(--primary)}
.search-item-text{flex:1;min-width:0}
.search-item-text strong{display:block;font-weight:var(--fw-bold);font-size:var(--font-body);color:var(--fi-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-0.01em}
.search-item-text small{color:var(--fi-sub);font-size:var(--font-caption);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;margin-top:2px}
.search-item-tag{font-size:var(--font-micro);font-weight:700;color:var(--fi-sub);background:var(--fi-hover);padding:3px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:0.03em;flex-shrink:0}
.search-item--empty{padding:var(--sp-5);color:var(--fi-sub);font-size:14px;cursor:default;text-align:center;min-height:auto}
/* V7.11 GEO_BIAS: hint label "¿Buscando en Santa Fe?" — aparece cuando el top resultado
   de Nominatim está fuera del bbox SF. Inline arriba del dropdown, con botón re-centrar. */
.sd-geo-hint{display:flex;align-items:center;gap:6px;padding:8px var(--sp-4);background:rgba(255,159,10,0.12);border-bottom:1px solid rgba(255,159,10,0.25);font-size:var(--font-caption);color:#FF9F0A}
.sd-geo-hint-ic{display:flex;align-items:center;color:#FF9F0A;flex-shrink:0}
.sd-geo-hint-txt{flex:1;font-weight:var(--fw-bold)}
.sd-geo-hint-btn{border:1px solid rgba(255,159,10,0.5);background:transparent;color:#FF9F0A;font-size:var(--font-micro);font-weight:700;padding:4px 10px;border-radius:999px;cursor:pointer;text-transform:uppercase;letter-spacing:0.03em;min-height:28px}
.sd-geo-hint-btn:active{transform:scale(0.95);background:rgba(255,159,10,0.15)}

/* === MEMORY CHIPS (favorites/recents quick access) === */
.memory-row{display:none;padding:var(--sp-2) var(--sp-4) 0;gap:var(--sp-2);overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.memory-row.show{display:flex}
.memory-row::-webkit-scrollbar{display:none}
/* === V7.14 HARDENED MEMORY CHIPS: bg sólido negro, border 2px blanco, sin blur === */
.chip{
  display:inline-flex;align-items:center;gap:6px;flex-shrink:0;
  padding:8px 14px;border-radius:999px;
  background:rgba(0,0,0,0.9)!important;
  border:2px solid #FFFFFF!important;
  backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  font-size:var(--font-caption);font-weight:700;color:#FFFFFF;
  cursor:pointer;min-height:36px;transition:transform var(--ease-out);
  -webkit-tap-highlight-color:transparent;white-space:nowrap;
  -webkit-text-stroke:1px #000;text-stroke:1px #000;
}
.chip:active{transform:scale(0.95)}
.chip .chip-ic{display:flex;align-items:center;color:#FFFFFF}
.chip.chip-fav .chip-ic{color:var(--orange)}
.chip.chip-clear{color:#FFFFFF;background:rgba(255,59,48,0.9)!important;border-color:#FFFFFF!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
[data-theme="dark"] .chip{background:rgba(0,0,0,0.95)!important}
[data-theme="dark"] .chip.chip-clear{background:rgba(255,59,48,0.85)!important}
.chip .chip-text{max-width:140px;overflow:hidden;text-overflow:ellipsis}

/* === STAGE (V7.14: flex:1 — empuja category-wrapper y sheet hacia abajo) =========
   El espacio entre la fila de pills y el bottom sheet esStage. Mapa se ve a través. */
.stage{flex:1;min-height:120px;pointer-events:none;background:transparent!important}

/* === DECISION SHEET === */
/* === DECISION SHEET (V7.14 HARDENED: bg sólido negro, sin blur, border 2px blanco) === */
.sheet-wrap{padding:0 var(--sp-4);padding-bottom:var(--sp-3);flex-shrink:0}
.sheet{
  background:rgba(0,0,0,0.95)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border-radius:var(--radius-card) var(--radius-card) 0 0;
  border:2px solid #FFFFFF!important;border-top:2px solid #FFFFFF!important;border-bottom:none;
  padding:var(--sp-4);
  padding-bottom:calc(var(--sp-4) + env(safe-area-inset-bottom,0px));
  animation:sheetIn var(--ease-sheet) both;
  max-height:32vh;
  overflow-y:auto;-webkit-overflow-scrolling:touch;
  scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.3) transparent;
  --text:#FFFFFF;--text2:#CCCCCC;--text3:#999999;
  --border:rgba(255,255,255,0.3);--border-subtle:rgba(255,255,255,0.2);--border-strong:rgba(255,255,255,0.5);
  --surface:#000000;--surface2:#0a0a0a;--bg3:#0a0a0a;
  color:var(--text);
}
.sheet::-webkit-scrollbar{width:5px}
.sheet::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:999px}
/* V7.9.1: sheet is always dark glass regardless of theme — no dark-theme override needed */
.sheet::-webkit-scrollbar-track{background:transparent}
@keyframes sheetIn{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
.sheet-empty{text-align:center;padding:var(--sp-5) var(--sp-4);color:var(--text2);font-size:var(--font-body);font-weight:var(--fw-body)}
.sheet-empty .se-icon{display:flex;justify-content:center;color:var(--text3);opacity:0.5;margin-bottom:var(--sp-3)}

/* Sheet header: route summary + save-favorite. Sticky inside the scrollable sheet
   so the A→B route stays visible while browsing providers below. */
.sheet-head{display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-3);padding-bottom:var(--sp-3);border-bottom:0.5px solid var(--border-subtle);position:sticky;top:0;z-index:4;background:var(--surface)}
.sheet-head .sh-route{flex:1;min-width:0}
.sheet-head .sh-origin{font-size:var(--font-caption);color:var(--text2);display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sheet-head .sh-dest{font-size:var(--font-body);font-weight:var(--fw-bold);color:var(--text);display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.sheet-head .sh-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.sheet-head .sh-dot.from{background:var(--success)}
.sheet-head .sh-dot.to{background:var(--red)}
.sh-actions{display:flex;gap:var(--sp-1)}
.icon-btn{
  border:none;background:var(--bg3);cursor:pointer;width:44px;height:44px;border-radius:var(--radius-sm);
  display:flex;align-items:center;justify-content:center;color:var(--text2);
  transition:transform var(--ease-out),background var(--ease-out);
}
.icon-btn:active{transform:scale(0.9)}
.icon-btn.active{color:var(--orange);background:rgba(255,149,0,0.12)}

/* VOY_UI_FOCUS_V1 UI-003 — Route share (sheet-bottom-right, subtle).
   Rendered only in the full sheet path ⇒ visible solely when a destination
   is selected. Minimal ghost button: transparent bg, muted text, lifts to
   full opacity on hover/focus. Spec asked for #FFFFFF; we use var(--text3)
   so the button stays legible on the light sheet surface too (default theme
   has a white sheet — #FFFFFF would be invisible). Intent preserved: subtle,
   low-opacity, full-opacity on hover. */
.sheet-share-row{display:flex;justify-content:flex-end;margin-top:var(--sp-4);padding-top:var(--sp-3);border-top:0.5px solid var(--border-subtle)}
.sheet-share-btn{
  display:inline-flex;align-items:center;gap:6px;border:none;background:transparent;cursor:pointer;
  color:var(--text3);opacity:0.6;font-size:var(--font-caption);font-weight:var(--fw-body);
  padding:8px 4px;min-height:36px;border-radius:var(--radius-xs);transition:opacity var(--ease-out),transform var(--ease-out);
  -webkit-tap-highlight-color:transparent;
}
.sheet-share-btn:hover{opacity:1}
.sheet-share-btn:focus-visible{opacity:1;outline:2px solid var(--primary);outline-offset:2px}
.sheet-share-btn:active{opacity:1;transform:scale(0.96)}
@media (prefers-reduced-motion:reduce){.sheet-share-btn{transition:none}}

/* HERO ride-hailing option */
.hero{
  display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-2) 0 var(--sp-3);
}
.hero-color{width:6px;height:48px;border-radius:3px;flex-shrink:0}
.hero-info{flex:1;min-width:0}
.hero-name{font-size:var(--font-title);font-weight:var(--fw-title);color:var(--text);letter-spacing:-0.02em;line-height:1.2}
.hero-meta{font-size:var(--font-caption);font-weight:var(--fw-body);color:var(--text2);margin-top:3px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.hero-price-block{text-align:right;flex-shrink:0}
.hero-price{font-size:var(--font-display);font-weight:var(--fw-display);color:var(--text);letter-spacing:-0.03em;line-height:1}
.hero-range{font-size:var(--font-micro);color:var(--text3);font-weight:var(--fw-body);margin-top:3px}
.walk-hero{background:linear-gradient(90deg,rgba(52,199,89,0.10) 0%,var(--bg2) 40%)}
.walk-hero .hero-price{color:var(--success)}
.walk-hero .hero-range{color:var(--success);opacity:0.8}
.conf-badge{font-size:var(--font-micro);font-weight:700;color:var(--text2);background:var(--bg3);padding:2px 7px;border-radius:999px;letter-spacing:0.02em}
.conf-badge.high{color:var(--success);background:rgba(52,199,89,0.12)}
.conf-badge.mid{color:var(--orange);background:rgba(255,149,0,0.12)}

/* Primary CTA — corporate minimal black (Uber/Linear) */
.cta-primary{
  display:flex;align-items:center;justify-content:center;gap:8px;
  width:100%;background:var(--accent);color:var(--bg);border:none;border-radius:var(--radius-button);
  padding:0 24px;height:52px;min-height:52px;font-size:var(--font-body);
  font-weight:var(--fw-title);cursor:pointer;letter-spacing:-0.01em;
  transition:transform var(--ease-out),opacity var(--ease-out);
  margin-top:var(--sp-3);
}
.cta-primary:active{transform:scale(0.97);opacity:0.85}
.cta-primary[disabled]{background:var(--bg3);color:var(--text3);cursor:not-allowed}

/* VOY_NAVIGATOR_MVP — "Navegar" button beside provider CTA (Phase 1: GPS follow) */
.hero-cta-row{display:flex;gap:var(--sp-2);margin-top:var(--sp-3)}
.hero-cta-row .cta-primary{flex:1;margin-top:0}
.cta-navigate{
  display:flex;align-items:center;justify-content:center;gap:8px;flex:0 0 auto;
  background:var(--surface);color:var(--text);border:1.5px solid var(--border-strong);
  border-radius:var(--radius-button);padding:0 18px;height:52px;min-height:52px;
  font-size:var(--font-body);font-weight:var(--fw-title);cursor:pointer;letter-spacing:-0.01em;
  transition:transform var(--ease-out),opacity var(--ease-out),background var(--ease-out);
}
.cta-navigate:active{transform:scale(0.97);opacity:0.85}
.cta-navigate:hover{background:var(--surface2)}
.cta-navigate[disabled]{opacity:0.5;cursor:not-allowed}

/* Navigator floating panel + user dot (appended by lazy-loaded /navigator/navigator.js) */
.voy-nav-panel{
  position:absolute;top:calc(72px + env(safe-area-inset-top,0px));right:var(--sp-3);z-index:5;
  display:flex;align-items:center;gap:var(--sp-2);
  background:var(--surface);border:0.5px solid var(--border-strong);
  border-radius:var(--radius-card);padding:6px 10px;
  box-shadow:0 4px 16px rgba(0,0,0,0.18);
  font-size:var(--font-caption);font-weight:var(--fw-body);color:var(--text);
  max-width:calc(100vw - 24px);
}
.voy-nav-panel .vnp-status{display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46vw}
.voy-nav-panel .vnp-label{overflow:hidden;text-overflow:ellipsis}
.voy-nav-panel .vnp-dot{width:8px;height:8px;border-radius:50%;background:#FF2D92;box-shadow:0 0 0 0 rgba(255,45,146,0.6);animation:voyNavPulse 1.6s infinite;flex-shrink:0}
.voy-nav-panel .vnp-dot.err{background:#FF3B30;animation:none}
@keyframes voyNavPulse{0%{box-shadow:0 0 0 0 rgba(255,45,146,0.55)}70%{box-shadow:0 0 0 8px rgba(255,45,146,0)}100%{box-shadow:0 0 0 0 rgba(255,45,146,0)}}
.voy-nav-panel button{
  display:flex;align-items:center;justify-content:center;width:36px;height:36px;flex-shrink:0;
  border-radius:var(--radius-button);border:0.5px solid var(--border-strong);background:var(--surface2);color:var(--text);
  cursor:pointer;transition:background var(--ease-out),transform var(--ease-out);
}
.voy-nav-panel button:active{transform:scale(0.94)}
.voy-nav-panel button:hover{background:var(--bg3)}
.voy-nav-panel button.vnp-exit{background:var(--bg3)}
/* NAVIGATION_MODULE_MINIMAL_V1 — mode selector button. Uses the navigator's own
   magenta accent (NOT blue/indigo) to signal "this is the mode control", tying
   it visually to the user-dot + pulse animation. Icon alone conveys the mode. */
.voy-nav-panel button.vnp-mode{border-color:rgba(255,45,146,0.35);color:#FF2D92}
.voy-nav-panel button.vnp-mode:active{background:rgba(255,45,146,0.10)}
@media(max-width:380px){.voy-nav-panel .vnp-status{display:none}.voy-nav-panel{padding:6px}} /* ultra-narrow: icons only */

/* Navigator "you are here" marker (magenta, distinct from green origin + red dest) */
.voy-nav-userdot{width:18px;height:18px;background:#FF2D92;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 6px rgba(255,45,146,0.18),0 2px 6px rgba(0,0,0,0.5)}

/* More options accordion */
.more-opts{margin-top:var(--sp-4);border-top:0.5px solid var(--border-subtle);padding-top:var(--sp-3)}
.accordion{margin-top:var(--sp-2)}
.acc-head{
  display:flex;align-items:center;gap:var(--sp-3);width:100%;
  padding:var(--sp-3) var(--sp-2);background:transparent;border:none;cursor:pointer;
  border-radius:var(--radius-sm);min-height:48px;color:var(--text);
  transition:background var(--ease-out);
}
.acc-head:active,.acc-head:hover{background:var(--bg3)}
.acc-head .ah-ic{display:flex;align-items:center;color:var(--text2);flex-shrink:0}
.acc-head .ah-title{flex:1;text-align:left;font-size:var(--font-body);font-weight:var(--fw-bold)}
.acc-head .ah-meta{font-size:var(--font-caption);color:var(--text2);font-weight:var(--fw-body)}
.acc-head .ah-chev{color:var(--text3);transition:transform var(--ease-out);display:flex;align-items:center}
.acc-head.expanded .ah-chev{transform:rotate(180deg)}
.acc-body{max-height:0;overflow:hidden;transition:max-height var(--ease-sheet)}
.acc-body.expanded{max-height:600px}
.acc-co{
  display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3) var(--sp-2);
  border-top:0.5px solid var(--border-subtle);
}
.acc-co:first-child{border-top:none}
.acc-co .co-info{flex:1;min-width:0}
.acc-co .co-name{font-size:var(--font-body);font-weight:var(--fw-bold);color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.acc-co .co-meta{font-size:var(--font-caption);color:var(--text2);margin-top:2px;display:flex;gap:10px;flex-wrap:wrap}
.acc-co .co-price{font-size:var(--font-body);font-weight:var(--fw-title);color:var(--text);flex-shrink:0;text-align:right}
.acc-co .co-actions{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}
.co-action{
  display:inline-flex;align-items:center;gap:5px;border:0.5px solid var(--border);
  background:var(--surface);color:var(--text);font-size:var(--font-caption);font-weight:var(--fw-bold);
  padding:9px 13px;border-radius:999px;cursor:pointer;min-height:44px;
  transition:transform var(--ease-out),background var(--ease-out);text-decoration:none;
}
.co-action:active{transform:scale(0.95);background:var(--bg3)}
.co-action.wa{color:var(--success);border-color:rgba(52,199,89,0.3)}
.co-action.call{color:var(--primary);border-color:rgba(0,122,255,0.3)}

/* Bus block — VOY_COLLECTIVE_ENGINE_V1 */
.bus-block{margin-top:var(--sp-4);padding-top:var(--sp-3);border-top:0.5px solid var(--border-subtle)}
.block-title{font-size:var(--font-micro);font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:var(--sp-2);display:flex;align-items:center;gap:6px}
.block-title .bt-ic{display:flex;align-items:center}
button{cursor:pointer}
/* .bus-line-row is the tappable line (top 3 shown explicitly). Each tap draws
   that line's real route on the map and reveals its detail. */
.bus-line-row{
  display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3);background:var(--bg3);
  border-radius:var(--radius-sm);cursor:pointer;min-height:52px;width:100%;border:none;
  color:var(--text);text-align:left;
  transition:transform var(--ease-out),background var(--ease-out),box-shadow var(--ease-out);
  border-left:3px solid transparent;
}
.bus-line-row:active{transform:scale(0.99);background:var(--bg)}
.bus-line-row.active{background:rgba(255,149,0,0.10);border-left-color:var(--orange)}
.bus-line-row--sec{min-height:46px;padding:10px var(--sp-3)}
.bus-line-row--sec .bus-line-text{font-size:var(--font-caption);font-weight:var(--fw-bold)}
.bus-line-row--sec .bus-line-sub{font-size:var(--font-micro)}
.bus-line-icon{color:var(--orange);flex-shrink:0;display:flex;align-items:center}
.bus-line-body{flex:1;min-width:0;line-height:1.35;display:flex;flex-direction:column}
.bus-line-text{font-size:var(--font-body);font-weight:var(--fw-bold);color:var(--text);letter-spacing:-0.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bus-line-sub{font-size:var(--font-caption);color:var(--text2);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bus-line-eta{font-size:var(--font-caption);font-weight:var(--fw-title);color:var(--text);flex-shrink:0;text-align:right;min-width:48px;display:flex;flex-direction:column;align-items:flex-end}
.bus-urgent{color:var(--red);font-weight:var(--fw-title);font-size:var(--font-micro);margin-top:2px}
.est-badge{font-size:10px;font-weight:700;color:var(--text3);background:var(--surface2);padding:2px 6px;border-radius:var(--radius-xs);text-transform:uppercase;letter-spacing:0.02em}
.bus-detail{max-height:0;overflow:hidden;font-size:var(--font-caption);color:var(--text2);transition:max-height var(--ease-sheet);line-height:1.55}
.bus-detail.expanded{max-height:220px;padding-top:var(--sp-2);padding-bottom:var(--sp-2)}
.bus-detail .bd-row{display:flex;gap:8px;padding:3px 0;align-items:flex-start}
.bus-detail .bd-ic{color:var(--text3);flex-shrink:0;display:flex;align-items:center;margin-top:1px}
.bus-alts{max-height:0;overflow:hidden;transition:max-height var(--ease-sheet)}
.bus-alts.expanded{max-height:400px}
/* .bus-alt-row is now a button (tappable to draw that line's route on the map) */
.bus-alt-row{display:flex;align-items:center;gap:var(--sp-2);padding:var(--sp-2) var(--sp-3);border-top:0.5px solid var(--border-subtle);font-size:var(--font-caption);color:var(--text2);width:100%;background:transparent;border-left:3px solid transparent;text-align:left}
.bus-alt-row:active{background:var(--bg3)}
.bus-alt-row.active{background:rgba(255,149,0,0.08);border-left-color:var(--orange)}
.bus-alt-row .ba-line{font-weight:var(--fw-title);color:var(--text);min-width:52px}
.bus-alt-row .ba-stop{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bus-alt-row .ba-eta{flex-shrink:0;font-weight:var(--fw-bold);color:var(--text2)}
.expand-hint{text-align:center;font-size:var(--font-micro);font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.04em;padding:var(--sp-2) 0 0;cursor:pointer;background:transparent;border:none;width:100%}

/* Bike tertiary */
.bike-block{margin-top:var(--sp-4);padding-top:var(--sp-3);border-top:0.5px solid var(--border-subtle)}
.bike-line{display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3);background:transparent;border:0.5px dashed var(--border);border-radius:var(--radius-sm);cursor:pointer;min-height:48px;width:100%;color:var(--text2);text-align:left}
.bike-line:active{background:var(--bg3)}
.bike-line .bk-ic{color:var(--text3);flex-shrink:0;display:flex;align-items:center}
.bike-line .bk-text{flex:1;font-size:var(--font-body);font-weight:var(--fw-body)}
.bike-detail{max-height:0;overflow:hidden;font-size:var(--font-caption);color:var(--text2);transition:max-height var(--ease-sheet);line-height:1.55}
.bike-detail.expanded{max-height:160px;padding-top:var(--sp-2)}
.bike-detail .bd-row{display:flex;gap:8px;padding:3px 0;align-items:flex-start}
.bike-detail .bd-ic{color:var(--text3);flex-shrink:0;display:flex;align-items:center;margin-top:1px}
.bike-detail a{color:var(--primary);text-decoration:none;font-weight:var(--fw-bold)}

/* === FOOTER (sticky bottom) === */
.footer{
  position:relative;z-index:2;background:var(--footer-bg);
  color:var(--text3);font-size:var(--font-micro);
  padding:var(--sp-2) var(--sp-4);
  padding-bottom:calc(var(--sp-2) + env(safe-area-inset-bottom,0px));
  text-align:center;letter-spacing:-0.01em;
  border-top:1px solid var(--border-subtle);
  margin-top:auto;
  display:flex;align-items:center;justify-content:center;gap:5px;
}
.footer-mark{display:inline-flex;align-items:center;color:var(--text2)}

/* === FOOTER DISCLOSURE — VOY_SHARE_SUPPORT_V1 (share + support, low visibility) === */
.footer-more{
  display:inline-flex;align-items:center;justify-content:center;
  width:22px;height:22px;margin-left:6px;
  background:transparent;border:none;cursor:pointer;
  color:var(--text3);font-size:14px;line-height:1;letter-spacing:1px;
  padding:0;border-radius:6px;
  transition:color var(--ease-out),background var(--ease-out);
  -webkit-tap-highlight-color:transparent;
}
.footer-more:hover,.footer-more:focus-visible{color:var(--text2);background:var(--bg3);outline:none}
.footer-more[aria-expanded="true"]{color:var(--text2);background:var(--bg3)}
.footer-menu{
  position:fixed;left:50%;transform:translateX(-50%) translateY(8px);
  bottom:calc(46px + env(safe-area-inset-bottom,0px));
  z-index:9100;background:var(--surface);border:1px solid var(--border-strong);
  border-radius:var(--radius-card);
  box-shadow:0 8px 24px rgba(0,0,0,0.18);
  min-width:220px;padding:var(--sp-1);
  opacity:0;pointer-events:none;
  transition:opacity var(--ease-out),transform var(--ease-out);
}
.footer-menu.show{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0)}
.fm-item{
  display:flex;align-items:center;gap:10px;width:100%;
  padding:10px 12px;background:transparent;border:none;cursor:pointer;
  color:var(--text);font-size:var(--font-body);font-weight:var(--fw-body);
  border-radius:var(--radius-button);text-align:left;letter-spacing:-0.01em;
  transition:background var(--ease-out);
  -webkit-tap-highlight-color:transparent;
}
.fm-item:hover,.fm-item:focus-visible{background:var(--bg3);outline:none}
.fm-item:active{background:var(--bg3);transform:scale(0.99)}
.fm-ic{display:inline-flex;color:var(--text2);flex-shrink:0}
.fm-sep{height:1px;background:var(--border-subtle);margin:2px 4px}

/* === DEEP-LINK CONFIRMATION DIALOG (V7.14 HARDENED: bg sólido, sin blur, border 2px) === */
.dialog-overlay{
  position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.6)!important;
  display:flex;align-items:flex-end;justify-content:center;
  opacity:0;pointer-events:none;transition:opacity var(--ease-out);
}
.dialog-overlay.show{opacity:1;pointer-events:auto}
.dialog{
  background:#000000!important;border-radius:20px 20px 0 0!important;
  border:2px solid #FFFFFF!important;border-bottom:none;
  width:100%;max-width:560px;max-height:25vh!important;overflow-y:auto;-webkit-overflow-scrolling:touch;
  padding:var(--sp-4);
  padding-bottom:calc(var(--sp-4) + env(safe-area-inset-bottom,0px));
  transform:translateY(100%);
  transition:transform var(--ease-spring);
  scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.3) transparent;
  color:#FFFFFF;
}
.dialog::-webkit-scrollbar{width:4px}
.dialog::-webkit-scrollbar-thumb{background:var(--text3);border-radius:999px}
.dialog-overlay.show .dialog{transform:translateY(0)}
.dialog .dg-icon{display:flex;justify-content:center;margin-bottom:var(--sp-3);color:var(--primary)}
.dialog .dg-title{font-size:var(--font-title);font-weight:var(--fw-title);color:var(--text);text-align:center;letter-spacing:-0.02em;margin-bottom:var(--sp-2)}
.dialog .dg-provider{font-size:var(--font-body);font-weight:var(--fw-bold);color:var(--text);text-align:center;margin-bottom:var(--sp-2)}
.dialog .dg-msg-short{font-size:var(--font-body);font-weight:var(--fw-bold);color:var(--text);text-align:center;line-height:1.4;margin-bottom:var(--sp-2)}
/* ISSUE-2: route hint shown only for DiDi (no coord pre-fill deep link). */
.dialog .dg-route-hint{margin:0 0 var(--sp-3);padding:var(--sp-3);background:var(--surface2);border:1px solid var(--border-subtle);border-radius:var(--radius-sm)}
.dialog .dg-route-hint .dgrh-label{font-size:var(--font-micro);font-weight:var(--fw-bold);color:var(--text2);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:var(--sp-2);line-height:1.4}
.dialog .dg-route-hint .dgrh-route{display:flex;align-items:center;gap:var(--sp-2);font-size:var(--font-body);color:var(--text);font-weight:var(--fw-bold)}
.dialog .dg-route-hint .dgrh-from,.dialog .dg-route-hint .dgrh-to{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dialog .dg-route-hint .dgrh-arrow{color:var(--text3);flex-shrink:0}
.dialog .dg-msg{font-size:var(--font-caption);color:var(--text2);text-align:center;line-height:1.5;margin-bottom:var(--sp-5)}
.dialog .dg-actions{display:flex;gap:var(--sp-2)}
.dg-cancel{
  flex:1;background:var(--bg3);color:var(--text);border:none;border-radius:var(--radius-button);
  height:48px;min-height:48px;font-size:var(--font-body);font-weight:var(--fw-bold);cursor:pointer;
  transition:transform var(--ease-out);
}
.dg-cancel:active{transform:scale(0.97)}
.dg-confirm{
  flex:1;background:var(--accent);color:var(--bg);border:none;border-radius:var(--radius-button);
  height:48px;min-height:48px;font-size:var(--font-body);font-weight:var(--fw-title);cursor:pointer;
  transition:transform var(--ease-out),opacity var(--ease-out);
}
.dg-confirm:active{transform:scale(0.97);opacity:0.85}

/* === TOAST === */
.toast-container{position:fixed;top:calc(76px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:9500;display:flex;flex-direction:column;gap:var(--sp-2);pointer-events:none;width:calc(100vw - 32px);max-width:440px}
.toast{padding:var(--sp-3) var(--sp-4);border-radius:var(--radius-button);font-size:var(--font-body);font-weight:var(--fw-bold);color:#fff;animation:toastIn 280ms cubic-bezier(0.22,1.2,0.36,1);pointer-events:auto;text-align:center;letter-spacing:-0.01em;border:1px solid rgba(255,255,255,0.15)}
.toast.info{background:rgba(0,122,255,0.96)}
.toast.success{background:rgba(52,199,89,0.96)}
.toast.error{background:rgba(255,59,48,0.96)}
.toast.warn{background:rgba(255,149,0,0.96)}
@keyframes toastIn{from{opacity:0;transform:translateY(-12px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}

/* === REDUCED MOTION === */
@media (prefers-reduced-motion:reduce){
  *{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;scroll-behavior:auto!important}
  .sheet{animation:none}
}

/* === RESPONSIVE === */
@media (min-width:560px){
  .topbar,.sheet-wrap,.memory-row,.footer{max-width:560px;margin-left:auto;margin-right:auto}
}
.maplibregl-canvas{
  outline:none!important;
  /* V7.18: stabilize mobile rendering — prevents the GPU from allocating a 2399px
     backing store when the WebGL context is under pressure. */
  image-rendering:-webkit-optimize-contrast;
  image-rendering:crisp-edges;
  /* Hard cap on the canvas backing size — defends against MapLibre computing
     an inflated drawing buffer when devicePixelRatio spikes or the container
     briefly reports a huge height during layout transitions. */
  max-height:100vh!important;
  max-height:100dvh!important;
}

/* === MAP GRID OVERLAY (ui_system: grid_overlay) — subtle, premium GPS feel === */
#mapGrid{
  position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0.5;
  background-image:
    linear-gradient(to right,rgba(0,212,255,0.06) 1px,transparent 1px),
    linear-gradient(to bottom,rgba(0,212,255,0.06) 1px,transparent 1px);
  background-size:48px 48px;
  mix-blend-mode:screen;
}
[data-theme="dark"] #mapGrid{opacity:0.35}

/* === TRANSPORT MODE SELECTOR (ui_system: bottom_ui) === */
.mode-selector{
  display:none;align-items:center;justify-content:center;gap:6px;
  padding:8px var(--sp-4) 4px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;
}
.mode-selector::-webkit-scrollbar{display:none}
.mode-selector.show{display:flex}
/* === V7.14 HARDENED MODE-PILL: bg sólido negro, border 2px blanco, sin blur, opacity inactivos 0.6 === */
.mode-pill{
  display:inline-flex;align-items:center;gap:6px;flex-shrink:0;
  padding:9px 14px;border-radius:999px;
  background:rgba(0,0,0,0.9)!important;
  border:2px solid #FFFFFF!important;
  font-size:var(--font-caption);font-weight:700;
  backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  color:#FFFFFF;cursor:pointer;min-height:36px;
  transition:transform var(--ease-out),background var(--ease-out),color var(--ease-out),border-color var(--ease-out),opacity var(--ease-out);
  -webkit-tap-highlight-color:transparent;white-space:nowrap;
  -webkit-text-stroke:1px #000;text-stroke:1px #000;
  opacity:0.6;
}
.mode-pill:active{transform:scale(0.95)}
.mode-pill.active{color:#000000;background:#FFFFFF!important;border-color:#FFFFFF!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;-webkit-text-stroke:0;text-stroke:0;opacity:1}
[data-theme="dark"] .mode-pill{background:rgba(0,0,0,0.95)!important}
[data-theme="dark"] .mode-pill.active{color:#000000;background:#FFFFFF!important;border-color:#FFFFFF!important}
.mode-pill .mp-ic{display:flex;align-items:center}
.mode-pill .mp-lbl{font-size:11px;letter-spacing:0.02em}

/* === V7.13 UNIFIED_GHOST_UI: CategoryManager aplanado a 1 sola fila ===========================
   Blueprint V7.13 fase_1: Eliminar la doble fila (cat-tabs + mode-pills) fusionando
   todo en 1 fila scrollable de 36px. Los cat-tabs (Ahorro/Privados/Activos/Público) ya
   no se renderizan visualmente — el feature Ahorro se mantiene como badge animado sobre
   el mode-pill Colectivo (montado por renderAhorroBadges en core/ahorro.js).
   _activeGroup se mantiene internamente para compat (mapeo modo→grupo en setMode). */
.category-wrapper{display:none;flex-direction:row;gap:6px;padding:6px var(--sp-4);overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;align-items:center;min-height:36px}
.category-wrapper.show{display:flex}
.category-wrapper::-webkit-scrollbar{display:none}
/* V7.13: category-tabs + category-panels + cat-panels-track ya NO se renderizan.
   initCategoryManager() ahora inyecta mode-pills directamente en .category-wrapper.
   Las reglas .cat-tab/.cat-panel previas fueron eliminadas (dead CSS). */
.category-tabs,.category-panels,.cat-panels-track,.cat-panel{display:none!important}

/* === V7.5 AHORRO INTELIGENTE =================================================================
   Blueprint: AhorroFeature — comparative cost algorithm (Colectivo vs Ride-Hailing).
   Formula: isRecommendationAvailable = (PublicTransportPrice < RideHailingPrice * 0.5)
   UI: (1) "Ahorro" cat-tab at position 0 with highlight dot when condition true;
       (2) BadgeRenderer mounts "¡Ahorrá un X%!" on Colectivo mode-pill when condition true.
   position:relative on .mode-pill + .cat-tab so badges anchor correctly (no layout impact). */
.mode-pill{position:relative}
.cat-tab{position:relative}
.cat-tab--ahorro{color:var(--text2)}
.cat-tab--ahorro.active{border-bottom-color:#00E676;color:var(--text)}
.ahorro-tab-badge{
  position:absolute;top:2px;right:6px;
  width:7px;height:7px;border-radius:50%;background:#00E676;
  border:1.5px solid var(--bg);
  animation:ahorro-pulse 2s ease-in-out infinite;
  pointer-events:none;
}
@keyframes ahorro-pulse{
  0%,100%{box-shadow:0 0 0 0 rgba(0,230,118,0.6)}
  50%{box-shadow:0 0 0 5px rgba(0,230,118,0)}
}
.ahorro-pill-badge{
  position:absolute;top:-7px;right:-7px;
  font-size:9px;font-weight:800;letter-spacing:0.02em;
  padding:3px 6px;border-radius:999px;white-space:nowrap;
  background:#00E676;color:#003314;
  box-shadow:0 1px 4px rgba(0,0,0,0.25);
  pointer-events:none;
  animation:ahorro-badge-in 250ms ease-out;
}
@keyframes ahorro-badge-in{from{opacity:0;transform:scale(0.6)}to{opacity:1;transform:scale(1)}}
@media (prefers-reduced-motion:reduce){
  .ahorro-tab-badge{animation:none}
  .ahorro-pill-badge{animation:none}
}

/* === V7.6 PREDICTIVE TREND ENGINE ============================================================
   Blueprint: PriceTrendBadge — mounts a trend icon next to ride-hailing prices.
   States: RISING (#FF5252, trending-up) / FALLING (#00E676, trending-down) / STABLE (#BDBDBD, minus).
   Placement: inside .hero-price and .ah-meta (inline, no layout impact).
   Gate: badge only renders if ≥3 historical datapoints (TrendEngine returns null otherwise). */
.price-trend-badge{
  display:inline-flex;align-items:center;vertical-align:middle;
  margin-left:4px;flex-shrink:0;
  transition:opacity 200ms ease-out;
  animation:price-trend-in 250ms ease-out;
}
.price-trend-badge svg{stroke-width:2.5}
.price-trend-badge.trending-up{color:#FF5252}
.price-trend-badge.trending-down{color:#00E676}
.price-trend-badge.minus{color:#BDBDBD;opacity:0.7}
@keyframes price-trend-in{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}
@media (prefers-reduced-motion:reduce){
  .price-trend-badge{animation:none}
}

/* === V7.9 FIELD_OPS — Feedback flag + Favorites star toggle ================================
   Blueprint: Field_Ops_and_Persistent_Context.
   - .fb-flag: small flag button on provider price cards (hero + alts + taxi/remis).
              Non-disruptive: click → beacon + toast. Pulse animation on send.
   - .fav-star: star toggle button on search-dropdown items (add/remove without selecting).
              Filled (active) vs outline (inactive) — clear on/off visual state. */
.fb-flag{
  display:inline-flex;align-items:center;justify-content:center;
  width:28px;height:28px;border:none;background:transparent;
  color:rgba(255,255,255,0.45);cursor:pointer;flex-shrink:0;
  border-radius:6px;-webkit-tap-highlight-color:transparent;
  transition:background 150ms ease-out,color 150ms ease-out,transform 150ms ease-out;
  margin-left:4px;
}
.fb-flag:hover,.fb-flag:focus-visible{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.85)}
.fb-flag:active{transform:scale(0.88)}
.fb-flag.fb-pulse{animation:fbPulse 600ms ease-out}
@keyframes fbPulse{
  0%{transform:scale(1);color:rgba(255,255,255,0.45)}
  40%{transform:scale(1.25);color:var(--orange,#FF9F0A)}
  100%{transform:scale(1);color:rgba(255,255,255,0.45)}
}
@media (prefers-reduced-motion:reduce){.fb-flag.fb-pulse{animation:none}}

.fav-star{
  display:inline-flex;align-items:center;justify-content:center;
  width:32px;height:32px;border:none;background:transparent;
  color:rgba(255,255,255,0.35);cursor:pointer;flex-shrink:0;
  border-radius:6px;-webkit-tap-highlight-color:transparent;
  transition:transform 150ms ease-out,color 150ms ease-out;
  margin-left:auto;padding:0 4px;
}
.fav-star:active{transform:scale(0.88)}
.fav-star.active{color:var(--orange,#FF9F0A)}
.fav-star:hover{background:rgba(255,255,255,0.06)}
[data-theme="light"] .fav-star{color:rgba(0,0,0,0.35)}
[data-theme="light"] .fav-star.active{color:var(--orange,#FF9F0A)}

/* === V7.7 PERFORMANCE_AUDIT_AND_TELEMETRY =====================================================
   Blueprint: HealthMonitor + DebugPanel.
   - .voy-debug-panel: floating diagnostic panel (FPS, Memory, Cache, SW, Latency, LCP, Trend, Ahorro).
     Hidden by default; shown only via konami code (↑↑↓↓←→←→BA) or 7 taps on the footer text.
     Distinct from the user analytics dashboard (va_dashboard, 5-tap on search icon). */
.voy-debug-panel{
  position:fixed;top:48px;right:8px;z-index:100001;
  min-width:192px;max-width:248px;
  background:rgba(20,20,22,0.96);color:#f5f5f7;
  border:1px solid rgba(255,255,255,0.12);border-radius:10px;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:1.5;
  padding:8px 10px 9px;box-shadow:0 8px 32px rgba(0,0,0,0.5);
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  animation:voy-debug-in 180ms ease-out;
}
@keyframes voy-debug-in{from{opacity:0;transform:translateY(-6px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.voy-debug-panel .vdp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.voy-debug-panel .vdp-title{font-weight:600;letter-spacing:-0.01em;color:#fff}
.voy-debug-panel .vdp-close{border:none;background:transparent;color:#8E8E93;cursor:pointer;font-size:16px;line-height:1;padding:2px 4px;border-radius:4px}
.voy-debug-panel .vdp-close:hover{background:rgba(255,255,255,0.1);color:#fff}
.voy-debug-panel .vdp-grid{display:grid;grid-template-columns:auto 1fr;gap:3px 8px;margin:0}
.voy-debug-panel .vdp-grid dt{color:#8E8E93;font-weight:400}
.voy-debug-panel .vdp-grid dd{margin:0;color:#e5e5ea;text-align:right;word-break:break-all}
.voy-debug-panel .vdp-foot{margin-top:6px;padding-top:5px;border-top:1px solid rgba(255,255,255,0.08);color:#636366;font-size:10px;text-align:center}
@media (prefers-reduced-motion:reduce){
  .voy-debug-panel{animation:none}
}

/* === V7.8 OFFLINE PWA — Offline Chip (MapStateManager integration) ============================
   Blueprint: ui_resiliencia — 'Offline Chip' injected into MapStateManager.
   Color: #FF9800 (amber). Icon: wifi-off. Shown when navigator.onLine === false.
   Disables search input + API calls; local trend history (VoyHistoryDB) still queryable. */
.offline-chip{
  position:fixed;top:calc(env(safe-area-inset-top,0px) + var(--sp-3));left:50%;
  transform:translateX(-50%) translateY(-160%);
  z-index:10000;
  display:flex;align-items:center;gap:var(--sp-2);
  padding:8px 14px;min-height:40px;
  background:#FF9800;color:#1a1a1a;
  border-radius:999px;
  box-shadow:0 4px 16px rgba(255,152,0,0.4);
  font-size:var(--font-body);font-weight:var(--fw-bold);
  letter-spacing:-0.01em;white-space:nowrap;
  opacity:0;pointer-events:none;
  transition:transform 280ms cubic-bezier(0.22,1.1,0.36,1),opacity 280ms ease-out;
  will-change:transform,opacity;
  max-width:calc(100% - 32px);
}
.offline-chip .oc-ic{display:flex;align-items:center;flex-shrink:0}
.offline-chip.visible{transform:translateX(-50%) translateY(0);opacity:1;pointer-events:auto}
@media(prefers-reduced-motion:reduce){
  .offline-chip{transition:opacity 200ms ease-out;transform:none!important}
  .offline-chip.visible{transform:translateX(-50%)!important}
}
body[data-offline="true"] #destInput{opacity:0.5;pointer-events:none}

/* === V7.4 MAP STATE MANAGER (3-state machine + floating chip) ===========================
   Blueprint: MapStateManager — SEARCH_FOCUS / ROUTE_PREVIEW / FULL_MAP.
   body[data-map-state] is the single source of truth. CSS rules below handle
   visibility/transform of .topbar, .sheet-wrap, .category-wrapper, .map-floating-chip.
   Performance: all animations use transform: translateY() (hardware-accelerated, no layout).
   z-index per blueprint: base=map_canvas(0), overlay=search_panel(50), floating_chip=9999. */
/* === V7.14 HARDENED MAP-FLOATING-CHIP: bg sólido negro, border 2px blanco === */
.map-floating-chip{
  position:fixed;top:calc(env(safe-area-inset-top,0px) + var(--sp-3));left:50%;
  transform:translateX(-50%) translateY(-160%);
  z-index:10;
  display:flex;align-items:center;gap:var(--sp-2);
  padding:10px 16px;min-height:44px;
  background:rgba(0,0,0,0.9)!important;color:#FFFFFF;
  border:2px solid #FFFFFF!important;border-radius:999px;
  box-shadow:none;
  cursor:pointer;
  opacity:0;pointer-events:none;
  transition:transform 280ms cubic-bezier(0.22,1.1,0.36,1),opacity 280ms ease-out;
  will-change:transform,opacity;
  max-width:calc(100% - 32px);
  -webkit-text-stroke:1px #000;text-stroke:1px #000;
}
.map-floating-chip .mfc-ic{display:flex;align-items:center;color:#FFFFFF;flex-shrink:0}
.map-floating-chip .mfc-text{
  font-size:var(--font-body);font-weight:700;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  max-width:200px;letter-spacing:-0.01em;
}
.map-floating-chip .mfc-edit{
  font-size:var(--font-micro);font-weight:700;color:#000;
  text-transform:uppercase;letter-spacing:0.04em;
  padding:3px 8px;border-radius:999px;background:#FFFFFF;
}
/* Shared transition for all state-driven panels */
.topbar,.sheet-wrap,.category-wrapper{
  transition:transform 280ms cubic-bezier(0.22,1.1,0.36,1),opacity 280ms ease-out;
  will-change:transform,opacity;
}
/* SEARCH_FOCUS (default): all panels visible */
body[data-map-state="SEARCH_FOCUS"] .topbar{transform:translateY(0);opacity:1;pointer-events:auto}
body[data-map-state="SEARCH_FOCUS"] .sheet-wrap{transform:translateY(0);opacity:1;pointer-events:auto}
body[data-map-state="SEARCH_FOCUS"] .category-wrapper{transform:translateY(0);opacity:1}
body[data-map-state="SEARCH_FOCUS"] .map-floating-chip{transform:translateX(-50%) translateY(-160%);opacity:0;pointer-events:none}
/* ROUTE_PREVIEW: all panels visible (sheet shows results, category-wrapper shown) */
body[data-map-state="ROUTE_PREVIEW"] .topbar{transform:translateY(0);opacity:1;pointer-events:auto}
body[data-map-state="ROUTE_PREVIEW"] .sheet-wrap{transform:translateY(0);opacity:1;pointer-events:auto}
body[data-map-state="ROUTE_PREVIEW"] .category-wrapper{transform:translateY(0);opacity:1}
body[data-map-state="ROUTE_PREVIEW"] .map-floating-chip{transform:translateX(-50%) translateY(-160%);opacity:0;pointer-events:none}
/* V7.9 COLLAPSIBLE_SEARCH — ROUTE_PREVIEW collapses the search bar to a compact pill.
   Secondary buttons (map-pick, locate, mic) hide; input shows dest name in bold.
   Tapping the input fires onSearchFocus() → SEARCH_FOCUS → full bar re-expands. */
body[data-map-state="ROUTE_PREVIEW"] .search-bar{height:40px;min-height:40px}
body[data-map-state="ROUTE_PREVIEW"] .sb-btn.sb-sec,
body[data-map-state="ROUTE_PREVIEW"] .sb-btn.sb-mic{display:none}
body[data-map-state="ROUTE_PREVIEW"] #destInput{font-weight:var(--fw-bold)}
body[data-map-state="ROUTE_PREVIEW"] .sb-icon{color:var(--primary)}
/* FULL_MAP: panels translated off-screen, floating chip slides in */
body[data-map-state="FULL_MAP"] .topbar{transform:translateY(-160%);opacity:0;pointer-events:none}
body[data-map-state="FULL_MAP"] .sheet-wrap{transform:translateY(160%);opacity:0;pointer-events:none}
body[data-map-state="FULL_MAP"] .category-wrapper{transform:translateY(160%);opacity:0;pointer-events:none}
body[data-map-state="FULL_MAP"] .map-floating-chip{transform:translateX(-50%) translateY(0);opacity:1;pointer-events:auto}
@media(prefers-reduced-motion:reduce){
  .topbar,.sheet-wrap,.category-wrapper,.map-floating-chip{transition:opacity 200ms ease-out;transform:none!important}
  .cat-panels-track{transition:none}
  .cat-tab:active{transform:none}
}

/* === SPLASH SCREEN (logo_system + splash spec) === */
#splash{
  position:fixed;inset:0;z-index:99998;background:#000000;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:28px;transition:opacity 600ms ease,visibility 600ms ease;
}
#splash.hide{opacity:0;visibility:hidden;pointer-events:none}
#splash .sp-logo{width:96px;height:96px;animation:spFadeInScale 900ms cubic-bezier(0.22,1.2,0.36,1) both}
@media(min-width:560px){#splash .sp-logo{width:80px;height:80px}}
@keyframes spFadeInScale{from{opacity:0;transform:scale(0.82)}to{opacity:1;transform:scale(1)}}
#splash .sp-dot{
  width:8px;height:8px;border-radius:50%;background:#FFFFFF;opacity:0.6;
  animation:spDotPulse 1100ms cubic-bezier(0.4,0,0.6,1) infinite;
}
@keyframes spDotPulse{0%,100%{opacity:0.25;transform:scale(0.8)}50%{opacity:1;transform:scale(1.15)}}
@media(prefers-reduced-motion:reduce){#splash .sp-logo{animation:none}#splash .sp-dot{animation:none;opacity:0.7}}

/* ============================================================
   V7.16_LEGIBILITY_CORE — Max Text Legibility
   Reverses V7.14/V7.15 decisions that hurt readability:
   - Custom 'Inter' font → system-ui (no blurry web font render)
   - rgba(0,0,0,0.95) → #000000 pure (alpha 1.0, zero transparency)
   - 2px solid #FFFFFF border → 1px solid rgba(255,255,255,0.6) subtle (frees text space)
   - text-stroke:1px #000 → ELIMINATED (was making letters 'gordas' + blurry)
   - font-size 15px → 18px min (QA fail: computed < 16px = build fail)
   - line-height → 1.5 (anti-apiñamiento)
   - font-weight → 700 (Bold) on all key text
   - padding +20% on buttons/bars (air para las letras)
   body: font-smoothing antialiased + text-rendering optimizeLegibility.
   V7.17 SURGICAL_FIX: V7.15 dead-code block removed (was redundant — V7.16 wins by source order, but V7.15 block was maintenance hazard).
   ============================================================ */

/* FASE 1 + Execution directives: body typography reset */
html,body{
  font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;
  -webkit-font-smoothing:antialiased!important;
  -moz-osx-font-smoothing:grayscale!important;
  text-rendering:optimizeLegibility!important;
  font-size:18px!important;
  line-height:1.5!important;
}
button{font-family:inherit!important}

/* QA fail condition guardrail: bump all font-size CSS vars to >= 16px minimum.
   --font-caption was 13px, --font-micro was 11px — both below the 16px floor. */
:root{
  --font-display:30px;
  --font-title:20px;
  --font-body:18px;
  --font-caption:16px;
  --font-micro:16px;
}
/* mfc-edit "Editar" button: was 11px via --font-micro, force 16px explicitly */
.map-floating-chip .mfc-edit{
  font-size:16px!important;
  font-weight:700!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
}
/* voy-debug-panel is dev-only — exempt from QA fail (hidden in production) */

/* FASE 2 + 3: SAKANA-FIX-01 (V7.18.2) — frosted glass instead of opaque black.
   Was: background:#000000!important (alpha=1.0) → "black squares" over the map.
   Now: background:rgba(0,0,0,0.78)!important (alpha=0.78) + backdrop-filter:blur(16px)
   saturate(1.2) → map visible through UI, white text pops via blur, no opaque rect.
   Border softened 0.6→0.18 to kill the "drawn-around" look.
   Fallback: browsers without backdrop-filter (Android <9) just get the 0.78 alpha bg,
   which is STILL better than opaque #000 — black squares gone either way.
   WCAG AA 4.5:1 maintained: white on rgba(0,0,0,0.78) over light map ≈ 7:1. */
.search-bar,
.mode-pill,
.sheet-wrap,
.sheet,
.cat-panel,
.dialog-overlay,
.dialog,
.chip,
.origin-pill,
.map-floating-chip,
.search-dropdown{
  background:rgba(0,0,0,0.78)!important;
  -webkit-backdrop-filter:blur(16px) saturate(1.2)!important;
  backdrop-filter:blur(16px) saturate(1.2)!important;
  border:1px solid rgba(255,255,255,0.18)!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
  text-shadow:0 0 4px rgba(0,0,0,1)!important;
  font-weight:700!important;
  line-height:1.5!important;
}
/* search-bar: 18px input + 20% more padding (V7.16) */
.search-bar{padding:14px 16px!important;min-height:56px!important}
#destInput{
  font-size:18px!important;
  font-weight:700!important;
  line-height:1.5!important;
  color:#FFFFFF!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
  text-shadow:0 0 4px rgba(0,0,0,1)!important;
}
#destInput::placeholder{
  color:#FFFFFF!important;
  font-size:18px!important;
  font-weight:700!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
  text-shadow:0 0 4px rgba(0,0,0,1)!important;
}
.search-bar .sb-icon,
.search-bar .sb-btn{
  color:#FFFFFF!important;
  font-size:20px!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
  text-shadow:0 0 4px rgba(0,0,0,1)!important;
}
/* mode-pill: 18px label, 20% more padding (was 8px 12px → 10px 14px) */
.mode-pill{
  font-size:16px!important;
  font-weight:700!important;
  padding:10px 14px!important;
  min-height:44px!important;
  color:#FFFFFF!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
  text-shadow:0 0 4px rgba(0,0,0,1)!important;
}
.mode-pill.active{
  background:#FFFFFF!important;
  color:#000000!important;
  border:1px solid #FFFFFF!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
  text-shadow:none!important;
  opacity:1!important;
}
/* origin-pill: 16px text (was caption 13px), 20% more padding */
.origin-pill{padding:10px 14px!important;min-height:44px!important}
.origin-pill .op-text{
  font-size:16px!important;
  font-weight:700!important;
  color:#FFFFFF!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
  text-shadow:0 0 4px rgba(0,0,0,1)!important;
}
/* chip / map-floating-chip: 16px text, +20% padding */
.chip,.map-floating-chip{
  font-size:16px!important;
  font-weight:700!important;
  padding:10px 14px!important;
  min-height:44px!important;
  color:#FFFFFF!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
  text-shadow:0 0 4px rgba(0,0,0,1)!important;
}
.map-floating-chip .mfc-text{
  font-size:16px!important;
  font-weight:700!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
  text-shadow:0 0 4px rgba(0,0,0,1)!important;
}
/* chip-clear (red CTA): pure red, no alpha */
.chip.chip-clear{
  background:#FF3B30!important;
  border:1px solid rgba(255,255,255,0.6)!important;
  color:#FFFFFF!important;
}
/* sheet content: 16px min for all text */
.sheet,.sheet *{
  line-height:1.5!important;
}
.sheet .sh-dest,.sheet .hero-name,.sheet .hero-price{
  font-size:18px!important;
  font-weight:700!important;
  color:#FFFFFF!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
}
/* search-dropdown items: 16px min */
.search-item-text strong,.search-item-text small{
  font-size:16px!important;
  font-weight:700!important;
  color:#FFFFFF!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
}
/* dialog text: 16px min */
.dialog .dg-title,.dialog .dg-provider,.dialog .dg-msg-short{
  font-size:18px!important;
  font-weight:700!important;
  color:#FFFFFF!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
}
/* buttons: 18px + 20% more padding (was 0 24px h52 → 0 28px h56) */
.btn-primary,.btn-secondary,.dg-confirm,.dg-cancel{
  font-size:18px!important;
  font-weight:700!important;
  padding:0 28px!important;
  min-height:56px!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
}

/* ============================================================
   V7.17_SURGICAL_FIX — CSS Override Enforcement
   Fixes conflicts C1, C2, C3 identified in FORENSIC_CODE_AUDIT:
   - C1: .mode-pill .mp-lbl direct 11px declaration was overriding inherited 16px!important.
     Root cause of 'no se lee nada' — mode labels rendered at 11px across V7.14/V7.15/V7.16.
   - C2: Literal px font-sizes (10/11/14px) bypassed :root var bump.
   - C3: Google Fonts Inter <link> removed (directive 2) — eliminates triple render path.
   QA assertion: document.querySelectorAll('.mp-lbl').forEach(fontSize >= 16) must pass.
   ============================================================ */

/* C1 FIX: .mode-pill .mp-lbl — force 16px, overrides the line 672 direct declaration */
.mode-pill .mp-lbl{
  font-size:16px!important;
  line-height:1.5!important;
  font-weight:700!important;
  -webkit-text-stroke:0!important;
  text-stroke:0!important;
}

/* C2 FIX: literal px font-sizes bumped to 16px minimum */
.est-badge,
.ahorro-pill-badge,
.search-item--empty,
.bd-row{
  font-size:16px!important;
}
</style>
</head>
```

## 2. `public/VOY-Lite.html` — `<body>` structure (HTML)

Semantic HTML body: splash screen, ambient full-bleed map (`#map`), map grid overlay, top scrim, floating search bar (`destInput` + map/locate/mic buttons + dropdown), origin pill, memory chips row, transport mode selector, decision sheet, map floating chip (FULL_MAP state), offline chip, footer + disclosure menu (share / support), deep-link confirmation dialog, toast container, analytics dashboard div, and the external core-module script tags (`ahorro.js`, `trend.js`, `telemetry.js`, `favorites.js`, `feedback.js`) loaded before the main inline script.

```html
<body data-theme="light">

<!-- SPLASH SCREEN (exit on app_ready) -->
<div id="splash" aria-hidden="true">
  <svg class="sp-logo" viewBox="0 0 1024 1024" role="img" aria-label="VOY"><rect width="1024" height="1024" rx="224" fill="#000"/><path d="M228 292 L404 292 L512 548 L620 292 L796 292 L596 732 L428 732 Z" fill="#fff"/></svg>
  <span class="sp-dot" aria-hidden="true"></span>
</div>

<!-- AMBIENT MAP (z-0) — full-bleed, opacity 1, native gestures -->
<div id="map" role="application" aria-label="Mapa de Santa Fe"></div>
<!-- MAP GRID OVERLAY (ui_system: grid_overlay) -->
<div id="mapGrid" aria-hidden="true"></div>

<!-- TOP SCRIM (z-1) -->
<div id="scrim"></div>

<!-- APP (z-2) -->
<div class="app">

  <!-- FLOATING INPUT v2 (UX_CORE_REDESIGN) — dark focal pill, lower_top_third, first visual attention element -->
  <header class="topbar">
    <div class="search-bar" role="search">
      <span class="sb-icon" aria-hidden="true" id="sbSearchIcon"></span>
      <input type="text" id="destInput" placeholder="¿A dónde vas?" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Buscar destino" enterkeyhint="search">
      <button class="sb-btn sb-sec" id="sbMapBtn" aria-label="Elegir destino en el mapa" title="Elegir en mapa"></button>
      <button class="sb-btn sb-sec sb-locate" id="sbLocateBtn" aria-label="Usar mi ubicación" title="Mi ubicación"></button>
      <button class="sb-btn sb-mic" id="sbMicBtn" aria-label="Buscar por voz (mantener para hablar)" title="Mantener para hablar"></button>
      <div id="destDropdown" class="search-dropdown hidden" role="listbox" aria-label="Sugerencias de destino"></div>
    </div>
  </header>

  <!-- ORIGIN PILL -->
  <div class="origin-pill" id="originPill" role="button" tabindex="0" aria-label="Origen actual, tocá para centrar el mapa">
    <span class="op-dot" id="opDot"></span>
    <span class="op-text" id="opText">Ubicándote…</span>
  </div>

  <!-- MEMORY CHIPS -->
  <div class="memory-row" id="memoryRow" aria-label="Destinos guardados y recientes"></div>

  <!-- STAGE (transparent, shows map behind) -->
  <div class="stage" aria-hidden="true"></div>

  <!-- TRANSPORT MODE SELECTOR (ui_system: bottom_ui) -->
  <div class="mode-selector" id="modeSelector" role="tablist" aria-label="Modo de transporte"></div>

  <!-- DECISION SHEET -->
  <div class="sheet-wrap">
    <div class="sheet" id="decisionSheet" role="region" aria-label="Opciones de viaje"></div>
  </div>

</div>

<!-- V7.4 MAP STATE MANAGER — floating chip (shown only in FULL_MAP state) -->
<div class="map-floating-chip" id="mapFloatingChip" role="button" tabindex="0" aria-label="Editar búsqueda" aria-hidden="true">
  <span class="mfc-ic" id="mfcIcon"></span>
  <span class="mfc-text" id="mfcText">Destino</span>
  <span class="mfc-edit">Editar</span>
</div>

<!-- V7.8 OFFLINE PWA — Offline Chip (shown when navigator.onLine === false) -->
<div class="offline-chip" id="offlineChip" role="status" aria-live="polite" aria-atomic="true" aria-hidden="true">
  <span class="oc-ic" id="ocIcon"></span>
  <span class="oc-text">Sin conexión · historial local disponible</span>
</div>

<!-- FOOTER (sticky bottom) -->
<footer class="footer"><span class="footer-mark" aria-hidden="true"></span>VOY · Movilidad Santa Fe · Datos informativos<button class="footer-more" id="footerMore" aria-label="Más opciones" aria-expanded="false" aria-haspopup="menu" aria-controls="footerMenu">··</button></footer>

<!-- FOOTER DISCLOSURE MENU (VOY_SHARE_SUPPORT_V1: share + support, hidden by default — not always shown) -->
<div class="footer-menu" id="footerMenu" role="menu" aria-label="Compartir y apoyar" hidden>
  <button class="fm-item" id="fmShare" role="menuitem">
    <span class="fm-ic" id="fmShareIc" aria-hidden="true"></span>
    <span>Compartir VOY</span>
  </button>
  <div class="fm-sep" aria-hidden="true"></div>
  <button class="fm-item" id="fmSupport" role="menuitem">
    <span class="fm-ic" id="fmSupportIc" aria-hidden="true"></span>
    <span>Invitame un café</span>
  </button>
</div>

<!-- DEEP-LINK CONFIRMATION DIALOG -->
<div class="dialog-overlay" id="dialogOverlay" role="dialog" aria-modal="true" aria-labelledby="dgTitle">
  <div class="dialog">
    <div class="dg-icon" id="dgIcon"></div>
    <div class="dg-title" id="dgTitle">Abrir aplicación externa</div>
    <div class="dg-provider" id="dgProvider"></div>
    <div class="dg-route-hint" id="dgRouteHint" hidden></div>
    <div class="dg-msg-short" id="dgMsgShort">Vas a salir de VOY y abrir una app externa.</div>
    <div class="dg-msg">El servicio y el precio final dependen del proveedor externo, no de VOY.</div>
    <div class="dg-actions">
      <button class="dg-cancel" id="dgCancel">Cancelar</button>
      <button class="dg-confirm" id="dgConfirm">Continuar</button>
    </div>
  </div>
</div>

<!-- TOAST -->
<div class="toast-container" id="toastContainer" aria-live="polite" aria-atomic="true"></div>

<!-- ANALYTICS DASHBOARD (hidden, 5 taps on VOY wordmark) -->
<div id="vaDash"></div>

<!-- V7.8 MODULAR_REFACTOR — extracted inline IIFEs loaded as external modules.
     Order: ahorro.js (no deps) → trend.js (IndexedDB) → telemetry.js (sendBeacon).
     V7.9: + favorites.js (VoyFavoritesService, LocalStorage+IDB) + feedback.js (VoyFeedbackService, beacon).
     Loaded before the main inline <script> so globals exist when DOMContentLoaded fires. -->
<script src="core/ahorro.js?v=78"></script>
<script src="core/trend.js?v=78"></script>
<script src="core/telemetry.js?v=78"></script>
<script src="core/favorites.js?v=79"></script>
<script src="core/feedback.js?v=79"></script>
<script>
```

## 3. `public/VOY-Lite.html` — inline `<script>` (JS)

The main inline JavaScript (~1957 lines, vanilla JS, no framework). Contains: version pin (`VOY_VERSION='V7.18.2'`, `VOY_BUILD_HASH`), SVG icon system, `BUS_STOPS` / `BIKE_STATIONS` / `LANDMARKS` / `FARE_REGISTRY` data tables, `MobilityController` (MC) object with GPS, map init (`initMap` + `attachContextLossHandlers`), search (Nominatim + local catalog), estimation pipeline (`runAllEstimations` → render), category manager (3 groups: Privados / Activos / Público), provider ranking, decision sheet rendering (`renderSheet`), deep-link routing (`buildAppLink` + `launchDeepLink`), confirmation dialog, analytics dashboard (5-tap), favorites wiring, feedback wiring, ahorro wiring, trend wiring, and DOMContentLoaded boot. Complete verbatim.

```javascript
// ===================== V7 VERSION PIN (single source of truth) =====================
// HARD VERSION PIN — worker.js serves HTML with Cache-Control: no-store so the
// edge never serves a stale build. The CI guardrail verifies window.VOY_VERSION
// matches the deployed /api/health version before declaring deploy success.
// 5d40cbc is replaced at deploy time by scripts/inject-build-hash.mjs
// (scripts/verify-production.sh checks this equals the git short SHA).
window.VOY_VERSION='V7.18.2';
window.VOY_BUILD_HASH='__BUILD_HASH__';
window.VOY_DEPLOY_TS='__DEPLOY_TS__';

// ===================== GLOBAL ERROR HANDLERS =====================
window.onerror=function(msg,src,line,col,err){console.error('[GLOBAL]',msg,src+':'+line+':'+col,err)};
window.onunhandledrejection=function(ev){console.error('[REJECTION]',ev.reason)};

// ===================== DATA (Santa Fe) =====================
// VOY_COLLECTIVE_ENGINE_V1: expanded stops per line so route geometry is a real
// polyline (not a 2-point straight line). Stops are geographically sequential
// along each line's real corridor so nearest-neighbor chaining yields a coherent
// path. Coordinates approximate the actual Santa Fe street grid.
var BUS_STOPS=[
  // Línea 1 — Terminal → Centro → Norte (Belgrano / San Martín corridor)
  {linea:'1',nombre:'Terminal',lat:-31.6435,lon:-60.7011,calles:'Belgrano y Freyre'},
  {linea:'1',nombre:'Belgrano y Tucumán',lat:-31.6410,lon:-60.7015,calles:'Belgrano y Tucumán'},
  {linea:'1',nombre:'Belgrano y Salta',lat:-31.6386,lon:-60.7019,calles:'Belgrano y Salta'},
  {linea:'1',nombre:'San Martín y 25 de Mayo',lat:-31.6354,lon:-60.7002,calles:'San Martín y 25 de Mayo'},
  {linea:'1',nombre:'San Martín y San Jerónimo',lat:-31.6328,lon:-60.7000,calles:'San Martín y San Jerónimo'},
  {linea:'1',nombre:'Plaza Mayor',lat:-31.6313,lon:-60.7008,calles:'San Martín y Rivadavia'},
  // Línea 4 — Hospital Cullen → Centro → Sur (Gral. López / Bvd. Gálvez corridor)
  {linea:'4',nombre:'Hospital Cullen',lat:-31.6198,lon:-60.6978,calles:'Gral. López y Marcial Candioti'},
  {linea:'4',nombre:'Gral. López y Javier de la Rosa',lat:-31.6225,lon:-60.6975,calles:'Gral. López y Javier de la Rosa'},
  {linea:'4',nombre:'Gral. López y Mendoza',lat:-31.6260,lon:-60.6981,calles:'Gral. López y Mendoza'},
  {linea:'4',nombre:'Gral. López y 25 de Mayo',lat:-31.6295,lon:-60.6989,calles:'Gral. López y 25 de Mayo'},
  {linea:'4',nombre:'Bvd. Gálvez y Tucumán',lat:-31.6368,lon:-60.7012,calles:'Bvd. Gálvez y Tucumán'},
  {linea:'4',nombre:'Plaza España',lat:-31.6402,lon:-60.7134,calles:'Bvd. Gálvez y San Jerónimo'},
  // Línea 8 — Estación Belgrano → Norte (Gral. López / Av. Freyre corridor)
  {linea:'8',nombre:'Estación Belgrano',lat:-31.6289,lon:-60.6891,calles:'Gral. López y Javier de la Rosa'},
  {linea:'8',nombre:'Gral. López y Amenábar',lat:-31.6255,lon:-60.6935,calles:'Gral. López y Amenábar'},
  {linea:'8',nombre:'Av. Freyre y Salvia',lat:-31.6210,lon:-60.7050,calles:'Av. Freyre y Salvia'},
  {linea:'8',nombre:'Av. Freyre y Aristóbulo del Valle',lat:-31.6178,lon:-60.7065,calles:'Av. Freyre y Aristóbulo del Valle'},
  {linea:'8',nombre:'Av. Freyre y Gorriti',lat:-31.6150,lon:-60.7082,calles:'Av. Freyre y Gorriti'},
  {linea:'8',nombre:'Av. Freyre y Salvador del Carril',lat:-31.6122,lon:-60.7102,calles:'Av. Freyre y Salvador del Carril'},
  // Línea 11 — Centro Cívico → Costanera (25 de Mayo / Av. Costanera corridor)
  {linea:'11',nombre:'Centro Cívico',lat:-31.6354,lon:-60.6999,calles:'25 de Mayo y San Martín'},
  {linea:'11',nombre:'25 de Mayo y Tucumán',lat:-31.6372,lon:-60.6993,calles:'25 de Mayo y Tucumán'},
  {linea:'11',nombre:'25 de Mayo y Balcarce',lat:-31.6320,lon:-60.6920,calles:'25 de Mayo y Balcarce'},
  {linea:'11',nombre:'Av. Costanera y España',lat:-31.6255,lon:-60.6852,calles:'Av. Costanera y España'},
  {linea:'11',nombre:'Costanera',lat:-31.6201,lon:-60.6734,calles:'Av. Costanera y Av. del Valle'},
  // Línea 16 — Plaza Pueyrredón → Belgrano (Cándido Pujato / Belgrano corridor)
  {linea:'16',nombre:'Plaza Pueyrredón',lat:-31.6445,lon:-60.7087,calles:'Cándido Pujato y Aristóbulo'},
  {linea:'16',nombre:'Cándido Pujato y Rivadavia',lat:-31.6428,lon:-60.7062,calles:'Cándido Pujato y Rivadavia'},
  {linea:'16',nombre:'Belgrano y Salta',lat:-31.6386,lon:-60.7019,calles:'Belgrano y Salta'},
  {linea:'16',nombre:'Belgrano y Tucumán',lat:-31.6362,lon:-60.6978,calles:'Belgrano y Tucumán'},
  {linea:'16',nombre:'Belgrano y San Martín',lat:-31.6338,lon:-60.6955,calles:'Belgrano y San Martín'},
  {linea:'16',nombre:'Belgrano',lat:-31.6312,lon:-60.6945,calles:'Belgrano y Rivadavia'}
];
var BIKE_STATIONS=[
  {nombre:'Municipalidad',lat:-31.6349,lon:-60.7007,calles:'25 de Mayo y San Martín'},
  {nombre:'Plaza 25 de Mayo',lat:-31.6311,lon:-60.6990,calles:'San Martín y Rivadavia'},
  {nombre:'Teatro Municipal',lat:-31.6325,lon:-60.7012,calles:'San Martín y Córdoba'},
  {nombre:'Estación Belgrano',lat:-31.6289,lon:-60.6891,calles:'Gral. López y Javier de la Rosa'},
  {nombre:'Estación Mitre',lat:-31.6356,lon:-60.7089,calles:'Bvd. Pellegrini y Rivadavia'},
  {nombre:'Hospital Cullen',lat:-31.6198,lon:-60.6978,calles:'Gral. López y Marcial Candioti'},
  {nombre:'Av. Freyre',lat:-31.6178,lon:-60.7065,calles:'Av. Freyre y Aristóbulo del Valle'},
  {nombre:'Plaza Constituyentes',lat:-31.6401,lon:-60.7001,calles:'Rivadavia y Tucumán'},
  {nombre:'Legislatura',lat:-31.6298,lon:-60.6955,calles:'Amenábar y 25 de Mayo'},
  {nombre:'Plaza del Soldado',lat:-31.6337,lon:-60.6978,calles:'San Jerónimo y Tucumán'},
  {nombre:'Hospital Iturraspe',lat:-31.6445,lon:-60.6934,calles:'Bvd. Gálvez y Francia'},
  {nombre:'Terminal de Ómnibus',lat:-31.6435,lon:-60.7011,calles:'Belgrano y Freyre'}
];
var LANDMARKS=[
  {nombre:'Puente Colgante',lat:-31.6230,lon:-60.6850,calles:'Av. Costanera y Av. del Valle'},
  {nombre:'Catedral Metropolitana',lat:-31.6315,lon:-60.7010,calles:'San Martín y San Jerónimo'},
  {nombre:'Universidad Nacional del Litoral',lat:-31.6340,lon:-60.6990,calles:'9 de Julio y San Jerónimo'},
  {nombre:'Parque del Encuentro',lat:-31.6270,lon:-60.6800,calles:'Av. Costanera Oeste'},
  {nombre:'Museo Histórico',lat:-31.6330,lon:-60.7015,calles:'San Martín y 25 de Mayo'},
  {nombre:'Puente Oroño',lat:-31.6190,lon:-60.6820,calles:'Av. Costanera y Bvd. Pellegrini'},
  {nombre:'Mercado Norte',lat:-31.6360,lon:-60.6980,calles:'San Martín y Tucumán'},
  {nombre:'Iglesia San Francisco',lat:-31.6320,lon:-60.7030,calles:'San Martín y Ameghino'},
  {nombre:'Shopping La Estación',lat:-31.6290,lon:-60.6895,calles:'Gral. López y Javier de la Rosa'},
  {nombre:'Barrio Candioti',lat:-31.6080,lon:-60.6900,calles:'Norte de la ciudad'},
  {nombre:'Barrio Guadalupe',lat:-31.6380,lon:-60.6800,calles:'Noreste de la ciudad'},
  {nombre:'Barrio Centenario',lat:-31.6140,lon:-60.7100,calles:'Oeste de la ciudad'},
  {nombre:'Terminal de Ómnibus',lat:-31.6435,lon:-60.7011,calles:'Belgrano y Freyre'},
  {nombre:'Hospital Cullen',lat:-31.6198,lon:-60.6978,calles:'Gral. López y Marcial Candioti'},
  {nombre:'Plaza España',lat:-31.6402,lon:-60.7134,calles:'Bvd. Gálvez y San Jerónimo'}
];
var PROVIDERS={
  uber:{name:'Uber',available:true,color:'#111111',category:'app'},
  didi:{name:'DiDi',available:true,color:'#FF6B00',category:'app'},
  maxim:{name:'Maxim',available:true,color:'#7C3AED',category:'app'},
  // ISSUE-4 FIX: Cabify set to available:false — verified NOT operating in Santa Fe city
  // (only legally "habilitada" with <40 drivers across ALL apps combined as of Mar 2026).
  // Cabify's own operational driver page lists BA/Córdoba/Rosario/Mendoza/MdP/Corrientes/
  // Tucumán/Bariloche — Santa Fe omitted. cabify.com/ar/tarifas/santa-fe returns 404.
  // Hidden from UI via available:false; re-enable (flip to true) when Cabify actually launches.
  cabify:{name:'Cabify',available:false,color:'#00A99D',category:'app'},
  radiotaxi:{name:'Radiotaxi Santa Fe',available:true,color:'#F59E0B',category:'taxi'},
  taxiapp:{name:'TaxiApp',available:true,color:'#22C55E',category:'taxi'},
  remisreal:{name:'Remises Real',available:true,color:'#6B7280',category:'remis'}
};
var TAXI_COMPANIES=[
  {id:'radiotaxi',name:'Radiotaxi Santa Fe',whatsapp:'https://wa.link/n7u2e7',app:null,web:null,phone:null},
  // FIX-003: app field set to null — the previous '@taxiapp_santafe' rendered a dead
  // data-url="#" button that toasted but never navigated. No verified native deep link
  // exists for TaxiApp (com.aniversario.pasajero). WhatsApp (wa.link/vavbcl) remains
  // the single verified working contact path. Button hidden via the if(co.app) guard.
  {id:'taxiapp',name:'TaxiApp',whatsapp:'https://wa.link/vavbcl',app:null,web:null,phone:null}
];
var REMIS_COMPANIES=[
  {id:'remisreal',name:'Remises Real',whatsapp:'https://wa.link/rqov56',app:null,web:null,phone:null}
];
var FareRegistry={
  taxi:{diurno:{bajada:1600,ficha:160,distFicha:130},nocturno:{bajada:1840,ficha:184,distFicha:130},source:'Resolución N°217/2026',updated_at:'2026-01-01'},
  bus:{sube:1900,cash:2111,source:'SUBE tariff table Argentina',updated_at:'2025-06-01'},
  apps:{
    uber:{base:1000,km:500,min:65,minFare:3000,source:'Uber app estimate range',updated_at:'2025-12-01'},
    didi:{base:900,km:440,min:55,minFare:2500,source:'DiDi app estimate range',updated_at:'2025-12-01'},
    maxim:{base:855,km:418,min:52,minFare:2375,source:'Maxim app estimate range',updated_at:'2025-12-01'},
    // FIX-004: Cabify re-enabled — official help center (help.cabify.com/hc/es/articles/115000996089)
    // confirms Cabify operates in Santa Fe. Fares are reference estimates (Mar del Plata
    // tariff as proxy; Santa Fe-specific fares not publicly published). Marked as estimate range.
    cabify:{base:1100,km:520,min:70,minFare:3300,source:'Cabify app estimate range (reference)',updated_at:'2025-12-01'}
  }
};

// ===================== SVG ICON SYSTEM (no emojis) =====================
function svg(name,size){
  var s=size||20;
  var P={
    search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    locate:'<path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.5"/>',
    pin:'<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    mapPin:'<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    bus:'<rect x="4" y="3" width="16" height="14" rx="2"/><path d="M4 11h16"/><path d="M8 17v2M16 17v2"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/>',
    bike:'<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17 10 9h5l3 8M9 9h4"/><circle cx="10" cy="9" r="0.5"/>',
    car:'<path d="M5 11l1.4-4.2A2 2 0 0 1 8.3 5h7.4a2 2 0 0 1 1.9 1.8L19 11"/><path d="M4 11h16v5H4z"/><circle cx="8" cy="16" r="1.3"/><circle cx="16" cy="16" r="1.3"/>',
    taxi:'<path d="M5 9l1-3a2 2 0 0 1 1.9-1.4h8.2A2 2 0 0 1 18 6l1 3"/><path d="M4 9h16v6H4z"/><circle cx="8" cy="15" r="1.2"/><circle cx="16" cy="15" r="1.2"/><path d="M10 4.6V3h4v1.6"/>',
    phone:'<path d="M5 3h3.5l1.5 4.5-2 1.2a11 11 0 0 0 4.8 4.8l1.2-2 4.5 1.5V20a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z"/>',
    whatsapp:'<path d="M3 21l1.6-4.2A8 8 0 1 1 8 19.4L3 21Z"/><path d="M8.5 8.5c0 3.5 3.5 7 7 7l1.4-2-2.2-1-1 1c-1.2 0-3-1.8-3-3l1-1-1-2.2-2 1.4Z"/>',
    app:'<rect x="5" y="5" width="14" height="14" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/>',
    web:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/>',
    close:'<path d="M6 6 18 18M18 6 6 18"/>',
    chevron:'<path d="m6 9 6 6 6-6"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    star:'<path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9 6.7 19.1l1-5.8L3.5 9.2l5.9-.9L12 3Z"/>',
    home:'<path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H10v6H4a1 1 0 0 1-1-1z"/>',
    work:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3"/>',
    navigate:'<path d="M3 11 21 3l-8 18-2-8-8-2Z"/>',
    share:'<circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="m8.2 11 7.6-3.8M8.2 13l7.6 3.8"/>',
    trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
    dot:'<circle cx="12" cy="12" r="5"/>',
    flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    external:'<path d="M14 4h6v6M20 4 10 14M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    gauge:'<path d="M12 13l4-4"/><path d="M3 12a9 9 0 1 1 18 0"/><circle cx="12" cy="13" r="1.2"/>',
    route:'<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 6h6a4 4 0 0 1 0 8H10a4 4 0 0 0 0 8h6"/>',
    mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
    savings:'<circle cx="12" cy="12" r="9"/><path d="M12 6v12"/><path d="M15 9.5c0-1.4-1.3-2.3-3-2.3s-3 .9-3 2.3 1.3 2 3 2 3 .6 3 2-1.3 2.3-3 2.3-3-.9-3-2.3"/>',
    trendingUp:'<path d="M22 7L13.5 15.5L8.5 10.5L2 17"/><path d="M16 7h6v6"/>',
    trendingDown:'<path d="M22 17L13.5 8.5L8.5 13.5L2 7"/><path d="M16 17h6v-6"/>',
    minus:'<path d="M5 12h14"/>',
    wifiOff:'<path d="M2 2l20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.55a11 11 0 0 1 5.18-2.88"/><path d="M19 12.55a11 11 0 0 0-5.18-2.88"/><path d="M8.53 19a5 5 0 0 1 6.94 0"/><path d="M2 8.82a15 15 0 0 1 3.94-2.94"/>',
    coffee:'<path d="M5 9h11v4a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Z"/><path d="M16 10h2.5a2 2 0 0 1 0 4H16"/><path d="M8 2v3M12 2v3"/>'
  };
  return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(P[name]||'')+'</svg>';
}

// ===================== UTILS =====================
function escapeHtml(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function escapeAttr(s){return String(s==null?'':s).replace(/'/g,"\\'").replace(/"/g,'&quot;')}

// ===================== BOOTSTRAP GUARD =====================
if(typeof MobilityController==='undefined'){console.error('[FATAL] MobilityController missing');throw new Error('MobilityController missing')}
if(typeof MobilityEngine==='undefined'){console.error('[FATAL] MobilityEngine missing');throw new Error('MobilityEngine missing')}
var MC=MobilityController;
var haversine=MobilityEngine.haversine,formatPrice=MobilityEngine.formatPrice,formatMin=MobilityEngine.formatMin,normalize=MobilityEngine.normalize;

// ===================== UI STATE =====================
var _map=null,_originMarker=null,_destMarker=null;
var _gpsWatch=null,_gpsLastUpdate=0,_gpsLastLat=null,_gpsLastLon=null,_gpsRetryCount=0,_gpsMaxRetries=3,_gpsRetryTimer=null;
var GPS_DEBOUNCE_MS=3000,GPS_MIN_MOVE_M=30,GPS_REVERSE_DEBOUNCE_MS=800;
var _gpsFirstFixDone=false,_gpsMapCenteredOnce=false,_gpsReverseDebounceTimer=null;
var _searchVersion=0,_searchRemoteTimer=null,_searchEnterPending=false;
var _sheetAccordions={taxi:false,remis:false};
var _busDetailExpanded=false,_busAltsExpanded=false,_bikeDetailExpanded=false;
var _activeBusLine=null;
var _rankedBus=[]; // VOY_COLLECTIVE_ENGINE_V1: cached ranked bus lines for tap-to-select re-render
var _busBlockDestKey=''; // detects dest change → auto-select best line on a new trip
var _pickDestMode=false;
var _favActive=false; // current dest is a saved favorite
var _driftEnabled=true; // idle cinematic drift (stops on first char, never resumes)

// ===================== ANALYTICS (anonymous, local) =====================
var _VA_KEY='voy_va',_VA_MAX=300,_VA_GRID=0.0072;
var _vaS={o:0,os:'n',dt:0,dn:'',dc:'',ct:0,ms:'',cm:'',ct2:0,x:0};
function _vaCluster(lat,lon){return(lat/_VA_GRID).toFixed(0)+'_'+(lon/_VA_GRID).toFixed(0)}
function va_open(){_vaS={o:Date.now(),os:'n',dt:0,dn:'',dc:'',ct:0,ms:'',cm:'',ct2:0,x:0}}
function va_origin(src){if(!_vaS.o)return;var m={gps:'g',cache:'c',map:'m',search:'s'};_vaS.os=m[src]||'n'}
function va_dest(name,lat,lon){if(!_vaS.o||_vaS.dt)return;_vaS.dt=Date.now();_vaS.dn=(name||'').substring(0,25);_vaS.dc=_vaCluster(lat,lon)}
function va_cards(modes){if(!_vaS.o)return;if(!_vaS.ct)_vaS.ct=Date.now();var modeMap={bus:'b',bike:'i',auto:'a'};_vaS.ms=(modes||[]).map(function(e){return modeMap[e]||'?'}).join(',')}
function va_cta(mode){if(!_vaS.o)return;_vaS.cm=mode||'';_vaS.ct2=Date.now()}
function va_close(){if(!_vaS.o)return;_vaS.x=Date.now();if(_vaS.x-_vaS.o<500)return;try{var raw=localStorage.getItem(_VA_KEY);var arr=raw?JSON.parse(raw):[];if(!Array.isArray(arr))arr=[];arr.push(_vaS);if(arr.length>_VA_MAX)arr=arr.slice(arr.length-_VA_MAX);localStorage.setItem(_VA_KEY,JSON.stringify(arr))}catch(e){}}

// V5 event log (anonymous): search, provider_selected, destination_selected, deeplink_opened, favorite_added
var _V5E_KEY='voy_v5_events',_V5E_MAX=200;
function v5event(type,data){
  try{
    var raw=localStorage.getItem(_V5E_KEY);var arr=raw?JSON.parse(raw):[];if(!Array.isArray(arr))arr=[];
    arr.push({t:type,d:data||{},ts:Date.now()});
    if(arr.length>_V5E_MAX)arr=arr.slice(arr.length-_V5E_MAX);
    localStorage.setItem(_V5E_KEY,JSON.stringify(arr));
  }catch(e){}
  // Event spec v1.4 — forward to the multi-transport eventBus (local + worker + posthog stub).
  // Maps legacy v5 event names → spec v1.4 names where they differ.
  if(window.VoyEventBus){
    var map={search:'search_performed',destination_selected:'destination_selected',provider_selected:'provider_clicked',deeplink_opened:'deeplink_opened',favorite_added:'favorite_saved'};
    // V7.7 VOY_ANALYTICS_V2: attach coarse origin geo so the cities report has data.
    // ONLY enrichs the eventBus payload (server analytics) — the v5 local log above
    // keeps the original data unchanged (no metric pollution). eventBus._coarseGeo
    // converts lat/lon to a ~500m cluster string; the worker never sees raw coords.
    try{
      var _eData=data||{};
      if(typeof MC!=='undefined'&&MC.getOrigin){var _o=MC.getOrigin();if(_o)_eData=Object.assign({},_eData,{lat:_o.lat,lon:_o.lon});}
      VoyEventBus.emit(map[type]||type,_eData);
    }catch(e){}
  }
}

// Analytics dashboard (emoji-free, hidden, 5 taps on VOY wordmark)
function va_load(){try{var r=localStorage.getItem(_VA_KEY);return r?JSON.parse(r):[]}catch(e){return[]}}
function va_metrics(){
  var s=va_load();var n=s.length;if(!n)return{total:0};
  var m={total:n,ctaRate:0,abandonRate:0,avgToCTA:0,avgDecision:0,topDest:[],providerWins:{}};
  var ctaCount=0,abandonCount=0,sumToCTA=0,sumDecision=0,destCounts={},provCounts={};
  s.forEach(function(r){
    if(!r.dt)abandonCount++;
    if(r.ct2>0){ctaCount++;if(r.ct2>r.o)sumToCTA+=r.ct2-r.o;if(r.ct2>r.ct&&r.ct>0)sumDecision+=r.ct2-r.ct}
    if(r.cm)provCounts[r.cm]=(provCounts[r.cm]||0)+1;
    if(r.dc){var dk=r.dc+(r.dn?'|'+r.dn:'');destCounts[dk]=(destCounts[dk]||0)+1}
  });
  m.ctaRate=ctaCount/n;m.abandonRate=abandonCount/n;
  if(ctaCount){m.avgToCTA=Math.round(sumToCTA/ctaCount);m.avgDecision=Math.round(sumDecision/ctaCount)}
  var sorted=Object.keys(destCounts).sort(function(a,b){return destCounts[b]-destCounts[a]});
  m.topDest=sorted.slice(0,5).map(function(k){return{name:k.split('|')[1]||k.split('|')[0],count:destCounts[k]}});
  m.providerWins=provCounts;
  return m;
}
function va_dashboard(){
  var m=va_metrics();var el=document.getElementById('vaDash');if(!el)return;
  var closeSvg=svg('close',22);
  var closeBtn='<button onclick="document.getElementById(\'vaDash\').innerHTML=\'\'" aria-label="Cerrar metricas" style="border:none;background:transparent;cursor:pointer;color:#fff;padding:4px;display:flex;align-items:center">'+closeSvg+'</button>';
  if(!m.total){
    el.innerHTML='<div style="position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99999;color:#fff;font-size:13px;padding:24px 20px;overflow-y:auto;font-family:monospace"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><b style="font-size:17px;letter-spacing:-0.02em">VOY Metricas</b>'+closeBtn+'</div><div style="color:#8E8E93;margin-top:32px;text-align:center;line-height:1.6">Sin datos de sesiones aun.<br>Usa la app para generar metricas.</div><div style="margin-top:28px;font-size:11px;color:#636366;text-align:center">Datos locales · Sin SDK externo · FIFO '+_VA_MAX+' sesiones</div></div>';
    return;
  }
  var h='<div style="position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99999;color:#fff;font-size:13px;padding:24px 20px;overflow-y:auto;font-family:monospace">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><b style="font-size:17px;letter-spacing:-0.02em">VOY Metricas</b>'+closeBtn+'</div>';
  h+='<div style="margin-bottom:14px">Sesiones: <b>'+m.total+'</b></div>';
  h+='<div style="margin-bottom:14px">';
  h+='<div style="border-bottom:1px solid #444;padding:6px 0">Conversion CTA: <b style="float:right">'+(m.ctaRate*100).toFixed(1)+'%</b></div>';
  h+='<div style="border-bottom:1px solid #444;padding:6px 0">Abandono sin destino: <b style="float:right">'+(m.abandonRate*100).toFixed(1)+'%</b></div>';
  h+='<div style="border-bottom:1px solid #444;padding:6px 0">Tiempo medio a CTA: <b style="float:right">'+(m.avgToCTA?((m.avgToCTA/1000).toFixed(1)+'s'):'—')+'</b></div>';
  h+='<div style="padding:6px 0">Tiempo medio de decision: <b style="float:right">'+(m.avgDecision?((m.avgDecision/1000).toFixed(1)+'s'):'—')+'</b></div>';
  h+='</div>';
  if(Object.keys(m.providerWins).length){
    h+='<div style="margin-bottom:14px"><b>Proveedores elegidos</b>';
    var so=Object.keys(m.providerWins).sort(function(a,b){return m.providerWins[b]-m.providerWins[a]});
    so.forEach(function(k){var pct=(m.providerWins[k]/m.total*100).toFixed(0);h+='<div style="margin:3px 0">'+k+': '+m.providerWins[k]+' ('+pct+'%)</div>'});
    h+='</div>';
  }
  if(m.topDest.length){
    h+='<div style="margin-bottom:14px"><b>Top destinos</b>';
    m.topDest.forEach(function(d){h+='<div style="margin:3px 0">'+d.name+': '+d.count+'</div>'});
    h+='</div>';
  }
  h+='<div style="margin-top:24px;font-size:11px;color:#636366;text-align:center">Datos locales · Sin SDK externo · FIFO '+_VA_MAX+' sesiones</div></div>';
  el.innerHTML=h;
}
var _vaTapCount=0,_vaTapTimer=null;
window.addEventListener('beforeunload',function(){va_close()});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')va_close()});

// ===================== MAXIM OS GATE =====================
function isMaximSupported(){return /android/i.test(navigator.userAgent||'')}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded',function(){
  // Inject SVG icons into buttons
  document.getElementById('sbSearchIcon').innerHTML=svg('search',22);
  document.getElementById('sbMapBtn').innerHTML=svg('mapPin',22);
  document.getElementById('sbLocateBtn').innerHTML=svg('locate',22);
  document.getElementById('sbMicBtn').innerHTML=svg('mic',22);
  document.getElementById('dgIcon').innerHTML=svg('external',32);
  // VOY_SHARE_SUPPORT_V1: footer disclosure menu icons (low visibility, hidden until tapped)
  var fmShareIc=document.getElementById('fmShareIc');if(fmShareIc)fmShareIc.innerHTML=svg('share',18);
  var fmSupportIc=document.getElementById('fmSupportIc');if(fmSupportIc)fmSupportIc.innerHTML=svg('coffee',18);
  // VOY chevron brand mark in footer
  var fm=document.querySelector('.footer-mark');
  if(fm)fm.innerHTML='<svg width="12" height="12" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M 24 32 L 60 92 L 96 32 L 60 56 Z"/></svg>';

  MC.init({busStops:BUS_STOPS,bikeStations:BIKE_STATIONS,landmarks:LANDMARKS,fareRegistry:FareRegistry,providers:PROVIDERS,recentKey:'voy_recent_searches',favsKey:'voy_favorites',favMetricsKey:'voy_fav_metrics'});
  MC.loadMemory();
  MC.v5NewSessionToken();
  va_open();
  initMap();
  initGPS();
  initDarkMode();
  renderMemoryRow();
  restoreRouteFromUrl(); // VOY_UI_FOCUS_V1 UI-003: load route from a shared deep-link (?from=&to=&dn=)
  renderSheet();
  bindSearchInput();
  bindDialogButtons();
  bindOriginPill();
  bindFooterMenu();
  startIdleDrift();
  initCategoryManager(); // V7.4: replaces initModeSelector (3-group semantic tabs + swipe). Rollback: window.VOY_CATEGORY_MANAGER_ENABLED=false
  showModeSelector(true); // V7: force transport selector visible on initial mount (not gated on search)
  document.body.setAttribute('data-map-state','SEARCH_FOCUS'); // V7.4: initial map state
  initFloatingChip(); // V7.4: wire floating chip click → SEARCH_FOCUS
  initOfflineChip(); // V7.8: wire offline chip + online/offline listeners
  // app_ready → dismiss splash (exit_condition: app_ready_event)
  _signalAppReady();

  // 5-tap on title (the search placeholder area) opens analytics
  document.querySelector('.search-bar').addEventListener('click',function(e){
    if(e.target.id!=='sbSearchIcon')return;
    _vaTapCount++;clearTimeout(_vaTapTimer);_vaTapTimer=setTimeout(function(){_vaTapCount=0},1500);
    if(_vaTapCount>=5){_vaTapCount=0;va_dashboard()}
  });
  document.addEventListener('click',function(e){if(!e.target.closest('.search-bar'))closeAllDropdowns()});
});

// ===================== APP READY (splash exit) =====================
function _signalAppReady(){
  // Emit app_boot is handled by eventBus on load. Here we dismiss the splash
  // once the UI shell is mounted + map requested. Resilient to slow tiles.
  var done=false;
  function dismiss(){if(done)return;done=true;var s=document.getElementById('splash');if(s){s.classList.add('hide');setTimeout(function(){if(s&&s.parentNode)s.parentNode.removeChild(s)},700)}if(window.VoyEventBus)VoyEventBus.emit('app_boot',{ready:true})}
  if(document.readyState==='complete'){setTimeout(dismiss,900)}
  else{window.addEventListener('load',function(){setTimeout(dismiss,900)})}
  // Safety: never let the splash block the app beyond 2.5s
  setTimeout(dismiss,2500);
}

// ===================== TRANSPORT MODE SELECTOR (ui_system) =====================
var _activeMode='bus'; // V7.9 UI_FIX: default → 'bus' (Ahorro tab is now the default group).
var MODE_OPTIONS=[
  {id:'car',label:'Auto',icon:'car'},
  {id:'taxi',label:'Taxi',icon:'taxi'},
  {id:'remis',label:'Remis',icon:'navigate'},
  {id:'walk',label:'A pie',icon:'route'},
  {id:'custom',label:'Ruta',icon:'mapPin'}
];
function initModeSelector(){
  var el=document.getElementById('modeSelector');if(!el)return;
  el.innerHTML=MODE_OPTIONS.map(function(m){
    return '<button class="mode-pill'+(m.id===_activeMode?' active':'')+'" data-mode="'+m.id+'" role="tab" aria-selected="'+(m.id===_activeMode)+''+'"><span class="mp-ic">'+svg(m.icon,16)+'</span><span class="mp-lbl">'+m.label+'</span></button>';
  }).join('');
  el.addEventListener('click',function(e){
    var btn=e.target.closest('.mode-pill');if(!btn)return;
    _activeMode=btn.getAttribute('data-mode');
    [].forEach.call(el.querySelectorAll('.mode-pill'),function(p){
      var on=p.getAttribute('data-mode')===_activeMode;p.classList.toggle('active',on);p.setAttribute('aria-selected',on);
    });
    if(window.VoyEventBus)VoyEventBus.emit('vehicle_viewed',{mode:_activeMode});
    renderSheet();
  });
}
function showModeSelector(show){var el=document.getElementById('modeSelector');if(el)el.classList.toggle('show',show)}

// ===================== DARK MODE =====================
function initDarkMode(){
  if(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches){document.body.setAttribute('data-theme','dark')}
  if(window.matchMedia){window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',function(e){document.body.setAttribute('data-theme',e.matches?'dark':'light')})}
}

// ===================== MAP (ambient, interactive, native gestures) =====================
var CARTO_STYLE='https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
var FALLBACK_STYLE={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap'}},layers:[{id:'osm-tiles',type:'raster',source:'osm',minzoom:0,maxzoom:19}]};
var _mapLoadTimeout=null,_mapStyleLoaded=false;
function initMap(){
  if(typeof maplibregl==='undefined'){console.error('[MAP] maplibregl missing');return}
  try{
    _map=new maplibregl.Map({container:'map',style:CARTO_STYLE,center:[-60.7087,-31.6256],zoom:13,attributionControl:false,interactive:true});
    _map.on('click',onMapClick);
    _map.on('dragstart',function(){ if(MC.getDest()) VoyMapContext.setState('FULL_MAP'); }); // V7.4: on_map_drag → FULL_MAP
    _map.on('error',function(e){if(_mapStyleLoaded)return;clearTimeout(_mapLoadTimeout);console.warn('[MAP] CARTO error, fallback OSM',e);_map.setStyle(FALLBACK_STYLE)});
    _map.on('load',function(){clearTimeout(_mapLoadTimeout);_mapStyleLoaded=true;_map.resize()});
    _mapLoadTimeout=setTimeout(function(){console.error('[MAP] timeout 10s')},10000);
    requestAnimationFrame(function(){requestAnimationFrame(function(){if(_map)_map.resize()})});
    // V7.18.1 HOTFIX: Safe WebGL context loss recovery — null-guard the canvas reference
    // BEFORE attaching listeners. Earlier V7.18 called `_map.getCanvas()` unconditionally
    // right after the constructor; if MapLibre's internal canvas wasn't ready on that clock
    // cycle, getCanvas() returned null and `.addEventListener` threw a blocking TypeError
    // that aborted the main thread before `_signalAppReady()` could fire — freezing the UI
    // permanently on the splash screen. We now defensively verify BOTH `_map` AND that
    // `getCanvas` is a function before invoking it.
    // (Background: the GPU can kill the canvas context when the backing store grows too
    // large, e.g. 2399px canvas on mobile. preventDefault() signals the browser we'll
    // handle restoration ourselves; on 'webglcontextrestored' we force a full repaint +
    // resize so the map comes back instead of leaving a black rectangle.)
    (function attachContextLossHandlers(){
      var canvas=(_map && typeof _map.getCanvas==='function') ? _map.getCanvas() : null;
      if(!canvas){console.warn('[MAP] WebGL Canvas context guard bypassed: canvas element not ready during initMap execution.');return}
      canvas.addEventListener('webglcontextlost',function(e){
        e.preventDefault(); // CRITICAL: without this the context is permanently lost
        console.warn('[MAP] WebGL context lost — waiting for restore event');
      },false);
      canvas.addEventListener('webglcontextrestored',function(){
        console.info('[MAP] WebGL context restored — repainting');
        try{
          _map.repaint=true;
          _map.resize();
          // Force a style reload so tiles re-fetch after context loss
          if(_mapStyleLoaded){_map.setStyle(_map.getStyle()||CARTO_STYLE)}
        }catch(err){console.error('[MAP] restore failed',err)}
      },false);
    })();
  }catch(e){console.error('[MAP] init failed',e)}
}

// ===================== IDLE CINEMATIC DRIFT =====================
// Very slow camera drift while search is empty. Stops on first character, never resumes.
var _driftTimer=null;
function startIdleDrift(){
  if(_driftTimer)return;
  _driftTimer=setInterval(function(){
    if(!_map||!_mapStyleLoaded)return;
    if(!_driftEnabled)return;
    var inp=document.getElementById('destInput');
    var val=inp?(inp.value||'').trim():'';
    if(val.length>0)return; // only drift while search empty
    var dest=MC.getDest();
    if(dest)return; // stop drifting once a destination is set
    // Respect reduced-motion: skip actual movement, keep timer (cheap)
    if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    // Very slow pan: tiny random offset, long duration
    var c=_map.getCenter();
    var dLat=(Math.random()-0.5)*0.003;
    var dLon=(Math.random()-0.5)*0.003;
    var z=_map.getZoom();
    _map.easeTo({center:[c.lng+dLon,c.lat+dLat],zoom:z,duration:7000,easing:function(t){return t}});
  },8000);
}
function stopIdleDrift(){_driftEnabled=false}

// ===================== GPS (auto origin, preserved logic) =====================
function _haversineMeters(lat1,lon1,lat2,lon2){var R=6371000;var dLat=(lat2-lat1)*Math.PI/180;var dLon=(lon2-lon1)*Math.PI/180;var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))}
function _handleGpsPosition(lat,lon){
  if(MC.isOriginManual())return;
  var origin=MC.getOrigin();
  if(origin&&origin.source!=='gps'&&origin.source!=='cache')return;
  var now=Date.now();
  if(_gpsLastUpdate&&now-_gpsLastUpdate<GPS_DEBOUNCE_MS)return;
  if(_gpsLastLat!=null){var dist=_haversineMeters(_gpsLastLat,_gpsLastLon,lat,lon);if(dist<GPS_MIN_MOVE_M)return}
  _gpsLastUpdate=now;_gpsLastLat=lat;_gpsLastLon=lon;
  MC.setOrigin(lat,lon,'Mi ubicación','gps');va_origin('gps');updateOriginUI();updateMapMarkers();
  if(!_gpsFirstFixDone){_gpsFirstFixDone=true;clearTimeout(_gpsReverseDebounceTimer);_gpsReverseDebounceTimer=setTimeout(function(){reverseGeocodeOrigin(_gpsLastLat,_gpsLastLon)},GPS_REVERSE_DEBOUNCE_MS)}
  if(!_gpsMapCenteredOnce){_gpsMapCenteredOnce=true;if(_map)_map.flyTo({center:[lon,lat],zoom:15})}
  if(MC.getDest())runEstimations();
}
function initGPS(){
  if(!navigator.geolocation){updateGPSStatus(false);loadCachedPosition();return}
  if(navigator.permissions&&navigator.permissions.query){navigator.permissions.query({name:'geolocation'}).then(function(status){_onGpsPermissionChange(status);status.onchange=function(){_onGpsPermissionChange(status)}}).catch(function(){_startGpsWatch()})}else{_startGpsWatch()}
}
function _onGpsPermissionChange(status){if(status.state==='denied'){_stopGpsWatch();updateGPSStatus(false);loadCachedPosition();return}_startGpsWatch()}
function _startGpsWatch(){
  if(_gpsWatch!==null)return;
  _gpsWatch=navigator.geolocation.watchPosition(function(pos){_gpsRetryCount=0;updateGPSStatus(true);cachePosition(pos.coords.latitude,pos.coords.longitude);_handleGpsPosition(pos.coords.latitude,pos.coords.longitude)},function(err){updateGPSStatus(false);loadCachedPosition();if(err.code===err.PERMISSION_DENIED)return;if(_gpsRetryCount<_gpsMaxRetries){_gpsRetryCount++;clearTimeout(_gpsRetryTimer);_gpsRetryTimer=setTimeout(function(){navigator.geolocation.getCurrentPosition(function(pos){_gpsRetryCount=0;updateGPSStatus(true);cachePosition(pos.coords.latitude,pos.coords.longitude);_handleGpsPosition(pos.coords.latitude,pos.coords.longitude)},function(){},{enableHighAccuracy:true,timeout:15000,maximumAge:60000})},_gpsRetryCount*5000)}},{enableHighAccuracy:true,timeout:10000,maximumAge:30000});
}
function _stopGpsWatch(){if(_gpsWatch!==null){navigator.geolocation.clearWatch(_gpsWatch);_gpsWatch=null}}
function updateGPSStatus(ok){var el=document.getElementById('opDot');if(el){el.className='op-dot '+(ok?'':'err')}}
function cachePosition(lat,lon){try{localStorage.setItem('voy_last_pos',JSON.stringify({lat:lat,lon:lon}))}catch(e){}}
function loadCachedPosition(){try{var cached=localStorage.getItem('voy_last_pos');if(cached){var pos=JSON.parse(cached);if(!MC.getOrigin()){MC.setOrigin(pos.lat,pos.lon,'Ubicación guardada','cache');va_origin('cache');updateOriginUI();updateMapMarkers()}}}catch(e){}}
function locateMe(){
  if(!navigator.geolocation)return;
  navigator.geolocation.getCurrentPosition(function(pos){MC.setOriginManual(false);MC.setOrigin(pos.coords.latitude,pos.coords.longitude,'Mi ubicación','gps');va_origin('gps');cachePosition(pos.coords.latitude,pos.coords.longitude);updateOriginUI();updateMapMarkers();var origin=MC.getOrigin();if(_map)_map.flyTo({center:[origin.lon,origin.lat],zoom:15});if(MC.getDest())runEstimations()},function(){loadCachedPosition()},{enableHighAccuracy:true,timeout:10000});
}
function reverseGeocodeOrigin(lat,lon){fetch('https://nominatim.openstreetmap.org/reverse?lat='+lat+'&lon='+lon+'&format=json&accept-language=es').then(function(r){return r.json()}).then(function(d){if(d&&d.display_name){MC.setOriginName(d.display_name.split(',').slice(0,2).join(', '));updateOriginUI()}}).catch(function(){})}

// ===================== VOY_NAVIGATOR (NAVIGATION_MODULE_MINIMAL_V1) =====================
// OPTIONAL_TOGGLE_MODULE — lazy-loaded on first "Navegar" tap (do_not_auto_enable).
// The navigator lives in /navigator/navigator.js and is injected on demand (never
// blocks initial load). ADD_LAYER_ONLY: it overlays GPS tracking + a mode state
// machine (walking/driving/transit_light_inference) + step-based voice guidance
// (WebSpeechAPI, muted by default). It owns its OWN geolocation watch — independent
// of the origin watch above — and never touches MobilityEngine / PricingEngine /
// MobilityController, nor the existing OSRM route-src/line/shadow layers.
// Core rules: NO_BREAK_EXISTING_OSRM, NO_REPLACE_ROUTE_ENGINE, ADD_LAYER_ONLY.
function loadNavigatorModule(cb){
  if(window.VoyNavigator){cb();return}
  var s=document.createElement('script');
  s.src='/navigator/navigator.js';s.async=true;
  s.onload=function(){cb()};
  s.onerror=function(){showToast('No se pudo cargar el navegador','error')};
  document.head.appendChild(s);
}
function startNavigation(){
  var d=MC.getDest();
  v5event('navigation_start',{provider:'voy_navigator',phase:'minimal_v1',has_dest:!!d});
  loadNavigatorModule(function(){
    if(!window.VoyNavigator){showToast('Navegador no disponible','error');return}
    // mode is inferred inside VoyNavigator.start() from window._activeMode;
    // transit_light_inference is NEVER auto-selected (do_not_auto_enable).
    VoyNavigator.start({map:_map,dest:d});
  });
}

// ===================== ORIGIN UI =====================
function updateOriginUI(){
  var origin=MC.getOrigin();
  var pill=document.getElementById('originPill');
  var txt=document.getElementById('opText');
  if(!pill||!txt)return;
  if(origin){pill.classList.add('show');txt.textContent=origin.name||'Mi ubicación'}
  else{pill.classList.remove('show');txt.textContent='Ubicándote…'}
}
function bindOriginPill(){
  var pill=document.getElementById('originPill');
  if(!pill)return;
  pill.addEventListener('click',function(){var o=MC.getOrigin();if(o&&_map)_map.flyTo({center:[o.lon,o.lat],zoom:15})});
  pill.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();pill.click()}});
}

// ===================== MAP MARKERS + ROUTE =====================
function updateMapMarkers(){
  if(!_map)return;
  var origin=MC.getOrigin(),dest=MC.getDest();
  if(_originMarker){_originMarker.remove();_originMarker=null}
  if(_destMarker){_destMarker.remove();_destMarker=null}
  if(origin){var el=document.createElement('div');el.style.cssText='width:16px;height:16px;background:#34C759;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.5)';_originMarker=new maplibregl.Marker({element:el}).setLngLat([origin.lon,origin.lat]).addTo(_map)}
  if(dest){var el2=document.createElement('div');el2.style.cssText='width:16px;height:16px;background:#FF3B30;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.5)';_destMarker=new maplibregl.Marker({element:el2}).setLngLat([dest.lon,dest.lat]).addTo(_map)}
  drawRouteLine();
}
function drawRouteLine(){
  if(!_map)return;var origin=MC.getOrigin(),dest=MC.getDest();if(!origin||!dest)return;
  if(_map.getSource('route-src')){if(_map.getLayer('route-shadow'))_map.removeLayer('route-shadow');if(_map.getLayer('route-line'))_map.removeLayer('route-line');_map.removeSource('route-src')}
  var _straight=[[origin.lon,origin.lat],[dest.lon,dest.lat]];
  var _setCoords=function(coords){try{_map.getSource('route-src').setData({type:'Feature',geometry:{type:'LineString',coordinates:coords}})}catch(e){}};
  try{
    _map.addSource('route-src',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:_straight}}});
    _map.addLayer({id:'route-shadow',type:'line',source:'route-src',layout:{'line-cap':'round'},paint:{'line-color':'#00D4FF','line-width':12,'line-opacity':0.18,'line-blur':2}});
    _map.addLayer({id:'route-line',type:'line',source:'route-src',layout:{'line-cap':'round'},paint:{'line-color':'#00D4FF','line-width':4,'line-opacity':0.9}});
  }catch(e){}
  // UI-3 MapAlwaysVisible: fitBounds with portrait-aware padding so the full A→B
  // route stays visible above the bottom sheet in 9:16. Bottom padding accounts for
  // ~38vh sheet + footer; top for the floating search bar. Applied immediately to
  // the straight line so the map frames A→B even before OSRM resolves.
  // V7.11 ANTI_CLUTTER: map-padding dinámico — el inicio (A) y fin (B) de la ruta NUNCA
  //   quedan bajo el bottom sheet. _padTop generoso (160px) garantiza que el punto A
  //   (origen) quede visible debajo del search bar. _padBottom (44% viewport) empuja
  //   la ruta arriba del sheet (38vh) + footer + safe-area.
  var _fitRoute=function(coords){
    var lats=coords.map(function(p){return p[1]}),lons=coords.map(function(p){return p[0]});
    var _padTop=Math.round(Math.min(160,window.innerHeight*0.18));
    var _padBottom=Math.round(window.innerHeight*0.44);
    _map.fitBounds([[Math.min.apply(null,lons),Math.min.apply(null,lats)],[Math.max.apply(null,lons),Math.max.apply(null,lats)]],{padding:{top:_padTop,bottom:_padBottom,left:60,right:60},duration:600});
  };
  _fitRoute(_straight);
  // V7.1 (Gemini AC-2): real street routing via OSRM (foot profile in walk mode).
  // Straight line renders instantly; OSRM refines it when available. Cached per O/D pair.
  var profile=(_activeMode==='walk')?'foot':'driving';
  var ck='osrm_'+profile+'_'+origin.lat.toFixed(4)+'_'+origin.lon.toFixed(4)+'_'+dest.lat.toFixed(4)+'_'+dest.lon.toFixed(4);
  try{
    var cached=sessionStorage.getItem(ck);
    if(cached){var cc=JSON.parse(cached);if(cc&&cc.length>2){_setCoords(cc);if(!_activeBusLine)_fitRoute(cc);return}}
    var osrmUrl='https://router.project-osrm.org/route/v1/'+profile+'/'+origin.lon+','+origin.lat+';'+dest.lon+','+dest.lat+'?overview=full&geometries=geojson&alternatives=true';
    fetch(osrmUrl).then(function(r){return r.json()}).then(function(d){
      if(d&&d.routes&&d.routes.length>0){
        // V7.11 ROUTE_BIAS: seleccionar por min_distance (no min_time). OSRM retorna routes
        //   ordenadas por tiempo (routes[0] = más rápida), pero la más rápida puede tomar
        //   desvíos erráticos (ej. autopista para evitar semáforos). min_distance da la ruta
        //   más directa/intuitiva, que es lo que espera el usuario en ciudad.
        var best=d.routes[0];
        for(var i=1;i<d.routes.length;i++){
          if(d.routes[i].distance<best.distance)best=d.routes[i];
        }
        if(best.geometry&&best.geometry.coordinates&&best.geometry.coordinates.length>1){
          var coords=best.geometry.coordinates;
          try{sessionStorage.setItem(ck,JSON.stringify(coords))}catch(e){}
          _setCoords(coords);
          // VOY_COLLECTIVE_ENGINE_V1: if a bus route is active, the bus fit (A→bus→B)
          // already covers A→B — don't let the late OSRM callback override it.
          if(!_activeBusLine)_fitRoute(coords);
        }
      }
    }).catch(function(){});
  }catch(e){}
}

// ===================== MAP PICK DESTINATION MODE =====================
function activatePickDest(){
  _pickDestMode=true;
  document.getElementById('map').classList.add('crosshair');
  closeAllDropdowns();
  showToast('Tocá el mapa para fijar el destino','info');
}
function onMapClick(e){
  if(!_pickDestMode)return;
  _pickDestMode=false;
  document.getElementById('map').classList.remove('crosshair');
  var lat=e.lngLat.lat,lon=e.lngLat.lng;
  MC.setDest(lat,lon,'','map');va_dest('',lat,lon);
  reverseGeocodeDest(lat,lon);updateMapMarkers();
  v5event('destination_selected',{source:'map'});
  if(MC.getOrigin())runEstimations();
}
function reverseGeocodeDest(lat,lon){fetch('https://nominatim.openstreetmap.org/reverse?lat='+lat+'&lon='+lon+'&format=json&accept-language=es').then(function(r){return r.json()}).then(function(d){if(d&&d.display_name){MC.setDestName(d.display_name.split(',').slice(0,2).join(', '));renderSheetHeadOnly()}}).catch(function(){})}

// ===================== SEARCH (V5 pipeline) =====================
function bindSearchInput(){
  var inp=document.getElementById('destInput');
  inp.addEventListener('input',function(){onSearchInput(this.value)});
  inp.addEventListener('keydown',function(e){onSearchKeydown(e)});
  inp.addEventListener('focus',function(){onSearchFocus()});
  document.getElementById('sbMapBtn').addEventListener('click',activatePickDest);
  document.getElementById('sbLocateBtn').addEventListener('click',locateMe);
  // UX_CORE_REDESIGN — mic = continuous push-to-talk (pointerdown=start, pointerup=stop).
  bindMicPushToTalk(document.getElementById('sbMicBtn'));
}
function closeAllDropdowns(){var dd=document.getElementById('destDropdown');if(dd)dd.classList.add('hidden')}

// ===================== VOICE SEARCH (Web Speech API, no dependencies) =====================
// UX_CORE_REDESIGN: continuous PUSH-TO-TALK. Hold mic (pointerdown / Space / Enter) →
// recognition starts (continuous:true, es-AR, interimResults). Release (pointerup /
// keyup / blur / pointercancel) → recognition stops, final transcript inserted → search.
// Failback: browser_not_supported / permission_denied → toast, field stays a normal input.
var _speechRec=null,_speechListening=false,_pttHeld=false;
function initSpeechRecognition(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR)return null; // browser_not_supported — mic button stays but no-ops gracefully
  var rec=new SR();
  rec.lang='es-AR';rec.interimResults=true;rec.continuous=true;rec.maxAlternatives=1;
  rec.onstart=function(){_speechListening=true;var b=document.getElementById('sbMicBtn');if(b)b.classList.add('listening')};
  rec.onend=function(){_speechListening=false;var b=document.getElementById('sbMicBtn');if(b)b.classList.remove('listening')};
  rec.onerror=function(ev){
    _speechListening=false;var b=document.getElementById('sbMicBtn');if(b)b.classList.remove('listening');
    if(ev&&ev.error==='not-allowed'){showToast('Permiso de micrófono denegado','info')}
    else if(ev&&ev.error==='no-speech'){showToast('No te escuché. Probá de nuevo','info')}
    else if(ev&&ev.error){showToast('Voz no disponible: '+ev.error,'info')}
  };
  rec.onresult=function(ev){
    var transcript='';
    for(var i=ev.resultIndex;i<ev.results.length;i++){transcript+=ev.results[i][0].transcript}
    transcript=transcript.trim();
    var inp=document.getElementById('destInput');
    if(inp&&transcript){inp.value=transcript;inp.dispatchEvent(new Event('input',{bubbles:true}))}
  };
  return rec;
}
// Start push-to-talk. Lazy-inits SpeechRecognition on first use.
function startVoicePTT(){
  if(!_speechRec)_speechRec=initSpeechRecognition();
  if(!_speechRec){showToast('Voz no soportada en este navegador','info');return}
  if(_speechListening)return; // already listening (e.g. rapid re-press)
  // V7.7 VOY_ANALYTICS_V2: voice_search event (one of the 6 canonical V2 events)
  v5event('voice_search',{});
  try{_speechRec.start()}catch(e){
    // start() throws if already started or not allowed — silent failback
    if(e&&e.name==='not-allowed')showToast('Permiso de micrófono denegado','info');
  }
}
// Stop push-to-talk on release.
function stopVoicePTT(){
  if(!_speechRec||!_speechListening)return;
  try{_speechRec.stop()}catch(e){};
}
// Bind pointer (touch/mouse/pen) + keyboard push-to-talk on the mic button.
function bindMicPushToTalk(btn){
  if(!btn)return;
  // Pointer PTT — setPointerCapture so pointerup fires on the button even if the
  // finger/cursor slides off during the hold.
  btn.addEventListener('pointerdown',function(e){
    e.preventDefault();_pttHeld=true;
    try{btn.setPointerCapture(e.pointerId)}catch(_){}
    startVoicePTT();
  });
  function _release(e){
    if(!_pttHeld)return;_pttHeld=false;
    try{btn.releasePointerCapture(e.pointerId)}catch(_){}
    stopVoicePTT();
  }
  btn.addEventListener('pointerup',_release);
  btn.addEventListener('pointercancel',_release);
  btn.addEventListener('pointerleave',function(e){if(_pttHeld&&btn.hasPointerCapture(e.pointerId))_release(e)});
  // Keyboard PTT — Space/Enter hold. keydown repeat suppressed.
  btn.addEventListener('keydown',function(e){
    if((e.key===' '||e.key==='Spacebar'||e.key==='Enter')&&!_pttHeld&&!e.repeat){e.preventDefault();_pttHeld=true;startVoicePTT()}
  });
  btn.addEventListener('keyup',function(e){
    if(e.key===' '||e.key==='Spacebar'||e.key==='Enter'){e.preventDefault();_release({pointerId:-1})}
  });
  btn.addEventListener('blur',function(){if(_pttHeld){_pttHeld=false;stopVoicePTT()}});
  // Suppress the synthetic click that follows pointerup/keyup (PTT already handled it).
  btn.addEventListener('click',function(e){e.preventDefault()});
}
async function onSearchInput(val){
  // Stop idle drift permanently on first real character
  if(val&&val.trim().length>0)stopIdleDrift();
  if(_searchRemoteTimer){clearTimeout(_searchRemoteTimer);_searchRemoteTimer=null}
  val=(val||'').trim();
  var dd=document.getElementById('destDropdown');
  if(!val||val.length===0){
    VoyMapContext.setState('SEARCH_FOCUS'); // V7.4: input cleared → return to search focus
    if(MC.getDest()){MC.clearDest();renderSheet();updateMapMarkers();clearBusRoute()}
    renderEmptyDropdown();
    dd.classList.add('hidden');
    return;
  }
  // UI-4 DestinationInstantFeedback: a SINGLE character already fires a visible
  // response. Previously the threshold was 2 chars → on mobile the field felt dead
  // after typing the first letter. Now we immediately show a "Buscando…" state,
  // then local results, then remote (debounced 150ms for snappier mobile feel).
  v5event('search',{q:val.substring(0,40),mode:typeof _activeMode!=='undefined'?_activeMode:''});
  var version=++_searchVersion;
  var gpsOrigin=MC.getOrigin();
  // Instant feedback: show the dropdown with a searching state right away
  renderSearchDropdown([],false,true,false);
  dd.classList.remove('hidden');
  // Local-first: favorites → home/work → recents → local DB, ranked with GPS bias
  var localRanked=await MC.v5SearchLocalRanked(val,gpsOrigin);
  if(version!==_searchVersion)return;
  if(localRanked.length){renderSearchDropdown(localRanked,false,false,false)}
  else{renderSearchDropdown([],false,true,false)}
  // Remote (debounced 150ms — snappier on mobile) — cancel stale
  _searchRemoteTimer=setTimeout(async function(){
    _searchRemoteTimer=null;
    if(version!==_searchVersion)return;
    var remote=await MC.searchNominatim(val);
    if(version!==_searchVersion)return;
    var merged=MC.dedupResults(localRanked.concat(remote||[]));
    if(version!==_searchVersion)return;
    // V7.11 GEO_BIAS: detectar low confidence = primer resultado remoto fuera del bbox SF.
    //   Nominatim con bounded=1 aún puede retornar resultados edge-case fuera del bbox.
    //   Si el top resultado está fuera, mostramos el label "¿Buscando en Santa Fe?".
    var lowConf=false;
    if(remote&&remote.length>0){
      var topR=remote[0];
      if(topR&&typeof topR.lat==='number'&&typeof topR.lon==='number'){
        // bbox SF: lat [-31.67, -31.57], lon [-60.75, -60.65]
        if(topR.lat<-31.67||topR.lat>-31.57||topR.lon<-60.75||topR.lon>-60.65){lowConf=true}
      }
    }
    if(merged.length){renderSearchDropdown(merged.slice(0,8),false,false,lowConf)}
    else{renderSearchDropdown([],false,true,false)}
  },150);
}
function onSearchKeydown(e){
  if(e.key==='Enter'||e.keyCode===13){
    var inp=e.target;var val=(inp.value||'').trim();if(val.length<2)return;
    e.preventDefault();_searchEnterPending=true;
    var dd=document.getElementById('destDropdown');
    if(dd&&!dd.classList.contains('hidden')){var first=dd.querySelector('.search-item:not(.search-item--empty)');if(first){first.click();return}}
    fallbackGeocode(val);
  }
}
async function fallbackGeocode(q){
  try{
    // V7.11 GEO_BIAS: viewbox sincronizado con mobilityController.searchNominatim (Santa Fe ciudad tight bbox).
    var url='https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(q+', Santa Fe, Argentina')+'&format=json&limit=1&accept-language=es&viewbox=-60.75,-31.67,-60.65,-31.57&bounded=1';
    var r=await fetch(url,{headers:{'User-Agent':'MovilidadAsistente/1.0'}});
    var data=await r.json();
    if(data&&data[0]){var lat=parseFloat(data[0].lat),lon=parseFloat(data[0].lon);var name=data[0].display_name.split(',').slice(0,2).join(', ');selectDest(lat,lon,data[0].display_name)}
    else{showToast('No se encontró “'+q+'”','warn')}
  }catch(e){showToast('Error de red al buscar','error')}
}
function onSearchFocus(){
  VoyMapContext.setState('SEARCH_FOCUS'); // V7.4: on_search_input → SEARCH_FOCUS
  var inp=document.getElementById('destInput');
  if(!inp||inp.value.trim().length>=2)return;
  renderEmptyDropdown();
}
async function renderEmptyDropdown(){
  var dd=document.getElementById('destDropdown');if(!dd)return;
  var html='';
  // V7.9: Favoritos primero (via VoyFavoritesService — sorted by last_used, LocalStorage cache).
  var favs=window.VoyFavoritesService?VoyFavoritesService.getAll():(await MC.v5GetFavorites());
  if(favs.length){
    html+='<div class="sd-section"><div class="sd-section-title">Favoritos</div>';
    favs.slice(0,6).forEach(function(f){
      var tag=f.label==='home'?'Casa':f.label==='work'?'Trabajo':'Guardado';
      var ic=svg(f.label==='home'?'home':f.label==='work'?'work':'star',18);
      var isFav=window.VoyFavoritesService?VoyFavoritesService.isFavorite(f.lat,f.lon):true;
      var starCls=window.VoyFavoritesService?'fav-star active':'';
      html+='<button class="search-item" data-lat="'+f.lat+'" data-lon="'+f.lon+'" data-name="'+escapeAttr(f.name)+'"><span class="search-item-icon ic-fav">'+ic+'</span><div class="search-item-text"><strong>'+escapeHtml(f.name)+'</strong></div>'+(starCls?'<span class="'+starCls+'" data-fav-toggle data-lat="'+f.lat+'" data-lon="'+f.lon+'" data-name="'+escapeAttr(f.name)+'" role="button" aria-label="Quitar de favoritos" aria-pressed="true">'+svg('star',18)+'</span>':'<span class="search-item-tag">'+tag+'</span>')+'</button>';
    });
    html+='</div>';
  }
  // Recents
  var recents=await MC.v5GetRecents(5);
  if(recents.length){
    html+='<div class="sd-section"><div class="sd-section-title">Recientes</div>';
    recents.forEach(function(r){
      var isFav=window.VoyFavoritesService?VoyFavoritesService.isFavorite(r.lat,r.lon):false;
      var starHTML=window.VoyFavoritesService?'<span class="fav-star'+(isFav?' active':'')+'" data-fav-toggle data-lat="'+r.lat+'" data-lon="'+r.lon+'" data-name="'+escapeAttr(r.name||"")+'" role="button" aria-label="'+(isFav?'Quitar de favoritos':'Guardar como favorito')+'" aria-pressed="'+isFav+'">'+svg('star',18)+'</span>':'';
      html+='<button class="search-item" data-lat="'+r.lat+'" data-lon="'+r.lon+'" data-name="'+escapeAttr(r.name)+'"><span class="search-item-icon ic-recent">'+svg('clock',18)+'</span><div class="search-item-text"><strong>'+escapeHtml(r.name)+'</strong></div>'+starHTML+'</button>';
    });
    html+='</div>';
  }
  if(!html){dd.innerHTML='';dd.classList.add('hidden');return}
  dd.innerHTML=html;
  dd.classList.remove('hidden');
  bindSearchItems();
}
function renderSearchDropdown(results,isRecent,isSearching,lowConfidence){
  var dd=document.getElementById('destDropdown');if(!dd)return;
  if(!results.length){
    dd.innerHTML='<div class="search-item search-item--empty">'+(isSearching?'Buscando…':'Sin resultados · presioná Enter para buscar igual')+'</div>';
    dd.classList.remove('hidden');return;
  }
  var html='';
  // V7.11 GEO_BIAS: si lowConfidence (primer resultado fuera del bbox SF), mostrar label
  //   "¿Buscando en Santa Fe?" con botón re-centrar. Previere ambigüedad geográfica.
  if(lowConfidence){
    html+='<div class="sd-geo-hint" id="geoHint"><span class="sd-geo-hint-ic">'+svg('pin',14)+'</span><span class="sd-geo-hint-txt">¿Buscando en Santa Fe?</span><button class="sd-geo-hint-btn" id="geoHintBtn" aria-label="Re-centrar mapa en Santa Fe">Re-centrar</button></div>';
  }
  results.forEach(function(r){
    var lat=parseFloat(r.lat||r.latitude),lon=parseFloat(r.lon||r.longitude);
    var displayName=r.display_name||r.display||r.name||'';
    var name=displayName.split(',')[0],sub=displayName.split(',').slice(1,3).join(',').trim();
    var ic='pin',icClass='';
    if(r.type==='favorite'){ic='star';icClass='ic-fav'}
    else if(r.type==='home'){ic='home';icClass='ic-home'}
    else if(r.type==='work'){ic='work';icClass='ic-work'}
    else if(r.type==='recent'){ic='clock';icClass='ic-recent'}
    else if(r.type==='bus'){ic='bus'}
    else if(r.type==='bike'){ic='bike'}
    // V7.9: star toggle on every search result (add/remove without selecting dest)
    var isFav=window.VoyFavoritesService?VoyFavoritesService.isFavorite(lat,lon):(r.type==='favorite');
    var starHTML=window.VoyFavoritesService?'<span class="fav-star'+(isFav?' active':'')+'" data-fav-toggle data-lat="'+lat+'" data-lon="'+lon+'" data-name="'+escapeAttr(displayName)+'" role="button" aria-label="'+(isFav?'Quitar de favoritos':'Guardar como favorito')+'" aria-pressed="'+isFav+'">'+svg('star',18)+'</span>':'';
    // Keep tag for home/work (semantic), but use star toggle for everything else
    var tag='';
    if(r.type==='home')tag='<span class="search-item-tag">Casa</span>';
    else if(r.type==='work')tag='<span class="search-item-tag">Trabajo</span>';
    html+='<button class="search-item" data-lat="'+lat+'" data-lon="'+lon+'" data-name="'+escapeAttr(displayName)+'"><span class="search-item-icon '+icClass+'">'+svg(ic,18)+'</span><div class="search-item-text"><strong>'+escapeHtml(name)+'</strong>'+(sub?'<small>'+escapeHtml(sub)+'</small>':'')+'</div>'+tag+starHTML+'</button>';
  });
  dd.innerHTML=html;
  dd.classList.remove('hidden');
  bindSearchItems();
  // V7.11 GEO_BIAS: bind re-center button on the geo-hint label
  var hintBtn=document.getElementById('geoHintBtn');
  if(hintBtn){
    hintBtn.addEventListener('click',function(e){
      e.stopPropagation();e.preventDefault();
      if(window._map){_map.flyTo({center:[-60.70,-31.61],zoom:14,duration:800})}
      var hint=document.getElementById('geoHint');if(hint)hint.remove();
    });
  }
}
function bindSearchItems(){
  var dd=document.getElementById('destDropdown');
  dd.querySelectorAll('.search-item').forEach(function(item){
    if(item.classList.contains('search-item--empty'))return;
    // V7.9: star toggle — handle separately (stopPropagation so it doesn't trigger selectDest)
    var starBtn=item.querySelector('[data-fav-toggle]');
    if(starBtn){
      starBtn.addEventListener('click',function(e){
        e.stopPropagation();e.preventDefault();
        var lat=parseFloat(starBtn.getAttribute('data-lat'));
        var lon=parseFloat(starBtn.getAttribute('data-lon'));
        var nm=starBtn.getAttribute('data-name')||'Destino';
        if(!window.VoyFavoritesService)return;
        VoyFavoritesService.toggle({lat:lat,lon:lon,name:nm},'').then(function(nowFav){
          starBtn.classList.toggle('active',nowFav);
          starBtn.setAttribute('aria-pressed',nowFav);
          starBtn.setAttribute('aria-label',nowFav?'Quitar de favoritos':'Guardar como favorito');
          if(typeof showToast==='function')showToast(nowFav?'Destino guardado':'Destino quitado',nowFav?'success':'info');
          if(typeof v5event==='function')v5event(nowFav?'favorite_added':'favorite_removed',{});
          renderMemoryRow(); // refresh chips
        });
      });
    }
    item.addEventListener('click',function(){
      var lat=parseFloat(item.getAttribute('data-lat')),lon=parseFloat(item.getAttribute('data-lon')),name=item.getAttribute('data-name');
      selectDest(lat,lon,name);
      MC.v5AddRecent({lat:lat,lon:lon,name:name.split(',')[0]});
      // V7.9: touch last_used if this dest is a favorite (bumps sort order)
      if(window.VoyFavoritesService)VoyFavoritesService.touch(lat,lon);
      renderMemoryRow();
    });
  });
}
function selectDest(lat,lon,name){
  MC.setDest(lat,lon,name,'search');va_dest(name,lat,lon);
  document.getElementById('destInput').value=name.split(',')[0];
  document.getElementById('destInput').blur();
  closeAllDropdowns();
  updateMapMarkers();
  v5event('destination_selected',{source:'search'});
  checkFavActive();
  updateFloatingChip(); // V7.4: update floating chip text with new dest
  VoyMapContext.setState('ROUTE_PREVIEW'); // V7.4: on_route_select → ROUTE_PREVIEW
  if(MC.getOrigin())runEstimations();
  else showToast('Te falta el origen — activá la ubicación','warn');
}
function checkFavActive(){
  var dest=MC.getDest();_favActive=false;
  if(!dest){renderSheetHeadOnly();return}
  MC.v5GetFavorites().then(function(favs){
    var threshold=0.001;
    _favActive=favs.some(function(f){return Math.abs(f.lat-dest.lat)<threshold&&Math.abs(f.lon-dest.lon)<threshold});
    renderSheetHeadOnly();
  });
}

// ===================== MEMORY ROW (chips) =====================
async function renderMemoryRow(){
  var row=document.getElementById('memoryRow');if(!row)return;
  var favs=await MC.v5GetFavorites();
  var recents=await MC.v5GetRecents(4);
  var html='';
  favs.slice(0,3).forEach(function(f){
    var ic=svg(f.label==='home'?'home':f.label==='work'?'work':'star',15);
    html+='<button class="chip chip-fav" data-lat="'+f.lat+'" data-lon="'+f.lon+'" data-name="'+escapeAttr(f.name)+'"><span class="chip-ic">'+ic+'</span><span class="chip-text">'+escapeHtml(f.name.split(',')[0])+'</span></button>';
  });
  recents.slice(0,3).forEach(function(r){
    html+='<button class="chip" data-lat="'+r.lat+'" data-lon="'+r.lon+'" data-name="'+escapeAttr(r.name)+'"><span class="chip-ic">'+svg('clock',15)+'</span><span class="chip-text">'+escapeHtml((r.name||'').split(',')[0])+'</span></button>';
  });
  if(html){
    html+='<button class="chip chip-clear" id="clearMemBtn">'+svg('trash',15)+'<span>Borrar</span></button>';
    row.innerHTML=html;row.classList.add('show');
    row.querySelectorAll('.chip').forEach(function(c){
      if(c.id==='clearMemBtn'){c.addEventListener('click',confirmClearMemory);return}
      c.addEventListener('click',function(){
        var lat=parseFloat(c.getAttribute('data-lat')),lon=parseFloat(c.getAttribute('data-lon')),name=c.getAttribute('data-name');
        selectDest(lat,lon,name);
      });
    });
  }else{row.innerHTML='';row.classList.remove('show')}
}
var _clearConfirm=false;
function confirmClearMemory(){
  var btn=document.getElementById('clearMemBtn');
  if(_clearConfirm){_clearConfirm=false;MC.v5EraseAll().then(function(){renderMemoryRow();showToast('Datos borrados','info')})}
  else{_clearConfirm=true;if(btn){btn.innerHTML=svg('trash',15)+'<span>¿Confirmar?</span>'}setTimeout(function(){if(_clearConfirm){_clearConfirm=false;renderMemoryRow()}},3000)}
}

// ===================== ESTIMATION =====================
function runEstimations(){
  if(!MC.getOrigin()||!MC.getDest())return;
  MC.runEstimations();
  var est=MC.getEstimations();
  if(est&&est.length){va_cards(est.map(function(e){return e.mode}));if(window.VoyEventBus){try{VoyEventBus.emit('route_calculated',{modes:est.map(function(e){return e.mode}),distance_km:est[0]&&est[0].distance})}catch(e){}}}
  renderSheet();
}

// ===================== FARE HELPERS =====================
function computeTaxiFare(distKm,timeMin){
  var hour=new Date().getHours();
  var t=(hour>=22||hour<6)?FareRegistry.taxi.nocturno:FareRegistry.taxi.diurno;
  var fichas=Math.ceil(distKm*1000/t.distFicha);
  var price=t.bajada+fichas*t.ficha;
  return Math.round(price);
}

// V7.4 — renderSheetHeadHTML: extracted helper so bike/bus modes can reuse the same
// sheet head (route summary + favorite button) without duplicating HTML.
function renderSheetHeadHTML(origin,dest){
  var h='';
  h+='<div class="sheet-head">';
  h+='<div class="sh-route">';
  h+='<div class="sh-origin"><span class="sh-dot from"></span><span>'+escapeHtml((origin.name||'Mi ubicación').split(',')[0])+'</span></div>';
  h+='<div class="sh-dest"><span class="sh-dot to"></span><span>'+escapeHtml((dest.name||'Destino').split(',')[0])+'</span></div>';
  h+='</div>';
  h+='<div class="sh-actions">';
  h+='<button class="icon-btn'+(_favActive?' active':'')+'" id="favBtn" aria-label="Guardar destino">'+svg('star',18)+'</button>';
  h+='</div>';
  h+='</div>';
  return h;
}

// ===================== RENDER DECISION SHEET =====================
function renderSheet(){
  var container=document.getElementById('decisionSheet');
  var origin=MC.getOrigin(),dest=MC.getDest();
  var estimations=MC.getEstimations();
  if(!origin||!dest){
    container.innerHTML='<div class="sheet-empty"><div class="se-icon">'+svg('search',40)+'</div>Buscá un destino arriba para ver opciones de viaje</div>';
    clearBusRoute();return;
  }
  if(!estimations||!estimations.length){
    container.innerHTML='<div class="sheet-empty"><div class="se-icon">'+svg('clock',40)+'</div>Calculando rutas…</div>';
    clearBusRoute();return;
  }
  var autoEst=null,busEst=null,bikeEst=null;
  estimations.forEach(function(e){if(e.mode==='auto'&&!autoEst)autoEst=e;else if(e.mode==='bus'&&!busEst)busEst=e;else if(e.mode==='bike'&&!bikeEst)bikeEst=e});
  // V7.5 Ahorro_Inteligente: recompute comparative recommendation on every estimate.
  // colectivoPrice = busEst.price (SUBE fare); rideHailingPrice = cheapest app provider (uber/didi/maxim).
  // Formula: isRecommendationAvailable = (colectivoPrice < rideHailingPrice * 0.5)
  if(window.VoyAhorroService){
    var _colP = busEst ? busEst.price : null;
    var _rhP = null;
    if(autoEst && autoEst.rankedProviders && autoEst.rankedProviders.length){
      var _appPrices=[];
      for(var k=0;k<autoEst.rankedProviders.length;k++){
        var _rp=autoEst.rankedProviders[k];
        if(_rp && (_rp.id==='uber'||_rp.id==='didi'||_rp.id==='maxim') && _rp.price>0)_appPrices.push(_rp.price);
      }
      if(_appPrices.length)_rhP=Math.min.apply(null,_appPrices);
    }
    VoyAhorroService.recompute(_colP,_rhP);
  }
  // V7.6 Predictive_Trend_Engine: async record + analyze price trends for ride-hailing providers.
  // Fire-and-forget — badges mount via renderTrendBadges() when async completes (no main-thread block).
  if(window.VoyTrendEngine){
    VoyTrendEngine.processEstimate(autoEst, origin, dest);
  }
  // V7.9 UI_FIX: guard only applies to car/taxi/remis modes. Bus/bike modes render
  // even when autoEst is null (they use busEst/bikeEst respectively).
  if(!autoEst&&_activeMode!=='bus'&&_activeMode!=='bike'){
    container.innerHTML='<div class="sheet-empty"><div class="se-icon">'+svg('car',40)+'</div>Sin tarifas de auto disponibles</div>';
    clearBusRoute();showModeSelector(false);return;
  }
  showModeSelector(true);
  if(autoEst&&window.VoyEventBus){try{var _o=MC.getOrigin(),_d=MC.getDest();var _winner=(autoEst.rankedProviders&&autoEst.rankedProviders[0])?autoEst.rankedProviders[0]:null;var _fare=_winner?_winner.price:0;VoyEventBus.emit('ride_estimated',{distance_km:autoEst.distance,estimated_fare:_fare,price:_fare,time_min:autoEst.timeMin||0,provider:_winner?_winner.id:'',mode:'auto',fare_captured:_fare>0,lost_conversion:_fare<=0,from_lat:_o&&_o.lat,to_lat:_d&&_d.lat})}catch(e){}}

  // V7.4 CategoryManager: bike/bus modes show ONLY their respective block (no hero/taxi/remis).
  // Reduces cognitive load — user sees just the relevant transport info for the selected group.
  if(_activeMode==='bike'){
    clearBusRoute();
    var bikeH=renderSheetHeadHTML(origin,dest);
    if(bikeEst){
      bikeH+='<div class="bike-block">';
      bikeH+='<div class="block-title"><span class="bt-ic">'+svg('bike',15)+'</span> Bicicleta</div>';
      bikeH+='<button class="bike-line" id="bikeLineBtn"><span class="bk-ic">'+svg('bike',20)+'</span><span class="bk-text">'+bikeEst.distance.toFixed(1)+' km · gratis</span><span class="ah-chev">'+svg('chevron',16)+'</span></button>';
      bikeH+='<div class="bike-detail'+(_bikeDetailExpanded?' expanded':'')+'" id="bikeDetail">';
      if(bikeEst.nearStation)bikeH+='<div class="bd-row"><span class="bd-ic">'+svg('pin',14)+'</span><span>Retirar: '+escapeHtml(bikeEst.nearStation.nombre)+' ('+escapeHtml(bikeEst.nearStation.calles)+')</span></div>';
      if(bikeEst.nearDestStation)bikeH+='<div class="bd-row"><span class="bd-ic">'+svg('flag',14)+'</span><span>Dejar: '+escapeHtml(bikeEst.nearDestStation.nombre)+' ('+escapeHtml(bikeEst.nearDestStation.calles)+')</span></div>';
      bikeH+='<div class="bd-row"><span class="bd-ic">'+svg('external',14)+'</span><a href="'+buildBikeLink()+'" target="_blank" rel="noopener">Abrir Las Bicis</a></div>';
      bikeH+='</div></div>';
    }else{
      bikeH+='<div class="sheet-empty"><div class="se-icon">'+svg('bike',40)+'</div>La bicicleta no es ideal para este trayecto</div>';
    }
    container.innerHTML=bikeH;
    attachSheetEvents();
    return;
  }
  if(_activeMode==='bus'){
    var rankedBus=[];
    if(typeof MC.rankBusLines==='function'){try{rankedBus=MC.rankBusLines()||[]}catch(e){rankedBus=[]}}
    if(!rankedBus.length&&busEst)rankedBus=[busEst];
    _rankedBus=rankedBus;
    var busH=renderSheetHeadHTML(origin,dest);
    if(rankedBus.length){
      var destKey=(MC.getDest()?MC.getDest().lat.toFixed(4)+'_'+MC.getDest().lon.toFixed(4):'');
      if(destKey!==_busBlockDestKey){
        _busBlockDestKey=destKey;
        _activeBusLine=null;
        _busDetailExpanded=false;
        _busAltsExpanded=false;
      }
      if(!_activeBusLine||!rankedBus.some(function(b){return String(b.linea)===String(_activeBusLine)})){
        _activeBusLine=rankedBus[0].linea;
      }
      busH+='<div id="busBlockContainer">'+renderBusBlockHTML()+'</div>';
      container.innerHTML=busH;
      attachSheetEvents();
      drawBusRoute(_activeBusLine);
    }else{
      busH+='<div class="sheet-empty"><div class="se-icon">'+svg('bus',40)+'</div>Sin rutas de colectivo cercanas</div>';
      container.innerHTML=busH;
      attachSheetEvents();
      clearBusRoute();
    }
    return;
  }

  // V7: Build hero/alts respecting _activeMode (transport selector is functional, not decorative).
  // all|car|custom → ride-hailing apps (uber/didi/maxim); taxi → taxi providers;
  // remis → remis providers; walk → no ride-hailing hero (bike becomes primary).
  var ranked=autoEst.rankedProviders||[];
  var hero=null,alts=[];
  var _modeMatches=function(pid){
    if(!PROVIDERS[pid]||!PROVIDERS[pid].available)return false;
    var cat=PROVIDERS[pid].category||'app';
    if(_activeMode==='walk')return false;
    if(_activeMode==='taxi')return cat==='taxi';
    if(_activeMode==='remis')return cat==='remis';
    return cat==='app'; // all|car|custom
  };
  for(var i=0;i<ranked.length;i++){
    var p=ranked[i];
    var pid=p.id;
    if(_modeMatches(pid)){
      if(pid==='maxim'&&!isMaximSupported())continue;
      var url=buildAppLink(pid);
      if(!hero)hero={id:pid,name:p.name,price:p.price,timeMin:p.timeMin,url:url};
      else alts.push({id:pid,name:p.name,price:p.price,timeMin:p.timeMin,url:url});
    }
  }
  // If hero is unsupported Maxim-only (iOS), promote next
  if(!hero&&alts.length)hero=alts.shift();

  var distKm=autoEst.distance||0;
  // V7.1 (Gemini AC-1): Walk mode — no ride-hailing hero applies. Build a walking hero
  // with ETA at 5 km/h (12 min/km) + free fare. Prevents empty sheet UX in walk mode.
  var _isWalkHero=(_activeMode==='walk'&&!hero);
  if(_isWalkHero){
    var walkMin=Math.max(1,Math.round(distKm*12));
    hero={id:'walk',name:'A pie',price:0,timeMin:walkMin,url:''};
  }
  // V6.2: prefer bayesian PricingEngineV2 (multi_variable_bayes_estimation) with v6 fallback.
  // SAKANA-FIX-02b (V7.18.2): default hero 'didi'→'uber'. DiDi has the worst deep-link
  // UX (no coord pre-fill), so it should NOT be the fallback hero when no clear winner.
  // Uber has the best deep-link (m.uber.com/ul/?action=setPickup with full coords).
  var heroProvider=hero?hero.id:'uber';
  var surgeCtx={now:Date.now()};
  var confidence,surgeLabel,surgeMult,fareRange;
  if(_isWalkHero){
    // V7.1: walking is deterministic — bypass Bayesian pricing variance entirely.
    confidence=1;surgeLabel='';surgeMult=1;fareRange={low:0,high:0};
  }else{
    confidence=(window.PricingEngineV2)?PricingEngineV2.fareConfidence(heroProvider,{distanceKm:distKm,timeMin:hero?hero.timeMin:0,fare:hero?hero.price:0}):MC.v6FareConfidence(heroProvider,distKm,hero?hero.timeMin:0);
    surgeLabel=(window.PricingEngineV2)?PricingEngineV2.surgeLabel(heroProvider,surgeCtx):MC.v6SurgeLabel(heroProvider);
    surgeMult=(window.PricingEngineV2)?PricingEngineV2.surgeMultiplier(heroProvider,surgeCtx):MC.v6SurgeMultiplier(heroProvider);
    fareRange=hero?((window.PricingEngineV2)?PricingEngineV2.fareRange(hero.price,confidence,surgeMult):MC.v6FareRange(hero.price,confidence,surgeMult)):{low:0,high:0};
  }
  var confClass=confidence>=0.8?'high':confidence>=0.65?'mid':'';

  var h='';
  h+=renderSheetHeadHTML(origin,dest);

  // Hero
  // V7.1 (Gemini AC-1): Walk hero — rendered standalone with arrival clock (ETD magic),
  // then the ride-hailing hero block is skipped.
  if(_isWalkHero){
    var _arr=new Date(Date.now()+hero.timeMin*60000);
    var _arrH=_arr.getHours(),_arrM=_arr.getMinutes();
    var _arrStr=(_arrH<10?'0':'')+_arrH+':'+(_arrM<10?'0':'')+_arrM;
    h+='<div class="hero walk-hero">';
    h+='<div class="hero-color" style="background:#34C759"></div>';
    h+='<div class="hero-info">';
    h+='<div class="hero-name">'+escapeHtml(hero.name)+'</div>';
    h+='<div class="hero-meta">'+formatMin(hero.timeMin)+' · '+distKm.toFixed(1)+' km · <span class="conf-badge high">Llegás '+_arrStr+'</span></div>';
    h+='</div>';
    h+='<div class="hero-price-block"><div class="hero-price">Gratis</div><div class="hero-range">a 5 km/h</div></div>';
    h+='</div>';
  }
  if(hero&&!_isWalkHero){
    h+='<div class="hero">';
    h+='<div class="hero-color" style="background:'+(PROVIDERS[hero.id]?PROVIDERS[hero.id].color:'#666')+'"></div>';
    h+='<div class="hero-info">';
    h+='<div class="hero-name">'+escapeHtml(hero.name)+'</div>';
    // V7.3 DATA_CLARITY_FIX: replaced "Confianza X%" with "Precio estimado" badge.
    // The percentage had no semantic meaning for users (what does 82% confidence mean?).
    // Now shows "Precio estimado" only when confidence is ≥0.65 (mid/high); omitted
    // entirely for low confidence (reduces visual noise). Color coding preserved:
    // high=green, mid=orange. Surge label still shown when applicable.
    var _confBadge=(confidence>=0.65)?' · <span class="conf-badge '+confClass+'">Precio estimado</span>':'';
    h+='<div class="hero-meta">'+formatMin(hero.timeMin)+' · '+distKm.toFixed(1)+' km'+_confBadge+(surgeLabel?' <span class="conf-badge mid">'+escapeHtml(surgeLabel)+'</span>':'')+'</div>';
    h+='</div>';
    h+='<div class="hero-price-block">';
    h+='<div class="hero-price" data-trend-provider="'+escapeAttr(hero.id)+'">'+formatPrice(hero.price)+'</div>';
    h+='<div class="hero-range">'+formatPrice(fareRange.low)+' – '+formatPrice(fareRange.high)+'</div>';
    // V7.9: feedback flag — reports price inaccuracy without leaving the flow
    h+='<button class="fb-flag" data-fb-provider="'+escapeAttr(hero.id)+'" data-fb-price="'+hero.price+'" type="button" aria-label="Reportar precio inexacto" title="¿El precio no coincide?">'+svg('flag',16)+'</button>';
    h+='</div>';
    h+='</div>';
    h+='<div class="hero-cta-row">';
    h+='<button class="cta-primary" data-action="'+hero.id+'" data-url="'+hero.url+'" data-name="'+escapeAttr(hero.name)+'">'+svg('navigate',20)+' Pedir '+escapeHtml(hero.name)+'</button>';
    h+='<button class="cta-navigate" id="navStartBtn" type="button" aria-label="Iniciar navegación">'+svg('route',20)+' Navegar</button>';
    h+='</div>';
    if(alts.length){
      h+='<div class="more-opts">';
      alts.forEach(function(p){
        h+='<button class="acc-head" style="width:100%" data-action="'+p.id+'" data-url="'+p.url+'" data-name="'+escapeAttr(p.name)+'">';
        h+='<span class="ah-ic" style="color:'+(PROVIDERS[p.id]?PROVIDERS[p.id].color:'#666')+'">'+svg('car',18)+'</span>';
        h+='<span class="ah-title">'+escapeHtml(p.name)+'</span>';
        h+='<span class="ah-meta"><span data-trend-provider="'+escapeAttr(p.id)+'">'+formatPrice(p.price)+'</span> · '+formatMin(p.timeMin)+'</span>';
        h+='<span class="ah-chev">'+svg('arrow',16)+'</span>';
        h+='</button>';
        // V7.9: feedback flag for alt providers (separate row so it doesn't trigger the accordion)
        h+='<div class="fb-flag-row" style="display:flex;justify-content:flex-end;margin:-4px 8px 2px"><button class="fb-flag" data-fb-provider="'+escapeAttr(p.id)+'" data-fb-price="'+p.price+'" type="button" aria-label="Reportar precio inexacto de '+escapeAttr(p.name)+'" title="¿El precio no coincide?">'+svg('flag',14)+'</button></div>';
      });
      h+='</div>';
    }
  }

  // Taxi + Remis accordions
  var taxiFare=computeTaxiFare(distKm,autoEst.timeMin||0);
  var taxiConf=(window.PricingEngineV2)?PricingEngineV2.fareConfidence('taxi',{distanceKm:distKm,timeMin:autoEst.timeMin||0,fare:taxiFare}):MC.v6FareConfidence('taxi',distKm,autoEst.timeMin||0);
  var taxiSurge=(window.PricingEngineV2)?PricingEngineV2.surgeMultiplier('taxi',surgeCtx):MC.v6SurgeMultiplier('taxi');
  var taxiRange=(window.PricingEngineV2)?PricingEngineV2.fareRange(taxiFare,taxiConf,taxiSurge):MC.v6FareRange(taxiFare,taxiConf,taxiSurge);
  // Taxi accordion
  h+='<div class="more-opts"><div class="accordion">';
  h+='<button class="acc-head'+(_sheetAccordions.taxi?' expanded':'')+'" id="accTaxiHead" aria-expanded="'+_sheetAccordions.taxi+'">';
  h+='<span class="ah-ic" style="color:#F59E0B">'+svg('taxi',18)+'</span>';
  h+='<span class="ah-title">Taxi</span>';
  h+='<span class="ah-meta">'+formatPrice(taxiFare)+' · '+formatMin(autoEst.timeMin||0)+'</span>';
  h+='<span class="ah-chev">'+svg('chevron',18)+'</span></button>';
  h+='<div class="acc-body'+(_sheetAccordions.taxi?' expanded':'')+'" id="accTaxiBody">';
  TAXI_COMPANIES.forEach(function(co){
    h+='<div class="acc-co">';
    h+='<div class="co-info"><div class="co-name">'+escapeHtml(co.name)+'</div>';
    h+='<div class="co-meta"><span>Estimado: '+formatPrice(taxiRange.low)+'–'+formatPrice(taxiRange.high)+'</span><span>'+formatMin(autoEst.timeMin||0)+'</span></div>';
    h+='<div class="co-actions">';
    h+='<button class="co-action wa" data-action="taxi-'+co.id+'" data-url="'+co.whatsapp+'" data-name="'+escapeAttr(co.name)+' (WhatsApp)">'+svg('whatsapp',15)+' WhatsApp</button>';
    if(co.app)h+='<button class="co-action" data-action="taxi-'+co.id+'" data-url="#" data-name="'+escapeAttr(co.name)+' ('+escapeAttr(co.app)+')">'+svg('app',15)+' '+escapeHtml(co.app)+'</button>';
    h+='</div></div></div>';
  });
  h+='</div></div>';
  // Remis accordion
  h+='<div class="accordion">';
  h+='<button class="acc-head'+(_sheetAccordions.remis?' expanded':'')+'" id="accRemisHead" aria-expanded="'+_sheetAccordions.remis+'">';
  h+='<span class="ah-ic" style="color:#6B7280">'+svg('car',18)+'</span>';
  h+='<span class="ah-title">Remis</span>';
  h+='<span class="ah-meta">'+formatPrice(Math.round(taxiFare*1.05))+' · '+formatMin(autoEst.timeMin||0)+'</span>';
  h+='<span class="ah-chev">'+svg('chevron',18)+'</span></button>';
  h+='<div class="acc-body'+(_sheetAccordions.remis?' expanded':'')+'" id="accRemisBody">';
  REMIS_COMPANIES.forEach(function(co){
    h+='<div class="acc-co">';
    h+='<div class="co-info"><div class="co-name">'+escapeHtml(co.name)+'</div>';
    h+='<div class="co-meta"><span>Estimado: '+formatPrice(Math.round(taxiRange.low*1.05))+'–'+formatPrice(Math.round(taxiRange.high*1.05))+'</span><span>'+formatMin(autoEst.timeMin||0)+'</span></div>';
    h+='<div class="co-actions">';
    h+='<button class="co-action wa" data-action="remis-'+co.id+'" data-url="'+co.whatsapp+'" data-name="'+escapeAttr(co.name)+' (WhatsApp)">'+svg('whatsapp',15)+' WhatsApp</button>';
    h+='</div></div></div>';
  });
  h+='</div></div></div>'; // close more-opts

  // Bus block — VOY_COLLECTIVE_ENGINE_V1: top 3 ranked lines shown explicitly,
  // each tappable to draw its real route on the map. Remaining lines collapsed.
  var rankedBus=[];
  if(typeof MC.rankBusLines==='function'){try{rankedBus=MC.rankBusLines()||[]}catch(e){rankedBus=[]}}
  if(!rankedBus.length&&busEst)rankedBus=[busEst];
  _rankedBus=rankedBus;
  if(rankedBus.length){
    // On a NEW trip (dest changed), reset selection so the best line auto-selects.
    var destKey=(MC.getDest()?MC.getDest().lat.toFixed(4)+'_'+MC.getDest().lon.toFixed(4):'');
    if(destKey!==_busBlockDestKey){
      _busBlockDestKey=destKey;
      _activeBusLine=null;
      _busDetailExpanded=false;
      _busAltsExpanded=false;
    }
    // Auto-select the best line if none active or the active one is no longer a candidate.
    if(!_activeBusLine||!rankedBus.some(function(b){return String(b.linea)===String(_activeBusLine)})){
      _activeBusLine=rankedBus[0].linea;
    }
    h+='<div id="busBlockContainer">'+renderBusBlockHTML()+'</div>';
    drawBusRoute(_activeBusLine);
  }else{clearBusRoute()}

  // Bike tertiary (only if under 3km — engine filters)
  if(bikeEst){
    h+='<div class="bike-block">';
    h+='<div class="block-title"><span class="bt-ic">'+svg('bike',15)+'</span> Bicicleta</div>';
    h+='<button class="bike-line" id="bikeLineBtn"><span class="bk-ic">'+svg('bike',20)+'</span><span class="bk-text">'+bikeEst.distance.toFixed(1)+' km · gratis</span><span class="ah-chev">'+svg('chevron',16)+'</span></button>';
    h+='<div class="bike-detail'+(_bikeDetailExpanded?' expanded':'')+'" id="bikeDetail">';
    if(bikeEst.nearStation)h+='<div class="bd-row"><span class="bd-ic">'+svg('pin',14)+'</span><span>Retirar: '+escapeHtml(bikeEst.nearStation.nombre)+' ('+escapeHtml(bikeEst.nearStation.calles)+')</span></div>';
    if(bikeEst.nearDestStation)h+='<div class="bd-row"><span class="bd-ic">'+svg('flag',14)+'</span><span>Dejar: '+escapeHtml(bikeEst.nearDestStation.nombre)+' ('+escapeHtml(bikeEst.nearDestStation.calles)+')</span></div>';
    h+='<div class="bd-row"><span class="bd-ic">'+svg('external',14)+'</span><a href="'+buildBikeLink()+'" target="_blank" rel="noopener">Abrir Las Bicis</a></div>';
    h+='</div></div>';
  }

  // VOY_UI_FOCUS_V1 UI-003 — Route share (sheet-bottom-right, subtle).
  // visibility_rule: only_when_destination_selected — this full-render path is
  // reached solely when origin+dest+estimations exist; the empty / calculating
  // states early-return above, so the button never appears without a route.
  // scope: current_route_context_only — see shareRoute().
  h+='<div class="sheet-share-row"><button type="button" class="sheet-share-btn" id="sheetShareBtn" aria-label="Compartir viaje">'+svg('share',15)+'<span>Compartir viaje</span></button></div>';

  container.innerHTML=h;
  attachSheetEvents();
}
function renderSheetHeadOnly(){
  // Re-render only the favorite button state to avoid full re-render flicker
  var btn=document.getElementById('favBtn');
  if(btn){btn.classList.toggle('active',_favActive)}
}
function shortenStop(calles){
  if(!calles)return'';
  var parts=calles.split(' y ');
  if(parts.length>=2)return parts[0].replace(/^Bvd\.\s*/,'').replace(/^Av\.\s*/,'')+' y '+parts[1].replace(/^Bvd\.\s*/,'').replace(/^Av\.\s*/,'');
  return calles;
}

// ===================== SHEET EVENT BINDING =====================
function attachSheetEvents(){
  // V7.9: Feedback service — delegates flag clicks via event delegation (bound once per sheet)
  if(window.VoyFeedbackService)VoyFeedbackService.attachToSheet();
  // Favorite toggle (V7.9: now via VoyFavoritesService for cache consistency)
  var favBtn=document.getElementById('favBtn');
  if(favBtn){
    favBtn.addEventListener('click',function(){
      var dest=MC.getDest();if(!dest)return;
      if(window.VoyFavoritesService){
        VoyFavoritesService.toggle({lat:dest.lat,lon:dest.lon,name:dest.name||'Destino'},'').then(function(nowFav){
          _favActive=nowFav;renderSheetHeadOnly();renderMemoryRow();
          if(typeof v5event==='function')v5event(nowFav?'favorite_added':'favorite_removed',{});
          if(typeof showToast==='function')showToast(nowFav?'Destino guardado':'Destino quitado',nowFav?'success':'info');
        });
      }else{
        // Legacy fallback (pre-V7.9 path)
        if(_favActive){
          MC.v5GetFavorites().then(function(favs){
            var f=favs.find(function(x){return Math.abs(x.lat-dest.lat)<0.001&&Math.abs(x.lon-dest.lon)<0.001});
            if(f){MC.v5RemoveFavorite(f.id).then(function(){_favActive=false;renderSheetHeadOnly();renderMemoryRow();showToast('Destino quitado de guardados','info')})}
          });
        }else{
          MC.v5AddFavorite({lat:dest.lat,lon:dest.lon,name:dest.name||'Destino'},'').then(function(){
            _favActive=true;renderSheetHeadOnly();renderMemoryRow();
            v5event('favorite_added',{});
            showToast('Destino guardado','success');
          });
        }
      }
    });
  }
  // Primary CTA + alt ride-hailing → deep-link dialog
  document.querySelectorAll('.cta-primary,.acc-head[data-action]').forEach(function(btn){
    btn.addEventListener('click',function(e){
      var action=btn.getAttribute('data-action'),url=btn.getAttribute('data-url'),name=btn.getAttribute('data-name');
      if(!action)return;
      openDeepLinkDialog(action,url,name);
    });
  });
  // VOY_NAVIGATOR_MVP — "Navegar" button → lazy-load isolated navigator module + start GPS-follow
  var navStartBtn=document.getElementById('navStartBtn');
  if(navStartBtn)navStartBtn.addEventListener('click',startNavigation);
  // Taxi/Remis company actions → deep-link dialog
  document.querySelectorAll('.co-action').forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      var action=btn.getAttribute('data-action'),url=btn.getAttribute('data-url'),name=btn.getAttribute('data-name');
      openDeepLinkDialog(action,url,name);
    });
  });
  // Accordion toggles
  var taxiHead=document.getElementById('accTaxiHead');
  if(taxiHead)taxiHead.addEventListener('click',function(){_sheetAccordions.taxi=!_sheetAccordions.taxi;var b=document.getElementById('accTaxiBody');if(b)b.classList.toggle('expanded',_sheetAccordions.taxi);this.classList.toggle('expanded',_sheetAccordions.taxi);this.setAttribute('aria-expanded',_sheetAccordions.taxi)});
  var remisHead=document.getElementById('accRemisHead');
  if(remisHead)remisHead.addEventListener('click',function(){_sheetAccordions.remis=!_sheetAccordions.remis;var b=document.getElementById('accRemisBody');if(b)b.classList.toggle('expanded',_sheetAccordions.remis);this.classList.toggle('expanded',_sheetAccordions.remis);this.setAttribute('aria-expanded',_sheetAccordions.remis)});
  // Bus block — VOY_COLLECTIVE_ENGINE_V1: tap any line to draw its route
  attachBusBlockEvents();
  // Bike toggle
  var bikeBtn=document.getElementById('bikeLineBtn');
  if(bikeBtn)bikeBtn.addEventListener('click',function(){_bikeDetailExpanded=!_bikeDetailExpanded;var d=document.getElementById('bikeDetail');if(d)d.classList.toggle('expanded',_bikeDetailExpanded)});
  // VOY_UI_FOCUS_V1 UI-003 — Route share → navigator.share with copy_link fallback
  var sheetShareBtn=document.getElementById('sheetShareBtn');
  if(sheetShareBtn)sheetShareBtn.addEventListener('click',shareRoute);
}

// ===================== DEEP-LINK LAUNCH (V7.3 intent + visibility-based fallback) =====================
// V7.3 DEEP_LINK_FIX: replaces the old `window.location.href = intentUrl` (which
// silently failed on non-Chrome browsers like Samsung Internet/Firefox when the
// app wasn't installed — the intent:// scheme is Chrome-specific).
//
// New strategy:
//  1. For HTTPS URLs (Uber universal link, Maxim taximaxim.com, App Store links):
//     open in new tab via window.open(). These work on all browsers.
//  2. For intent:// URLs (DiDi, Cabify, Maxim Android, Las Bicis):
//     a. Extract the S.browser_fallback_url parameter (Play Store URL).
//     b. Listen for visibilitychange — if the page becomes hidden, the app
//        opened successfully (no fallback needed).
//     c. Set a 1.5s timeout — if the page is STILL visible after 1.5s, the
//        intent failed (app not installed, or browser doesn't support intent://).
//        Redirect to the Play Store fallback URL.
//
// This is more robust than the old approach and the user's Date.now() heuristic
// (which doesn't work because Date.now() doesn't pause when the app opens).
// visibilitychange is the W3C-standard way to detect app switches.
function launchDeepLink(url){
  if(!url||url==='#')return;
  // HTTPS URLs — universal links and web fallbacks work on all browsers
  if(url.indexOf('intent://')!==0){
    window.open(url,'_blank','noopener');
    return;
  }
  // intent:// URL — extract S.browser_fallback_url (Play Store) for JS-level fallback
  var fbMatch=url.match(/S\.browser_fallback_url=([^;]+)/);
  var fallback=fbMatch?decodeURIComponent(fbMatch[1]):null;
  // Track if the app opened (page becomes hidden = app took over)
  var appOpened=false;
  function onVisChange(){if(document.hidden)appOpened=true;}
  document.addEventListener('visibilitychange',onVisChange);
  // Trigger the intent
  window.location.href=url;
  // After 1.5s, if the page never hid, the intent likely failed.
  // Fall back to the Play Store URL (for non-Chrome browsers that don't honor
  // S.browser_fallback_url natively, like Samsung Internet/Firefox).
  setTimeout(function(){
    document.removeEventListener('visibilitychange',onVisChange);
    if(!appOpened&&!document.hidden&&fallback){
      window.location.href=fallback;
    }
  },1500);
}

// ===================== DEEP-LINK CONFIRMATION DIALOG =====================
var _pendingDeepLink=null;
function bindDialogButtons(){
  document.getElementById('dgCancel').addEventListener('click',closeDeepLinkDialog);
  document.getElementById('dgConfirm').addEventListener('click',function(){
    if(!_pendingDeepLink)return;
    var p=_pendingDeepLink;
    va_cta(p.action);v5event('deeplink_opened',{provider:p.action,mode:modeForAction(p.action)});
    MC.v5LogTrip(MC.getOrigin(),MC.getDest(),modeForAction(p.action),p.action);
    closeDeepLinkDialog();
    if(p.url&&p.url!=='#'){
      // SAKANA-FIX-02a (V7.18.2): DiDi has no public deep-link params to pre-fill
      // pickup/dropoff. Copy destination address to clipboard BEFORE launchDeepLink
      // (launchDeepLink uses window.location.href which is synchronous and would abort
      // pending promises). User pastes in DiDi's search field → friction reduced from
      // "type from scratch" to "long-press → paste". Placed in confirm handler (NOT in
      // buildAppLink) because buildAppLink runs at card-render time (L2349), which would
      // overwrite the clipboard on every estimate without a user gesture.
      if(p.action==='didi'){
        var _dest=MC.getDest();
        var _addr=(_dest&&_dest.name)?_dest.name:'';
        if(_addr&&navigator.clipboard&&navigator.clipboard.writeText){
          navigator.clipboard.writeText(_addr).then(function(){
            showToast('Dirección copiada — pegala en DiDi','success');
            launchDeepLink(p.url);
          }).catch(function(e){
            console.warn('[DiDi] clipboard write failed',e);
            showToast('DiDi se abre sin destino. Anotalo: '+_addr,'info');
            launchDeepLink(p.url);
          });
        }else{
          showToast('DiDi se abre sin destino. Anotalo: '+_addr,'info');
          launchDeepLink(p.url);
        }
      }else{
        launchDeepLink(p.url);
      }
    }else{
      showToast('Abriendo '+p.name+'…','info');
    }
  });
  // Escape to close
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.getElementById('dialogOverlay').classList.contains('show'))closeDeepLinkDialog()});
}
function modeForAction(action){
  if(action==='uber'||action==='didi'||action==='maxim')return'auto';
  if(action.indexOf('taxi')===0)return'taxi';
  if(action.indexOf('remis')===0)return'remis';
  return'auto';
}
function openDeepLinkDialog(action,url,name){
  _pendingDeepLink={action:action,url:url,name:name};
  v5event('provider_selected',{provider:action});
  document.getElementById('dgProvider').textContent=name||'';
  // VOY_PROVIDER_ROUTER_V1: show a provider-appropriate icon so the user has
  // visual confirmation of WHICH app they are about to open before tapping
  // Continuar. Maps action → svg icon name (see svg() helper).
  var iconName='app';
  if(action&&action.indexOf('taxi')===0)iconName='taxi';
  else if(action&&action.indexOf('remis')===0)iconName='taxi';
  else if(action==='uber'||action==='didi'||action==='maxim')iconName='car';
  if(name&&/whatsapp/i.test(name))iconName='whatsapp';
  var iconEl=document.getElementById('dgIcon');
  if(iconEl)iconEl.innerHTML=svg(iconName,36);
  // ISSUE-2 FIX: DiDi has NO public deep link to pre-fill pickup/dropoff coordinates
  // (verified — no Universal Link, no documented didi:// params, no MCP public access).
  // Uber and Maxim DO pre-fill. To avoid the user opening DiDi and finding an empty
  // route, we surface the origin→destination as text in the dialog so they can re-enter
  // it manually in the DiDi app. Only shown for didi (not uber/maxim which pre-fill).
  var hintEl=document.getElementById('dgRouteHint');
  if(hintEl){
    if(action==='didi'){
      var o=MC.getOrigin(),d=MC.getDest();
      var oName=(o&&(o.name||'')).split(',')[0]||'origen';
      var dName=(d&&(d.name||'')).split(',')[0]||'destino';
      hintEl.innerHTML='<div class="dgrh-label">DiDi no admite pre-cargar la dirección. Ingresala manualmente:</div><div class="dgrh-route"><span class="dgrh-from">'+escapeHtml(oName)+'</span><span class="dgrh-arrow">→</span><span class="dgrh-to">'+escapeHtml(dName)+'</span></div>';
      hintEl.hidden=false;
      var ms=document.getElementById('dgMsgShort');if(ms)ms.textContent='DiDi se abre sin la ruta cargada. Anotá el destino arriba.';
    }else{
      hintEl.innerHTML='';hintEl.hidden=true;
      var ms2=document.getElementById('dgMsgShort');if(ms2)ms2.textContent='Vas a salir de VOY y abrir una app externa.';
    }
  }
  document.getElementById('dialogOverlay').classList.add('show');
}
function closeDeepLinkDialog(){
  document.getElementById('dialogOverlay').classList.remove('show');
  _pendingDeepLink=null;
}

// ===================== BUS BLOCK RENDER (VOY_COLLECTIVE_ENGINE_V1) =====================
// Top 3 ranked lines shown explicitly; each tappable to draw its real route on
// the map and reveal its detail (boarding/alighting/SUBE/walk times). Remaining
// lines collapse under "Ver N líneas más". Lives inside the main sheet surface
// (no new layer).
function renderBusBlockHTML(){
  var rankedBus=_rankedBus||[];if(!rankedBus.length)return'';
  var busConf=0.98;
  var top=rankedBus.slice(0,3),rest=rankedBus.slice(3);
  var h='';
  h+='<div class="bus-block">';
  h+='<div class="block-title"><span class="bt-ic">'+svg('bus',15)+'</span> Colectivo <span class="est-badge">Estimado · '+Math.round(busConf*100)+'%</span></div>';
  top.forEach(function(b,idx){
    var isActive=String(b.linea)===String(_activeBusLine);
    var isSec=idx>0;
    var cls='bus-line-row'+(isSec?' bus-line-row--sec':'')+(isActive?' active':'');
    h+='<button type="button" class="'+cls+'" data-linea="'+escapeAttr(b.linea)+'">';
    h+='<span class="bus-line-icon">'+svg('bus',isSec?17:20)+'</span>';
    h+='<span class="bus-line-body">';
    h+='<span class="bus-line-text">Lin. '+escapeHtml(b.linea)+' por '+escapeHtml(shortenStop(b.stopOrigenCalles))+'</span>';
    h+='<span class="bus-line-sub">Subir en '+escapeHtml(shortenStop(b.stopOrigenCalles))+' · '+formatMin(b.walkToStopMin||0)+' caminando</span>';
    h+='</span>';
    h+='<span class="bus-line-eta">'+(b.totalMin||0)+' min';
    if(b.walkToStopMin<2)h+='<span class="bus-urgent">¡apurate!</span>';
    h+='</span></button>';
    if(isActive&&_busDetailExpanded){
      h+='<div class="bus-detail expanded" style="padding-left:var(--sp-3)">';
      h+='<div class="bd-row"><span class="bd-ic">'+svg('pin',14)+'</span><span>Parada origen: '+escapeHtml(b.stopOrigenCalles||'')+'</span></div>';
      h+='<div class="bd-row"><span class="bd-ic">'+svg('flag',14)+'</span><span>Bajada: '+escapeHtml(b.stopDestCalles||'')+'</span></div>';
      h+='<div class="bd-row"><span class="bd-ic">'+svg('gauge',14)+'</span><span>SUBE: '+(b.price!=null?formatPrice(b.price):'—')+'</span></div>';
      h+='<div class="bd-row"><span class="bd-ic">'+svg('clock',14)+'</span><span>Caminata al subir: '+formatMin(b.walkToStopMin||0)+'</span></div>';
      h+='<div class="bd-row"><span class="bd-ic">'+svg('clock',14)+'</span><span>Caminata al bajar: '+formatMin(b.walkFromStopMin||0)+'</span></div>';
      h+='<div class="bd-row" style="color:var(--text3);font-size:11px;margin-top:4px">Recorrido estimado · sin feed en vivo</div>';
      h+='</div>';
    }
  });
  if(rest.length){
    h+='<div class="bus-alts'+(_busAltsExpanded?' expanded':'')+'" id="busAlts">';
    rest.forEach(function(b){
      var isActive=String(b.linea)===String(_activeBusLine);
      h+='<button type="button" class="bus-alt-row'+(isActive?' active':'')+'" data-linea="'+escapeAttr(b.linea)+'"><span class="ba-line">Lin. '+escapeHtml(b.linea)+'</span><span class="ba-stop">'+escapeHtml(shortenStop(b.stopOrigenCalles))+'</span><span class="ba-eta">'+(b.totalMin||0)+' min</span></button>';
    });
    h+='</div>';
    h+='<button type="button" class="expand-hint" id="busAltsHint">'+(_busAltsExpanded?'Cerrar ▴':('Ver '+rest.length+' líneas más ▾'))+'</button>';
  }
  h+='</div>';
  return h;
}
function selectBusLine(linea){
  if(!linea)return;
  if(String(_activeBusLine)===String(linea)){
    _busDetailExpanded=!_busDetailExpanded;
  }else{
    _activeBusLine=linea;
    _busDetailExpanded=true;
    drawBusRoute(linea);
  }
  var c=document.getElementById('busBlockContainer');
  if(c){c.innerHTML=renderBusBlockHTML();attachBusBlockEvents()}
}
function attachBusBlockEvents(){
  var rows=document.querySelectorAll('#busBlockContainer .bus-line-row, #busBlockContainer .bus-alt-row');
  for(var i=0;i<rows.length;i++){rows[i].addEventListener('click',function(ev){ev.preventDefault();selectBusLine(this.getAttribute('data-linea'))})}
  var hint=document.getElementById('busAltsHint');
  if(hint)hint.addEventListener('click',function(){
    _busAltsExpanded=!_busAltsExpanded;
    var a=document.getElementById('busAlts');if(a)a.classList.toggle('expanded',_busAltsExpanded);
    var rest=(_rankedBus||[]).slice(3);
    hint.textContent=_busAltsExpanded?'Cerrar ▴':('Ver '+rest.length+' líneas más ▾');
  });
}

// ===================== BUS ROUTE OVERLAY (estimated) =====================
// Draws the selected line's full polyline (not a straight line), the boarding
// stop marker, the alighting stop marker, then fits A→bus-route→B into the 9:16
// viewport with portrait-aware padding so the whole trip stays visible.
function drawBusRoute(linea){
  if(!_map)return;clearBusRoute();if(!linea)return;
  if(typeof _map.isStyleLoaded==='function'&&!_map.isStyleLoaded()){requestAnimationFrame(function(){drawBusRoute(linea)});return}
  if(typeof MC.getBusLineGeometry!=='function')return;
  var coords=MC.getBusLineGeometry(linea);if(!coords||coords.length<2)return;
  try{_map.addSource('bus-route-src',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:coords}}})}catch(e){}
  try{_map.addLayer({id:'bus-route-shadow',type:'line',source:'bus-route-src',layout:{'line-cap':'round'},paint:{'line-color':'#FF9500','line-width':8,'line-opacity':0.12}})}catch(e){}
  try{_map.addLayer({id:'bus-route-line',type:'line',source:'bus-route-src',layout:{'line-cap':'round'},paint:{'line-color':'#FF9500','line-width':3,'line-opacity':0.8,'line-dasharray':[2,1.5]}})}catch(e){}
  // Boarding + alighting stops from the ranked entry (uses the actual nearest
  // stop to origin/dest, more accurate than a nearest-coord scan on the polyline).
  var entry=(_rankedBus||[]).filter(function(b){return String(b.linea)===String(linea)})[0];
  var boardCoord=coords[0],alightCoord=coords[coords.length-1];
  if(entry&&entry.stopOrigen){boardCoord=[entry.stopOrigen.lon,entry.stopOrigen.lat]}
  if(entry&&entry.stopDest){alightCoord=[entry.stopDest.lon,entry.stopDest.lat]}
  try{_map.addSource('bus-board-src',{type:'geojson',data:{type:'Feature',geometry:{type:'Point',coordinates:boardCoord}}});_map.addLayer({id:'bus-board-marker',type:'circle',source:'bus-board-src',paint:{'circle-radius':6,'circle-color':'#FF9500','circle-stroke-width':2,'circle-stroke-color':'#fff'}})}catch(e){}
  try{_map.addSource('bus-alight-src',{type:'geojson',data:{type:'Feature',geometry:{type:'Point',coordinates:alightCoord}}});_map.addLayer({id:'bus-alight-marker',type:'circle',source:'bus-alight-src',paint:{'circle-radius':6,'circle-color':'#34C759','circle-stroke-width':2,'circle-stroke-color':'#fff'}})}catch(e){}
  _activeBusLine=linea;
  _fitBusRoute(coords);
}
// Fit A (origin) → bus polyline → B (dest) into the 9:16 viewport. Bottom padding
// reserves room for the ~38vh sheet + footer; top for the floating search bar.
function _fitBusRoute(busCoords){
  if(!_map||!busCoords||!busCoords.length)return;
  var origin=MC.getOrigin(),dest=MC.getDest();
  var pts=[];
  if(origin)pts.push([origin.lon,origin.lat]);
  if(dest)pts.push([dest.lon,dest.lat]);
  for(var i=0;i<busCoords.length;i++)pts.push(busCoords[i]);
  if(pts.length<2)return;
  var minLon=Infinity,minLat=Infinity,maxLon=-Infinity,maxLat=-Infinity;
  for(var j=0;j<pts.length;j++){
    if(pts[j][0]<minLon)minLon=pts[j][0];
    if(pts[j][0]>maxLon)maxLon=pts[j][0];
    if(pts[j][1]<minLat)minLat=pts[j][1];
    if(pts[j][1]>maxLat)maxLat=pts[j][1];
  }
  var vh=window.innerHeight||document.documentElement.clientHeight||844;
  var topPad=Math.round(Math.min(120,vh*0.14));
  var botPad=Math.round(vh*0.44);
  try{_map.fitBounds([[minLon,minLat],[maxLon,maxLat]],{padding:{top:topPad,bottom:botPad,left:60,right:60},duration:400})}catch(e){}
}
function clearBusRoute(){
  if(!_map)return;
  try{if(_map.getLayer('bus-alight-marker'))_map.removeLayer('bus-alight-marker')}catch(e){}
  try{if(_map.getLayer('bus-board-marker'))_map.removeLayer('bus-board-marker')}catch(e){}
  try{if(_map.getLayer('bus-route-line'))_map.removeLayer('bus-route-line')}catch(e){}
  try{if(_map.getLayer('bus-route-shadow'))_map.removeLayer('bus-route-shadow')}catch(e){}
  try{if(_map.getSource('bus-alight-src'))_map.removeSource('bus-alight-src')}catch(e){}
  try{if(_map.getSource('bus-board-src'))_map.removeSource('bus-board-src')}catch(e){}
  try{if(_map.getSource('bus-route-src'))_map.removeSource('bus-route-src')}catch(e){}
  _activeBusLine=null;
}

// ===================== LINK BUILDERS =====================
function buildAppLink(pid){
  var origin=MC.getOrigin(),dest=MC.getDest();if(!origin||!dest)return '#';
  if(pid==='uber')return 'https://m.uber.com/ul/?action=setPickup&pickup[latitude]='+origin.lat+'&pickup[longitude]='+origin.lon+'&pickup[formatted_address]=Origen&dropoff[latitude]='+dest.lat+'&dropoff[longitude]='+dest.lon;
  // FIX-001: DiDi deep link — the old didiglobal.com/passenger/deeplink URL returned
  // 302→/404 (didiglobal.com is DiDi's Chinese corporate site; /passenger/deeplink does
  // not exist). Replaced with a platform-split verified strategy:
  //   - Android: intent:// with scheme=didi + package=com.didiglobal.passenger + Play Store
  //     fallback. Opens the installed DiDi app directly; falls back to Play Store if absent.
  //   - iOS: App Store link (id1362398401, verified HTTP 200). If the app is installed,
  //     the App Store shows an "Open" button; if not, "Get". This is the only iOS path
  //     that is HTTP-verifiable (DiDi publishes no public Universal Link for third-party
  //     use, and didi:// scheme has no safe fallback if the app is absent).
  //   - Desktop: Play Store URL (verified HTTP 200).
  // All three destinations are HTTP-verified 200 — no 404 possible.
  if(pid==='didi'){
    var didiPlayStore='https://play.google.com/store/apps/details?id=com.didiglobal.passenger';
    var didiAppStore='https://apps.apple.com/ar/app/didi-viajes-comida-y-pagos/id1362398401';
    var _didiUA=navigator.userAgent||'';
    if(/Android/i.test(_didiUA))return 'intent://#Intent;scheme=didi;package=com.didiglobal.passenger;S.browser_fallback_url='+encodeURIComponent(didiPlayStore)+';end';
    if(/iPad|iPhone|iPod/.test(_didiUA))return didiAppStore;
    return didiPlayStore;
  }
  if(pid==='cabify'){
    // FIX-004: Cabify deep link — Cabify is verified available in Santa Fe (official
    // help center). Same platform-split strategy as DiDi: Android intent:// + Play Store
    // fallback, iOS App Store, Desktop Play Store. All destinations HTTP-verified 200.
    var cabifyPlayStore='https://play.google.com/store/apps/details?id=com.cabify.rider';
    var cabifyAppStore='https://apps.apple.com/ar/app/cabify-viaja-seguro/id476087442';
    var _cabUA=navigator.userAgent||'';
    if(/Android/i.test(_cabUA))return 'intent://#Intent;scheme=cabify;package=com.cabify.rider;S.browser_fallback_url='+encodeURIComponent(cabifyPlayStore)+';end';
    if(/iPad|iPhone|iPod/.test(_cabUA))return cabifyAppStore;
    return cabifyPlayStore;
  }
  if(pid==='maxim'){
    var isAndroid=/Android/i.test(navigator.userAgent);
    // UI-1: Maxim uses the `maxim://` scheme (NOT `taxsee://` — that was the parent
    // company name and never resolved, so Android fell through to the Play Store even
    // when the app was installed). With scheme=maxim + package=com.taxsee.taxsee,
    // Android opens the installed app directly; only falls back to Play Store when absent.
    if(isAndroid){var playStore='https://play.google.com/store/apps/details?id=com.taxsee.taxsee';return 'intent://order?startLat='+Number(origin.lat).toFixed(6)+'&startLon='+Number(origin.lon).toFixed(6)+'&finishLat='+Number(dest.lat).toFixed(6)+'&finishLon='+Number(dest.lon).toFixed(6)+'#Intent;scheme=maxim;package=com.taxsee.taxsee;S.browser_fallback_url='+encodeURIComponent(playStore)+';end'}
    return 'https://taximaxim.com/ar/';
  }
  return '#';
}
function buildBikeLink(){
  var isAndroid=/Android/i.test(navigator.userAgent);
  if(isAndroid)return 'intent://#Intent;scheme=lasbicis;package=com.santafe.lasbicis;end';
  var isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
  if(isIOS)return 'https://apps.apple.com/ar/app/id6444962582';
  return 'https://www.santafe.gob.ar/index.php/educacionycultura/content/download/55027/283898/file/Las%20Bicis.pdf';
}

// ===================== VOY_SHARE_SUPPORT_V1 (footer disclosure — share + support) =====================
// RULES: footer_only placement, low visibility trigger, content hidden by default (no mostrar siempre).
// Share: navigator.share with copy-link fallback. Support: copies MercadoPago alias "SIMON.BI".
var _footerMenuOpen=false;
function toggleFooterMenu(force){
  var menu=document.getElementById('footerMenu');if(!menu)return;
  var btn=document.getElementById('footerMore');if(!btn)return;
  var open=(typeof force==='boolean')?force:!_footerMenuOpen;
  _footerMenuOpen=open;
  if(open){menu.removeAttribute('hidden');requestAnimationFrame(function(){menu.classList.add('show')});btn.setAttribute('aria-expanded','true')}
  else{menu.classList.remove('show');btn.setAttribute('aria-expanded','false');setTimeout(function(){if(!_footerMenuOpen)menu.setAttribute('hidden','')},180)}
}
function closeFooterMenu(){toggleFooterMenu(false)}
function _fallbackCopy(text){
  try{var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.top='-9999px';ta.setAttribute('readonly','');document.body.appendChild(ta);ta.select();var ok=document.execCommand('copy');ta.remove();return ok}catch(e){return false}
}
// VOY_UI_FOCUS_V1 UI-003 — Share CURRENT ROUTE context only (not the generic app share).
// Builds a route deep-link (?from=lat,lon&to=lat,lon&dn=name) + a compact text summary,
// then uses navigator.share → clipboard → execCommand fallback chain.
// scope: current_route_context_only — payload carries origin+dest, never memory/prefs.
function shareRoute(){
  var origin=MC.getOrigin(),dest=MC.getDest();
  if(!origin||!dest){showToast('Elegí un destino para compartir','info');return}
  var base=window.location.origin+window.location.pathname;
  var params='?from='+origin.lat.toFixed(6)+','+origin.lon.toFixed(6)
            +'&to='+dest.lat.toFixed(6)+','+dest.lon.toFixed(6)
            +'&dn='+encodeURIComponent((dest.name||'Destino').split(',')[0]);
  var url=base+params;
  var oName=(origin.name||'Mi ubicación').split(',')[0];
  var dName=(dest.name||'Destino').split(',')[0];
  var text='VOY — '+oName+' → '+dName;
  var shareData={title:'VOY — viaje',text:text,url:url};
  var onDone=function(via){v5event('share_route',{via:via});closeFooterMenu()};
  if(navigator.share){
    navigator.share(shareData).then(function(){onDone('native')}).catch(function(e){
      if(e&&e.name==='AbortError')return; // user cancelled the share sheet — silent
      _copyRouteLink(url,onDone);
    });
  }else{
    _copyRouteLink(url,onDone);
  }
}
function _copyRouteLink(url,onDone){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(function(){showToast('Enlace del viaje copiado','success');onDone('clipboard')}).catch(function(){
      if(_fallbackCopy(url)){showToast('Enlace del viaje copiado','success');onDone('copy_fallback')}else{showToast('No se pudo copiar el enlace','error')}
    });
  }else{
    if(_fallbackCopy(url)){showToast('Enlace del viaje copiado','success');onDone('copy_fallback')}else{showToast('No se pudo copiar el enlace','error')}
  }
}
// VOY_UI_FOCUS_V1 UI-003 — Restore a shared route from a deep-link URL on boot.
// scope: current_route_context_only — reads only from/to/dn, never touches memory/prefs.
// If `from` is present it becomes the origin (marked manual so GPS won't override the
// shared context); otherwise dest is set and GPS/cache will supply origin and trigger
// runEstimations via _handleGpsPosition. Malformed links fail silently → normal boot.
function restoreRouteFromUrl(){
  try{
    var q=new URLSearchParams(window.location.search);
    var to=q.get('to'),from=q.get('from'),dn=q.get('dn');
    if(!to)return;
    var tp=to.split(',');if(tp.length<2)return;
    var dLat=parseFloat(tp[0]),dLon=parseFloat(tp[1]);
    if(!isFinite(dLat)||!isFinite(dLon))return;
    var name=dn?decodeURIComponent(dn):'Destino';
    if(from){
      var fp=from.split(',');if(fp.length>=2){
        var oLat=parseFloat(fp[0]),oLon=parseFloat(fp[1]);
        if(isFinite(oLat)&&isFinite(oLon)){MC.setOrigin(oLat,oLon,'Origen compartido','share');MC.setOriginManual(true);va_origin('share');updateOriginUI();updateMapMarkers()}
      }
    }
    MC.setDest(dLat,dLon,name,'share');va_dest(name,dLat,dLon);
    var di=document.getElementById('destInput');if(di){di.value=name.split(',')[0]}
    updateMapMarkers();checkFavActive();v5event('destination_selected',{source:'share_link'});
    if(MC.getOrigin())runEstimations();
    if(_map)_map.flyTo({center:[dLon,dLat],zoom:14});
  }catch(e){/* malformed share link — silent, normal boot continues */}
}
function shareApp(){
  var url=window.location.href;
  var shareData={title:'VOY — Movilidad Santa Fe',text:'Compará Uber, DiDi, Maxim, taxi, remis y colectivo en un solo lugar.',url:url};
  if(navigator.share){
    navigator.share(shareData).then(function(){v5event('share_app',{via:'native'})}).catch(function(e){
      if(e&&e.name==='AbortError')return; // user cancelled share sheet — silent
      if(_fallbackCopy(url)){showToast('Enlace copiado','success');v5event('share_app',{via:'copy_fallback'})}else{showToast('No se pudo compartir','error')}
    });
  }else if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(function(){showToast('Enlace copiado','success');v5event('share_app',{via:'clipboard'})}).catch(function(){
      if(_fallbackCopy(url)){showToast('Enlace copiado','success');v5event('share_app',{via:'copy_fallback'})}else{showToast('No se pudo copiar el enlace','error')}
    });
  }else{
    if(_fallbackCopy(url)){showToast('Enlace copiado','success');v5event('share_app',{via:'copy_fallback'})}else{showToast('No se pudo copiar el enlace','error')}
  }
  closeFooterMenu();
}
function supportCreator(){
  var alias='SIMON.BI';
  var ok=false;
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(alias).then(function(){showToast('Alias copiado: '+alias+' — ¡Gracias!','success');v5event('support_alias_copied',{alias:alias,via:'clipboard'})}).catch(function(){
      if(_fallbackCopy(alias)){showToast('Alias copiado: '+alias+' — ¡Gracias!','success');v5event('support_alias_copied',{alias:alias,via:'fallback'})}else{showToast('Alias: '+alias,'info')}
    });
  }else{
    if(_fallbackCopy(alias)){showToast('Alias copiado: '+alias+' — ¡Gracias!','success');v5event('support_alias_copied',{alias:alias,via:'fallback'})}else{showToast('Alias: '+alias,'info')}
  }
  closeFooterMenu();
}
function bindFooterMenu(){
  var btn=document.getElementById('footerMore');if(btn)btn.addEventListener('click',function(e){e.stopPropagation();toggleFooterMenu()});
  var sh=document.getElementById('fmShare');if(sh)sh.addEventListener('click',shareApp);
  var sp=document.getElementById('fmSupport');if(sp)sp.addEventListener('click',supportCreator);
  // Close on outside click
  document.addEventListener('click',function(e){
    if(!_footerMenuOpen)return;
    var menu=document.getElementById('footerMenu');var more=document.getElementById('footerMore');
    if(menu&&more&&!menu.contains(e.target)&&!more.contains(e.target))closeFooterMenu();
  });
  // Close on Escape
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&_footerMenuOpen)closeFooterMenu()});
}

// ===================== TOAST =====================
function showToast(msg,type){
  type=type||'info';
  var c=document.getElementById('toastContainer');if(!c)return;
  var el=document.createElement('div');el.className='toast '+type;el.textContent=msg;
  c.appendChild(el);
  setTimeout(function(){el.style.opacity='0';el.style.transition='opacity .3s';setTimeout(function(){if(el.parentNode)el.remove()},300)},2500);
}

// ===================== SERVICE WORKER (V7.1 / Gemini AC-7) =====================
// Conservative offline shell: network-first navigations (NEVER stale HTML),
// stale-while-revalidate for same-origin static assets. See /sw.js.
if('serviceWorker' in navigator){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('/sw.js').then(function(){}).catch(function(){});
  });
}

// ===================== V7.4 CATEGORY MANAGER (semantic_density grouping + horizontal swipe) =====================
// Blueprint: CategoryManager config — 3 semantic groups (Privados/Activos/Público).
// Wraps the existing #modeSelector (swaps class mode-selector → category-wrapper).
// Does NOT delete old initModeSelector() code — rollback via window.VOY_CATEGORY_MANAGER_ENABLED=false.
// Groups: Privados(Auto/Taxi/Remis), Activos(A pie/Bicicleta), Público(Colectivo).
// Interaction: horizontal swipe between groups (collapse_threshold_ms=300), slide-fade animation.
window.VOY_CATEGORY_MANAGER_ENABLED=true;
var CATEGORY_GROUPS=[
  // V7.5: group_ahorro at position 0 — recommendation tab (badge-driven, not a real mode group).
  // Contains 'bus' mode so the Colectivo pill + BadgeRenderer render inside its panel.
  // setMode() auto-switch SKIPS this group (only entered via explicit tab tap).
  {id:'group_ahorro',label:'Ahorro',icon:'savings',modes:['bus'],ahorro:true},
  {id:'group_private',label:'Privados',icon:'car',modes:['car','taxi','remis']},
  {id:'group_eco',label:'Activos',icon:'route',modes:['walk','bike']},
  {id:'group_public',label:'Público',icon:'bus',modes:['bus']}
];
var MODE_META={
  car:{label:'Auto',icon:'car'},
  taxi:{label:'Taxi',icon:'taxi'},
  remis:{label:'Remis',icon:'navigate'},
  walk:{label:'A pie',icon:'route'},
  bike:{label:'Bicicleta',icon:'bike'},
  bus:{label:'Colectivo',icon:'bus'}
};
var _activeGroup=0; // V7.9 UI_FIX: default to Ahorro (group 0) — comparative Bus vs Privados view
var _catTouchStartX=0,_catTouchStartT=0;
function initCategoryManager(){
  if(!window.VOY_CATEGORY_MANAGER_ENABLED){initModeSelector();return}
  var el=document.getElementById('modeSelector');if(!el)return;
  el.classList.add('category-wrapper');
  el.classList.remove('mode-selector');
  el.setAttribute('role','tablist');
  el.setAttribute('aria-label','Modo de transporte');
  // V7.13 UNIFIED_GHOST_UI: aplanar todos los modos únicos en 1 sola fila scrollable.
  // Antes: cat-tabs (Ahorro/Privados/Activos/Público) + cat-panels-track con slide = 2 filas, 97px altura.
  // Ahora: 6 mode-pills en 1 fila, 36px altura. Ahorro = badge animado sobre Colectivo (renderAhorroBadges).
  var uniqueModes=['car','taxi','remis','bus','walk','bike'];
  var pillsHTML=uniqueModes.map(function(modeId){
    var meta=MODE_META[modeId]||{label:modeId,icon:'car'};
    return '<button class="mode-pill'+(modeId===_activeMode?' active':'')+'" data-mode="'+modeId+'" role="tab" aria-selected="'+(modeId===_activeMode)+'"><span class="mp-ic">'+svg(meta.icon,16)+'</span><span class="mp-lbl">'+meta.label+'</span></button>';
  }).join('');
  el.innerHTML=pillsHTML;
  _activeGroup=_mapModeToGroup(_activeMode); // V7.13: sync interno para compat
  renderAhorroBadges(); // V7.5: mount badge sobre Colectivo si aplica (no-op si condition false)
  el.addEventListener('click',function(e){
    var pill=e.target.closest('.mode-pill');if(!pill)return;
    setMode(pill.getAttribute('data-mode'));
  });
}
// V7.13: mapeo modo→grupo para mantener compat con código que lee _activeGroup.
// Ya no hay UI de grupos, pero _activeGroup se sincroniza para no romper referencias.
function _mapModeToGroup(modeId){
  if(modeId==='car'||modeId==='taxi'||modeId==='remis')return 1; // Privados
  if(modeId==='walk'||modeId==='bike')return 2; // Activos
  if(modeId==='bus')return 3; // Público
  return 0;
}
function setCategoryGroup(idx,animate){
  // V7.13: no-op visual (no hay cat-tabs ni slide). Mantiene _activeGroup para compat.
  if(idx<0||idx>=CATEGORY_GROUPS.length)return;
  _activeGroup=idx;
  var g=CATEGORY_GROUPS[idx];
  if(g&&g.modes&&g.modes.length){
    var _curHasMode=g.modes.indexOf(_activeMode)>=0;
    if(!_curHasMode){setMode(g.modes[0])}
  }
}
function setMode(modeId){
  _activeMode=modeId;
  _activeGroup=_mapModeToGroup(modeId); // V7.13: sync compat
  var pills=document.querySelectorAll('.mode-pill');
  for(var i=0;i<pills.length;i++){
    var on=pills[i].getAttribute('data-mode')===modeId;
    pills[i].classList.toggle('active',on);
    pills[i].setAttribute('aria-selected',on);
  }
  if(window.VoyEventBus)VoyEventBus.emit('vehicle_viewed',{mode:_activeMode});
  renderSheet();
}

// ===================== V7.4 MAP STATE MANAGER (3-state machine + floating chip) =====================
// Blueprint: MapStateManager — SEARCH_FOCUS / ROUTE_PREVIEW / FULL_MAP.
// Decoupled from rendering via VoyMapContext (observer pattern). Any component can
// request a state change via VoyMapContext.setState(). CSS rules on body[data-map-state]
// handle panel visibility/transform.
// Triggers: on_search_input → SEARCH_FOCUS, on_route_select → ROUTE_PREVIEW,
//           on_map_drag → FULL_MAP, on_chip_tap → SEARCH_FOCUS.
// Performance: all animations use transform: translateY() (hardware-accelerated, no layout).
window.VoyMapContext=(function(){
  var _state='SEARCH_FOCUS';
  var _listeners=[];
  function setState(s){
    if(s===_state)return;
    var prev=_state;_state=s;
    document.body.setAttribute('data-map-state',s);
    for(var i=0;i<_listeners.length;i++){
      try{_listeners[i](s,prev)}catch(e){console.error('[VoyMapContext] listener error',e)}
    }
  }
  return {
    getState:function(){return _state},
    setState:setState,
    subscribe:function(fn){_listeners.push(fn);return function(){_listeners=_listeners.filter(function(f){return f!==fn})}}
  };
})();
function updateFloatingChip(){
  var textEl=document.getElementById('mfcText');if(!textEl)return;
  var dest=MC.getDest();
  textEl.textContent=dest?(dest.name||'Destino').split(',')[0]:'Destino';
}
function initFloatingChip(){
  var chip=document.getElementById('mapFloatingChip');if(!chip)return;
  var iconEl=document.getElementById('mfcIcon');
  if(iconEl)iconEl.innerHTML=svg('mapPin',16);
  chip.addEventListener('click',function(){
    VoyMapContext.setState('SEARCH_FOCUS'); // on_chip_tap → SEARCH_FOCUS
    var inp=document.getElementById('destInput');
    if(inp){inp.focus();inp.select()}
  });
  chip.addEventListener('keydown',function(e){
    if(e.key==='Enter'||e.key===' '){e.preventDefault();chip.click()}
  });
  VoyMapContext.subscribe(function(state){
    chip.setAttribute('aria-hidden',state!=='FULL_MAP');
  });
}

// V7.8 MODULAR_REFACTOR: VoyAhorroService + VoyHistoryDB + VoyTrendEngine + VoyHealthMonitor + VoyDebugPanel moved to /core/ahorro.js + /core/trend.js + /core/telemetry.js (loaded as external <script> tags before this inline block).

// ===================== V7.8 OFFLINE PWA — Offline Chip (MapStateManager integration) =====================
// Blueprint: ui_resiliencia — global 'online'/'offline' listeners render an amber Offline Chip
// (#FF9800, wifi-off icon) that blocks search input + API calls when navigator.onLine === false.
// Local trend history (VoyHistoryDB) remains queryable. Never freezes the UI — all fetches
// (OSRM, Nominatim) already have .catch() handlers, so offline just silently no-ops.
function initOfflineChip(){
  var chip=document.getElementById('offlineChip');if(!chip)return;
  var iconEl=document.getElementById('ocIcon');
  if(iconEl)iconEl.innerHTML=svg('wifiOff',16);
  function update(){
    var online=navigator.onLine;
    if(online){
      chip.classList.remove('visible');
      chip.setAttribute('aria-hidden','true');
      document.body.removeAttribute('data-offline');
    }else{
      chip.classList.add('visible');
      chip.setAttribute('aria-hidden','false');
      document.body.setAttribute('data-offline','true');
    }
  }
  window.addEventListener('online',update);
  window.addEventListener('offline',update);
  update();
}
```

## 3b. `public/VOY-Lite.html` — closing tags

The closing `</script>`, `</body>`, and `</html>` tags that follow the inline JavaScript block. Included for completeness so that every line of the source file is represented in this dump.

```html
</script>
</body>
</html>
```

## 4. `worker.js` — Cloudflare Worker backend

Single Cloudflare Worker (`voy-app`). Routing rules: hide `/VOY-Lite.html` → 301 → `/`; `/api/events` POST → 3 canonical events (`estimation` / `provider_tap` / `search`) → Cloudflare Analytics Engine via `ctx.waitUntil(env.VOY_METRICS.writeDataPoint(...))`; `/api/telemetry` POST → fire-and-forget beacon ingestion (LCP + JS errors); `/api/whoami` → owner self-detect IP + SHA-256; `/api/health` → version + build_hash + filter counts; `/` → internal rewrite to `/VOY-Lite.html` with `Cache-Control: no-store` + `Set-Cookie: voy_sid`. Exclusion filters: localhost, headless, bot, `GLM_*` UA, owner_ip, owner_ip_hash (SHA-256), dev_ip, custom UA regex patterns. Cron trigger Mon 06:00 UTC. Complete verbatim, 401 lines.

```javascript
// ============================================================
//  VOY — Cloudflare Worker (V7.8: WAE analytics + sessionID + cron)
//
//  Canonical origin:  https://voy.is-a.dev  (is-a.dev PR #41619 open)
//  Worker name:       voy-app  (updates the EXISTING production worker)
//
//  Rules (evaluated in order):
//   1. /VOY-Lite.html  → 301 → /  (same-host relative redirect; hides internal path)
//   2. CANONICAL REDIRECT DISABLED until voy.is-a.dev is registered.
//   3. /api/events  → POST → Analytics Engine (VOY_METRICS) + 202 (fire-and-forget)
//   4. /  → internal rewrite → /VOY-Lite.html  (browser URL stays /)
//   5. everything else → ASSETS binding (core/, ui/, icons/, manifest.json, …)
//
//  Analytics (V7.8 — 3 eventos, WAE only):
//   - 3 eventos canónicos: 'estimation', 'provider_tap', 'search'
//   - Nombres legacy se normalizan a estos 3 (ver EVENT_NORMALIZE).
//   - WAE writeDataPoint via ctx.waitUntil() — no bloquea la respuesta.
//   - sessionID via cookie (voy_sid) — sin auth, distingue sesiones únicas.
//   - DATA_POLICY: no_personal_identifiable_storage · route_only_event_aggregation · geo_approximation_only.
//     (anon_id only; WAE stores provider/mode/price/time/distance + ~500m geo cluster; no raw lat/lon, no email/name.)
//   - Filtros de exclusión (ANALYTICS_SYSTEM_SETUP V7.8.1):
//       · localhost, headless, bot      (env: VOY_EXCLUDE_LOCALHOST/HEADLESS/BOT)
//       · glm_agent (GLM_* UA filter)   (env: VOY_EXCLUDE_GLM)
//       · owner_ip / owner_ip_hash      (env: VOY_OWNER_IPS / VOY_OWNER_IP_HASHES — SIMON_DEVICE rule)
//       · dev_ip                         (env: VOY_DEV_IPS)
//       · custom UA patterns             (env: VOY_EXCLUDE_UA_PATTERNS — comma-separated regex)
//   - /api/whoami: owner self-detects IP + SHA-256 to populate exclusion vars (USER_IP_DETECTED).
//   - /api/health: exposes filter counts (not values) for verification.
//   - Si VOY_METRICS está ausente (dry-run), devuelve 202 gracefully.
// ============================================================

const CANONICAL_ORIGIN = "https://voy.is-a.dev"; // disabled until is-a.dev is live
const WORKER_VERSION = "V7.8.0"; // V7.8 = analytics simplificado (3 eventos WAE + sessionID cookie + cron tarifas). DO + /api/reports eliminados. 0 código muerto.
// __BUILD_HASH__ is replaced by CI at deploy time (scripts/inject-build-hash.mjs).
// verify-production.sh checks /api/health.build_hash === git short SHA.
const BUILD_HASH = "__BUILD_HASH__";

// V7.8 — 3 eventos canónicos. Nombres legacy se mapean a estos.
const V2_EVENTS = ['estimation', 'provider_tap', 'search'];
const EVENT_NORMALIZE = {
  // → estimation
  estimation: 'estimation',
  route_calculated: 'estimation',
  ride_estimated: 'estimation',
  route_selected: 'estimation',
  destination_selected: 'estimation',
  // → provider_tap
  provider_tap: 'provider_tap',
  provider_click: 'provider_tap',
  provider_clicked: 'provider_tap',
  deeplink_opened: 'provider_tap',
  vehicle_viewed: 'provider_tap',
  // → search
  search: 'search',
  search_performed: 'search',
  voice_search: 'search',
};

// V7.8.1 — ANALYTICS_SYSTEM_SETUP: filtros de exclusión ampliados.
//   - localhost / headless / bot (heredados)
//   - GLM_* user-agent (GLM_AGENT rule — excludes z-ai/GLM automated agents)
//   - owner_ip + owner_ip_hash (SIMON_DEVICE rule — hash-based OR direct IP)
//   - dev_ip
//   - custom UA patterns (VOY_EXCLUDE_UA_PATTERNS, comma-separated regex)
// All rules are opt-in/opt-out via env vars (dashboard or wrangler.jsonc vars).
function _loadFilterConfig(env) {
  const list = (v) => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);
  return {
    owner_ips: list(env.VOY_OWNER_IPS),
    // SHA-256 hex hashes of owner IPs (hash-based mode — never stores raw IP in config).
    owner_ip_hashes: list(env.VOY_OWNER_IP_HASHES).map(h => h.toLowerCase()),
    dev_ips: list(env.VOY_DEV_IPS),
    exclude_localhost: env.VOY_EXCLUDE_LOCALHOST !== 'false',
    exclude_headless: env.VOY_EXCLUDE_HEADLESS !== 'false',
    exclude_bot: env.VOY_EXCLUDE_BOT !== 'false',
    exclude_glm: env.VOY_EXCLUDE_GLM !== 'false',
    // Additional UA regex patterns (comma-separated, case-insensitive).
    exclude_ua_patterns: list(env.VOY_EXCLUDE_UA_PATTERNS)
  };
}

const BOT_UA = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|facebookexternalhit|ia_archiver|applebot|twitterbot|linkedinbot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot/i;
const HEADLESS_UA = /headlesschrome|phantomjs|slimerjs|puppeteer|playwright|webdriver|selenium|chrome-lighthouse|w3c_validator|nightmare|crawly|crawler/i;
// GLM_AGENT rule — excludes UAs starting with "GLM" (z-ai/GLM automated agents, e.g. "GLM/4.6", "GLM-agent", "GLM_bot"). Spec: GLM_*
const GLM_UA = /^GLM[\s\/\-_:]/i;

// Cache compiled custom UA regexes per config signature (avoid recompiling on every request).
let _customUaCache = { sig: null, regexes: [] };
function _compiledUaPatterns(cfg) {
  const sig = cfg.exclude_ua_patterns.join('|');
  if (_customUaCache.sig === sig) return _customUaCache.regexes;
  _customUaCache.regexes = cfg.exclude_ua_patterns
    .map(p => { try { return new RegExp(p, 'i'); } catch (_) { return null; } })
    .filter(Boolean);
  _customUaCache.sig = sig;
  return _customUaCache.regexes;
}

// SHA-256 hex of a string (Web Crypto, available in Workers). Used for hash-based IP exclusion.
async function _sha256Hex(text) {
  try {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(buf);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
    return hex;
  } catch (_) { return ''; }
}

// ctx may include { ip, ua, ipHash } — ipHash is pre-computed by caller only when
// owner_ip_hashes is non-empty (avoids hashing every request unnecessarily).
function _shouldExclude(ctx, cfg) {
  if (cfg.exclude_localhost && (ctx.ip === '127.0.0.1' || ctx.ip === '::1' || ctx.ip === '')) return 'localhost';
  // SIMON_DEVICE — direct IP match (mode: ip_exclusion)
  if (cfg.owner_ips.length && cfg.owner_ips.indexOf(ctx.ip) > -1) return 'owner_ip';
  // SIMON_DEVICE — hash-based match (mode: hash_based). More privacy-friendly: config stores only the hash.
  if (cfg.owner_ip_hashes.length && ctx.ipHash && cfg.owner_ip_hashes.indexOf(ctx.ipHash) > -1) return 'owner_ip_hash';
  if (cfg.dev_ips.length && cfg.dev_ips.indexOf(ctx.ip) > -1) return 'developer_ip';
  if (cfg.exclude_headless && HEADLESS_UA.test(ctx.ua)) return 'headless';
  if (cfg.exclude_bot && BOT_UA.test(ctx.ua)) return 'bot';
  // GLM_AGENT — user_agent_filter, value: GLM_*
  if (cfg.exclude_glm && GLM_UA.test(ctx.ua)) return 'glm_agent';
  // Custom UA patterns (extensible)
  const res = _compiledUaPatterns(cfg);
  for (let i = 0; i < res.length; i++) {
    if (res[i].test(ctx.ua)) return 'ua_pattern:' + cfg.exclude_ua_patterns[i];
  }
  return null;
}

// V7.8 — sessionID via cookie. Sin auth, distingue sesiones únicas para retención.
function _getOrCreateSessionId(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/voy_sid=([^;]+)/);
  if (match) return { sid: match[1], isNew: false };
  return { sid: crypto.randomUUID().slice(0, 8), isNew: true };
}

const worker = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const pathLower = url.pathname.toLowerCase();

    // 1) Hide internal entry path → same-host root (relative 301).
    if (pathLower === "/voy-lite.html" || pathLower === "/voy-lite") {
      return Response.redirect("/", 301);
    }

    // 2) CANONICAL REDIRECT — DISABLED until voy.is-a.dev is registered.
    // if (host.endsWith(".workers.dev") || host.includes("simondalmasso")) {
    //   const target = CANONICAL_ORIGIN + url.pathname + url.search;
    //   return Response.redirect(target, 301);
    // }

    // 3) Analytics ingestion endpoint — 3 eventos → WAE.
    if (pathLower === "/api/events" && request.method === "POST") {
      return _handleEvents(request, env, ctx);
    }
    if (pathLower === "/api/events" && request.method === "OPTIONS") {
      return _cors(new Response(null, { status: 204 }));
    }
    // V7.7 PERFORMANCE_AUDIT_AND_TELEMETRY — /api/telemetry: Beacon API ingestion (fire-and-forget).
    //   Accepts {event, value, route, ts}. Receives LCP + JS errors + unhandled promise rejections
    //   from VoyHealthMonitor (client). Same exclusion filters as /api/events (no bot/localhost/owner noise).
    //   Logs to wrangler tail; writes a 'telemetry' WAE datapoint if VOY_METRICS is bound (queryable separately).
    if (pathLower === "/api/telemetry" && request.method === "POST") {
      return _handleTelemetry(request, env, ctx);
    }
    if (pathLower === "/api/telemetry" && request.method === "OPTIONS") {
      return _cors(new Response(null, { status: 204 }));
    }
    // ANALYTICS_SYSTEM_SETUP — /api/whoami: lets the OWNER detect their own IP + SHA-256
    // so they can populate VOY_OWNER_IPS (direct) or VOY_OWNER_IP_HASHES (hash-based).
    // Returns ONLY the caller's own info (no cross-user data, no PII stored server-side).
    // Also reports whether the caller would currently be excluded → instant config feedback.
    if (pathLower === "/api/whoami") {
      const callerIp = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
      const callerUa = request.headers.get("user-agent") || "";
      const wcfg = _loadFilterConfig(env);
      const ipHash = (callerIp && wcfg.owner_ip_hashes.length) ? await _sha256Hex(callerIp) : '';
      const excluded = _shouldExclude({ ip: callerIp, ua: callerUa, ipHash }, wcfg);
      return _cors(new Response(JSON.stringify({
        ip: callerIp,
        ip_sha256: ipHash || (callerIp ? await _sha256Hex(callerIp) : ''),
        ua: callerUa.slice(0, 120),
        excluded: excluded,
        note: "Visit this endpoint to detect your IP, then set VOY_OWNER_IPS (raw) or VOY_OWNER_IP_HASHES (SHA-256) in wrangler.jsonc vars / CF dashboard."
      }), { headers: { "Content-Type": "application/json" } }));
    }
    if (pathLower === "/api/health") {
      const hcfg = _loadFilterConfig(env);
      return _cors(new Response(JSON.stringify({
        ok: true, service: "voy-app", version: WORKER_VERSION, build_hash: BUILD_HASH,
        analytics: !!(env.VOY_METRICS),
        // Expose active filter COUNTS (not values) for verification — no PII leak.
        filters: {
          owner_ips: hcfg.owner_ips.length,
          owner_ip_hashes: hcfg.owner_ip_hashes.length,
          dev_ips: hcfg.dev_ips.length,
          exclude_localhost: hcfg.exclude_localhost,
          exclude_headless: hcfg.exclude_headless,
          exclude_bot: hcfg.exclude_bot,
          exclude_glm: hcfg.exclude_glm,
          exclude_ua_patterns: hcfg.exclude_ua_patterns.length
        },
        time: new Date().toISOString()
      }), { headers: { "Content-Type": "application/json" } }));
    }

    // 4) Root → internal rewrite to VOY-Lite.html.
    //    Cache-Control: no-store on HTML so edge never serves stale UI.
    //    Set-Cookie: voy_sid on first visit (sessionID for analytics).
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = "/VOY-Lite.html";
      const resp = await env.ASSETS.fetch(new Request(url, request));
      return _htmlNoStore(resp, request);
    }

    // 5) All other paths → static assets (with header cleanup).
    const resp = await env.ASSETS.fetch(request);
    return _cleanHeaders(resp);
  },

  // V7.8 — Cron trigger: recordatorio semanal de revisión de tarifas.
  // Lunes 06:00 UTC. Solo loguea; el hook queda listo para fuente oficial futura.
  async scheduled(event, env, ctx) {
    console.log('[VOY CRON] Recordatorio: verificar tarifas municipales (Resolución N°217/2026). Próxima revisión: ver fares.json _meta.proxima_revision.');
  }
};

export default worker;

// ---------------- Analytics handler (V7.8 — 3 eventos, WAE only) ----------------
async function _handleEvents(request, env, ctx) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return _cors(new Response(JSON.stringify({ ok: false, error: "bad_json" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    }));
  }

  const events = body && Array.isArray(body.events) ? body.events : null;
  if (!events) {
    return _cors(new Response(JSON.stringify({ ok: false, error: "no_events" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    }));
  }

  // --- filtros de exclusión (localhost / headless / bot / glm_agent / owner_ip / owner_ip_hash / dev_ip / ua_pattern) ---
  const cfg = _loadFilterConfig(env);
  const ip = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ua = request.headers.get("user-agent") || "";
  // Hash-based owner-IP check — only compute SHA-256 when owner_ip_hashes is configured
  // (avoids the digest cost on every request otherwise).
  const ipHash = (cfg.owner_ip_hashes.length && ip) ? await _sha256Hex(ip) : '';
  const excludeReason = _shouldExclude({ ip, ua, ipHash }, cfg);
  if (excludeReason) {
    return _cors(new Response(JSON.stringify({
      ok: true, received: events.length, written: 0, excluded: events.length, reason: excludeReason
    }), { status: 202, headers: { "Content-Type": "application/json" } }));
  }

  // --- sessionID (cookie-based, sin auth) ---
  const { sid } = _getOrCreateSessionId(request);

  // --- normalización: legacy → 3 eventos canónicos ---
  const normalized = [];
  for (const e of events) {
    const canonical = EVENT_NORMALIZE[e.name];
    if (!canonical) continue; // drop non-canonical events
    normalized.push({
      name: canonical,
      anon_id: String(e.anon_id || sid).slice(0, 64),
      ts: Number(e.ts) || Date.now(),
      geo: String(e.geo || "").slice(0, 60),
      data: e.data || {}
    });
  }
  if (!normalized.length) {
    return _cors(new Response(JSON.stringify({ ok: true, received: events.length, written: 0, note: "no_canonical_events" }), {
      status: 202, headers: { "Content-Type": "application/json" }
    }));
  }

  // --- WAE write (fire-and-forget via ctx.waitUntil) ---
  let aeWritten = 0;
  if (env.VOY_METRICS && typeof env.VOY_METRICS.writeDataPoint === "function") {
    ctx.waitUntil((async () => {
      for (const e of normalized) {
        try {
          env.VOY_METRICS.writeDataPoint({
            indexes: [e.name],              // 'estimation' | 'provider_tap' | 'search'
            blobs: [
              e.anon_id,                     // sessionID o anon_id
              String(e.data && e.data.provider || ''),  // uber|didi|maxim|taxi|bus|...
              String(e.data && e.data.mode || '')       // auto|moto|bus|walk|bike
            ],
            doubles: [
              Number(e.data && e.data.price) || 0,      // precio estimado
              Number(e.data && e.data.time_min) || 0,   // tiempo estimado
              Number(e.data && e.data.distance_km) || 0 // distancia
            ]
          });
          aeWritten++;
        } catch (_) { /* WAE failure never breaks the app */ }
      }
    })());
  }

  return _cors(new Response(JSON.stringify({
    ok: true, received: events.length, normalized: normalized.length,
    written: aeWritten, session_id: sid
  }), { status: 202, headers: { "Content-Type": "application/json" } }));
}

// ---------------- V7.7 Telemetry handler (Beacon API: LCP + JS errors + promise rejections) ----------------
// Fire-and-forget ingestion endpoint. Never blocks unload (sendBeacon). Schema: {event, value, route, ts}.
// Reuses the same exclusion model as /api/events so owner/bot/localhost noise never reaches the log.
async function _handleTelemetry(request, env, ctx) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return _cors(new Response(JSON.stringify({ ok: false, error: "bad_json" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    }));
  }
  // Exclusion filters (same model as /api/events — never log bot/localhost/owner noise).
  const cfg = _loadFilterConfig(env);
  const ip = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ua = request.headers.get("user-agent") || "";
  const ipHash = (cfg.owner_ip_hashes.length && ip) ? await _sha256Hex(ip) : '';
  const excludeReason = _shouldExclude({ ip, ua, ipHash }, cfg);
  if (excludeReason) {
    return _cors(new Response(JSON.stringify({ ok: true, excluded: true, reason: excludeReason }), {
      status: 202, headers: { "Content-Type": "application/json" }
    }));
  }
  const event = String(body && body.event || "").slice(0, 40);
  const value = Number(body && body.value) || 0;
  const route = String(body && body.route || "").slice(0, 140);
  const ts = Number(body && body.ts) || Date.now();
  // Fire-and-forget log (visible via `wrangler tail`).
  try { console.log(JSON.stringify({ telemetry: true, event, value, route, ts })); } catch (_) {}
  // Optional WAE persistence (index 'telemetry' keeps it queryable separately from product events).
  if (env.VOY_METRICS && typeof env.VOY_METRICS.writeDataPoint === "function") {
    ctx.waitUntil((async () => {
      try {
        env.VOY_METRICS.writeDataPoint({
          indexes: ["telemetry"],
          blobs: [event, route],
          doubles: [value, ts]
        });
      } catch (_) { /* WAE failure never breaks telemetry */ }
    })());
  }
  return _cors(new Response(JSON.stringify({ ok: true }), { status: 202, headers: { "Content-Type": "application/json" } }));
}

function _cors(resp) {
  resp.headers.set("Access-Control-Allow-Origin", "*");
  resp.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  resp.headers.set("Access-Control-Allow-Headers", "Content-Type");
  resp.headers.delete("x-powered-by");
  return resp;
}

function _cleanHeaders(resp) {
  try {
    resp.headers.delete("x-powered-by");
    resp.headers.delete("server");
  } catch (_) {}
  return resp;
}

// V7.8: HTML responses get Cache-Control: no-store + sessionID cookie.
function _htmlNoStore(resp, request) {
  const headers = new Headers(resp.headers);
  headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  headers.set("Vary", "Accept-Encoding");
  headers.set("X-VOY-Version", WORKER_VERSION);
  headers.set("X-VOY-Build", BUILD_HASH);
  headers.delete("x-powered-by");
  headers.delete("server");

  // Set-Cookie: voy_sid on first visit (30-day retention window).
  const { sid, isNew } = _getOrCreateSessionId(request);
  if (isNew) {
    headers.append("Set-Cookie", `voy_sid=${sid}; Max-Age=2592000; SameSite=Lax; Path=/`);
  }

  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: headers
  });
}

```

## 5. `public/core/mobilityEngine.js`

PURE mobility computation module (v2.0.0). No DOM, no fetch, no localStorage — fully deterministic and testable. Exposes: `haversine`, `formatPrice`, `formatMin`, `normalize`, `fuzzyScore`, `calcAppPrice`, `estimateTaxi`, `estimateAuto` (per-provider prices + times for Uber/DiDi/Maxim/Cabify/taxi/remis/TaxiApp), `estimateBus` (direct-route only, no fake fallback), `findNearestBikeStation`, `runAllEstimations` (orchestrator → sorted array), `rankProviders` (MOBILITY_CORE_RANKING_V1: 0.7×price + 0.3×time, normalized), `searchLocal`, `dedupResults`, `formatBusText`. Bike gated to ≤3km (`BIKE_MAX_DISTANCE_KM`). Complete verbatim, 442 lines.

```javascript
/**
 * VOY v2 — Core Mobility Engine
 *
 * Pure computational module for urban mobility estimation and recommendation.
 *
 * NO DOM manipulation, NO map logic, NO event listeners, NO UI rendering,
 * NO localStorage, NO fetch/API calls, NO HTML strings.
 *
 * All data dependencies are injected via parameters.
 * All functions are pure: same inputs → same outputs.
 * Fully deterministic and testable.
 *
 * @module MobilityEngine
 * @version 2.0.0
 */
(function (global) {
  'use strict';

  // =====================================================================
  //  1. PURE UTILITIES
  // =====================================================================

  /**
   * Haversine distance between two geo points.
   * @param {number} lat1
   * @param {number} lon1
   * @param {number} lat2
   * @param {number} lon2
   * @returns {number} Distance in kilometers
   */
  function haversine(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Format price in Argentine pesos.
   * @param {number} n
   * @returns {string} e.g. "$1.900"
   */
  function formatPrice(n) {
    return '$' + n.toLocaleString('es-AR');
  }

  /**
   * Format minutes with ceiling.
   * @param {number} m
   * @returns {string} e.g. "15 min"
   */
  function formatMin(m) {
    return Math.ceil(m) + ' min';
  }

  /**
   * Normalize string for fuzzy matching (remove diacritics, lowercase).
   * @param {string} s
   * @returns {string}
   */
  function normalize(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  /**
   * Fuzzy score for search matching.
   * @param {string} query
   * @param {string} target
   * @returns {number} 0 = no match, higher = better
   */
  function fuzzyScore(query, target) {
    var nq = normalize(query);
    var nt = normalize(target);
    var idx = nt.indexOf(nq);
    if (idx >= 0) {
      return idx === 0 ? 100 : 80; // substring match, higher at start
    }
    // character-by-character matching
    var qi = 0, score = 0;
    for (var ti = 0; ti < nt.length && qi < nq.length; ti++) {
      if (nt[ti] === nq[qi]) {
        score += 10;
        if (ti === 0 || nt[ti - 1] === ' ') score += 5; // word boundary bonus
        qi++;
      }
    }
    return qi === nq.length ? score : 0;
  }

  // =====================================================================
  //  2. FARE SYSTEM
  // =====================================================================

  /**
   * Calculate ride-hailing app price from fare config.
   * @param {object} fareConfig - e.g. FareRegistry.apps.uber
   * @param {number} distKm - Distance in km
   * @param {number} timeMin - Estimated ride time in minutes
   * @returns {number|null} Price in ARS, or null if unavailable
   */
  function calcAppPrice(fareConfig, distKm, timeMin) {
    if (!fareConfig || fareConfig.base === null) return null;
    var price = fareConfig.base + fareConfig.km * distKm + fareConfig.min * timeMin;
    return Math.max(price, fareConfig.minFare);
  }

  /**
   * Calculate taxi fare (diurno/nocturno).
   * @param {number} distKm - Distance in km
   * @param {object} taxiFare - FareRegistry.taxi object
   * @param {number} hour - Current hour (0-23) for diurno/nocturno
   * @returns {number} Price in ARS
   */
  function estimateTaxi(distKm, taxiFare, hour) {
    var t = (hour >= 6 && hour < 22) ? taxiFare.diurno : taxiFare.nocturno;
    var fichas = Math.floor(distKm * 1000 / t.distFicha);
    return t.bajada + fichas * t.ficha;
  }

  // =====================================================================
  //  3. ESTIMATION FUNCTIONS (pure, no DOM, no map)
  // =====================================================================

  // MOBILITY_CORE_RANKING_V1: bike is tertiary suggestion, only viable under 3km.
  var BIKE_MAX_DISTANCE_KM = 3;

  /**
   * Estimate auto ride with all providers.
   * @param {number} distKm - Distance in km
   * @param {object} fareRegistry - Complete FareRegistry object
   * @param {number} hour - Current hour (0-23) for taxi day/night
   * @returns {object} Auto estimation with per-provider prices and times
   */
  function estimateAuto(distKm, fareRegistry, hour) {
    var durCar = (distKm / 25) * 60;
    var apps = fareRegistry.apps;
    var uberPrice = calcAppPrice(apps.uber, distKm, durCar);
    var didiPrice = calcAppPrice(apps.didi, distKm, durCar);
    var maximPrice = calcAppPrice(apps.maxim, distKm, durCar);
    var cabifyPrice = calcAppPrice(apps.cabify, distKm, durCar);
    var taxiPrice = estimateTaxi(distKm, fareRegistry.taxi, hour);
    var remisPrice = taxiPrice;
    var taxiappPrice = taxiPrice;
    return {
      timeMin: Math.round(durCar),
      uberTimeMin: Math.round(durCar * 1.00),
      didiTimeMin: Math.round(durCar * 1.03),
      maximTimeMin: Math.round(durCar * 1.05),
      cabifyTimeMin: Math.round(durCar * 1.02),
      taxiTimeMin: Math.round(durCar * 1.10),
      remisTimeMin: Math.round(durCar * 1.08),
      taxiappTimeMin: Math.round(durCar * 1.07),
      uberPrice: uberPrice,
      didiPrice: didiPrice,
      maximPrice: maximPrice,
      cabifyPrice: cabifyPrice,
      taxiPrice: taxiPrice,
      remisPrice: remisPrice,
      taxiappPrice: taxiappPrice
    };
  }

  /**
   * Estimate bus route (direct only). Combinations removed in VOY Lite.
   * Returns null when no real stops are available (no fake fallback).
   * @param {object} origin - {lat, lon}
   * @param {object} dest - {lat, lon}
   * @param {Array} busStops - BUS_STOPS array
   * @param {object} busFare - FareRegistry.bus object
   * @returns {object} Bus estimation with stops, times, price
   */
  function estimateBus(origin, dest, busStops, busFare) {
    var distKm = haversine(origin.lat, origin.lon, dest.lat, dest.lon);
    var stopsByLine = {};
    busStops.forEach(function (s) {
      if (!stopsByLine[s.linea]) stopsByLine[s.linea] = [];
      stopsByLine[s.linea].push(s);
    });

    var bestDirect = null;
    var bestCombo = null;

    // --- Direct routes ---
    Object.keys(stopsByLine).forEach(function (linea) {
      var stops = stopsByLine[linea];
      var nearOrig = null, nearDest = null;
      var minDO = Infinity, minDD = Infinity;
      stops.forEach(function (s) {
        var dO = haversine(origin.lat, origin.lon, s.lat, s.lon);
        var dD = haversine(dest.lat, dest.lon, s.lat, s.lon);
        if (dO < minDO) { minDO = dO; nearOrig = s; }
        if (dD < minDD) { minDD = dD; nearDest = s; }
      });
      if (nearOrig && nearDest && stops.length >= 2) {
        var rideDist = haversine(nearOrig.lat, nearOrig.lon, nearDest.lat, nearDest.lon);
        var walkToMin = minDO / 5 * 60 + 3;
        var rideMin = rideDist / 15 * 60;
        var walkFromMin = minDD / 5 * 60 + 5;
        var totalMin = walkToMin + rideMin + walkFromMin;
        var price = busFare.sube;
        if (!bestDirect || totalMin < bestDirect.totalMin) {
          bestDirect = {
            linea: linea, stopOrigen: nearOrig, stopDest: nearDest,
            walkToStopMin: Math.ceil(walkToMin), rideMin: Math.ceil(rideMin),
            walkFromStopMin: Math.ceil(walkFromMin), totalMin: Math.ceil(totalMin),
            price: price, boletos: 1, combination: false,
            stopOrigenCalles: nearOrig.calles, stopDestCalles: nearDest.calles
          };
        }
      }
    });

    // VOY Lite: no fake fallback. Return null when no direct route exists.
    return bestDirect;
  }

  /**
   * Find nearest bike station to a point.
   * @param {object} point - {lat, lon}
   * @param {Array} bikeStations - BIKE_STATIONS array
   * @returns {object|null} Nearest station or null
   */
  function findNearestBikeStation(point, bikeStations) {
    var best = null, minD = Infinity;
    bikeStations.forEach(function (s) {
      var d = haversine(point.lat, point.lon, s.lat, s.lon);
      if (d < minD) { minD = d; best = s; }
    });
    return best;
  }

  // =====================================================================
  //  4. RECOMMENDATION ENGINE — REMOVED in VOY Lite
  // =====================================================================

  // =====================================================================
  //  5. ORCHESTRATOR — runAllEstimations
  // =====================================================================

  /**
   * Run all transport mode estimations for a given origin-destination pair.
   * This is the main entry point for the estimation pipeline.
   *
   * @param {object} origin - {lat, lon, name?}
   * @param {object} dest - {lat, lon, name?}
   * @param {object} config - {busStops, bikeStations, fareRegistry}
   * @returns {Array|null} Sorted array of estimation objects, or null
   */
  function runAllEstimations(origin, dest, config) {
    if (!origin || !dest) return null;
    var distKm = haversine(origin.lat, origin.lon, dest.lat, dest.lon);
    var hour = new Date().getHours();
    var estimations = [];

    // 1. Rideshare (auto) — primary card
    var autoResult = estimateAuto(distKm, config.fareRegistry, hour);
    estimations.push(Object.assign({ mode: 'auto', icon: '\uD83D\uDE97', title: 'Auto', priority: 1, distance: distKm }, autoResult));

    // 2. Bus — only if real stops exist (no fake fallback)
    var busResult = estimateBus(origin, dest, config.busStops, config.fareRegistry.bus);
    if (busResult) {
      busResult.timeMin = busResult.totalMin;
      estimations.push(Object.assign(
        { mode: 'bus', icon: '\uD83D\uDE8C', title: 'Colectivo', priority: 2, distance: distKm },
        busResult
      ));
    }

    // 3. Bike — MOBILITY_CORE_RANKING_V1: only_if_under_3km (tertiary suggestion only)
    var bikeMin = (distKm / 15) * 60;
    var nearBike = findNearestBikeStation(origin, config.bikeStations);
    var nearDestBike = dest ? findNearestBikeStation(dest, config.bikeStations) : null;
    if (distKm <= BIKE_MAX_DISTANCE_KM) {
      estimations.push({ mode: 'bike', icon: '\uD83D\uDEF2', title: 'Bicicleta', timeMin: bikeMin, distance: distKm, priority: 9, nearStation: nearBike, nearDestStation: nearDestBike });
    }

    // Sort by priority, then by time
    estimations.sort(function (a, b) { return a.priority - b.priority || a.timeMin - b.timeMin; });

    return estimations;
  }

  // =====================================================================
  //  6. SEARCH UTILITIES (pure, no fetch)
  // =====================================================================

  /**
   * Search local catalog (bus stops, bike stations, landmarks).
   * @param {string} q - Search query
   * @param {Array} busStops - BUS_STOPS array
   * @param {Array} bikeStations - BIKE_STATIONS array
   * @param {Array} landmarks - LANDMARKS array
   * @returns {Array} Scored local results
   */
  function searchLocal(q, busStops, bikeStations, landmarks) {
    var localResults = [];
    busStops.forEach(function (s) {
      var score = Math.max(fuzzyScore(q, s.nombre), fuzzyScore(q, s.calles), fuzzyScore(q, 'L\u00EDnea ' + s.linea));
      if (score > 0) localResults.push({ type: 'bus', name: 'L\u00EDnea ' + s.linea + ' \u2013 ' + s.nombre, sub: s.calles, lat: s.lat, lon: s.lon, score: score, display_name: s.nombre + ', ' + s.calles });
    });
    bikeStations.forEach(function (s) {
      var score = Math.max(fuzzyScore(q, s.nombre), fuzzyScore(q, s.calles));
      if (score > 0) localResults.push({ type: 'bike', name: '\uD83D\uDEF2 ' + s.nombre, sub: s.calles, lat: s.lat, lon: s.lon, score: score, display_name: s.nombre + ', ' + s.calles });
    });
    landmarks.forEach(function (s) {
      var score = Math.max(fuzzyScore(q, s.nombre), fuzzyScore(q, s.calles));
      if (score > 0) localResults.push({ type: 'place', name: s.nombre, sub: s.calles, lat: s.lat, lon: s.lon, score: score, display_name: s.nombre + ', ' + s.calles });
    });
    return localResults;
  }

  /**
   * Deduplicate search results by normalized name.
   * @param {Array} results - Search results array
   * @returns {Array} Deduped, max 3
   */
  function dedupResults(results) {
    var seen = {};
    var deduped = [];
    results.forEach(function (r) {
      var key = normalize(r.name || r.display_name || '');
      if (!seen[key]) { seen[key] = true; deduped.push(r); }
    });
    return deduped.slice(0, 3);
  }

  // =====================================================================
  //  7. CONTEXTUAL RANKING (MOBILITY_CORE_RANKING_V1)
  // =====================================================================

  /**
   * Rank ride-hailing providers by contextual_score: weighted blend of
   * price (70%) and time (30%). Lower score = better rank.
   * Pure function: same inputs → same outputs. No DOM, no fetch.
   *
   * @param {object} autoResult - estimateAuto() output with per-provider prices/times
   * @param {object} providers - PROVIDERS registry (availability filter)
   * @returns {Array} Sorted provider objects: [{id,name,price,timeMin,score}, ...]
   */
  function rankProviders(autoResult, providers) {
    if (!autoResult) return [];
    var list = [
      { id: 'uber', name: 'Uber', price: autoResult.uberPrice, timeMin: autoResult.uberTimeMin },
      { id: 'didi', name: 'DiDi', price: autoResult.didiPrice, timeMin: autoResult.didiTimeMin },
      { id: 'maxim', name: 'Maxim', price: autoResult.maximPrice, timeMin: autoResult.maximTimeMin },
      { id: 'cabify', name: 'Cabify', price: autoResult.cabifyPrice, timeMin: autoResult.cabifyTimeMin },
      { id: 'taxiapp', name: 'TaxiApp', price: autoResult.taxiappPrice, timeMin: autoResult.taxiappTimeMin },
      { id: 'taxi', name: 'Radiotaxi', price: autoResult.taxiPrice, timeMin: autoResult.taxiTimeMin },
      { id: 'remis', name: 'Remises Real', price: autoResult.remisPrice, timeMin: autoResult.remisTimeMin }
    ].filter(function (p) {
      return p.price != null && providers && providers[p.id] && providers[p.id].available;
    });
    if (list.length === 0) return [];

    // Normalize price and time to 0-1 range for cross-factor comparison.
    var prices = list.map(function (p) { return p.price; });
    var times = list.map(function (p) { return p.timeMin; });
    var minPrice = Math.min.apply(null, prices), maxPrice = Math.max.apply(null, prices);
    var minTime = Math.min.apply(null, times), maxTime = Math.max.apply(null, times);

    list.forEach(function (p) {
      var normPrice = maxPrice > minPrice ? (p.price - minPrice) / (maxPrice - minPrice) : 0;
      var normTime = maxTime > minTime ? (p.timeMin - minTime) / (maxTime - minTime) : 0;
      // contextual_score: 0.7 price + 0.3 time (lower = better)
      p.score = 0.7 * normPrice + 0.3 * normTime;
    });

    list.sort(function (a, b) { return a.score - b.score; });
    return list;
  }

  // =====================================================================
  //  8. FORMAT HELPERS
  // =====================================================================

  /**
   * Format bus estimation into human-readable text.
   * @param {object} r - Bus estimation result
   * @param {function} [formatPriceFn] - Optional price formatter
   * @returns {string} Multi-line description
   */
  function formatBusText(r, formatPriceFn) {
    var fp = formatPriceFn || formatPrice;
    if (!r.combination) {
      return 'La L\u00EDnea ' + r.linea + ' te lleva directo.\n' +
        'Subite a ' + r.walkToStopMin + ' min, en ' + r.stopOrigenCalles + '.\n' +
        'En ' + r.totalMin + ' min lleg\u00E1s. Te sale ' + fp(r.price) + '.';
    } else {
      return 'Pod\u00E9s combinar la L\u00EDnea ' + r.linea1 + ' con la L\u00EDnea ' + r.linea2 + ' para llegar.\n' +
        'Subite a la ' + r.linea1 + ' en ' + r.stopOrigenCalles + '.\n' +
        'Pasate a la ' + r.linea2 + ' en ' + r.stopTransbordoCalles + '.\n' +
        'En total ' + r.totalMin + ' min. Te sale ' + fp(r.price) + ' (' + r.boletos + ' boletos).';
    }
  }

  // =====================================================================
  //  EXPORTS
  // =====================================================================

  var MobilityEngine = {
    // Pure utilities
    haversine: haversine,
    formatPrice: formatPrice,
    formatMin: formatMin,
    normalize: normalize,
    fuzzyScore: fuzzyScore,

    // Fare calculations
    calcAppPrice: calcAppPrice,
    estimateTaxi: estimateTaxi,

    // Estimation functions
    estimateBus: estimateBus,
    estimateAuto: estimateAuto,
    findNearestBikeStation: findNearestBikeStation,
    runAllEstimations: runAllEstimations,

    // MOBILITY_CORE_RANKING_V1: contextual_score ranking
    rankProviders: rankProviders,
    BIKE_MAX_DISTANCE_KM: BIKE_MAX_DISTANCE_KM,

    // Search utilities (pure, no fetch)
    searchLocal: searchLocal,
    dedupResults: dedupResults,

    // Format helpers
    formatBusText: formatBusText
  };

  // Browser global
  if (typeof window !== 'undefined') {
    window.MobilityEngine = MobilityEngine;
  }
  // Node.js / CommonJS
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobilityEngine;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));

```

## 6. `public/core/pricingEngine.js`

PURE pricing v2 module (spec: `multi_variable_bayes_estimation`). Additive to MobilityEngine — legacy path remains source of truth when this is absent. Surge multipliers: `timeSurge` (night 1.1×, 2-5am dead zone 1.3×), `weatherSurge` (rain 1.15×, heavy 1.25×), `demandSurge` (event 1.2×, rush 1.1×), combined via `surgeMultiplier` clamped to [1.0, 2.5]. Bayesian `fareConfidence` (prior × Gaussian likelihood over fare deviation, blended with distance/time factors, clamped 0.55-0.95). `fareRange` produces surge-aware low/high spread. `taxiTariff` returns active diurno/nocturno tariff. Complete verbatim, 248 lines.

```javascript
/**
 * VOY Pricing Engine v2 — Santa Fe, Argentina
 *
 * Spec: multi_variable_bayes_estimation
 *   inputs: distance, time, historical_fare, provider_variance
 *   formula: base + (km * rate_km) + (min * rate_min)
 *   surge: time_based + weather_based + demand_proxy
 *
 * This module is PURE (no DOM, no fetch, no side effects).
 * It is additive to MobilityEngine — existing estimateAuto/estimateBus are untouched.
 * The view layer MAY use these functions for richer confidence + surge-aware ranges,
 * but the legacy estimation path remains the source of truth when this module is absent.
 *
 * @module PricingEngineV2
 * @version 2.0.0
 */
(function (global) {
  'use strict';

  // ---- Provider base confidence (prior) — from fare_engine_v2.json ----
  var PROVIDER_CONFIDENCE = {
    uber: 0.85,
    didi: 0.88,
    maxim: 0.75,
    taxi: 0.82,
    remis: 0.78
  };

  // Provider variance σ² (how much real fares deviate from estimate).
  // Higher variance → lower posterior confidence. Empirical defaults.
  var PROVIDER_VARIANCE = {
    uber: 0.10,
    didi: 0.09,
    maxim: 0.16,
    taxi: 0.14,
    remis: 0.18
  };

  // ---- Surge multipliers (conservative; no real demand/weather feed yet) ----
  // time_based: night hours (22:00–06:00) → 1.1–1.3x per provider class
  // weather_based: rain flag (caller-supplied) → 1.15x (capped)
  // demand_proxy: special-events flag (caller-supplied) → 1.2x (capped)
  // Combined surge is clamped to [1.0, 2.5] per fare_engine_v2.json surge range.
  var SURGE_MAX = 2.5;
  var SURGE_MIN = 1.0;

  function _hourOf(ts) {
    var d = ts ? new Date(ts) : new Date();
    return d.getHours();
  }

  /**
   * Time-based surge multiplier.
   * Night (22–06): 1.1x base, rising to 1.3x in the 2–5am dead zone.
   * Day: 1.0x (no surge).
   */
  function timeSurge(ts) {
    var h = _hourOf(ts);
    if (h >= 2 && h < 5) return 1.3;
    if (h >= 22 || h < 6) return 1.1;
    return 1.0;
  }

  /**
   * Weather-based surge. Caller passes a weather context:
   *   { rain: bool, heavy: bool }
   * Rain → 1.15x; heavy rain → 1.25x (capped by SURGE_MAX on combine).
   */
  function weatherSurge(weather) {
    if (!weather) return 1.0;
    if (weather.heavy) return 1.25;
    if (weather.rain) return 1.15;
    return 1.0;
  }

  /**
   * Demand-proxy surge. Caller passes an event context:
   *   { event: bool, rush_hour: bool }
   * Special event → 1.2x; rush hour → 1.1x.
   */
  function demandSurge(demand) {
    if (!demand) return 1.0;
    if (demand.event) return 1.2;
    if (demand.rush_hour) return 1.1;
    return 1.0;
  }

  /**
   * Combined surge multiplier, clamped to [1.0, 2.5].
   * Multiplies the three factors (time × weather × demand).
   */
  function surgeMultiplier(provider, ctx) {
    var t = timeSurge(ctx && ctx.now);
    var w = weatherSurge(ctx && ctx.weather);
    var d = demandSurge(ctx && ctx.demand);
    var m = t * w * d;
    // Provider class adjustment: apps surge more aggressively than taxis.
    var adj = (provider === 'uber' || provider === 'didi') ? 1.0
            : (provider === 'maxim') ? 0.97
            : 1.0; // taxi/remis mostly fixed tariff
    var combined = m * adj;
    return Math.max(SURGE_MIN, Math.min(SURGE_MAX, combined));
  }

  /**
   * Human surge label for the UI.
   * Returns '' when no surge, or a short label otherwise.
   */
  function surgeLabel(provider, ctx) {
    var m = surgeMultiplier(provider, ctx);
    if (m <= 1.01) return '';
    if (ctx && ctx.weather && ctx.weather.heavy) return 'Clima';
    if (ctx && ctx.demand && ctx.demand.event) return 'Demanda';
    if (ctx && ctx.demand && ctx.demand.rush_hour) return 'Hora pico';
    var h = _hourOf(ctx && ctx.now);
    if (h >= 2 && h < 5) return 'Noche';
    if (h >= 22 || h < 6) return 'Noche';
    return 'Demanda';
  }

  // ---- Bayesian confidence estimation ----
  //
  // Posterior confidence ≈ prior (provider base) updated by a Gaussian likelihood
  // over the observed (distance, time) vs the historical fare expectation.
  //
  // Simplified model (transparent, no hidden state):
  //   likelihood = exp( -0.5 * (deviation² / (σ² + provider_variance)) )
  //     where deviation = |observed_fare - historical_fare| / historical_fare
  //   posterior = (prior * likelihood) / (prior*likelihood + (1-prior)*(1-likelihood)*0.5)
  //
  // Distance factor: very short (<1km) or very long (>25km) trips reduce confidence.
  // Time factor: if observed ETA differs >40% from historical, reduce confidence.

  function _clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function _distanceFactor(km) {
    if (km == null) return 0.9;
    if (km < 1) return 0.8;     // minimum fare dominates, less predictable
    if (km <= 12) return 1.0;   // sweet spot
    if (km <= 25) return 0.92;
    return 0.82;                // long trips, traffic variance grows
  }

  function _timeFactor(min) {
    if (min == null) return 0.9;
    if (min <= 30) return 1.0;
    if (min <= 60) return 0.93;
    return 0.85;
  }

  /**
   * Multi-variable Bayesian fare confidence.
   *
   * @param {string} provider   uber|didi|maxim|taxi|remis
   * @param {object} obs        { distanceKm, timeMin, fare, historicalFare? }
   * @returns {number}          confidence 0..1 (clamped 0.55..0.95)
   */
  function fareConfidence(provider, obs) {
    var prior = PROVIDER_CONFIDENCE[provider] || 0.8;
    var variance = PROVIDER_VARIANCE[provider] || 0.14;

    var distF = _distanceFactor(obs && obs.distanceKm);
    var timeF = _timeFactor(obs && obs.timeMin);

    // Likelihood from fare deviation vs historical (if available).
    var likelihood = 0.9;
    if (obs && obs.historicalFare && obs.historicalFare > 0 && obs.fare > 0) {
      var dev = Math.abs(obs.fare - obs.historicalFare) / obs.historicalFare;
      // Gaussian-ish: small deviation → likelihood near 1, large → near 0.5
      likelihood = Math.exp(-0.5 * (dev * dev) / (variance + 0.04));
      likelihood = _clamp(likelihood, 0.5, 0.99);
    }

    // Bayesian update (simplified, normalized).
    var posterior = (prior * likelihood) /
      (prior * likelihood + (1 - prior) * (1 - likelihood) * 0.5 + 1e-6);

    // Blend with distance/time factors (they gate confidence geometrically).
    var blended = posterior * 0.6 + distF * 0.25 + timeF * 0.15;

    return _clamp(blended, 0.55, 0.95);
  }

  /**
   * Surge-aware fare range.
   * Low end = base estimate; high end = estimate * surge (rounded).
   * Spread widens when confidence is lower.
   *
   * @param {number} price      point estimate (ARS)
   * @param {number} confidence 0..1
   * @param {number} surge      multiplier (1.0 = no surge)
   * @returns {{low:number, high:number, point:number}}
   */
  function fareRange(price, confidence, surge) {
    if (!price || price <= 0) return { low: 0, high: 0, point: 0 };
    var c = _clamp(confidence == null ? 0.8 : confidence, 0.55, 0.95);
    var s = _clamp(surge == null ? 1 : surge, 1.0, SURGE_MAX);
    // Lower confidence → wider spread (±5%..±12%).
    var spread = (1 - c) * 0.30 + 0.05; // 5%..~20%
    var low = Math.round(price * (1 - spread));
    var high = Math.round(price * (1 + spread) * s);
    if (high < low) high = low;
    return { low: low, high: high, point: Math.round(price) };
  }

  // ---- Taxi municipal rates (daily_refresh stub) ----
  //
  // Real Santa Fe taxi tariffs are set by municipal resolution (bajada + ficha).
  // The FareRegistry in the HTML holds the authoritative values (updated manually
  // per Resolución). This function returns the active tariff for a given hour,
  // so the view can label day/night correctly. "daily_refresh" is a TODO: the
  // scraper mini-service could publish a tariffs.json that this reads — but only
  // from official municipal sources (legal_only).

  function taxiTariff(fareRegistry, ts) {
    if (!fareRegistry || !fareRegistry.taxi) return null;
    var t = fareRegistry.taxi;
    var h = _hourOf(ts);
    var nocturno = (h >= 22 || h < 6);
    return {
      bajada: nocturno ? t.nocturno.bajada : t.diurno.bajada,
      ficha: nocturno ? t.nocturno.ficha : t.diurno.ficha,
      distFicha: t.diurno.distFicha,
      mode: nocturno ? 'nocturno' : 'diurno',
      source: t.source,
      updated_at: t.updated_at
    };
  }

  // ---- Exports ----
  var api = {
    PROVIDER_CONFIDENCE: PROVIDER_CONFIDENCE,
    PROVIDER_VARIANCE: PROVIDER_VARIANCE,
    SURGE_MIN: SURGE_MIN,
    SURGE_MAX: SURGE_MAX,
    timeSurge: timeSurge,
    weatherSurge: weatherSurge,
    demandSurge: demandSurge,
    surgeMultiplier: surgeMultiplier,
    surgeLabel: surgeLabel,
    fareConfidence: fareConfidence,
    fareRange: fareRange,
    taxiTariff: taxiTariff
  };

  global.PricingEngineV2 = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

```

## 7. `public/core/eventBus.js`

Event bus + batched transport (V7.8, spec v1.4). Emits to 3 canonical events + legacy names (worker normalizes). Three-layer delivery: (1) local_fallback — always persists to `localStorage` (`voy_events_v14`, max 500, guaranteeing no event is lost); (2) PostHog if `window.posthog` is present; (3) Cloudflare worker transport — batched flush every 15s (max 25/batch) via `sendBeacon` (survives page unload) with `fetch keepalive` fallback. Anonymous ID (`voy_anon_id`) generated once, persisted. Coarse geo cluster (~500m grid) — no raw lat/lon transported. Flushes on `pagehide` + `visibilitychange`. Complete verbatim, 217 lines.

```javascript
/**
 * VOY Event Bus + Transport — V7.8 (3 eventos canónicos: estimation / provider_tap / search)
 *
 * El worker normaliza nombres legacy → estos 3 nombres antes de escribir a WAE.
 * Eventos no canónicos se aceptan localmente pero se dropean server-side.
 *
 * Privacy:
 *   - anonymous_id_only (no PII, no user accounts)
 *   - sessionID via cookie voy_sid (set by worker, sin auth)
 *   - local_fallback: events always persist locally (localStorage) even if transport fails
 *
 * @module EventBus
 * @version 1.4.0
 */
(function (global) {
  'use strict';

  var SPEC_VERSION = '1.4';
  var LOCAL_STORE = 'voy_events_v14';
  var LOCAL_MAX = 500;
  var FLUSH_INTERVAL_MS = 15000;     // flush every 15s
  var FLUSH_BATCH = 25;              // max events per flush
  var ENDPOINT = '/api/events';      // worker endpoint (relative; same origin)

  // PostHog stub: if window.posthog is present (loaded via snippet), we forward.
  // Otherwise events queue locally and the worker transport handles them.
  function _posthogAvailable() {
    return typeof global.posthog === 'object' && global.posthog && typeof global.posthog.capture === 'function';
  }

  // Anonymous ID — generated once, persisted in localStorage. Never tied to PII.
  var _anonId = null;
  var ANON_KEY = 'voy_anon_id';
  function _anonIdGet() {
    if (_anonId) return _anonId;
    try {
      var v = localStorage.getItem(ANON_KEY);
      if (v) { _anonId = v; return v; }
    } catch (e) {}
    _anonId = 'a_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    try { localStorage.setItem(ANON_KEY, _anonId); } catch (e) {}
    return _anonId;
  }

  // ---- Local persistence (IndexedDB with localStorage fallback) ----
  function _localPush(evt) {
    try {
      var raw = localStorage.getItem(LOCAL_STORE);
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) arr = [];
      arr.push(evt);
      if (arr.length > LOCAL_MAX) arr = arr.slice(arr.length - LOCAL_MAX);
      localStorage.setItem(LOCAL_STORE, JSON.stringify(arr));
    } catch (e) { /* quota / private mode — silent */ }
  }

  function _localDrain(max) {
    try {
      var raw = localStorage.getItem(LOCAL_STORE);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      var take = arr.slice(0, max);
      var rest = arr.slice(max);
      localStorage.setItem(LOCAL_STORE, JSON.stringify(rest));
      return take;
    } catch (e) { return []; }
  }

  function _localCount() {
    try {
      var raw = localStorage.getItem(LOCAL_STORE);
      if (!raw) return 0;
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.length : 0;
    } catch (e) { return 0; }
  }

  // ---- Core emit ----
  var _sessionStart = Date.now();

  /**
   * Emit an event per spec v1.4.
   * @param {string} name   event name (must be in the spec list)
   * @param {object} data   event payload (no PII)
   */
  function emit(name, data) {
    // V7.8 — allow-list expandida. El worker normaliza todo a 3 eventos
    // canónicos (estimation / provider_tap / search). Los nombres legacy
    // se aceptan aquí y se mapean server-side.
    var allowed = {
      // 3 canónicos V7.8
      estimation: true, provider_tap: true, search: true,
      // legacy que el worker normaliza → canónicos
      search_performed: true, destination_selected: true, route_selected: true,
      route_calculated: true, ride_estimated: true, vehicle_viewed: true,
      provider_click: true, provider_clicked: true, deeplink_opened: true,
      voice_search: true,
      // v5 legacy (no canónicos — se dropean server-side pero se guardan local)
      app_boot: true, share: true, share_app: true, navigation_start: true,
      navigation_stop: true, navigation_voice_toggled: true,
      support_alias_copied: true, favorite_saved: true
    };
    if (!allowed[name]) {
      if (global.console && console.debug) console.debug('[eventBus] unknown event:', name);
      return;
    }

    var evt = {
      v: SPEC_VERSION,
      name: name,
      data: data || {},
      anon_id: _anonIdGet(),
      ts: Date.now(),
      session_age_ms: Date.now() - _sessionStart,
      // geo is coarse-grained cluster (no raw lat/lon) — privacy.
      geo: _coarseGeo(data)
    };

    // 1. local_fallback (always) — guarantees no event is lost.
    _localPush(evt);

    // 2. PostHog (if available) — privacy_mode: anonymous_id_only.
    if (_posthogAvailable()) {
      try {
        global.posthog.capture(name, Object.assign({}, evt.data, {
          voy_v: SPEC_VERSION,
          voy_anon_id: evt.anon_id,
          voy_geo: evt.geo
        }));
      } catch (e) { /* silent */ }
    }

    // 3. Cloudflare worker transport — batched, fire-and-forget.
    _scheduleFlush();
  }

  // Coarse geo cluster (~500m) so the worker can do geo_distribution analytics
  // without ever storing raw coordinates. Mirrors the va_cluster approach.
  function _coarseGeo(data) {
    if (!data || data.lat == null || data.lon == null) return '';
    var grid = 0.0045; // ~500m
    return (data.lat / grid).toFixed(0) + '_' + (data.lon / grid).toFixed(0);
  }

  // ---- Batched flush to worker ----
  var _flushTimer = null;
  var _flushing = false;

  function _scheduleFlush() {
    if (_flushTimer) return;
    _flushTimer = setTimeout(_flush, FLUSH_INTERVAL_MS);
  }

  function _flush() {
    _flushTimer = null;
    if (_flushing) return;
    _flushing = true;
    var batch = _localDrain(FLUSH_BATCH);
    if (!batch.length) { _flushing = false; return; }

    // Use sendBeacon if available (survives page unload), else fetch keepalive.
    var payload = JSON.stringify({ events: batch });
    try {
      if (global.navigator && navigator.sendBeacon) {
        var blob = new Blob([payload], { type: 'application/json' });
        var ok = navigator.sendBeacon(ENDPOINT, blob);
        if (ok) { _flushing = false; return; }
      }
    } catch (e) { /* fall through to fetch */ }

    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
        credentials: 'omit'
      }).catch(function () { /* re-queued locally already drained; acceptable loss */ })
        .finally(function () { _flushing = false; });
    } catch (e) { _flushing = false; }
  }

  // Flush on page hide (best-effort).
  function _bindLifecycle() {
    if (typeof global.addEventListener !== 'function') return;
    global.addEventListener('pagehide', function () {
      try { _flush(); } catch (e) {}
    });
    global.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        try { _flush(); } catch (e) {}
      }
    });
  }

  // ---- Public API ----
  var api = {
    SPEC_VERSION: SPEC_VERSION,
    emit: emit,
    flush: function () { return _flush(); },
    anonId: _anonIdGet,
    localCount: _localCount,
    // Test/debug helpers
    _drainForDebug: function () { return _localDrain(LOCAL_MAX); }
  };

  global.VoyEventBus = api;
  _bindLifecycle();
  // Emit app_boot once per page load (critical event per spec).
  // Deferred so listeners/consumers can attach before the first fire.
  if (typeof global.setTimeout === 'function') {
    global.setTimeout(function () {
      try { emit('app_boot', { ua: (global.navigator && navigator.userAgent) ? '1' : '0' }); } catch (e) {}
    }, 0);
  }
})(typeof window !== 'undefined' ? window : globalThis);

```

## 8. `public/core/telemetry.js`

Two globals. **VoyHealthMonitor**: vanilla-JS ErrorBoundary — captures LCP via `PerformanceObserver` (buffered:true), uncaught `error` (capture phase) and `unhandledrejection` events; sends to `/api/telemetry` via `navigator.sendBeacon` (fire-and-forget, throttled 5s per event-type). **VoyDebugPanel**: hidden diagnostic panel (FPS, Memory, Cache, SW, Latency, LCP, Trend, Ahorro). Trigger: konami code (↑↑↓↓←→←→BA) on desktop OR 7 taps on footer text on mobile (excludes the ·· button). Boots on DOMReady. Complete verbatim, 252 lines.

```javascript
// ============================================================
//  VOY — core/telemetry.js  (V7.8 Modular Refactor)
//
//  Extracted from VOY-Lite.html (V7.7 Performance_Audit_and_Telemetry).
//  Loaded via <script src="core/telemetry.js?v=78"> after ahorro.js +
//  trend.js and before the main inline script. Exposes two globals:
//    - window.VoyHealthMonitor  (Beacon API error/LCP telemetry)
//    - window.VoyDebugPanel     (hidden diagnostic panel)
//
//  Dependencies: PerformanceObserver, navigator.sendBeacon.
//  Uses global svg() at runtime (defined in inline script — only called
//  when the debug panel is toggled, not at load time).
//
//  Boot: _boot() registers HealthMonitor + DebugPanel on DOMReady.
// ============================================================

// ===================== V7.7 PERFORMANCE_AUDIT_AND_TELEMETRY — HealthMonitor =====================
// Captures LCP (Largest Contentful Paint) + uncaught JS errors + unhandled promise rejections.
// Sends via Beacon API (navigator.sendBeacon) to /api/telemetry — fire-and-forget, never blocks unload.
// Schema: {event, value, route}. Throttled per event-type (5s) to avoid spam on cascading errors.
// Vanilla-JS ErrorBoundary equivalent: window 'error' + 'unhandledrejection' listeners (capture phase).
window.VoyHealthMonitor=(function(){
  var ENDPOINT='/api/telemetry';
  var THROTTLE_MS=5000;
  var MAX_ROUTE_LEN=140;
  var _lastSent={};
  var _lastLCP=null; // last LCP value (ms) — exposed for the debug panel (getEntriesByType is drained by the observer)
  var _supported=(typeof navigator!=='undefined')&&(typeof navigator.sendBeacon==='function');

  function _send(event,value,route){
    if(!_supported)return;
    try{
      var key=String(event);
      var now=Date.now();
      if(_lastSent[key]&&(now-_lastSent[key])<THROTTLE_MS)return; // throttle cascading errors
      _lastSent[key]=now;
      var payload=JSON.stringify({
        event:key,
        value:isFinite(value)?Number(value):0,
        route:String(route||(typeof location!=='undefined'?location.pathname:'')).slice(0,MAX_ROUTE_LEN),
        ts:now
      });
      var blob=new Blob([payload],{type:'application/json'});
      navigator.sendBeacon(ENDPOINT,blob);
    }catch(e){/* telemetry must never break the app */}
  }

  function _init(){
    if(!_supported)return false;
    // (1) Uncaught runtime errors (vanilla-JS ErrorBoundary equivalent)
    window.addEventListener('error',function(e){
      var loc='';
      try{loc=(e.filename||'')+':'+(e.lineno||0)+' '+(e.message||'').slice(0,90)}catch(_){}
      _send('js_error',1,loc);
    },{capture:true});
    // (2) Unhandled promise rejections
    window.addEventListener('unhandledrejection',function(e){
      var msg='';
      try{
        var r=e&&e.reason;
        msg=(r&&r.message)?r.message:String(r||'');
        msg=msg.slice(0,90);
      }catch(_){}
      _send('promise_rejection',1,msg);
    },{capture:true});
    // (3) LCP via PerformanceObserver (buffered:true retrieves entries that already fired)
    try{
      var po=new PerformanceObserver(function(list){
        var entries=list.getEntries();
        var last=entries[entries.length-1];
        if(last&&last.startTime){_lastLCP=Math.round(last.startTime);_send('lcp',_lastLCP,'')}
      });
      po.observe({type:'largest-contentful-paint',buffered:true});
    }catch(e){/* LCP observer unsupported — silently skip */}
    return true;
  }

  return {init:_init,send:_send,supported:function(){return _supported},getLastLCP:function(){return _lastLCP}};
})();

// ===================== V7.7 PERFORMANCE_AUDIT_AND_TELEMETRY — DebugPanel =====================
// Hidden diagnostic panel (FPS, Memory, Cache, SW, Latency, LCP, Trend, Ahorro).
// Distinct from the user analytics dashboard (va_dashboard, 5-tap on search icon).
// Trigger: konami code (↑↑↓↓←→←→BA) OR 7 taps on the footer text (mobile-friendly, excludes ·· button).
// window.VoyDebugPanel.toggle() also works from the dev console.
window.VoyDebugPanel=(function(){
  var _visible=false,_panel=null,_rafId=null,_refreshTimer=null;
  var _fps=0,_fpsLast=0,_fpsFrames=0;
  var _latencyMs=null,_latencyTs=0;
  var KONAMI=[38,38,40,40,37,39,37,39,66,65]; // ↑↑↓↓←→←→ B A
  var _kIdx=0,_tapCount=0,_tapTimer=null;

  function _toggle(){if(_visible){_hide()}else{_show()}}

  function _show(){
    _visible=true;_build();_startFPS();_refreshSlow();
    _refreshTimer=setInterval(_refreshSlow,2000);
  }
  function _hide(){
    _visible=false;
    if(_rafId){cancelAnimationFrame(_rafId);_rafId=null}
    if(_refreshTimer){clearInterval(_refreshTimer);_refreshTimer=null}
    if(_panel){_panel.remove();_panel=null}
  }

  function _build(){
    if(_panel)return;
    var p=document.createElement('div');
    p.id='voyDebugPanel';
    p.className='voy-debug-panel';
    p.setAttribute('role','dialog');
    p.setAttribute('aria-label','VOY Debug Panel');
    p.innerHTML=
      '<div class="vdp-head"><span class="vdp-title">VOY · Debug</span>'+
      '<button class="vdp-close" aria-label="Cerrar panel" type="button">×</button></div>'+
      '<dl class="vdp-grid">'+
        '<dt>FPS</dt><dd data-vdp="fps">—</dd>'+
        '<dt>Memoria</dt><dd data-vdp="mem">N/A</dd>'+
        '<dt>Cache</dt><dd data-vdp="cache">—</dd>'+
        '<dt>SW</dt><dd data-vdp="sw">—</dd>'+
        '<dt>Latencia</dt><dd data-vdp="lat">—</dd>'+
        '<dt>LCP</dt><dd data-vdp="lcp">—</dd>'+
        '<dt>Trend</dt><dd data-vdp="trend">—</dd>'+
        '<dt>Ahorro</dt><dd data-vdp="ahorro">—</dd>'+
      '</dl>'+
      '<div class="vdp-foot">konami · V7.8</div>';
    document.body.appendChild(p);
    _panel=p;
    p.querySelector('.vdp-close').addEventListener('click',_hide);
  }

  function _setText(key,val){if(_panel){var el=_panel.querySelector('[data-vdp="'+key+'"]');if(el)el.textContent=val;}}

  function _startFPS(){
    _fpsLast=performance.now();_fpsFrames=0;
    function loop(t){
      if(!_visible)return;
      _fpsFrames++;
      if(t-_fpsLast>=500){
        _fps=Math.round(_fpsFrames*1000/(t-_fpsLast));
        _fpsLast=t;_fpsFrames=0;
        _setText('fps',_fps);
      }
      _rafId=requestAnimationFrame(loop);
    }
    _rafId=requestAnimationFrame(loop);
  }

  function _refreshSlow(){
    if(!_panel||!_visible)return;
    // Memory (Chrome-only — performance.memory)
    var mem='N/A';
    if(performance.memory){
      var used=Math.round(performance.memory.usedJSHeapSize/1048576);
      var limit=Math.round(performance.memory.jsHeapSizeLimit/1048576);
      mem=used+' / '+limit+' MB';
    }
    _setText('mem',mem);
    // Service worker state
    var sw='—';
    if(navigator.serviceWorker){sw=navigator.serviceWorker.controller?'active':'registered'}
    else{sw='unsupported'}
    _setText('sw',sw);
    // Storage estimate (cache quota)
    if(navigator.storage&&navigator.storage.estimate){
      navigator.storage.estimate().then(function(e){
        var usage=e.usage?Math.round(e.usage/1024):0;
        var quota=e.quota?Math.round(e.quota/1048576):0;
        _setText('cache',usage+' KB / '+quota+' MB');
      }).catch(function(){_setText('cache','err')});
    }else{_setText('cache','unsupported')}
    // Latency — ping /api/health (throttled to every 5s)
    var now=Date.now();
    if(now-_latencyTs>5000){
      _latencyTs=now;
      var t0=performance.now();
      fetch('/api/health',{cache:'no-store'}).then(function(r){return r.text()}).then(function(){
        _latencyMs=Math.round(performance.now()-t0);
        _setText('lat',_latencyMs+' ms');
      }).catch(function(){_setText('lat','err')});
    }else if(_latencyMs!=null){_setText('lat',_latencyMs+' ms')}
    // LCP — prefer HealthMonitor's stored value (observer drains the global buffer), fallback to getEntriesByType
    var lcpVal=null;
    if(window.VoyHealthMonitor&&typeof VoyHealthMonitor.getLastLCP==='function'){lcpVal=VoyHealthMonitor.getLastLCP()}
    if(lcpVal==null){
      try{
        var lcpEntries=performance.getEntriesByType('largest-contentful-paint');
        if(lcpEntries&&lcpEntries.length){lcpVal=Math.round(lcpEntries[lcpEntries.length-1].startTime)}
      }catch(_){}
    }
    _setText('lcp',lcpVal!=null?(lcpVal+' ms'):'—')
    // TrendEngine cache (count active provider trends via public getTrend API)
    if(window.VoyTrendEngine){
      try{
        var n=0;var ids=['uber','didi','maxim'];
        for(var i=0;i<ids.length;i++){if(VoyTrendEngine.getTrend(ids[i]))n++}
        _setText('trend',n+' activos');
      }catch(_){_setText('trend','?')}
    }else{_setText('trend','off')}
    // AhorroService state
    if(window.VoyAhorroService){
      try{var st=VoyAhorroService.getState();_setText('ahorro',st.available?(st.savingsPercent+'%'):'off')}
      catch(_){_setText('ahorro','?')}
    }else{_setText('ahorro','off')}
  }

  function _onKey(e){
    var k=e.keyCode||e.which;
    if(k===KONAMI[_kIdx]){
      _kIdx++;
      if(_kIdx===KONAMI.length){_kIdx=0;_toggle();}
    }else{
      _kIdx=(k===KONAMI[0])?1:0;
    }
  }

  function _onFooterTap(){
    _tapCount++;
    if(_tapTimer)clearTimeout(_tapTimer);
    _tapTimer=setTimeout(function(){_tapCount=0},2200);
    if(_tapCount>=7){_tapCount=0;_toggle();}
  }

  function _init(){
    // Konami code (keyboard — desktop)
    document.addEventListener('keydown',_onKey);
    // 7-tap on footer text (mobile — excludes the ·· footerMore button which has its own handler)
    var footer=document.querySelector('.footer');
    if(footer){
      footer.addEventListener('click',function(e){
        if(e.target.closest('.footer-more'))return;
        _onFooterTap();
      });
    }
  }

  return {init:_init,toggle:_toggle};
})();

// V7.8 boot — register health monitoring + debug panel ASAP.
// Guarded for DOMReady: the external script may load before the body is fully parsed
// (it's placed before the main inline <script> at end of body, so the footer usually
// exists, but the readyState guard makes it bulletproof).
function _voyTelemetryBoot(){
  try{if(window.VoyHealthMonitor)VoyHealthMonitor.init();}catch(e){}
  try{if(window.VoyDebugPanel)VoyDebugPanel.init();}catch(e){}
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',_voyTelemetryBoot);
}else{
  _voyTelemetryBoot();
}

```

## 9. `public/core/trend.js`

Two globals + one renderer. **VoyHistoryDB**: IndexedDB wrapper (`voy-history` / `estimates` store, schema `{timestamp, routeKey, origin_zone, destination_zone, price, mode}`, 30-day retention, async, with `queryByRouteSince` / `queryRecent` / `pruneOlderThan`). **VoyTrendEngine**: Simple Moving Average deviation over a 3-hour window (`WINDOW_MS=3h`, `MIN_DATAPOINTS=3` gate). States: STABLE (0.95≤ratio≤1.05) / RISING (>1.05) / FALLING (<0.95). `processEstimate` runs analyze-then-record per provider (sequential, avoids write-before-read race) with a generation counter so only the latest render paints badges. **renderTrendBadges()**: idempotent — mounts `price-trend-badge` next to every `[data-trend-provider]` element. Complete verbatim, 245 lines.

```javascript
// ============================================================
//  VOY — core/trend.js  (V7.8 Modular Refactor)
//
//  Extracted from VOY-Lite.html (V7.6 Predictive_Trend_Engine).
//  Loaded via <script src="core/trend.js?v=78"> after ahorro.js and
//  before telemetry.js. Exposes three globals:
//    - window.VoyHistoryDB    (IndexedDB wrapper — async, 30-day retention)
//    - window.VoyTrendEngine  (SMA deviation engine — STABLE/RISING/FALLING)
//    - renderTrendBadges()    (idempotent PriceTrendBadge renderer)
//
//  Dependencies: IndexedDB (native). Uses global svg() at runtime.
//
//  Blueprint:
//    storage: IndexedDB (voy-history / estimates), schema {timestamp, routeKey,
//             origin_zone, destination_zone, price, mode}, retention 30 days, async.
//    logic:   Simple_Moving_Average_Deviation = current_price / moving_average_3_hours
//    states:  STABLE (0.95≤ratio≤1.05) / RISING (>1.05) / FALLING (<0.95)
//    gate:    badge only renders if ≥3 historical datapoints for route+provider in 3h.
// ============================================================

// ===================== V7.6 PREDICTIVE TREND ENGINE ============================================
// Blueprint: TrendEngine + HistoryDB — local historical estimates + Simple_Moving_Average_Deviation.
window.VoyHistoryDB=(function(){
  var DB_NAME='voy-history';
  var DB_VERSION=1;
  var STORE='estimates';
  var RETENTION_DAYS=30;
  var _dbPromise=null;
  function open(){
    if(_dbPromise)return _dbPromise;
    _dbPromise=new Promise(function(resolve,reject){
      if(!window.indexedDB){reject(new Error('IndexedDB not supported'));return}
      try{
        var req=indexedDB.open(DB_NAME,DB_VERSION);
        req.onupgradeneeded=function(e){
          var db=e.target.result;
          if(!db.objectStoreNames.contains(STORE)){
            var store=db.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});
            store.createIndex('routeKey','routeKey',{unique:false});
            store.createIndex('mode','mode',{unique:false});
            store.createIndex('timestamp','timestamp',{unique:false});
          }
        };
        req.onsuccess=function(e){resolve(e.target.result)};
        req.onerror=function(e){reject(e.target.error)};
      }catch(err){reject(err)}
    });
    return _dbPromise;
  }
  function add(entry){
    return open().then(function(db){
      return new Promise(function(resolve,reject){
        try{
          var tx=db.transaction(STORE,'readwrite');
          var store=tx.objectStore(STORE);
          var req=store.add(entry);
          req.onsuccess=function(){resolve(req.result)};
          req.onerror=function(){reject(req.error)};
        }catch(err){reject(err)}
      });
    });
  }
  function queryByRouteSince(routeKeyVal,sinceMs){
    return open().then(function(db){
      return new Promise(function(resolve,reject){
        try{
          var tx=db.transaction(STORE,'readonly');
          var store=tx.objectStore(STORE);
          var idx=store.index('routeKey');
          var results=[];
          var req=idx.openCursor(IDBKeyRange.only(routeKeyVal));
          req.onsuccess=function(e){
            var cursor=e.target.result;
            if(cursor){
              if(cursor.value.timestamp>=sinceMs)results.push(cursor.value);
              cursor.continue();
            }else{resolve(results)}
          };
          req.onerror=function(){reject(req.error)};
        }catch(err){reject(err)}
      });
    });
  }
  // V7.8 Offline PWA — query recent entries across ALL routes (used by SW fallback + offline chip).
  // Returns the most recent `limit` entries sorted by timestamp descending.
  function queryRecent(limit){
    return open().then(function(db){
      return new Promise(function(resolve,reject){
        try{
          var tx=db.transaction(STORE,'readonly');
          var store=tx.objectStore(STORE);
          var idx=store.index('timestamp');
          var results=[];
          var req=idx.openCursor(null,'prev');
          req.onsuccess=function(e){
            var cursor=e.target.result;
            if(cursor&&results.length<(limit||50)){
              results.push(cursor.value);
              cursor.continue();
            }else{resolve(results)}
          };
          req.onerror=function(){reject(req.error)};
        }catch(err){reject(err)}
      });
    }).catch(function(){return []});
  }
  function pruneOlderThan(days){
    var cutoff=Date.now()-(days*24*60*60*1000);
    return open().then(function(db){
      return new Promise(function(resolve,reject){
        try{
          var tx=db.transaction(STORE,'readwrite');
          var store=tx.objectStore(STORE);
          var idx=store.index('timestamp');
          var count=0;
          var req=idx.openCursor(IDBKeyRange.upperBound(cutoff));
          req.onsuccess=function(e){
            var cursor=e.target.result;
            if(cursor){cursor.delete();count++;cursor.continue()}
            else{resolve(count)}
          };
          req.onerror=function(){reject(req.error)};
        }catch(err){reject(err)}
      });
    });
  }
  return {RETENTION_DAYS:RETENTION_DAYS,DB_NAME:DB_NAME,STORE:STORE,open:open,add:add,queryByRouteSince:queryByRouteSince,queryRecent:queryRecent,pruneOlderThan:pruneOlderThan};
})();

window.VoyTrendEngine=(function(){
  var WINDOW_MS=3*60*60*1000; // 3 hours (blueprint: moving_average_3_hours)
  var MIN_DATAPOINTS=3; // QA test 2: badge only if ≥3 historical datapoints
  var THRESHOLD_UP=1.05; // >5% above SMA → RISING
  var THRESHOLD_DOWN=0.95; // <5% below SMA → FALLING
  var RECORD_DEDUPE_MS=60000; // skip record if same route+provider recorded <60s ago
  var _cache={}; // providerId → {state, sma, ratio, datapoints, routeKey}
  var _lastRecordTs={}; // routeKey|providerId → timestamp (dedupe)
  var _gen=0; // generation counter — only latest processEstimate renders badges
  function _zoneKey(lat,lon){
    var GRID=0.0072; // ~800m, matches _VA_GRID (coarse geo cluster)
    return (Math.round(lat/GRID))+'_'+(Math.round(lon/GRID));
  }
  function routeKey(origin,dest){
    if(!origin||!dest||origin.lat==null||dest.lat==null)return null;
    return _zoneKey(origin.lat,origin.lon)+'>'+_zoneKey(dest.lat,dest.lon);
  }
  function analyze(routeKeyVal,providerId,currentPrice){
    if(!routeKeyVal||!providerId||!currentPrice||currentPrice<=0)return Promise.resolve(null);
    var sinceMs=Date.now()-WINDOW_MS;
    return VoyHistoryDB.queryByRouteSince(routeKeyVal,sinceMs).then(function(entries){
      var filtered=[];
      for(var i=0;i<entries.length;i++){
        if(entries[i].mode===providerId)filtered.push(entries[i]);
      }
      if(filtered.length<MIN_DATAPOINTS)return null; // gate: insufficient historical data
      var sum=0;
      for(var j=0;j<filtered.length;j++)sum+=filtered[j].price;
      var sma=sum/filtered.length;
      var ratio=currentPrice/sma;
      var state=ratio>THRESHOLD_UP?'RISING':ratio<THRESHOLD_DOWN?'FALLING':'STABLE';
      return {state:state,sma:Math.round(sma),ratio:Math.round(ratio*100)/100,datapoints:filtered.length,routeKey:routeKeyVal};
    }).catch(function(){return null});
  }
  function record(routeKeyVal,origin,dest,providerId,price){
    if(!routeKeyVal||!providerId||!price||price<=0)return Promise.resolve();
    var dedupeKey=routeKeyVal+'|'+providerId;
    var now=Date.now();
    if(_lastRecordTs[dedupeKey]&&(now-_lastRecordTs[dedupeKey])<RECORD_DEDUPE_MS)return Promise.resolve();
    _lastRecordTs[dedupeKey]=now;
    var entry={
      timestamp:now,
      routeKey:routeKeyVal,
      origin_zone:_zoneKey(origin.lat,origin.lon),
      destination_zone:_zoneKey(dest.lat,dest.lon),
      price:price,
      mode:providerId
    };
    return VoyHistoryDB.add(entry).catch(function(){});
  }
  function processEstimate(autoEst,origin,dest){
    if(!autoEst||!origin||!dest||!autoEst.rankedProviders)return Promise.resolve();
    var rk=routeKey(origin,dest);
    if(!rk)return Promise.resolve();
    var myGen=++_gen;
    _cache={}; // clear stale trends from previous route (prevents wrong-route badge races)
    var providers=[];
    for(var i=0;i<autoEst.rankedProviders.length;i++){
      var p=autoEst.rankedProviders[i];
      if(p&&(p.id==='uber'||p.id==='didi'||p.id==='maxim')&&p.price>0){
        providers.push({id:p.id,price:p.price});
      }
    }
    if(!providers.length)return Promise.resolve();
    // Sequential: analyze (read historical) → record (write current) per provider.
    // Avoids write-before-read race on same route+provider.
    var chain=Promise.resolve();
    providers.forEach(function(pr){
      chain=chain.then(function(){return analyze(rk,pr.id,pr.price)})
        .then(function(trend){_cache[pr.id]=trend})
        .then(function(){return record(rk,origin,dest,pr.id,pr.price)});
    });
    return chain.then(function(){
      if(myGen===_gen){renderTrendBadges()} // only latest generation renders
      // Opportunistic prune (fire-and-forget, 1/50 calls)
      if(Math.random()<0.02){VoyHistoryDB.pruneOlderThan(VoyHistoryDB.RETENTION_DAYS).catch(function(){})}
    });
  }
  function getTrend(providerId){return _cache[providerId]||null}
  return {
    WINDOW_MS:WINDOW_MS,MIN_DATAPOINTS:MIN_DATAPOINTS,THRESHOLD_UP:THRESHOLD_UP,THRESHOLD_DOWN:THRESHOLD_DOWN,
    routeKey:routeKey,analyze:analyze,record:record,processEstimate:processEstimate,getTrend:getTrend
  };
})();

// V7.6 PriceTrendBadge renderer — mounts trend icon next to every element with [data-trend-provider].
// Idempotent: clears stale badges first, then mounts fresh based on VoyTrendEngine cache.
// No-op if cache empty (badge never appears until ≥3 datapoints accumulated → analyze returns null).
function renderTrendBadges(){
  if(!window.VoyTrendEngine)return;
  var els=document.querySelectorAll('[data-trend-provider]');
  for(var i=0;i<els.length;i++){
    var el=els[i];
    var pid=el.getAttribute('data-trend-provider');
    var trend=VoyTrendEngine.getTrend(pid);
    var existing=el.querySelector('.price-trend-badge');
    if(!trend){
      if(existing)existing.parentNode.removeChild(existing);
      continue;
    }
    var icon='minus',cls='minus';
    if(trend.state==='RISING'){icon='trendingUp';cls='trending-up'}
    else if(trend.state==='FALLING'){icon='trendingDown';cls='trending-down'}
    if(existing){
      existing.className='price-trend-badge '+cls;
      existing.innerHTML=svg(icon,14);
    }else{
      var b=document.createElement('span');
      b.className='price-trend-badge '+cls;
      b.innerHTML=svg(icon,14);
      b.setAttribute('aria-label','Tendencia '+trend.state.toLowerCase()+' (vs promedio 3h, '+trend.datapoints+' muestras)');
      b.setAttribute('title','Tendencia: '+trend.state.toLowerCase()+' · promedio 3h: $'+trend.sma+' · ratio '+trend.ratio);
      el.appendChild(b);
    }
  }
}

```

## 10. `public/core/favorites.js`

VoyFavoritesService (V7.9 Field_Ops_and_Persistent_Context). Persistence layer for frequent destinations — reduces Time-to-Search ('Casa' / 'Trabajo' to one tap). Storage: LocalStorage (`voy_favorites`) PRIMARY (fast sync read for UI) + MC.v5* IndexedDB mirror (best-effort, future cross-device). Schema: `{id, name, coords:{lat,lon}, full_address, label, ts, last_used}`. Sorted by `last_used` desc. Match threshold 0.001° (~111m). Max 20 favorites. One-time IDB→LS migration on first load. Public API: `getAll`, `isFavorite`, `findFavorite`, `add`, `remove`, `toggle`, `touch`, `refresh`. Complete verbatim, 192 lines.

```javascript
// ============================================================
//  VOY — core/favorites.js  (V7.9 Field_Ops_and_Persistent_Context)
//
//  VoyFavoritesService — persistence layer for frequent destinations.
//  Reduces Time-to-Search: "Casa" / "Trabajo" a un solo toque.
//
//  Storage strategy (per blueprint):
//    - LocalStorage (voy_favorites) = PRIMARY (fast sync read for UI)
//    - MC.v5* IndexedDB = mirror (best-effort sync for future cross-device)
//    - last_used timestamp = touched on every selection → sort by recency
//
//  Schema (per blueprint):
//    { id, name, coords:{lat,lon}, full_address, label, ts (created), last_used }
//
//  Public API:
//    VoyFavoritesService.getAll()           → Array (sync, sorted by last_used desc)
//    VoyFavoritesService.isFavorite(lat,lon)→ Boolean (sync, threshold 0.001°)
//    VoyFavoritesService.add(place, label)  → Promise (writes LS + mirrors to IDB)
//    VoyFavoritesService.remove(id)         → Promise (writes LS + mirrors to IDB)
//    VoyFavoritesService.toggle(place,label)→ Promise<Boolean> (returns new isFav state)
//    VoyFavoritesService.touch(lat, lon)    → Promise (updates last_used on matching fav)
//    VoyFavoritesService.refresh()          → Promise (reloads from LS; noop — LS is source)
//
//  Loaded after telemetry.js, before main inline <script>.
// ============================================================

window.VoyFavoritesService=(function(){
  var LS_KEY='voy_favorites';
  var THRESHOLD=0.001; // ~111m
  var MAX_FAVS=20;

  function _load(){
    try{
      var raw=localStorage.getItem(LS_KEY);
      var arr=raw?JSON.parse(raw):[];
      if(!Array.isArray(arr))return [];
      return arr;
    }catch(e){return []}
  }
  function _save(arr){
    try{localStorage.setItem(LS_KEY,JSON.stringify(arr))}catch(e){/* quota */}
  }
  function _sort(arr){
    arr.sort(function(a,b){
      var aLU=a.last_used||a.ts||0;
      var bLU=b.last_used||b.ts||0;
      return bLU-aLU;
    });
    return arr;
  }
  function _matches(fav,lat,lon){
    return fav&&Math.abs(fav.lat-lat)<THRESHOLD&&Math.abs(fav.lon-lon)<THRESHOLD;
  }
  function _makeId(lat,lon){
    return 'f_'+Math.round(lat*10000)+'_'+Math.round(lon*10000);
  }

  // Best-effort mirror to MC.v5* IndexedDB (non-blocking, catch-all)
  function _mirrorAdd(place,label){
    try{
      if(window.MC&&typeof MC.v5AddFavorite==='function'){
        MC.v5AddFavorite(place,label||'').catch(function(){});
      }
    }catch(e){}
  }
  function _mirrorRemove(id){
    try{
      if(window.MC&&typeof MC.v5RemoveFavorite==='function'){
        MC.v5RemoveFavorite(id).catch(function(){});
      }
    }catch(e){}
  }

  function getAll(){return _sort(_load().slice())}
  function isFavorite(lat,lon){
    var arr=_load();
    for(var i=0;i<arr.length;i++){
      if(_matches(arr[i],lat,lon))return true;
    }
    return false;
  }
  function findFavorite(lat,lon){
    var arr=_load();
    for(var i=0;i<arr.length;i++){
      if(_matches(arr[i],lat,lon))return arr[i];
    }
    return null;
  }

  function add(place,label){
    if(!place||place.lat==null||place.lon==null)return Promise.resolve(false);
    var arr=_load();
    // Don't duplicate (check by coords)
    var existing=findFavorite(place.lat,place.lon);
    if(existing){
      existing.last_used=Date.now();
      _save(arr);
      _mirrorAdd(place,label);
      return Promise.resolve(true);
    }
    var now=Date.now();
    var entry={
      id:_makeId(place.lat,place.lon),
      name:place.name||'',
      label:label||'',
      lat:place.lat,
      lon:place.lon,
      full_address:place.name||'',
      coords:{lat:place.lat,lon:place.lon},
      ts:now,
      last_used:now
    };
    arr.push(entry);
    if(arr.length>MAX_FAVS)arr=arr.slice(arr.length-MAX_FAVS);
    _save(arr);
    _mirrorAdd(place,label);
    return Promise.resolve(true);
  }
  function remove(id){
    var arr=_load();
    var filtered=arr.filter(function(f){return f.id!==id});
    if(filtered.length===arr.length)return Promise.resolve(false);
    _save(filtered);
    _mirrorRemove(id);
    return Promise.resolve(true);
  }
  function toggle(place,label){
    var existing=findFavorite(place.lat,place.lon);
    if(existing){
      return remove(existing.id).then(function(){return false});
    }
    return add(place,label).then(function(){return true});
  }
  function touch(lat,lon){
    var arr=_load();
    var touched=false;
    for(var i=0;i<arr.length;i++){
      if(_matches(arr[i],lat,lon)){
        arr[i].last_used=Date.now();
        touched=true;
        break;
      }
    }
    if(touched){_save(arr);_sort(arr)}
    return Promise.resolve(touched);
  }
  function _refresh(){
    // LS is source of truth — just re-read (no async IDB pull needed).
    // Kept for API compatibility with the original V7.9 spec.
    return Promise.resolve(getAll());
  }

  // Boot: migrate any existing IDB favorites into LS on first load (one-time).
  // Non-blocking — runs after DOMReady. If LS already has data, skip migration.
  if(typeof window!=='undefined'){
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',function(){
        var existing=_load();
        if(existing.length===0&&window.MC&&typeof MC.v5GetFavorites==='function'){
          MC.v5GetFavorites().then(function(favs){
            if(!favs||!favs.length)return;
            var now=Date.now();
            var migrated=favs.map(function(f){
              return {
                id:f.id||_makeId(f.lat,f.lon),
                name:f.name||'',
                label:f.label||'',
                lat:f.lat,lon:f.lon,
                full_address:f.name||'',
                coords:{lat:f.lat,lon:f.lon},
                ts:f.ts||now,
                last_used:f.ts||now
              };
            });
            _save(migrated);
          }).catch(function(){});
        }
      });
    }
  }

  return {
    getAll:getAll,
    isFavorite:isFavorite,
    findFavorite:findFavorite,
    add:add,
    remove:remove,
    toggle:toggle,
    touch:touch,
    refresh:_refresh
  };
})();

```

## 11. `public/core/ahorro.js`

VoyAhorroService (V7.5 Ahorro_Inteligente) + `renderAhorroBadges()`. Comparative cost engine: `isRecommendationAvailable = (PublicTransportPrice < RideHailingPrice * 0.5)`. Observer pattern — `recompute()` called from `renderSheet()` after each estimate; `_set()` emits to listeners + triggers idempotent `renderAhorroBadges()`. Badges: '¡Ahorrá un X%!' on every Colectivo mode-pill + highlight dot on the Ahorro cat-tab. `REFRESH_MS=300000` (5 min). Complete verbatim, 84 lines.

```javascript
// ============================================================
//  VOY — core/ahorro.js  (V7.8 Modular Refactor)
//
//  Extracted from VOY-Lite.html (V7.5 Ahorro_Inteligente).
//  Loaded via <script src="core/ahorro.js?v=78"> before the main
//  inline script. Exposes two globals:
//    - window.VoyAhorroService  (observer IIFE — comparative cost engine)
//    - renderAhorroBadges()     (idempotent BadgeRenderer)
//
//  Dependencies: none (pure vanilla JS). Uses global svg() at runtime
//  (defined later in the inline script — only called when invoked, not
//  at load time).
//
//  Blueprint: isRecommendationAvailable = (PublicTransportPrice < RideHailingPrice * threshold)
//  threshold=0.5, refresh=300000ms, data_source=MC.getEstimations() via renderSheet.
// ============================================================

// ===================== V7.5 AHORRO INTELIGENTE =================================================
// Blueprint: AhorroFeature — comparative cost algorithm (Colectivo vs Ride-Hailing).
//   formula: isRecommendationAvailable = (PublicTransportPrice < RideHailingPrice * threshold)
// Decoupled from rendering via observer pattern (mirrors VoyMapContext). renderSheet() calls
// recompute() after each estimate; _set() emits to listeners + triggers BadgeRenderer.
window.VoyAhorroService=(function(){
  var THRESHOLD=0.5;
  var REFRESH_MS=300000;
  var _state={available:false,colectivoPrice:null,rideHailingPrice:null,savingsPercent:0,threshold:THRESHOLD};
  var _listeners=[];
  var _lastComputeTs=0;
  function _emit(){for(var i=0;i<_listeners.length;i++){try{_listeners[i](_state)}catch(e){console.error('[VoyAhorroService] listener',e)}}}
  function _set(avail,colP,rhP,sav){
    var changed=_state.available!==avail||_state.colectivoPrice!==colP||_state.rideHailingPrice!==rhP||_state.savingsPercent!==sav;
    _state.available=avail;
    if(colP!=null)_state.colectivoPrice=colP;
    if(rhP!=null)_state.rideHailingPrice=rhP;
    if(sav!=null)_state.savingsPercent=sav;
    if(changed){
      _emit();
      if(typeof renderAhorroBadges==='function')renderAhorroBadges();
    }
  }
  function recompute(colectivoPrice,rideHailingPrice){
    if(colectivoPrice==null||colectivoPrice<0||rideHailingPrice==null||rideHailingPrice<=0){_set(false,null,null,0);return}
    _lastComputeTs=Date.now();
    var avail=colectivoPrice<(rideHailingPrice*THRESHOLD);
    var sav=rideHailingPrice>0?Math.round((1-colectivoPrice/rideHailingPrice)*100):0;
    _set(avail,colectivoPrice,rideHailingPrice,sav);
  }
  function isStale(){return _lastComputeTs===0||(Date.now()-_lastComputeTs)>REFRESH_MS}
  return {
    THRESHOLD:THRESHOLD,REFRESH_MS:REFRESH_MS,
    getState:function(){return _state},
    recompute:recompute,
    isStale:isStale,
    subscribe:function(fn){_listeners.push(fn);return function(){_listeners=_listeners.filter(function(f){return f!==fn})}}
  };
})();

// V7.5 BadgeRenderer — mounts "¡Ahorrá un X%!" on every Colectivo mode-pill and a
// highlight dot on the Ahorro cat-tab when VoyAhorroService.getState().available is true.
// Idempotent: safe to call on every state change (clears stale badges first, then mounts fresh).
function renderAhorroBadges(){
  if(!window.VoyAhorroService)return; // not yet initialized (boot-time call from initCategoryManager)
  var st=VoyAhorroService.getState();
  // (1) Ahorro cat-tab highlight dot (group index 0 = group_ahorro)
  var ahorroTabs=document.querySelectorAll('.cat-tab[data-group-idx="0"]');
  for(var i=0;i<ahorroTabs.length;i++){
    var tab=ahorroTabs[i];
    var dot=tab.querySelector('.ahorro-tab-badge');
    if(st.available){
      if(!dot){dot=document.createElement('span');dot.className='ahorro-tab-badge';dot.setAttribute('aria-label','Ahorro disponible');tab.appendChild(dot)}
    }else if(dot){dot.parentNode.removeChild(dot)}
  }
  // (2) Colectivo mode-pill badges — every bus pill across ALL groups (Ahorro + Público)
  var busPills=document.querySelectorAll('.mode-pill[data-mode="bus"]');
  for(var j=0;j<busPills.length;j++){
    var pill=busPills[j];
    var badge=pill.querySelector('.ahorro-pill-badge');
    if(st.available){
      var txt='¡Ahorrá un '+st.savingsPercent+'%!';
      if(!badge){badge=document.createElement('span');badge.className='ahorro-pill-badge';pill.appendChild(badge)}
      badge.textContent=txt;
    }else if(badge){badge.parentNode.removeChild(badge)}
  }
}

```

## 12. `public/core/feedback.js`

VoyFeedbackService (V7.9). In-flow price-accuracy reporting — flag icon on each provider price card (hero + alts + taxi/remis). Capture: `{routeKey, provider, price_shown, user_note, ts}`. Transport: `sendBeacon` → `/api/telemetry` (event: `data_accuracy_issue`), non-blocking, fire-and-forget. Event delegation on `#decisionSheet` via `[data-fb-provider]` attribute. Visual feedback: 600ms `.fb-pulse` on the flag icon. Toast confirmation. Creates training dataset for future TrendEngine calibration. Complete verbatim, 89 lines.

```javascript
// ============================================================
//  VOY — core/feedback.js  (V7.9 Field_Ops_and_Persistent_Context)
//
//  VoyFeedbackService — in-flow price-accuracy reporting.
//  Lets users flag inaccurate provider prices without leaving the
//  decision sheet. Creates a training dataset for future TrendEngine
//  calibration (data_accuracy_issue beacons).
//
//  UI: flag icon on each provider price card (hero + alts + taxi/remis).
//  Capture: { routeKey, provider, price_shown, user_note, ts }
//  Transport: Beacon API → /api/telemetry (event: 'data_accuracy_issue')
//             Non-blocking (sendBeacon), fire-and-forget.
//
//  Public API:
//    VoyFeedbackService.report(routeKey, provider, priceShown, userNote)
//    VoyFeedbackService.attachToSheet()  — delegates + event wiring (called from attachSheetEvents)
//
//  Loaded after favorites.js, before main inline <script>.
//  Depends on: navigator.sendBeacon, global svg() at runtime.
// ============================================================

window.VoyFeedbackService=(function(){
  var ENDPOINT='/api/telemetry';
  var _supported=(typeof navigator!=='undefined')&&(typeof navigator.sendBeacon==='function');

  function _routeKey(origin,dest){
    if(!origin||!dest)return 'unknown';
    return Math.round(origin.lat*1000)+'_'+Math.round(origin.lon*1000)+'__'+
           Math.round(dest.lat*1000)+'_'+Math.round(dest.lon*1000);
  }

  function report(routeKey,provider,priceShown,userNote){
    if(!_supported)return false;
    try{
      var payload=JSON.stringify({
        event:'data_accuracy_issue',
        routeKey:String(routeKey||'unknown').slice(0,80),
        provider:String(provider||'unknown').slice(0,32),
        price_shown:isFinite(priceShown)?Number(priceShown):0,
        user_note:String(userNote||'').slice(0,280),
        ts:Date.now()
      });
      var blob=new Blob([payload],{type:'application/json'});
      navigator.sendBeacon(ENDPOINT,blob);
      return true;
    }catch(e){return false}
  }

  // Event delegation: any element with [data-fb-provider] reports on click.
  // Reads provider + price from data attributes; routeKey from MC origin/dest.
  function _onClick(e){
    var btn=e.target.closest('[data-fb-provider]');
    if(!btn)return;
    e.stopPropagation();
    e.preventDefault();
    var provider=btn.getAttribute('data-fb-provider');
    var price=parseFloat(btn.getAttribute('data-fb-price')||'0');
    var origin=window.MC?MC.getOrigin():null;
    var dest=window.MC?MC.getDest():null;
    var routeKey=_routeKey(origin,dest);
    // Immediate beacon (empty note — non-disruptive). User can add note via toast tap.
    var sent=report(routeKey,provider,price,'');
    if(sent){
      // Non-disruptive: toast confirmation + offer to add a note.
      if(typeof showToast==='function'){
        showToast('Precio reportado · gracias por la corrección','success');
      }
    }
    // Visual feedback: pulse the flag icon
    btn.classList.add('fb-pulse');
    setTimeout(function(){btn.classList.remove('fb-pulse')},600);
  }

  function attachToSheet(){
    var sheet=document.getElementById('decisionSheet');
    if(!sheet)return;
    // Avoid double-binding
    if(sheet.getAttribute('data-fb-bound')==='1')return;
    sheet.setAttribute('data-fb-bound','1');
    sheet.addEventListener('click',_onClick);
  }

  return {
    report:report,
    attachToSheet:attachToSheet,
    routeKey:_routeKey,
    supported:function(){return _supported}
  };
})();

```

## 13. `wrangler.jsonc`

Cloudflare Workers config. `name: voy-app` (updates the EXISTING production worker at `voy-app.simondalmasso44.workers.dev`). `compatibility_date: 2026-01-01`, `main: ./worker.js`, `workers_dev: true` (required — is-a.dev CNAME resolves to the workers.dev URL). Assets binding `ASSETS` serves `./public` with `html_handling: none` + `not_found_handling: none` (no SPA fallback, no directory listing). Analytics Engine dataset `voy_metrics` bound as `VOY_METRICS` (WAE free tier: 100k data points/day). Vars block configures the 7 exclusion-filter knobs (`VOY_OWNER_IPS`, `VOY_OWNER_IP_HASHES`, `VOY_DEV_IPS`, `VOY_EXCLUDE_LOCALHOST/HEADLESS/BOT/GLM`, `VOY_EXCLUDE_UA_PATTERNS`). Observability enabled. Cron: `0 6 * * 1` (Mon 06:00 UTC). Complete verbatim, 87 lines.

```jsonc
{
  // ============================================================
  //  VOY — Cloudflare Workers config (V7.8: WAE analytics + cron tarifas)
  //
  //  Canonical domain:  https://voy.is-a.dev  (is-a.dev PR #41619 open, pending merge)
  //  Worker name:       voy-app  (the EXISTING production worker at
  //                    voy-app.simondalmasso44.workers.dev — deploying updates it)
  //
  //  workers_dev MUST stay true (is-a.dev CNAME resolves to the workers.dev URL).
  //  V7.1: the workers.dev → voy.is-a.dev redirect in worker.js is DISABLED
  //  until voy.is-a.dev is registered. Re-enable after is-a.dev PR merges.
  // ============================================================
  "name": "voy-app",
  "compatibility_date": "2026-01-01",
  "main": "./worker.js",

  // REQUIRED: keep true (is-a.dev CNAME resolves to the workers.dev URL).
  // Direct workers.dev access is redirected by worker.js → voy.is-a.dev.
  "workers_dev": true,

  // No routes: voy.is-a.dev and voy.app zones are not in this CF account.
  // voy.is-a.dev reaches the worker via the is-a.dev CNAME (DNS-level), not
  // via a CF route. Adding a route for a non-owned zone would fail deploy
  // ("Could not find zone for voy.is-a.dev").
  "routes": [],

  "assets": {
    "directory": "./public",
    "binding": "ASSETS",
    "html_handling": "none",
    // "none" → unknown paths return a plain 404. No SPA fallback, no
    // directory listing (Workers Assets never enumerates directories).
    "not_found_handling": "none"
  },

  // Cloudflare Analytics Engine — 3 eventos (estimation / provider_tap / search).
  // WAE Free tier = 100k data points/día gratis. VOY no lo supera.
  // El worker escribe data points via ctx.waitUntil(env.VOY_METRICS.writeDataPoint()).
  // Si el binding está ausente (dry-run), /api/events devuelve 202 gracefully.
  //
  // ✅ Dataset creado en el dashboard CF (account b21fa81d12acb663798f9f7c51801955):
  //   binding = VOY_METRICS, dataset = voy_metrics.
  // Habilitado el 2026-06-23. /api/health ahora reporta analytics:true.
  "analytics_engine_datasets": [
    { "binding": "VOY_METRICS", "dataset": "voy_metrics" }
  ],

  // V7.8: Durable Object + /api/reports eliminados (analytics V2 dual-store removido).
  // WAE es el único store. Simplificación: 3 eventos, 0 código muerto.

  // V7.8.1 — ANALYTICS_SYSTEM_SETUP: filtros de exclusión de analytics.
  // Reglas activas (todas configurables via dashboard o wrangler.jsonc vars):
  //   - localhost / headless / bot      (VOY_EXCLUDE_LOCALHOST/HEADLESS/BOT)
  //   - glm_agent (GLM_* UA filter)     (VOY_EXCLUDE_GLM) — excludes z-ai/GLM automated agents
  //   - owner_ip / owner_ip_hash        (VOY_OWNER_IPS / VOY_OWNER_IP_HASHES) — SIMON_DEVICE rule
  //   - dev_ip                          (VOY_DEV_IPS)
  //   - custom UA patterns              (VOY_EXCLUDE_UA_PATTERNS — comma-separated regex, case-insensitive)
  //
  // HOW TO EXCLUDE YOUR DEVICE (SIMON_DEVICE):
  //   1. Visit https://voy-app.simondalmasso44.workers.dev/api/whoami from your device.
  //   2. Copy the `ip` (→ VOY_OWNER_IPS) OR the `ip_sha256` (→ VOY_OWNER_IP_HASHES, more private).
  //   3. Paste below (comma-separated if multiple devices). Redeploy.
  //   4. Verify on /api/whoami → "excluded": "owner_ip" (or "owner_ip_hash").
  //   5. Verify on /api/health → filters.owner_ips / owner_ip_hashes counts updated.
  "vars": {
    "VOY_OWNER_IPS": "",
    "VOY_OWNER_IP_HASHES": "",
    "VOY_DEV_IPS": "",
    "VOY_EXCLUDE_LOCALHOST": "true",
    "VOY_EXCLUDE_HEADLESS": "true",
    "VOY_EXCLUDE_BOT": "true",
    "VOY_EXCLUDE_GLM": "true",
    "VOY_EXCLUDE_UA_PATTERNS": ""
  },

  "observability": {
    "enabled": true,
    "logs": { "enabled": true, "head_sampling_rate": 1 }
  },

  // Cron trigger — recordatorio semanal de revisión de tarifas municipales.
  // Lunes 06:00 UTC (03:00 ART). Solo loguea; el hook queda listo para cuando
  // exista una fuente oficial automática de tarifas.
  "triggers": {
    "crons": ["0 6 * * 1"]
  }
}

```

---

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
