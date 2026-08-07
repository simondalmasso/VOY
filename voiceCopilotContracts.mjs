export const VOICE_MODELS = Object.freeze({
  stt: '@cf/openai/whisper-large-v3-turbo',
  llm: '@cf/qwen/qwen3-30b-a3b-fp8',
  tts: 'browser:speechSynthesis'
});

export const VOICE_LIMITS = Object.freeze({
  maxAudioBytes: 6 * 1024 * 1024,
  maxTranscriptChars: 1200,
  maxMessageChars: 800,
  maxTurns: 10,
  maxSessionMs: 15 * 60 * 1000,
  maxContextBytes: 24 * 1024,
  maxToolResultBytes: 16 * 1024,
  maxResponseChars: 1200,
  maxEvents: 80,
  maxCandidates: 8,
  maxDailyStt: 30,
  maxDailyChat: 200,
  maxSessionInference: 20,
  confirmationTtlMs: 2 * 60 * 1000
});

export const VOICE_STATES = Object.freeze([
  'idle',
  'requesting_permission',
  'listening',
  'recording',
  'transcribing',
  'reviewing',
  'thinking',
  'tool_running',
  'awaiting_confirmation',
  'speaking',
  'cancelled',
  'error',
  'offline'
]);

export const VOICE_EVENTS = Object.freeze([
  'text_delta',
  'tool_started',
  'tool_completed',
  'tool_failed',
  'confirmation_required',
  'confirmation_accepted',
  'confirmation_rejected',
  'speech_started',
  'speech_stopped',
  'cancelled',
  'error'
]);

export const TOOL_NAMES = Object.freeze([
  'get_current_city',
  'get_coverage',
  'search_destination',
  'resolve_destination',
  'set_origin',
  'set_destination',
  'estimate_modes',
  'compare_modes',
  'list_available_providers',
  'list_nearby_stops',
  'list_nearby_bike_stations',
  'get_fare_metadata',
  'prepare_external_provider_action',
  'confirm_external_provider_action',
  'cancel_pending_action'
]);

export const PROHIBITED_TOOL_NAMES = Object.freeze([
  'arbitrary_fetch',
  'run_javascript',
  'run_python',
  'execute_code',
  'raw_sql',
  'read_secret',
  'write_kv',
  'write_durable_object',
  'modify_cloudflare',
  'shell',
  'repository_access',
  'dynamic_tool_creation'
]);

const CITY_IDS = new Set(['_default', 'santafe']);
const MODES = new Set(['taxi', 'remis', 'bus', 'bike', 'walk', 'uber', 'didi', 'maxim', 'cabify']);
const PROVIDERS = new Set(['uber', 'didi', 'maxim', 'cabify', 'taxi', 'remis']);

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function boundedString(value, max, { allowEmpty = false } = {}) {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if ((!allowEmpty && !normalized) || normalized.length > max) return null;
  return normalized;
}

export function normalizeCityId(value) {
  const raw = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s_-]+/g, '');
  if (raw === 'santafe') return 'santafe';
  return '_default';
}

export function normalizeMode(value) {
  const mode = String(value || '').toLowerCase();
  return MODES.has(mode) ? mode : null;
}

export function normalizeProvider(value) {
  const provider = String(value || '').toLowerCase();
  return PROVIDERS.has(provider) ? provider : null;
}

export function closedObject(value, allowedKeys, requiredKeys = []) {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  if (keys.some(key => !allowedKeys.includes(key))) return false;
  return requiredKeys.every(key => Object.prototype.hasOwnProperty.call(value, key));
}

export function validateSession(input, now = Date.now()) {
  if (!closedObject(input, [
    'session_id', 'created_at', 'expires_at', 'turn_count', 'inference_count', 'state_revision',
    'city_id', 'origin', 'destination', 'selected_mode', 'results', 'pending_confirmation',
    'recent_turns', 'last_response', 'active_request_id'
  ], ['session_id', 'created_at', 'expires_at', 'turn_count', 'state_revision', 'city_id'])) {
    throw new Error('invalid_session_shape');
  }
  const sessionId = boundedString(input.session_id, 80);
  const createdAt = Number(input.created_at);
  const expiresAt = Number(input.expires_at);
  const turnCount = Number(input.turn_count);
  const inferenceCount = Number(input.inference_count || 0);
  const revision = Number(input.state_revision);
  if (!sessionId || !Number.isFinite(createdAt) || !Number.isFinite(expiresAt) || expiresAt <= now || expiresAt - createdAt > VOICE_LIMITS.maxSessionMs) throw new Error('session_expired_or_invalid');
  if (!Number.isInteger(turnCount) || turnCount < 0 || turnCount >= VOICE_LIMITS.maxTurns) throw new Error('session_turn_limit');
  if (!Number.isInteger(inferenceCount) || inferenceCount < 0 || inferenceCount >= VOICE_LIMITS.maxSessionInference) throw new Error('session_inference_limit');
  if (!Number.isInteger(revision) || revision < 0) throw new Error('invalid_state_revision');
  const recentTurns = Array.isArray(input.recent_turns) ? input.recent_turns.slice(-6).map(turn => ({
    role: turn?.role === 'assistant' ? 'assistant' : 'user',
    content: boundedString(turn?.content, 600) || ''
  })).filter(turn => turn.content) : [];
  const session = {
    session_id: sessionId,
    created_at: createdAt,
    expires_at: expiresAt,
    turn_count: turnCount,
    inference_count: inferenceCount,
    state_revision: revision,
    city_id: CITY_IDS.has(input.city_id) ? input.city_id : normalizeCityId(input.city_id),
    origin: sanitizePlaceRef(input.origin),
    destination: sanitizePlaceRef(input.destination),
    selected_mode: normalizeMode(input.selected_mode),
    results: sanitizeResults(input.results),
    pending_confirmation: sanitizePending(input.pending_confirmation),
    recent_turns: recentTurns,
    last_response: boundedString(input.last_response, VOICE_LIMITS.maxResponseChars, { allowEmpty: true }) || '',
    active_request_id: boundedString(input.active_request_id, 80, { allowEmpty: true }) || null
  };
  const bytes = new TextEncoder().encode(JSON.stringify(session)).byteLength;
  if (bytes > VOICE_LIMITS.maxContextBytes) throw new Error('session_context_too_large');
  return session;
}

export function newSession(cityId = '_default', now = Date.now()) {
  return {
    session_id: crypto.randomUUID(),
    created_at: now,
    expires_at: now + VOICE_LIMITS.maxSessionMs,
    turn_count: 0,
    inference_count: 0,
    state_revision: 0,
    city_id: normalizeCityId(cityId),
    origin: null,
    destination: null,
    selected_mode: null,
    results: [],
    pending_confirmation: null,
    recent_turns: [],
    last_response: '',
    active_request_id: null
  };
}

export function sanitizePlaceRef(value) {
  if (!isPlainObject(value)) return null;
  const ref = boundedString(value.ref || value.canonicalId, 160);
  const name = boundedString(value.name || value.displayName, 180);
  if (!ref || !name) return null;
  return {
    ref,
    name,
    address: boundedString(value.address, 240, { allowEmpty: true }) || '',
    source: ['local', 'remote', 'recent', 'manual'].includes(value.source) ? value.source : 'local',
    city_id: normalizeCityId(value.city_id || value.cityId)
  };
}

export function sanitizeResults(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, VOICE_LIMITS.maxCandidates).map(sanitizePlaceRef).filter(Boolean);
}

export function sanitizePending(value) {
  if (!isPlainObject(value)) return null;
  const token = boundedString(value.token, 120);
  const provider = normalizeProvider(value.provider);
  const destinationRef = boundedString(value.destination_ref, 160);
  const expiresAt = Number(value.expires_at);
  if (!token || !provider || !destinationRef || !Number.isFinite(expiresAt)) return null;
  return {
    token,
    provider,
    destination_ref: destinationRef,
    operation_id: boundedString(value.operation_id, 80) || '',
    state_revision: Number(value.state_revision) || 0,
    expires_at: expiresAt
  };
}

export function validateChatPayload(body, now = Date.now()) {
  if (!closedObject(body, ['message', 'request_id', 'session', 'client_context'], ['message', 'request_id', 'session'])) throw new Error('invalid_chat_payload');
  const message = boundedString(body.message, VOICE_LIMITS.maxMessageChars);
  const requestId = boundedString(body.request_id, 80);
  if (!message || !requestId) throw new Error('invalid_chat_fields');
  const session = validateSession(body.session, now);
  const clientContext = sanitizeClientContext(body.client_context);
  return { message, request_id: requestId, session, client_context: clientContext };
}

export function sanitizeClientContext(value) {
  if (!isPlainObject(value)) return {};
  return {
    online: value.online !== false,
    voice_output: value.voice_output === true,
    locale: boundedString(value.locale, 20, { allowEmpty: true }) || 'es-AR',
    capability_flags: isPlainObject(value.capability_flags) ? {
      ai_copilot: value.capability_flags.ai_copilot === true,
      voice_input: value.capability_flags.voice_input === true,
      voice_output: value.capability_flags.voice_output === true,
      voicebox_local: value.capability_flags.voicebox_local === true
    } : {}
  };
}

export function validateToolCall(name, args) {
  if (!TOOL_NAMES.includes(name)) throw new Error(`unknown_tool:${String(name)}`);
  if (!isPlainObject(args)) throw new Error('tool_arguments_not_object');
  const noArgs = ['get_current_city', 'get_coverage', 'estimate_modes', 'compare_modes', 'list_available_providers', 'list_nearby_stops', 'list_nearby_bike_stations', 'get_fare_metadata', 'cancel_pending_action'];
  if (noArgs.includes(name)) {
    if (Object.keys(args).length) throw new Error(`unknown_tool_argument:${name}`);
    return {};
  }
  if (name === 'search_destination') {
    if (!closedObject(args, ['query'], ['query'])) throw new Error('invalid_search_destination_args');
    const query = boundedString(args.query, 160);
    if (!query) throw new Error('invalid_destination_query');
    return { query };
  }
  if (name === 'resolve_destination') {
    if (!closedObject(args, ['destination_ref'], ['destination_ref'])) throw new Error('invalid_resolve_destination_args');
    const destinationRef = boundedString(args.destination_ref, 160);
    if (!destinationRef) throw new Error('invalid_destination_ref');
    return { destination_ref: destinationRef };
  }
  if (name === 'set_origin' || name === 'set_destination') {
    if (!closedObject(args, ['place_ref'], ['place_ref'])) throw new Error(`invalid_${name}_args`);
    const placeRef = sanitizePlaceRef(args.place_ref);
    if (!placeRef) throw new Error(`invalid_${name}_place`);
    return { place_ref: placeRef };
  }
  if (name === 'prepare_external_provider_action') {
    if (!closedObject(args, ['provider'], ['provider'])) throw new Error('invalid_prepare_action_args');
    const provider = normalizeProvider(args.provider);
    if (!provider) throw new Error('invalid_provider');
    return { provider };
  }
  if (name === 'confirm_external_provider_action') {
    if (!closedObject(args, ['token'], ['token'])) throw new Error('invalid_confirm_action_args');
    const token = boundedString(args.token, 120);
    if (!token) throw new Error('invalid_confirmation_token');
    return { token };
  }
  throw new Error(`unsupported_tool_validation:${name}`);
}

const schema = (properties = {}, required = []) => ({ type: 'object', additionalProperties: false, properties, required });
const placeRefSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ref: { type: 'string', maxLength: 160 },
    name: { type: 'string', maxLength: 180 },
    address: { type: 'string', maxLength: 240 },
    source: { type: 'string', enum: ['local', 'remote', 'recent', 'manual'] },
    city_id: { type: 'string', enum: ['_default', 'santafe'] }
  },
  required: ['ref', 'name', 'source', 'city_id']
};

export const TOOL_DEFINITIONS = Object.freeze([
  { name: 'get_current_city', description: 'Return the current normalized VOY city and no other data.', parameters: schema() },
  { name: 'get_coverage', description: 'Return verified coverage metadata for the current city.', parameters: schema() },
  { name: 'search_destination', description: 'Search the deterministic territorial VOY destination index. Never invent a place.', parameters: schema({ query: { type: 'string', minLength: 2, maxLength: 160 } }, ['query']) },
  { name: 'resolve_destination', description: 'Resolve one destination from the current deterministic result list by exact reference.', parameters: schema({ destination_ref: { type: 'string', minLength: 1, maxLength: 160 } }, ['destination_ref']) },
  { name: 'set_origin', description: 'Set the VOY origin from a validated place reference.', parameters: schema({ place_ref: placeRefSchema }, ['place_ref']) },
  { name: 'set_destination', description: 'Set the VOY destination from a validated place reference.', parameters: schema({ place_ref: placeRefSchema }, ['place_ref']) },
  { name: 'estimate_modes', description: 'Return only server-verified provider metadata. Never accept client-authored estimates.', parameters: schema() },
  { name: 'compare_modes', description: 'Compare only server-reconstructed verified metadata. Never rank client-authored values.', parameters: schema() },
  { name: 'list_available_providers', description: 'List provider availability from the current territorial profile.', parameters: schema() },
  { name: 'list_nearby_stops', description: 'List the bounded current-city stop sample from territorial data.', parameters: schema() },
  { name: 'list_nearby_bike_stations', description: 'List the bounded current-city bicycle station sample from territorial data.', parameters: schema() },
  { name: 'get_fare_metadata', description: 'Return verified fare metadata from the current territorial profile.', parameters: schema() },
  { name: 'prepare_external_provider_action', description: 'Prepare a one-use confirmation for an external provider. Does not open anything.', parameters: schema({ provider: { type: 'string', enum: [...PROVIDERS] } }, ['provider']) },
  { name: 'confirm_external_provider_action', description: 'Confirm a previously prepared one-use external action token.', parameters: schema({ token: { type: 'string', minLength: 1, maxLength: 120 } }, ['token']) },
  { name: 'cancel_pending_action', description: 'Cancel the current pending external action.', parameters: schema() }
]);

export function makeEvent(type, requestId, sequence, detail = {}) {
  if (!VOICE_EVENTS.includes(type)) throw new Error(`unknown_event:${type}`);
  return {
    event_id: crypto.randomUUID(),
    request_id: requestId,
    sequence,
    type,
    timestamp: new Date().toISOString(),
    detail
  };
}
