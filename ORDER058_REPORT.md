# ORDER058_REPORT

SOURCE_URL=https://www.argentina.gob.ar/noticias/el-servicio-diferencial-entre-once-haedo-moreno-de-la-linea-sarmiento-suma-servicios-los
SOURCE_AUTHORITY=Trenes Argentinos Operaciones / SOFSE
SOURCE_PUBLISHED_AT=2026-08-21
SOURCE_FETCHED_AT=2026-09-18T17:42:02.573Z
ACCESS=Public unauthenticated Argentina.gob.ar HTML; CC BY 4.0 unless otherwise declared by Argentina.gob.ar.
TEMPORAL_STATE=scheduled
REALTIME=NO

VOY does not claim realtime train position from this source.

## Service slice

STATIONS=Once; Haedo; Moreno
LINE=Sarmiento
BRANCH=Once-Haedo-Moreno diferencial
SERVICE_SCHEDULE=Weekdays. Once 18:35 / 07:50; Haedo 19:21 / 07:05; Moreno 19:56 / 06:29.
NEARBY_RADIUS=8000m
CACHE_TTL=300s

## Files changed

- src/worker.template.js
- public/index.html
- public/app.js
- tests/order058-train-radar.test.mjs
- ORDER058_REPORT.md

NEW_RUNTIME_DEPS=0

## Verification

TEST_RESULTS=npm test 176/176 PASS; ORDER058 focused 10/10 PASS; no skips.
BUILD_RESULT=PASS
PACKAGE_RESULT=PASS
WRANGLER_DRY_RUN=PASS
RUNTIME_AUDIT=PASS; npm audit --omit=dev --audit-level=high found 0 vulnerabilities.
BROWSER_RESULTS=Chrome PASS; Edge PASS; PWA manifest/icons/service-worker/offline reload PASS.

## Performance

ORDER058_BOUNDED_PERFORMANCE=PASS
OFFICIAL_SOURCE_FETCH_MS=196.83
CHROME_RADAR_UI_MS=2800.49
EDGE_RADAR_UI_MS=582.24
RADAR_REQUESTS_PER_ORIGIN=1
VISIBLE_STATIONS=1 in tested Once location; contract cap <=3
VISIBLE_MARKERS=1
MAP_TILES=9
POLLING=NONE

The legacy generic performance matrix showed variable cold-start measurements on this Windows host and was not used to redefine ORDER058 thresholds. The ORDER058-specific bounded-flow checks remained green.

## Failure mode

SOURCE_DOWN=Station geometry may remain available from the pinned official station catalog, but service becomes unknown and no schedule is invented.
STALE_SOURCE=Service temporal state becomes unknown; stale scheduled observations are not served as current.
MISSING_FIELDS=Parser fails closed with rail_source_contract_invalid.

## Known limitations

- This slice covers only the official scheduled Once-Haedo-Moreno differential Sarmiento service.
- It provides no train position, live ETA, delay, cancellation, or realtime movement.
- The source is published HTML rather than a documented realtime developer feed; source markup drift fails closed.
- Nearby is intentionally bounded to 8 km and at most three relevant SOFSE Sarmiento stations for this slice.
