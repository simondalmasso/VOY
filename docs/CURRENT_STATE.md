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
ORDER48_STATUS=READY_FOR_INDEPENDENT_AUD
ORDER48_SELECTION_COMMENT=5369044980
ORDER48_AUD_CONTINUE_COMMENT=5369449833
ORDER48_FIRST_FAILURE_CHECKPOINT=5369910050
ORDER48_AUD_RETRY_AUTHORIZATION=5370333447
ORDER48_AUD_ATTESTATION_AUTHORIZATION=5371598113
MERGE_AUTHORIZED=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
GOOGLE_AUTH_ACTIVATION_AUTHORIZED=NO
D1_WRITE_AUTHORIZED=NO
D1_MIGRATION_AUTHORIZED=NO
PERSISTENT_DATA_MUTATION_AUTHORIZED=NO
DRIVE=LEGACY_READ_ONLY
NEW_DRIVE_WRITES=NO
```

Production truth has priority over branch/document state. Candidate source, later documentation commits, Worker versions, deployments and traffic are intentionally recorded separately.

## ORDER-048 — successful zero-traffic candidate checkpoint

```text
SELECTION=SANTA_FE_OFFICIAL_TRANSIT_HANDOFF
BRANCH=feat/order-048-official-transit-handoff
PR49_STATE=OPEN_DRAFT_UNMERGED
BASE_MAIN_SHA=12e0fd006ed20d255496fbdcc883849038fe301f
CANDIDATE_EXACT_SOURCE_SHA=b33fd3c864904c839b3d223871201c492a9d89c0
CANDIDATE_BUILD_HASH=b33fd3c
CANDIDATE_WORKFLOW=VOY ORDER-048 Final Candidate 0
CANDIDATE_RUN=32497318770;SUCCESS
CANDIDATE_JOB=96818698145
CANDIDATE_ATTEMPT=3
CANDIDATE_VERSION_ID=1c04a69c-9608-4ccd-853d-8d3f436d9f7e
CANDIDATE_VERSION_NUMBER=137
ACTIVE_SPLIT_DEPLOYMENT_ID=10522621-0e22-48e3-8582-de36b1b30bb3
STABLE_VERSION_ID=5489843d-db43-4779-83fb-309b5a2dec7e
STABLE_TRAFFIC=100%
CANDIDATE_TRAFFIC=0%
PREVIOUS_PRODUCTION_DEPLOYMENT_ID=cd6ffedd-12db-4340-aacd-4333f91aa15b
PRODUCTION_PROMOTED=NO
ROLLBACK_EXECUTED=NO
MERGE_EXECUTED=NO
D1_WRITE_EXECUTED=NO
D1_MIGRATION_EXECUTED=NO
PERSISTENT_DATA_MUTATION_EXECUTED=NO
GOOGLE_AUTH_ENABLED=NO
```

The successful candidate is the first ORDER-048 candidate created after the AUD-approved evidence-model architecture correction in Issue #48 comment `5371598113`. The two earlier HTTP 403 attempts remain historically preserved; the successful run did not reinterpret either 403 as PASS and performed no new live municipal fetch from hosted CI.

## Source attestation gate

```text
ATTESTATION_TARGET=https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/
ATTESTATION_AUTHORITY=Municipalidad de Santa Fe
ATTESTATION_VERIFIED_AT=2026-08-21
ATTESTATION_AUD_EVIDENCE_COMMENT=5371598113
ATTESTATION_VERIFIER=persisted_source_attestation
ATTESTATION_LIVE_NETWORK_REQUEST=false
ATTESTATION_MAX_AGE_HOURS=36
ATTESTATION_PREWRITE=PASS;AGE_HOURS=15.48
ATTESTATION_POST_RUNTIME=PASS;AGE_HOURS=15.688
STALE_SUBSTITUTION=false
```

The candidate runner validates the persisted attestation fail-closed: exact fixed URL, exact municipal authority, verification date, AUD evidence reference, current age and the fixed handoff target in code. Missing, changed or stale attestation fails. The verifier contains no Chromium/navigation/fetch/proxy/cookie/auth/bypass path.

## Fresh exact-head gates for candidate source

```text
CANDIDATE_RELEASE_POLICY_RUN=32497324210;SUCCESS
CANDIDATE_EXACT_HEAD_RUN=32497324252;SUCCESS
CANDIDATE_PR_VALIDATE_RUN=32497324222;SUCCESS
EXACT_HEAD_CI_GATE=GREEN
TYPECHECK=PASS;0_ERRORS;0_WARNINGS
LINT=PASS
UNIT_TESTS=217_PASS;0_FAIL;522_EXPECTS;38_FILES
LOCAL_BROWSER=112_PASS;0_FAIL;44_SKIP
WRANGLER_DRY_RUN=PASS
RUNNER_D1_MUTATION_PATH=ABSENT
MUNICIPAL_VERIFIER_LIVE_NETWORK_PATH=ABSENT
SOURCE_ATTESTATION_GATE=PERSISTED_FAIL_CLOSED
```

The candidate workflow waited for all three exact-source workflows to be terminal SUCCESS before the attestation pre-write gate and before the first Cloudflare write.

## Candidate runtime / API / browser / map evidence

```text
CANDIDATE_RUNTIME=PASS
CANDIDATE_HEALTH_VERSION=V8.0.0
CANDIDATE_HEALTH_BUILD=b33fd3c
CANDIDATE_AUTH_FEATURE=false
CANDIDATE_AUTH_SESSION_ENABLED=false
CANDIDATE_PERSISTENT_ACCOUNT=false
CANDIDATE_TRIP_HISTORY_PERSISTED=false
CANDIDATE_API_GATE=PASS
CANDIDATE_BROWSER=118_PASS;0_FAIL;38_SKIP
REAL_MAP_PIXEL_PROOF=PASS
REAL_MAP_PROFILES_PASS=6
ASSET_CONVERGENCE_ROUNDS=20
ASSET_CONVERGENCE_DURATION_MS=210931
ASSET_COUNT=44
ASSET_PASS=44
BINDING_CONTRACT=PASS
STABLE_BINDING_COUNT=19
CANDIDATE_BINDING_COUNT=19
BINDING_ADDITIONS=0
BINDING_REMOVALS=0
```

Real-map pixel proof passed on `mobile-360x800`, `mobile-360x780`, `mobile-390x844`, `mobile-412x915`, `mobile-430x932` and `desktop-1280x800`; each proof asserted non-flat basemap, visible route, origin marker and destination marker.

Candidate API proof returned `V8.0.0`, build `b33fd3c`, `auth=false`, `national_territory=true`, no persistent account/history, a valid deterministic route response and a CSP-protected root without a session cookie.

## Exact-version tail

```text
TAIL_EXACT_VERSION_ID=1c04a69c-9608-4ccd-853d-8d3f436d9f7e
TAIL_EXACT_VERSION_EVENTS=2380
TAIL_OBSERVED_VERSION_IDS=1c04a69c-9608-4ccd-853d-8d3f436d9f7e
TAIL_OK_OUTCOMES=2380
TAIL_NON_OK_OUTCOMES=0
TAIL_EXCEPTIONS=0
TAIL_TRUNCATED_EVENTS=0
```

The downloaded `candidate-tail.log` parses as exactly 2,380 JSON records; every record belongs to the candidate version, has `outcome=ok`, and contains no exception.

## Assets, hashes and immutable candidate evidence

```text
CANDIDATE_EVIDENCE_ARTIFACT_ID=9452709137
CANDIDATE_EVIDENCE_ARTIFACT_NAME=voy-order48-final-candidate-32497318770
CANDIDATE_EVIDENCE_ARTIFACT_BYTES=3868174
CANDIDATE_EVIDENCE_ARTIFACT_SHA256=e9c2b30027d6aab0660e038923471e5f76d3fe9f56c88d481bfd81a416fe9251
CANDIDATE_EVIDENCE_FILE_COUNT=111
CANDIDATE_EVIDENCE_MANIFEST_SHA256=cfd80de23cc2110f44175779b0e5ea309de7f242b3f514b113d5a4d9ee5d126d
LOCKFILE_SHA256=e189a028c40e1462cfb7c9e758872d2c4ff89a2d756a2a957634bbe012324ec8
STATIC_MANIFEST_SHA256=eab2a724740ac6989be15ba756281613e39aee6a86c4281213a562188c9970ef
TAIL_LOG_SHA256=60457ae354035cbf495bd34707e544b6576836fbce7842bbba874410568b9ec8
FINAL_STATE_SHA256=ede263ffd3b6bc3fbc6031ff8a4b48a2bbaa0b94413321365b2e193c697b4566
API_GATE_SHA256=bf4b33e9112e162baac1fad58b2a029f5dd5fb904d1dc44c61b6e71c0540b161
BINDING_CONTRACT_SHA256=0c5b35f9cee23587ad94c5ab382df3f6d66c2bcaed2edb1b1cbbde7fbc12f51c
ZERO_TRAFFIC_CONTRACT_SHA256=ba8d1ecca8dfc0fb0129edf3169d963d215b969f800159925cb80f9e1bce903a
CANDIDATE_BROWSER_LOG_SHA256=705da8941e743123a9ed9dcbd4ce5aff5cf6f554c62e81772750d26f53527784
CONVERGENCE_PROOF_SHA256=d1002ca32b0ea669879c0a460d4bbb56a5569a700b4f567316e86550c4d9697a
SOURCE_ATTESTATION_FINAL_SHA256=6a090ef92efe4be2b2db721be1e071bfe3f80435e98433d89cc7f4fbcc89c684
RUNNER_SAFETY_SHA256=7e5fa58418e9a2bfa32948f0fc4e9f6050ab3f90b5ccd985652009be0b7bdf01
EXACT_HEAD_CI_SHA256=36e147d76dbc769371378cbc5ed4b5586db9da9d5a9a3e0ed2809a81d710614d
```

Selected built asset hashes:

```text
INDEX_JS_SHA256=934d5cd39c0aefea8e53299af7cdfdd2b061c51f707c5e6a1b3a639607614b0c
INDEX_CSS_SHA256=ebe0e90ba216326f977a37f96f32fe6acd851a77a751f7d595a93d0305887c15
MAPLIBRE_JS_SHA256=7c11bee853e66ef7bc8c915918a370a11d1707ff3c8acf4b381c87b3ea7117ad
SANTA_FE_TRANSPORT_SHA256=cf33e3ad52977711926098bc305445f826e1a5833d6d71c8fa97df00efb94d17
SERVICE_WORKER_SHA256=daf193083f657c7afe1b06a1e483bdd86df2af2e92425c638c1238296c25d201
```

GitHub's artifact digest and an independent SHA-256 of the downloaded ZIP both equal `e9c2b30027d6aab0660e038923471e5f76d3fe9f56c88d481bfd81a416fe9251`.

## Historical ORDER-048 failures preserved

```text
FIRST_FAILURE_EXACT_SOURCE=3dcb3e63ad80c9fd8a201176c8ea18a51a86ad66
FIRST_FAILURE_RUN=32482253921;FAILURE
FIRST_FAILURE=official_handoff_unreachable:403
FIRST_FAILURE_ARTIFACT_ID=9446641822
FIRST_FAILURE_ARTIFACT_SHA256=15472e0af5c8730512b6b1d37eaae8aba997b073aa5d16e8090155e44d5698e1
CAUSAL_CHROMIUM_PATCH_HEAD=75e1117fff3dd11d8502f756e1d38744ba6aa8c7
SECOND_ATTEMPT_EXACT_SOURCE=2877908749fec746b2eac1745a3643db584fe5e6
SECOND_ATTEMPT_RUN=32487962587;FAILURE
SECOND_ATTEMPT_FAILURE=official_handoff_unreachable:403
SECOND_ATTEMPT_ARTIFACT_ID=9448729697
SECOND_ATTEMPT_ARTIFACT_SHA256=0212872fc7d3ebd79065ebe6d5bb16b3b1b66ebf91ef053330bb51bd2b416e6e
```

Those failures proved hosted-CI egress/challenge behavior only. AUD comment `5371598113` independently re-established the primary-source evidence and authorized the persisted-attestation architecture plus exactly one new candidate attempt. No historical retry limit or failure record was erased.

## Productive runtime — unchanged by candidate

```text
ORDER46_STATUS=TERMINAL_COMPLETE
ISSUE46_STATE=CLOSED_COMPLETED
AUDITED_PRODUCT_SOURCE_SHA=4549acc6e9523e53a740d12ff118917622183c3e
PRODUCTIVE_VERSION_ID=5489843d-db43-4779-83fb-309b5a2dec7e
PRODUCTIVE_TRAFFIC=100%
PRODUCTIVE_BUILD_HASH=4549acc
APPLICATION_VERSION=V8.0.0
CURRENT_SPLIT_DEPLOYMENT_ID=10522621-0e22-48e3-8582-de36b1b30bb3
ORDER48_CANDIDATE_VERSION_ID=1c04a69c-9608-4ccd-853d-8d3f436d9f7e
ORDER48_CANDIDATE_TRAFFIC=0%
NATIONAL_TERRITORY=true
VOICE_ENABLED=true
AUTH_FEATURE=false
CORE_WITHOUT_LOGIN_VOICE_AI=true
PWA=true
PERSISTENT_ACCOUNT=false
TRIP_HISTORY_PERSISTED=false
BUS_ACTIVATION=OFF
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
```

The 0% deployment changed the active deployment record but did not shift production traffic: stable remains 100%, candidate 0%. Google auth remains disabled; no D1 write/migration or persistent-data mutation occurred.

## Permanent mobility and safety invariants

- Santa Fe BUS remains unavailable inside VOY without accepted authoritative GTFS; ORDER-048 does not upgrade availability.
- The official handoff is a typed external-information escape hatch, not a local bus route/ETA/fare/frequency claim.
- The handoff URL is fixed and allowlisted and sends no origin/destination coordinates, raw destination query or account identity.
- External action requires explicit expiring single-use confirmation.
- Hosted candidate CI does not bypass or challenge-solve the municipal WAF; primary-source freshness is independently attested and must be freshly rechecked at the material pre-production AUD gate.
- Browser does not call Nominatim, OSRM or Mobility Database directly.
- Mobility Database remains discovery-only.
- APP_ONLY providers expose no fabricated numeric fare.
- AI does not calculate canonical routes, fares, times, availability or rankings.
- Audio, transcripts and exact-location history are not persistently stored.
- VOY works without login, voice or AI.
- Google auth remains disabled until a separate future authorization and runtime verification.

## Next step

```text
ORDER48_IMPLEMENTATION=COMPLETE
ORDER48_ATTESTATION_ARCHITECTURE=COMPLETE
ORDER48_CANDIDATE_ATTEMPT_1=FAILED_PRE_WRITE_HTTP_403_NODE_FETCH
ORDER48_CANDIDATE_ATTEMPT_2=FAILED_PRE_WRITE_HTTP_403_CHROMIUM
ORDER48_CANDIDATE_ATTEMPT_3=SUCCESS_ZERO_TRAFFIC
ORDER48_CANDIDATE_CREATED=YES
ORDER48_CANDIDATE_VALIDATED=YES
ORDER48_READY_FOR_INDEPENDENT_AUD=YES
NEXT=INDEPENDENT_AUD_CANDIDATE_PASS_GATE
GOOGLE_AUTH_ENABLED=NO
D1_WRITE_EXECUTED=NO
PERSISTENT_DATA_MUTATION_EXECUTED=NO
MERGE_AUTHORIZED=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
ISSUE_39=DO_NOT_START_IN_THIS_BLOCK
```
