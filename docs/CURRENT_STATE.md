# VOY — Current canonical state

Last reconciled: 2026-08-12

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

## GitHub reconciliation

```text
PRODUCTION_FIRST=COMPLETE
PRODUCTION_RECONCILIATION_DOC=docs/MAP_FIRST_PRODUCTION_RECONCILIATION_20260812.md
PRODUCTION_CHECKPOINT_ISSUE36=5274097115
MAP_FIRST_PR=40
PR40_INITIAL_CONFLICT=docs/CURRENT_STATE.md_ONLY
PRODUCT_CONFLICT=NO
MAIN_PRE_RECONCILIATION_SHA=9aa6ad7bc6aafeefc99fcdf1325a8f22a39337c8
MAP_FIRST_FEATURE_HEAD=a1393939732bea4115ccfa985ff19d17a8f755b0
```

The only divergence from `main` that conflicts with the Map-First branch is this worklog file. Main-only commits since the common base changed only `docs/CURRENT_STATE.md`; no main-only product/runtime file is missing from the Map-First tree.

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
NEXT=COMPLETE_GITHUB_MAIN_RECONCILIATION_WITHOUT_SECOND_PRODUCTION_DEPLOY
ISSUE_39=DO_NOT_START_IN_THIS_BLOCK
```
