# VOY — AUD_CANON

## PROJECT / PURPOSE / REPO / LIVE
- PROJECT: VOY
- PURPOSE: movilidad MAP-FIRST / MOBILE-FIRST para Argentina; TrackerView temporal verificable; 3D liviano; cero realtime fabricado.
- CANON / WORK REPO: https://github.com/simondalmasso/VOY
- DOWNSTREAM MIRROR ONLY: https://gitlab.com/simondalmasso/voy
- LIVE: https://voy-app.simondalmasso44.workers.dev/

## LAST_VERIFIED / BRANCH / HEAD
- LAST_VERIFIED: 2026-09-26 16:59 ART
- CURRENT_ORDER: ORDER-075 / Issue #57
- ORDER075_BASE_HEAD: `dd7fc408b5b1fdc6032a27f524246d4a89febe13`
- LAST_RUNTIME_HEAD: `8a00f0e5bf6fffdbca423f7381540acf397b2fea`
- EXPECTED_WORK_BRANCH: `feat/order075-mapfirst-trackerview`
- GITHUB_MAIN: `1ac1c691487cf9c542fd1db9d08c0ccadfe89f13`

## CANONICAL LINKS
- Active order: https://github.com/simondalmasso/VOY/issues/57
- Superseded hardening order: https://github.com/simondalmasso/VOY/issues/54
- ORDER-073 RC: https://github.com/simondalmasso/VOY/issues/51
- Mirror workflow: https://github.com/simondalmasso/VOY/actions/workflows/mirror-gitlab.yml
- GitLab legacy main anchor: `legacy/gitlab-main-pre-github-canon-20260926`

## CURRENT STATE
- ONE ARQ only: ARQ1.
- ORDER-074 is superseded, NOT passed; useful hardening gates transfer to ORDER-075.
- Exact diff `8a00f0e... -> dd7fc408...` contains only mirror workflow + AUD/ARQ canon docs; no runtime bytes changed.
- Current UX still has the rejected yellow search-first hero; ORDER-075 replaces it with map-first mobile UX.
- Current production 3D transport feed is empty: `current3DTransportEntities(){return []}`.
- Existing temporal engine fails closed for scheduled/unknown/stale and only permits realtime interpolation with fresh observations + verified geometry.
- Rail production radar remains Sarmiento scheduled/unknown; `rail_realtime=false`.
- Santa Fe bus realtime remains blocked: no documented reusable authorized feed proven.
- Preferred bounded 2D candidate: MapLibre GL JS + OpenFreeMap public vector tiles; existing OSM raster remains fallback.
- Existing Three.js 0.186.0 remains explicit lazy 3D.
- GeoLibre v3.1 is reference-only. High-value patterns: bounded GTFS-RT normalization, Time Slider semantics, MapLibre/OpenFreeMap, lazy plugin loading.
- GitHub→GitLab mirror is automatic; no duplicate GitLab work.

## DONE
- ORDER-072 source/compute migration.
- ORDER-073 map-first/tracker/low-weight-3D RC.
- ORDER-074 runtime hardening work already landed at `8a00f0e...`.
- GitHub canonical authority + autonomous GitLab mirror.
- Reference triage for TrackViewer, Tokyo Last Train, CABA_OS, GeoLibre v3.1, InkWave and broader map/3D list.

## ACTIVE WORK
- ORDER-075: rebuild primary UX as MAP-FIRST / MOBILE-FIRST and expose truthful TrackerView + temporal inspection.
- ARQ1 has not yet created the ORDER-075 branch at this verification point.

## PENDING
- Create `feat/order075-mapfirst-trackerview` from exact `dd7fc408...`.
- Remove yellow search hero from primary hierarchy.
- Ship dominant map first viewport and secondary search/origin sheet/menu.
- Run bounded MapLibre/OpenFreeMap spike; accept only if size/perf/fallback gates pass.
- Implement truthful status pill, TrackerView focus/follow contract, session observation trail and time rail using fixtures until an authorized Argentina realtime source exists.
- Preserve lazy Three 3D and transferred ORDER-074 hardening/a11y/PWA gates.
- Browser/perf/request-budget evidence; stop at RC. No merge/deploy.

## BLOCKERS / RISKS
- No authorized Santa Fe realtime vehicle feed.
- MapLibre/OpenFreeMap must remain a bounded candidate, not become a GIS rewrite.
- Public map service is external/as-is; raster fallback is mandatory.
- Third-party references are clean-room/public-source research only.
- Desktop software-WebGL FPS remains known debt; do not hide it.

## DO_NOT_TOUCH
- No development in GitLab.
- No main product/runtime merge.
- No Cloudflare deploy/prod probes.
- No fake live vehicles from schedules.
- No deck.gl/Cesium/GeoLibre/React-R3F framework import for this order.
- No unverified third-party data source.
- No D1/R2/KV/DO/telemetry added for TrackerView history.
- Do not delete GitLab legacy-main anchor or mirror configuration.

## AUTHORITIES / GATES
- Implementation authority: GitHub Issue #57 + exact feature branch based on `dd7fc408...`.
- AUD owns release/promotion decision.
- GitHub is repository truth; GitLab mirrors automatically.
- Product truth contract: `realtime|predicted|scheduled|unknown`; scheduled/unknown/stale movement=0.
- Cost gate: TrackerView idle/scrub and 3D visuals add 0 VOY Worker calls; no persistence writes; baseline 2D loads 0 Three assets.
- Browser gate: Chrome + real Edge, desktop/mobile, 390x844, 200% text, reduced motion, WebGL/context-loss fallback.
- Stop at `CHECKPOINT_MAPFIRST_TRACKERVIEW_RC`; MERGE=NO, DEPLOY=NO.

## NEXT EXACT ACTION
ARQ1: read Issue #57 fully, create `feat/order075-mapfirst-trackerview` from `dd7fc408b5b1fdc6032a27f524246d4a89febe13`, write RED tests for the new mobile MAP-FIRST first viewport, then execute the issue sequentially without waiting for another order.
