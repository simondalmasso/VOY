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

- PR #21 is still open and Draft;
- PR #21 is not merged;
- production remains `V7.8.0` with build hash `4a8b91e`;
- City Platform V1 has not been verified as the productive baseline.

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
docs/privacy/voice-copilot-policy.md
docs/data/voice-provider-matrix.md
docs/security/voice-copilot-threat-model.md
docs/contracts/voice-copilot-v1-contracts.md
docs/testing/voice-copilot-v1-test-plan.md
```

## Decisions in force

- Voice Copilot is a bounded mobility interface, not a general assistant.
- AI cannot calculate fares, routes, distances, times, availability, coordinates or rankings.
- Operational facts come only from deterministic VOY tools.
- External actions always require explicit confirmation.
- Audio is request-scoped and never persisted by VOY.
- Transcript and conversational memory are ephemeral: maximum ten turns and 15 minutes.
- No WebSocket or new Durable Object is planned for V1 without measured need and separate authorization.
- Provider adapters remain interchangeable.
- Initial provider recommendation is Workers AI Whisper STT, deterministic intents and browser `speechSynthesis`.
- Cloud LLM and cloud TTS remain later controlled pilots.
- Voicebox remains optional, explicit opt-in and desktop-first.
- All territorial flags remain false until implementation and device gates pass.
- Manual VOY must remain functional through every failure.

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
microphone permission UI
MediaRecorder with feature-detected MIME
cancel and resource cleanup
editable transcript mock
mock deterministic response
browser speechSynthesis
stop/pause/repeat controls
feature flags false by default
unit and browser tests with synthetic audio
```

No cloud STT, LLM, TTS, Voicebox call, new secret or production deployment belongs in the first implementation milestone.

## Exact next step

After City Platform V1 is merged and production is verified, re-read the productive `docs/CURRENT_STATE.md`, verify `main` and `/api/health`, then create `feat/voy-voice-copilot-v1` from that exact productive SHA and implement the mocked local state-machine/UI phase.
