# VOY — Current canonical state

Last reconciled: 2026-08-09

## Authority and source of truth

```text
CANONICAL_STATE=GITHUB
REPOSITORY=simonkey888/VOY
REPOSITORY_WORKLOG=docs/CURRENT_STATE.md
RUNTIME_TRUTH=VERIFIED_PRODUCTION_AND_CLOUDFLARE_EFFECTIVE_STATE
DRIVE=LEGACY_READ_ONLY
NEW_DRIVE_WRITES=NO
ISSUE36_ORDER=VOY-HOVS-TOTAL-PRODUCT-REDESIGN-02
MAP_FIRST_AMENDMENT=5224435211
MAP_FIRST_AUD_PASS=5228862173
INTERMEDIATE_AUD=NO
MERGE_AUTHORIZED=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
```

GitHub remains the canonical persistent state. Production truth has priority over branch state. The map-first implementation completed as an auditable Cloudflare candidate at zero traffic; it has not been merged or promoted.

## Production — unchanged

```text
PRODUCTIVE_SOURCE_SHA=c6aa7302784ce07415949d2b9b1335919ee2cbbd
PRODUCTIVE_VERSION_ID=9273abef-69ab-451f-b2f0-ace4c8fd3bdd
PRODUCTIVE_TRAFFIC=100%
APPLICATION_VERSION=V8.0.0
PRODUCTIVE_BUILD_HASH=c6aa730
BUS_ACTIVATION=OFF
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
MAP_FIRST_PROMOTED=NO
ROLLBACK_EXECUTED=NO
```

Production health was verified immediately before and after the candidate operation as `V8.0.0/c6aa730`. The final Cloudflare split leaves the existing stable version at 100% and the new map-first candidate at 0%.

## Issue #36 — map-first material checkpoint

```text
IMPLEMENTATION_BASE=bf6c4fd36eafcdab78e7e0ce33f99696541f553c
BRANCH=feat/map-first-interaction-01
CANDIDATE_SOURCE_SHA=a2ed6f6cca2e3f5b999c21eac104bfbf4ad8c5d9
CANDIDATE_VERSION_ID=1610c90d-c06c-48b4-af9c-54979990f124
CANDIDATE_VERSION_NUMBER=130
CANDIDATE_TRAFFIC=0%
CANDIDATE_DEPLOYMENT_ID=bce377be-d4d9-4f10-af80-840acd9821ea
PREVIOUS_DEPLOYMENT_ID=20f2e1c3-e705-43e2-9974-c8a01dbbe4ca
STABLE_VERSION_ID=9273abef-69ab-451f-b2f0-ace4c8fd3bdd
STABLE_TRAFFIC=100%
STABLE_HEALTH=V8.0.0/c6aa730
CANDIDATE_HEALTH=V8.0.0/a2ed6f6
PRODUCTION_PROMOTED=NO
ROLLBACK_EXECUTED=NO
```

The map-first amendment introduces a coordinated interaction state model rather than independent component-owned visual state. Search, origin, map, progressive decision sheet, confirmation, voice, browser Back/Escape and mobile keyboard behavior are coordinated centrally. Canonical fare, routing, provider, data, privacy and trust semantics were not moved into UI logic.

## Interaction / map-first contract

Implemented and gated states:

```text
IDLE
SEARCH_FOCUSED
SEARCH_RESULTS
DESTINATION_SELECTED
ORIGIN_REQUIRED
ORIGIN_READY
ROUTE_LOADING
ROUTE_READY
DECISION_PEEK
DECISION_HALF
DECISION_EXPANDED
EXTERNAL_CONFIRMATION
VOICE_ACTIVE
OFFLINE
ERROR_RECOVERABLE
```

Verified properties:
- Search/results are the primary transient layer and remain dismissible with Back/Escape.
- Manual origin is recoverable after location permission denial.
- Geolocation is never requested automatically on load.
- Decision sheet uses `peek / half / expanded` snaps.
- Map camera padding follows stable snap state; dragging the sheet does not continuously recenter the map.
- Provider confirmation does not reset the map and temporarily owns interaction hierarchy.
- Initial mobile map-first geometry preserves the required unobscured usable-map budget.
- Mobile keyboard/search removes competing sheet chrome without accidental horizontal overflow.
- Real interactive hit areas remain at least 44px despite compact optical styling.
- `prefers-reduced-motion` removes map-first transition timing.

Coverage ledger: `docs/design/MAP_FIRST_COVERAGE.md`.

## Two explicit polish passes

```text
POLISH_PASS_1=f7fdd3889c0700d13fd9fef20c3ee34090a2aa51
POLISH_PASS_2=b83d274f53d5e0323ae027db30d74c33c4ad5084
```

Pass 1 hardened decision-sheet contrast over real basemaps, removed redundant selected-destination status and reduced mode-rail chrome. Pass 2 refined active-mode hierarchy, peek destination readability and narrow initial-strip density. Later regression found and corrected a real 44px target violation without weakening the accessibility gate.

## Regression and before/after evidence

Final pre-candidate product/harness head: `8d2ddaa21f8b7eb753b21f7a6bcf944546a82f9b`.

```text
MAP_FIRST_QA_RUN=31287404549;SUCCESS
MAP_FIRST_BROWSER_RUN=31287404517;SUCCESS
MAP_FIRST_BEFORE_AFTER_RUN=31287404531;SUCCESS
MAP_FIRST_FULL_REGRESSION_RUN=31287404525;SUCCESS
UNIT_TESTS=204_PASS;0_FAIL
FULL_BROWSER=83_PASS;25_SKIP
TYPECHECK=PASS
LINT=PASS
BUILD=PASS
ASSET_POLICY=PASS
BUNDLE_BUDGET=PASS
WRANGLER_DRY_RUN=PASS
```

Immutable BEFORE/AFTER:

```text
BEFORE_SHA=bf6c4fd36eafcdab78e7e0ce33f99696541f553c
AFTER_SHA=8d2ddaa21f8b7eb753b21f7a6bcf944546a82f9b
CASES=6
FAILURES=NONE
BEFORE_AFTER_ARTIFACT_ID=9030288145
BEFORE_AFTER_ARTIFACT_SHA256=ce1f0ffeee732312687eb861208f4c17d96c21dc7ad69524d02f41bbfaf4f668
BEFORE_AFTER_MANIFEST_SHA256=b5dc96cf603eae99d5d396419172ec723026fbf0f31ab26d4bc2d8d1d3df73e7
BEFORE_AFTER_MANIFEST_REHASH=29/29_PASS
FULL_REGRESSION_ARTIFACT_ID=9030312038
FULL_REGRESSION_ARTIFACT_SHA256=e05094bc641282f3c6db60485e4121bf76415d22c4ecd419692d86676d26bce0
```

The final candidate pipeline repeated exact-head local regression after the release marker and passed `89 browser tests / 25 skipped` before candidate creation, then passed the same `89 / 25` against the exact Cloudflare candidate with real map/browser gates.

## Cloudflare final candidate evidence

```text
FINAL_CANDIDATE_RUN=31287544694;SUCCESS
FINAL_CANDIDATE_ARTIFACT_ID=9030441782
FINAL_CANDIDATE_ARTIFACT_SHA256=3c633808e8407e45d1d61bb699dfb8f632763f5def59a1577d921e9c4b94a664
FINAL_CANDIDATE_MANIFEST_SHA256=ee31bc5f3086571567d8fc193fc3b97c73366349465a81ebd5f72560e4043219
FINAL_CANDIDATE_MANIFEST_REHASH=131/131_PASS
BINDING_PARITY=16/16_PASS
CONVERGENCE_ROUNDS=20
CONVERGENCE_DURATION_MS=157765
LOCAL_REAL_MAP_PIXEL_PROOF=6/6_PASS
LOCAL_REAL_MAP_GEOMETRY_PROOF=6/6_PASS
CANDIDATE_REAL_MAP_PIXEL_PROOF=6/6_PASS
CANDIDATE_REAL_MAP_GEOMETRY_PROOF=6/6_PASS
BASEMAP_VISIBLE=YES
ORIGIN_MARKER_VISIBLE=YES
DESTINATION_MARKER_VISIBLE=YES
ROUTE_VISIBLE=YES
OBSERVABILITY=PASS
EXACT_VERSION_TAIL_EVENTS=1635
TAIL_NON_OK=0
TAIL_EXCEPTIONS=0
BENIGN_CLIENT_CANCELLATIONS=0
```

The downloaded candidate artifact independently matches GitHub artifact metadata and all 131 manifest entries rehash successfully. The candidate health is `V8.0.0/a2ed6f6`; the stable production health remains `V8.0.0/c6aa730`.

The first candidate attempt (`31287155158`) failed before any Cloudflare version upload because the inherited candidate script selected a named production-baseline browser test that was missing from the repository. That internal harness failure was corrected by restoring the intended read-only baseline test; the candidate script itself was not weakened. No Cloudflare mutation occurred in the failed attempt.

## Performance snapshot

No new production dependency, animation framework, heavy UI framework or map engine was added.

```text
PRODUCTION_DEPENDENCIES=2
CRITICAL_JS_GZIP=18018_B
INITIAL_CSS_GZIP=17268_B
LAZY_MAP_GZIP=217320_B
LAZY_VOICE_GZIP=17610_B
```

BEFORE/AFTER controlled captures recorded JS/CSS transfer, LCP, observed event duration, CLS, long tasks and map usable time. All six light/dark mobile/desktop cases passed the configured regression thresholds with no horizontal overflow.

## Mobility truth after candidate operation

```text
MOBILITY_TRUST_API=PASS
SANTA_FE_BUS_ACTIVATION=OFF
BUS_REASON=NO_ACCEPTED_AUTHORITATIVE_GTFS_WITH_VERIFIED_LICENSE_AND_FRESHNESS
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
GTFS_VALIDATOR=MobilityData_gtfs-validator_v8.0.1
GTFS_VALIDATOR_SHA256=19293ddd9b6f954f216d4f12054bd8a3232921751c4484339e339764a91000e2
```

Permanent invariants remain:
- browser does not call Nominatim, OSRM or Mobility Database directly;
- BUS stays disabled without verified source/license/freshness/validation;
- APP_ONLY providers expose no fabricated numeric fare;
- AI does not calculate canonical routes, fares, times, availability or rankings;
- external actions require explicit expiring single-use confirmation;
- audio/transcripts/exact-location history are not persistently stored;
- VOY works without login, voice or AI.

## Historical anchors

```text
ISSUE34_TERMINAL_AUD=5217823220
ISSUE34_PR37_MERGE_SHA=f9cbecc6761048fc1fabb0c4135e7b5568c840c2
ISSUE36_AUDITED_DESIGN_HEAD=27c5f0395241d5eff9fac0202f1e7ded9cc24d31
ISSUE36_MAP_FIRST_AMENDMENT=5224435211
ISSUE36_MAP_FIRST_AUD_PASS=5228862173
```

## Next authorized sequence

```text
MAP_FIRST_IMPLEMENTATION=COMPLETE
MAP_FIRST_CANDIDATE_0_PERCENT=VALIDATED
MERGE=NO
PRODUCTION_PROMOTION=NO
NEXT=AUD_MATERIAL_MAP_FIRST_REVIEW
```
