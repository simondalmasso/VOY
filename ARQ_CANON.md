# VOY — ARQ_CANON

## AUTHORITY
- ROLE: ARQ1 — sole canonical implementation owner.
- ORDER: https://github.com/simondalmasso/VOY/issues/57
- BASE EXACT: `dd7fc408b5b1fdc6032a27f524246d4a89febe13`
- CREATE/USE: `feat/order075-mapfirst-trackerview`
- NEVER BASE PRODUCT WORK ON: `main`
- CONVERGENCE: `AUD_ORDER075_CONVERGENCE.md`

## HOLD STATUS
`ARQ_HOLD=RELEASED`

The experimental bakeoff is complete enough for convergence.
Do not start a new architecture. Do not replay ORDER-072/073/074.

## AUDITED IMPLEMENTATION BASELINE
GLM source commit:
`6f882c3b7d712151c2354d95c518885d12729054`

Evidence/report commit on the lab branch:
`00e9718`

The source commit is exactly one commit above `dd7fc408...` and contains the real VOY-tree implementation. Use that source commit for canonical porting; the evidence tip is evidence, not the build base.

## REQUIRED CANONICAL DIRECTION
Preserve:
- existing VOY Worker/planner/PWA plumbing;
- `public/3d/temporal.js` as temporal authority;
- `public/3d/voy3d.js` / Three.js 0.186.0 as lazy 3D authority;
- fail-closed vehicle movement/render semantics;
- Santa Fe explicit no-live until an authorized reusable realtime feed exists.

Port from the audited GLM source:
- MAP-FIRST/mobile-first shell;
- search as secondary sheet/chip;
- bounded MapLibre 6.11.2 + OpenFreeMap async vector upgrade;
- existing OSM raster fallback;
- tracker observation/store/fixture modules;
- source-only bounded session trail;
- zero-fetch recent-time rail;
- follow/suspend/resume;
- >=8 px early pointer-drag intent fail-safe that only suspends follow;
- 2D default / lazy existing 3D;
- ORDER-075 tests/build updates.

## GROKBOT / SONNET SALVAGE
Use as design/test references only; do not import their framework apps.
The strong ideas (compact truth pill, secondary search, bottom sheet, no-live state, follow, bounded trail, time rail, deterministic fixtures) are already represented in the accepted baseline.

Do not port:
- React/Vite/Tailwind replacement architecture;
- duplicated temporal engines;
- replacement Three renderer;
- single-file lazy-3D bundling;
- unsourced atlas/routes/POIs;
- always-on 2D RAF;
- raw observation markers when `render=false`.

## EXECUTION
1. Fetch GitHub.
2. Verify `feat/order075-mapfirst-trackerview` does not already contain unrelated work.
3. Create it from exact `dd7fc408...`.
4. Port/cherry-pick the audited source commit `6f882c3...`.
5. Resolve only canonical metadata/branch identity; do not redesign.
6. Run fresh unit/build verification.
7. Run final browser/network/a11y/runtime gates against canonical exact HEAD.
8. Stop at `CHECKPOINT_MAPFIRST_TRACKERVIEW_RC`.

## FINAL GATES
- units all green;
- MAP-FIRST 390x844; search secondary; 200% no horizontal overflow;
- scheduled/unknown/stale/rejected/missing-geometry vehicle movement/render = 0;
- follow physical drag suspends and explicit resume restores;
- baseline 2D Three/topology fetches=0;
- tracker/pan/scrub/3D visual Worker-call delta=0;
- Chrome + real Edge desktop/mobile;
- reduced motion;
- WebGL2 unavailable fallback;
- live context-loss fallback;
- real OpenFreeMap path + raster fallback;
- no fake live, persistence, telemetry or new backend.

## STOP
MERGE=NO
DEPLOY=NO
PROD_PROBE=NO
