# VOY — Auditable Repository Worklog

Last updated: 2026-07-26

## Authority and purpose

Google Drive is the canonical project-state, authorization and audit bus. This file is an auditable repository worklog; it is not a substitute for the current Drive mission, an AUD verdict, direct production verification or the effective Cloudflare control plane.

Live runtime claims require fresh evidence. Historical candidate, deployment, traffic and binding data are labeled `LAST_VERIFIED`; unavailable current control-plane facts are labeled `CURRENT_NO_VERIFICADO`.

## Current pinned repository state

Verified immediately before `VOY-VOICE-DOCUMENTARY-RECONCILIATION-01` began:

```text
MAIN_SHA=841d9f4ecd573c32e5f9ac7238d4109812a221bf
MAIN_DRIFT=NO
SINGLE_OPERATIONAL_WRITER=ARQ_THIS_CHAT
GITHUB_WORKFLOWS_IN_PROGRESS=0
GITHUB_WORKFLOWS_QUEUED=0
```

Open pull requests:

```text
PR_23=OPEN_DRAFT;MERGED=NO;HEAD=548165574d1f06ee44c6b898ce0afb794f67bfee
PR_24=OPEN_DRAFT;MERGED=NO;HEAD=1abcd930af1d8319dcb178b97a687b79939b992a
```

PR #23 is the bounded Voice Copilot implementation. PR #24 is documentation-only Google authentication planning. Neither PR is authorized for merge by this worklog or by the current documentation execution.

## Public production — last verified

Public verification at `2026-07-25T19:52:24.343Z` returned:

```text
LAST_VERIFIED_PUBLIC_PRODUCTION_OK=YES
LAST_VERIFIED_PUBLIC_APPLICATION_VERSION=V7.8.0
LAST_VERIFIED_PUBLIC_BUILD=841d9f4
LAST_VERIFIED_DEFAULT_AI_COPILOT=false
LAST_VERIFIED_DEFAULT_VOICE_INPUT=false
LAST_VERIFIED_SANTAFE_AI_COPILOT=false
LAST_VERIFIED_SANTAFE_VOICE_INPUT=false
```

The public site was reachable and served the expected VOY application. These public observations do not prove the current Cloudflare version ID, deployment ID, traffic split or binding set.

## Voice candidate — historical exact-head evidence

The following values were verified by the successful candidate workflow and artifact on 2026-07-23. They are historical evidence, not claims about the current Cloudflare control plane:

```text
LAST_VERIFIED_VOICE_PR_HEAD=548165574d1f06ee44c6b898ce0afb794f67bfee
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

Last-verified candidate binding delta:

```text
LAST_VERIFIED_PRODUCTION_BINDING_COUNT=13
LAST_VERIFIED_ADDITIONAL_BINDINGS=AI:ai;VOY_VOICE_TEST_MODE:plain_text
```

Evidence:

```text
VOICE_CANDIDATE_RUN=29988844118
VOICE_CANDIDATE_RUN_RESULT=SUCCESS
VOICE_ARTIFACT_ID=8556305313
VOICE_ARTIFACT_EXPIRED_AT_PREFLIGHT=NO
VOICE_ARTIFACT_DIGEST=sha256:6934656bbadeff7dd656762f35bfbc93af615eeb6d4657b4a7b3722b9a18cddd
VOICE_MANIFEST_DIGEST=sha256:691fbac7c907c7d6983c3b5f694ac01a0ae8eb1a1fa64d7f663236a192c1fe07
```

## Current Cloudflare state

No Cloudflare control-plane connector was available during the preflight. Therefore:

```text
CURRENT_CLOUDFLARE_VERSIONS=NO_VERIFICADO
CURRENT_CLOUDFLARE_DEPLOYMENTS=NO_VERIFICADO
CURRENT_TRAFFIC_SPLIT=NO_VERIFICADO
CURRENT_CANDIDATE_PERSISTENCE_AT_0_PERCENT=NO_VERIFICADO
CURRENT_EFFECTIVE_BINDINGS=NO_VERIFICADO
CURRENT_SECRETS_DNS_KV_DO_CRON_ROUTES=NO_VERIFICADO
```

No conclusion about current candidate persistence, traffic or bindings may be inferred from historical workflow evidence alone.

## Active documentation execution

```text
MISSION_ID=VOY-VOICE-NEXT-BLOCK-PREFLIGHT-01
EXECUTION_ID=VOY-VOICE-DOCUMENTARY-RECONCILIATION-01
BASE=main@841d9f4ecd573c32e5f9ac7238d4109812a221bf
BRANCH=docs/voy-voice-candidate-reconciliation-v1
FILE_SCOPE=docs/CURRENT_STATE.md;docs/voice/voice-candidate-reconciliation-v1.md
AUD_VERDICT=PASS_WITH_FINDINGS
MERGE_AUTHORIZED=NO
CLOUDFLARE_ACTION_AUTHORIZED=NO
PRODUCTION_ACTION_AUTHORIZED=NO
```

This execution may update only the two documentation paths above, run existing validation and open a Draft PR. It must not alter PR #23, PR #24, source runtime, workflows, Cloudflare, production, traffic, bindings, secrets, DNS, KV, Durable Objects, cron, routes or feature flags.

## Next gate

Complete existing CI, prove the diff contains exactly the two authorized documentation paths, persist execution evidence in Drive and request a post-operation AUD review. No merge, phase closure or further material action is authorized before a new matching verdict.
