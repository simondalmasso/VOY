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
- TERMINAL_CONVERGENCE_COMMIT: `62526ae75f551bc359311c0c911c1d9ad5b42a51`

## RECOVERY / BAKEOFF
`RECOVERY=COMPLETE`
`BAKEOFF=CONVERGED`

- Grokbot #58: AUD_PARTIAL / design reference only.
- Sonnet #60: AUD_PARTIAL / logic+UX/test reference only.
- GLM #59: AUD_ACCEPTED_FOR_CONVERGENCE.
- #58/#59/#60 are closed completed; #57 remains the sole active canonical order.

GLM durable authority:
- audited source: `6f882c3b7d712151c2354d95c518885d12729054`
- evidence/report tip: `00e97187da9127e6d406887b91276ed60b9b5f1d`
- BUILD_ID: `c26d7cefe5ee2d15d0cce7b8`
- final ZIP SHA256: `f0216b67468ba7a380f3db90c6e2b358349234bf10d9b2936693210771769937`

Terminal GLM evidence includes 266/266 units, follow-drag 30/30, ten full Edge matrices x10/10, post-build Edge 10/10, post-build Chrome 10/10, real OpenFreeMap path, reduced motion, WebGL2 unavailable and live context-loss PASS.

## CANONICAL ARQ REALITY — RECONCILED AFTER CONCURRENT START
ARQ1 already created the canonical branch before terminal AUD convergence completed:

```text
BRANCH=feat/order075-mapfirst-trackerview
CURRENT_HEAD=5ca22b7f7b7625aa1c52f0b9f81074c126a91afe
BASE_EXACT=dd7fc408b5b1fdc6032a27f524246d4a89febe13
AHEAD_BY=7
BEHIND_BY=0
```

This is valid in-flight TDD work and MUST NOT be reset or replaced.

Current canonical delta contains:
- ORDER-075 unit TDD workflow gate;
- RED network/shell/tracker contracts;
- normalized tracker observations;
- bounded session tracker store;
- opt-in deterministic tracker fixtures.

Current CI at HEAD:
```text
TESTS=266
PASS=250
FAIL=16
CLASSIFICATION=EXPECTED_RED_TDD / IMPLEMENTATION_INCOMPLETE
```

The 16 failures identify missing convergence surfaces, chiefly:
- `public/map/substrate.js`;
- MAP-FIRST shell / secondary search / truth pill / tracker sheet;
- rail/follow wiring in `app.js`;
- OpenFreeMap CSP + SW cache wiring;
- raster/vector fallback and map marker/a11y contracts.

## ARQ CONTINUATION RULE
NO RESET. Do NOT recreate the branch. Do NOT blindly cherry-pick the whole GLM source commit over the seven canonical commits.

ARQ1 continues from `5ca22b7...` and uses `6f882c3...` as the audited implementation reference for the missing GREEN work. Preserve the canonical RED tests and already-implemented tracker modules unless a concrete diff/test proves a correction is required.

The target is semantic convergence with the audited source/invariants, not commit-identity convergence.

## DO NOT TOUCH
- no GitLab implementation;
- no main merge/deploy/prod probe;
- no fake realtime;
- no new backend/database/persistence/telemetry;
- no React/R3F/Cesium/deck.gl/GeoLibre whole-app rewrite;
- no duplicate temporal authority or 3D engine;
- no fourth architecture lane;
- no reset/rebase-away of canonical ARQ work.

## NEXT EXACT ACTION
ARQ1: continue existing `feat/order075-mapfirst-trackerview@5ca22b7...`; GREEN the 16 currently failing ORDER-075 contracts by selectively porting the missing audited GLM surfaces, then run fresh canonical build/browser/runtime evidence at final exact HEAD. Stop at `CHECKPOINT_MAPFIRST_TRACKERVIEW_RC`. MERGE=NO. DEPLOY=NO.
