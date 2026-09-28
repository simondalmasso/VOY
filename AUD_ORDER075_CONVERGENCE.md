# VOY — ORDER-075 AUD CONVERGENCE

Date: 2026-09-27 ART
Authority: AUD
Canonical implementer: ARQ1

## Decision
The three-way experimental bakeoff is closed for architecture selection.
There is ONE canonical implementation lane only.

```text
CANONICAL_BASE=dd7fc408b5b1fdc6032a27f524246d4a89febe13
CANONICAL_BRANCH=feat/order075-mapfirst-trackerview
PRIMARY_PORT_SOURCE=6f882c3b7d712151c2354d95c518885d12729054
GLM_EVIDENCE_TIP=00e9718
MERGE=NO
DEPLOY=NO
```

## Why this source is the implementation baseline
GLM is the only alternate independently verified as an implementation on the actual VOY runtime tree with the existing Worker/PWA/temporal/3D authorities preserved.

Terminal evidence on BUILD_ID `c26d7cefe5ee2d15d0cce7b8`:
- 266/266 unit PASS;
- focused follow-drag 30/30;
- 10 complete Edge matrices x 10/10;
- post-build Edge 10/10;
- post-build Chrome 10/10;
- real Liberty style + PBF + glyph + attribution + pan/overlay PASS;
- reduced motion PASS;
- WebGL2-unavailable fallback PASS;
- live context-loss fallback PASS;
- Worker deltas 0 where required.

This is acceptance for selective canonical port, not permission to merge/deploy.

## Grokbot
Keep as ideas:
- map-first hierarchy;
- compact truth/status communication;
- secondary search + bottom sheet;
- explicit no-live state;
- follow/suspend/resume;
- bounded session trail + time rail;
- restrained dark HUD visual inspiration.

Reject as code:
- React/Vite/Tailwind rewrite;
- duplicated temporal engine;
- unsourced atlas/routes/service windows;
- single-file 3D transfer;
- always-on RAF;
- mock screenshots as acceptance evidence.

## Sonnet 5 High
Keep as ideas/tests:
- normalized tracker state reasoning;
- trail/fixture/follow/time-rail contracts;
- explicit fail-closed rule: if presentation says `render=false`, no vehicle-position marker may use raw coordinates;
- map-first/search-secondary interaction reasoning.

Reject as code:
- React/Vite replacement runtime;
- duplicated temporal authority;
- rewritten Three controller;
- single-file bundling;
- unproven POI coordinates;
- 32px sheet touch target and incomplete browser evidence.

## Canonical port contract
ARQ1 starts from exact base and ports the GLM source commit. No fourth design exercise.

Required invariants:
- MapLibre remains camera/gesture authority.
- >=8px pointer fallback only signals user drag intent and suspends follow; it never moves the camera.
- post-load vector tile hiccups are tolerated; initialization/style timeout/failure falls back to raster.
- facts/status may remain when an entity is non-renderable, but no vehicle-position marker is shown for `render=false`.
- tracker trail is source observations only; session bounded; no persistence.
- scrub/follow/pan/3D visual operations add zero VOY Worker calls.
- production Santa Fe stays no-live unless a separately authorized source is proven.

## Evidence reuse
The experimental evidence proves the port source. Canonical ARQ still runs fresh final verification at the canonical HEAD, especially after any canonical-only edit. Any runtime mutation after evidence invalidates relevant browser stability evidence.

## Stop condition
Stop at canonical RC with terminal matrix recorded. AUD reviews that RC. No merge/deploy before that review.
