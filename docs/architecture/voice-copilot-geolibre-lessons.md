# VOY Voice Copilot V1 — GeoLibre architectural lessons

Status: normative planning addendum  
Date: 2026-07-21  
Runtime dependency on GeoLibre: none

## Purpose

This document incorporates architectural patterns identified while reviewing GeoLibre that are useful for VOY Voice Copilot V1. It is not an integration plan, package dependency, code port or proposal to reproduce GeoLibre.

No GeoLibre application code is copied by this document. The concepts below are translated into VOY-specific contracts and constrained to the mobility domain.

```text
GEOLIBRE_PATTERNS_REVIEWED=YES
GEOLIBRE_RUNTIME_DEPENDENCY=NO
GEOLIBRE_PACKAGE_INSTALLED=NO
GEOLIBRE_CODE_COPIED=NO
```

## 1. Tool-mediated execution

The model has no authority to mutate application state, the map, origin, destination, selected mode or external navigation directly.

Canonical execution path:

```text
model
→ typed tool call
→ strict validation
→ tool registry authorization
→ MobilityStateAdapter
→ central VOY application state
→ validated structured result
→ event protocol
→ bounded user response
```

Every operational assertion must be supported by a successful, current tool result.

```text
NO_TOOL_SUCCESS
→ NO_ACTION_CLAIM
```

The assistant must not say any equivalent of:

```text
“Ya cambié tu destino”
“Ya abrí Uber”
“Ya calculé el precio”
“Ya seleccioné colectivo”
```

unless the corresponding tool completed successfully, the result passed its output schema and the execution record belongs to the active request.

A failed, cancelled, stale, superseded or confirmation-pending tool call cannot support a completed-action claim.

## 2. Closed tool allowlist

The complete V1 allowlist is:

```text
get_current_city
get_coverage
search_destination
resolve_destination
set_origin
set_destination
estimate_modes
compare_modes
list_available_providers
list_nearby_stops
list_nearby_bike_stations
get_fare_metadata
prepare_external_provider_action
confirm_external_provider_action
cancel_pending_action
```

No other tool name is accepted.

Explicitly prohibited capabilities:

```text
arbitrary_fetch
run_javascript
run_python
execute_code
raw_sql
read_secret
write_kv
write_durable_object
modify_cloudflare
shell
repository_access
dynamic_tool_creation
```

Model-generated JavaScript, Python, SQL, shell commands or dynamically defined tools are never an execution fallback in VOY.

```text
CODE_EXECUTION_FALLBACK=PROHIBITED
```

Unknown tool names fail before invocation with `tool_not_allowed`. Unknown arguments fail with `tool_arguments_invalid`. Neither failure mutates application state.

## 3. Central state and one-way data flow

The future runtime must define these domain objects:

```text
VoiceCopilotSession
PendingAction
ToolExecutionRecord
ConfirmationToken
MobilityStateAdapter
```

The central state is the sole authority for:

```text
city_id
origin
destination
selected_mode
results
pending_confirmation
conversation_state
active_request
```

The UI, map and voice components render that state. They do not become competing sources of truth.

Required direction:

```text
validated intent/tool result
→ state reducer or controlled state command
→ immutable state revision
→ DOM/map render
```

Prohibited direction:

```text
model output
→ DOM mutation
model output
→ map library mutation
model output
→ deeplink execution
DOM text
→ authoritative mobility state
```

### MobilityStateAdapter

`MobilityStateAdapter` is the only bridge between Copilot tools and VOY's application state.

Conceptual interface:

```js
class MobilityStateAdapter {
  getSnapshot() {}
  setOrigin(originRef, executionContext) {}
  setDestination(destinationRef, executionContext) {}
  setSelectedMode(mode, executionContext) {}
  setResults(resultRefs, executionContext) {}
  restorePreviousOrigin(executionContext) {}
  restorePreviousDestination(executionContext) {}
  restorePreviousSelectedMode(executionContext) {}
  clearCurrentResult(executionContext) {}
  resetConversation(executionContext) {}
}
```

Every mutation checks:

- active `session_id`;
- active `request_id`;
- expected prior state revision;
- validated tool result;
- tool capability;
- pending confirmation state where applicable.

A stale result or mismatched revision returns `stale_execution` and performs no mutation.

## 4. Core state contracts

### VoiceCopilotSession

```json
{
  "schema_version": "voice_copilot_session.v1",
  "session_id": "opaque-ephemeral",
  "created_at": "ISO-8601",
  "expires_at": "ISO-8601",
  "city_id": "santafe",
  "coverage_level": "partial",
  "origin_ref": null,
  "destination_ref": null,
  "selected_mode": null,
  "result_refs": [],
  "pending_action_id": null,
  "conversation_state": "idle",
  "active_request_id": null,
  "context_hash": "sha256-opaque",
  "turn_count": 0
}
```

Limits remain:

```text
maximum turns: 10
maximum messages: 10
maximum age: 15 minutes
persistent memory: none
```

### PendingAction

```json
{
  "schema_version": "pending_action.v1",
  "id": "opaque",
  "session_id": "opaque-ephemeral",
  "request_id": "opaque",
  "tool": "confirm_external_provider_action",
  "provider_id": "uber",
  "destination_ref": "destination:terminal-sf",
  "arguments_hash": "sha256-opaque",
  "summary": "Abrir Uber con destino Terminal de Ómnibus",
  "created_at": "ISO-8601",
  "expires_at": "ISO-8601",
  "status": "pending"
}
```

Allowed status values:

```text
pending
confirmed
rejected
cancelled
expired
invalidated
```

### ToolExecutionRecord

```json
{
  "schema_version": "tool_execution_record.v1",
  "id": "tool-event-id",
  "session_id": "opaque-ephemeral",
  "request_id": "opaque",
  "call_id": "opaque",
  "tool": "compare_modes",
  "status": "success",
  "summary": "Comparé 3 modos disponibles",
  "started_at": 0,
  "completed_at": 0,
  "state_revision_before": 12,
  "state_revision_after": 13,
  "result_id": "result-123",
  "reversible": false,
  "requires_confirmation": false
}
```

Allowed status values:

```text
started
success
failed
cancelled
superseded
stale
confirmation_required
```

The visible summary is generated by trusted VOY code from the tool type and bounded validated result. It is not arbitrary model text.

### ConfirmationToken

```json
{
  "schema_version": "confirmation_token.v1",
  "token_id": "opaque-signed-one-time",
  "session_id": "opaque-ephemeral",
  "request_id": "opaque",
  "pending_action_id": "opaque",
  "tool": "confirm_external_provider_action",
  "provider_id": "uber",
  "destination_ref": "destination:terminal-sf",
  "arguments_hash": "sha256-opaque",
  "issued_at": "ISO-8601",
  "expires_at": "ISO-8601",
  "consumed_at": null
}
```

The token is valid only when every bound value matches current state.

## 5. Auditable tool transcript

Every tool operation produces a visible, concise and non-sensitive transcript event.

Examples:

```text
Busqué “Terminal de Ómnibus”
Encontré 3 resultados
Seleccionaste “Terminal de Ómnibus de Santa Fe”
Comparé taxi, remis y colectivo
Preparé la acción para abrir Uber
Esperando confirmación
Acción cancelada
```

The transcript must not expose:

```text
system prompts
provider prompts
secrets
API keys
bindings
raw request/response payloads
exact coordinates
complete provider URLs
internal hashes
private infrastructure identifiers
```

The audit transcript is not a debug log. It is a user-facing explanation generated from `ToolExecutionRecord` objects.

Required properties:

- ordered by monotonic event sequence;
- scoped to the active ephemeral session;
- bounded to the same ten-turn/15-minute limits;
- screen-reader accessible;
- included in text UI even when voice output is active;
- removable on reset;
- not persisted by VOY in V1.

```text
AUDIT_TRANSCRIPT=DEFINED
```

## 6. Stream event protocol

The Copilot transport and controller use typed events rather than mixing text fragments, tool calls and confirmations in one unstructured response.

Allowed event enum:

```text
text_delta
tool_started
tool_completed
tool_failed
confirmation_required
confirmation_accepted
confirmation_rejected
speech_started
speech_stopped
cancelled
error
```

Base event:

```json
{
  "schema_version": "copilot_event.v1",
  "sequence": 17,
  "session_id": "opaque-ephemeral",
  "request_id": "opaque",
  "operation_id": "opaque",
  "type": "tool_completed",
  "created_at": "ISO-8601"
}
```

Tool completion example:

```json
{
  "schema_version": "copilot_event.v1",
  "sequence": 17,
  "session_id": "opaque-ephemeral",
  "request_id": "opaque",
  "operation_id": "opaque",
  "type": "tool_completed",
  "created_at": "ISO-8601",
  "tool": "resolve_destination",
  "call_id": "opaque",
  "result_id": "result-123",
  "summary": "Destino resuelto"
}
```

A single validated event feeds:

```text
UI state
visible tool transcript
voice state machine
allowed telemetry projection
test assertions
```

Event-specific schemas reject unknown fields. Events with an old `request_id`, duplicate sequence or invalid transition are ignored and recorded only as a bounded diagnostic code, never as user data.

V1 may transport these events in one JSON response. SSE or another streaming transport is not required until latency measurements justify it. The event protocol is transport-independent.

## 7. Cancellation and supersession

Every turn owns an `AbortController` and an immutable `request_id`.

Required controls:

```text
cancel()
reset()
timeout
superseded request cancellation
```

Starting a new command performs, in order:

```text
abort previous STT
abort previous intent resolution
abort previous tool execution where supported
stop previous TTS
invalidate previous confirmation
mark previous request superseded
create new request_id and AbortController
```

No previous result may mutate state after supersession.

All asynchronous completion handlers must verify:

```text
result.request_id == session.active_request_id
AbortSignal.aborted == false
expected state revision still current
session not expired
```

Failure of any check returns `stale_execution` and performs no state mutation.

## 8. Context minimization and differential context

The model receives only the minimum context required to resolve the current bounded intent.

Allowed context:

```text
city_id
coverage_level
available tool names
origin status
destination status
selected mode
summarized structured last results
pending confirmation summary
bounded recent turns
```

Prohibited context:

```text
raw audio
unnecessary exact coordinates
complete stop or bike datasets
complete territorial datasets
logs
secrets
bindings
provider credentials
private user data
raw tool payload history
```

The server creates a canonical context projection and computes a stable hash.

```text
previous context_hash == current context_hash
→ do not resend unchanged territorial/context block
```

Only changed fields are sent as a differential context update when the provider protocol supports it. If the provider requires complete requests, VOY still sends only the minimized canonical projection, never the full dataset.

The context hash must not be derived from secrets or exposed as an authorization token.

```text
CONTEXT_MINIMIZATION=DEFINED
```

## 9. Strict schemas

The future implementation must use Zod or an equivalent runtime validator for:

```text
VoiceIntent
ToolCall
ToolArguments
ToolResult
CopilotResponse
CopilotEvent
ConfirmationRequest
ConfirmationToken
PendingAction
ToolExecutionRecord
TelemetryEvent
ProviderConfig
```

Mandatory validation rules:

```text
unknown keys rejected
closed enums
bounded strings
finite numbers only
latitude -90..90
longitude -180..180
controlled URL construction
normalized city_id
allowlisted tool names
schema version required
```

Coordinates received from untrusted sources remain data, never instructions. URLs are built from trusted provider configuration and validated references; the model never supplies a raw operational URL.

Model output that fails schema validation is not repaired by executing generated code. It may be retried once with a bounded schema error or replaced by deterministic fallback text.

## 10. SSRF guard

General provider and tool networking must reject destinations resolving to or syntactically representing:

```text
localhost
*.localhost
127.0.0.0/8
0.0.0.0/8
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
169.254.0.0/16
100.64.0.0/10
::1
IPv6 link-local
IPv6 unique-local
non-HTTP/S protocols
```

The guard applies before DNS resolution, after DNS resolution and after every permitted redirect. DNS rebinding must not convert an approved public hostname into a private address.

General remote requests use:

```text
HTTPS required unless explicitly approved
fixed provider host allowlist
fixed path templates
bounded redirects
response size limit
request timeout
AbortSignal
```

### VoiceboxLocalAdapter exception

The sole loopback exception is:

```text
http://127.0.0.1:17493
```

It is available only after explicit user opt-in to “Usar Voicebox local”.

Allowed endpoints:

```text
GET /profiles
POST /transcribe
POST /speak
```

Voicebox constraints:

```text
host exactly 127.0.0.1
port exactly 17493
HTTP only for loopback exception
no arbitrary path
no redirects
short timeout
bounded response reader
explicit CORS failure handling
no credentials in URL
no silent probe during page load
```

A hostname such as `localhost`, another loopback address, LAN IP or user-supplied endpoint is not equivalent and is rejected.

```text
SSRF_GUARD=DEFINED
```

## 11. Bounded response reader

Remote bodies must be read with streaming byte limits even when `Content-Length` is absent or incorrect.

Planned constants:

```text
MAX_AUDIO_BYTES=2621440
MAX_TRANSCRIPT_BYTES=8192
MAX_TOOL_RESPONSE_BYTES=262144
MAX_LLM_RESPONSE_BYTES=65536
MAX_TTS_TEXT_LENGTH=1000
MAX_REDIRECTS=0 by default; provider-specific maximum 2 only when justified
```

The exact audio byte limit remains subject to device benchmarking but may never exceed the Worker route limit without a documented change.

Reader behavior:

1. reject declared `Content-Length` above limit;
2. read the stream incrementally;
3. count decoded bytes;
4. abort the reader and upstream request immediately on overflow;
5. discard partial content;
6. return a typed `response_too_large` error;
7. perform no state mutation;
8. emit only bounded telemetry dimensions.

Compressed responses are limited after decompression to prevent compression bombs.

## 12. Single-use confirmation

External actions require:

```text
PendingAction
+ ConfirmationToken
+ expiration
+ one-time consumption
```

The token is bound to:

```text
session_id
request_id
tool
provider
destination_ref
arguments_hash
expires_at
```

It is invalidated when:

```text
consumed
cancelled
rejected
expired
destination changes
origin changes when relevant
session changes
new request starts
pending action is replaced
```

`confirm_external_provider_action` must atomically consume the valid token before returning a trusted action descriptor. Replays return `confirmation_replayed` and no action.

The model never receives authority to generate or approve a token. Affirmative natural language may be classified, but the final confirmation comes from an explicit UI control or equally explicit user event tied to the displayed pending action.

## 13. Provider abstraction and browser boundary

Providers remain behind:

```text
STTProvider
TTSProvider
LLMProvider
```

The UI receives only normalized provider identifiers and capability/status information. It never receives:

```text
API key
private endpoint
binding
internal model credential
secret name or value
```

Cloud provider credentials remain in Cloudflare Secrets and are accessed only by Worker-side adapters.

VOY explicitly rejects browser-side provider keys and user-configured public-app credentials as an architectural pattern.

CI must fail if production frontend assets contain known secret prefixes, provider authorization headers, private endpoint constants or Wrangler secret values.

## 14. Untrusted-content boundary

Treat all of the following as untrusted data:

```text
user transcript
geocoding results
place names
web/provider responses
territorial provider data
session messages
LLM text
LLM tool arguments
```

Untrusted text cannot:

```text
modify system instructions
create or rename tools
change schemas
approve confirmations
skip consent
construct arbitrary URLs
select Cloudflare resources
execute code
```

Place names and provider text are escaped for DOM rendering and quoted as data in prompts. Tool results are supplied to language rendering in delimited structured fields, not concatenated into system instructions.

## 15. VOY-specific reversibility

VOY does not adopt GIS-style generic undo/redo.

Supported reversible state operations:

```text
cancel pending action
restore previous origin
restore previous destination
restore previous selected mode
clear current result
reset conversation
```

Each restore operation uses state history owned by `MobilityStateAdapter`, not reconstructed model text.

External actions are not represented as reversible after another application has opened. VOY may clear or cancel its pending state, but it must not claim to undo activity in Uber, DiDi, Maxim, Maps or another external application.

## 16. Patterns explicitly not adopted

The following GeoLibre-related technologies or patterns are outside VOY Voice Copilot V1:

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

No dependency is added by this planning change.

If future implementation adapts concrete MIT-licensed code rather than concepts, it must:

```text
preserve copyright and license notice
record source repository, commit and file
identify modifications
add THIRD_PARTY_NOTICES when required
```

## 17. Required future regression cases

The implementation test plan must cover at least:

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

Additional invariants:

```text
failed tool cannot emit completed-action narration
cancel invalidates pending confirmation
new request stops TTS and aborts old STT/tool work
event sequence cannot move state backwards
unknown event fields are rejected
audit summaries are trusted templates, not model prose
redirect to private address is rejected
Voicebox opt-out performs zero localhost requests
```

## 18. Planning closure

This addendum is normative for the future implementation branch and supplements the architecture, contracts, privacy, threat-model and testing documents in PR #22.

```text
PLANNING_COMPLETE=YES
GEOLIBRE_PATTERNS_REVIEWED=YES
GEOLIBRE_RUNTIME_DEPENDENCY=NO
TOOL_MEDIATED_ARCHITECTURE=DEFINED
AUDIT_TRANSCRIPT=DEFINED
CONTEXT_MINIMIZATION=DEFINED
SSRF_GUARD=DEFINED
CODE_EXECUTION_FALLBACK=PROHIBITED
RUNTIME_CHANGES=0
```
