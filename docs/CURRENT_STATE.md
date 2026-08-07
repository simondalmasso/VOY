# VOY — Current canonical state

Last reconciled: 2026-08-07

## Authority and milestone

```text
CANONICAL_STATE=GOOGLE_DRIVE
REPOSITORY_WORKLOG=docs/CURRENT_STATE.md
RUNTIME_TRUTH=VERIFIED_PRODUCTION_AND_CLOUDFLARE_EFFECTIVE_STATE
MILESTONE=ISSUE32_TERMINAL_CLOSED_ISSUE34_GATE0_OPEN
AUD_HOTFIX_PASS=5215747741
ARQ_HOTFIX_AUTHORIZATION=5215826191
AUD_POST_MERGE_CONTINUE=5216723345
HOTFIX_ISSUE=32;CLOSED_COMPLETED
HOTFIX_PR=33;MERGED
HOTFIX_EXACT_HEAD=403ad4fc96f0b7138151f6267b996cd900f752c2
HOTFIX_MERGE_SHA=8c16e8c0617dc44d9fd22cd557d47fa8542818ab
POST_MERGE_TEST_FIX_PR=35;MERGED
POST_MERGE_TEST_FIX_HEAD=7ecd9328299051b703b15c3375cde34f5ccbace4
POST_MERGE_TEST_FIX_MERGE=a4e6c62bdd901d2c7fdaf2d26c01e5d45dbf9c13
RELEASE_STATUS=PRODUCTIVE_HOTFIX_VALIDATED_AND_RECONCILED
ISSUE32_CLOSE=COMPLETE
ISSUE34_GATE0=PASS
ISSUE34_RUNTIME_STARTED=NO
```

AUD `5215747741` passed only the exact hotfix source/candidate pair. ARQ authorization `5215826191` then allowed the exact production promotion, complete runtime validation and merge. A later documentation-only reconciliation exposed one nondeterministic Playwright actionability race; AUD `5216723345` independently classified it as `TEST_HARNESS_ACTIONABILITY_RACE`, with no demonstrated product regression, and authorized a test-only correction plus terminal Issue #32 closure and continuous Issue #34 Phases 1→4 through a zero-traffic candidate.

## Effective Cloudflare / production state

```text
APPLICATION_VERSION=V8.0.0
BUILD_HASH=403ad4f
PRODUCTIVE_SOURCE_SHA=403ad4fc96f0b7138151f6267b996cd900f752c2
PRODUCTIVE_VERSION_ID=2f86d708-b905-4c33-b1fe-d881467e8542
PRODUCTIVE_TRAFFIC=100%
PRODUCTIVE_DEPLOYMENT_ID=85d4cbbe-6b89-4e1d-970f-55aff458d760
PREVIOUS_VERSION_ID=2ee28f09-1aa8-4250-bb2c-ba4684a07791
PREVIOUS_VERSION_TRAFFIC=0%
PREVIOUS_KNOWN_HEALTH=V8.0.0/1f1e1d3
ROLLBACK_EXECUTED=NO
```

Fresh post-test-fix main validation `31176350830` observed production read-only and persisted `production-health.json` with `ok=true`, `version=V8.0.0`, `build_hash=403ad4f`. No deployment or traffic mutation occurred for the test-only correction.

The previous V8 version `2ee28f09-1aa8-4250-bb2c-ba4684a07791` is retained as the immediate rollback reference for this hotfix, but this record is not authorization to roll back. Any future production mutation requires fresh state reconstruction and applicable ARQ/AUD authorization.

## Productive validation evidence

```text
PRODUCTION_CLOSE_RUN=31170176391;SUCCESS
PRODUCTION_CLOSE_JOB=92840021210;SUCCESS
PREFLIGHT_SOURCE_TRAFFIC_BINDINGS_HEALTH=PASS
PREWRITE_REAL_MAP_PIXEL_PROOF=6/6_PASS
PRODUCTION_CONVERGENCE=20_CONSECUTIVE_PASS
PRODUCTION_CONVERGENCE_ELAPSED_MS=177786
PRODUCTION_CONVERGENCE_FINAL_ROUND=25
PRODUCTION_BROWSER=53_PASS;13_SKIP
PRODUCTION_API_GATE=PASS
PRODUCTION_VOICE_GATE=PASS
RETIRED_PUBLIC_ROUTES=9/9_PASS_410
AUTH_SAFE_DISABLED=PASS
ROOT_CSP_COOKIE_GATE=PASS
PWA_PRIVACY_SECURITY=PASS
PROVIDER_TRUTH_UBER_DIDI_PRICE=NULL
PROVIDER_TRUTH_UBER_DIDI_ETA=NULL
NUMERICAL_PRIVATE_APP_RANKING=UNAVAILABLE
PRODUCTION_MAP_REAL_NETWORK=PASS
PRODUCTION_MAP_PIXEL_PROOF=6/6_PASS
PRODUCTION_MAP_VISUAL_INSPECTION=6/6_PASS
BASEMAP_VISIBLE=YES
ROUTE_VISIBLE=YES
ORIGIN_MARKER_VISIBLE=YES
DESTINATION_MARKER_VISIBLE=YES
```

The six direct-production pixel/visual proofs cover 360x780, 360x800, 390x844, 412x915, 430x932 and desktop 1280x800. Each immutable PNG was independently inspected after the run and visibly contains CARTO/OSM basemap detail, the verified route geometry and both endpoint markers.

## Production evidence artifact

```text
ARTIFACT_ID=8990786623
ARTIFACT_NAME=voy-hotfix32-production-close-31170176391
ARTIFACT_SHA256=00354ef5dbe23d3eb642726bbd8938a07e38be675b7aac4803e465f08d572313
ORIGINAL_MANIFEST_SHA256=2a4403d2bf40f34adb269d2c0b98d32768f886b42ba47bbd83017f84d2950d89
ORIGINAL_MANIFEST_ENTRIES=108
UPLOAD_ARTIFACT_PRESENT_FILES=106
NORMALIZED_PRESENT_FILE_VERIFY=106/106_PASS
NORMALIZED_ARTIFACT_MANIFEST_SHA256=2d94b03aeb568e07895ff366cc79b879aa149b0c5bf32df1700d7eb49295e09c
PACKAGING_RECONCILIATION_CHECKPOINT=5215964644
```

The original run manifest listed two hidden Playwright metadata files (`preflight-map-output/.last-run.json` and `production-browser-output/.last-run.json`). `actions/upload-artifact` was configured with `include-hidden-files:false`, so those two runner metadata files are absent from the immutable ZIP. All 106 files actually uploaded and referenced by the manifest independently hash-verify. No runtime state, test result, screenshot, pixel proof, API/Voice evidence, rollback evidence or causal-error evidence is missing. The ZIP digest exactly matches GitHub artifact metadata.

## Post-merge harness correction evidence

```text
FAILED_RECONCILIATION_RUN=31171227117;FAIL
FAILURE_CLASS=TEST_HARNESS_ACTIONABILITY_RACE
PRODUCT_RUNTIME_REGRESSION_DEMONSTRATED=NO
AUD_DISPOSITION=5216723345;PASS_TO_CONTINUE
TEST_FIX_PR=35
TEST_FIX_HEAD=7ecd9328299051b703b15c3375cde34f5ccbace4
TEST_FIX_MERGE=a4e6c62bdd901d2c7fdaf2d26c01e5d45dbf9c13
TEST_FIX_PR_VALIDATION=31176176432;SUCCESS
TEST_FIX_PR_RELEASE_POLICY=31176176262;SUCCESS
TEST_FIX_POST_MERGE_MAIN_VALIDATION=31176350830;SUCCESS
TEST_FIX_POST_MERGE_RELEASE_POLICY=31176351184;SUCCESS
TEST_FIX_MAIN_ARTIFACT_ID=8993028861
TEST_FIX_MAIN_ARTIFACT_SHA256=962546367aff8d77a8c22d257ee6a96a49f46ba3f05745285c66e24a8f43cbf9
FRESH_PRODUCTION_HEALTH=V8.0.0/403ad4f;PASS
PRODUCTION_MUTATION=NO
```

The stale-origin test no longer uses a 400 ms/500 ms wall-clock race. It holds first and second mocked geocode responses behind explicit test-controlled gates, releases the second response only after the second click has reached the request, asserts `Segundo` wins, then releases/settles the first request and proves it cannot overwrite the latest choice. `OriginControl.svelte`, runtime code, Worker configuration, workflows and Cloudflare traffic were not changed by this correction.

## Observability classification

```text
OBSERVABILITY=DEGRADED_NO_EVENTS
EXACT_VERSION_TAIL_EVENTS=0
NON_OK_TAIL_OUTCOMES=0
TAIL_EXCEPTIONS=0
EMPTY_TAIL_IS_RUNTIME_FAILURE=NO
```

The accepted AUD classification remains in force: a genuinely empty exact-version tail is recorded as degraded observability rather than fabricated runtime failure when direct runtime/browser gates pass and no non-OK outcome or exception is captured. The productive hotfix met those compensating gates.

## GitHub reconciliation

```text
PR33_EXACT_HEAD=403ad4fc96f0b7138151f6267b996cd900f752c2
PR33_MERGED=YES
PR33_MERGE_SHA=8c16e8c0617dc44d9fd22cd557d47fa8542818ab
EXACT_HEAD_RELEASE_POLICY_RUN=31167700790;SUCCESS
EXACT_HEAD_PR_VALIDATION_RUN=31167700524;SUCCESS
ZERO_TRAFFIC_CANDIDATE_RUN=31167697067;SUCCESS
POST_MERGE_RELEASE_POLICY_RUN=31170924975;SUCCESS
POST_MERGE_MAIN_VALIDATION_RUN=31170925137;SUCCESS
POST_MERGE_MAIN_VALIDATION_PRODUCTION_MODE=READ_ONLY
PR35_MERGED=YES
PR35_MERGE_SHA=a4e6c62bdd901d2c7fdaf2d26c01e5d45dbf9c13
PR35_POST_MERGE_MAIN_VALIDATION=31176350830;SUCCESS
PR35_POST_MERGE_RELEASE_POLICY=31176351184;SUCCESS
ISSUE32_CLOSED=YES
```

The hotfix merge preserved the exact audited source as a parent of `main`. The later PR #35 was test-only and did not alter runtime source. Both post-merge main workflows performed validation and production observation only; neither deployed a replacement Worker version.

## Root cause and correction

```text
MAP_CAUSE=CSS_CASCADE_MAPLIBRE_HOST_GEOMETRY;CONFIRMED
PRE_FIX_MAPLIBRE_HOST=HEIGHT_0;POSITION_RELATIVE
CORRECTION=CASCADE_SAFE_MAP_HOST_GEOMETRY_PLUS_RESIZE_CONTRACT
PIXEL_GATE=FAIL_CLOSED_NONFLAT_BASEMAP_ROUTE_ORIGIN_DESTINATION
POST_MERGE_CI_RACE_CAUSE=PLAYWRIGHT_ACTIONABILITY_VS_IMMEDIATE_MOCK_RERENDER
POST_MERGE_CI_RACE_CORRECTION=TEST_CONTROLLED_RESPONSE_GATES
```

The initial false-positive map gate was replaced by actual rendered-pixel evidence. HTTP 200 tile/source readiness alone is not accepted as proof of a visible map. The later CI race was not a product regression; it was removed by deterministic test synchronization.

## Canonical architecture

```text
UI=SVELTE_5
LANGUAGE=TYPESCRIPT_STRICT
BUILD=VITE
RUNTIME=CLOUDFLARE_WORKER_TYPESCRIPT_AND_ASSETS
APP=SPA_PWA
SSR=NO
SVELTEKIT=NO
TAILWIND=NO
MONOLITHIC_HTML_RUNTIME=INACTIVE
PRIMARY_VIEWPORTS=360;390;412;430
```

MapLibre, Voice and Auth remain optional capabilities. Core destination selection, comparison and truthful unavailable states work without account, microphone or AI. Auth remains disabled.

## Product and privacy truth boundaries

- The browser does not call Nominatim or OSRM directly.
- A destination becomes operational only with complete authoritative per-item provenance, validated coordinates and verification date.
- Santa Fe remains the only city eligible for current operational expansion work until its gates are satisfied.
- Bus line/stop/direction/frequency/wait/route recommendations remain disabled until current authoritative operational data and license/freshness evidence exist.
- Straight-line distance is labeled as reference and never represented as a street/walking/cycling route.
- Taxi/remis values are regulated estimates with source and verification date.
- Uber and DiDi retain internal `APP_ONLY` truth but expose no price and no inherited generic route-duration ETA.
- External provider actions require explicit, expiring, single-use confirmation.
- AI does not calculate canonical routes, distances, durations, fares, availability or rankings.
- Audio is not persisted; transcripts are not logged; no persistent account or trip history is required.

## Map truth boundary

- CARTO raster tiles are presentation-only basemap data; they do not calculate mobility truth.
- Map state is not accepted as ready merely because the style/source loaded.
- Production acceptance requires non-flat rendered basemap pixels plus visible deterministic origin/destination markers and verified route overlay.
- A basemap error or readiness timeout exposes an explicit fallback while deterministic trip comparison remains usable.

## Control plane

```text
PULL_REQUEST_VALIDATION=.github/workflows/pr-validation.yml
MAIN_READ_ONLY_VALIDATION=.github/workflows/deploy.yml
RELEASE_POLICY=.github/workflows/release-policy-check.yml
HOTFIX_ZERO_TRAFFIC_CANDIDATE=.github/workflows/hotfix-map-mobile-candidate.yml
PRODUCTIVE_HOTFIX_OPERATOR_RUN=31170176391
```

## Current blockers / next step

```text
PRODUCTIVE_HOTFIX_BLOCKER=NONE
ISSUE32_FINAL_CLOSE=COMPLETE
ISSUE34_GATE0=PASS
ISSUE34_NEXT_ROLE=INV
ISSUE34_PHASE1=OFFICIAL_SANTA_FE_FEEDS_LICENSE_FRESHNESS_DISCOVERY
ISSUE34_PHASES1_TO_4=AUTHORIZED_CONTINUOUS_UNTIL_MILESTONE_A_OR_FIRST_REAL_FAILURE
ISSUE34_BUS_ACTIVATION=OFF
ISSUE34_TARGET=EXACT_HEAD_CANDIDATE_AT_0_PERCENT
PRODUCTION_PROMOTION_AUTHORIZED=NO
DRIVE_UPDATE_AT_NEXT_MATERIAL_MILESTONE=MILESTONE_A
```

Issue #32 is terminally closed. Issue #34 Gate 0 is open. Under AUD `5216723345`, ARQ may sequence INV→LAB→ARQ→EJE through Phases 1→4 without intermediate AUD and must stop at Milestone A with a complete zero-traffic candidate or at the first new material real failure.
