# VOY — Current canonical state

Last reconciled: 2026-08-07

## Authority and milestone

```text
CANONICAL_STATE=GOOGLE_DRIVE
REPOSITORY_WORKLOG=docs/CURRENT_STATE.md
RUNTIME_TRUTH=VERIFIED_PRODUCTION_AND_CLOUDFLARE_EFFECTIVE_STATE
MILESTONE=POST_RELEASE_MAP_MOBILE_UI_HOTFIX_PRODUCTIVE
AUD_PASS=5215747741
ARQ_AUTHORIZATION=5215826191
HOTFIX_ISSUE=32
HOTFIX_PR=33;MERGED
HOTFIX_EXACT_HEAD=403ad4fc96f0b7138151f6267b996cd900f752c2
HOTFIX_MERGE_SHA=8c16e8c0617dc44d9fd22cd557d47fa8542818ab
MAIN_SHA_BEFORE_RECONCILIATION=8c16e8c0617dc44d9fd22cd557d47fa8542818ab
RELEASE_STATUS=PRODUCTIVE_HOTFIX_VALIDATED
ISSUE32_CLOSE_PENDING=YES_AFTER_THIS_GITHUB_RECONCILIATION
ISSUE34_RUNTIME_STARTED=NO
```

AUD `5215747741` passed only the exact source/candidate pair. ARQ authorization `5215826191` then allowed the exact production promotion, complete runtime validation, merge and closure sequence. No different candidate or source was substituted.

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

The previous V8 version `2ee28f09-1aa8-4250-bb2c-ba4684a07791` is retained as the immediate rollback reference for this hotfix, but this record is not authorization to roll back. Any future production mutation requires a fresh state reconstruction and applicable ARQ/AUD authorization.

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
```

The merge preserved the exact audited hotfix source as a parent of `main`. The post-merge main workflow performed validation and production observation only; it did not deploy a replacement Worker version.

## Root cause and correction

```text
MAP_CAUSE=CSS_CASCADE_MAPLIBRE_HOST_GEOMETRY;CONFIRMED
PRE_FIX_MAPLIBRE_HOST=HEIGHT_0;POSITION_RELATIVE
CORRECTION=CASCADE_SAFE_MAP_HOST_GEOMETRY_PLUS_RESIZE_CONTRACT
PIXEL_GATE=FAIL_CLOSED_NONFLAT_BASEMAP_ROUTE_ORIGIN_DESTINATION
```

The initial false-positive map gate was replaced by actual rendered-pixel evidence. HTTP 200 tile/source readiness alone is not accepted as proof of a visible map.

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
ISSUE32_FINAL_CLOSE=NEXT_AFTER_RECONCILIATION_CI_PASS
ISSUE34_GATE_0=PENDING_ISSUE32_FINAL_CLOSE_AND_RECONCILIATION
ISSUE34_NEXT_ROLE=INV
ISSUE34_PHASE1=OFFICIAL_SANTA_FE_FEEDS_LICENSE_FRESHNESS_DISCOVERY
ISSUE34_RUNTIME_MUTATION=NOT_YET_AUTHORIZED_OR_STARTED
DRIVE_DUPLICATE_CHECKPOINT=NO
```

No duplicate Drive checkpoint is created for this closure. After this canonical GitHub reconciliation passes its own validation, Issue #32 may be closed and Issue #34 may begin Phase 1 as an investigation-only block; runtime implementation remains gated by Issue #34 governance.
