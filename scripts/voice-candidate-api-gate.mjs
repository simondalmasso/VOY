#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const required = name => {
  const value = process.env[name];
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
};

const workerUrl = required('WORKER_URL').replace(/\/$/, '');
const workerName = required('WORKER_NAME');
const candidateVersionId = required('CANDIDATE_VERSION_ID');
const audioPath = resolve(required('VOICE_SAMPLE_WAV'));
const evidenceDir = required('EVIDENCE_DIR');
const expectedBuild = required('SHORT_SHA');
const override = `${workerName}="${candidateVersionId}"`;
const audio = readFileSync(audioPath);
mkdirSync(evidenceDir, { recursive: true });

const sleep = ms => new Promise(resolvePromise => setTimeout(resolvePromise, ms));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function containsForbiddenTokens(value) {
  const text = JSON.stringify(value).toLowerCase();
  return text.includes('access_token') || text.includes('refresh_token');
}

async function requestJson(path, options = {}, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${workerUrl}${path}`, {
        ...options,
        redirect: 'manual',
        signal: AbortSignal.timeout(options.timeoutMs || 90_000),
        headers: {
          'Cloudflare-Workers-Version-Overrides': override,
          'X-VOY-Voice-Test': 'synthetic-ci-v1',
          'Cache-Control': 'no-cache, no-store, max-age=0',
          Pragma: 'no-cache',
          ...(options.headers || {})
        }
      });
      const text = await response.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        throw new Error(`invalid_json:${path}:${response.status}:${text.slice(0, 240)}`);
      }
      if (!response.ok || body.ok !== true) {
        throw new Error(`api_failure:${path}:${response.status}:${body.error || 'unknown'}`);
      }
      return { response, body };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 1500);
    }
  }
  throw lastError;
}

function write(name, value) {
  writeFileSync(`${evidenceDir}/${name}`, `${JSON.stringify(value, null, 2)}\n`);
}

function chatPayload(message, requestId, session) {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      request_id: requestId,
      session,
      client_context: {
        online: true,
        voice_output: true,
        locale: 'es-AR',
        capability_flags: {
          ai_copilot: true,
          voice_input: true,
          voice_output: true,
          voicebox_local: false
        }
      }
    })
  };
}

const records = [];

const health = await requestJson(`/api/health?voice_candidate_api=${Date.now()}`);
assert(health.body.build_hash === expectedBuild, `candidate_build_mismatch:${health.body.build_hash}`);
records.push({ gate: 'candidate_health', result: 'PASS', build_hash: health.body.build_hash });

const capabilities = await requestJson('/api/voice/capabilities');
assert(capabilities.body.enabled === true, 'voice_not_enabled');
assert(capabilities.body.providers?.stt === '@cf/openai/whisper-large-v3-turbo', 'stt_provider_mismatch');
assert(capabilities.body.providers?.llm === '@cf/qwen/qwen3-30b-a3b-fp8', 'llm_provider_mismatch');
assert(capabilities.body.audio_persisted === false, 'audio_persistence_contract_failed');
assert(capabilities.body.transcript_logged === false, 'transcript_logging_contract_failed');
records.push({ gate: 'capabilities', result: 'PASS', providers: capabilities.body.providers });

const sessionResponse = await requestJson('/api/voice/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ city_id: 'santafe' })
});
let session = sessionResponse.body.session;
assert(session?.city_id === 'santafe', 'session_city_mismatch');
records.push({ gate: 'session', result: 'PASS', session_id_present: Boolean(session.session_id) });

const transcription = await requestJson('/api/voice/transcribe', {
  method: 'POST',
  headers: { 'Content-Type': 'audio/wav', 'Content-Length': String(audio.byteLength) },
  body: audio,
  timeoutMs: 120_000
}, 2);
assert(typeof transcription.body.transcript === 'string' && transcription.body.transcript.trim().length >= 4, 'empty_real_transcript');
assert(transcription.body.audio_persisted === false, 'real_audio_persistence_contract_failed');
assert(transcription.body.transcript_logged === false, 'real_transcript_logging_contract_failed');
records.push({
  gate: 'real_stt',
  result: 'PASS',
  transcript: transcription.body.transcript,
  word_count: transcription.body.word_count,
  provider: transcription.body.provider
});

const search = await requestJson('/api/voice/chat', chatPayload('Quiero ir a la terminal.', 'candidate-search', session), 2);
session = search.body.session;
assert(search.body.tool_execution?.status === 'success', 'search_tool_not_successful');
assert(search.body.tool_execution?.tool === 'search_destination', `unexpected_search_tool:${search.body.tool_execution?.tool}`);
assert(session?.destination?.city_id === 'santafe', 'destination_not_resolved');
assert(search.body.no_action_claim_without_tool_success === true, 'no_action_claim_contract_missing');
records.push({
  gate: 'conversation_and_tool_calling',
  result: 'PASS',
  tool: search.body.tool_execution.tool,
  destination: session.destination,
  response: search.body.response
});

session.mobility_snapshot = [
  { mode: 'taxi', available: true, price: 5200, duration_min: 16, distance_km: 5.2, source: 'candidate_fixture', status: 'estimated', label: 'Taxi' },
  { mode: 'bus', available: true, price: 1200, duration_min: 34, distance_km: 5.2, source: 'candidate_fixture', status: 'estimated', label: 'Colectivo' }
];
const comparison = await requestJson('/api/voice/chat', chatPayload('Compará los modos y decime cuál es más barato y cuál más rápido.', 'candidate-compare', session), 2);
session = comparison.body.session;
assert(comparison.body.tool_execution?.status === 'success', 'compare_tool_not_successful');
assert(comparison.body.tool_execution?.tool === 'compare_modes', `unexpected_compare_tool:${comparison.body.tool_execution?.tool}`);
assert(comparison.body.tool_result?.cheapest?.mode === 'bus', 'cheapest_mode_mismatch');
assert(comparison.body.tool_result?.fastest?.mode === 'taxi', 'fastest_mode_mismatch');
records.push({ gate: 'deterministic_comparison', result: 'PASS', result_data: comparison.body.tool_result });

const preparedCancel = await requestJson('/api/voice/chat', chatPayload('Abrime Uber para este destino.', 'candidate-prepare-cancel', session), 2);
session = preparedCancel.body.session;
assert(preparedCancel.body.tool_execution?.tool === 'prepare_external_provider_action', `unexpected_prepare_tool:${preparedCancel.body.tool_execution?.tool}`);
assert(preparedCancel.body.tool_result?.confirmation_required === true, 'confirmation_not_required');
assert(preparedCancel.body.tool_result?.url === undefined, 'external_url_exposed_before_confirmation');
const cancelled = await requestJson('/api/voice/chat', chatPayload('Cancelá la acción pendiente.', 'candidate-cancel', session), 2);
session = cancelled.body.session;
assert(cancelled.body.tool_execution?.tool === 'cancel_pending_action', `unexpected_cancel_tool:${cancelled.body.tool_execution?.tool}`);
assert(cancelled.body.tool_result?.cancelled === true, 'cancellation_failed');
assert(session.pending_confirmation === null, 'pending_confirmation_not_cleared');
records.push({ gate: 'cancellation', result: 'PASS' });

const prepared = await requestJson('/api/voice/chat', chatPayload('Abrime Uber para este destino.', 'candidate-prepare-confirm', session), 2);
session = prepared.body.session;
const token = prepared.body.tool_result?.token;
assert(prepared.body.tool_execution?.tool === 'prepare_external_provider_action', 'confirmation_prepare_tool_missing');
assert(typeof token === 'string' && token.length > 10, 'confirmation_token_missing');
assert(prepared.body.tool_result?.url === undefined, 'url_exposed_before_explicit_confirmation');
const confirmed = await requestJson('/api/voice/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token, session })
}, 1);
assert(confirmed.body.external_action?.confirmed === true, 'external_action_not_confirmed');
assert(/^https:\/\//.test(confirmed.body.external_action?.url || ''), 'confirmed_url_invalid');
records.push({
  gate: 'single_use_confirmation',
  result: 'PASS',
  provider: confirmed.body.external_action.provider,
  url_host: new URL(confirmed.body.external_action.url).hostname
});

const replayResponse = await fetch(`${workerUrl}/api/voice/confirm`, {
  method: 'POST',
  redirect: 'manual',
  signal: AbortSignal.timeout(30_000),
  headers: {
    'Cloudflare-Workers-Version-Overrides': override,
    'X-VOY-Voice-Test': 'synthetic-ci-v1',
    'Cache-Control': 'no-cache, no-store, max-age=0',
    Pragma: 'no-cache',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ token, session: confirmed.body.session })
});
const replay = await replayResponse.json();
assert(replayResponse.status === 409, `confirmation_replay_status:${replayResponse.status}`);
assert(replay.ok === false, 'confirmation_replay_not_rejected');
records.push({ gate: 'confirmation_replay', result: 'PASS', status: replayResponse.status, error: replay.error });

for (const record of [health.body, capabilities.body, transcription.body, search.body, comparison.body, preparedCancel.body, cancelled.body, prepared.body, confirmed.body, replay]) {
  assert(!containsForbiddenTokens(record), 'google_or_oauth_token_field_detected');
}
records.push({ gate: 'forbidden_token_absence', result: 'PASS' });

const output = {
  result: 'PASS',
  candidate_version_id: candidateVersionId,
  candidate_build_hash: expectedBuild,
  audio_bytes: audio.byteLength,
  gates: records,
  checked_at: new Date().toISOString()
};
write('voice-api-gate.json', output);
console.log(JSON.stringify(output, null, 2));
