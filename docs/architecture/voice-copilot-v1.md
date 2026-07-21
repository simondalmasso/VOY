# VOY Voice Copilot V1 — Architecture

Status: planning only  
Date: 2026-07-21  
Planning base: `main@4a8b91e605597989b3db19860a745c21472a3a14`

## Prerequisite gate

Voice Copilot runtime work must not begin until all of the following are true:

```text
PR #21 merged into main
City Platform V1 deployed from the exact merged SHA
production /api/health reports that SHA
candidate and production browser evidence recorded
normal traffic verified at 100% on the intended version
rollback state recorded
```

Current state when this document was created:

```text
PR_21=open_draft
PR_21_MERGED=NO
PRODUCTION_BUILD=4a8b91e
VOICE_PHASE_STATUS=PLANNING_ONLY
CODE_CHANGES=NO
```

The implementation branch must later be created as:

```text
branch: feat/voy-voice-copilot-v1
base: exact productive main SHA after City Platform V1
Draft PR: feat(voice): add bounded mobility voice copilot
```

This planning branch contains no runtime code, routes, bindings, flags or production changes.

## Product objective

Voice Copilot V1 is a bounded conversational interface over VOY’s deterministic mobility capabilities. It is not merely dictation and it is not an autonomous travel agent.

The user can:

1. start a microphone turn;
2. grant or deny permission;
3. record a bounded utterance;
4. inspect and edit the transcript;
5. send the corrected transcript;
6. receive a concise text response grounded in VOY tools;
7. hear that response;
8. stop or pause playback;
9. continue a short conversation;
10. confirm explicitly before any external action.

## Authority boundary

The language model may:

- classify a closed intent;
- extract bounded arguments;
- ask a clarification;
- summarize validated tool results;
- render a short natural-language response.

The language model must not calculate or assert:

- fares;
- distances;
- routes;
- travel times;
- availability;
- coverage;
- prices;
- coordinates;
- provider ranking;
- final mobility recommendation independent of deterministic VOY output.

Canonical pipeline:

```text
microphone or typed text
→ transcript review
→ closed intent object
→ server-side schema validation
→ deterministic VOY tools
→ validated structured result
→ bounded language rendering
→ text UI
→ optional TTS
```

If any AI component fails, the existing manual VOY experience remains fully usable.

## Target component layout

Frontend modules proposed for the future implementation branch:

```text
public/voice/voiceController.js
public/voice/voiceStateMachine.js
public/voice/voiceRecorder.js
public/voice/voicePlayback.js
public/voice/copilotClient.js
public/voice/voiceUI.js
public/voice/providers/browserSpeechRecognitionAdapter.js
public/voice/providers/browserSpeechSynthesisAdapter.js
public/voice/providers/voiceboxLocalAdapter.js
```

Worker modules proposed:

```text
voice/voiceRoutes.js
voice/voiceValidation.js
voice/copilotOrchestrator.js
voice/copilotPolicy.js
voice/copilotSession.js
voice/providers/sttProvider.js
voice/providers/ttsProvider.js
voice/providers/llmProvider.js
voice/tools/toolRegistry.js
voice/tools/toolSchemas.js
voice/metrics/voiceMetrics.js
```

The existing HTML should only load versioned external modules and provide semantic mount points. It must not absorb hundreds of new inline lines.

## Proposed HTTP routes

```text
POST /api/voice/transcribe
POST /api/copilot/respond
POST /api/voice/synthesize
POST /api/copilot/session/reset
```

V1 does not require WebSocket or a Durable Object. Request/response turns are sufficient because recording is capped at 30 seconds and transcript review occurs before submission.

Streaming may be reconsidered only after measured evidence shows that request/response latency prevents acceptable UX.

## Provider interfaces

```js
class STTProvider {
  async transcribe(audio, context, signal) {}
}

class TTSProvider {
  async synthesize(text, voice, context, signal) {}
}

class LLMProvider {
  async respond(messages, tools, context, signal) {}
}
```

All adapters must return normalized VOY results and never leak vendor-specific response objects into UI or tool code.

Provider selection must be configuration-driven and fail closed:

```text
STT primary → STT secondary → browser fallback → manual input
TTS primary → browser speechSynthesis → text only
LLM primary → deterministic response renderer → manual VOY UI
```

## Voice state machine

States:

```text
idle
requesting_permission
listening
recording
stopping
uploading
transcribing
reviewing_transcript
thinking
awaiting_confirmation
speaking
paused
completed
cancelled
error
offline
```

Core transitions:

```text
idle → requesting_permission
requesting_permission → listening
listening → recording
recording → stopping
stopping → uploading | transcribing
uploading → transcribing
transcribing → reviewing_transcript
reviewing_transcript → thinking
thinking → speaking | awaiting_confirmation | completed
awaiting_confirmation → thinking | cancelled
speaking → paused | completed
paused → speaking | completed
any nonterminal state → cancelled
any nonterminal state → error
```

Invariants:

- one active recording maximum;
- one in-flight transcript maximum;
- one in-flight copilot response maximum;
- one active playback maximum;
- every operation has a monotonic `operation_id`;
- every asynchronous operation receives an `AbortSignal`;
- a newer operation aborts and supersedes the prior operation;
- stale results cannot mutate current UI/session state;
- invalid transitions return a typed error and perform no side effect;
- cancellation releases microphone tracks, object URLs, audio nodes and timers;
- transcript review is mandatory by default before cloud submission to Copilot.

## Session model

V1 memory is ephemeral and bounded:

```json
{
  "session_id": "ephemeral-random-id",
  "created_at": "ISO-8601",
  "expires_at": "ISO-8601",
  "city_id": "santafe",
  "origin_ref": null,
  "destination_ref": null,
  "selected_mode": null,
  "last_results": [],
  "messages": [],
  "pending_confirmation": null,
  "turn_count": 0
}
```

Limits:

```text
maximum messages: 10
maximum turns: 10
maximum session age: 15 minutes
persistent user memory: none
audio persistence: none
exact coordinate logging: none
full transcript logging: none
```

Prefer a stateless Worker with a signed ephemeral session token. Do not add a Durable Object, KV schema or persistent store without a separate architectural decision and authorization.

Client memory must be cleared on reset, expiry, logout-like reset, unsupported city transition or explicit user cancellation.

## Closed intents

Allowed intent enum:

```text
greeting
help
set_origin
set_destination
search_destination
compare_modes
estimate_trip
select_mode
list_providers
list_stops
list_bikes
open_provider
repeat
cancel
reset
unknown
```

Anything outside the enum resolves to `unknown`, a refusal or a clarification. There is no general assistant mode.

## Deterministic tool registry

Only these tool names may be registered:

```text
resolve_destination
search_destination
get_current_city
get_coverage
set_origin
set_destination
estimate_modes
compare_modes
list_available_providers
list_nearby_stops
list_nearby_bike_stations
get_fare_metadata
prepare_external_provider_action
```

Tool controls:

- fixed allowlist;
- JSON schema validation before invocation;
- server-side authorization and territorial checks;
- deterministic result validation after invocation;
- no arbitrary URL, fetch, SQL, repository, shell, KV or control-plane access;
- tool result includes provenance, verification date and coverage level where relevant;
- tool results use opaque destination or provider references when possible;
- the LLM cannot execute an external action directly.

## Confirmation protocol

Explicit confirmation is required before:

- opening a provider application;
- opening an external map;
- beginning external navigation;
- sharing location;
- using current location when not already authorized;
- sending audio to a cloud STT provider for the first time or after consent expiry;
- saving a preference;
- initiating a call;
- opening any external link.

`prepare_external_provider_action` returns a challenge, not an action:

```json
{
  "status": "confirmation_required",
  "confirmation_id": "opaque",
  "summary": "Abrir Uber con destino Terminal de Ómnibus",
  "action_type": "open_provider",
  "provider_id": "uber",
  "expires_at": "ISO-8601"
}
```

The confirmation token must be bound to:

- session ID;
- exact action type;
- destination reference;
- provider reference;
- expiry;
- one-time use.

The frontend executes the deeplink only after an explicit affirmative event and server/client revalidation.

## Recording and audio contract

Proposed hard limits:

```text
maximum duration: 30 seconds
preferred bitrate: 32–64 kbps mono voice
soft payload target: 1.5 MiB
hard payload limit: 2.5 MiB pending device benchmark
allowed containers: audio/webm, audio/ogg, audio/wav, audio/mp4
```

The recorder must select formats using `MediaRecorder.isTypeSupported()` rather than user-agent assumptions.

Server validation must inspect:

- declared `Content-Type`;
- magic bytes/container signature;
- actual duration;
- decoded channel count/sample rate when available;
- payload size;
- malformed/truncated structure.

The Worker must reject extension-only validation, MIME mismatch, unsupported codecs, oversized files and duration overrun.

Audio bytes must remain request-scoped and must not be written to Analytics Engine, KV, Durable Objects, logs, GitHub artifacts or permanent storage.

## User experience structure

Main control:

```text
Hablar con VOY
```

Visible states:

```text
Escuchando…
Grabando…
Transcribiendo…
Revisá lo que entendí
Pensando…
Necesito tu confirmación
Hablando…
```

Required controls:

- start recording;
- stop recording;
- cancel current operation;
- edit transcript;
- send transcript;
- repeat response;
- pause/resume speech when supported;
- stop speech;
- reset session;
- continue by text.

Accessibility requirements:

- keyboard operation;
- visible focus;
- `aria-live` status and response regions;
- no color-only state;
- reduced-motion support;
- screen-reader labels;
- stop-audio control always reachable;
- focus returns predictably after dialogs or confirmations;
- transcript and response always available as text.

## Mobile lifecycle

The controller must respond to:

- page visibility changes;
- screen lock;
- application backgrounding;
- phone calls and audio focus loss;
- Bluetooth/earphone changes;
- microphone permission changes;
- route reload;
- network offline/online changes.

On interruption:

```text
recording → stop and discard incomplete audio unless user explicitly reviews it
transcribing/thinking → abort request
speaking → pause or stop according to platform event
```

Never continue recording invisibly after the page loses the intended active state.

## Voicebox local adapter

`VoiceboxLocalAdapter` is optional and never probed on load.

Explicit flow:

```text
user selects “Usar Voicebox local”
→ show local-processing and retention disclosure
→ request local-network access where the browser supports it
→ GET http://127.0.0.1:17493/profiles with a short timeout
→ allow profile selection only after success
→ use /transcribe or /speak
→ fall back automatically on any failure
```

Constraints:

- Voicebox default CORS does not include VOY production;
- user must configure the exact VOY origin in Voicebox;
- loopback/local-network access is browser-dependent;
- Voicebox may retain captures and generated files locally;
- VOY does not store or sync Voicebox profiles;
- no mobile guarantee;
- no cloned voices are uploaded to Cloudflare;
- no silent localhost probing or persistent background connection.

## Feature flags

Planned flags:

```json
{
  "ai_copilot": false,
  "voice_input": false,
  "voice_output": false,
  "voicebox_local": false
}
```

Rollout order:

```text
_internal/testing: true during controlled validation
_default: false
santafe: false

then, after complete gates:
santafe: true by explicit release decision
_default: false or text-limited only
```

No flag is changed in the planning phase.

## Worker policies

Proposed route limits:

| Route | Timeout | Maximum input | Maximum output |
|---|---:|---:|---:|
| `/api/voice/transcribe` | 12 s | 30 s / 2.5 MiB audio | 2,000 transcript chars |
| `/api/copilot/respond` | 8 s | 2,000 user chars / 10 turns | 1,000 response chars |
| `/api/voice/synthesize` | 10 s | 1,000 chars | bounded audio stream/blob |
| `/api/copilot/session/reset` | 3 s | session token only | status object |

Rate limits must use bounded ephemeral identifiers. Raw IP addresses and exact location must not be logged.

## Observability

Allowed metric events:

```text
voice_session_started
microphone_permission_granted
microphone_permission_denied
stt_success
stt_failure
intent_resolved
tool_success
tool_failure
tts_success
tts_failure
voice_session_cancelled
```

Allowed metric dimensions:

- provider ID;
- city ID;
- intent enum;
- success/failure code;
- latency bucket;
- audio-duration bucket;
- response-length bucket;
- browser/device class;
- fallback path.

Forbidden observability data:

- raw audio;
- transcript text;
- response text;
- exact address;
- exact coordinates;
- provider deeplink payload;
- user name, email or phone;
- raw IP address;
- Voicebox profile name or cloned voice content.

## Release phases

```text
0. Research and provider matrix
1. Contracts, privacy policy and threat model
2. Local UI/state machine with mocks
3. Real STT provider with manual fallback
4. Deterministic intent resolver and VOY tools
5. Controlled LLM for extraction/clarification/rendering
6. Optional cloud TTS plus browser fallback
7. Explicit Voicebox local adapter
8. Desktop/mobile/physical-device validation
9. Exact-SHA Cloudflare candidate at 0%
10. Production promotion only after explicit authorization
```

Each phase must preserve a working manual VOY path and be independently reversible.

## CI gates for the future implementation

```text
bun install --frozen-lockfile
bun run lint
bun run test
wrangler deploy --dry-run --minify
browser local desktop
browser local mobile
privacy checks
secret scan
bundle size check
```

Artifacts:

- Node test log;
- browser screenshots and traces;
- console/pageerror/network logs;
- privacy report;
- secret-scan report;
- bundle report;
- source manifest and checksums;
- artifact digest.

## Rollback design

Voice Copilot adds no required persistent data migration in V1.

Rollback sequence:

1. set all voice/copilot feature flags false;
2. verify manual VOY remains functional;
3. revert Worker routes and external module loader if necessary;
4. promote the last known stable Worker version only with explicit authorization;
5. verify production health, desktop/mobile manual flows and no orphaned audio/session data.

Disabling voice must not affect City Platform, destination resolution, fare logic, providers or current manual navigation.
