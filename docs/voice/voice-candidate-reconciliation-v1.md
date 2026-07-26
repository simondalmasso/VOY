# VOY Voice Candidate — Evidence Reconciliation V1

## Scope

```text
EXECUTION_ID=VOY-VOICE-DOCUMENTARY-RECONCILIATION-01
BASE=main@841d9f4ecd573c32e5f9ac7238d4109812a221bf
BRANCH=docs/voy-voice-candidate-reconciliation-v1
AUTHORIZED_FILES=docs/CURRENT_STATE.md;docs/voice/voice-candidate-reconciliation-v1.md
MERGE_AUTHORIZED=NO
```

This document reconciles the available Voice Copilot candidate evidence without modifying the Voice implementation, its pull request, Cloudflare or production.

Google Drive is the canonical project-state and authorization bus. This repository document is supporting evidence only.

## Prewrite exact gate

The material documentation write began only after the following readback:

```text
SINGLE_OPERATIONAL_WRITER=ARQ_THIS_CHAT
MAIN_SHA=841d9f4ecd573c32e5f9ac7238d4109812a221bf
MAIN_STATUS=IDENTICAL
TARGET_BRANCH_STATUS=ABSENT_BEFORE_ARQ_CREATION
NEW_FILE_STATUS=ABSENT_AT_BASE
PR_23=OPEN_DRAFT;MERGED=NO;HEAD=548165574d1f06ee44c6b898ce0afb794f67bfee
PR_24=OPEN_DRAFT;MERGED=NO;HEAD=1abcd930af1d8319dcb178b97a687b79939b992a
GITHUB_WORKFLOWS_IN_PROGRESS=0
GITHUB_WORKFLOWS_QUEUED=0
```

AUD authorized only creation of the pinned documentation branch, writes to the two pinned files, existing validation and a Draft PR. Merge, Cloudflare and production actions remain prohibited.

## Current GitHub facts

At execution preflight:

```text
CURRENT_MAIN_SHA=841d9f4ecd573c32e5f9ac7238d4109812a221bf
CURRENT_PR_23_STATE=OPEN_DRAFT
CURRENT_PR_23_MERGED=NO
CURRENT_PR_23_HEAD=548165574d1f06ee44c6b898ce0afb794f67bfee
CURRENT_PR_24_STATE=OPEN_DRAFT
CURRENT_PR_24_MERGED=NO
CURRENT_PR_24_HEAD=1abcd930af1d8319dcb178b97a687b79939b992a
```

No change to either pull request is part of this execution.

## Public production — last verified observation

A public health request at `2026-07-25T19:52:24.343Z` returned:

```text
LAST_VERIFIED_PUBLIC_OK=YES
LAST_VERIFIED_PUBLIC_VERSION=V7.8.0
LAST_VERIFIED_PUBLIC_BUILD=841d9f4
```

Territorial feature flags returned:

```text
LAST_VERIFIED_DEFAULT_AI_COPILOT=false
LAST_VERIFIED_DEFAULT_VOICE_INPUT=false
LAST_VERIFIED_SANTAFE_AI_COPILOT=false
LAST_VERIFIED_SANTAFE_VOICE_INPUT=false
```

These observations show that the public surface was serving the expected main build and did not expose Voice or AI through the checked flags at that time. They do not establish current Cloudflare version, deployment, traffic or bindings.

## Voice candidate — last verified evidence

The successful candidate workflow and artifact from 2026-07-23 support the following historical facts:

```text
LAST_VERIFIED_SOURCE_SHA=548165574d1f06ee44c6b898ce0afb794f67bfee
LAST_VERIFIED_CANDIDATE_VERSION_ID=9ad8dbc0-0525-45d3-b299-7c43f180b241
LAST_VERIFIED_CANDIDATE_VERSION_NUMBER=102
LAST_VERIFIED_CANDIDATE_BUILD=5481655
LAST_VERIFIED_CANDIDATE_DEPLOYMENT_ID=f56c2e98-7373-4642-abeb-e9b8245707db
LAST_VERIFIED_CANDIDATE_TRAFFIC=0%
LAST_VERIFIED_PRODUCTION_VERSION_ID=1ddc8c2d-5c44-4217-b64b-61470d0cbe08
LAST_VERIFIED_PRODUCTION_TRAFFIC=100%
LAST_VERIFIED_PRODUCTION_PROMOTED=NO
LAST_VERIFIED_ROLLBACK_EXECUTED=NO
```

Binding evidence at that verification point:

```text
LAST_VERIFIED_PRODUCTION_BINDING_COUNT=13
LAST_VERIFIED_CANDIDATE_ADDITIONAL_BINDING_1=AI:ai
LAST_VERIFIED_CANDIDATE_ADDITIONAL_BINDING_2=VOY_VOICE_TEST_MODE:plain_text
```

Provider evidence:

```text
LAST_VERIFIED_STT_PROVIDER=@cf/openai/whisper-large-v3-turbo
LAST_VERIFIED_LLM_PROVIDER=@cf/qwen/qwen3-30b-a3b-fp8
LAST_VERIFIED_TTS_PROVIDER=browser:speechSynthesis
```

Validation evidence:

```text
LAST_VERIFIED_FROZEN_INSTALL=PASS
LAST_VERIFIED_LINT=PASS
LAST_VERIFIED_TESTS=237/237_PASS
LAST_VERIFIED_WRANGLER_DRY_RUN=PASS
LAST_VERIFIED_CANDIDATE_DESKTOP=PASS
LAST_VERIFIED_CANDIDATE_MOBILE=PASS
LAST_VERIFIED_PAGEERROR=0
LAST_VERIFIED_CONSOLE_ERROR=0
LAST_VERIFIED_FAILED_REQUESTS=0
LAST_VERIFIED_DIRECT_NOMINATIM=0
LAST_VERIFIED_TAIL_EXACT_CANDIDATE_EVENTS=100
LAST_VERIFIED_TAIL_NON_OK=0
```

Security and privacy evidence:

```text
LAST_VERIFIED_CLOSED_TOOL_ALLOWLIST=YES
LAST_VERIFIED_STRICT_SCHEMAS=YES
LAST_VERIFIED_NO_TOOL_SUCCESS_NO_ACTION_CLAIM=ENFORCED
LAST_VERIFIED_EXTERNAL_ACTION_CONFIRMATION=REQUIRED
LAST_VERIFIED_CONFIRMATION_SINGLE_USE=YES
LAST_VERIFIED_AUDIO_PERSISTED=NO
LAST_VERIFIED_TRANSCRIPT_PERSISTED=NO
LAST_VERIFIED_VOICE_STORAGE_KEYS=0
LAST_VERIFIED_VOICE_COOKIES=0
```

Artifact references:

```text
VOICE_CANDIDATE_RUN=29988844118
VOICE_CANDIDATE_RUN_RESULT=SUCCESS
VOICE_ARTIFACT_ID=8556305313
VOICE_ARTIFACT_EXPIRED_AT_PREFLIGHT=NO
VOICE_ARTIFACT_DIGEST=sha256:6934656bbadeff7dd656762f35bfbc93af615eeb6d4657b4a7b3722b9a18cddd
VOICE_MANIFEST_DIGEST=sha256:691fbac7c907c7d6983c3b5f694ac01a0ae8eb1a1fa64d7f663236a192c1fe07
```

## Current state not verified

No effective Cloudflare control-plane read was available during this execution. The following must remain unresolved until directly verified:

```text
CURRENT_CLOUDFLARE_VERSIONS=NO_VERIFICADO
CURRENT_CLOUDFLARE_DEPLOYMENTS=NO_VERIFICADO
CURRENT_TRAFFIC_SPLIT=NO_VERIFICADO
CURRENT_CANDIDATE_PERSISTENCE_AT_0_PERCENT=NO_VERIFICADO
CURRENT_EFFECTIVE_BINDINGS=NO_VERIFICADO
CURRENT_SECRETS_DNS_KV_DO_CRON_ROUTES=NO_VERIFICADO
```

Historical exact-head evidence must not be converted into a claim that the candidate still exists, still receives 0% traffic or still has the same effective bindings.

## Explicitly unchanged surfaces

```text
PR_23_HEAD_CHANGED=NO
PR_24_HEAD_CHANGED=NO
SOURCE_RUNTIME_CHANGED=NO
WORKFLOW_FILES_CHANGED=NO
CLOUDFLARE_CHANGED=NO
PRODUCTION_CHANGED=NO
TRAFFIC_CHANGED=NO
BINDINGS_CHANGED=NO
SECRETS_CHANGED=NO
DNS_KV_DO_CRON_ROUTES_CHANGED=NO
FEATURE_FLAGS_CHANGED=NO
```

## Decision and next gate

The selected posture is to preserve PR #23 and its historical candidate evidence without touching either, while closing repository documentation debt on a separate Draft PR.

Before any merge or additional material action:

1. Existing CI must complete.
2. The pull-request diff must contain exactly the two authorized documentation paths.
3. Branch, commits, CI and unchanged-surface evidence must be persisted in Drive.
4. AUD must perform a post-operation review.
5. A separate explicit authorization is required for merge, Cloudflare, production or feature activation.
