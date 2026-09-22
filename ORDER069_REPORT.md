# ORDER-069 — Stop hiding modes + MAP-FIRST

## Scope and base

- Work Item: #13
- BASE_HEAD: `3e386573102e184f45e7ded0466721f4eaaded7e`
- Feature branch: `feat/order-069-mode-facts-santa-fe`
- Functional verification HEAD: `de5f15b7411c7443fccf8d8aa01fe84d0f8ceea0`
- Draft MR: !7 -> `feat/order-058-voy-radar-f1-trains`
- Cloudflare deployment: **none**
- New runtime dependencies: **0**

## Official Santa Fe facts re-verified

Execution-time research used only public official municipal surfaces.

### Urban bus

Primary municipal transport surface:
- https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/

Tariff authority:
- Municipalidad de Santa Fe — Decreto 00048/2026
- https://transparencia.santafeciudad.gov.ar/normativa/decreto-00048-2026/
- decree date encoded in product source: 2026-05-15
- latest official municipal tariff redetermination found in the 2026 transparency index at execution time: Decreto 00048/2026
- automated direct extraction of the decree URL returned HTTP 403 during re-check, so currentness was established from the official municipal/transparency index search rather than by scraping protected content
- no newer municipal tariff decree superseding 00048/2026 was found as of 2026-09-22

Facts represented separately:
- Tarifa plena: **ARS 2,111.11**
- Boleto frecuente Santa Fe: **ARS 1,900.00**
- frequent eligibility is shown explicitly: registered SUBE, Santa Fe domicile, physical/digital prepaid SUBE conditions; other debit/credit/wallet/QR payment methods are not presented as eligible for that frequent fare
- fare freshness fails closed after the bounded verification window; stale fare state shows no amount

Temporal truth:
- `eta_state=not_integrated`
- `realtime_state=unavailable`
- no bus ETA field
- no live-position field
- no bus route geometry fabricated

Official handoffs:
- `Consultar cuándo pasa` -> municipal colectivos surface
- `Ver desvíos oficiales` -> https://santafeciudad.gov.ar/desvios/
- official deviations page re-check on 2026-09-22 surfaced an update dated 2026-09-21

## Contract change

Principle implemented: **missing fact != missing mode**.

Minimal per-mode states:
- `route_available`
- `price_state=known|unknown|not_applicable`
- `availability_state=available|partial|unavailable`

### A pie / Bici
Existing routed-foot and routed-bike behavior remains provider-grounded and independently selectable.

### Auto
- one additional existing-provider routing acquisition using `routed-car`
- same routing provider/coordinator/cache/rate/timeout path as existing routed modes
- route geometry + provider distance are actionable when available
- `price_state=unknown`
- `price=null`
- UI copy: `Precio no disponible`
- routing failure keeps Auto visible as unavailable while A pie/Bici survive
- no fuel/taxi/Uber/DiDi/rideshare price or ETA

### Colectivo Santa Fe
- always rendered for verified Santa Fe locality as `availability_state=partial`
- official fare facts/provenance can be shown independently from route/ETA/realtime
- official actions survive even when fare freshness fails closed

The old binary copy `No mostramos Auto, Colectivo porque falta recorrido o precio verificable.` is removed.

## Amendment A — MAP-FIRST

No map library/framework was added. The existing OSM raster renderer and existing SVG route geometry renderer are reused.

Final composition:
- initial map is visible immediately
- neutral initial Santa Fe map has **no fake current-position pin**
- compact destination/origin controls overlay the map
- desktop: map is dominant canvas; facts/radar/footer use an independently scrollable side panel
- mobile: map occupies ~50% of primary viewport; facts use an independently scrollable bottom panel
- scrolling facts does not move `window` or remove spatial context
- selecting Auto keeps route geometry visible on-map
- Colectivo fare/ETA-state/handoffs are reachable while map remains visible
- footer remains reachable inside the scrollable facts panel
- no horizontal overflow
- existing minimum 44 px interactive-target rule preserved

Tile guardrail:
- browser audit observed **9 tiles** before and after resolution in every tested viewport
- no continuous polling or country-wide marker preload added

## TDD / regression evidence

Fresh ORDER-069 tests cover:
1. routed-car success + price unknown
2. routed-car failure with walk/bike preserved
3. Santa Fe bus visible without live feed
4. current official fare provenance + eligibility
5. stale fare fails closed
6. official deviations / Cuándo Pasa actions
7. no fabricated ETA/live-position fields
8. old hide copy absent
9. walking/bicycle regressions
10. ORDER-058 train radar regressions
11. MAP-FIRST structure / no map framework

Final `r2_verify` on functional HEAD:
- pipeline: `2872775518`
- job: `16665006203`
- tests: **185/185 PASS**
- build: **PASS**
- package: **PASS** (`R2_PACKAGE=PASS`, 19 dist files)
- Wrangler: **dry-run only PASS**
- runtime audit: **0 vulnerabilities**
- `SOURCE_COMMIT=de5f15b7411c7443fccf8d8aa01fe84d0f8ceea0`
- `RELEASE_ID=order057-de5f15b7411c-9072801c`
- `BUILD_ID=9072801c615cecaa6672ab37`

The initial `npm ci` development-tree audit reports the repository's pre-existing 3 high-severity development dependency findings; the repository's governed audit gate and `npm audit --omit=dev --audit-level=high` both pass, with **0 runtime vulnerabilities**. No dependency was added by ORDER-069.

## Chrome + Edge browser evidence

Pipeline: `2872775518`
Job: `16665006204`
Result: **PASS**

Deterministic browser fixtures are used only at the HTTP test boundary. They test the built `dist/client` UI and do not replace the server-side routing/fare tests above.

### Chrome — desktop 1440x900
- map visible above fold: PASS
- map width: 833.38 / shell width 1340 (~62%)
- map height: 795.50 px
- neutral pin count: 0
- tile count: 9
- all four mode surfaces: A pie / Bici / Auto / Colectivo
- Auto route overlay: PASS
- Colectivo facts/actions: PASS
- train radar preserved: PASS
- horizontal overflow: none
- sub-44px tested interactive targets: 0
- console errors: 0
- screenshot SHA256: `f2df7d9fa7d9f35c4f9c132c0028fe56ad95589d0cab615881f815e2d2e4fcdc`

### Chrome — mobile 390x844
- map visible above fold: PASS
- map height: 421.66 px (~50% viewport)
- neutral pin count: 0
- tile count: 9
- planner scroll height/client height: 1321 / 358 px
- facts panel scroll preserves map: PASS
- all four mode surfaces reachable: PASS
- Auto route overlay: PASS
- Colectivo facts/actions: PASS
- train radar preserved: PASS
- horizontal overflow: none
- sub-44px tested interactive targets: 0
- console errors: 0
- screenshot SHA256: `a00e838c8db73685a963397099558a3e05b108a6888ef12cd3500ff047a68be2`

### Edge — desktop 1440x900
- PASS with same acceptance gates
- screenshot SHA256: `f2df7d9fa7d9f35c4f9c132c0028fe56ad95589d0cab615881f815e2d2e4fcdc`

### Edge — mobile 390x844
- PASS with same acceptance gates
- map height: 421.55 px
- planner scroll height/client height: 1321 / 358 px
- screenshot SHA256: `a00e838c8db73685a963397099558a3e05b108a6888ef12cd3500ff047a68be2`

Browser artifact paths:
- `order069/evidence/browser/chrome-desktop.png`
- `order069/evidence/browser/chrome-mobile.png`
- `order069/evidence/browser/edge-desktop.png`
- `order069/evidence/browser/edge-mobile.png`
- `order069/evidence/browser-report.json`

## Guardrails

- `CLOUDFLARE_DEPLOY_ATTEMPTS=0`
- no candidate deploy
- no production deploy
- no Wrangler publish
- no merge
- no runtime dependency
- no Laya/runtime model integration
- no hidden Cuándo Pasa endpoint calls
- no APK-derived key/token use

## Verification verdict before evidence-only commit

`PASS` for the functional candidate `de5f15b7411c7443fccf8d8aa01fe84d0f8ceea0`.

A final MR pipeline is required after this report-only commit so the GitLab HEAD itself also has fresh green CI.
