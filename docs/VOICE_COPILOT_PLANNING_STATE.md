# VOY Voice Copilot V1 — Planning State

Last updated: 2026-07-21

## Current phase

```text
VOICE_PHASE_STATUS=PLANNING_ONLY
CODE_CHANGES=NO
RUNTIME_CHANGES=NO
PROVIDER_ACTIVATED=NO
PAID_API_ENABLED=NO
```

Reason:

- PR #21 is open, no longer Draft and mergeable;
- the City Platform candidate passed runtime, desktop and mobile validation;
- PR #21 is ready for production but is not merged;
- the candidate remains at 0% and production remains `V7.8.0` with build hash `4a8b91e`;
- City Platform V1 is therefore not yet the productive `main` baseline.

Verified state:

```text
PR_21_STATE=OPEN
PR_21_DRAFT=NO
PR_21_MERGEABLE=YES
CITY_PLATFORM_CANDIDATE=PASS
READY_FOR_PRODUCTION=YES
PRODUCTION_PROMOTED=NO

PR_22_STATE=OPEN
PR_22_DRAFT=YES
RUNTIME_CHANGES=0
```

## Planning branch

```text
branch: docs/voy-voice-copilot-v1-planning
base: main@4a8b91e605597989b3db19860a745c21472a3a14
scope: documentation only
```

This branch must not be used for runtime implementation or deployment.

## Completed planning artifacts

```text
docs/architecture/voice-copilot-v1.md
docs/architecture/voice-copilot-geolibre-lessons.md
docs/privacy/voice-copilot-policy.md
docs/data/voice-provider-matrix.md
docs/security/voice-copilot-threat-model.md
docs/contracts/voice-copilot-v1-contracts.md
docs/testing/voice-copilot-v1-test-plan.md
docs/testing/voice-copilot-geolibre-regressions.md
```

The GeoLibre documents are normative planning addenda. They record transferable architectural lessons only. They do not introduce a GeoLibre package, integration or runtime dependency.

## Decisions in force

- Voice Copilot is a bounded mobility interface, not a general assistant.
- AI cannot calculate fares, routes, distances, times, availability, coordinates or rankings.
- Operational facts come only from deterministic VOY tools.
- Every state change is mediated by a typed allowlisted tool and `MobilityStateAdapter`.
- `NO_TOOL_SUCCESS → NO_ACTION_CLAIM` is mandatory.
- The DOM and map render central state; they are not independent authorities.
- A visible bounded tool transcript explains successful, failed, pending and cancelled operations without exposing sensitive payloads.
- Text, tool, confirmation, speech, cancellation and error output use a typed event protocol.
- Every turn is cancelable and superseding a request aborts prior STT, resolution, tools and TTS and invalidates pending confirmation.
- Model context is minimized, canonicalized and hash-tracked; unchanged territorial context is not resent.
- Runtime schemas reject unknown keys and non-allowlisted tool names.
- General networking uses an SSRF guard and bounded response reader.
- The only loopback exception is the explicit opt-in `VoiceboxLocalAdapter` for `http://127.0.0.1:17493` with fixed endpoints and no redirects.
- External actions use expiring, context-bound, one-time confirmation tokens.
- Model-generated JavaScript, Python, SQL, shell code and dynamic tools are prohibited.
- VOY supports bounded restoration of its own origin, destination, mode and results, but never claims to undo an action inside another application.
- External actions always require explicit confirmation.
- Audio is request-scoped and never persisted by VOY.
- Transcript and conversational memory are ephemeral: maximum ten turns and 15 minutes.
- No WebSocket or new Durable Object is planned for V1 without measured need and separate authorization.
- Provider adapters remain interchangeable and provider keys never reach browser assets.
- Initial provider recommendation is Workers AI Whisper STT, deterministic intents and browser `speechSynthesis`.
- Cloud LLM and cloud TTS remain later controlled pilots.
- Voicebox remains optional, explicit opt-in and desktop-first.
- All territorial flags remain false until implementation and device gates pass.
- Manual VOY must remain functional through every failure.

## GeoLibre architectural lessons

Accepted patterns:

```text
tool-mediated execution
central state adapter
auditable tool transcript
stream event protocol
context minimization
strict schema validation
SSRF guard
bounded response reader
single-use confirmations
provider abstraction
explicit no-code-execution rule
VOY-specific reversibility
```

Explicitly not adopted:

```text
DuckDB
DuckDB-WASM
Pyodide
deck.gl
Strands Agents as mandatory dependency
model-generated SQL
model-generated JavaScript
model-generated Python
GIS editor
layer system
browser provider keys
model-directed free fetch
GeoLibre package installation
complete-file copying
```

```text
GEOLIBRE_PATTERNS_REVIEWED=YES
GEOLIBRE_RUNTIME_DEPENDENCY=NO
TOOL_MEDIATED_ARCHITECTURE=DEFINED
AUDIT_TRANSCRIPT=DEFINED
CONTEXT_MINIMIZATION=DEFINED
SSRF_GUARD=DEFINED
CODE_EXECUTION_FALLBACK=PROHIBITED
```

## Implementation gate

Create the implementation branch only when all conditions are verified:

```text
PR_21_MERGED=YES
CITY_PLATFORM_PRODUCTION=PASS
MAIN_SHA_EQUALS_PRODUCTION_SHA=YES
PRODUCTION_HEALTH=PASS
PRODUCTION_DESKTOP=PASS
PRODUCTION_MOBILE=PASS
ROLLBACK_STATE=RECORDED
```

Then create:

```text
branch: feat/voy-voice-copilot-v1
base: exact productive main SHA
Draft PR: feat(voice): add bounded mobility voice copilot
```

Do not branch from this planning branch.

## First implementation milestone

Phase 2 only:

```text
external voice modules
explicit state machine
central VoiceCopilotSession
MobilityStateAdapter mock
closed tool registry
mock ToolExecutionRecord and event protocol
microphone permission UI
MediaRecorder with feature-detected MIME
cancel and supersession cleanup
editable transcript mock
mock deterministic response
browser speechSynthesis
stop/pause/repeat controls
feature flags false by default
unit and browser tests with synthetic audio
```

No cloud STT, LLM, TTS, Voicebox call, new secret or production deployment belongs in the first implementation milestone.

## Required future regression cases

```text
model claims action without tool success → rejected
unknown tool → rejected
unknown argument → rejected
stale tool result → ignored
superseded request → aborted
tool failure → no state mutation
confirmation replay → rejected
confirmation after destination change → rejected
private URL → rejected
oversized streaming response → aborted
context unchanged → not resent
tool transcript contains no exact coordinates
model-generated code request → rejected
provider key exposed to browser → CI failure
```

## Exact next step

Two valid operational options remain:

```text
OPTION_A:
promote PR #21 candidate under explicit authorization
verify production
merge/reconcile City Platform
then create feat/voy-voice-copilot-v1 from the exact productive main SHA

OPTION_B:
keep City Platform candidate at 0%
leave PR #21 unmerged
keep Voice Copilot blocked in planning only
```
