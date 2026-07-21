# VOY Voice Copilot V1 — Contracts

Status: planning only  
Date: 2026-07-21

These contracts are provider-neutral and intentionally closed. The future implementation may encode them with JSON Schema, TypeScript validation or equivalent runtime validators, but it must preserve the authority and privacy boundaries defined here.

## General rules

- All objects use a declared `schema_version`.
- Unknown fields are rejected: `additionalProperties: false`.
- Strings are trimmed and length-bounded.
- Enum values are normalized before validation.
- Coordinates are not accepted from the LLM unless a specific deterministic tool contract requires them and the user has authorized location access.
- Tool results are untrusted until server-side validation succeeds.
- No contract accepts an arbitrary URL.
- No contract contains provider secrets, Worker bindings or infrastructure identifiers.
- User-facing narration is separate from operational facts.

## VoiceIntent

```json
{
  "schema_version": "voice_intent.v1",
  "intent": "compare_modes",
  "confidence": 0.94,
  "city_id": "santafe",
  "origin": {
    "type": "current_location",
    "reference_id": null,
    "query": null
  },
  "destination": {
    "type": "query",
    "reference_id": null,
    "query": "Terminal de Ómnibus"
  },
  "mode": null,
  "sort": "cheapest",
  "requires_confirmation": false,
  "clarification": null
}
```

Allowed `intent` values:

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

Allowed `origin.type` and `destination.type`:

```text
none
current_location
query
reference
```

Allowed `mode`:

```text
null
walking
bike
public_transport
taxi
remis
private_app
```

Allowed `sort`:

```text
null
cheapest
fastest
recommended
least_walking
```

Validation constraints:

```text
confidence: 0..1
city_id: normalized supported city ID
query: maximum 300 characters
reference_id: opaque VOY reference, maximum 160 characters
clarification: null or maximum 400 characters
```

`recommended` means “use the deterministic VOY ranking result”; it does not authorize the LLM to rank.

## VoiceSession

```json
{
  "schema_version": "voice_session.v1",
  "session_id": "opaque-ephemeral",
  "created_at": "2026-07-21T12:00:00Z",
  "expires_at": "2026-07-21T12:15:00Z",
  "city_id": "santafe",
  "origin_ref": null,
  "destination_ref": null,
  "selected_mode": null,
  "last_result_refs": [],
  "messages": [],
  "pending_confirmation_id": null,
  "turn_count": 0
}
```

Constraints:

```text
maximum messages: 10
maximum turn_count: 10
maximum lifetime: 15 minutes
messages contain role + bounded text, no audio
pending confirmation: one maximum
persistent storage: prohibited in V1
```

Message shape:

```json
{
  "role": "user",
  "text": "Quiero ir a la terminal.",
  "created_at": "2026-07-21T12:01:00Z"
}
```

Allowed roles: `user`, `assistant`. Tool payloads are not stored as conversational messages; only bounded result references may remain in session memory.

## TranscriptionRequest

Multipart request:

```text
field: audio
content types: audio/webm | audio/ogg | audio/wav | audio/mp4
maximum duration: 30 seconds
hard payload limit: 2.5 MiB pending benchmark
```

Metadata fields:

```json
{
  "schema_version": "transcription_request.v1",
  "session_id": "opaque-ephemeral",
  "city_id": "santafe",
  "language": "es-AR",
  "provider_preference": "default",
  "cloud_audio_consent": true,
  "audio_duration_ms": 18400,
  "client_mime_type": "audio/webm"
}
```

The server must independently determine actual container, size and duration. Client values are advisory only.

## TranscriptionResponse

```json
{
  "schema_version": "transcription_response.v1",
  "operation_id": "opaque",
  "provider": "workers_ai_whisper_large_v3_turbo",
  "language": "es",
  "text": "Quiero ir a la terminal.",
  "confidence": null,
  "duration_ms": 18400,
  "requires_review": true,
  "warnings": []
}
```

Constraints:

- `text` maximum 2,000 characters;
- empty or whitespace-only text returns `transcript_empty`;
- provider raw response is never returned;
- `requires_review` is true by default in V1;
- no audio URL or stored-audio identifier is returned.

## CopilotRequest

```json
{
  "schema_version": "copilot_request.v1",
  "session_id": "opaque-ephemeral",
  "operation_id": "opaque",
  "city_id": "santafe",
  "user_text": "¿Qué me conviene para ir a la terminal?",
  "context": {
    "origin_ref": "origin:session:1",
    "destination_ref": "destination:terminal-sf",
    "selected_mode": null,
    "last_result_refs": []
  },
  "capabilities": {
    "voice_output": true,
    "current_location_authorized": false,
    "external_actions_authorized": false
  }
}
```

The client cannot select tools. The server derives the allowed tool set from feature flags, city coverage and session capabilities.

## CopilotToolCall

```json
{
  "schema_version": "copilot_tool_call.v1",
  "call_id": "opaque",
  "name": "compare_modes",
  "arguments": {
    "origin_ref": "origin:session:1",
    "destination_ref": "destination:terminal-sf",
    "sort": "cheapest"
  }
}
```

Allowed tool names:

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

Unknown tool names are rejected before invocation.

## Tool argument contracts

### resolve_destination

```json
{
  "query": "Terminal de Ómnibus",
  "city_id": "santafe"
}
```

Returns a resolved reference, an ambiguity set or no match. It never permits silent selection when multiple plausible results remain.

### search_destination

```json
{
  "query": "farmacia cerca",
  "city_id": "santafe",
  "origin_ref": "origin:session:1",
  "wide": false
}
```

`wide` remains deterministic and must use the existing Worker geocoding boundary. No direct Nominatim URL is accepted.

### get_current_city

```json
{}
```

Returns normalized city identity, coverage level and verification metadata.

### get_coverage

```json
{
  "city_id": "santafe"
}
```

Returns declared coverage only. The model cannot upgrade coverage status.

### set_origin

```json
{
  "origin_ref": "origin:resolved:opaque"
}
```

Current location acquisition is a separate consented UI operation; the LLM cannot manufacture an origin reference.

### set_destination

```json
{
  "destination_ref": "destination:resolved:opaque"
}
```

### estimate_modes

```json
{
  "origin_ref": "origin:session:1",
  "destination_ref": "destination:terminal-sf",
  "requested_modes": ["walking", "public_transport", "taxi"]
}
```

Returns deterministic values and explicit unavailable/stale statuses.

### compare_modes

```json
{
  "origin_ref": "origin:session:1",
  "destination_ref": "destination:terminal-sf",
  "sort": "cheapest"
}
```

The deterministic VOY comparison owns ranking. The LLM only explains the result.

### list_available_providers

```json
{
  "city_id": "santafe",
  "mode": "private_app"
}
```

Returns availability registry and verification metadata, not live app prices unless a deterministic source explicitly supports them.

### list_nearby_stops

```json
{
  "origin_ref": "origin:session:1",
  "radius_m": 800,
  "limit": 5
}
```

Server bounds radius and limit.

### list_nearby_bike_stations

```json
{
  "origin_ref": "origin:session:1",
  "radius_m": 1200,
  "limit": 5
}
```

### get_fare_metadata

```json
{
  "city_id": "santafe",
  "mode": "taxi"
}
```

Returns tariff status, source, verification date and deterministic metadata. It does not allow the LLM to calculate fare amounts.

### prepare_external_provider_action

```json
{
  "provider_id": "uber",
  "destination_ref": "destination:terminal-sf",
  "origin_ref": "origin:session:1"
}
```

Returns a confirmation challenge. It never opens a URL.

## ToolResult

```json
{
  "schema_version": "tool_result.v1",
  "call_id": "opaque",
  "tool": "compare_modes",
  "status": "success",
  "city_id": "santafe",
  "data": {},
  "provenance": {
    "source_type": "voy_deterministic_engine",
    "verified_at": "2026-07-21",
    "coverage_level": "partial"
  },
  "warnings": []
}
```

Allowed status values:

```text
success
needs_clarification
not_found
not_available
not_supported
confirmation_required
error
```

Every tool has a dedicated `data` schema. The generic object shown above is not permission for arbitrary fields.

## ConfirmationChallenge

```json
{
  "schema_version": "confirmation_challenge.v1",
  "confirmation_id": "opaque-signed-one-time-id",
  "session_id": "opaque-ephemeral",
  "action_type": "open_provider",
  "provider_id": "uber",
  "destination_ref": "destination:terminal-sf",
  "summary": "Abrir Uber con destino Terminal de Ómnibus",
  "expires_at": "2026-07-21T12:05:30Z",
  "requires_user_gesture": true
}
```

Allowed action types:

```text
open_provider
open_external_map
start_external_navigation
share_location
initiate_call
open_external_link
save_preference
```

A confirmation response contains only the ID and `approved: true|false`. The server/client must revalidate session, action, expiry and one-time use.

## CopilotResponse

```json
{
  "schema_version": "copilot_response.v1",
  "operation_id": "opaque",
  "session_id": "opaque-ephemeral",
  "status": "completed",
  "intent": "compare_modes",
  "message": "El colectivo es la opción más barata según las tarifas verificadas. El taxi es más rápido, pero cuesta más.",
  "facts": [
    {
      "fact_id": "opaque",
      "type": "mode_comparison",
      "source_tool": "compare_modes",
      "source_call_id": "opaque"
    }
  ],
  "suggested_actions": [],
  "confirmation": null,
  "speak": true,
  "warnings": []
}
```

Allowed status values:

```text
completed
needs_clarification
awaiting_confirmation
cancelled
error
```

Constraints:

```text
message maximum: 1,000 characters
facts must reference executed validated tool calls
suggested actions use closed action schemas
confirmation required for every external action
no raw provider URL
no hidden instructions
```

Numeric-claim validation:

- any fare, time, distance or ranking claim in `message` must correspond to a validated field in referenced tool results;
- if the relevant tool status is stale/unavailable, narration must preserve that status;
- if no deterministic fact exists, the response must state that VOY cannot verify it.

## TTSRequest

```json
{
  "schema_version": "tts_request.v1",
  "session_id": "opaque-ephemeral",
  "operation_id": "opaque",
  "text": "El colectivo es la opción más barata.",
  "voice": "default_es",
  "provider_preference": "default",
  "format": "audio/mpeg"
}
```

Constraints:

- maximum 1,000 characters;
- plain text only;
- markup/control characters removed;
- no confirmation IDs, secret values or raw URLs;
- browser TTS may bypass this Worker route entirely.

## TTSResponse

Cloud TTS response:

```text
HTTP body: bounded audio stream/blob
Content-Type: approved audio type
Cache-Control: no-store
X-VOY-TTS-Provider: normalized provider ID
```

No permanent URL or storage key is returned.

## VoiceError

```json
{
  "schema_version": "voice_error.v1",
  "error": {
    "code": "provider_timeout",
    "message": "No pude procesar el audio. Podés escribir el destino.",
    "retryable": true,
    "fallback": "manual_text"
  },
  "operation_id": "opaque"
}
```

Allowed codes:

```text
permission_denied
microphone_unavailable
recording_conflict
recording_timeout
audio_too_large
audio_too_long
unsupported_audio_type
invalid_audio_container
provider_timeout
provider_unavailable
provider_invalid_response
transcript_empty
transcript_too_long
intent_unknown
intent_schema_invalid
tool_not_allowed
tool_arguments_invalid
tool_failed
confirmation_required
confirmation_expired
confirmation_mismatch
confirmation_already_used
budget_exceeded
rate_limited
session_expired
offline
cancelled
internal_error
```

Public errors contain no stack, prompt, provider raw body, key, binding or internal hostname.

## VoiceMetricEvent

```json
{
  "schema_version": "voice_metric.v1",
  "event": "stt_success",
  "city_id": "santafe",
  "provider": "workers_ai_whisper_large_v3_turbo",
  "intent": null,
  "result": "success",
  "latency_bucket": "1_3s",
  "audio_duration_bucket": "15_30s",
  "response_length_bucket": null,
  "fallback": "none",
  "device_class": "mobile"
}
```

The schema must not include fields for raw audio, transcript, response, address, coordinates, raw IP, Voicebox profile or deeplink.

## Provider adapter normalized outputs

### STTProvider

```js
await provider.transcribe(audio, context, signal)
```

Returns:

```json
{
  "provider": "normalized_id",
  "text": "...",
  "language": "es",
  "confidence": null,
  "duration_ms": 12000,
  "usage": {
    "audio_seconds": 12,
    "estimated_cost_usd": 0.0001
  }
}
```

### LLMProvider

```js
await provider.respond(messages, tools, context, signal)
```

Returns exactly one of:

```text
VoiceIntent
CopilotToolCall[]
CopilotResponse draft
```

Every return type is runtime-validated. Free-form provider text is never treated as an executable tool call.

### TTSProvider

```js
await provider.synthesize(text, voice, context, signal)
```

Returns:

```json
{
  "provider": "normalized_id",
  "content_type": "audio/mpeg",
  "audio": "request-scoped byte stream",
  "duration_ms": 4200,
  "usage": {
    "input_characters": 52,
    "estimated_cost_usd": 0.00156
  }
}
```

The `audio` field is conceptual; it must not be JSON/base64 persisted in production logs or session state.

## Deterministic emergency responses

These responses require no LLM:

```text
No pude procesar el audio. Podés escribir el destino.
No encontré esa ubicación. Decime una calle o punto conocido.
VOY no tiene tarifas verificadas para esta ciudad.
Ese precio debe consultarse en la aplicación del proveedor.
Necesito tu confirmación antes de abrir una aplicación externa.
El asistente por voz no está disponible. El resto de VOY sigue funcionando.
```

## Contract versioning

Breaking changes require a new schema version. During a deployment transition:

- frontend and Worker must declare compatible versions;
- incompatible requests return a typed error, not best-effort coercion;
- candidate browser tests verify the effective contract version;
- Service Worker caches must not mix incompatible module/contract versions.
