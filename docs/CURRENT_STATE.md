# VOY — Current canonical state

Last reconciled: 2026-08-07

## Authority and source of truth

```text
CANONICAL_STATE=GITHUB
REPOSITORY=simonkey888/VOY
REPOSITORY_WORKLOG=docs/CURRENT_STATE.md
RUNTIME_TRUTH=VERIFIED_PRODUCTION_AND_CLOUDFLARE_EFFECTIVE_STATE
DRIVE=LEGACY_READ_ONLY
NEW_DRIVE_WRITES=NO
ISSUE34_TERMINAL_AUD=5217823220
ISSUE36_CONTINUATION_AUD=5218359932
ISSUE36_SYSTEM_CORRECTION_AUD=5219313637
ISSUE36_REISSUED_CHECKPOINT_COMMENT=5219909612
```

GitHub is the canonical persistent state. Drive remains historical read-only evidence and must not receive new writes.

## Production — unchanged during Issue #36 correction

```text
PRODUCTIVE_SOURCE_SHA=c6aa7302784ce07415949d2b9b1335919ee2cbbd
PRODUCTIVE_VERSION_ID=9273abef-69ab-451f-b2f0-ace4c8fd3bdd
PRODUCTIVE_TRAFFIC=100%
APPLICATION_VERSION=V8.0.0
BUILD_HASH=c6aa730
BUS_ACTIVATION=OFF
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
PRODUCTION_PROMOTED_BY_ISSUE36=NO
ISSUE36_ROLLBACK_EXECUTED=NO
```

Production remained `V8.0.0/c6aa730` throughout the correction. Santa Fe bus remains fail-closed because no accepted authoritative GTFS/GTFS-RT feed with verified compatible feed license and freshness exists.

## Issue #34 — terminal

```text
ISSUE34=CLOSED_COMPLETED
AUD_PASS=5217823220
PR37=MERGED
PR37_MERGE_SHA=f9cbecc6761048fc1fabb0c4135e7b5568c840c2
SANTA_FE_TRANSIT_RESULT=NO_FEED
MOTIS_OTP=NOT_RUN_CONDITION_NOT_MET
ROUTER_BACKEND_DECISION=NO_CHANGE
TERMINAL_RUN=31185141780;SUCCESS
TERMINAL_ARTIFACT_ID=8996545635
```

The audited Issue #34 source remains in canonical main ancestry. No bus route, stop, frequency, wait, fare or availability is fabricated.

## Issue #36 — system correction reissued checkpoint

```text
ISSUE36=SYSTEM_CORRECTION_COMPLETE_EXACT_HEAD_CANDIDATE_0_AWAITING_AUD
AUD_AUTHORITY=5219313637
BRANCH=feat/issue36-total-product-redesign-01
PR38=OPEN_DRAFT_UNMERGED
EXACT_HEAD=a5048869bc6871d7fd93b347eb81e82b942f54a1
MERGE_PR38=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
```

The approved Issue #36 creative direction and composition were preserved. No second redesign occurred. Canonical routing, pricing, provider behavior, mobility trust, privacy and security semantics remain unchanged; no font or runtime dependency was added.

The design-system contract is now explicit and consumed for:
`COLOR TYPE FONT_WEIGHT FONT_SIZE LINE_HEIGHT TRACKING SPACE RADIUS BORDER SHADOW MOTION_DURATION MOTION_EASING Z_INDEX CONTENT_WIDTH CONTROL_HEIGHT`.
Repeated typography, border, control-height, motion and z-index primitives were moved behind semantic tokens while preserving their established values.

The narrow mobile mode selector keeps deliberate horizontal scrolling, now with an explicit continuation cue and scroll padding. Exact browser gates prove that `Colectivo` becomes fully visible at the end on `360x800`, `360x780` and `390x844`. Page-level horizontal overflow remains absent at 200% zoom.

## Issue #36 visual evidence

The original immutable redesign history remains preserved:

```text
BEFORE_RUN=31188934572;SUCCESS
BEFORE_ARTIFACT_ID=8997973225
VISUAL_QA_PASS_1_RUN=31190764684;SUCCESS
POLISH_PASS_1_HEAD=27200f22f5ad7c7b6d2d1d4167b79b6982d6a38e
VISUAL_QA_PASS_2_RUN=31191383395;SUCCESS
POLISH_PASS_2_HEAD=105eb7cffe3f03655819502e45f74b1a21fec23a
```

The corrected exact-head AFTER is:

```text
FINAL_AFTER_RUN=31199689945;SUCCESS
FINAL_AFTER_ARTIFACT_ID=9002038939
FINAL_AFTER_ARTIFACT_SHA256=41d0e539516a35deb9db4b41dce431afb189254aec5b8fea6e5d96e0d9ea4057
```

The AFTER matrix preserves the original multi-viewport light/dark and representative functional-state coverage while validating the system-corrected UI.

## Issue #36 exact-head regression

```text
RELEASE_POLICY_RUN=31199696430;SUCCESS
PR_VALIDATION_RUN=31199696514;SUCCESS
UNIT_TESTS=200_PASS;0_FAIL
PR_BROWSER=74_PASS;28_SKIP
DESIGN_SYSTEM_TOKEN_GATE=PASS
NARROW_MODE_OVERFLOW_360x800=PASS
NARROW_MODE_OVERFLOW_360x780=PASS
NARROW_MODE_OVERFLOW_390x844=PASS
ZOOM_200_PERCENT_PAGE_OVERFLOW=PASS
```

Four deterministic tail-runtime regressions are included in the 200 passing unit tests. They allow only response-less, exception-free `GET /assets/*` cancellations from HeadlessChrome to be classified as client-side test cancellations; API/HTML/non-headless cancellations or any exception remain blocking.

## Issue #36 Cloudflare exact-head candidate

```text
FINAL_CANDIDATE_RUN=31199689882;SUCCESS
FINAL_CANDIDATE_ARTIFACT_ID=9002572272
FINAL_CANDIDATE_ARTIFACT_SHA256=80176402228bed92b79f7909e12cf3404b82c4eaf61975b74d6926608b10ade1
ARTIFACT_MANIFEST_SHA256=52260d579fe3a2d46fafcba7f3f1202b2e14ffdc3066552ea91fb9a54d4b6fdd
ARTIFACT_MANIFEST=167/167_REHASH_PASS
CANDIDATE_SOURCE_SHA=a5048869bc6871d7fd93b347eb81e82b942f54a1
STABLE_VERSION_ID=9273abef-69ab-451f-b2f0-ace4c8fd3bdd
STABLE_TRAFFIC=100%
CANDIDATE_VERSION_ID=87f252d6-c7b2-45a1-b156-6fe497e7da09
CANDIDATE_TRAFFIC=0%
CANDIDATE_DEPLOYMENT_ID=149b07e5-0d5e-460e-9afd-f2acb8e75602
PREVIOUS_DEPLOYMENT_ID=e21de5b6-d163-478c-bac4-336687aa5070
STABLE_HEALTH=V8.0.0/c6aa730
CANDIDATE_HEALTH=V8.0.0/a504886
CONVERGENCE_ROUNDS=20
CONVERGENCE_DURATION_MS=212757
LOCAL_REAL_MAP_PIXEL_PROOF=6/6_PASS
LOCAL_REAL_MAP_GEOMETRY_PROOF=6/6_PASS
CANDIDATE_REAL_MAP_PIXEL_PROOF=6/6_PASS
CANDIDATE_REAL_MAP_GEOMETRY_PROOF=6/6_PASS
CANDIDATE_BROWSER=86_PASS;16_SKIP
OBSERVABILITY=PASS
EXACT_VERSION_TAIL_EVENTS=1906
TAIL_NON_OK=0
TAIL_EXCEPTIONS=0
BENIGN_CLIENT_CANCELLATIONS=0
PRODUCTION_PROMOTED=NO
ROLLBACK_EXECUTED=NO
```

The downloaded GitHub artifact ZIP independently matches GitHub's SHA-256 metadata and all 167 manifest entries rehash successfully.

An intermediate candidate `2833a850-0dcc-4f10-80f9-bb8298d03671 @0%` was superseded and is not active in the final deployment. Its only flagged tail event was a response-less, exception-free `HeadlessChrome` cancellation of a static MapLibre asset while the browser suite was green. That detector case was corrected and regression-tested before final reissue. The final candidate itself recorded 1,906 exact-version events with zero non-ok outcomes, zero exceptions and zero benign cancellations.

## Stable architecture and truth boundaries

```text
UI=SVELTE_5
LANGUAGE=TYPESCRIPT_STRICT
BUILD=VITE
RUNTIME=CLOUDFLARE_WORKER_TYPESCRIPT_AND_ASSETS
APP=SPA_PWA
SSR=NO
SVELTEKIT=NO
TAILWIND=NO
MOBILITY_DATA_TRUST=DETERMINISTIC_TYPED_CONTRACTS
GTFS_VALIDATOR=MobilityData_gtfs-validator_v8.0.1
GTFS_VALIDATOR_SHA256=19293ddd9b6f954f216d4f12054bd8a3232921751c4484339e339764a91000e2
MOBILITY_DATABASE=BUILD_TIME_OR_MANUAL_DISCOVERY_ONLY
```

Permanent invariants:
- browser does not call Nominatim, OSRM or Mobility Database directly;
- bus stays disabled without verified source/license/freshness/validation;
- catalog metadata cannot authorize a feed;
- GTFS-RT cannot attach without compatible verified-current static GTFS;
- APP_ONLY providers expose no fabricated numeric fare;
- AI does not calculate canonical routes, fares, times, availability or rankings;
- external actions require explicit expiring single-use confirmation;
- audio/transcripts/exact-location history are not persistently stored;
- VOY works without login, voice or AI.

## Next authorized sequence

```text
CURRENT_CANDIDATE_PROMOTABLE=AWAITING_INDEPENDENT_AUD
MERGE_PR38=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
NEXT=AUD_REVIEW_REISSUED_EXACT_HEAD_CANDIDATE
```
