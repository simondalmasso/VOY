# ORDER073_REPORT

## Checkpoint

- ORDER: 073
- Status: CHECKPOINT_RELEASE_CANDIDATE
- ORDER-071 source SHA: `9233f11ff50b329e5f81a2268627d510bc7fb90c`
- Exact GitHub mirror SHA: `9233f11ff50b329e5f81a2268627d510bc7fb90c`
- Work branch: `feat/order073-mapfirst-live3d`
- Tested product/CI HEAD: `64064ff32aa189943455c687c279b7ddf98c1e49`
- Successful RC workflow: Actions run `36094869505`
- Production deployment: none
- GitHub main mutation: none
- Merge: none

The commits after the tested HEAD only reduce CI cost for report-only changes and persist this report; they do not alter runtime product bytes.

## ORDER-072 compute gate

ORDER-072 completed before feature work. GitHub mirror identity is exact and GitHub-hosted compute is usable. The verified mirror tree remains the source lineage; GitHub `main` was not used as the base.

## TDD / tests

Two recorded RED -> GREEN cycles were used.

1. Tracker safety RED: 209 tests / 203 pass / 6 expected failures.
   Implemented timestamp-regression rejection, impossible-jump rejection, bounded geometry snapping, immutable raw observations with separate render state, predicted visual state, and reduced-motion behavior.
2. Product/render contract RED: 214 tests / 209 pass / 5 expected failures.
   Implemented raw source SHA provenance, quality tiers, distinct predicted/realtime renderer paths, explicit movement limits, reduced-motion wiring, and desktop map allocation.

Final RC Linux job: `214/214 PASS`.

## Tracker truth

Raw observations are never mutated. Derived render state contains render position, freshness, interpolation fraction, snap distance and observed-speed evidence.

Realtime movement requires:
- valid monotonic observation timestamps;
- freshness within 20 s;
- previous realtime observation;
- verified route geometry;
- adapter-explicit max speed (45 m/s in the current renderer);
- bounded geometry snapping (35 m);
- no timestamp regression or physically impossible jump.

`scheduled` and `unknown` never render moving vehicles. `predicted` is non-animated and uses a visually separate material from `realtime`. Reduced-motion disables interpolation.

## Authorized live-source decision

Research rechecked on 2026-09-25.

- Santa Fe official transport page documents Cuándo Pasa as the user handoff, but no documented public/reuse-authorized realtime API or GTFS-Realtime endpoint was found.
- No hidden Cuándo Pasa endpoint, app token, private API, MITM path or extracted credential was used.
- Rosario's official open-data surface reviewed for transport did not establish a reusable current vehicle-position endpoint for this slice.

Decision:
- `AUTHORIZED_LIVE_SOURCE_FOUND=NO`
- `LIVE_SOURCE_BLOCK=SANTA_FE_BUS`
- Current Santa Fe realtime vehicle set remains intentionally empty.
- Tracker engine is ready for a later authorized adapter without fabricating movement.

Official source checks:
- https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/
- https://datos.rosario.gob.ar/index.php/node/906

## Current Santa Fe fare truth

Reverified against Municipalidad de Santa Fe Decreto DMM 00048/2026 (15 May 2026):
- Tarifa plena: ARS 2,111.11.
- Boleto Frecuente Santa Fe: ARS 1,900.00.
- Frequent-fare eligibility requires a SUBE registered to the user, declared domicile in Santa Fe city, and payment through prepaid physical/digital SUBE; debit/credit cards, interoperable wallets and QR do not receive that attribute.

Source:
https://transparencia.santafeciudad.gov.ar/normativa/decreto-00048-2026/

## Geometry / provenance

- Geometry: frozen bounded OpenStreetMap-derived Santa Fe snapshot.
- License: ODbL-1.0.
- Runtime OSM/Overpass queries: 0.
- Raw source SHA256: `a4a07ee50e139e3c603deb04950ac31f704a2993c6cda30cb4e36bda7489cf80`.
- Logical topology chunk SHA256: `0c4a79f656fccd722de6cb20db504ebc09b2626b6d3caeccf2f78176788c75a2`.
- Initial chunks: 1.
- LRU max: 16.
- Height truth: PASS; generic/inferred heights are not represented as measured.

The build now computes and records the raw input SHA directly from the frozen source bytes.

## Renderer / UX

Renderer: `THREE_LAZY`, Three.js 0.186.0.

Quality tiers:
- Auto: conservative hardware/device heuristic.
- Rendimiento: DPR 1, antialias off.
- Calidad: DPR up to 1.5, antialias on.

Shadows remain off by default. Buildings remain batched, topology stays static/build-time, repeated transport glyphs use InstancedMesh, and 3D remains opt-in after explicit user activation.

Desktop app-shell map allocation is widened to `2.15fr / 340px` and mobile remains a 50svh map-first split with independently scrollable facts. Browser evidence reports no horizontal overflow.

## Browser / request evidence

Successful workflow: `36094869505`.

Chrome:
- executable: real Google Chrome on Ubuntu runner.
- desktop: PASS.
- mobile 390x844: PASS.
- 2D baseline 3D fetches: 0.
- 3D extra dynamic Worker calls: 0.
- initial topology chunks: 1.
- console errors: 0.

Microsoft Edge:
- executable: `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`.
- desktop: PASS.
- mobile emulation 390x844: PASS.
- 2D baseline 3D fetches: 0.
- 3D extra dynamic Worker calls: 0.
- initial topology chunks: 1.
- console errors: 0.

Deterministic Santa Fe journey request budget in both desktop/mobile browser fixtures:
1. `POST /api/origin/resolve`
2. `POST /api/destinations/suggest`
3. `POST /api/destinations/resolve`
4. `POST /api/mobility/compute`

Total dynamic Worker calls: 4.

ORDER-070 tests preserve:
- mobility DO requests: 1.
- DO storage row reads: 0.
- DO storage row writes: 0.
- Santa Fe train radar calls: 0.

## Performance evidence

First 3D activation compressed transfer:
- Chrome: 425,300 bytes gzip.
- Edge: 425,319 bytes gzip.
- Preferred <= 750 KB: PASS.

Chrome 1440x900:
- median FPS: 14.18.
- frame p95: 100.8 ms.
- observed JS heap: 7.18 MiB.
- runner GPU counter: 366 cumulative draw calls, 6,344 triangles.
- preferred desktop >=50 FPS / <=25 ms: MISS on headless/software-WebGL runner.
- raw minimal WebGL control remained about 60 FPS, confirming runner/scene path cost is material and the miss is not hidden.

Edge 1440x900:
- median FPS: 29.54.
- frame p95: 42.4 ms.
- observed JS heap: 8.02 MiB.
- runner GPU counter: 366 cumulative draw calls, 6,344 triangles.
- preferred desktop >=50 FPS / <=25 ms: MISS.

Chrome 390x844:
- median FPS: 52.08.
- frame p95: 23.2 ms.
- preferred mobile >=30 FPS: PASS.

Edge 390x844:
- median FPS: 64.10.
- frame p95: 16.3 ms.
- preferred mobile >=30 FPS: PASS.

No performance number is normalized into a false PASS.

## Mode facts / PWA / accessibility / privacy

Browser evidence preserves:
- A pie.
- Bici.
- Auto with route while price remains explicitly unavailable.
- Colectivo with official fare provenance.
- Cuándo Pasa not integrated as realtime.
- official desvíos handoff.
- selected route geometry.
- trip state across 3D -> 2D.
- WebGL2-disabled fallback to normal 2D.
- map visible immediately desktop/mobile.
- no horizontal overflow.

Unit suite preserves PWA/offline/cache contracts, 44px interaction targets, DOM-readable facts, and reduced-motion behavior.

Privacy/runtime:
- no new analytics vendor;
- no raw-query logging;
- no exact-coordinate persistence added;
- no runtime Overpass/Firecrawl;
- no live-source secrets.

## Build / package / release gate

RC run `36094869505`:
- tests: PASS (214/214).
- build: PASS.
- package: PASS (25 client files).
- raw geometry provenance: PASS.
- deterministic topology: PASS.
- runtime forbidden-source audit: PASS.
- Wrangler dry-run: PASS.
- npm runtime dependency audit: PASS.
- Chrome desktop/mobile: PASS.
- real Edge desktop/mobile: PASS.
- artifacts: uploaded.

Artifacts:
- `order073-linux-evidence` — id `10847171079`.
- `order073-chrome-evidence` — id `10846449947`.
- `order073-edge-evidence` — id `10847291733`.

## Release decision

`CHECKPOINT_RELEASE_CANDIDATE`

The checkpoint is eligible because migration identity, compute, tests, build/package, dry-run, runtime audit, map-first browser behavior, 2D fallback, truthful temporal behavior, request budget, provenance and cross-browser evidence pass. The authorized Santa Fe realtime source remains blocked, so no vehicle movement is fabricated. Desktop runner FPS remains below the preferred target and is explicitly carried forward as optimization evidence rather than misreported as green.
