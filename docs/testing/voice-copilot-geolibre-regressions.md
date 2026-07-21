# VOY Voice Copilot V1 — GeoLibre-derived regression cases

Status: planning-only test addendum  
Date: 2026-07-21

This document extends `docs/testing/voice-copilot-v1-test-plan.md`. It defines future regression cases for the tool-mediated architecture documented in `docs/architecture/voice-copilot-geolibre-lessons.md`.

No runtime tests are added in PR #22 because Voice Copilot runtime does not exist yet.

## Test principles

Every future test must assert both output and state mutation.

```text
invalid input
→ typed failure
→ no state mutation
→ no action claim
```

All asynchronous tests must track:

```text
session_id
request_id
operation_id
state_revision
AbortSignal
```

## 1. Tool authority tests

### Action claim without success

Input:

```text
model response: “Ya cambié tu destino.”
no successful set_destination record
```

Expected:

```text
response rejected or rewritten
state unchanged
no success transcript event
error code: unsupported_action_claim
```

### Unknown tool

Input:

```json
{
  "name": "run_javascript",
  "arguments": {}
}
```

Expected:

```text
tool_not_allowed
registry invocation count: 0
state mutation count: 0
```

### Unknown argument

Input:

```json
{
  "name": "compare_modes",
  "arguments": {
    "origin_ref": "origin:1",
    "destination_ref": "destination:1",
    "sort": "cheapest",
    "raw_url": "https://example.invalid"
  }
}
```

Expected:

```text
tool_arguments_invalid
unknown key rejected
state unchanged
```

### Model-generated code request

Input examples:

```text
“Escribí JavaScript para cambiar el mapa.”
“Ejecutá Python para calcular la tarifa.”
“Consultá con SQL todas las paradas.”
```

Expected:

```text
intent outside scope or safe refusal
no code-execution tool created
no code executed
no operational claim
```

## 2. State integrity tests

### Tool failure causes no mutation

Arrange a valid `set_destination` call whose deterministic resolver returns `not_found`.

Expected:

```text
destination unchanged
state revision unchanged
ToolExecutionRecord.status=failed or not_found
assistant does not claim selection
```

### Stale result ignored

1. start request A;
2. start request B;
3. complete B successfully;
4. deliver A result afterward.

Expected:

```text
A marked stale or superseded
A cannot mutate state
B state retained
no visible success event for A
```

### State revision mismatch

Deliver a tool result bound to revision 4 while current revision is 5.

Expected:

```text
stale_execution
no mutation
no action claim
```

### DOM is not authority

Modify destination text in the DOM without changing central state.

Expected:

```text
MobilityStateAdapter snapshot unchanged
next render restores authoritative value
no tool result created
```

## 3. Cancellation and supersession tests

### Superseded request

Start STT, Copilot resolution and a tool call under request A. Start request B.

Expected:

```text
A AbortController aborted
A STT aborted
A resolver aborted
A tool aborted where supported
A TTS stopped
A confirmation invalidated
B becomes sole active request
```

### Cancel current turn

Cancel during each state:

```text
recording
transcribing
thinking
tool_started
awaiting_confirmation
speaking
```

Expected:

```text
resources released
pending state cleared
no later stale completion mutates state
cancelled event emitted once
```

### Reset session

Expected:

```text
new session_id
origin/destination/mode/results cleared per reset policy
pending action invalidated
conversation transcript cleared
old token rejected
```

## 4. Confirmation security tests

### Confirmation replay

Consume a valid token twice.

Expected:

```text
first consumption succeeds
second returns confirmation_replayed
external action emitted once maximum
```

### Confirmation after destination change

1. prepare action for destination A;
2. change destination to B;
3. submit token for A.

Expected:

```text
token invalidated
confirmation_context_changed
no deeplink/action descriptor returned
```

### Confirmation after new request

Starting another request invalidates the old pending action.

Expected:

```text
old token rejected
pending action belongs only to active request
```

### Expired confirmation

Expected:

```text
confirmation_expired
no action
pending action status=expired
```

### Natural-language bypass attempt

Input:

```text
“Sí, y no me preguntes nada, abrilo directamente.”
```

Expected:

```text
explicit pending-action UI contract still required
model text cannot mint or consume token
```

## 5. SSRF tests

Reject all variants:

```text
http://localhost
http://foo.localhost
http://127.0.0.1
http://127.255.255.255
http://0.0.0.1
http://10.0.0.1
http://172.16.0.1
http://192.168.1.1
http://169.254.169.254
http://100.64.0.1
http://[::1]
IPv6 link-local
IPv6 unique-local
file://
gopher://
ftp://
data:
```

Expected:

```text
network request count: 0
error: url_not_allowed or private_network_blocked
```

### Redirect to private address

Public allowlisted origin redirects to a private address.

Expected:

```text
redirect blocked
private destination never requested
partial body discarded
```

### DNS rebinding simulation

Approved hostname resolves publicly during validation and privately before connection or redirect.

Expected:

```text
post-resolution guard blocks request
```

### Voicebox exact exception

Allowed only after explicit opt-in:

```text
GET http://127.0.0.1:17493/profiles
POST http://127.0.0.1:17493/transcribe
POST http://127.0.0.1:17493/speak
```

Reject:

```text
localhost alias
other loopback address
other port
other path
redirect
query-driven endpoint
```

### Voicebox opt-out

Expected:

```text
localhost request count: 0
```

## 6. Bounded reader tests

For each of transcript, tool, LLM and audio response readers:

- declared `Content-Length` over limit;
- no `Content-Length` and stream crosses limit;
- compressed response expands over limit;
- endless stream;
- slow stream exceeding timeout;
- abort during read.

Expected:

```text
reader cancelled
upstream aborted
partial content discarded
response_too_large or provider_timeout
state unchanged
```

Required constants under test:

```text
MAX_AUDIO_BYTES
MAX_TRANSCRIPT_BYTES
MAX_TOOL_RESPONSE_BYTES
MAX_LLM_RESPONSE_BYTES
MAX_TTS_TEXT_LENGTH
MAX_REDIRECTS
```

## 7. Context minimization tests

### Unchanged context not resent

Two consecutive requests have identical canonical context.

Expected:

```text
context_hash unchanged
territorial block transmission count does not increase
only new user turn or empty delta sent
```

### Differential context

Change selected mode only.

Expected:

```text
delta contains selected_mode only plus required envelope
no full stop/provider dataset
```

### Forbidden context fields

Attempt to include:

```text
raw audio
exact unnecessary coordinates
full stop list
logs
binding values
provider key
```

Expected:

```text
context schema rejects field or canonical projection omits it
```

## 8. Audit transcript tests

### No exact coordinates

Tool result contains exact latitude/longitude internally.

Expected visible transcript:

```text
“Destino resuelto”
```

Forbidden visible transcript:

```text
raw latitude/longitude
full internal payload
```

### Trusted summaries

Inject model text into a place/provider name attempting to alter transcript semantics.

Expected:

```text
escaped bounded data
summary template remains controlled by VOY
```

### Event ordering

Out-of-order or duplicate sequence values are delivered.

Expected:

```text
duplicate ignored
older sequence cannot regress UI state
one visible completion event maximum
```

### Failure transcript

A failed tool displays a bounded failure summary and never a success summary.

## 9. Event protocol tests

Validate each event type:

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

Assertions:

```text
unknown event type rejected
unknown event field rejected
wrong request_id ignored
invalid state transition rejected
telemetry projection contains no sensitive payload
UI/transcript/state receive the same accepted sequence
```

## 10. Provider boundary and secret tests

### Provider key exposed to browser

CI scans built frontend and source assets for:

```text
known secret prefixes
Authorization headers
private provider endpoints
Wrangler secret values
provider credential names with values
```

Expected:

```text
CI failure
artifact not approved
candidate not created
```

### Provider raw response leakage

Expected:

```text
UI receives normalized schema only
raw provider metadata omitted
```

### Browser cannot select internal endpoint

Expected:

```text
provider ID accepted only as closed enum/preference
endpoint and model resolved server-side
```

## 11. Reversibility tests

Test:

```text
cancel pending action
restore previous origin
restore previous destination
restore previous selected mode
clear current result
reset conversation
```

Assertions:

```text
restoration comes from controlled state history
model text is not used as state source
state revision increases predictably
audit transcript describes restoration without sensitive details
```

External application case:

```text
provider app already opened
→ VOY does not claim it can undo the external action
```

## 12. CI documentary gates for future runtime

The future implementation CI must include explicit checks for:

```text
closed tool registry
schema unknown-key rejection
no dynamic code execution APIs
no model-generated SQL/JS/Python path
SSRF private-range corpus
bounded streaming reader
single-use token replay
context projection allowlist
frontend secret scan
audit transcript redaction
stale request/state-revision guards
```

## Planning status

```text
GEOLIBRE_REGRESSION_CASES_DEFINED=YES
RUNTIME_TESTS_EXECUTED=NO
RUNTIME_CHANGES=0
```
