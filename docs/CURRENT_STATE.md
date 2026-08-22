# VOY — Current canonical state

Last reconciled: 2026-08-22

## Authority and source of truth

```text
CANONICAL_STATE=GITHUB
REPOSITORY=simonkey888/VOY
REPOSITORY_WORKLOG=docs/CURRENT_STATE.md
RUNTIME_TRUTH=VERIFIED_PRODUCTION_AND_CLOUDFLARE_EFFECTIVE_STATE
ORDER=48
ISSUE=48
PR=49
SELECTION=SANTA_FE_OFFICIAL_TRANSIT_HANDOFF
BRANCH=feat/order-048-official-transit-handoff
BASE_MAIN_SHA=12e0fd006ed20d255496fbdcc883849038fe301f
ORDER48_STATUS=BLOCKED_AT_INDEPENDENT_AUD_AFTER_V6_FIRST_REAL_FAILURE
ORDER48_AUD_V5_TRIAGE_COMMENT=5382403987
ORDER48_ARQ_RECOVERY_AUTHORIZATION=5382467077
V6_EXACT_RUNTIME_SOURCE_SHA=029c1ca586ff6b7e8c0808958e7a62da9f16c530
PRE_FAILURE_RECONCILIATION_DOCS_HEAD=61e318dfe6a51679b571f257f3ee3401b8b821a7
MERGE_AUTHORIZED=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
GOOGLE_AUTH_ACTIVATION_AUTHORIZED=NO
D1_WRITE_AUTHORIZED=NO
D1_MIGRATION_AUTHORIZED=NO
PERSISTENT_DATA_MUTATION_AUTHORIZED=NO
```

Production truth has priority over branch/document state. Candidate runtime source and later evidence/docs-only commits are intentionally recorded separately. The branch head after this document commit is documentation/evidence state, not a candidate runtime source and must never be substituted for `V6_EXACT_RUNTIME_SOURCE_SHA`.

## ORDER-048 V6 — first real failure / hard stop

```text
V6_EXACT_RUNTIME_SOURCE_SHA=029c1ca586ff6b7e8c0808958e7a62da9f16c530
V6_BUILD_HASH=029c1ca
V6_WORKFLOW=VOY ORDER-048 Final Candidate 0
V6_RUN=32597725253;FAILURE
V6_JOB=97091209460
V6_ATTEMPT=6
FIRST_REAL_FAILURE=territory_upstream_unavailable_after_retry
FIRST_REAL_FAILURE_STAGE=CANDIDATE_API_GATE_CORDOBA
V7_AUTHORIZED=NO
NEXT=INDEPENDENT_AUD_FAILURE_TRIAGE
```

The V6 runner passed all source, safety, exact-head, attestation, deterministic, build and local-browser gates, created a real zero-traffic candidate, converged assets/runtime, then failed closed because GeoRef remained unavailable through the complete bounded retry window. This failure is not converted into PASS and no further candidate attempt is authorized before independent AUD.

## Proven external cause

AUD comment `5382403987` required raw Córdoba observability against V5 before another candidate. The resulting read-only diagnosis established the causal chain without a new deploy:

```text
V5_VERSION_ID=7c669ff0-d64a-4571-8304-6db1e84308cb
V5_DIAGNOSTIC_RUN=32597236549;SUCCESS
V5_DIAGNOSTIC_ARTIFACT_ID=9481881496
V5_DIAGNOSTIC_ZIP_SHA256=833bd9d180e723378f90e7a53b04ee816a7b35efd503f84f895c6ab330490fb7
V5_HEALTH=200;V8.0.0;8a76a68
V5_CORDOBA_ATTEMPTS=5_OF_5_HTTP_503
V5_CORDOBA_ERROR=territory_upstream_unavailable
GEOREF_DIRECT_GET=HTTP_502;origin_bad_gateway
GEOREF_DIRECT_POST=HTTP_502;origin_bad_gateway
GEOREF_ERROR_CATEGORY=origin
GEOREF_RETRYABLE=true
GEOREF_RETRY_AFTER_SECONDS=60
```

The same runner reached the official GeoRef endpoint directly with both GET and POST. Both returned Cloudflare `502 origin_bad_gateway`, proving the failure was external to VOY rather than a version-override mismatch, field-name mismatch, request method error or Worker-only egress problem.

V6 therefore changed only the candidate verification harness: bounded raw attempt evidence, causal error classes and up to six 60-second waits for the externally advertised retry interval. Runtime territorial semantics were not weakened: a real Córdoba HTTP 200 with exact province identity remained mandatory.

## V6 fresh exact-head gates

```text
V6_RELEASE_POLICY_RUN=32597727075;SUCCESS
V6_EXACT_HEAD_RUN=32597726992;SUCCESS
V6_PR_VALIDATE_RUN=32597727038;SUCCESS
EXACT_HEAD_CI_GATE=GREEN
TYPECHECK=PASS;0_ERRORS;0_WARNINGS
LINT=PASS
UNIT_TESTS=237_PASS;0_FAIL;595_EXPECTS;40_FILES
LOCAL_BROWSER=112_PASS;0_FAIL;44_SKIP
WRANGLER_DRY_RUN=PASS
LOCKFILE_SHA256=e189a028c40e1462cfb7c9e758872d2c4ff89a2d756a2a957634bbe012324ec8
BUILD_OUTPUT_SIZE_BYTES=1144056
CRITICAL_JS_GZIP_BYTES=27469
INITIAL_CSS_GZIP_BYTES=18944
LAZY_MAP_GZIP_BYTES=217320
LAZY_VOICE_GZIP_BYTES=19150
```

The Cloudflare write did not begin until all three required workflows for exact source `029c1ca...` were terminal SUCCESS and the persisted municipal source attestation passed.

## V6 source attestation pre-write

```text
ATTESTATION_TARGET=https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/
ATTESTATION_AUTHORITY=Municipalidad de Santa Fe
ATTESTATION_SCHEMA_VERSION=2
ATTESTATION_VERIFIER=persisted_source_attestation
ATTESTATION_LIVE_NETWORK_REQUEST=false
ATTESTATION_VERIFIED_AT_UTC=2026-08-22T15:23:03Z
ATTESTATION_AUD_EVIDENCE_COMMENT=5381139446
ATTESTATION_PREWRITE=PASS
ATTESTATION_PREWRITE_AGE_HOURS=5.498
ATTESTATION_MAX_AGE_HOURS=36
STALE_SUBSTITUTION=false
POST_RUNTIME_ATTESTATION=NOT_RUN_DUE_FIRST_REAL_FAILURE
```

## V6 candidate / effective Cloudflare state

```text
V6_CANDIDATE_VERSION_ID=ec043331-899d-41a5-8385-9a7d31c43b35
V6_CANDIDATE_VERSION_NUMBER=140
V6_CANDIDATE_TAG=voy-order48-029c1ca586ff
V6_SPLIT_DEPLOYMENT_ID=ad2da01e-c4f8-4a9b-9a9c-23957f39929e
STABLE_VERSION_ID=5489843d-db43-4779-83fb-309b5a2dec7e
STABLE_TRAFFIC=100%
V6_CANDIDATE_TRAFFIC=0%
PRODUCTION_PROMOTED=NO
ROLLBACK_EXECUTED=NO
MERGE_EXECUTED=NO
D1_WRITE_EXECUTED=NO
D1_MIGRATION_EXECUTED=NO
PERSISTENT_DATA_MUTATION_EXECUTED=NO
GOOGLE_AUTH_ENABLED=NO
BINDING_CONTRACT=PASS
STABLE_BINDING_COUNT=19
CANDIDATE_BINDING_COUNT=19
BINDING_ADDITIONS=0
BINDING_REMOVALS=0
```

V6 replaced the previous 0% candidate in the active split deployment but did not move productive traffic. The audited ORDER-046 stable version remains at 100%.

## V6 convergence and causal API evidence

```text
ASSET_CONVERGENCE=PASS_BEFORE_API_FAILURE
ASSET_CONVERGENCE_ROUNDS=20
ASSET_CONVERGENCE_DURATION_MS=150170
ASSET_COUNT=44
ASSET_PASS=44
STABLE_RUNTIME_OK=true
CANDIDATE_RUNTIME_OK=true
DEPLOYMENT_OK=true
CORDOBA_RETRY_POLICY_MAX_ATTEMPTS=6
CORDOBA_RETRY_POLICY_INTERVAL_MS=60000
CORDOBA_ATTEMPTS=6
CORDOBA_HTTP_503=6
CORDOBA_ERROR=territory_upstream_unavailable
CORDOBA_REAL_200_OBSERVED=NO
API_GATE=FAIL_CLOSED
API_GATE_CAUSAL_ERROR=territory_upstream_unavailable_after_retry
CANDIDATE_BROWSER=NOT_RUN_AFTER_API_FAILURE
REAL_MAP_PIXEL_PROOF=NOT_RUN_AFTER_API_FAILURE
FINAL_RUNTIME_GATE=NOT_RUN_AFTER_API_FAILURE
```

Each persisted Córdoba attempt contains only bounded status/error/territory observations; it contains no cookies, auth headers or raw personal data. The gate never treats 502/503 or an unresolved province as success.

## V6 partial exact-version tail evidence

The exact-version tail started before the API gate and stopped when the first real failure terminated the operational block. It is valid partial failure evidence, not a terminal browser/runtime PASS.

```text
TAIL_SCOPE=PARTIAL_PRE_FAILURE
TAIL_EXACT_VERSION_ID=ec043331-899d-41a5-8385-9a7d31c43b35
TAIL_EXACT_VERSION_EVENTS=908
TAIL_OBSERVED_VERSION_IDS=ec043331-899d-41a5-8385-9a7d31c43b35
TAIL_OK_OUTCOMES=908
TAIL_NON_OK_OUTCOMES=0
TAIL_EXCEPTIONS=0
TAIL_METHOD_GET=907
TAIL_METHOD_POST=1
TAIL_LOG_SHA256=2effaffdd90dca7b13b350fd9e68d9ad404aa08336336d8369995f582aa223e7
```

## V6 immutable failure evidence

```text
V6_EVIDENCE_ARTIFACT_ID=9482221007
V6_EVIDENCE_ARTIFACT_NAME=voy-order48-final-candidate-32597725253
V6_EVIDENCE_ARTIFACT_BYTES=884207
V6_EVIDENCE_ARTIFACT_ZIP_SHA256=9bfb7e19d2f7487d503f83b98be4c2a13e7de51826e88e711d9aefd92a2e7657
V6_MANIFEST_SHA256=ca30e13eb7818c15135853364a943a001ad7adad39fd228b4bada27efeb8e1f3
V6_CORDOBA_ATTEMPTS_SHA256=f58cbd070245bf9d35cb329649e0c113b3753485fd5be3ce479c544381cf04d7
V6_CANDIDATE_VERSION_SHA256=9da140557f78425aed8758e380392665e7d278fe862c0a27ad9fe091a47fa25f
V6_BINDING_CONTRACT_SHA256=0c5b35f9cee23587ad94c5ab382df3f6d66c2bcaed2edb1b1cbbde7fbc12f51c
V6_CONVERGENCE_PROOF_SHA256=63576ee2e4cb8d57a77ef2feeb6952f0d0b4d5c439ba8914c8571df701b8ff94
V6_TAIL_LOG_SHA256=2effaffdd90dca7b13b350fd9e68d9ad404aa08336336d8369995f582aa223e7
```

## Productive runtime — unchanged

```text
ORDER46_STATUS=TERMINAL_COMPLETE
ISSUE46_STATE=CLOSED_COMPLETED
AUDITED_PRODUCT_SOURCE_SHA=4549acc6e9523e53a740d12ff118917622183c3e
PRODUCTIVE_VERSION_ID=5489843d-db43-4779-83fb-309b5a2dec7e
PRODUCTIVE_TRAFFIC=100%
PRODUCTIVE_BUILD_HASH=4549acc
APPLICATION_VERSION=V8.0.0
CURRENT_SPLIT_DEPLOYMENT_ID=ad2da01e-c4f8-4a9b-9a9c-23957f39929e
ORDER48_CANDIDATE_VERSION_ID=ec043331-899d-41a5-8385-9a7d31c43b35
ORDER48_CANDIDATE_TRAFFIC=0%
GOOGLE_AUTH_ENABLED=NO
PERSISTENT_ACCOUNT=false
TRIP_HISTORY_PERSISTED=false
BUS_ACTIVATION=OFF
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
```

## Permanent ORDER-048 product and safety invariants

- Santa Fe BUS remains unavailable inside VOY without accepted authoritative GTFS; ORDER-048 does not upgrade availability.
- The municipal handoff remains a typed official-information escape hatch, separate from `available` and from local bus data.
- The fixed allowlisted handoff sends no origin/destination coordinates, raw destination query or account identity.
- External action remains explicit, expiring and single-use.
- GeoRef or any other upstream outage fails closed and cannot be converted to a local territorial claim.
- Browser does not call Nominatim, OSRM or Mobility Database directly.
- Mobility Database remains discovery-only.
- AI does not calculate canonical routes, fares, times, availability or rankings.
- Audio, transcripts and exact-location history are not persistently stored.
- VOY works without login, voice or AI.
- Google auth remains disabled.

## Next step

```text
ORDER48_IMPLEMENTATION=COMPLETE
ORDER48_V5_RAW_CAUSE_DIAGNOSIS=COMPLETE
ORDER48_V6_EXACT_HEAD=GREEN
ORDER48_V6_CANDIDATE_CREATED=YES
ORDER48_V6_CANDIDATE_TRAFFIC=0%
ORDER48_V6_RUNTIME_CONVERGENCE=PASS
ORDER48_V6_API_GATE=FAIL_CLOSED_GEOREF_UNAVAILABLE
ORDER48_V6_FIRST_REAL_FAILURE=PERSISTED
ORDER48_READY_FOR_INDEPENDENT_AUD_FAILURE_TRIAGE=YES
ORDER48_READY_FOR_CANDIDATE_PASS=NO
V7_AUTHORIZED=NO
NEXT=INDEPENDENT_AUD_FAILURE_TRIAGE
GOOGLE_AUTH_ENABLED=NO
D1_WRITE_EXECUTED=NO
PERSISTENT_DATA_MUTATION_EXECUTED=NO
MERGE_AUTHORIZED=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
ISSUE_39=DO_NOT_START_IN_THIS_BLOCK
```
