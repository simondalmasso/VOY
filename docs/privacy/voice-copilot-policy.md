# VOY Voice Copilot V1 — Privacy and Retention Policy

Status: planning contract; Voice Copilot is not enabled  
Date: 2026-07-21

## Scope

This policy covers microphone access, recorded audio, transcripts, short conversational state, provider processing, synthesized speech and Voice Copilot telemetry.

It does not change the current VOY privacy model until a separately reviewed implementation is merged, deployed and enabled by feature flag.

## Privacy defaults

```text
data minimization: mandatory
voice feature: off by default
audio persistence by VOY: prohibited
full transcript logging: prohibited
exact location logging: prohibited
persistent conversational memory: prohibited
provider activation: explicit and documented
external action: explicit confirmation
```

The existing text/manual mobility experience must remain available without granting microphone permission or accepting cloud audio processing.

## Consent layers

Consent is purpose-specific. One affirmative action must not authorize unrelated processing.

### Microphone consent

Before the first microphone request:

> VOY necesita usar el micrófono para escuchar este turno. Podés cancelar o seguir usando VOY por texto.

The browser permission prompt is necessary but not sufficient. VOY must first explain why microphone access is requested.

### Cloud transcription consent

Before audio is sent to a cloud STT provider for the first time, or whenever the provider/privacy terms materially change:

> El audio de este turno se enviará al proveedor de transcripción configurado y VOY lo eliminará de su memoria después de recibir el texto. VOY no guarda el audio.

The disclosure must identify the provider category or provider name and link to the applicable privacy information.

### Voicebox local consent

Before any localhost request:

> Voicebox procesa la voz localmente en este dispositivo. Voicebox puede conservar capturas, transcripciones o audio según su propia configuración. VOY no guarda ni sincroniza esos archivos.

Selecting Voicebox is a deliberate opt-in. VOY must not scan `127.0.0.1`, enumerate profiles or request local-network permission during normal page load.

### Location consent

Current location requires separate permission and confirmation when not already authorized for the current session. Microphone consent does not imply location consent.

### External action consent

Opening a provider, map, navigation application, call or external link requires a visible confirmation describing the destination and action.

## Audio lifecycle

Canonical cloud STT lifecycle:

```text
microphone MediaStream
→ in-memory MediaRecorder chunks
→ bounded Blob
→ request-scoped Worker body
→ provider inference
→ transcript
→ release Blob, chunks, stream tracks and request buffers
```

VOY must not write audio to:

- Analytics Engine;
- KV;
- Durable Objects;
- R2;
- browser localStorage;
- browser IndexedDB;
- Cache API;
- application logs;
- error-reporting payloads;
- GitHub Actions artifacts;
- screenshots or traces;
- model training datasets.

Temporary in-memory buffers must be released after transcription, cancellation, timeout or error.

Audio object URLs must be revoked. All microphone tracks must be stopped on completion, cancellation, page interruption and error.

## Transcript lifecycle

The transcript is visible and editable before the user sends it to the Copilot.

V1 transcript rules:

```text
maximum transcript length: 2,000 characters
browser persistence: session memory only
server persistence: none
production logging: no transcript text
analytics: no transcript text
retention: maximum session lifetime, 15 minutes
reset: immediate session deletion
```

A transcript may be included in a provider request only for the current user turn and bounded conversation context.

Synthetic transcripts may be used in tests. Real user transcripts must not be committed, attached to issues, stored in fixtures or uploaded as CI evidence.

## Conversational memory

V1 memory is ephemeral:

- maximum ten messages/turns;
- maximum 15 minutes;
- no cross-session personalization;
- no account-level memory;
- no permanent preferences;
- no historical audio;
- no exact addresses or coordinates in server logs;
- no cross-city reuse of stale destination or results.

The session reset endpoint and UI control must clear:

- messages;
- pending transcript;
- destination references;
- selected mode;
- cached response text;
- pending confirmation;
- playback resources.

## Location handling

Exact location may be needed by deterministic VOY tools, but it is not a language-model memory primitive.

Controls:

- pass opaque origin/destination references to the LLM when possible;
- send coordinates only to deterministic tools that require them;
- never include exact coordinates in metrics;
- never include exact coordinates in prompt logs;
- avoid returning raw coordinates in Copilot responses;
- invalidate location references when the city/session changes;
- require explicit permission before acquiring current location.

## Provider privacy requirements

A provider cannot be enabled until its current terms and retention behavior are recorded.

### Workers AI

Cloudflare states that Workers AI customer content is not used to train models or improve services without explicit consent. Content may be stored if VOY deliberately combines inference with a storage product. VOY V1 must not do so for audio or transcripts.

Required controls:

- no KV/R2/DO/Vectorize storage of voice content;
- no AI Gateway prompt logging unless reviewed and configured to exclude content;
- no debug logging of provider request bodies;
- provider/model identifier included in consent and metrics;
- third-party model licenses reviewed.

### OpenAI API

OpenAI states API data is not used for training by default. Current endpoint controls indicate `/v1/audio/transcriptions` has no default abuse-monitoring or application-state retention, while `/v1/audio/speech` can have default abuse-monitoring retention up to 30 days unless eligible controls are configured.

If OpenAI is considered later:

- reverify current endpoint-specific retention;
- use `store: false` where applicable;
- avoid stateful conversation endpoints;
- evaluate Zero Data Retention eligibility;
- disclose provider and retention before activation;
- obtain explicit budget and secret authorization.

### Browser Web Speech API

Some browser implementations send microphone audio to a browser-vendor service. VOY does not control that vendor path.

Therefore:

- Web Speech is optional fallback only;
- label it as browser-provided recognition;
- disclose that audio may be processed by the browser vendor;
- do not claim local/offline processing unless the browser can prove it;
- always offer manual text input.

### Browser speech synthesis

`speechSynthesis` is the preferred initial TTS fallback. Voice availability and processing location depend on the device/browser voice.

VOY must not claim all browser voices are offline. The user may disable spoken output and retain text-only responses.

### Voicebox local

Voicebox is controlled by the user’s local installation. Official Voicebox documentation describes local data directories and capture/history behavior that can preserve original audio, transcripts and generated output.

VOY guarantees only:

- VOY does not upload Voicebox profiles or audio;
- VOY does not persist returned Voicebox audio/transcripts;
- VOY does not access Voicebox without explicit opt-in;
- VOY stops using Voicebox when the user disables it.

VOY cannot guarantee Voicebox’s local deletion behavior. The UI must direct the user to Voicebox settings for local retention management.

## Permitted production telemetry

Allowed event names:

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

Allowed dimensions:

```text
city_id
provider_id
intent enum
success/failure code
latency bucket
audio-duration bucket
response-length bucket
browser/device class
fallback path
```

Forbidden telemetry:

```text
raw audio
transcript text
response text
exact address
exact coordinates
full provider URL/deeplink
user name/email/phone
raw IP
Voicebox profile name
voice clone or sample identifiers
```

If rate limiting requires a network identifier, use a short-lived salted derivation that cannot be reversed and is not reused for analytics.

## Logs and error reports

Production logs must use typed codes, for example:

```json
{
  "event": "stt_failure",
  "provider": "workers_ai_whisper_large_v3_turbo",
  "error_code": "provider_timeout",
  "latency_bucket": "10_15s",
  "audio_duration_bucket": "15_30s",
  "city_id": "santafe"
}
```

Never log request bodies, multipart audio, transcript strings, tool-result addresses or generated response text.

Unexpected exceptions must be sanitized before they reach observability systems.

## CI and test privacy

CI may use only:

- generated synthetic tones/speech fixtures;
- public-domain or project-generated synthetic audio with documented provenance;
- fictional addresses and identities;
- synthetic transcripts.

CI must not contain:

- user recordings;
- cloned voices;
- personal transcripts;
- exact private locations;
- production provider secrets;
- unredacted network captures containing content.

Browser traces and screenshots must be checked for transcript/audio content before artifact upload. Synthetic fixtures must be clearly labeled.

## Data subject controls

V1 provides:

- reset conversation;
- stop microphone;
- stop spoken output;
- revoke/disable Voice Copilot in-app;
- continue by text;
- disable Voicebox local integration;
- browser-level permission management guidance.

Because VOY stores no persistent voice content in V1, reset should remove all VOY-controlled conversational data immediately.

## Retention table

| Data | Location | Retention | Production log |
|---|---|---:|---:|
| Raw microphone audio | Browser/Worker request memory | Until transcription/cancel/timeout | Prohibited |
| Transcript | Browser/session request context | Maximum 15 minutes | Prohibited |
| Copilot messages | Ephemeral session | Maximum 10 messages/15 minutes | Prohibited |
| Structured intent | Request/session | Session; aggregate enum metric allowed | Enum only |
| Tool result | Request/session | Session only | Status/provenance code only |
| TTS audio | Browser memory/object URL | Until playback/stop | Prohibited |
| Confirmation challenge | Ephemeral session | Short expiry, one use | ID/status only, not payload |
| Voice metrics | Analytics Engine | Existing aggregate retention policy | Permitted bounded fields |
| Voicebox local data | User’s Voicebox installation | Voicebox-controlled | Not accessible to VOY analytics |

## Incident response

If audio, transcript or exact location is found in storage, logs or artifacts:

1. disable all voice feature flags;
2. stop affected provider routes;
3. preserve metadata without copying sensitive content;
4. remove exposed artifacts/log sinks where operationally possible;
5. identify the source SHA and version;
6. assess provider-side retention/deletion requirements;
7. document scope, corrective action and validation;
8. do not re-enable until privacy tests pass on an exact candidate SHA.

## Release privacy gates

```text
AUDIO_PERSISTED=0
TRANSCRIPT_LOGGED=0
EXACT_LOCATION_LOGGED=0
SYNTHETIC_FIXTURES_ONLY=PASS
CONSENT_FLOW=PASS
SESSION_RESET=PASS
PROVIDER_RETENTION_REVIEW=PASS
VOICEBOX_OPT_IN=PASS_OR_NOT_ENABLED
PRIVACY_REPORT_ARTIFACT=PASS
```

Any failure is production-blocking.

## Sources

- Cloudflare Workers AI data usage: https://developers.cloudflare.com/workers-ai/platform/data-usage/
- OpenAI API data controls: https://platform.openai.com/docs/models/default-usage-policies-by-endpoint
- MDN SpeechRecognition: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- Voicebox README: https://github.com/jamiepine/voicebox/blob/main/README.md
- Voicebox backend documentation: https://github.com/jamiepine/voicebox/blob/main/backend/README.md
- Voicebox CORS implementation: https://github.com/jamiepine/voicebox/blob/main/backend/app.py
