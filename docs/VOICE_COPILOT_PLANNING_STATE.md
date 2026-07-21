# VOY Voice Copilot V1 — Planning State

Last updated: 2026-07-21

## Current phase

```text
VOICE_PHASE=DOCUMENTATION_COMPLETE
VOICE_RUNTIME_STARTED=NO
VOICE_IMPLEMENTATION_BRANCH=NOT_CREATED
VOICE_PRODUCTION_PROMOTED=NO
```

Voice Copilot V1 remains planning-only in PR #22. The implementation must use a new branch created from the exact final productive `main` after documentation merge and Cloudflare reconciliation.

## City Platform prerequisite

City Platform V1 passed the reinforced second production promotion and PR #21 was merged.

```text
CITY_PLATFORM_PR=21
CITY_PLATFORM_PR_HEAD=85659454cf6983c39338e0cecbed8e1a6b3f3cb4
CITY_PLATFORM_MERGE_SHA=8080735278e92f32e7f5928ac01f4c80c3b9e0e2
SECOND_PROMOTION_RUN=29851472261
PRODUCTION_VERSION_ID=89f7d347-4fb4-400e-8a75-ddb18ae8ca13
PRODUCTION_DEPLOYMENT_ID=b0c1c5a4-deb5-4715-8f2e-d8da297e3ad9
PRODUCTION_BUILD=8565945
PRODUCTION_TRAFFIC=100%
CONVERGENCE_ROUNDS=20
CONVERGENCE_DURATION_MS=139604
REQUIRED_ASSETS=13/13
PRODUCTION_DESKTOP=PASS
PRODUCTION_MOBILE=PASS
PAGEERROR=0
CONSOLE_ERROR=0
DIRECT_NOMINATIM=0
```

The first production attempt failed on a transient required-asset `404` and was rolled back once. The second attempt required no rollback.

```text
FIRST_ATTEMPT_ROLLBACK_EXECUTED=YES
SECOND_ATTEMPT_ROLLBACK_EXECUTED=NO
ROOT_CAUSE_CLASS=TRANSIENT_EDGE_OR_PROPAGATION_EVENT
```

## Remaining implementation gate

The merge commit differs from the currently deployed City Platform source SHA. Voice runtime remains blocked until PR #22 is merged and a version built from the exact final `main` is validated and promoted.

```text
CURRENT_MAIN_SHA=8080735278e92f32e7f5928ac01f4c80c3b9e0e2
CURRENT_PRODUCTION_SOURCE_SHA=85659454cf6983c39338e0cecbed8e1a6b3f3cb4
MAIN_SHA_EQUALS_PRODUCTION_SHA=NO
VOICE_RUNTIME_READY_TO_START=NO
```

After PR #22 merge:

1. obtain the exact final `main` SHA;
2. frozen install, lint, all tests and Wrangler dry-run;
3. upload one Cloudflare version from that exact SHA;
4. keep current production at 100% and the exact-main candidate at 0%;
5. validate health, bindings, thirteen required assets, exact hashes and desktop/mobile browsers;
6. promote only after every gate passes;
7. prove `MAIN_SHA_EQUALS_PRODUCTION_SHA=YES`;
8. create `feat/voy-voice-copilot-v1` from that exact productive SHA.

## Selected V1 provider posture

```text
STT_PROVIDER=Workers AI @cf/openai/whisper-large-v3-turbo
LLM_PROVIDER=Workers AI @cf/qwen/qwen3-30b-a3b-fp8
TTS_PROVIDER=browser speechSynthesis
VOICEBOX_LOCAL=optional_disabled
PAID_EXTERNAL_PROVIDER_KEYS=NONE
```

Provider implementations remain behind `STTProvider`, `LLMProvider` and `TTSProvider` interfaces. The LLM interprets conversation and selects typed tools; it never calculates canonical mobility values.

## Mandatory architecture

```text
user audio or text
→ transient STT when applicable
→ bounded multi-turn conversation
→ model selects one allowlisted typed tool
→ strict schema validation
→ MobilityStateAdapter
→ deterministic VOY calculation or lookup
→ central state commit
→ ToolExecutionRecord
→ typed events
→ bounded explanation
→ browser TTS when enabled
```

Invariant:

```text
NO_TOOL_SUCCESS → NO_ACTION_CLAIM
```

The model cannot invent or calculate fares, routes, distances, times, coordinates, availability, coverage or ranking. Those values must come from deterministic VOY tools and validated territorial data.

## Closed tool and security posture

The implementation must preserve the allowlist, state, event, confirmation, cancellation, SSRF, bounded-reader, context-minimization, privacy and regression contracts in:

- `docs/architecture/voice-copilot-v1.md`
- `docs/architecture/voice-copilot-geolibre-lessons.md`
- `docs/contracts/voice-copilot-v1-contracts.md`
- `docs/data/voice-provider-matrix.md`
- `docs/privacy/voice-copilot-policy.md`
- `docs/security/voice-copilot-threat-model.md`
- `docs/testing/voice-copilot-v1-test-plan.md`
- `docs/testing/voice-copilot-geolibre-regressions.md`

Explicitly prohibited:

```text
arbitrary_fetch
run_javascript
run_python
shell
raw_sql
dynamic_tools
repository_access
Cloudflare_modification
secret_access
KV_write
Durable_Object_write
model_generated_code
```

## Feature flags

Initial productive defaults remain disabled:

```text
ai_copilot=false
voice_input=false
voice_output=false
voicebox_local=false
```

Voice functionality may be enabled only in tests and the zero-traffic candidate through a controlled mechanism. No productive flag activation is authorized by the planning PR.

## Planning completion

```text
PLANNING_COMPLETE=YES
DOCUMENTS_ONLY=YES
RUNTIME_CHANGES=0
WORKFLOW_CHANGES=0
BINDING_CHANGES=0
SECRET_CHANGES=0
CLOUDFLARE_CHANGES=0
READY_FOR_DOCUMENT_REVIEW=YES
VOICE_RUNTIME_READY_TO_START=NO
```
