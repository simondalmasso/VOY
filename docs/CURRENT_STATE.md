# VOY — Current State

Last updated: 2026-07-21

This is the canonical operational worklog. Authority order remains production and Cloudflare runtime, then candidate state, GitHub, CI evidence and documentation.

## Production

```text
WORKER=voy-app
URL=https://voy-app.simondalmasso44.workers.dev/
HEALTH_URL=https://voy-app.simondalmasso44.workers.dev/api/health
APPLICATION_VERSION=V7.8.0
PRODUCTION_SOURCE_SHA=85659454cf6983c39338e0cecbed8e1a6b3f3cb4
PRODUCTION_BUILD=8565945
PRODUCTION_VERSION_ID=89f7d347-4fb4-400e-8a75-ddb18ae8ca13
PRODUCTION_DEPLOYMENT_ID=b0c1c5a4-deb5-4715-8f2e-d8da297e3ad9
PRODUCTION_TRAFFIC=100%
PREVIOUS_VERSION_ID=9508254e-6bbe-48ee-a126-d57d405b70a6
PREVIOUS_VERSION_TRAFFIC=0%
```

City Platform V1 is active in normal production traffic. No secrets, DNS, KV, Durable Objects, cron, bindings, routes or domains changed during the release.

## City Platform V1 completion

```text
PR=21
PR_HEAD=85659454cf6983c39338e0cecbed8e1a6b3f3cb4
PR_STATE=MERGED
MERGE_SHA=8080735278e92f32e7f5928ac01f4c80c3b9e0e2
SECOND_PROMOTION_RUN=29851472261
SECOND_PROMOTION_RESULT=PASS
```

Reinforced productive validation:

```text
CONVERGENCE_ROUNDS=20
CONVERGENCE_DURATION_MS=139604
REQUIRED_ASSETS=13/13
BODY_HASH_PASS=13/13
SCHEMA_PASS=13/13
PRODUCTION_DESKTOP=PASS
PRODUCTION_MOBILE=PASS
PAGEERROR=0
CONSOLE_ERROR=0
DIRECT_NOMINATIM=0
HORIZONTAL_OVERFLOW=0
TAIL_EVENTS=85
TAIL_NON_OK=0
```

Evidence:

```text
ARTIFACT_ID=8503650341
ARTIFACT_DIGEST=sha256:c23df595c6a8d41cbfff995ba9dcb22ace47832e1e4faaa06a7eb9ac4395c0d4
INTERNAL_MANIFEST_DIGEST=sha256:c46878999dbc9e6573ef515a7308fd0cf8aee32dc3276cae2cd722f7645d8a0e
```

### Incident and rollback history

The first production attempt from `e5533edaf2c5982c837896adb00d144d5f4f84b7` encountered a real `404` for `/cities/santa-fe/providers.json`. A single rollback restored `9508254e-6bbe-48ee-a126-d57d405b70a6` and was verified. Subsequent exact-version diagnosis classified the event as transient edge or propagation behavior. The gate was repaired before the successful second attempt.

```text
FIRST_PROMOTION_RUN=29837989028
FIRST_PROMOTION_RESULT=FAILED_REQUIRED_ASSET_404
FIRST_ROLLBACK_DEPLOYMENT_ID=cbe9fdb7-e422-4fbe-b754-86698d57e832
ROLLBACK_VERIFICATION_RUN=29838350115
ROOT_CAUSE_CLASS=TRANSIENT_EDGE_OR_PROPAGATION_EVENT
FIRST_ATTEMPT_ROLLBACK_EXECUTED=YES
SECOND_ATTEMPT_ROLLBACK_EXECUTED=NO
THIRD_ATTEMPT_EXECUTED=NO
```

## Canonical City Platform contract

Each territory has exactly five files:

```text
profile.json
providers.json
transport.json
fares.json
feature_flags.json
```

Supported city IDs remain `_default` and `santafe`. The canonical thirteen-asset release contract is defined in `scripts/required-city-platform-assets.mjs`. Required remote assets must pass HTTP status, non-empty body, exact materialized-source SHA-256, JSON parsing and schema where applicable, exact `city_id` and no redirects.

The runtime remains fail-closed:

```text
remote versioned profile
→ valid same-city v2 cache
→ valid upgraded same-city legacy cache
→ same-city emergency profile
```

No city may import stale or cached data from another territory. Direct browser calls to Nominatim remain prohibited.

## GitHub and exact-main reconciliation

```text
CURRENT_MAIN_SHA=8080735278e92f32e7f5928ac01f4c80c3b9e0e2
CURRENT_PRODUCTION_SOURCE_SHA=85659454cf6983c39338e0cecbed8e1a6b3f3cb4
MAIN_SHA_EQUALS_PRODUCTION_SHA=NO
```

The difference is expected after the PR #21 merge commit. Production content corresponds to the exact PR source, but final audit convergence requires a new Cloudflare version built from the final `main` after Voice Copilot planning documentation is merged.

## Voice Copilot planning

```text
PR=22
BRANCH=docs/voy-voice-copilot-v1-planning
SCOPE=DOCUMENTATION_ONLY
RUNTIME_CHANGES=0
WORKFLOW_CHANGES=0
BINDING_CHANGES=0
SECRET_CHANGES=0
CLOUDFLARE_CHANGES=0
VOICE_RUNTIME_STARTED=NO
```

PR #22 has been updated against the City Platform merge. It defines bounded conversational voice architecture, typed tool mediation, central state, audit records, typed events, cancellations, single-use confirmations, SSRF defenses, bounded readers, minimized context and privacy requirements.

Selected implementation posture after exact-main reconciliation:

```text
STT=@cf/openai/whisper-large-v3-turbo
LLM=@cf/qwen/qwen3-30b-a3b-fp8
TTS=browser speechSynthesis
VOICEBOX=optional_disabled
```

## Authorization boundary

Authorized pipeline remaining:

1. validate and merge documentation-only PR #22;
2. create and validate an exact-final-main Cloudflare candidate at 0%;
3. promote exact-final-main only after all gates pass;
4. prove `MAIN_SHA_EQUALS_PRODUCTION_SHA=YES`;
5. create `feat/voy-voice-copilot-v1` from that productive SHA;
6. implement, test and create a Voice Copilot candidate at 0%.

Not authorized:

```text
Voice Copilot production promotion
Voice Copilot PR merge
productive Voice feature flags
paid external providers
DNS changes
secret changes beyond the explicitly authorized Workers AI binding contract
persistent audio or transcript storage
```

## Exact next step

Run the full documentation-only CI for PR #22. If it passes and the diff remains documentation-only, mark it ready and merge it. Then reconcile the exact final `main` with Cloudflare before creating the Voice Copilot implementation branch.
