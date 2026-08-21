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
ORDER48_STATUS=RETRY_2_CHROMIUM_403_AUD_REQUIRED
ORDER48_SELECTION_COMMENT=5369044980
ORDER48_AUD_CONTINUE_COMMENT=5369449833
ORDER48_FIRST_FAILURE_CHECKPOINT=5369910050
ORDER48_AUD_RETRY_AUTHORIZATION=5370333447
MERGE_AUTHORIZED=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
GOOGLE_AUTH_ACTIVATION_AUTHORIZED=NO
D1_WRITE_AUTHORIZED=NO
D1_MIGRATION_AUTHORIZED=NO
PERSISTENT_DATA_MUTATION_AUTHORIZED=NO
RETRY_AUTHORIZED=NO_RETRY_LIMIT_EXHAUSTED
DRIVE=LEGACY_READ_ONLY
NEW_DRIVE_WRITES=NO
```

Production truth has priority over branch/document state. Runtime source and deployment identifiers below are intentionally distinguished from later GitHub-only implementation, control-plane, sentinel and documentation commits.

## ORDER-048 — current stop checkpoint

```text
SELECTION=SANTA_FE_OFFICIAL_TRANSIT_HANDOFF
BRANCH=feat/order-048-official-transit-handoff
PR49_STATE=OPEN_DRAFT_UNMERGED
BASE_MAIN_SHA=12e0fd006ed20d255496fbdcc883849038fe301f
AUD_CONTINUE_PRODUCT_HEAD=0e93583bd99ec74c8facb4176a60a839da327c59
CONTROL_PLANE_HEAD=d0f282123bb53ee1872f2d4b07955121c7f06f8f
FIRST_FAILURE_EXACT_SOURCE=3dcb3e63ad80c9fd8a201176c8ea18a51a86ad66
FIRST_FAILURE_RUN=32482253921;FAILURE
FIRST_FAILURE=official_handoff_unreachable:403
CAUSAL_PATCH_HEAD=75e1117fff3dd11d8502f756e1d38744ba6aa8c7
RETRY_EXACT_SOURCE_SHA=2877908749fec746b2eac1745a3643db584fe5e6
RETRY_WORKFLOW=VOY ORDER-048 Final Candidate 0
RETRY_RUN=32487962587;FAILURE
RETRY_JOB=96788693483
RETRY_ATTEMPT=2_OF_2
RETRY_CAUSAL_FAILURE=official_handoff_unreachable:403
RETRY_CAUSAL_FAILURE_STAGE=municipal-source-before
RETRY_CAUSAL_FAILURE_TIMESTAMP_UTC=2026-08-21T13:43:41.285Z
RETRY_LIMIT_EXHAUSTED=YES
CANDIDATE_VERSION_CREATED=NO
CANDIDATE_DEPLOYMENT_CREATED=NO
CLOUDFLARE_WRITE_REACHED=NO
D1_WRITE_EXECUTED=NO
D1_MIGRATION_EXECUTED=NO
PERSISTENT_DATA_MUTATION_EXECUTED=NO
GOOGLE_AUTH_ENABLED=NO
PRODUCTION_PROMOTION_EXECUTED=NO
MERGE_EXECUTED=NO
```

AUD comment `5370333447` classified the first failure as an environment-specific verifier failure and authorized exactly one causal retry after replacing the custom-UA Node fetch with a normal Chromium browser navigation. That correction was implemented without changing the handoff product contract. The retry is now exhausted and no further retry is authorized.

The Chromium verifier used the fixed exact HTTPS municipal URL, ordinary Playwright Chromium context/network defaults, no custom User-Agent, no extra headers, no authentication, no supplied cookies, no proxy and no anti-bot bypass. The municipal server returned HTTP `403`. The final response URL remained on `https://santafeciudad.gov.ar/.../colectivos/` but included a Cloudflare challenge query parameter `__cf_chl_rt_tk`. Per the explicit AUD/user boundary, this 403 is a causal STOP and was not converted into PASS or bypassed.

The failure occurred before candidate-config dry-run, `wrangler versions upload`, traffic split deployment, runtime/API/browser/real-map/tail validation, or any Cloudflare write. No ORDER-048 Worker version or deployment was created by either candidate attempt.

## ORDER-048 retry exact-head validation

### Causal patch head

```text
CAUSAL_PATCH_HEAD=75e1117fff3dd11d8502f756e1d38744ba6aa8c7
PATCH_RELEASE_POLICY_RUN=32487348928;SUCCESS
PATCH_EXACT_HEAD_RUN=32487348954;SUCCESS
PATCH_PR_VALIDATE_RUN=32487348951;SUCCESS
PATCH_UNIT_TESTS=217_PASS;0_FAIL
PATCH_BROWSER=112_PASS;0_FAIL;44_SKIP
PATCH_TYPECHECK=PASS;0_ERRORS;0_WARNINGS
PATCH_WRANGLER_DRY_RUN=PASS
PATCH_GOOGLE_AUTH_ENABLED=false
```

### Retry exact source

```text
RETRY_EXACT_SOURCE_SHA=2877908749fec746b2eac1745a3643db584fe5e6
RETRY_RELEASE_POLICY_RUN=32487965161;SUCCESS
RETRY_EXACT_HEAD_RUN=32487965165;SUCCESS
RETRY_PR_VALIDATE_RUN=32487965112;SUCCESS
RETRY_EXACT_HEAD_CI_GATE=GREEN
RUNNER_D1_MUTATION_PATH=ABSENT
MUNICIPAL_VERIFIER_CUSTOM_NETWORK_SHAPING=ABSENT
```

The retry workflow waited for all three exact-source checks above to complete successfully before invoking the operational runner. Only then did it run the municipal Chromium source check; the 403 occurred before the first Cloudflare write boundary.

## ORDER-048 retry immutable failure evidence

```text
RETRY_FAILURE_ARTIFACT_ID=9448729697
RETRY_FAILURE_ARTIFACT_NAME=voy-order48-final-candidate-32487962587
RETRY_FAILURE_ARTIFACT_BYTES=18301
RETRY_FAILURE_ARTIFACT_SHA256=0212872fc7d3ebd79065ebe6d5bb16b3b1b66ebf91ef053330bb51bd2b416e6e
RETRY_FAILURE_MANIFEST_SHA256=55744e168d8905ec39ccf1a8a2032e4f83ebe02a4582c993f603cfb6c9378976
MUNICIPAL_SOURCE_BEFORE_SHA256=d9d9b209fb3c90c8c75a9d4fd27ee26dea8d3d2ca747113283c9e8e69ec6e6bd
RUNNER_SAFETY_SHA256=2856722b3525e5aaf2b186880fa3194f14b5f83f706aeaecb90d28f734ea173c
EXACT_HEAD_CI_SHA256=7206e4d786fa7eb0a73f313d94c8b289640307a0b289a1f2b5c256f1639f0bab
AUTHORITY_WORKFLOW_SHA256=d00a222521c7bc15928e41272c0ac7cf737fc637bd85ba4fe732f2be828dc667
LOCKFILE_SHA256=e189a028c40e1462cfb7c9e758872d2c4ff89a2d756a2a957634bbe012324ec8
```

`municipal-source-before.json` is non-empty in retry evidence and records:

```text
RESULT=FAIL
FAILURE=official_handoff_unreachable:403
VERIFIER=chromium_browser_navigation
HTTP_STATUS=403
FINAL_PROTOCOL=https:
FINAL_HOST=santafeciudad.gov.ar
AUTHENTICATION_SUPPLIED=false
COOKIES_SUPPLIED=false
PROXY_USED=false
ANTI_BOT_BYPASS_USED=false
STALE_SUBSTITUTION=false
```

The artifact ZIP digest reported by GitHub matched an independent SHA-256 of the downloaded artifact.

## ORDER-048 first failure evidence preserved

```text
FIRST_FAILURE_ARTIFACT_ID=9446641822
FIRST_FAILURE_ARTIFACT_NAME=voy-order48-final-candidate-32482253921
FIRST_FAILURE_ARTIFACT_BYTES=17738
FIRST_FAILURE_ARTIFACT_SHA256=15472e0af5c8730512b6b1d37eaae8aba997b073aa5d16e8090155e44d5698e1
FIRST_FAILURE_MANIFEST_SHA256=f12bc23a91c83201c4cfd698447eda3102b10d3ba606c25152d71116b93f5713
```

The first attempt used the former Node fetch verifier and also stopped before Cloudflare write on HTTP 403. Its evidence remains preserved for comparison with the independent Chromium reproduction.

## Productive runtime — unchanged by ORDER-048

```text
ORDER46_STATUS=TERMINAL_COMPLETE
ISSUE46_STATE=CLOSED_COMPLETED
AUDITED_PRODUCT_SOURCE_SHA=4549acc6e9523e53a740d12ff118917622183c3e
PRODUCTIVE_VERSION_ID=5489843d-db43-4779-83fb-309b5a2dec7e
PRODUCTIVE_DEPLOYMENT_ID=cd6ffedd-12db-4340-aacd-4333f91aa15b
PRODUCTIVE_TRAFFIC=100%
PRODUCTIVE_BUILD_HASH=4549acc
APPLICATION_VERSION=V8.0.0
PREVIOUS_STABLE_VERSION_ID=002c464c-15fa-42f3-a762-0214a1dc5cf3
PREVIOUS_STABLE_TRAFFIC=0%
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

A cache-busted read-only production recheck after retry failure returned `ok=true`, `V8.0.0`, build `4549acc`, `auth=false`, `national_territory=true`; `/api/auth/session` remained `enabled=false`, `authenticated=false`, `persistent_account=false`, `trip_history_persisted=false`.

ORDER-046 production/release evidence remains preserved in closed Issue #46, PR #47, Git history and artifacts including production release run `32463678981`, artifact `9440085540`, and production evidence ZIP SHA-256 `2fd22fb0ffd9d46d978be085447e23c8b4657c52fa1ce3fb22f5e4e1ff1ee890`.

## Permanent mobility and safety invariants

- Santa Fe BUS remains unavailable inside VOY without accepted authoritative GTFS; ORDER-048 does not upgrade availability.
- The official handoff remains a typed external-information escape hatch, not a local bus route/ETA/fare claim.
- No unofficial mirror, cache, scraping workaround or challenge bypass may substitute for current official municipal source evidence without a new independently audited decision.
- Browser does not call Nominatim, OSRM or Mobility Database directly.
- Mobility Database remains discovery-only.
- APP_ONLY providers expose no fabricated numeric fare.
- AI does not calculate canonical routes, fares, times, availability or rankings.
- External actions require explicit expiring single-use confirmation.
- Audio, transcripts and exact-location history are not persistently stored.
- VOY works without login, voice or AI.
- Google auth remains disabled until a separate future authorization and runtime verification.

## Next step

```text
ORDER48_IMPLEMENTATION=COMPLETE
ORDER48_CAUSAL_PATCH=COMPLETE
ORDER48_CANDIDATE_ATTEMPT_1=FAILED_PRE_WRITE_HTTP_403_NODE_FETCH
ORDER48_CANDIDATE_ATTEMPT_2=FAILED_PRE_WRITE_HTTP_403_CHROMIUM
ORDER48_CANDIDATE_CREATED=NO
ORDER48_RETRY_LIMIT_EXHAUSTED=YES
ORDER48_RETRY_AUTHORIZED=NO
ORDER48_AUD_REQUIRED=YES
NEXT=INDEPENDENT_AUD_REVIEW_CHROMIUM_403_STOP
GOOGLE_AUTH_ENABLED=NO
D1_WRITE_EXECUTED=NO
PERSISTENT_DATA_MUTATION_EXECUTED=NO
MERGE_AUTHORIZED=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
ISSUE_39=DO_NOT_START_IN_THIS_BLOCK
```
