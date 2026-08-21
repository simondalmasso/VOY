# VOY — Current canonical state

Last reconciled: 2026-08-21

## ORDER-046 — terminal zero-traffic candidate checkpoint

```text
ORDER=46
ISSUE=46
PR=47
WORK_BRANCH=feat/order-046-serious-product
PR_STATE=DRAFT_OPEN_UNMERGED
AUD_CONTINUATION_CHECKPOINT=5366791454
PRE_CANDIDATE_CLEAN_HEAD=bf21a60ed49a508e9ff58b014d1899b618ac1d7a
CANDIDATE_EXACT_HEAD=4549acc6e9523e53a740d12ff118917622183c3e
CANDIDATE_WORKFLOW=VOY ORDER-046 Final Candidate 0
CANDIDATE_RUN=32456127358
CANDIDATE_RUN_NUMBER=4
CANDIDATE_RUN_EVENT=push
CANDIDATE_RUN_RESULT=SUCCESS
EXACT_HEAD_RUN=32456131301;SUCCESS
RELEASE_POLICY_RUN=32456131357;SUCCESS
PR_VALIDATE_RUN=32456131319;SUCCESS
CANDIDATE_VERSION_ID=5489843d-db43-4779-83fb-309b5a2dec7e
EFFECTIVE_SPLIT_DEPLOYMENT_ID=fe2f8ac7-2a22-417f-92b2-031b8580e8f8
PREVIOUS_SPLIT_DEPLOYMENT_ID=d1af582d-2bf7-4896-8b1c-5a6e7a5e81dc
STABLE_VERSION_ID=002c464c-15fa-42f3-a762-0214a1dc5cf3
STABLE_TRAFFIC=100%
CANDIDATE_TRAFFIC=0%
LIVE_PRODUCTION_SOURCE_SHA=796c9355cc22a2e197ee719a15b506b5a3cb22b3
LIVE_PRODUCTION_BUILD_HASH=796c935
APPLICATION_VERSION=V8.0.0
PRODUCTION_PROMOTED=NO
ROLLBACK_EXECUTED=NO
MERGE_EXECUTED=NO
```

The V4 candidate is exact to `4549acc6e9523e53a740d12ff118917622183c3e`. This CURRENT_STATE reconciliation is a later documentation-only commit; candidate exact-head evidence is intentionally not attributed to the later docs head. The Cloudflare deployment ID above is the current effective split deployment created to retain the already-live stable version at 100% and the ORDER-046 candidate at 0%; it is distinct from the historical deployment that originally promoted the live `796c935...` product.

### Candidate runtime, data and security gates

```text
SOURCE_TYPECHECK=PASS;0_ERRORS;0_WARNINGS
SOURCE_LINT=PASS
UNIT_TESTS=214_PASS;0_FAIL
LOCAL_CLEAN_PROFILE_BROWSER=110_PASS;0_FAIL;40_SKIP
CANDIDATE_BROWSER=116_PASS;0_FAIL;34_SKIP
BUNDLE_BUDGET=PASS
D1_BINDING=voy-auth
D1_MIGRATIONS_PENDING=NO
D1_SCHEMA_TABLES=voy_sessions,voy_users
D1_VERIFICATION_ROWS_WRITTEN=0
GOOGLE_AUTH_ENABLED=NO
PERSISTENT_ACCOUNT=NO
TRIP_HISTORY_PERSISTED=NO
NATIONAL_TERRITORY=YES
CORE_WITHOUT_LOGIN_VOICE_AI=YES
RUNTIME_API_GATE=PASS
RETIRED_ROUTE_GATE=PASS
```

Candidate `/api/health` returned `ok=true`, `version=V8.0.0`, `build_hash=4549acc`, `national_territory=true`, voice enabled and auth disabled. The auth session gate reported `enabled=false`, `authenticated=false`, `persistent_account=false` and `trip_history_persisted=false`. National territory verification resolved Córdoba as `AR-X`, rejected a non-Argentina probe with the expected 422 contract, and the route probe returned finite normalized geometry. The root returned 200 with the expected CSP and no candidate session cookie.

### Runtime convergence, map proof and tail

```text
CONVERGENCE_CONSECUTIVE_ROUNDS=20
CONVERGENCE_DURATION_MS=200453
REAL_MAP_PIXEL_PROOF=PASS;6_OF_6_VIEWPORTS
REAL_MAP_VIEWPORTS=360x780,360x800,390x844,412x915,430x932,1280x800
REAL_BASEMAP_HTTP=PASS
ROUTE_VISIBLE=YES
ORIGIN_MARKER_VISIBLE=YES
DESTINATION_MARKER_VISIBLE=YES
TAIL_EXACT_VERSION_EVENTS=2240
TAIL_OK_OUTCOMES=2240
TAIL_NON_OK_OUTCOMES=0
TAIL_EXCEPTIONS=0
TAIL_TRUNCATED_RECORDS=0
```

Every persisted tail record was for candidate version `5489843d-db43-4779-83fb-309b5a2dec7e`. HTTP 410 responses were intentional retired-route probes; the single 400 and single 422 were intentional negative API-contract probes and remained successful expected outcomes. No candidate exception or non-ok tail outcome was recorded.

### Immutable evidence

```text
EVIDENCE_ARTIFACT_ID=9437528859
EVIDENCE_ARTIFACT_NAME=voy-order46-final-candidate-32456127358
EVIDENCE_ARTIFACT_BYTES=3856082
EVIDENCE_ARTIFACT_SHA256=e8999b0ce96de9aebc6d039d95aec48514ca789dbe6d19aeb759277cb00a5baa
EVIDENCE_MANIFEST_SHA256=d521d1688ca298e8c4a8969e092e3efd27d5ac4ca411b9753d5e6d61d572b230
API_GATE_SHA256=bc32c04638f890b9ee06c5f344e19bdd9e53b8796cac1c0c7f7502e5b9ee78a0
BINDING_CONTRACT_SHA256=45d544559724f9098e712146f9c412f7cfda3b650b15fbe92c6ab796dce9fd77
CANDIDATE_BROWSER_LOG_SHA256=3de31118f9dfce2885b9560c44b13da0e9175b70ce1bf64ceb04e87aea6b3091
CANDIDATE_TAIL_LOG_SHA256=2ce08bb08b86359c6871d7c6f0cfeb51beb79f264ecfe2cabcaa13accf8ace6d
CONVERGENCE_PROOF_SHA256=967114a71a853f64ca75c02e1c4a43391ffce9134d61fb0b3db22494fc04d016
FINAL_STATE_SHA256=f2d746522ddd20c8499e74e82f6da87d4b84284bbf3b2d862d8c51f4495b9659
ZERO_TRAFFIC_CONTRACT_SHA256=26e642463b5fdae62969666454b4b6f395da4a4587462cd56d9eb54f86eb426b
LOCKFILE_SHA256=e189a028c40e1462cfb7c9e758872d2c4ff89a2d756a2a957634bbe012324ec8
```

ORDER-046 is therefore at a terminal candidate checkpoint for independent AUD review, not at merge or production-promotion authority. Production remains the previously verified Map-First build `796c935...` at 100% traffic.

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
TARGETED_ORIGIN_CORRECTION=5229384435
AUD_RESUME_GATE=5229525690
MAP_FIRST_PRODUCTION_CHECKPOINT=5274097115
ISSUE_39=DEFERRED
```

Production truth has priority over branch state. Earlier candidate and pre-promotion states remain preserved in Git history, Issue #36, `docs/MAP_FIRST_CANDIDATE_RECONCILIATION_20260810.md`, and `docs/MAP_FIRST_PRODUCTION_RECONCILIATION_20260812.md`.

## Production — Map-First live

```text
MAP_FIRST_PROMOTED=YES
PRODUCTIVE_SOURCE_SHA=796c9355cc22a2e197ee719a15b506b5a3cb22b3
PRODUCTIVE_VERSION_ID=002c464c-15fa-42f3-a762-0214a1dc5cf3
PRODUCTIVE_DEPLOYMENT_ID=5097c615-e19c-43ff-8b93-f9eb6115713c
PRODUCTIVE_TRAFFIC=100%
APPLICATION_VERSION=V8.0.0
PRODUCTIVE_BUILD_HASH=796c935
PREVIOUS_STABLE_VERSION_ID=9273abef-69ab-451f-b2f0-ace4c8fd3bdd
PREVIOUS_STABLE_TRAFFIC=0%
ROLLBACK_EXECUTED=NO
BUS_ACTIVATION=OFF
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
AUTH_ENABLED=NO
PERSISTENT_ACCOUNT=NO
TRIP_HISTORY_PERSISTED=NO
```

The production Worker serves the exact Map-First source previously validated as candidate. No DNS, secret, binding, city, BUS or persistent-data mutation accompanied the promotion.

## Map-First product lineage

```text
WORK_BASE=d282dc4703b8bc0ff97462f4be03832052cc3e9b
TARGETED_PRODUCT_CORRECTION_SHA=a806bbed528809391024f28a732eed7b8c04162c
HARNESS_BEFORE_AFTER_FIX=49bd090561b69b8bcd8beab316c6848a5b605de9
DEPENDENT_BROWSER_HELPERS_FIX=27a1bd8d2c4c6b57ad23ff040b6474f993cab04a
REAL_MAP_HELPER_FIX=20f34c61f7347c4a054d77b73a043025935f1b26
HISTORICAL_CANDIDATE_SOURCE_SHA=0f76877e445a481137925fb62bfb1620454fe2b8
HISTORICAL_CANDIDATE_VERSION_ID=6f526066-67a5-4782-95fd-4ec387dc72fe
REBUILT_MAP_FIRST_SOURCE_SHA=796c9355cc22a2e197ee719a15b506b5a3cb22b3
REBUILT_MAP_FIRST_CANDIDATE_VERSION_ID=002c464c-15fa-42f3-a762-0214a1dc5cf3
REBUILT_MAP_FIRST_CANDIDATE_DEPLOYMENT_ID=033940e9-cae2-4d70-934d-7e95668e40ed
```

Verified targeted origin behavior:
- initial manual origin is absent/hidden;
- initial actions are `Usar mi ubicación` and compact `Definir origen`;
- `Aplicar` is absent;
- `Definir origen` opens and focuses manual origin;
- GPS denied/unavailable opens and focuses manual origin;
- Enter or deterministic selection commits the origin;
- Back/Escape closes the transient origin state and restores focus;
- `planTrip()` does not depend on `origin-apply`;
- manual-open and GPS-denied are independently browser-tested.

## Final production verification

```text
FINALIZATION_WORKFLOW=VOY Map-First Production Finalize V4
FINALIZATION_RUN=31651286356
FINALIZATION_RESULT=SUCCESS
ENTRY_CONTROL=candidate
ENTRY_HEALTH=candidate
ENTRY_ALREADY_PROMOTED=YES
CONVERGENCE_CONSECUTIVE_ROUNDS=20
CONVERGENCE_DURATION_MS=140433
PUBLIC_BROWSER=95_PASS;25_SKIP
UNIT_TESTS=204_PASS;0_FAIL
TYPECHECK=PASS
LINT=PASS
RELEASE_POLICY=PASS
PRODUCTION_TAIL=PASS
TAIL_EXACT_VERSION_EVENTS=>=1
TAIL_NON_OK=0
TAIL_EXCEPTIONS=0
MOBILITY_TRUST=PASS
PRODUCTION_EVIDENCE_ARTIFACT_ID=9162802913
PRODUCTION_EVIDENCE_ARTIFACT_SHA256=cba8f19d15da7dfba8da0de1961ae92fce04ac6ad121f9aaf8675e9f3fc190db
PRODUCTION_EVIDENCE_FILE_COUNT=98
```

The public production browser suite covered mobile and desktop Map-First composition, progressive origin disclosure, map occlusion, sheet/camera behavior, search focus, Back/Escape hierarchy, external-action confirmation, real basemap, markers and route rendering.

## Promotion failure ledger

### V2 — pre-write harness parse failure

```text
RUN=31649501071
RESULT=FAILURE
CAUSE=PROMOTION_SHELL_PARSE_ERROR
PREWRITE_GATES=PASS
PRODUCTION_WRITE=NO
```

V2 reached the promotion step only after full source/candidate/browser/Cloudflare preflight, but Bash rejected the promotion block before executing any command. Production was not mutated.

### V3 — production write succeeded; immediate edge assertion was stale

```text
RUN=31650318280
PROMOTION_WRITE=SUCCESS
NEW_SPLIT=9273abef...@0%;002c464c...@100%
POST_WRITE_VERIFIER=FAILURE
CAUSE=IMMEDIATE_PUBLIC_HEALTH_CHECK_DID_NOT_ALLOW_EDGE_PROPAGATION
ROLLBACK_EXECUTED=NO
```

V3 successfully changed Cloudflare traffic. Its verifier then treated the first stale public health response as a hard failure. This was a validation-harness defect, not product regression evidence.

### V4 — propagation-safe finalization

V4 separated control-plane traffic from edge propagation, armed a single rollback before post-promotion validation, reconstructed the live state, found both control plane and health already on Map-First, issued no second promotion, then completed bounded convergence, public browser, mobility-trust and exact-version tail verification.

## Permanent mobility and safety invariants

- Browser does not call Nominatim, OSRM or Mobility Database directly.
- BUS remains disabled without accepted authoritative GTFS with verified license, freshness and validation.
- Mobility Database remains discovery-only.
- APP_ONLY providers expose no fabricated numeric fare.
- AI does not calculate canonical routes, fares, times, availability or rankings.
- External actions require explicit expiring single-use confirmation.
- Audio, transcripts and exact-location history are not persistently stored.
- VOY works without login, voice or AI.

## GitHub reconciliation — complete

```text
PRODUCTION_FIRST=COMPLETE
PRODUCTION_RECONCILIATION_DOC=docs/MAP_FIRST_PRODUCTION_RECONCILIATION_20260812.md
PRODUCTION_CHECKPOINT_ISSUE36=5274097115
INITIAL_MAP_FIRST_PR=40;SUPERSEDED_BY_CONFLICT_RESOLUTION
PR40_CONFLICT=docs/CURRENT_STATE.md_ONLY
PRODUCT_CONFLICT=NO
RECONCILIATION_PR=41;MERGED
RECONCILIATION_TREE_COMMIT=ca7a39825f54555f5469f39b6c9a4a4390c0fc07
MAIN_MAP_FIRST_MERGE_SHA=9475b26445f45490abd69576cce514c7c651fa9e
MAIN_POST_MERGE_VALIDATION_RUN=31652416764;SUCCESS
MAIN_POST_MERGE_RELEASE_POLICY_RUN=31652416812;SUCCESS
POST_MERGE_PRODUCTION_HEALTH_READ_ONLY=PASS
POST_MERGE_PRODUCTION_BROWSER_READ_ONLY=PASS
SECOND_PRODUCTION_DEPLOY_AFTER_MERGE=NO
MAIN_PRE_RECONCILIATION_SHA=9aa6ad7bc6aafeefc99fcdf1325a8f22a39337c8
MAP_FIRST_FEATURE_HEAD_AT_RECONCILIATION=a1393939732bea4115ccfa985ff19d17a8f755b0
```

Main-only commits before reconciliation changed only `docs/CURRENT_STATE.md`; no main-only product/runtime file was missing from the Map-First tree. The conflict was resolved with an explicit two-parent merge tree preserving the full Map-First product, followed by PR #41. Main validation after merge rechecked release policy, deterministic build/dry-run, local browser, production health and production browser without issuing a Cloudflare write.

## Historical anchors

```text
ISSUE34_TERMINAL_AUD=5217823220
ISSUE34_PR37_MERGE_SHA=f9cbecc6761048fc1fabb0c4135e7b5568c840c2
ISSUE36_AUDITED_DESIGN_HEAD=27c5f0395241d5eff9fac0202f1e7ded9cc24d31
ISSUE36_MAP_FIRST_AMENDMENT=5224435211
ISSUE36_MAP_FIRST_AUD_PASS=5228862173
ISSUE36_TARGETED_ORIGIN_CORRECTION=5229384435
ISSUE36_AUD_RESUME_GATE=5229525690
HISTORICAL_PRE_TARGETED_CANDIDATE_VERSION_ID=1610c90d-c06c-48b4-af9c-54979990f124
```

## Next step

```text
ORDER46_CANDIDATE_CHECKPOINT=COMPLETE
ORDER46_CANDIDATE_EXACT_HEAD=4549acc6e9523e53a740d12ff118917622183c3e
NEXT=INDEPENDENT_AUD_TERMINAL_REVIEW_OF_ORDER46
NO_MERGE_WITHOUT_ARQ_AUTHORIZATION=YES
NO_PRODUCTION_PROMOTION_WITHOUT_ARQ_AUTHORIZATION=YES
ISSUE_39=DO_NOT_START_IN_THIS_BLOCK
```
