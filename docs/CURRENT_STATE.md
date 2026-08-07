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
ISSUE36_ORDER=OPEN_NOT_YET_MATERIAL_EXECUTION
```

GitHub is the canonical persistent state from this checkpoint onward. The prior Google Drive Milestone A document remains historical read-only evidence and must not be updated. Detailed pre-terminal Issue #34 evidence remains preserved in Git history through `main@3f8e096b7065d41f9749e5613b329736b7301055`, Issue #34 comments `5217164821`, `5217321670`, `5217585109`, `5217823220`, and immutable Actions artifacts.

## Issue #34 — terminal result

```text
ISSUE34=TERMINAL_GREEN_PENDING_ONLY_ISSUE_CLOSE_AT_THIS_COMMIT
MILESTONE_A=PASS
AUD_PASS=5217823220
AUDITED_SOURCE_SHA=c6aa7302784ce07415949d2b9b1335919ee2cbbd
PR37=MERGED
PR37_MERGE_SHA=f9cbecc6761048fc1fabb0c4135e7b5568c840c2
PRODUCTIVE_SOURCE_SHA=c6aa7302784ce07415949d2b9b1335919ee2cbbd
PRODUCTIVE_VERSION_ID=9273abef-69ab-451f-b2f0-ace4c8fd3bdd
PRODUCTIVE_TRAFFIC=100%
PRODUCTIVE_DEPLOYMENT_ID=3ef0cc0b-d344-4181-8118-a9b409e44dc6
PREVIOUS_STABLE_VERSION_ID=2f86d708-b905-4c33-b1fe-d881467e8542
PREVIOUS_STABLE_TRAFFIC=0%
APPLICATION_VERSION=V8.0.0
BUILD_HASH=c6aa730
ROLLBACK_EXECUTED=NO
BUS_ACTIVATION=OFF
PHASE5=NO_FEED
MOTIS_OTP=NOT_RUN_CONDITION_NOT_MET
ROUTER_BACKEND_DECISION=NO_CHANGE
COST_USD=0
CARD_OR_BILLING_USED=NO
SECRETS_EXPOSED=NO
```

AUD `5217823220` authorized the exact Milestone A candidate for terminal production close. EJE rechecked the audited Git/Cloudflare identity, source, bindings, candidate health, Mobility Trust contract, real map proof and product gates before changing traffic. The exact candidate `9273abef-69ab-451f-b2f0-ace4c8fd3bdd` was then promoted to 100%. The previous stable version moved to 0%. No rollback was required.

## Terminal production evidence

```text
TERMINAL_OPERATOR_BRANCH=ops/issue34-terminal-close-01
TERMINAL_OPERATOR_COMMIT=dbf0b7d8b6d029ebfc5db048c27ed1d04e80f19b
TERMINAL_RUN=31185141780;SUCCESS
UNIT_TESTS=196_PASS;0_FAIL
PRODUCTION_BROWSER=53_PASS;13_SKIP
PRODUCTION_CONVERGENCE=20_CONSECUTIVE_PASS
PRODUCTION_CONVERGENCE_DURATION_MS=137964
PRODUCTION_HEALTH=V8.0.0/c6aa730
MOBILITY_TRUST_API=PASS
BUS_LICENSE_STATUS=UNKNOWN
BUS_OPERATIONAL_STATUS=UNAVAILABLE
BUS_ACTIVATION=OFF
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
TAIL_OBSERVABILITY=DEGRADED_NO_EVENTS
TAIL_EXCEPTIONS=0
TAIL_NON_OK=0
TERMINAL_ARTIFACT_ID=8996545635
TERMINAL_ARTIFACT_SHA256=284c250f78b875ec718af554aa989d696066b929df66ac10cc4f5df50e53f775
TERMINAL_MANIFEST_SHA256=faf0522c76d9eabb70f439357ede304961d98e6f13bd8d70165e668b41032f27
TERMINAL_MANIFEST_LINES=119
TERMINAL_MANIFEST_REHASHABLE_FROM_DOWNLOADED_ZIP=117/119
TERMINAL_ARTIFACT_PACKAGING_DEBT=2_HIDDEN_PLAYWRIGHT_LAST_RUN_FILES_OMITTED_BY_UPLOAD_ARTIFACT
RUNTIME_EVIDENCE_FAILURE=NO
```

The terminal artifact ZIP digest independently matches GitHub artifact metadata. Two hidden Playwright `.last-run.json` files were listed by the on-runner manifest but omitted by the default `upload-artifact` hidden-file behavior, so the downloaded ZIP can independently rehash 117 of 119 manifest entries, not 119/119. This is recorded as evidence-packaging debt and is not misreported as a runtime PASS. The material production proofs—deployment state, health, trust endpoint, browser results, convergence, tests and promotion logs—are present in the artifact and passed.

## Post-merge GitHub validation

```text
MAIN_AFTER_PR37=f9cbecc6761048fc1fabb0c4135e7b5568c840c2
RELEASE_POLICY_RUN=31185910160;SUCCESS
MAIN_VALIDATION_RUN=31185913893;SUCCESS
MAIN_LOCAL_BROWSER=PASS
MAIN_PRODUCTION_HEALTH_READ_ONLY=PASS
MAIN_PRODUCTION_BROWSER_SMOKE_READ_ONLY=PASS
PRODUCTIVE_ANCESTRY_PRESERVED=YES
```

PR #37 was merged using a merge commit rather than squash/rebase so the audited and productive SHA `c6aa7302784ce07415949d2b9b1335919ee2cbbd` remains in canonical main ancestry. The first merge call was rejected only because the PR was still Draft; no repository or runtime mutation occurred. The PR was marked Ready for Review and the exact same audited head was then merged successfully.

## Issue #34 data outcome

```text
SANTA_FE_GTFS_ACCEPTED=NO
SANTA_FE_GTFS_RT_ACCEPTED=NO
SANTA_FE_TRANSIT_RESULT=NO_FEED
BUS_ACTIVATION=OFF
MOBILITY_DATABASE=DISCOVERY_ONLY
CATALOG_LICENSE_METADATA_IS_OPERATIONAL_AUTHORITY=NO
MOBILITY_DATABASE_CANONICAL_LICENSE_URL=NULL
MOBILITY_DATABASE_CANONICAL_LICENSE_STATUS=UNKNOWN
GTFS_RT_ATTACH_WITHOUT_VERIFIED_STATIC=BLOCKED
```

No current authoritative Santa Fe Capital bus GTFS/GTFS-RT feed with independently verified compatible provider/feed license and freshness was demonstrated. Phase 5 therefore terminates as canonical `NO_FEED`; no route, stop, frequency, wait, fare or bus availability is fabricated. Because the prerequisite verified feed/use-case does not exist, Phase 6 terminates as `MOTIS_OTP=NOT_RUN_CONDITION_NOT_MET`. Phase 7 selects `NO_CHANGE`; no external routing backend is activated.

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

Permanent invariants remain:
- browser does not call Nominatim, OSRM or Mobility Database directly;
- bus stays disabled without verified source/license/freshness/validation;
- catalog metadata cannot authorize a feed;
- GTFS-RT cannot attach without compatible verified-current static GTFS;
- APP_ONLY providers expose no fabricated numeric fare;
- AI does not calculate canonical routes, fares, times, availability or rankings;
- external actions require explicit expiring single-use confirmation;
- audio/transcripts/exact-location history are not persistently stored;
- VOY works without login, voice or AI.

## Historical evidence index

```text
ISSUE32=CLOSED_COMPLETED
ISSUE32_PRODUCTIVE_SOURCE=403ad4fc96f0b7138151f6267b996cd900f752c2
ISSUE34_INITIAL_MILESTONE_COMMENT=5217164821
ISSUE34_LICENSE_BLOCK_AUD=5217321670
ISSUE34_CORRECTED_MILESTONE_COMMENT=5217585109
ISSUE34_TERMINAL_AUD=5217823220
ISSUE34_CORRECTED_CANDIDATE_RUN=31181446289
ISSUE34_CORRECTED_CANDIDATE_ARTIFACT=8995148336
ISSUE34_TERMINAL_PRODUCTION_RUN=31185141780
ISSUE34_TERMINAL_ARTIFACT=8996545635
PRE_TERMINAL_WORKLOG_COMMIT=3f8e096b7065d41f9749e5613b329736b7301055
```

## Next authorized sequence

```text
ISSUE34_NEXT=CLOSE_AFTER_THIS_DOC_COMMIT_VALIDATES
ISSUE36_START_GATE=ISSUE34_MUST_BE_CLOSED_AND_NO_PARALLEL_PRODUCT_LINE
ISSUE36_ROLE=ARQ
ISSUE36_MATERIAL_EJE_AUTHORITY=REQUIRES_MATCHING_INDEPENDENT_AUD_PER_GLOBAL_PROJECT_RULES
NEXT=VALIDATE_THIS_DOC_COMMIT_CLOSE_ISSUE34_THEN_RECONSTRUCT_ISSUE36_GATE
```
