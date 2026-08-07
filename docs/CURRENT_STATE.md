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
ISSUE36_MATERIAL_CHECKPOINT_COMMENT=5219047168
```

GitHub is the canonical persistent state. Drive remains historical read-only evidence and must not receive new writes.

## Production — unchanged during Issue #36

```text
PRODUCTIVE_SOURCE_SHA=c6aa7302784ce07415949d2b9b1335919ee2cbbd
PRODUCTIVE_VERSION_ID=9273abef-69ab-451f-b2f0-ace4c8fd3bdd
PRODUCTIVE_TRAFFIC=100%
PRODUCTIVE_DEPLOYMENT_ID=3ef0cc0b-d344-4181-8118-a9b409e44dc6
APPLICATION_VERSION=V8.0.0
BUILD_HASH=c6aa730
BUS_ACTIVATION=OFF
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
PRODUCTION_PROMOTED_BY_ISSUE36=NO
ISSUE36_ROLLBACK_EXECUTED=NO
```

Production health was checked before and after the Issue #36 candidate operation and remained `V8.0.0/c6aa730`. Santa Fe bus remains fail-closed because no accepted authoritative GTFS/GTFS-RT feed with verified compatible feed license and freshness exists.

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

## Issue #36 — total product redesign checkpoint

```text
ISSUE36=COMPLETE_EXACT_HEAD_CANDIDATE_0_AWAITING_AUD
ORDER=VOY-HOVS-TOTAL-PRODUCT-REDESIGN-02
AUD_AUTHORITY=5218359932
BRANCH=feat/issue36-total-product-redesign-01
PR38=OPEN_DRAFT_UNMERGED
EXACT_HEAD=7e2edc5351eb5eb008ac2ca02e638d28d4b828c5
MERGE_PR38=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
```

The redesign is a composition/hierarchy reauthoring rather than a facelift. It implements `CALM_INTELLIGENCE × URBAN_SIGNAL × EDITORIAL_CLARITY`: destination search as functional hero, connected origin/destination construction, true desktop planner+map composition, contextual map, decision-first provider rows, human-readable trust/provenance, explicit theme selection with deliberate dark mode, responsive mobile composition, 48px interactive targets and reduced-motion/accessibility handling. Canonical routing, pricing, provider behavior, data trust, privacy and security semantics remain unchanged. No new runtime/provider/font dependency was introduced.

## Issue #36 immutable visual evidence

```text
BEFORE_RUN=31188934572;SUCCESS
BEFORE_ARTIFACT_ID=8997973225
BEFORE_ARTIFACT_SHA256=7aa31507b76a7c2b7f2d0d76d9f7e2fd76ce0ad0ea92a248037bfb7f27057a83
VISUAL_QA_PASS_1_RUN=31190764684;SUCCESS
VISUAL_QA_PASS_1_ARTIFACT_ID=8998749589
POLISH_PASS_1_HEAD=27200f22f5ad7c7b6d2d1d4167b79b6982d6a38e
VISUAL_QA_PASS_2_RUN=31191383395;SUCCESS
VISUAL_QA_PASS_2_ARTIFACT_ID=8999001664
VISUAL_QA_PASS_2_ARTIFACT_SHA256=f67a736fd6130918bcb688fc055ef4c9185c24a32229a66e4e81663afaf48758
POLISH_PASS_2_HEAD=105eb7cffe3f03655819502e45f74b1a21fec23a
FINAL_AFTER_RUN=31192608499;SUCCESS
FINAL_AFTER_ARTIFACT_ID=8999506605
FINAL_AFTER_ARTIFACT_SHA256=9c0b3009ec954497214792b018731458d711f639f9f78fef20ee2921161e706a
```

BEFORE/AFTER cover `360x800`, `390x844`, `412x915`, `430x932`, `768x1024`, `1024x768`, `1280x800`, `1440x900`, both light/dark themes, plus representative start/search/destination/origin/modes/map/decision/unavailable/external-action/voice/offline/error/legal states.

## Issue #36 exact-head regression

```text
RELEASE_POLICY_RUN=31192611375;SUCCESS
PR_VALIDATION_RUN=31192611671;SUCCESS
UNIT_TESTS=196_PASS;0_FAIL
LOCAL_BROWSER=77_PASS;13_SKIP
CANDIDATE_BROWSER=77_PASS;13_SKIP
LOCAL_REAL_MAP_PIXEL_PROOF=6/6_PASS
LOCAL_REAL_MAP_GEOMETRY_PROOF=6/6_PASS
CANDIDATE_REAL_MAP_PIXEL_PROOF=6/6_PASS
CANDIDATE_REAL_MAP_GEOMETRY_PROOF=6/6_PASS
MAP_VISUAL_PROFILE=ISSUE36_URBAN_SIGNAL
```

A failed pre-candidate run `31191911234` exposed a stale internal pixel analyzer that still required the pre-redesign purple/blue/red overlay palette. Its artifact `8999260196` showed a non-flat real basemap while legacy color counts were zero. The gate was corrected to support the intentional Issue #36 neutral-origin + SIGNAL route/destination language while retaining structural `overlay-ready`, real geometry, route-layer and non-flat-basemap requirements. No Cloudflare version or production traffic write occurred in that failed attempt. Earlier capture/visual tooling failures were also repaired under AUD `5218359932` without runtime mutation.

## Issue #36 Cloudflare exact-head candidate

```text
FINAL_CANDIDATE_RUN=31192605593;SUCCESS
FINAL_CANDIDATE_ARTIFACT_ID=8999760313
FINAL_CANDIDATE_ARTIFACT_SHA256=00faa02d1704ae1bf0b4b362a68f8a8f2d2fe3001400299458870697a7fcc816
ARTIFACT_MANIFEST=167/167_REHASH_PASS
CANDIDATE_SOURCE_SHA=7e2edc5351eb5eb008ac2ca02e638d28d4b828c5
STABLE_VERSION_ID=9273abef-69ab-451f-b2f0-ace4c8fd3bdd
STABLE_TRAFFIC=100%
CANDIDATE_VERSION_ID=5c1a7213-de5d-46a2-a98f-35238c5b809c
CANDIDATE_TRAFFIC=0%
CANDIDATE_DEPLOYMENT_ID=a6f5fb00-567a-4899-b902-14115f34e501
PREVIOUS_DEPLOYMENT_ID=3ef0cc0b-d344-4181-8118-a9b409e44dc6
STABLE_HEALTH=V8.0.0/c6aa730
CANDIDATE_HEALTH=V8.0.0/7e2edc5
CONVERGENCE_ROUNDS=20
CONVERGENCE_DURATION_MS=253975
PRODUCTION_PROMOTED=NO
ROLLBACK_EXECUTED=NO
OBSERVABILITY=DEGRADED_NO_EVENTS
TAIL_EXCEPTIONS=0
```

The candidate is validated at 0% only. Production promotion and merge are not authorized at this checkpoint.

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
NEXT=AUD_REVIEW_COMPLETE_EXACT_HEAD_CANDIDATE
```
