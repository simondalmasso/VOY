# VOY — Current State

Last updated: 2026-07-21

This file is the canonical operational worklog for VOY. Verified production, Cloudflare runtime state and remote Git state take precedence over older entries.

## Current productive baseline

```text
WORKER=voy-app
PRODUCTION_URL=https://voy-app.simondalmasso44.workers.dev/
HEALTH_URL=https://voy-app.simondalmasso44.workers.dev/api/health
PRODUCTION_VERSION=V7.8.0
PRODUCTION_GIT_SHA=4a8b91e605597989b3db19860a745c21472a3a14
PRODUCTION_BUILD=4a8b91e
PRODUCTION_VERSION_ID=9508254e-6bbe-48ee-a126-d57d405b70a6
PRODUCTION_TRAFFIC=100%
MAIN_SHA=4a8b91e605597989b3db19860a745c21472a3a14
MAIN_SHA_EQUALS_PRODUCTION_SHA=YES
```

Production is restored and verified. No secrets, DNS, KV, Durable Objects, cron, bindings, routes or domains changed during the failed City Platform promotion, rollback or subsequent diagnostics.

## Active development

```text
PHASE=CITY_PLATFORM_V1_REPAIR
BRANCH=feat/voy-city-platform-v1
PR=21
PR_STATE=OPEN
PR_DRAFT=YES
PR_MERGED=NO
BASE_SHA=4a8b91e605597989b3db19860a745c21472a3a14
INCIDENT_SOURCE_SHA=e5533edaf2c5982c837896adb00d144d5f4f84b7
READY_FOR_REVIEW=NO
READY_FOR_PRODUCTION=NO
```

City Platform remains a versioned territorial layer with five files per territory: `profile.json`, `providers.json`, `transport.json`, `fares.json` and `feature_flags.json`. Supported IDs remain `_default` and `santafe`. Unknown IDs fail closed to `_default`; a Santa Fe failure remains same-city and cannot import national or cross-city cache data.

## Failed production promotion

The first production authorization was consumed by one promotion attempt.

```text
PROMOTION_RUN=29837989028
PROMOTION_SOURCE_SHA=e5533edaf2c5982c837896adb00d144d5f4f84b7
PRE_PROMOTION_DEPLOYMENT_ID=2b77e063-512d-4fa8-9a25-1e46858807a2
PROMOTION_DEPLOYMENT_ID=10d84b9f-2282-4f5a-989f-748847f12c0b
PROMOTED_VERSION_ID=aec70bcf-d02c-416a-b9f5-be4d83b34b32
PROMOTED_VERSION_TRAFFIC_DURING_ATTEMPT=100%
PREVIOUS_STABLE_VERSION_ID=9508254e-6bbe-48ee-a126-d57d405b70a6
PREVIOUS_STABLE_TRAFFIC_DURING_ATTEMPT=0%
PRODUCTION_PROMOTION_ATTEMPT=FAILED
FIRST_CAUSAL_ERROR=HTTP_404_/cities/santa-fe/providers.json
```

The promoted version reached `build_hash=e5533ed` and passed three consecutive health/deployment convergence rounds. The subsequent mandatory asset gate returned a real `404` for `/cities/santa-fe/providers.json`; browser validation of the promoted version was therefore skipped.

Promotion evidence:

```text
ARTIFACT_ID=8498176912
ARTIFACT_DIGEST=sha256:fd96d92629a436d3a4ff8632c34827228228c741b222445d257b442487c9889e
```

## Single rollback

```text
ROLLBACK_EXECUTED=YES
ROLLBACK_COUNT=1
ROLLBACK_DEPLOYMENT_ID=cbe9fdb7-e422-4fbe-b754-86698d57e832
RESTORED_VERSION_ID=9508254e-6bbe-48ee-a126-d57d405b70a6
RESTORED_TRAFFIC=100%
FAILED_VERSION_ID=aec70bcf-d02c-416a-b9f5-be4d83b34b32
FAILED_VERSION_TRAFFIC=0%
SECOND_PRODUCTION_ATTEMPT=NO
ADDITIONAL_ROLLBACK_AUTHORIZED=NO
```

Independent rollback verification:

```text
ROLLBACK_VERIFICATION_RUN=29838350115
CONTROL_PLANE=PASS
HEALTH_THREE_ROUNDS=PASS
DESKTOP_BROWSER=PASS
MOBILE_BROWSER=PASS
PAGEERROR=0
CONSOLE_ERROR=0
DIRECT_NOMINATIM=0
ARTIFACT_ID=8498282688
ARTIFACT_DIGEST=sha256:fe3666a5b36b77a4daacfcfc0d373fc744acbef8d55f40938833b1ed85f78e38
```

## Root-cause classification

```text
ROOT_CAUSE_CLASS=TRANSIENT_EDGE_OR_PROPAGATION_EVENT
CLOUDFLARE_PRODUCT_DEFECT_ASSERTED=NO
APPLICATION_CONTENT_DEFECT=NO
SCHEMA_DEFECT=NO
```

The one-time production `404` was not reproduced against the same failed version after rollback. Exact-version diagnostic run `29841235393` used the original incident source, build hash and deploy timestamp and made thirty rounds separated by five seconds across all thirteen required assets.

```text
FAILED_CANDIDATE_VERSION_ID=aec70bcf-d02c-416a-b9f5-be4d83b34b32
DIAGNOSTIC_DEPLOYMENT_BEFORE=cbe9fdb7-e422-4fbe-b754-86698d57e832
DIAGNOSTIC_DEPLOYMENT_AFTER=cbe9fdb7-e422-4fbe-b754-86698d57e832
DIRECT_ASSET_ROUNDS=30
REQUIRED_ASSETS=13
TOTAL_REQUESTS=390
PASSED_REQUESTS=390
FAILED_REQUESTS=0
BODY_HASH_PASS=390
SCHEMA_PASS=390
DURATION_MS=147421
OBSERVED_COLO=SJC
PRODUCTION_TRAFFIC_CHANGED=NO
CANDIDATE_TRAFFIC_CHANGED=NO
```

`/cities/santa-fe/providers.json` returned `200` with non-empty body, exact source SHA-256, valid JSON, valid schema and `city_id=santafe` in all thirty rounds. Every other required asset, including `/` and `/VOY-Lite.html`, also passed exact body identity in all rounds.

Fresh-context browser validation in the same run passed desktop and mobile:

```text
BROWSER_DESKTOP=PASS
BROWSER_MOBILE=PASS
LOCAL_STORAGE_BEFORE=EMPTY
SESSION_STORAGE_BEFORE=EMPTY
CACHE_STORAGE_BEFORE=EMPTY
SERVICE_WORKERS_BEFORE=0
SANTA_FE_NETWORK_COMPONENTS=5/5
SANTA_FE_NETWORK_STATUS=200
SANTA_FE_NETWORK_HASH=PASS
PAGEERROR=0
CONSOLE_ERROR=0
DIRECT_NOMINATIM=0
HORIZONTAL_OVERFLOW=0
```

Diagnostic evidence:

```text
RUN_ID=29841235393
ARTIFACT_ID=8499539664
ARTIFACT_DIGEST=sha256:f3e3df0dd2b2ca9c52aeb91991eef1fa95312d37a0b0df2248d4d15d4e3b6953
```

This evidence permits only the bounded conclusion that the historical `404` was transient or propagation-related. It does not prove a permanent Cloudflare defect and it does not authorize reuse or promotion of the failed version.

## Confirmed validation defect and repair

The former candidate direct-asset gate used a partial local list and omitted four Santa Fe components. Its historical PASS cannot support another production decision.

The repair defines one canonical thirteen-asset contract in `scripts/required-city-platform-assets.mjs`:

```text
/
/VOY-Lite.html
/core/cityPlatform.js?v=1
/cities/_default/profile.json
/cities/_default/providers.json
/cities/_default/transport.json
/cities/_default/fares.json
/cities/_default/feature_flags.json
/cities/santa-fe/profile.json
/cities/santa-fe/providers.json
/cities/santa-fe/transport.json
/cities/santa-fe/fares.json
/cities/santa-fe/feature_flags.json
```

Every required remote asset must satisfy status `200`, non-empty body, exact source SHA-256, valid JSON where applicable, schema validity and exact `city_id`. HTTP success without exact body identity is insufficient.

The hardened candidate convergence policy requires:

```text
REQUIRED_CONSECUTIVE_ROUNDS=20
MINIMUM_DURATION_MS=120000
REQUIRED_ASSETS_PER_ROUND=13
BODY_HASH_REQUIRED=YES
CANDIDATE_HEALTH_REQUIRED=YES
STABLE_HEALTH_REQUIRED=YES
DEPLOYMENT_EXACT_PAIR_REQUIRED=YES
BROWSER_AFTER_CONVERGENCE=YES
CLEAN_BROWSER_STORAGE=YES
```

Regressions fail when a required path is missing, when Santa Fe providers is removed from the contract, when body content is empty or differs from source, when JSON or schema is invalid, when `city_id` differs, or when a fallback body is mistaken for the remote asset.

## Authorization boundary

Allowed now:

```text
branch code/tests/workflow repairs
CI
one new exact-head Cloudflare version
stable 100% + new candidate 0% deployment
version override
candidate browser validation
```

Not allowed now:

```text
second production promotion
PR #21 merge
PR #22 merge
additional rollback
productive traffic change
Voice Copilot runtime
secret/DNS/KV/Durable Object/cron/binding changes
```

## Exact next step

Complete exact-head CI, upload a new candidate from the final repair head, preserve stable production at 100%, require twenty exact thirteen-asset rounds over at least 120 seconds, then execute isolated desktop/mobile candidate browsers and stop at candidate traffic 0%.
