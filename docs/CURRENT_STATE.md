# VOY — Current canonical state

Last reconciled: 2026-08-07

## Authority and current milestone

```text
CANONICAL_STATE=GOOGLE_DRIVE
REPOSITORY_WORKLOG=docs/CURRENT_STATE.md
RUNTIME_TRUTH=VERIFIED_PRODUCTION_AND_CLOUDFLARE_EFFECTIVE_STATE
MILESTONE=ISSUE34_MILESTONE_A_COMPLETE
AUD_HOTFIX_PASS=5215747741
ARQ_HOTFIX_AUTHORIZATION=5215826191
AUD_POST_MERGE_CONTINUE=5216723345
ISSUE32= CLOSED_COMPLETED
ISSUE34=OPEN
ISSUE34_GATE0=PASS
ISSUE34_PHASES1_TO_4=COMPLETE
ISSUE34_MILESTONE_A=COMPLETE
ISSUE34_MILESTONE_COMMENT=5217164821
ISSUE34_PR=37;DRAFT_UNMERGED
ISSUE34_BASE=65b5959aa13648a5b11534c1bfb96869e3bbbb1e
ISSUE34_EXACT_HEAD=2e164f86c05b4ba004a4328a0cfd356512e94c0d
PRODUCTION_PROMOTION_AUTHORIZED=NO
NEXT=AUD_MILESTONE_A
```

AUD `5216723345` independently classified the post-merge browser failure as a Playwright test-harness actionability race, authorized its test-only correction and terminal Issue #32 closure, then authorized Issue #34 Phases 1→4 to run continuously until Milestone A or a new material real failure. Issue #32 is now closed. Issue #34 reached Milestone A with an exact-head Cloudflare candidate at 0% traffic; PR #37 remains Draft and unmerged.

Canonical Drive checkpoint: `VOY — MILESTONE A — ISSUE 34 MOBILITY TRUST CANDIDATE`, document ID `1fYixNxxWo5Mr61ZzlAzK-r7JaO6GNJRiKiC38Tcqe-8`.

## Effective Cloudflare / production state

```text
APPLICATION_VERSION=V8.0.0
BUILD_HASH=403ad4f
PRODUCTIVE_SOURCE_SHA=403ad4fc96f0b7138151f6267b996cd900f752c2
PRODUCTIVE_VERSION_ID=2f86d708-b905-4c33-b1fe-d881467e8542
PRODUCTIVE_TRAFFIC=100%
PRODUCTIVE_DEPLOYMENT_ID=85d4cbbe-6b89-4e1d-970f-55aff458d760
ISSUE34_CANDIDATE_VERSION_ID=0e69e812-704c-448e-a69c-6e02edfd91d0
ISSUE34_CANDIDATE_TRAFFIC=0%
ISSUE34_CANDIDATE_DEPLOYMENT_ID=89250934-c17c-4247-af0e-83fa74b6f78e
ISSUE34_CANDIDATE_SOURCE_SHA=2e164f86c05b4ba004a4328a0cfd356512e94c0d
PREVIOUS_VERSION_ID=2ee28f09-1aa8-4250-bb2c-ba4684a07791
PREVIOUS_VERSION_TRAFFIC=0%
PRODUCTION_CHANGED_BY_ISSUE34=NO
PRODUCTION_PROMOTED=NO
ROLLBACK_EXECUTED=NO
```

Issue #34 candidate run `31178364994` re-verified production before and after the candidate operation as `V8.0.0 / 403ad4f`, preserved productive version `2f86d708-b905-4c33-b1fe-d881467e8542` at 100%, created exact-head candidate version `0e69e812-704c-448e-a69c-6e02edfd91d0` at 0%, and produced deployment `89250934-c17c-4247-af0e-83fa74b6f78e`. No production promotion or rollback occurred.

## Issue #32 terminal closure

```text
HOTFIX_ISSUE=32;CLOSED_COMPLETED
HOTFIX_PR=33;MERGED
HOTFIX_EXACT_HEAD=403ad4fc96f0b7138151f6267b996cd900f752c2
HOTFIX_MERGE_SHA=8c16e8c0617dc44d9fd22cd557d47fa8542818ab
POST_MERGE_TEST_FIX_PR=35;MERGED
POST_MERGE_TEST_FIX_HEAD=7ecd9328299051b703b15c3375cde34f5ccbace4
POST_MERGE_TEST_FIX_MERGE=a4e6c62bdd901d2c7fdaf2d26c01e5d45dbf9c13
TEST_FIX_PR_VALIDATION=31176176432;SUCCESS
TEST_FIX_PR_RELEASE_POLICY=31176176262;SUCCESS
TEST_FIX_POST_MERGE_MAIN_VALIDATION=31176350830;SUCCESS
TEST_FIX_POST_MERGE_RELEASE_POLICY=31176351184;SUCCESS
TEST_FIX_MAIN_ARTIFACT_ID=8993028861
TEST_FIX_MAIN_ARTIFACT_SHA256=962546367aff8d77a8c22d257ee6a96a49f46ba3f05745285c66e24a8f43cbf9
FAILURE_CLASS=TEST_HARNESS_ACTIONABILITY_RACE
PRODUCT_RUNTIME_REGRESSION_DEMONSTRATED=NO
```

The stale-origin test now holds first and second mocked responses behind explicit test-controlled gates. The second click is dispatched before the second response can trigger the Svelte rerender; after `Segundo` wins, the held first request is released and proven unable to overwrite it. Runtime code and production were not changed by this correction.

## Issue #34 Phase 1 — Santa Fe source result

```text
SANTA_FE_GTFS_ACCEPTED=NO
SANTA_FE_GTFS_RT_ACCEPTED=NO
BUS_ACTIVATION=OFF
MOBILITY_DATABASE=DISCOVERY_ONLY
CATALOG_DISCOVERY_IS_OPERATIONAL_AUTHORITY=NO
UNDOCUMENTED_ENDPOINT_REVERSE_ENGINEERING=NO
AI_SYNTHETIC_TRANSIT_DATA=NO
```

Fresh investigation confirmed current official municipal public-transport surfaces and current fare regulation evidence, but did not demonstrate a public authoritative Santa Fe Capital GTFS Schedule or GTFS-Realtime feed with verified compatible usage/redistribution terms and freshness. Mobility Database discovery likewise did not provide an acceptable Santa Fe bus GTFS source. Therefore bus remains fail-closed. The detailed HECHO / INFERENCIA / NO_VERIFICADO record is persisted on PR #37 at `docs/research/issue34-santa-fe-mobility-sources-2026-08-07.md`.

## Issue #34 Phases 2–4 — selected architecture and implementation

```text
SELECTED_SLICE=DATA_TRUST_PLUS_GTFS_GATE_PLUS_MOBILITY_DATABASE_DISCOVERY_PLUS_FARE_CONFIDENCE
TRUST_LAYER=IMPLEMENTED_PASS
GTFS_GTFS_RT_BOUNDARY=IMPLEMENTED_FAIL_CLOSED
MOBILITY_DATABASE_ADAPTER=DISCOVERY_ONLY
FARE_CONFIDENCE=IMPLEMENTED_PASS
RUNTIME_SURFACE=GET_/api/mobility/trust_READ_ONLY
CURRENT_ROUTING_GEOCODING=UNCHANGED
BUS_ACTIVATION=OFF
```

The implementation adds deterministic source trust states `VERIFIED_CURRENT`, `VERIFIED_STALE`, `UNVERIFIED`, `DEVELOPMENT_ONLY`, `DEPRECATED`, and `UNAVAILABLE`; explicit officiality/license/freshness/validation/provenance fields; a fail-closed GTFS gate; a GTFS-RT attachment boundary that requires a compatible verified static feed; Mobility Database normalization that can never self-promote catalog metadata into operational truth; and Fare Confidence categories that suppress numeric fares for APP_ONLY, stale or unproven evidence.

The new `/api/mobility/trust` surface is GET-only, read-only, performs no Mobility Database runtime fetch, exposes no secrets or personal data, and explicitly reports Santa Fe bus activation OFF.

## Canonical GTFS validator gate

```text
GTFS_VALIDATOR=MobilityData_gtfs-validator
GTFS_VALIDATOR_VERSION=8.0.1
GTFS_VALIDATOR_ASSET=gtfs-validator-8.0.1-cli.jar
GTFS_VALIDATOR_SHA256=19293ddd9b6f954f216d4f12054bd8a3232921751c4484339e339764a91000e2
GTFS_VALIDATOR_RESULT=PASS
HARD_ERRORS=0
SYSTEM_ERRORS=0
WARNINGS=1
WARNING_CODE=missing_feed_contact_email_and_url
WARNING_POLICY=CLASSIFIED_AND_PERSISTED_NOT_SILENTLY_IGNORED
```

The first canonical-validator attempt stopped before Cloudflare because the deterministic LAB fixture used a reserved synthetic hostname that validator v8.0.1 rejected. That was a non-runtime fixture defect. The fixture was corrected to validator-clean URLs, system-error parsing was corrected, and the complete exact-head path was rerun successfully. No Cloudflare mutation occurred in the blocked first attempt.

## Issue #34 Milestone A candidate validation

```text
CANDIDATE_RUN=31178364994;SUCCESS
EXACT_SOURCE_SHA=2e164f86c05b4ba004a4328a0cfd356512e94c0d
UNIT_TESTS=196_PASS;0_FAIL
LOCAL_BROWSER=53_PASS;13_SKIP
CANDIDATE_BROWSER=53_PASS;13_SKIP
BINDING_CONTRACT=16_VS_16_EXACT_PASS
ASSETS=40/40_PASS
CONVERGENCE=20_CONSECUTIVE_PASS
CONVERGENCE_DURATION_MS=173958
LOCAL_REAL_MAP_PIXEL_PROOF=6/6_PASS
CANDIDATE_REAL_MAP_PIXEL_PROOF=6/6_PASS
BASEMAP_VISIBLE=YES
ORIGIN_MARKER_VISIBLE=YES
DESTINATION_MARKER_VISIBLE=YES
ROUTE_VISIBLE=YES
API_GATE=PASS
VOICE_GATE=PASS
RETIRED_PUBLIC_ROUTES=9/9_PASS_410
MOBILITY_TRUST_API=PASS
PWA_PRIVACY_SECURITY=PASS
OBSERVABILITY=DEGRADED_NO_EVENTS
EXACT_VERSION_TAIL_EVENTS=0
TAIL_EXCEPTIONS=0
COST_USD=0
CARD_OR_BILLING_USED=NO
SECRETS_EXPOSED=NO
```

The candidate retained all 16 effective binding names/types, converged for 20 consecutive rounds, passed real-network basemap and rendered-pixel proof at six viewports, preserved provider truth and external-action confirmation, preserved Voice/Auth/privacy/PWA/retired-route gates, and returned the new trust endpoint through an exact-version override with `bus_activation=false`.

## Immutable Milestone A evidence

```text
ARTIFACT_ID=8993920897
ARTIFACT_NAME=voy-issue34-mobility-trust-31178364994
ARTIFACT_SHA256=a34afea006300341d16df7daa09671c26efd09b65e3ddf21c88d83be56955949
MANIFEST_SHA256=8d2530ac0ee95b03338a715d4f4e0f6590dd6f33efce3bd1531c168cb22900a7
MANIFEST_FILES=171/171_HASH_PASS
```

All 171 manifest entries independently hash-verified after artifact download. Candidate final state reports `result=PASS`, source `2e164f86...`, stable production `403ad4f`, candidate traffic 0%, no promotion and no rollback.

## Observability classification

```text
OBSERVABILITY=DEGRADED_NO_EVENTS
EXACT_VERSION_TAIL_EVENTS=0
NON_OK_TAIL_OUTCOMES=0
TAIL_EXCEPTIONS=0
EMPTY_TAIL_IS_RUNTIME_FAILURE=NO
```

The accepted classification remains: a genuinely empty exact-version tail is recorded as degraded observability rather than fabricated runtime failure when direct health, browser, API, asset, binding and convergence gates pass and no non-OK outcome or exception is captured.

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
MOBILITY_DATA_TRUST=DETERMINISTIC_TYPED_CONTRACTS
GTFS_VALIDATION=PINNED_CI_DATA_INGESTION_GATE
MOBILITY_DATABASE=BUILD_TIME_OR_MANUAL_DISCOVERY_ONLY
```

MapLibre, Voice and Auth remain optional capabilities. Core destination selection, comparison and truthful unavailable states work without account, microphone or AI. Auth remains disabled. No routing or geocoding engine was replaced by Issue #34.

## Product, data and privacy truth boundaries

- The browser does not call Nominatim, OSRM or Mobility Database directly.
- A destination becomes operational only with complete authoritative per-item provenance, validated coordinates and verification date.
- Santa Fe remains the only city eligible for current operational expansion work until its data-quality gates are satisfied.
- Bus line/stop/direction/frequency/wait/route recommendations remain disabled until a current authoritative operational feed and compatible license/freshness evidence pass the trust and GTFS gates.
- GTFS-Realtime cannot attach without a compatible verified-current static feed.
- Catalog metadata is discovery evidence only and cannot itself authorize operational activation.
- Straight-line distance is labeled as reference and never represented as a street/walking/cycling route.
- Taxi/remis values retain regulated-estimate source/verification semantics.
- Uber and DiDi retain internal APP_ONLY truth and expose no unverified price or inherited generic route-duration ETA.
- Every visible numeric fare must have an allowed confidence classification plus source and verification date.
- External provider actions require explicit, expiring, single-use confirmation.
- AI does not calculate canonical routes, distances, durations, fares, availability or rankings.
- Audio is not persisted; transcripts are not logged; no persistent account, exact-location history or trip history is required.

## Map truth boundary

- CARTO raster tiles are presentation-only basemap data; they do not calculate mobility truth.
- Map state is not accepted as ready merely because style/source loaded.
- Candidate acceptance requires non-flat rendered basemap pixels plus deterministic origin/destination markers and route overlay when a verified route exists.
- A basemap error or readiness timeout exposes explicit fallback while deterministic trip comparison remains usable.

## Control plane

```text
PULL_REQUEST_VALIDATION=.github/workflows/pr-validation.yml
MAIN_READ_ONLY_VALIDATION=.github/workflows/deploy.yml
RELEASE_POLICY=.github/workflows/release-policy-check.yml
ISSUE34_CANDIDATE_WORKFLOW=.github/workflows/cloudflare-city-platform-final-candidate.yml@PR37_HEAD
ISSUE34_CANDIDATE_RUN=31178364994
PRODUCTIVE_HOTFIX_OPERATOR_RUN=31170176391
```

The Issue #34 candidate workflow reused an already registered workflow path so GitHub Actions could dispatch the branch-specific exact-head definition without merging product code first. A duplicate same-head workflow-dispatch run was cancelled before it created any job or Cloudflare version. Only run `31178364994` created the accepted candidate.

## Current blockers / next step

```text
PRODUCTIVE_HOTFIX_BLOCKER=NONE
ISSUE32_FINAL_CLOSE=COMPLETE
ISSUE34_GATE0=PASS
ISSUE34_PHASES1_TO_4=COMPLETE
ISSUE34_MILESTONE_A=COMPLETE
ISSUE34_PR37= DRAFT_UNMERGED
ISSUE34_BUS_ACTIVATION=OFF
ISSUE34_CANDIDATE=0e69e812-704c-448e-a69c-6e02edfd91d0@0%
PRODUCTION_PROMOTION_AUTHORIZED=NO
MOTIS_OTP=NOT_RUN
NEXT=AUD_MILESTONE_A
```

Milestone A is complete. Stop here for independent AUD review. No PR #37 merge, production traffic promotion, bus activation or later Issue #34 phase is authorized by this checkpoint itself.
