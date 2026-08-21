# VOY — Current canonical state

Last reconciled: 2026-08-21

## Authority and source of truth

```text
CANONICAL_STATE=GITHUB
REPOSITORY=simonkey888/VOY
REPOSITORY_WORKLOG=docs/CURRENT_STATE.md
RUNTIME_TRUTH=VERIFIED_PRODUCTION_AND_CLOUDFLARE_EFFECTIVE_STATE
ORDER=48
ISSUE=48
PR=49
ORDER48_STATUS=FIRST_REAL_FAILURE_AUD_REQUIRED
ORDER48_SELECTION_COMMENT=5369044980
ORDER48_AUD_CONTINUE_COMMENT=5369449833
ORDER46_STATUS=TERMINAL_COMPLETE
ISSUE46_STATE=CLOSED_COMPLETED
AUD_TERMINAL_CANDIDATE_PASS=5367382043
ARQ_PRODUCTION_AUTHORIZATION=5367456917
AUD_POST_PRODUCTION_PASS=5367927644
ARQ_MERGE_AUTHORIZATION=5368067280
ARQ_TERMINAL_CLOSURE_COMMENT=5368264473
GOOGLE_AUTH_ACTIVATION_AUTHORIZED=NO
D1_WRITE_AUTHORIZED=NO
D1_MIGRATION_AUTHORIZED=NO
PERSISTENT_DATA_MUTATION_AUTHORIZED=NO
MERGE_AUTHORIZED=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
DRIVE=LEGACY_READ_ONLY
NEW_DRIVE_WRITES=NO
```

Production truth has priority over branch/document state. Runtime source and deployment identifiers below are intentionally distinguished from later GitHub-only implementation, candidate-trigger and documentation commits.

## ORDER-048 — first real candidate failure checkpoint

```text
SELECTION=SANTA_FE_OFFICIAL_TRANSIT_HANDOFF
BRANCH=feat/order-048-official-transit-handoff
PR49_STATE=OPEN_DRAFT_UNMERGED
BASE_MAIN_SHA=12e0fd006ed20d255496fbdcc883849038fe301f
AUD_CONTINUE_BASE_HEAD=0e93583bd99ec74c8facb4176a60a839da327c59
CONTROL_PLANE_HEAD=d0f282123bb53ee1872f2d4b07955121c7f06f8f
CANDIDATE_TRIGGER_EXACT_SOURCE_SHA=3dcb3e63ad80c9fd8a201176c8ea18a51a86ad66
CANDIDATE_WORKFLOW=VOY ORDER-048 Final Candidate 0
CANDIDATE_RUN=32482253921;FAILURE
CANDIDATE_JOB=96770974256
FIRST_CAUSAL_FAILURE=official_handoff_unreachable:403
FIRST_CAUSAL_FAILURE_STAGE=municipal-source-before
FIRST_CAUSAL_FAILURE_TIMESTAMP_UTC=2026-08-21T12:36:15Z
CANDIDATE_VERSION_CREATED=NO
CANDIDATE_DEPLOYMENT_CREATED=NO
CLOUDFLARE_WRITE_REACHED=NO
D1_WRITE_EXECUTED=NO
D1_MIGRATION_EXECUTED=NO
PERSISTENT_DATA_MUTATION_EXECUTED=NO
GOOGLE_AUTH_ENABLED=NO
PRODUCTION_PROMOTION_EXECUTED=NO
MERGE_EXECUTED=NO
RETRY_EXECUTED=NO
```

The first real ORDER-048 candidate attempt stopped fail-closed before any Cloudflare write. The exact failing command was the fresh municipal-source verifier at `scripts/verify-santa-fe-transit-handoff.mjs`; the GitHub-hosted runner received HTTP `403` from `santafeciudad.gov.ar` and threw `official_handoff_unreachable:403`. This proves a source-verification failure from that runner environment. It does **not** by itself prove the municipal page is globally unavailable or establish why the municipality returned 403. No retry or source substitution was attempted after the first causal failure.

A read-only preflight before the attempt had resolved the official municipal Colectivos page and its current `Cuándo Pasa` reference. A read-only production recheck after the failure still returned `V8.0.0`, build `4549acc`, `auth=false`; `/api/auth/session` remained `enabled=false`, `authenticated=false`, `persistent_account=false`, `trip_history_persisted=false`.

### ORDER-048 exact-head gates before candidate attempt

```text
CONTROL_PLANE_RELEASE_POLICY_RUN=32481702020;SUCCESS
CONTROL_PLANE_EXACT_HEAD_RUN=32481701934;SUCCESS
CONTROL_PLANE_PR_VALIDATE_RUN=32481701942;SUCCESS
CONTROL_PLANE_UNIT_TESTS=217_PASS;0_FAIL
CONTROL_PLANE_BROWSER=112_PASS;0_FAIL;44_SKIP
CONTROL_PLANE_TYPECHECK=PASS;0_ERRORS;0_WARNINGS
CONTROL_PLANE_LINT=PASS
CONTROL_PLANE_BUILD=PASS
CONTROL_PLANE_BUDGET=PASS
CONTROL_PLANE_WRANGLER_DRY_RUN=PASS
SENTINEL_RELEASE_POLICY_RUN=32482256751;SUCCESS
SENTINEL_EXACT_HEAD_RUN=32482256734;SUCCESS
SENTINEL_PR_VALIDATE_RUN=32482256738;SUCCESS
SENTINEL_EXACT_HEAD_CI_GATE=GREEN
RUNNER_D1_MUTATION_PATH=ABSENT
```

The ORDER-048 workflow intentionally waited until all three workflows for exact candidate source `3dcb3e63ad80c9fd8a201176c8ea18a51a86ad66` were SUCCESS before entering its operational step. The runner contains no `wrangler d1`, migration-apply or D1-execute path. The failure occurred during the runner's source-freshness check before candidate-config dry-run, version upload or split deployment.

### ORDER-048 failure evidence

```text
FAILURE_EVIDENCE_ARTIFACT_ID=9446641822
FAILURE_EVIDENCE_ARTIFACT_NAME=voy-order48-final-candidate-32482253921
FAILURE_EVIDENCE_ARTIFACT_BYTES=17738
FAILURE_EVIDENCE_ARTIFACT_SHA256=15472e0af5c8730512b6b1d37eaae8aba997b073aa5d16e8090155e44d5698e1
FAILURE_EVIDENCE_MANIFEST_SHA256=f12bc23a91c83201c4cfd698447eda3102b10d3ba606c25152d71116b93f5713
MUNICIPAL_SOURCE_BEFORE_FILE_SHA256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
EXACT_HEAD_CI_FILE_SHA256=37705a48b06f672dbee2b2e74962fbca9d763735821de3c893a7db99b51a978e
RUNNER_SAFETY_FILE_SHA256=a6f66e13e0574fec032fde2389fdd96da82391d85fe3f60f6b7dffb9c7ecdc96
LOCKFILE_SHA256=e189a028c40e1462cfb7c9e758872d2c4ff89a2d756a2a957634bbe012324ec8
```

The empty `municipal-source-before.json` is expected evidence of the immediate thrown HTTP 403: stdout redirection created the file before the verifier failed. The immutable artifact was uploaded by the workflow's `always()` evidence path after the failure.

## ORDER-046 — terminal production and merge state

```text
PR47_STATE=CLOSED_MERGED
PR47_HEAD=8632b74678d72082db09f92c4a0b114ea53831d8
MAIN_MERGE_SHA=59098f70a73a61216ed4bedaa12df801c48a79b2
MERGE_EXECUTED=YES
MERGE_METHOD=merge
MERGE_AUTHORIZED_BY_ARQ=YES
PRODUCTION_PROMOTION_EXECUTED=YES
PRODUCTION_PROMOTION_VERIFIED=YES
ROLLBACK_EXECUTED=NO
NEW_PRODUCTION_WRITE_AFTER_MERGE=NO
GOOGLE_AUTH_ENABLED=NO
PERSISTENT_ACCOUNT=NO
TRIP_HISTORY_PERSISTED=NO
BUS_ACTIVATION=OFF
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
```

PR #47 was merged only after independent post-production AUD PASS and a separate exact-head ARQ merge authorization. Issue #46 was closed as completed only after post-merge validation and the terminal worklog gate were green. The merge and closure did not deploy a new Worker version, change Cloudflare traffic, activate Google auth, mutate DNS/secrets/cron, or add persistent account/history behavior.

## Productive runtime

```text
AUDITED_PRODUCT_SOURCE_SHA=4549acc6e9523e53a740d12ff118917622183c3e
PRODUCTIVE_VERSION_ID=5489843d-db43-4779-83fb-309b5a2dec7e
PRODUCTIVE_DEPLOYMENT_ID=cd6ffedd-12db-4340-aacd-4333f91aa15b
PRODUCTIVE_TRAFFIC=100%
PRODUCTIVE_BUILD_HASH=4549acc
APPLICATION_VERSION=V8.0.0
PREVIOUS_STABLE_VERSION_ID=002c464c-15fa-42f3-a762-0214a1dc5cf3
PREVIOUS_STABLE_TRAFFIC=0%
PREVIOUS_STABLE_SOURCE_SHA=796c9355cc22a2e197ee719a15b506b5a3cb22b3
PREVIOUS_STABLE_BUILD_HASH=796c935
NATIONAL_TERRITORY=true
VOICE_ENABLED=true
AUTH_FEATURE=false
CORE_WITHOUT_LOGIN_VOICE_AI=true
PWA=true
```

Post-failure read-only production verification returned `V8.0.0`, build `4549acc`, `national_territory=true` and auth disabled. `/api/auth/session` remained `enabled=false`, `authenticated=false`, `persistent_account=false`, `trip_history_persisted=false`.

## Release execution evidence

```text
RELEASE_CONTROL_BRANCH=ops/order-046-production-release-20260821
RELEASE_CONTROL_HEAD=1093dda74133e0f53b4017919aafe937f9110f5b
RELEASE_WORKFLOW=VOY ORDER-046 Production Release
RELEASE_RUN=32463678981;SUCCESS
ENTRY_STABLE_TRAFFIC=100%
ENTRY_CANDIDATE_TRAFFIC=0%
FINAL_STABLE_TRAFFIC=0%
FINAL_CANDIDATE_TRAFFIC=100%
CONVERGENCE_CONSECUTIVE_ROUNDS=20
CONVERGENCE_DURATION_MS=163163
SOURCE_TYPECHECK=PASS;0_ERRORS;0_WARNINGS
SOURCE_LINT=PASS
UNIT_TESTS=214_PASS;0_FAIL
BUNDLE_BUDGET=PASS
PRODUCTION_BROWSER=116_PASS;0_FAIL;34_SKIP
REAL_MAP_PIXEL_PROOF=PASS
PRODUCTION_TAIL=PASS
TAIL_EXACT_VERSION_EVENTS=1283
TAIL_OBSERVED_VERSION_IDS=5489843d-db43-4779-83fb-309b5a2dec7e
TAIL_NON_OK_OUTCOMES=0
TAIL_EXCEPTIONS=0
```

A single rollback path to the prior stable version was armed before the production write. No release failure occurred and rollback was not executed.

## Immutable production evidence

```text
PRODUCTION_EVIDENCE_ARTIFACT_ID=9440085540
PRODUCTION_EVIDENCE_ARTIFACT_NAME=voy-order46-production-release-32463678981
PRODUCTION_EVIDENCE_ARTIFACT_BYTES=3017280
PRODUCTION_EVIDENCE_ARTIFACT_SHA256=2fd22fb0ffd9d46d978be085447e23c8b4657c52fa1ce3fb22f5e4e1ff1ee890
PRODUCTION_EVIDENCE_FILE_COUNT=139
PRODUCTION_EVIDENCE_MANIFEST_SHA256=1f01310712af74f17177778ba5d561c93f665b333a00a69c94e1ae5f49ae06c5
PRODUCTION_FINAL_STATE_SHA256=b6991d9600d63389f86112382a880dd29b5bb2b7effa6f9214dc316aee43e05c
PRODUCTION_TAIL_PROOF_SHA256=7e026e0bf5059801b4317fff767f45b3a9a2124c76b81add3b5824fe94536ec1
PRODUCTION_BROWSER_LOG_SHA256=0291329f5397f4ad9c34fcaea86dae477628020d62e9f22b05483719016fc678
API_GATE_SHA256=a7dd11c77fa604fb0df4d6e96e247b6a9b7866542695c4f3bbfd4b1d694bbd87
LOCKFILE_SHA256=e189a028c40e1462cfb7c9e758872d2c4ff89a2d756a2a957634bbe012324ec8
```

AUD independently downloaded and verified the production artifact and declared the post-production checkpoint PASS in Issue #46 comment `5367927644`.

## Candidate lineage preserved

```text
PRE_CANDIDATE_CLEAN_HEAD=bf21a60ed49a508e9ff58b014d1899b618ac1d7a
CANDIDATE_EXACT_HEAD=4549acc6e9523e53a740d12ff118917622183c3e
CANDIDATE_WORKFLOW=VOY ORDER-046 Final Candidate 0
CANDIDATE_RUN=32456127358;SUCCESS
CANDIDATE_VERSION_ID=5489843d-db43-4779-83fb-309b5a2dec7e
CANDIDATE_SPLIT_DEPLOYMENT_ID=fe2f8ac7-2a22-417f-92b2-031b8580e8f8
CANDIDATE_BROWSER=116_PASS;0_FAIL;34_SKIP
CANDIDATE_TAIL_EXACT_VERSION_EVENTS=2240
CANDIDATE_EVIDENCE_ARTIFACT_ID=9437528859
CANDIDATE_EVIDENCE_ARTIFACT_SHA256=e8999b0ce96de9aebc6d039d95aec48514ca789dbe6d19aeb759277cb00a5baa
CANDIDATE_EVIDENCE_MANIFEST_SHA256=d521d1688ca298e8c4a8969e092e3efd27d5ac4ca411b9753d5e6d61d572b230
```

Promotion reused the exact audited candidate Worker version; no replacement production build was generated.

## GitHub post-merge and closure reconciliation

```text
MAIN_MERGE_SHA=59098f70a73a61216ed4bedaa12df801c48a79b2
POST_MERGE_RELEASE_POLICY_RUN=32467933483;SUCCESS
POST_MERGE_MAIN_VALIDATION_RUN=32467933515;SUCCESS
POST_MERGE_TYPECHECK=PASS;0_ERRORS;0_WARNINGS
POST_MERGE_LINT=PASS
POST_MERGE_UNIT_TESTS=214_PASS;0_FAIL
POST_MERGE_BUNDLE_BUDGET=PASS
POST_MERGE_WRANGLER_DRY_RUN=PASS
POST_MERGE_LOCAL_BROWSER=110_PASS;0_FAIL;40_SKIP
POST_MERGE_PRODUCTION_HEALTH_READ_ONLY=PASS;V8.0.0;4549acc
POST_MERGE_PRODUCTION_BROWSER_READ_ONLY=110_PASS;0_FAIL;40_SKIP
POST_MERGE_EVIDENCE_ARTIFACT_ID=9441621570
POST_MERGE_EVIDENCE_ARTIFACT_NAME=main-validation-32467933515
POST_MERGE_EVIDENCE_ARTIFACT_BYTES=1541726
POST_MERGE_EVIDENCE_ARTIFACT_SHA256=b0a661e41d1d0883dd850ff6a3d412d4e52a253b3acff9623f892e97de562625
TERMINAL_PRE_CLOSE_DOCS_SHA=95d4cc0bac842c165b48b66d6bf5a7190a235dd2
TERMINAL_PRE_CLOSE_RELEASE_POLICY_RUN=32468737113;SUCCESS
TERMINAL_PRE_CLOSE_MAIN_VALIDATION_RUN=32468737158;SUCCESS
```

The main workflows are non-mutating: they validate source/build locally and inspect production read-only. Their Wrangler operation is dry-run only and shows `GOOGLE_AUTH_ENABLED="false"`.

## Permanent mobility and safety invariants

- Browser does not call Nominatim, OSRM or Mobility Database directly.
- BUS remains disabled without accepted authoritative GTFS with verified license, freshness and validation.
- Mobility Database remains discovery-only.
- APP_ONLY providers expose no fabricated numeric fare.
- AI does not calculate canonical routes, fares, times, availability or rankings.
- External actions require explicit expiring single-use confirmation.
- Audio, transcripts and exact-location history are not persistently stored.
- VOY works without login, voice or AI.
- Google auth remains disabled until a separate future authorization and runtime verification.

## Historical anchors

Before ORDER-046, production source `796c9355cc22a2e197ee719a15b506b5a3cb22b3` ran as Worker version `002c464c-15fa-42f3-a762-0214a1dc5cf3`. Its evidence remains in workflow `VOY Map-First Production Finalize V4` run `31651286356`, Issue #36 and `docs/MAP_FIRST_PRODUCTION_RECONCILIATION_20260812.md`.

Detailed ORDER-046 implementation, candidate, release, audit, merge and closure evidence remains preserved in PR #47, closed Issue #46, Git history and GitHub Actions artifacts.

## Next step

```text
ORDER48_IMPLEMENTATION=COMPLETE
ORDER48_CONTROL_PLANE=COMPLETE
ORDER48_CANDIDATE_ATTEMPT_1=FAILED_BEFORE_CLOUDFLARE_WRITE
ORDER48_FIRST_CAUSAL_FAILURE=official_handoff_unreachable:403
ORDER48_RETRY_AUTHORIZED=NO_PENDING_INDEPENDENT_AUD
ORDER48_AUD_REQUIRED=YES
NEXT=INDEPENDENT_AUD_REVIEW_FIRST_REAL_FAILURE
GOOGLE_AUTH_ENABLED=NO
D1_WRITE_EXECUTED=NO
PERSISTENT_DATA_MUTATION_EXECUTED=NO
MERGE_AUTHORIZED=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
ISSUE_39=DO_NOT_START_IN_THIS_BLOCK
```
