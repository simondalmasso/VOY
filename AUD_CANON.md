# VOY — AUD_CANON

## AUTHORITY
- PROJECT: VOY
- CANON: https://github.com/simondalmasso/VOY
- MIRROR ONLY: https://gitlab.com/simondalmasso/voy
- LIVE: https://voy-app.simondalmasso44.workers.dev/
- CURRENT_ORDER: ORDER-075 / Issue #57
- ORDER075_BASE_HEAD: `dd7fc408b5b1fdc6032a27f524246d4a89febe13`
- LAST_RUNTIME_HEAD_BEFORE_ORDER075: `8a00f0e5bf6fffdbca423f7381540acf397b2fea`
- RECOVERY_COMMIT: `6bc18b2f3bf406e0b102cefd7ef224ff8a3ce6a6`

## RECOVERY STATUS
The prior AUD corruption is recovered without history rewrite.
Deleted CANON/mirror surfaces were restored and the bakeoff was reconstructed from GitHub + the recovered chat + supplied artifacts.
See `AUD_RECOVERY_ORDER075.md`.

## BAKEOFF TERMINAL STATE
- Grokbot #58: `AUD_PARTIAL`. High design signal; standalone React/Vite rewrite and evidence/temporal/lazy-3D issues make source non-portable as-is.
- Sonnet #60: `AUD_PARTIAL`. High design / medium-high logic signal; standalone React/Vite rewrite, duplicate temporal/3D authority and fail-closed 2D marker defect make source non-portable as-is.
- GLM #59: `AUD_ACCEPTED_FOR_CONVERGENCE`.

GLM durable GitHub layers:
- audited source commit: `6f882c3b7d712151c2354d95c518885d12729054`
- terminal evidence/report tip: `00e9718`
- source tree local audit identity: `62bb5c284335579f55f28e913aace67dc16c33ad`
- BUILD_ID: `c26d7cefe5ee2d15d0cce7b8`
- final ZIP SHA256: `f0216b67468ba7a380f3db90c6e2b358349234bf10d9b2936693210771769937`
- final ZIP files: 152; traversal=0; forbidden .git/node_modules/dist=0; CRC bad=None.

## GLM FRESH EVIDENCE
- units: 266/266 PASS.
- build.ps1: SOURCE_COMMIT=62bb5c2..., BUILD_ID=c26d7cef..., CLIENT_FILES=34.
- focused follow/physical-drag stability: 30/30 consecutive PASS.
- full Edge browser matrix: 10 consecutive complete runs, each 10/10 PASS.
- Edge post-build matrix: 10/10 PASS.
- Chrome post-build matrix: 10/10 PASS.
- real OpenFreeMap Liberty/PBF/glyph/attribution/pan/overlay smoke: PASS; Worker delta=0.
- reduced motion: PASS.
- WebGL2 unavailable -> raster/useful 2D: PASS.
- live WEBGL_lose_context -> useful 2D, facts preserved: PASS.
- final tracked runtime/source diff after build: empty.

The initial WebGL2-unavailable failure was a test-harness false negative: it waited for the already-selected 2D button instead of the async fallback status. Corrected audit harness proved the runtime path without runtime mutation.

## CONVERGENCE
The bakeoff is closed. ONE convergence order is now authoritative:
`AUD_ORDER075_CONVERGENCE.md`

ARQ1 is released from HOLD.

## DO NOT TOUCH
- no GitLab implementation;
- no main merge/deploy/prod probe;
- no fake realtime;
- no new backend/database/persistence/telemetry;
- no React/R3F/Cesium/deck.gl/GeoLibre whole-app rewrite;
- no duplicate temporal authority or 3D engine;
- no fourth architecture lane.

## NEXT EXACT ACTION
ARQ1: create `feat/order075-mapfirst-trackerview` from exact `dd7fc408...`, read `AUD_ORDER075_CONVERGENCE.md`, port the audited GLM source commit `6f882c3...` as the implementation baseline, then verify the canonical RC. MERGE=NO. DEPLOY=NO.
