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
ISSUE36_BUS_UNAVAILABLE_AUD=5221243712
ISSUE36_BUS_UNAVAILABLE_CHECKPOINT=5221633067
```

GitHub is the canonical persistent state. Drive remains historical read-only evidence and must not receive new writes.

## Production — unchanged during Issue #36 corrections

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

Production remained `V8.0.0/c6aa730` throughout the correction. Santa Fe BUS remains fail-closed because no accepted authoritative GTFS/GTFS-RT feed with verified compatible feed license and freshness exists.

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

## Issue #36 — BUS/unavailable correction reissued checkpoint

```text
ISSUE36=BUS_UNAVAILABLE_CORRECTION_COMPLETE_EXACT_HEAD_CANDIDATE_0_AWAITING_AUD
AUD_AUTHORITY=5221243712
BRANCH=feat/issue36-total-product-redesign-01
PR38=OPEN_DRAFT_UNMERGED
EXACT_HEAD=27c5f0395241d5eff9fac0202f1e7ded9cc24d31
MERGE_PR38=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
```

The approved Issue #36 creative direction, composition, design-system contract, map behavior and provider architecture were preserved. No second redesign occurred. Canonical routing, pricing, mobility trust, privacy and security semantics remain unchanged.

The only product correction in this block is the unavailable/non-actionable provider treatment used by BUS on narrow mobile. Unavailable copy now stays in the full-width text column as a muted subordinate state instead of occupying the numeric/metric column. BUS remains a disabled informational `ARTICLE`, exposes no numeric metric/fare, performs no route request when selected and remains operationally OFF.

The design-system contract remains explicit and consumed for:
`COLOR TYPE FONT_WEIGHT FONT_SIZE LINE_HEIGHT TRACKING SPACE RADIUS BORDER SHADOW MOTION_DURATION MOTION_EASING Z_INDEX CONTENT_WIDTH CONTROL_HEIGHT`.

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

The prior stale AFTER identity is superseded. The authoritative corrected exact-head AFTER is:

```text
FINAL_AFTER_RUN=31214458163;SUCCESS
FINAL_AFTER_ARTIFACT_ID=9007984435
FINAL_AFTER_ARTIFACT_SHA256=9a08cf823838c17a6525ba2a2a0be41d3c853279c706c6a36726f9fc2d540565
FINAL_AFTER_MANIFEST_SHA256=2a5edd10627906db6e3f843e1685f4dd6f3749755c2dd4614a77086dd4f4175d
FINAL_AFTER_MANIFEST_REHASH=108/108_PASS
BUS_DEDICATED_CAPTURES=8/8_PASS
BUS_360x780_LIGHT_DARK=PASS
BUS_360x800_LIGHT_DARK=PASS
BUS_390x844_LIGHT_DARK=PASS
BUS_412x915_LIGHT_DARK=PASS
BUS_PAGE_OVERFLOW=0
BUS_PROVIDER_OVERFLOW=0
BUS_MAIN_OVERFLOW=0
BUS_UNAVAILABLE_METRIC_NODES=0
```

The AFTER artifact is tied to exact head `27c5f0395241d5eff9fac0202f1e7ded9cc24d31`. It retains the full prior multi-viewport/light-dark/representative-state matrix and adds eight dedicated BUS unavailable captures with fail-closed geometric assertions.

## Issue #36 exact-head regression

```text
RELEASE_POLICY_RUN=31214460718;SUCCESS
PR_VALIDATION_RUN=31214460815;SUCCESS
UNIT_TESTS=200_PASS;0_FAIL
PR_BROWSER=78_PASS;30_SKIP
LOCAL_CANDIDATE_BROWSER=90_PASS;18_SKIP
REMOTE_CANDIDATE_BROWSER=90_PASS;18_SKIP
DESIGN_SYSTEM_TOKEN_GATE=PASS
BUS_UNAVAILABLE_MOBILE_GATE=PASS
ZOOM_200_PERCENT_PAGE_OVERFLOW=PASS
```

The targeted BUS test uses a deterministic authoritative Terminal fixture and an explicitly empty Santa Fe BUS transport asset. It proves BUS selection causes no new route request, remains unavailable/non-actionable, exposes no fabricated line or metric and stays readable at every required narrow-mobile viewport in light and dark.

An intermediate candidate `97bd4fa8-8e2d-4848-85dd-c757b7fb37eb @0%` is stale/superseded. Its run failed only because the first version of the new BUS test left `cities/santa-fe/transport.json` dependent on the remote asset and one `412x915` execution timed out waiting for `provider-bus`; the same product head had already passed local BUS gates and independent AFTER `412x915`. The fixture was then made fully deterministic and the complete exact-head suite was rerun. No product behavior was changed by that test correction and no production traffic was promoted.

## Issue #36 Cloudflare exact-head candidate

```text
FINAL_CANDIDATE_RUN=31214458360;SUCCESS
FINAL_CANDIDATE_ARTIFACT_ID=9008176934
FINAL_CANDIDATE_ARTIFACT_SHA256=26cd03310d7a921d4783eca51836231b718f7f4556f6c2a6c8a976668fb77232
FINAL_CANDIDATE_MANIFEST_SHA256=808dd8032d8bc4cd19f902eb113446a61eaa922871910d49dc9bffa59e402e39
FINAL_CANDIDATE_MANIFEST_REHASH=167/167_PASS
CANDIDATE_SOURCE_SHA=27c5f0395241d5eff9fac0202f1e7ded9cc24d31
STABLE_VERSION_ID=9273abef-69ab-451f-b2f0-ace4c8fd3bdd
STABLE_TRAFFIC=100%
CANDIDATE_VERSION_ID=097b56a2-f493-41bf-bf6f-56f4e234d937
CANDIDATE_TRAFFIC=0%
CANDIDATE_DEPLOYMENT_ID=20f2e1c3-e705-43e2-9974-c8a01dbbe4ca
PREVIOUS_DEPLOYMENT_ID=f9a4f10a-d8a1-4871-b0ff-df9af32d12af
STABLE_HEALTH=V8.0.0/c6aa730
CANDIDATE_HEALTH=V8.0.0/27c5f03
CONVERGENCE_ROUNDS=20
CONVERGENCE_DURATION_MS=195435
LOCAL_REAL_MAP_PIXEL_PROOF=6/6_PASS
LOCAL_REAL_MAP_GEOMETRY_PROOF=6/6_PASS
CANDIDATE_REAL_MAP_PIXEL_PROOF=6/6_PASS
CANDIDATE_REAL_MAP_GEOMETRY_PROOF=6/6_PASS
OBSERVABILITY=PASS
EXACT_VERSION_TAIL_EVENTS=1838
TAIL_NON_OK=0
TAIL_EXCEPTIONS=0
BENIGN_CLIENT_CANCELLATIONS=0
BUS_ACTIVATION=OFF
PRODUCTION_PROMOTED=NO
ROLLBACK_EXECUTED=NO
```

The downloaded candidate artifact independently matches GitHub's ZIP SHA-256 metadata and all 167 manifest entries rehash successfully. The active split contains stable production at 100% plus the exact-head candidate at 0% only.

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
NEXT=AUD_REVIEW_BUS_UNAVAILABLE_CORRECTED_EXACT_HEAD_CANDIDATE
```
