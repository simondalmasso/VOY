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

Production is restored and verified. No secrets, DNS, KV, Durable Objects, cron, bindings, routes or domains changed during the failed City Platform promotion or rollback.

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

City Platform remains a versioned territorial layer with five files per territory:

```text
profile.json
providers.json
transport.json
fares.json
feature_flags.json
```

Supported territorial IDs remain `_default` and `santafe`. Unknown IDs fail closed to `_default`; a Santa Fe failure remains same-city and cannot import national or cross-city cache data.

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

A single rollback was executed immediately after the first material failure.

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

## Confirmed validation defect

The former candidate direct-asset gate used a partial local list and did not include all five Santa Fe components. Its historical PASS cannot support another production decision.

The repair introduces one canonical thirteen-asset contract:

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

Canonical source: `scripts/required-city-platform-assets.mjs`.

Every required remote asset must satisfy status `200`, non-empty body, exact source SHA-256, valid JSON where applicable, schema validity and exact `city_id`. HTTP success without exact body identity is insufficient.

## Repair plan in progress

1. Probe failed version `aec70bcf-d02c-416a-b9f5-be4d83b34b32` at `0%` for thirty rounds separated by five seconds.
2. Record status, headers, colo, body hashes, schema and city identity for all thirteen assets.
3. Run desktop/mobile candidate browsers in fresh contexts with empty local/session/cache storage and blocked service workers.
4. Classify the root cause as transient propagation, intermittent 404, persistent providers 404, or content/schema failure.
5. Harden candidate gates and regressions using the canonical asset contract.
6. Create a new exact-head candidate only after diagnosis and repairs.
7. Preserve production at `4a8b91e` / `9508254e-6bbe-48ee-a126-d57d405b70a6` / `100%`.

## Authorization boundary

Allowed now:

```text
diagnostic reads
branch code/tests/workflow repairs
CI
a new Cloudflare version
stable 100% + candidate 0% deployment
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

Complete the thirty-round exact-version diagnostic and isolated browser validation of the failed candidate. Do not create or upload a replacement candidate until the root-cause classification is recorded.
