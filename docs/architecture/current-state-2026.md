# VOY Current State — 2026

Status: audited baseline  
Audit date: 2026-07-17  
Production baseline: `bac0a56d2840707beae6161a4c21e4eee2c7820a`  
Production URL: `https://voy-app.simondalmasso44.workers.dev/`

## Executive summary

VOY is currently a lightweight single-page PWA served by a Cloudflare Worker with static assets. The production product is not the Next.js application present in `src/`; Wrangler deploys `worker-entry.js`, which extends the Worker implementation in `worker.js`, and binds `public/` as static assets.

The strongest parts of the current system are:

- fast destination-first interaction;
- explicit ambiguity and wide-search selection;
- pure mobility and pricing modules;
- a coordinated, cached and rate-limited Nominatim path;
- city-aware search isolation between `santafe` and `_default`;
- browser evidence for desktop and mobile;
- production build-hash verification with bounded edge convergence;
- rollback-capable CI/CD.

The principal risks are not the destination resolver anymore. They are data freshness, territorial data structure, repository sprawl, privacy semantics, duplicate implementations and incomplete accessibility/performance governance.

## Production topology

```text
Browser / installed PWA
  ├─ /                    -> Worker rewrites to /VOY-Lite.html
  ├─ /core/*.js           -> static assets from public/
  ├─ /ui/*.js             -> static assets from public/
  ├─ /navigator/*.js      -> lazy-loaded navigation module
  ├─ /city_*.json         -> versioned city profile data
  ├─ /api/geocode         -> Worker -> Durable Object -> Nominatim/provider
  ├─ /api/events          -> Worker -> Cloudflare Analytics Engine (optional binding)
  ├─ /api/telemetry       -> Worker log + Analytics Engine (optional)
  └─ /api/health          -> version, build hash and filter-state counts

Cloudflare Worker
  ├─ worker-entry.js
  │    └─ subclasses NominatimCoordinator for corrected cache/alarm behavior
  ├─ worker.js
  ├─ static asset binding: public/
  ├─ Durable Object binding: NOMINATIM_COORDINATOR
  └─ Analytics Engine binding: VOY_METRICS
```

`wrangler.jsonc` is the deployment source of truth. No evidence was found that `next build`, Prisma or the `src/app` routes participate in the Workers production deployment.

## Request routing

### HTML

- `/` is internally rewritten to `/VOY-Lite.html`.
- `/VOY-Lite.html` and `/voy-lite` redirect to `/` for a canonical entry point.
- Root HTML is returned with `Cache-Control: no-store`, `X-VOY-Version` and `X-VOY-Build`.
- A short session cookie is created on the first HTML request for analytics correlation.

### Static assets

All other non-API paths are served through the Worker static asset binding. MapLibre is loaded from pinned `unpkg.com` URLs with SRI. CARTO supplies the default map style and OpenStreetMap tiles are used as fallback.

### Geocoding

`GET /api/geocode` validates inputs and passes work to a global Durable Object coordinator. The coordinator provides:

- minimum inter-request spacing;
- bounded queue and wait time;
- fetch timeout;
- logical cache separated by city identity and search mode;
- alarm-driven expired-cache purging;
- correct real pagination using `startAfter`;
- preservation of the earliest future expiration across pages.

The Santa Fe profile uses bounded geocoding. `_default` performs Argentina-wide geocoding without the Santa Fe suffix, viewbox or territorial filter. Public Nominatim is not used as autocomplete on every keystroke; remote search is explicit.

## Client architecture

### Main shell

`public/VOY-Lite.html` remains a large, mixed-responsibility shell. It contains:

- page structure and most styling;
- city profile loading and fallback logic;
- MapLibre initialization;
- provider deeplinks;
- route rendering;
- some estimation and recommendation logic;
- service-worker registration;
- runtime boot and feature glue.

This is currently operational but is the primary maintainability bottleneck.

### Pure and semi-pure modules

Preserved production modules:

- `public/core/mobilityEngine.js`: deterministic transport estimates and ranking helpers;
- `public/core/pricingEngine.js`: confidence, range and surge helpers;
- `public/core/destinationResolver.js`: canonical destination resolution;
- `public/core/eventBus.js`: decoupled events;
- `public/core/telemetry.js`: browser health telemetry;
- `public/core/favorites.js`, `feedback.js`, `ahorro.js`, `trend.js`;
- `public/ui/mobilityController.js`: destination search, memory, preferences and rendering coordination;
- `public/navigator/navigator.js`: lazy navigation overlay.

### Navigator duplication

Two navigator implementations exist:

- `public/navigator/navigator.js` is the file injected by `VOY-Lite.html` and is therefore the production implementation.
- `public/ui/navigator.js` is another complete implementation with a different state model and feature scope.

The second file must not be deleted until references, service-worker behavior, history and tests are checked, but the runtime evidence currently identifies it as a duplicate candidate.

### Mobility-engine duplication

Both `core/mobilityEngine.js` and `public/core/mobilityEngine.js` exist and are not byte-identical. Production loads `public/core/mobilityEngine.js`. The root copy is larger and may be historical or test-related. Its consumers must be enumerated before deletion or consolidation.

## City model

The current city system loads one monolithic JSON file per supported identity:

- `public/city_santafe.json`;
- `public/city_default.json`.

Each file combines:

- map configuration;
- bus stops;
- bicycle stations;
- landmarks;
- provider availability;
- taxi/remis companies and deeplinks;
- fares.

The client detects `santafe` from a query parameter or a recent cached position inside a hard-coded bounding box. Every unknown explicit city falls back to `_default`.

This is a functional multi-profile mechanism, not yet the target multi-city platform. Missing elements include coverage level, timezone, provenance fields, expiry, feature flags, schemas and separate ownership of providers, transport and fares.

## Data quality

### Santa Fe

The Santa Fe profile includes curated stops, bicycle stations, landmarks, providers and fare formulas. Only the Puente Colgante landmark is currently marked verified; most other landmarks are explicitly approximate.

The fare data has a critical freshness problem:

- taxi values in active `fareRegistry` are the January 2026 values;
- `public/fares.json` states that July values were already defined and should be activated on 2026-07-01;
- the metadata review date is past;
- no official source located during this audit was sufficient to safely replace the values automatically.

Until an official current tariff is verified, the product must treat the taxi tariff as stale rather than current.

Provider availability also requires reconciliation. The Santa Fe profile marks Cabify unavailable, while deeplink code comments describe it as verified available. City data, code comments and tests need one source of truth.

### `_default`

The default profile correctly avoids local taxi, bus and bicycle claims. It currently presents a world map centered at `[0,0]` and calls the city “Desconocida”. The geocoder is restricted to Argentina, so the UX should become an explicit national-basic Argentina profile rather than a generic unknown-world state.

## Pricing

Current pricing has two layers:

1. `fareRegistry` in each city profile, used by the operational estimation path;
2. `public/core/pricingEngine.js`, which adds confidence and surge-aware ranges.

`public/fares.json` is a third representation and is not loaded by the production HTML. This creates tariff duplication and drift.

The pricing engine describes several values as empirical defaults and can apply time, rain, demand and event multipliers without a live authoritative feed. Those outputs must remain clearly labelled estimates. Weather and demand flags cannot be activated as factual context without a verified source.

## Local storage and browser state

The active memory direction is one key per city:

```text
voy_memory_<cityId>
```

Legacy keys such as `voy_favorites`, `voy_history` and metrics keys are migrated to `voy_memory_santafe` and removed after verification. The HTML also contains migration/preparation logic while `mobilityController.js` contains similar logic, creating a divergence risk.

Other persisted state includes city cache, recent position, preferences, telemetry identifiers and cryptographic material used by local features. A formal storage inventory and retention contract is not yet documented.

## Analytics and privacy

The Worker normalizes product analytics to three canonical event classes and writes minimized provider/mode/price/time/distance fields to Analytics Engine when the binding exists. It excludes configured owner, development, localhost, headless, bot and GLM traffic.

Current privacy issues:

- `voy_sid` persists for 30 days and lacks a user-facing opt-out/deletion flow;
- `/api/whoami` returns the caller IP, IP hash and user-agent to the caller and should be restricted or removed from ordinary production surface;
- telemetry accepts a `route` string up to 140 characters, which requires client-side guarantees that it never contains private address text;
- CORS is `*` on API responses;
- no explicit retention policy is versioned in the repository.

No evidence was found that complete conversations or audio are currently collected.

## Offline and service worker

`public/sw.js` provides:

- network-first navigations with cached shell fallback;
- stale-while-revalidate for same-origin static assets;
- cache-first pinned MapLibre assets;
- seven-day caching for CARTO/OSM map tiles;
- passthrough for other cross-origin requests;
- an IndexedDB fallback for `/api/estimate`.

Risks:

- activation deletes every cache for the origin, not only VOY-owned caches;
- no bounded tile-cache count or storage quota handling exists;
- `/api/estimate` is not a production Worker route in the current deployment, so its offline interception appears residual;
- no explicit offline browser gate is present in CI.

## Security posture

Positive controls:

- no client-side production secrets identified;
- strict coordinate validation for geocoding;
- provider deeplinks are constructed from known providers;
- Nominatim access is coordinated and bounded;
- HTML is not edge-cached;
- SRI is used for pinned MapLibre CDN assets;
- deployment uses GitHub Actions secrets and a Wrangler dry-run.

Gaps:

- no explicit production Content-Security-Policy was found in the Worker;
- external origins are distributed across HTML, service worker and navigator code;
- `/api/whoami` exposes diagnostic identity material to any caller;
- telemetry/event endpoints need request-size and schema bounds reviewed;
- repository history contains generated evidence, local database configuration and residual application code that increase accidental exposure risk.

## Repository state

At the audited baseline the repository contains approximately:

- 368 files;
- 27.7 MB;
- 146 PNG files;
- 77 files under `src/`;
- 24 files under `archive/`;
- five tracked `tool-results` files;
- many screenshots and historical deliverables at repository root.

`package.json` still identifies a Next.js/Tailwind/shadcn application and includes Prisma, NextAuth and many UI dependencies. Those dependencies are installed in every CI run even though the Cloudflare Worker/PWA path does not use them for deployment. This increases install time, attack surface and ambiguity.

A tracked `.env` contains a local SQLite path. It does not contain a credential, but environment files should not be tracked and the absolute `/home/z/...` path is non-portable.

## CI/CD baseline

PR validation currently executes:

- Bun frozen install;
- ESLint;
- Node tests;
- Wrangler dry-run;
- Chromium desktop/mobile smoke against a local Worker;
- verification of the current production baseline without deploy;
- desktop/mobile browser smoke against production;
- evidence upload.

Pushes to `main` execute the same predeploy gates, inject the build hash, deploy to Cloudflare, poll `/api/health` until the edge converges, verify HTML/version entrypoints and run production desktop/mobile smoke.

Baseline deployment evidence:

- merge SHA: `bac0a56d2840707beae6161a4c21e4eee2c7820a`;
- run: `29602685250`;
- result: success;
- health: `build_hash=bac0a56`, `version=V7.8.0`, `ok=true`;
- rollback: not executed.

## Immediate architecture decisions

1. Preserve the Worker/PWA architecture.
2. Do not migrate production to the residual Next.js app.
3. Introduce a versioned city-data contract before adding cities.
4. Consolidate fares into one authoritative city source.
5. Mark stale data unavailable before attempting richer recommendations.
6. Remove or quarantine dead repository surfaces only after reference, runtime, test and history evidence.
7. Add CSP, storage/privacy contracts, offline gates and accessibility gates in the stability phase.
8. Build VOY Copilot only after deterministic city and pricing contracts are stable.
