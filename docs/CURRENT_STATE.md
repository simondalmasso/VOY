# VOY — Current canonical state

Last reconciled: 2026-08-21

## Authority and source of truth

```text
CANONICAL_STATE=GITHUB
REPOSITORY=simonkey888/VOY
REPOSITORY_WORKLOG=docs/CURRENT_STATE.md
RUNTIME_TRUTH=VERIFIED_PRODUCTION_AND_CLOUDFLARE_EFFECTIVE_STATE
ORDER=46
ISSUE=46
PR=47
WORK_BRANCH=feat/order-046-serious-product
AUD_TERMINAL_PASS=5367382043
ARQ_RELEASE_AUTHORIZATION=5367456917
DRIVE=LEGACY_READ_ONLY
NEW_DRIVE_WRITES=NO
```

Production truth has priority over branch state. Detailed candidate, production, historical Map-First and prior failure evidence remains immutable in Git history, GitHub Actions artifacts, Issue #46, Issue #36 and the reconciliation documents under `docs/`.

## ORDER-046 — verified production release

```text
RELEASE_STATUS=PRODUCTION_VERIFIED_AWAITING_POST_PRODUCTION_AUD
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
PRODUCTION_PROMOTION_EXECUTED=YES
PRODUCTION_PROMOTION_VERIFIED=YES
ROLLBACK_EXECUTED=NO
MERGE_EXECUTED=NO
PR_STATE=DRAFT_OPEN_UNMERGED
GOOGLE_AUTH_ENABLED=NO
PERSISTENT_ACCOUNT=NO
TRIP_HISTORY_PERSISTED=NO
BUS_ACTIVATION=OFF
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
```

The production Worker now serves the exact ORDER-046 source that was independently audited as the zero-traffic candidate. The later branch commits are documentation-only reconciliation and are not falsely attributed as the runtime source. The previous stable Worker remains available at 0% for rollback lineage; no rollback was required.

## Release execution and control-plane evidence

```text
RELEASE_CONTROL_BRANCH=ops/order-046-production-release-20260821
RELEASE_CONTROL_HEAD=1093dda74133e0f53b4017919aafe937f9110f5b
RELEASE_WORKFLOW=VOY ORDER-046 Production Release
RELEASE_RUN=32463678981
RELEASE_RUN_NUMBER=1
RELEASE_RUN_EVENT=push
RELEASE_RUN_RESULT=SUCCESS
ENTRY_CONTROL=stable
ENTRY_HEALTH=stable
ENTRY_AUTH=safe
ENTRY_STABLE_TRAFFIC=100%
ENTRY_CANDIDATE_TRAFFIC=0%
TARGET_STABLE_TRAFFIC=0%
TARGET_CANDIDATE_TRAFFIC=100%
FINAL_STABLE_TRAFFIC=0%
FINAL_CANDIDATE_TRAFFIC=100%
CONVERGENCE_CONSECUTIVE_ROUNDS=20
CONVERGENCE_DURATION_MS=163163
```

Before the traffic write, the release workflow rechecked the ARQ authorization, AUD PASS lineage, PR #47 state, exact main and feature heads, candidate ancestry, docs-only delta after the audited source, frozen toolchain, release policy, typecheck, lint, unit tests, build, bundle budget, D1 binding and `GOOGLE_AUTH_ENABLED=false`. The entry split was exactly stable 100% / candidate 0%. Only then was the already-audited Worker version promoted to 100%.

A single rollback to stable 100% / candidate 0% was armed before the production write. No post-write failure occurred and the rollback path was not executed.

## Production runtime/API/security verification

```text
PRODUCTION_HEALTH=PASS
HEALTH_OK=true
HEALTH_VERSION=V8.0.0
HEALTH_BUILD_HASH=4549acc
NATIONAL_TERRITORY=true
VOICE_ENABLED=true
AUTH_FEATURE=false
COLLECTIVE_RECOMMENDATIONS=false
CORE_WITHOUT_LOGIN_VOICE_AI=true
PWA=true
AUTH_SESSION=PASS
AUTH_ENABLED=false
AUTHENTICATED=false
PERSISTENT_ACCOUNT=false
TRIP_HISTORY_PERSISTED=false
ROOT_HTTP=200
ROOT_SET_COOKIE=false
ROOT_CSP=PASS
TERRITORY_CORDOBA_PROVINCE_ID=14
TERRITORY_CORDOBA_ISO=AR-X
TERRITORY_CORDOBA_COVERAGE=_default
NON_ARGENTINA_FAIL_CLOSED_STATUS=422
REAL_ROUTE_GATE=PASS
REAL_ROUTE_DISTANCE_KM=2
REAL_ROUTE_DURATION_MIN=4.9
REAL_ROUTE_GEOMETRY_POINTS=33
RETIRED_ROUTE_GATE=PASS
MOBILITY_TRUST=PASS
BUS_ACTIVATION=false
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
```

Production preserves the guest-first privacy boundary. Google account code remains disabled by runtime flag; the release did not activate Google auth, create a persistent account, persist trip history, alter DNS/secrets/cron, or authorize new persistent-data writes.

## Production browser, real-map and tail proof

```text
SOURCE_TYPECHECK=PASS;0_ERRORS;0_WARNINGS
SOURCE_LINT=PASS
UNIT_TESTS=214_PASS;0_FAIL
BUNDLE_BUDGET=PASS
PRODUCTION_BROWSER=116_PASS;0_FAIL;34_SKIP
REAL_MAP_PIXEL_PROOF=PASS
REAL_MAP_REQUIRED_VIEWPORTS=360x780,360x800,390x844,412x915,430x932,1280x800
REAL_BASEMAP=VISIBLE
ROUTE=VISIBLE
ORIGIN_MARKER=VISIBLE
DESTINATION_MARKER=VISIBLE
PRODUCTION_TAIL=PASS
TAIL_EXACT_VERSION_EVENTS=1283
TAIL_OBSERVED_VERSION_IDS=5489843d-db43-4779-83fb-309b5a2dec7e
TAIL_NON_OK_OUTCOMES=0
TAIL_EXCEPTIONS=0
TAIL_BENIGN_CLIENT_CANCELLATIONS=0
```

The public browser suite ran against production without a version override after bounded convergence. It covered the ORDER-046 mobile and desktop interaction contract, national-base truth, design/motion amendment, accessibility/overflow behavior and real MapLibre basemap/route/marker pixel proof. Exact-version tail observed only the promoted Worker version and recorded no non-ok outcomes or exceptions.

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
PRODUCTION_HEALTH_FINAL_SHA256=3273345f37d9ecfcd9658c5db4228c99568c42765ca1af212a2b85f5554ffb59
PRODUCTION_AUTH_FINAL_SHA256=62436b6e1730d34111d87f818310a7116128e3edc5eb172ff2a4c1169f4c6c35
PRODUCTION_MOBILITY_TRUST_SHA256=13fe25617b67557e08242d2b7b4b65b15fad183f00040a631fd5e8b18cbe9a5b
PRODUCTION_CONVERGENCE_SHA256=714a7003c04ddc1184e462046f88c5601bdc75b7a28bf0a6694b28f7963bdc6d
DEPLOYMENTS_FINAL_SHA256=8a11687cf27594a471dc2c0e0f8e3f121b23df0658e71d21741fd811bf9db000
CONTROL_AUTHORITY_SHA256=51ba6cdc4b43961a252c38ae105349d174e83c8330a2aa612b25d4c81419cda3
PR47_ENTRY_SHA256=8b7482a94c80ddc78b7069aae365dde8e761ef27d368e0bd4a07d9e8a2e7ad7a
LOCKFILE_SHA256=e189a028c40e1462cfb7c9e758872d2c4ff89a2d756a2a957634bbe012324ec8
```

## Candidate lineage preserved

```text
PRE_CANDIDATE_CLEAN_HEAD=bf21a60ed49a508e9ff58b014d1899b618ac1d7a
CANDIDATE_EXACT_HEAD=4549acc6e9523e53a740d12ff118917622183c3e
CANDIDATE_WORKFLOW=VOY ORDER-046 Final Candidate 0
CANDIDATE_RUN=32456127358;SUCCESS
CANDIDATE_VERSION_ID=5489843d-db43-4779-83fb-309b5a2dec7e
CANDIDATE_SPLIT_DEPLOYMENT_ID=fe2f8ac7-2a22-417f-92b2-031b8580e8f8
CANDIDATE_TRAFFIC_AT_AUD=0%
STABLE_TRAFFIC_AT_AUD=100%
CANDIDATE_BROWSER=116_PASS;0_FAIL;34_SKIP
CANDIDATE_TAIL_EXACT_VERSION_EVENTS=2240
CANDIDATE_EVIDENCE_ARTIFACT_ID=9437528859
CANDIDATE_EVIDENCE_ARTIFACT_SHA256=e8999b0ce96de9aebc6d039d95aec48514ca789dbe6d19aeb759277cb00a5baa
CANDIDATE_EVIDENCE_MANIFEST_SHA256=d521d1688ca298e8c4a8969e092e3efd27d5ac4ca411b9753d5e6d61d572b230
```

The candidate evidence remains exact to `4549acc6...`; promotion reused that exact Worker version and did not generate a replacement candidate.

## Permanent mobility and safety invariants

- Browser does not call Nominatim, OSRM or Mobility Database directly.
- BUS remains disabled without accepted authoritative GTFS with verified license, freshness and validation.
- Mobility Database remains discovery-only.
- APP_ONLY providers expose no fabricated numeric fare.
- AI does not calculate canonical routes, fares, times, availability or rankings.
- External actions require explicit expiring single-use confirmation.
- Audio, transcripts and exact-location history are not persistently stored.
- VOY works without login, voice or AI.
- Google auth remains disabled until separately authorized and runtime-verified.

## Historical Map-First production anchor

Before ORDER-046, production source `796c9355cc22a2e197ee719a15b506b5a3cb22b3` ran as Worker version `002c464c-15fa-42f3-a762-0214a1dc5cf3`. Its finalization evidence remains in workflow `VOY Map-First Production Finalize V4` run `31651286356`, artifact `9162802913`, Issue #36 and `docs/MAP_FIRST_PRODUCTION_RECONCILIATION_20260812.md`. ORDER-046 promotion retained this version at 0% as the immediately previous stable rollback target.

## GitHub reconciliation status

```text
PR=47
PR_STATE=DRAFT_OPEN_UNMERGED
RUNTIME_SOURCE_SHA=4549acc6e9523e53a740d12ff118917622183c3e
PRE_RELEASE_DOCS_HEAD=81b294dd1a3de78baeffa36b89308d0d80866d36
PRODUCTION_RECONCILIATION=THIS_DOCS_COMMIT
MAIN_SHA_AT_RELEASE=224403d8729eee6ffcb4fe1b6d183ac40526853c
MERGE_AUTHORIZED_IN_RELEASE_BLOCK=NO
MERGE_EXECUTED=NO
```

The production-first release is complete, but GitHub merge remains deliberately outside the authorized release block. This worklog update is documentation-only and does not change the already-verified runtime source.

## Next step

```text
ORDER46_PRODUCTION_RELEASE=COMPLETE
NEXT=INDEPENDENT_AUD_POST_PRODUCTION_REVIEW
AUD_REQUEST=ORDER46_POST_PRODUCTION_REVIEW
NO_MERGE_BEFORE_POST_PRODUCTION_AUD=YES
ISSUE_39=DO_NOT_START_IN_THIS_BLOCK
```
