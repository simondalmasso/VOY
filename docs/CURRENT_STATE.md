# VOY — Current canonical state

Last reconciled: 2026-08-14

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
ISSUE_39=ARQ_MATERIAL_CHECKPOINT_READY_FOR_INDEPENDENT_AUD
ISSUE39_AUD_PASS_TO_RESUME=5288893154
ISSUE39_SECRET_GATE_5275601404=SUPERSEDED_REFUTED
ISSUE39_VISUAL_DIRECTIVE=5288808652
```

Production truth has priority over branch state. Earlier candidate and pre-promotion states remain preserved in Git history, Issue #36, `docs/MAP_FIRST_CANDIDATE_RECONCILIATION_20260810.md`, and `docs/MAP_FIRST_PRODUCTION_RECONCILIATION_20260812.md`.

## Production — Map-First live

```text
MAP_FIRST_PROMOTED=YES
PRODUCTIVE_SOURCE_SHA=796c9355cc22a2e197ee719a15b506b5a3cb22b3
PRODUCTIVE_VERSION_ID=002c464c-15fa-42f3-a762-0214a1dc5cf3
PRODUCTIVE_TRAFFIC=100%
EFFECTIVE_CLOUDFLARE_DEPLOYMENT_ID=0294e009-da2f-4f72-a336-c721483e6d73
APPLICATION_VERSION=V8.0.0
PRODUCTIVE_BUILD_HASH=796c935
ISSUE39_CANDIDATE_SOURCE_SHA=48a9ed2817ab6cdd7a8c8a2e1a62f9c231a495e1
ISSUE39_CANDIDATE_VERSION_ID=94384215-f057-4641-b453-4364bb1d851c
ISSUE39_CANDIDATE_TRAFFIC=0%
ROLLBACK_EXECUTED=NO
BUS_ACTIVATION=OFF
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
AUTH_ENABLED=NO
PERSISTENT_ACCOUNT=NO
TRIP_HISTORY_PERSISTED=NO
```

The Issue #39 candidate was materialized at zero traffic only. Production remains on the exact Map-First stable version `002c464c-15fa-42f3-a762-0214a1dc5cf3` at 100%. No merge, production promotion, rollback, DNS, secret, city, BUS or persistent-data mutation accompanied the candidate block.

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

## Final production verification — Map-First

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

## Issue #39 — global adversarial correction and candidate 0% checkpoint

```text
ISSUE=39
PR=42
PR_STATE=DRAFT_OPEN_UNMERGED
AUD_PASS_TO_RESUME=5288893154
SECRET_GATE_5275601404=SUPERSEDED_REFUTED
VISUAL_DIRECTIVE=5288808652
MERGE_AUTHORIZED=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
ROLLBACK_EXECUTED=NO
PRODUCTION_TRAFFIC_MUTATION=NO
CANDIDATE_CONTROL_PLANE_WRITE=YES_ZERO_TRAFFIC_ONLY
```

### Scanner and supply chain

```text
SECRET_CLASSIFIER_RUN=31765930764
SECRET_CLASSIFIER_RESULT=SUCCESS
SECRET_CLASSIFIER_CANDIDATE_PATHS=0
SECRET_CLASSIFIER_CURRENT_REALISTIC_CANDIDATES=0
SECRET_CLASSIFIER_GATE=PASS_NO_CURRENT_REALISTIC_SECRET_PATTERN
SUPPLY_CHAIN_REFRESH_RUN=31766373911
SUPPLY_CHAIN_REFRESH_RESULT=SUCCESS
BUN=1.3.14
WRANGLER=4.122.0
CLOUDFLARE_VITE_PLUGIN=1.52.0
NANOID_OVERRIDE=3.3.18
BUN_AUDIT=NO_VULNERABILITIES_FOUND
```

The original secret gate was a scanner false positive caused by an over-broad Cloudflare credential pattern. The corrected classifier uses strict current/legacy formats without printing values and found no current realistic secret pattern. The dependency refresh removed the transitive `nanoid` advisory and passed release policy, typecheck, lint, tests, build, budget and Wrangler dry-run.

### Confirmed findings corrected

- stale numeric coefficients for private ride apps were removed from public territorial truth;
- coverage copy was reconciled with absent bus-stop/bike-station runtime data;
- private-provider availability now expires after a bounded 30-day freshness window;
- OSRM requests use canonical 4-decimal coordinates and matching cache identity, 8-second timeout, strict schema/geometry/end-point validation and explicit straight-line fallback;
- trip route duration is not presented as provider pickup ETA;
- walk/bike feasibility does not imply verified infrastructure;
- territorial `/cities/*` payloads are network-only in the service worker and fail closed offline; `/api/*` remains outside SW caching;
- Voice daily rate limiting moved from isolate memory to the existing Durable Object boundary;
- auth/session/nonce/CSRF/JWT validation remains implemented while production auth remains disabled;
- telemetry respects GPC, DNT and the VOY analytics opt-out boundary;
- BUS remains off and Mobility Database remains discovery-only.

### Visual directive — VOY Wayfinding v1

```text
DIRECTIVE=5288808652
RESULT=IMPLEMENTED_AND_GATED
VISUAL_SYSTEM=voy-wayfinding-v1
UBER_RECOLOR_CLONE=NO
```

The candidate uses a VOY-specific wayfinding grammar rather than ride-hailing chrome: route-spine journey builder, diamond waypoints, cut/notched surfaces, a non-pill mode dock, signaletic decision sheet, instrumented map frame and semantic VOY tokens. Product truth, test IDs and deterministic routing/origin/destination contracts remain unchanged by the visual layer.

### Exact-head pre-candidate regression

```text
FINAL_PREOP_PRODUCT_HEAD=f564db460df011d2a50b3262fcf2db26d84665c3
PREOP_RUN=31801155519
PREOP_RESULT=SUCCESS
UNIT_TESTS=213_PASS;0_FAIL
RELEASE_POLICY=PASS
TYPECHECK=PASS
LINT=PASS
BUILD=PASS
BUDGET=PASS
WRANGLER_DRY_RUN=PASS
CLEAN_PROFILE_BROWSER=PASS
ISSUE39_NINE_VIEWPORT_MATRIX=PASS
MOBILE_360_MAP_GATE=>=55_PERCENT
TABLET_768_LATERAL_COMPOSITION=PASS
SHEET_DRAG_CAMERA_STABILITY=PASS
```

The UX harness was corrected without relaxing product gates: isolated local server/port, serial execution, service worker blocked only inside the UX harness, tablet classified according to the real 760px composition breakpoint, and camera-fit sampling stabilized before drag. The real 360x800 product gap was corrected by compacting only the passive decision hint; the 55% unobscured-map threshold and 44px interactive-target requirements were preserved.

### Candidate creation and first causal failure

```text
CANDIDATE_RUNTIME_SOURCE_SHA=48a9ed2817ab6cdd7a8c8a2e1a62f9c231a495e1
CANDIDATE_VERSION_ID=94384215-f057-4641-b453-4364bb1d851c
CANDIDATE_DEPLOYMENT_ID=0294e009-da2f-4f72-a336-c721483e6d73
STABLE_VERSION_ID=002c464c-15fa-42f3-a762-0214a1dc5cf3
STABLE_TRAFFIC=100%
CANDIDATE_TRAFFIC=0%
BINDING_PARITY=15/15_PASS
CONVERGENCE=20_ROUNDS;186879_MS;PASS
CANDIDATE_CREATION_RUN=31802139872
CANDIDATE_CREATION_RUN_RESULT=FAILURE_AFTER_CANDIDATE_CREATED
FIRST_CAUSAL_ERROR=VOICE_STT_429_STT_RATE_LIMITED
PRODUCT_FAILURE=NO_CONFIRMED
PRODUCTION_CHANGED=NO
```

The candidate was already materialized at 0% and generic API/convergence checks had passed when the old Voice live gate treated the shared Durable Object STT quota as a mandatory happy-path prerequisite. The quota is keyed by a hash of the connecting IP, has `maxDailyStt=30`, persists in the Durable Object, and test requests consume the same fail-closed bucket. No quota bypass, reset or increase was added.

### Validation-only resume of the existing candidate

```text
VALIDATION_ONLY_HEAD=c03d7c30df2636f1cd5d5332f8bbc99193a47128
POST_CANDIDATE_RUNTIME_DRIFT=NO
POST_CANDIDATE_CHANGED_PATHS=.github/workflows/issue39-existing-candidate-resume.yml;.issue39-existing-candidate-resume-ready
RESUME_RUN=31803652216
RESUME_RESULT=SUCCESS
ARTIFACT_ID=9220637356
ARTIFACT_NAME=voy-issue39-existing-candidate-resume-31803652216
ARTIFACT_SIZE_BYTES=3300584
ARTIFACT_ZIP_SHA256=056175549643bb0bac17b71ccbadf21cb285e7a93687d30c231e50173dc76f53
ARTIFACT_EXPIRED=NO
```

Fresh preflight and final recheck both proved:

```text
EFFECTIVE_DEPLOYMENT_ID=0294e009-da2f-4f72-a336-c721483e6d73
STABLE=002c464c-15fa-42f3-a762-0214a1dc5cf3@100%
CANDIDATE=94384215-f057-4641-b453-4364bb1d851c@0%
PRODUCTION_HEALTH=V8.0.0/796c935
CANDIDATE_HEALTH=V8.0.0/48a9ed2
BINDING_PARITY=15/15_PASS
PRODUCTION_UNCHANGED=YES
```

Candidate validation evidence:

```text
DETERMINISTIC_CONTRACTS=PASS
GENERIC_CANDIDATE_API=PASS
UNIT_TESTS=213_PASS;0_FAIL
CANDIDATE_CLEAN_PROFILE_BROWSER=124_PASS;26_SKIP
CANDIDATE_REAL_MAP_PIXEL_GEOMETRY=PASS;6_PROFILES
CANDIDATE_ISSUE39_NINE_VIEWPORT_MATRIX=163_PASS;26_SKIP
TAIL_EXACT_VERSION_EVENTS=2497
TAIL_NON_OK=0
TAIL_EXCEPTIONS=0
VOICE_CAPABILITIES=PASS
VOICE_SESSION=PASS
VOICE_STT_LIVE=STT_RATE_LIMIT_FAIL_CLOSED_SHARED_QUOTA;HTTP_429
VOICE_CHAT_LIVE=CHAT_RATE_LIMIT_FAIL_CLOSED_SHARED_QUOTA;HTTP_429
VOICE_QUOTA_BYPASS_ADDED=NO
VOICE_QUOTA_RESET_OR_INCREASE=NO
```

The Voice happy path was not re-labeled as executed when shared persistent quota was exhausted. Instead, the resume gate accepted only either a valid 200 STT response or the exact fail-closed `429/stt_rate_limited`, and likewise classified the exact chat rate-limit response. Tool/confirmation safety remains covered by deterministic contracts; no live single-use external action was claimed when the shared chat quota prevented that path.

### Remaining non-blocking evidence / debt

- the legacy worker remains reachable through the current wrapper architecture, but retired named assets are 410 and browser code does not call Nominatim or OSRM directly; removing the wrapper was not justified inside this correction block;
- historical workflow action refs by major tags are supply-chain hardening debt, not evidence of a production bypass by themselves;
- Voice live happy-path coverage is partial for this run because the real persistent shared quota was exhausted; fail-closed behavior is proven and no bypass was introduced;
- no canonical all-hypotheses count matrix existed on the branch at checkpoint time. ARQ does not invent `HYPOTHESES_TOTAL/CONFIRMED/REFUTED/PARTIAL/UNKNOWN` or an independent PASS verdict; independent AUD must reconcile the evidence into its final classification.

## Permanent mobility and safety invariants

- Browser does not call Nominatim, OSRM or Mobility Database directly.
- BUS remains disabled without accepted authoritative GTFS with verified license, freshness and validation.
- Mobility Database remains discovery-only.
- APP_ONLY providers expose no fabricated numeric fare.
- AI does not calculate canonical routes, fares, times, availability or rankings.
- External actions require explicit expiring single-use confirmation.
- Audio, transcripts and exact-location history are not persistently stored.
- VOY works without login, voice or AI.

## GitHub reconciliation — Map-First complete

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
ISSUE39_OPERATIONAL_BLOCK=COMPLETE
ISSUE39_MATERIAL_CHECKPOINT=READY_FOR_INDEPENDENT_AUD
CANDIDATE_RUNTIME_SOURCE=48a9ed2817ab6cdd7a8c8a2e1a62f9c231a495e1
CANDIDATE_VERSION=94384215-f057-4641-b453-4364bb1d851c@0%
STABLE_VERSION=002c464c-15fa-42f3-a762-0214a1dc5cf3@100%
MERGE=NO
PRODUCTION_PROMOTION=NO
NEXT=AUD_FINAL_INDEPENDENT_REVIEW_ISSUE39_CANDIDATE_0
```
