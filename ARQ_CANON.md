# VOY — ARQ_CANON

## PROJECT / PURPOSE / REPO / LIVE
- PROJECT: VOY
- PURPOSE: MAP-FIRST / MOBILE-FIRST movilidad Argentina; truthful TrackerView; low-weight optional 3D.
- WORK/CANON: https://github.com/simondalmasso/VOY
- MIRROR ONLY: https://gitlab.com/simondalmasso/voy
- LIVE: https://voy-app.simondalmasso44.workers.dev/

## LAST_VERIFIED / BRANCH / HEAD
- LAST_VERIFIED: 2026-09-26 16:59 ART
- RECIBE: ARQ1
- CURRENT_ORDER: https://github.com/simondalmasso/VOY/issues/57
- ORDER075_BASE_HEAD: `dd7fc408b5b1fdc6032a27f524246d4a89febe13`
- LAST_RUNTIME_HEAD: `8a00f0e5bf6fffdbca423f7381540acf397b2fea`
- CREATE/USE: `feat/order075-mapfirst-trackerview`
- NEVER BASE PRODUCT WORK ON: `main`

## CANONICAL LINKS
- ORDER-075: https://github.com/simondalmasso/VOY/issues/57
- ORDER-074 superseded: https://github.com/simondalmasso/VOY/issues/54
- ORDER-073 RC: https://github.com/simondalmasso/VOY/issues/51
- TrackViewer: https://trackviewer.app/
- Tokyo temporal reference: https://tokyo-last-train.matodesign.workers.dev/
- CABA_OS: https://caba.os.nicopoore.com/
- GeoLibre reference: https://github.com/opengeos/GeoLibre
- OpenFreeMap: https://openfreemap.org/
- MapLibre: https://maplibre.org/maplibre-gl-js/docs/

## CURRENT STATE
- ONE ARQ only. CONTINUE/NO_RESET.
- #54 was closed as superseded because owner rejected the old yellow search-first UX; do not fix that obsolete hero.
- Diff from runtime `8a00f0e...` to base `dd7fc408...` is docs/mirror infrastructure only.
- Current app still contains the yellow “¿A dónde vas?” hero. Replace primary hierarchy.
- Existing tracker engine is already strict; do not rebuild it.
- Existing 3D is Three.js 0.186.0 lazy. Keep it.
- `current3DTransportEntities(){return []}`; production live vehicle rendering stays empty unless a documented authorized source is proven.
- Santa Fe: no live feed authorized. Sarmiento radar: scheduled/unknown only.
- 2D candidate: MapLibre + OpenFreeMap, accepted only after bounded spike. Existing OSM raster is mandatory fallback.
- GeoLibre v3.1 is reference-only; do not install the full GIS stack.
- GitLab mirrors automatically; never work there.

## DONE
- ORDER-072/073; do not repeat.
- Existing temporal fail-closed engine, lazy 3D, route rendering, context-loss/retry hardening.
- GitHub canonical mirror setup.
- Research triage is embedded in #57.

## ACTIVE WORK
- Execute ORDER-075 now.

## PENDING
- MAP-FIRST mobile shell.
- Search/origin relegated to compact secondary sheet/menu.
- Truth status pill + 2D/3D control.
- Bounded vector-map spike and fallback.
- TrackerView selection/focus/follow interfaces.
- Session-only observation trail and recent-time rail.
- Deterministic realtime fixtures; production no-live remains truthful.
- Final browser/perf/network evidence.

## BLOCKERS / RISKS
- No Santa Fe realtime source.
- External vector-map service availability.
- Map renderer/dependency size creep.
- Accidental scheduled-motion simulation.
- Overengineering via GIS/new backend.

## DO_NOT_TOUCH
- NO GitLab implementation.
- NO main product merge, deploy or prod probe.
- NO fake realtime.
- NO unverified third-party data source.
- NO GeoLibre whole-app dependency.
- NO deck.gl/Cesium/Google Photorealistic/React-R3F/custom 3D engine.
- NO DB/persistence/telemetry for trails.
- NO parallel ARQ lanes.

## AUTHORITIES / GATES
- Issue #57 is the exact spec.
- RED→GREEN→REFACTOR per task; fresh verification before completion claims.
- Map first viewport at 390x844: map/transport dominant, no giant hero, no horizontal overflow at 200%.
- Baseline 2D: Three/topology fetches=0.
- TrackerView idle/scrub/3D visual-only Worker-call delta=0.
- Scheduled/unknown/stale movement=0.
- Chrome desktop/mobile + real Edge desktop/mobile + reduced motion + WebGL/context loss.
- STOP=`CHECKPOINT_MAPFIRST_TRACKERVIEW_RC`; MERGE=NO; DEPLOY=NO.

## WHERE_TO_RESUME
1. Fetch GitHub.
2. Verify `dd7fc408...` exists and its runtime delta from `8a00f0e...` is only mirror/canon docs.
3. Create `feat/order075-mapfirst-trackerview` from exact `dd7fc408...`.
4. Read Issue #57 including latest AUD research annex.
5. Do not touch GitLab.

## WHAT_TO_DO_NOW
Start with RED browser/unit contracts for: map visible in first mobile viewport; yellow hero not primary; search secondary; truth-state pill visible; 2D baseline no Three fetch; scheduled state creates zero moving vehicle. Then implement the smallest new shell before the MapLibre/OpenFreeMap spike.

## WHAT_NOT_TO_REPEAT
ORDER-072/073; obsolete ORDER-074 hero fix; renderer/framework shopping; agent-stack research; mirror setup.

## ACCEPTANCE / STOP CONDITIONS
Stop only at `CHECKPOINT_MAPFIRST_TRACKERVIEW_RC` with Issue #57 terminal matrix fully evidenced at exact HEAD. If no authorized live source exists, report `LIVE_SOURCE_BLOCKED` while deterministic tracker fixtures pass. Do not merge/deploy.
