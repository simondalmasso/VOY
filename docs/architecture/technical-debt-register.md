# VOY Technical Debt Register

Audit date: 2026-07-17  
Baseline: `bac0a56d2840707beae6161a4c21e4eee2c7820a`

Severity:

- **P0** — can produce materially wrong user decisions, expose sensitive data or break production.
- **P1** — significant reliability, security, accessibility or maintainability risk.
- **P2** — bounded debt with a clear workaround.
- **P3** — cleanup or optimization with low immediate risk.

Status values: `open`, `verified`, `in-progress`, `blocked-source`, `deferred`, `closed`.

## Register

| ID | Severity | Area | Finding | Evidence | Required action | Phase | Status |
|---|---:|---|---|---|---|---|---|
| DATA-001 | P0 | Fares | Active Santa Fe taxi tariff is stale. January values remain active after the file's own 2026-07-01 activation note. | `public/fares.json`; `public/city_santafe.json` | Locate an official current norm; until verified, mark taxi estimate stale/unavailable and prevent “vigente” claims. | Stability | blocked-source |
| DATA-002 | P1 | Fares | Fare data is duplicated between `public/fares.json` and city `fareRegistry`; production does not load `public/fares.json`. | HTML loads city JSON; no `fares.json` reference | Establish city fare data as one source of truth, add schema/provenance and remove duplicate only after migration. | Stability/City | open |
| DATA-003 | P1 | Providers | Cabify availability contradicts code comments and city data. | `city_santafe.json` says unavailable; deeplink comments say verified available | Verify official city coverage, then align provider availability, deeplink and tests. | Stability | open |
| DATA-004 | P1 | Provenance | Stops, bike stations and most providers lack source URL, verification date, expiry and confidence. | `public/city_santafe.json` | Add provenance fields and a validation script; fail CI on expired verified data. | City | open |
| DATA-005 | P1 | Coverage | `_default` is labelled “Ciudad Desconocida” and centered globally while geocoding is Argentina-only. | `public/city_default.json`; Worker geocoder | Convert to an explicit Argentina `national_basic` profile with honest coverage messaging. | City | open |
| DATA-006 | P1 | Landmarks | Most Santa Fe landmarks are approximate and unverified but can appear alongside the single verified landmark. | `public/city_santafe.json` | Surface verification/precision in resolver output and UI; prioritize official/OSM validation. | Santa Fe | open |
| DATA-007 | P1 | Pricing | App formulas and confidence priors are described as empirical but can look authoritative. | `pricingEngine.js`; city app fares | Label app fares as estimates, show freshness, widen uncertainty and never call them live quotes. | Stability | open |
| DATA-008 | P1 | Pricing | Time/weather/demand surge helpers exist without authoritative live feeds. | `pricingEngine.js` | Keep flags disabled by default; require verified context source and explicit explanation before activation. | Copilot/UX | deferred |
| ARCH-001 | P1 | Runtime | `VOY-Lite.html` mixes structure, style, city loading, map, deeplinks and recommendation glue. | 3,000+ line production shell | Extract only stable contracts incrementally; do not rewrite framework. | Stability onward | open |
| ARCH-002 | P1 | Duplication | Two navigator implementations exist with different behavior. | `public/navigator/navigator.js`; `public/ui/navigator.js` | Prove all references and remove/archive the non-runtime copy with regression tests. | Stability | verified |
| ARCH-003 | P1 | Duplication | Root and public mobility engines are different. | `core/mobilityEngine.js`; `public/core/mobilityEngine.js` | Enumerate consumers and tests; consolidate to one production/test module. | Stability | verified |
| ARCH-004 | P1 | State | City-memory migration logic exists in both HTML and controller. | `VOY-Lite.html`; `mobilityController.js` | Assign one owner, add corrupt-storage/migration tests and remove duplicate path. | Stability | open |
| ARCH-005 | P2 | Versioning | Versions are repeated across Worker, HTML, service worker, asset query strings and comments. | multiple files | Generate runtime version metadata from one source during build. | Stability | open |
| ARCH-006 | P2 | Feature flags | No typed per-city feature flag contract exists. | city JSON files | Add local versioned flags with defaults false and schema validation. | City | open |
| ARCH-007 | P2 | Entry wrapper | `worker-entry.js` overrides selected Worker/DO behavior and can drift from `worker.js`. | wrapper added for alarm fix | Add an explicit wrapper contract test and plan reintegration when safe. | Stability | open |
| REPO-001 | P1 | Repository | Residual Next.js/Prisma application is installed in CI but is not the production deployment. | `src/`, `package.json`, `wrangler.jsonc` | Prove no operational dependency; split or remove residual application and trim dependencies. | Stability | verified |
| REPO-002 | P1 | Repository | 146 tracked PNGs and historical evidence inflate the repo. | repository tree | Create evidence retention rules; move durable evidence to release artifacts/docs and delete redundant binaries after reference audit. | Stability | verified |
| REPO-003 | P1 | Repository | `archive/`, `tool-results/`, pasted dumps and duplicate root deliverables remain tracked. | repository tree | Inventory references/history; preserve only intentional archival material outside production tree. | Stability | verified |
| REPO-004 | P2 | Environment | `.env` is tracked with an absolute local SQLite path. | `.env` | Replace with `.env.example`, ensure `.env` ignored and verify no secret history issue. | Stability | verified |
| REPO-005 | P2 | CI | Every test run installs a large Next/UI dependency set unrelated to Worker deployment. | `package.json`, Bun install | Create a minimal production/test dependency model after residual-app decision. | Stability | open |
| SEC-001 | P1 | Browser security | No explicit production CSP was found. | Worker headers | Add a restrictive report-only CSP, inventory required origins, then enforce without `unsafe-eval`. | Stability | verified |
| SEC-002 | P1 | Diagnostics | `/api/whoami` publicly returns caller IP, hash and UA. | `worker.js` | Remove from production or require a non-public operator gate. Do not rely on obscurity. | Stability | verified |
| SEC-003 | P1 | API | Event/telemetry CORS is `*`. | `_cors()` | Restrict write endpoints to same-origin/allowlist while preserving required GET behavior. | Stability | open |
| SEC-004 | P1 | API | Event and telemetry schemas accept loosely shaped nested data and lack explicit body-size limits. | handlers in `worker.js` | Add content-length/body limits, typed allowlists and adversarial tests. | Stability | open |
| SEC-005 | P1 | External actions | Deeplinks are distributed in HTML and provider assumptions can drift. | `VOY-Lite.html` | Centralize provider action registry, validate coordinates, throttle repeated opens and require confirmation. | Copilot/City | open |
| SEC-006 | P2 | Supply chain | MapLibre is pinned with SRI but served from third-party CDN. | `VOY-Lite.html` | Evaluate self-hosting small pinned assets; retain fallback and attribution. | Stability | open |
| PRIV-001 | P1 | Analytics | `voy_sid` has a 30-day lifetime without user opt-out or deletion contract. | Worker HTML response | Document necessity/retention; shorten or replace with ephemeral aggregation and add opt-out. | Stability | verified |
| PRIV-002 | P1 | Telemetry | `route` can contain up to 140 arbitrary client characters. | telemetry handler | Replace with route category/pathname allowlist; reject address/query content. | Stability | open |
| PRIV-003 | P1 | Local data | Exact recent location and home/work favorites can persist locally without a documented retention/clear flow. | localStorage usage | Add storage inventory, clear-data action, TTL where appropriate and privacy copy. | UX/Privacy | open |
| PRIV-004 | P2 | Analytics | No versioned retention policy exists for Analytics Engine. | repository docs/config | Define aggregation, retention, operator exclusions and deletion limitations. | Stability | open |
| PWA-001 | P1 | Service worker | Activation deletes every cache on the origin. | `public/sw.js` | Delete only VOY-owned cache prefixes and test migration. | Stability | verified |
| PWA-002 | P1 | Storage | Tile cache has time expiry but no item/byte quota handling. | `public/sw.js` | Add bounded cleanup and graceful quota failure. | Stability | open |
| PWA-003 | P2 | Residual path | Service worker intercepts `/api/estimate`, but current Worker has no route. | `public/sw.js`; `worker.js` | Confirm runtime usage, remove residual branch or implement only with a real contract. | Stability | verified |
| PWA-004 | P1 | CI | Offline shell, service-worker update and corrupt-cache behavior are not browser-gated. | CI workflows | Add deterministic offline/update browser tests. | Stability/UX | open |
| EXT-001 | P1 | Nominatim | Public Nominatim remains an external operational dependency. | Worker default provider | Continue explicit-search-only, global rate limiting and cache; document migration to owned provider. | Stability | open |
| EXT-002 | P1 | Routing | Public OSRM is called directly by client modules. | HTML/navigator | Add timeout/backoff/status UX and provider abstraction; review public service policy. | Stability | open |
| EXT-003 | P1 | Maps | CARTO/OSM connectivity is required for full map experience. | HTML/service worker | Maintain textual alternative and degraded comparison without map. | UX | open |
| EXT-004 | P2 | Attribution | Attribution exists in map UI but must be verified through all fallback/offline states. | MapLibre init | Add browser assertions for attribution visibility. | UX | open |
| UX-001 | P1 | Accessibility | No axe-core gate or documented WCAG 2.2 AA matrix exists. | CI | Add axe checks for initial, results, sheets and navigation states. | UX | verified |
| UX-002 | P1 | Accessibility | Map is the dominant spatial surface without a complete textual route/stops alternative. | production UI | Provide equivalent textual results and focus order. | UX | open |
| UX-003 | P1 | Accessibility | Accessibility needs do not yet affect recommendation ranking. | mobility contracts | Add explicit unknown/known accessibility data and deterministic constraints. | City/UX | open |
| UX-004 | P2 | Errors | Missing/stale data states are not consistently differentiated. | UI paths | Standardize unavailable, stale, offline, timeout and unsupported-city states. | UX | open |
| PERF-001 | P1 | Performance | No enforced budgets for JS, requests, LCP, INP or CLS. | CI | Establish baseline and fail only on meaningful regression thresholds. | UX | open |
| PERF-002 | P2 | Runtime | Map libraries load at initial page boot. | HTML | Measure destination-first flow and evaluate lazy map initialization without harming UX. | UX | open |
| PERF-003 | P2 | Timers | A drift interval exists in HTML; timer ownership/cleanup is not systematically tested. | `VOY-Lite.html` | Inventory timers/listeners and add lifecycle tests. | Stability | open |
| TEST-001 | P1 | City isolation | Current tests cover two profiles but not a schema-driven city matrix. | test suite | Add fixtures for national, partial, verified and malformed profiles. | City | open |
| TEST-002 | P1 | Data | No CI check fails on expired verified fares/providers. | workflows | Add data validation and expiry gate with an explicit emergency override process. | City | open |
| TEST-003 | P1 | Security | No adversarial Copilot/tool tests exist because Copilot is not implemented. | roadmap | Required before enabling any AI feature flag. | Copilot | deferred |
| TEST-004 | P2 | Deeplinks | Provider actions are browser-tested selectively, not from a typed city matrix. | browser tests | Test allowlisted providers, missing apps, unsupported cities and duplicate opens. | City/Copilot | open |
| OPS-001 | P2 | Release | Docs-only merges still invoke a production deployment. | deploy trigger on all `main` pushes | Add path-aware validation/deploy policy without bypassing runtime changes. | Stability | open |
| OPS-002 | P2 | Metadata | Cloudflare deployment/version IDs and active percentage are not captured in the standard artifact. | workflow | Persist deployment metadata and rollback state in a release manifest. | Stability | open |
| OPS-003 | P2 | Evidence | Evidence is retained for 14 days and not summarized into a machine-readable manifest. | workflows | Add manifest, checksums and test summary to each release artifact. | Stability | open |
| OPS-004 | P3 | Workflow naming | PR workflow remains named after Destination Resolution V2 although scope is broader. | `pr-validation.yml` | Rename after stability changes without losing historical clarity. | Stability | open |

## Phase 2 execution order

The stability branch should execute in this order:

1. **Truth before cleanup**
   - add data freshness status and stop presenting expired taxi values as current;
   - reconcile Cabify status;
   - add data validation tests.
2. **Security/privacy boundaries**
   - gate/remove `/api/whoami`;
   - restrict write CORS and telemetry route values;
   - introduce CSP report-only;
   - document/shorten session retention.
3. **PWA reliability**
   - scope cache deletion;
   - remove or validate residual `/api/estimate` behavior;
   - add offline/update tests.
4. **Proven dead-code consolidation**
   - navigator duplication;
   - mobility-engine duplication;
   - tracked `.env`;
   - generated evidence and residual Next surface.
5. **Release governance**
   - release manifest, metadata and path-aware deploy behavior.

## Deletion rule

No file is deleted solely because it appears unused. A removal requires all of:

- no imports or runtime references;
- no service-worker or asset references;
- no test/build dependency;
- no active workflow dependency;
- history inspected for unique behavior;
- replacement or archival decision documented;
- CI and browser gates green after removal.
