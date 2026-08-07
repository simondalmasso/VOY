# VOY — Current canonical state

Last reconciled: 2026-08-07

## Authority and current milestone

```text
CANONICAL_STATE=GOOGLE_DRIVE
REPOSITORY_WORKLOG=docs/CURRENT_STATE.md
RUNTIME_TRUTH=VERIFIED_PRODUCTION_AND_CLOUDFLARE_EFFECTIVE_STATE
MILESTONE=ISSUE34_MILESTONE_A_CORRECTION_COMPLETE
AUD_HOTFIX_PASS=5215747741
ARQ_HOTFIX_AUTHORIZATION=5215826191
AUD_POST_MERGE_CONTINUE=5216723345
AUD_MILESTONE_A_BLOCK_AND_CORRECTION_AUTHORITY=5217321670
ISSUE32=CLOSED_COMPLETED
ISSUE34=OPEN
ISSUE34_GATE0=PASS
ISSUE34_PHASES1_TO_4=COMPLETE
ISSUE34_MILESTONE_A_CORRECTION=COMPLETE
ISSUE34_MILESTONE_REISSUED_COMMENT=5217585109
ISSUE34_PR=37;DRAFT_UNMERGED
ISSUE34_BASE=65b5959aa13648a5b11534c1bfb96869e3bbbb1e
ISSUE34_PREVIOUS_BLOCKED_HEAD=2e164f86c05b4ba004a4328a0cfd356512e94c0d
ISSUE34_EXACT_HEAD=c6aa7302784ce07415949d2b9b1335919ee2cbbd
MERGE_PR37=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
NEXT=AUD_REVIEW_REISSUED_MILESTONE_A
```

AUD `5217321670` passed the architecture, tests, zero-traffic operation and bus fail-closed posture of the first Milestone A candidate, but blocked that candidate because Mobility Database catalog license metadata had been overclassified as canonical `VERIFIED_COMPATIBLE` feed-license evidence. The same AUD authorized a direct correction on PR #37, complete revalidation and one fresh exact-head Cloudflare candidate at 0% without another intermediate AUD. The correction is now complete and the prior candidate is superseded for audit purposes.

Canonical Drive checkpoint remains `VOY — MILESTONE A — ISSUE 34 MOBILITY TRUST CANDIDATE`, document ID `1fYixNxxWo5Mr61ZzlAzK-r7JaO6GNJRiKiC38Tcqe-8`; the corrected Milestone A evidence was appended under `Milestone A correction — AUD 5217321670`.

## Effective Cloudflare / production state

```text
APPLICATION_VERSION=V8.0.0
BUILD_HASH=403ad4f
PRODUCTIVE_SOURCE_SHA=403ad4fc96f0b7138151f6267b996cd900f752c2
PRODUCTIVE_VERSION_ID=2f86d708-b905-4c33-b1fe-d881467e8542
PRODUCTIVE_TRAFFIC=100%
PRODUCTIVE_DEPLOYMENT_ID=85d4cbbe-6b89-4e1d-970f-55aff458d760
ISSUE34_CANDIDATE_SOURCE_SHA=c6aa7302784ce07415949d2b9b1335919ee2cbbd
ISSUE34_CANDIDATE_VERSION_ID=9273abef-69ab-451f-b2f0-ace4c8fd3bdd
ISSUE34_CANDIDATE_TRAFFIC=0%
ISSUE34_CANDIDATE_DEPLOYMENT_ID=f7d40597-4f32-49b4-a7f4-c876d0714f89
PREVIOUS_ISSUE34_CANDIDATE_VERSION_ID=0e69e812-704c-448e-a69c-6e02edfd91d0
PREVIOUS_ISSUE34_CANDIDATE_DEPLOYMENT_ID=89250934-c17c-4247-af0e-83fa74b6f78e
PREVIOUS_VERSION_ID=2ee28f09-1aa8-4250-bb2c-ba4684a07791
PRODUCTION_CHANGED_BY_ISSUE34=NO
PRODUCTION_PROMOTED=NO
ROLLBACK_EXECUTED=NO
```

Candidate run `31181446289` re-verified production as `V8.0.0 / 403ad4f`, preserved productive version `2f86d708-b905-4c33-b1fe-d881467e8542` at 100%, and created exact-head version `9273abef-69ab-451f-b2f0-ace4c8fd3bdd` at 0% in deployment `f7d40597-4f32-49b4-a7f4-c876d0714f89`. No production promotion or rollback occurred.

## Issue #34 Milestone A correction

```text
FAILURE_CLASS=CATALOG_LICENSE_METADATA_OVERCLASSIFIED_AS_CANONICAL_VERIFIED_COMPATIBLE
CORRECTION_RESULT=PASS
CATALOG_LICENSE_METADATA_IS_OPERATIONAL_AUTHORITY=NO
MOBILITY_DATABASE_CANONICAL_LICENSE_URL=NULL
MOBILITY_DATABASE_CANONICAL_LICENSE_STATUS=UNKNOWN
MOBILITY_DATABASE_OPERATIONAL_STATUS=DISCOVERY_ONLY
MOBILITY_DATABASE_TRUST_STATUS=DEVELOPMENT_ONLY
CATALOG_LICENSE_WARNING=catalog_license_metadata_discovery_only_not_operational_evidence
BUS_ACTIVATION=OFF
```

`normalizeMobilityDatabaseDiscovery()` now prevents catalog-provided license fields from becoming canonical feed-license truth: canonical `license_url` is null and `license_status` is `UNKNOWN`, while catalog license presence is recorded only as a discovery warning. The Santa Fe MiBiciTuBici registry entry is explicitly license-unknown. A deterministic regression passes catalog input claiming `VERIFIED_COMPATIBLE` plus a catalog license URL and proves the normalized canonical record remains `UNKNOWN`, `DISCOVERY_ONLY` and `DEVELOPMENT_ONLY`. Map, routing, UI, providers and unrelated Issue #34 architecture were not changed.

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

Fresh investigation found current official municipal public-transport surfaces and fare-regulation evidence, but did not demonstrate a public authoritative Santa Fe Capital GTFS Schedule or GTFS-Realtime feed with verified compatible provider/feed usage or redistribution terms and freshness. Mobility Database remains discovery evidence only. Bus service data therefore remains fail-closed. Detailed HECHO / INFERENCIA / NO_VERIFICADO evidence is in `docs/research/issue34-santa-fe-mobility-sources-2026-08-07.md` on PR #37.

## Issue #34 selected architecture

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

The trust layer uses deterministic typed states and explicit officiality, license, freshness, validation and provenance fields. GTFS-Realtime cannot attach without a compatible verified-current static feed. Mobility Database metadata cannot self-promote into operational authority. Fare Confidence suppresses numeric values for APP_ONLY, stale or unproven evidence. `/api/mobility/trust` is GET-only/read-only, performs no Mobility Database runtime fetch and exposes no secrets or personal data.

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

The earlier malformed LAB fixture failure remains classified as a pre-Cloudflare fixture defect and caused no runtime mutation. The corrected exact-head candidate reran the pinned validator successfully.

## Corrected Milestone A validation evidence

```text
FINAL_RELEASE_POLICY_RUN=31181450541;SUCCESS
FINAL_PR_VALIDATION_RUN=31181450633;SUCCESS
CANDIDATE_RUN=31181446289;SUCCESS
EXACT_SOURCE_SHA=c6aa7302784ce07415949d2b9b1335919ee2cbbd
UNIT_TESTS=196_PASS;0_FAIL
LOCAL_BROWSER=53_PASS;13_SKIP
CANDIDATE_BROWSER=53_PASS;13_SKIP
BINDING_CONTRACT=EXACT_PASS
CONVERGENCE=20_CONSECUTIVE_PASS
CONVERGENCE_DURATION_MS=209611
LOCAL_REAL_MAP_PIXEL_PROOF=6/6_PASS
CANDIDATE_REAL_MAP_PIXEL_PROOF=6/6_PASS
BASEMAP_VISIBLE=YES
ORIGIN_MARKER_VISIBLE=YES
DESTINATION_MARKER_VISIBLE=YES
ROUTE_VISIBLE=YES
API_GATE=PASS
VOICE_GATE=PASS
RETIRED_PUBLIC_ROUTES=9/9_PASS_410
MOBILITY_TRUST_API=PASS;BUS_OFF;BUS_LICENSE_UNKNOWN
PWA_PRIVACY_SECURITY=PASS
OBSERVABILITY=DEGRADED_NO_EVENTS
EXACT_VERSION_TAIL_EVENTS=0
TAIL_EXCEPTIONS=0
COST_USD=0
CARD_OR_BILLING_USED=NO
SECRETS_EXPOSED=NO
```

The final exact-head PR validation passed release/syntax policy, frozen install, typecheck, lint, all tests, build/budgets, Wrangler dry-run and clean-profile browser gates. The candidate retained effective bindings, converged for 20 consecutive rounds, passed real-network/rendered-pixel map proof at six viewports and preserved API, Voice, privacy, PWA and retired-route gates.

## Immutable corrected Milestone A evidence

```text
ARTIFACT_ID=8995148336
ARTIFACT_NAME=voy-issue34-mobility-trust-31181446289
ARTIFACT_SHA256=75ac14b88cd1637d77336ea7b11855ef5d9176bb90fef995f20eec6ff7b7edfa
MANIFEST_SHA256=5276da1f7c1eaad6e0b5782675a8d8607799fac0fe5491838a2cdcf96218e6f1
MANIFEST_FILES=171/171_HASH_PASS
```

The downloaded ZIP digest exactly matched GitHub artifact metadata and all 171 manifest entries independently hash-verified. `final-state.json` reports `result=PASS`, exact source `c6aa730...`, stable production at 100%, corrected candidate at 0%, no production promotion and no rollback.

## Observability classification

```text
OBSERVABILITY=DEGRADED_NO_EVENTS
EXACT_VERSION_TAIL_EVENTS=0
NON_OK_TAIL_OUTCOMES=0
TAIL_EXCEPTIONS=0
EMPTY_TAIL_IS_RUNTIME_FAILURE=NO
```

A genuinely empty exact-version tail remains degraded observability rather than fabricated runtime failure when direct health, browser, API, asset, binding and convergence gates pass and no non-OK outcome or exception is captured.

## Issue #32 terminal closure

```text
HOTFIX_ISSUE=32;CLOSED_COMPLETED
HOTFIX_PR=33;MERGED
HOTFIX_EXACT_HEAD=403ad4fc96f0b7138151f6267b996cd900f752c2
HOTFIX_MERGE_SHA=8c16e8c0617dc44d9fd22cd557d47fa8542818ab
POST_MERGE_TEST_FIX_PR=35;MERGED
POST_MERGE_TEST_FIX_HEAD=7ecd9328299051b703b15c3375cde34f5ccbace4
POST_MERGE_TEST_FIX_MERGE=a4e6c62bdd901d2c7fdaf2d26c01e5d45dbf9c13
FAILURE_CLASS=TEST_HARNESS_ACTIONABILITY_RACE
PRODUCT_RUNTIME_REGRESSION_DEMONSTRATED=NO
```

Issue #32 remains terminally closed. Its deterministic stale-origin test correction changed no runtime code or production traffic.

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

MapLibre, Voice and Auth remain optional capabilities. Core destination selection, comparison and truthful unavailable states work without login, microphone or AI. Auth remains disabled. Issue #34 did not replace routing or geocoding.

## Product, data and privacy truth boundaries

- The browser does not call Nominatim, OSRM or Mobility Database directly.
- A destination becomes operational only with authoritative provenance, validated coordinates and verification date.
- Santa Fe remains the only city eligible for current operational expansion work until its gates pass.
- Bus line/stop/direction/frequency/wait/route recommendations remain disabled until a current authoritative operational feed and independently verified compatible provider/feed license/freshness evidence pass the trust and GTFS gates.
- Catalog license metadata never grants canonical feed redistribution/use authority.
- GTFS-Realtime cannot attach without a compatible verified-current static feed.
- Straight-line distance remains explicitly reference-only.
- Taxi/remis values retain regulated-estimate source/verification semantics.
- Uber and DiDi retain internal APP_ONLY truth and expose no unverified price or inherited generic route-duration ETA.
- Every visible numeric fare requires allowed confidence, source and verification date.
- External provider actions require explicit, expiring, single-use confirmation.
- AI does not calculate canonical routes, distances, durations, fares, availability or rankings.
- Audio is not persisted; transcripts are not logged; no persistent account, exact-location history or trip history is required.

## Control plane

```text
PULL_REQUEST_VALIDATION=.github/workflows/pr-validation.yml
MAIN_READ_ONLY_VALIDATION=.github/workflows/deploy.yml
RELEASE_POLICY=.github/workflows/release-policy-check.yml
ISSUE34_CANDIDATE_WORKFLOW=.github/workflows/cloudflare-city-platform-final-candidate.yml@PR37_HEAD
ISSUE34_CANDIDATE_RUN=31181446289
PRODUCTIVE_HOTFIX_OPERATOR_RUN=31170176391
```

The corrected candidate was created by exactly one push-triggered candidate run on frozen head `c6aa7302784ce07415949d2b9b1335919ee2cbbd`. No second candidate run or parallel product line was used.

## Current blockers / next step

```text
PRODUCTIVE_HOTFIX_BLOCKER=NONE
ISSUE32_FINAL_CLOSE=COMPLETE
ISSUE34_GATE0=PASS
ISSUE34_PHASES1_TO_4=COMPLETE
ISSUE34_MILESTONE_A_CORRECTION=COMPLETE
ISSUE34_PR37=DRAFT_UNMERGED
ISSUE34_BUS_ACTIVATION=OFF
ISSUE34_CANDIDATE=9273abef-69ab-451f-b2f0-ace4c8fd3bdd@0%
CURRENT_CANDIDATE_PROMOTABLE=AWAITING_INDEPENDENT_AUD
MERGE_PR37=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
MOTIS_OTP=NOT_RUN
NEXT=AUD_REVIEW_REISSUED_MILESTONE_A
```

The corrected Milestone A is complete and persisted. Stop here for independent AUD review. No PR #37 merge, production traffic promotion, bus activation or later Issue #34 phase is authorized by this checkpoint.
