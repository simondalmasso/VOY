# VOY — ARQ_CANON

## AUTHORITY
- ROLE: ARQ1 — sole canonical implementation owner.
- ORDER: https://github.com/simondalmasso/VOY/issues/57
- BASE EXACT: `dd7fc408b5b1fdc6032a27f524246d4a89febe13`
- WORK BRANCH: `feat/order075-mapfirst-trackerview`
- CURRENT HEAD: `5ca22b7f7b7625aa1c52f0b9f81074c126a91afe`
- CONVERGENCE: `AUD_ORDER075_CONVERGENCE.md`
- AUDITED GLM REFERENCE SOURCE: `6f882c3b7d712151c2354d95c518885d12729054`

## STATUS
`ARQ_HOLD=RELEASED`
`BRANCH_ALREADY_EXISTS=YES`
`NO_RESET=YES`
`CONTINUE_EXISTING_BRANCH=YES`

The branch was created from the exact frozen base and already contains seven coherent TDD commits. Do not recreate it and do not reset it to the GLM branch.

## CURRENT CANONICAL WORK
Already committed:
1. unit TDD branch gate;
2. network/lazy-load RED contracts;
3. map-first shell RED contracts;
4. tracker temporal RED contracts;
5. normalized tracker observations;
6. bounded session tracker store;
7. opt-in deterministic tracker fixtures.

Fresh GitHub unit gate at current HEAD:
```text
TOTAL=266
PASS=250
FAIL=16
```

This RED state is expected for an incomplete TDD port. The failures are not permission to weaken tests.

## MISSING GREEN SURFACES
Use audited GLM source `6f882c3...` as the reference implementation for the remaining behavior:
- add bounded `public/map/substrate.js`;
- rebuild primary shell MAP-FIRST/mobile-first;
- search/origin secondary in bottom/side sheet;
- visible truth pill + tracker facts/follow/time rail;
- wire tracker store into `public/app.js`;
- pinned MapLibre 6.11.2 + OpenFreeMap Liberty async upgrade;
- existing OSM raster fallback;
- CSP/runtime-config/SW/build wiring for map/tracker assets;
- >=8px pointer drag-intent fallback that only suspends follow;
- reuse existing temporal authority and existing lazy Three 0.186.0 path;
- preserve planner behavior.

## IMPORTANT MERGE RULE
Do not blindly cherry-pick `6f882c3...` now because canonical tracker/tests already diverged deliberately through RED→GREEN commits. Port missing pieces selectively and compare semantics against the audited source.

If an overlapping tracker implementation differs:
- canonical RED tests are the contract;
- existing `public/3d/temporal.js` remains truth authority;
- take a GLM change only when it closes a required invariant without weakening existing behavior.

## FINAL INVARIANTS
- `render=false` => no vehicle-position marker; facts/status may remain.
- scheduled/unknown/stale/rejected/missing-geometry vehicle movement/render=0.
- source-observation-only trail; bounded session; no persistence.
- scrub/follow/pan/3D visual Worker-call delta=0.
- MapLibre remains camera/gesture authority.
- >=8px pointer fallback never moves camera.
- post-load vector tile errors are tolerated; fatal init/style/timeout falls back raster.
- 2D baseline Three/topology fetches=0.
- Santa Fe production remains explicit no-live.

## VERIFICATION BEFORE RC
After GREEN source work:
1. full unit suite;
2. build at exact HEAD;
3. 30/30 physical follow-drag;
4. 10/10 final browser stability;
5. Chrome desktop/mobile;
6. real Edge desktop/mobile;
7. 100/150/200% text;
8. reduced motion;
9. WebGL2 unavailable;
10. live context loss;
11. real OpenFreeMap happy path + raster fallback;
12. Worker request deltas;
13. no fake live/persistence/new backend.

## STOP
Stop only at `CHECKPOINT_MAPFIRST_TRACKERVIEW_RC`.
MERGE=NO
DEPLOY=NO
PROD_PROBE=NO
