import {
  VOICE_LIMITS,
  boundedString,
  normalizeProvider,
  validateToolCall
} from './voiceCopilotContracts.mjs';
import {
  foldText,
  loadCityBundle,
  providerSummary,
  safeExternalUrl,
  searchTerritorial,
  toPlaceRef
} from './voiceCopilotData.mjs';

const confirmationStore = new Map();
const MAX_CONFIRMATIONS = 500;

function clone(value) {
  return structuredClone(value);
}

function cleanupConfirmations(now = Date.now()) {
  for (const [token, record] of confirmationStore) {
    if (record.used || record.expires_at <= now) confirmationStore.delete(token);
  }
  if (confirmationStore.size > MAX_CONFIRMATIONS) {
    for (const token of confirmationStore.keys()) {
      confirmationStore.delete(token);
      if (confirmationStore.size <= MAX_CONFIRMATIONS / 2) break;
    }
  }
}

async function hashArguments(value) {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoded));
  return [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function executionRecord(name, args, requestId, beforeRevision, afterRevision, status, summary, result = null) {
  return {
    operation_id: crypto.randomUUID(),
    request_id: requestId,
    tool: name,
    arguments_summary: Object.keys(args),
    state_revision_before: beforeRevision,
    state_revision_after: afterRevision,
    status,
    summary,
    result,
    reversible: ['set_origin', 'set_destination', 'cancel_pending_action'].includes(name),
    requires_confirmation: name === 'prepare_external_provider_action',
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString()
  };
}

export async function executeVoiceTool(name, rawArgs, session, env, requestId) {
  const args = validateToolCall(name, rawArgs);
  const next = clone(session);
  const beforeRevision = next.state_revision;
  const bundle = await loadCityBundle(env, next.city_id);
  let result;

  if (name === 'get_current_city') {
    result = { city_id: next.city_id, display_name: bundle.profile.display_name || bundle.profile.name };
  } else if (name === 'get_coverage') {
    result = {
      city_id: next.city_id,
      coverage_level: bundle.profile.coverage_level,
      coverage_notes: Array.isArray(bundle.profile.coverage_notes) ? bundle.profile.coverage_notes.slice(0, 6) : [],
      source: bundle.profile.source,
      verified_at: bundle.profile.verified_at
    };
  } else if (name === 'search_destination') {
    const matches = searchTerritorial(bundle, next.city_id, args.query);
    next.results = matches;
    if (matches.length === 1 || (matches.length && foldText(matches[0].name) === foldText(args.query))) {
      next.destination = matches[0];
    }
    result = { query: args.query, candidates: matches, destination_selected: next.destination?.ref || null };
  } else if (name === 'resolve_destination') {
    const match = next.results.find(place => place.ref === args.destination_ref);
    if (!match) throw new Error('destination_ref_not_in_current_results');
    next.destination = match;
    result = { destination: match };
  } else if (name === 'set_origin') {
    if (args.place_ref.city_id !== next.city_id) throw new Error('origin_city_mismatch');
    next.origin = args.place_ref;
    result = { origin: next.origin };
  } else if (name === 'set_destination') {
    if (args.place_ref.city_id !== next.city_id) throw new Error('destination_city_mismatch');
    next.destination = args.place_ref;
    result = { destination: next.destination };
  } else if (name === 'estimate_modes') {
    if (!next.destination) throw new Error('destination_required');
    result = {
      destination: next.destination,
      estimates: next.mobility_snapshot,
      calculated_by: 'VOY deterministic client adapter'
    };
  } else if (name === 'compare_modes') {
    if (!next.destination) throw new Error('destination_required');
    const available = next.mobility_snapshot.filter(item => item.available);
    const priceRank = available.filter(item => Number.isFinite(item.price)).sort((a, b) => a.price - b.price);
    const durationRank = available.filter(item => Number.isFinite(item.duration_min)).sort((a, b) => a.duration_min - b.duration_min);
    result = {
      available,
      cheapest: priceRank[0] || null,
      fastest: durationRank[0] || null,
      ranking_source: 'VOY deterministic mobility snapshot'
    };
  } else if (name === 'list_available_providers') {
    result = { providers: providerSummary(bundle) };
  } else if (name === 'list_nearby_stops') {
    result = {
      stops: (bundle.transport.bus_stops || []).slice(0, 5).map(item => toPlaceRef(item, next.city_id, 'stop')).filter(Boolean),
      proximity: 'territorial sample; no live distance calculated'
    };
  } else if (name === 'list_nearby_bike_stations') {
    result = {
      stations: (bundle.transport.bike_stations || []).slice(0, 5).map(item => toPlaceRef(item, next.city_id, 'bike')).filter(Boolean),
      proximity: 'territorial sample; no live availability calculated'
    };
  } else if (name === 'get_fare_metadata') {
    result = {
      city_id: next.city_id,
      fare_registry: bundle.fares.fare_registry,
      source: bundle.fares.source,
      verified_at: bundle.fares.verified_at,
      status: bundle.fares.status
    };
  } else if (name === 'prepare_external_provider_action') {
    if (!next.destination) throw new Error('destination_required');
    const provider = normalizeProvider(args.provider);
    const providers = providerSummary(bundle);
    const availability = providers.find(item => item.id === provider || item.category === provider);
    if (!availability?.available) throw new Error('provider_not_available');
    const url = safeExternalUrl(bundle, provider);
    if (!url) throw new Error('provider_action_url_unavailable');
    cleanupConfirmations();
    const token = crypto.randomUUID();
    const operationId = crypto.randomUUID();
    const expiresAt = Date.now() + VOICE_LIMITS.confirmationTtlMs;
    const stateRevision = next.state_revision + 1;
    confirmationStore.set(token, {
      token,
      session_id: next.session_id,
      operation_id: operationId,
      provider,
      destination_ref: next.destination.ref,
      arguments_hash: await hashArguments({ provider, destination_ref: next.destination.ref }),
      state_revision: stateRevision,
      expires_at: expiresAt,
      url,
      used: false
    });
    next.pending_confirmation = {
      token,
      provider,
      destination_ref: next.destination.ref,
      operation_id: operationId,
      state_revision: stateRevision,
      expires_at: expiresAt
    };
    result = {
      confirmation_required: true,
      provider,
      destination: next.destination,
      token,
      expires_at: expiresAt
    };
  } else if (name === 'confirm_external_provider_action') {
    throw new Error('confirmation_must_use_dedicated_endpoint');
  } else if (name === 'cancel_pending_action') {
    if (next.pending_confirmation?.token) confirmationStore.delete(next.pending_confirmation.token);
    next.pending_confirmation = null;
    result = { cancelled: true };
  } else {
    throw new Error(`unimplemented_tool:${name}`);
  }

  next.state_revision += 1;
  const resultBytes = new TextEncoder().encode(JSON.stringify(result)).byteLength;
  if (resultBytes > VOICE_LIMITS.maxToolResultBytes) throw new Error('tool_result_too_large');
  return {
    session: next,
    result,
    record: executionRecord(name, args, requestId, beforeRevision, next.state_revision, 'success', `${name}:success`, result)
  };
}

export function failedExecutionRecord(name, args, requestId, revision, error) {
  const message = boundedString(error?.message, 140, { allowEmpty: true }) || 'tool_failed';
  return executionRecord(name, args || {}, requestId, revision, revision, 'failed', `${name}:failed:${message}`);
}

export function fallbackTool(message, session) {
  const text = foldText(message);
  if (/\b(cancel|cancela|para|detene|detener)\b/.test(text) && session.pending_confirmation) {
    return { name: 'cancel_pending_action', arguments: {} };
  }
  if (/\b(abr|abri|abre|open)\b/.test(text)) {
    for (const provider of ['uber', 'didi', 'maxim', 'cabify', 'taxi', 'remis']) {
      if (text.includes(provider)) return { name: 'prepare_external_provider_action', arguments: { provider } };
    }
  }
  if (/\b(cuanto|tarifa|precio|cuesta|taxi)\b/.test(text)) return { name: 'get_fare_metadata', arguments: {} };
  if (/\b(barat|econom|conviene|rapido|mejor|compar)\b/.test(text)) return { name: 'compare_modes', arguments: {} };
  if (/\b(proveedor|app|uber|didi|maxim|cabify)\b/.test(text)) return { name: 'list_available_providers', arguments: {} };
  if (/\b(colectivo|parada|bus)\b/.test(text)) return { name: 'list_nearby_stops', arguments: {} };
  if (/\b(bici|bicicleta|estacion)\b/.test(text)) return { name: 'list_nearby_bike_stations', arguments: {} };
  const destination = text.match(/(?:ir|voy|lleva|destino)\s+(?:a\s+|al\s+|a la\s+)?(.{2,80})/);
  if (destination?.[1]) return { name: 'search_destination', arguments: { query: destination[1] } };
  if (text.includes('terminal')) return { name: 'search_destination', arguments: { query: 'terminal' } };
  return null;
}

export function fallbackNarration(name, result, session) {
  if (name === 'search_destination') {
    if (!result.candidates.length) return 'No encontré ese destino en los datos territoriales disponibles. Probá con otro nombre o una dirección más precisa.';
    if (result.destination_selected) return `Encontré ${result.candidates[0].name} y lo dejé como destino en la conversación.`;
    return `Encontré ${result.candidates.length} opciones: ${result.candidates.slice(0, 3).map(item => item.name).join(', ')}.`;
  }
  if (name === 'compare_modes') {
    if (!result.available.length) return 'Todavía no tengo una estimación determinista disponible. Definí el destino y calculá el viaje en VOY.';
    const pieces = [];
    if (result.cheapest) pieces.push(`más barato: ${result.cheapest.label}`);
    if (result.fastest) pieces.push(`más rápido: ${result.fastest.label}`);
    return pieces.length ? `Según el cálculo actual de VOY, ${pieces.join('; ')}.` : 'VOY tiene opciones disponibles, pero no hay precio o duración comparable.';
  }
  if (name === 'get_fare_metadata') return 'Te muestro únicamente las tarifas y referencias verificadas del perfil territorial. Los precios de plataformas privadas se consultan en cada app.';
  if (name === 'list_available_providers') return `Disponibles según el perfil actual: ${result.providers.filter(item => item.available).map(item => item.name).join(', ') || 'ninguno verificado'}.`;
  if (name === 'prepare_external_provider_action') return `Preparé abrir ${result.provider} para ${result.destination.name}. Confirmalo una sola vez para salir de VOY.`;
  if (name === 'cancel_pending_action') return 'Cancelé la acción pendiente.';
  if (name === 'get_current_city') return `La ciudad activa es ${result.display_name}.`;
  if (name === 'get_coverage') return `La cobertura actual es ${result.coverage_level}.`;
  if (name === 'list_nearby_stops') return `Tengo ${result.stops.length} paradas del perfil territorial. No afirmo distancia ni frecuencia en vivo.`;
  if (name === 'list_nearby_bike_stations') return `Tengo ${result.stations.length} estaciones del perfil territorial. No afirmo disponibilidad en vivo.`;
  if (name === 'estimate_modes') return result.estimates.length ? 'Recuperé la estimación determinista actual de VOY.' : 'Todavía no hay una estimación determinista disponible.';
  if (name === 'resolve_destination' || name === 'set_destination') return `El destino quedó en ${session.destination?.name || 'la opción seleccionada'}.`;
  if (name === 'set_origin') return `El origen quedó en ${session.origin?.name || 'la opción seleccionada'}.`;
  return 'La operación de VOY terminó correctamente.';
}

export function consumeConfirmation(token, session, now = Date.now()) {
  cleanupConfirmations(now);
  const pending = confirmationStore.get(token);
  if (!pending || pending.used) throw new Error('confirmation_replay_or_missing');
  if (pending.expires_at <= now) {
    confirmationStore.delete(token);
    throw new Error('confirmation_expired');
  }
  if (pending.session_id !== session.session_id) throw new Error('confirmation_session_mismatch');
  if (pending.destination_ref !== session.destination?.ref) throw new Error('confirmation_destination_mismatch');
  if (pending.state_revision !== session.state_revision) throw new Error('confirmation_state_revision_mismatch');
  if (session.pending_confirmation?.token !== token) throw new Error('confirmation_not_current');
  pending.used = true;
  confirmationStore.delete(token);
  const next = clone(session);
  next.pending_confirmation = null;
  next.state_revision += 1;
  return {
    session: next,
    external_action: {
      provider: pending.provider,
      url: pending.url,
      destination_ref: pending.destination_ref,
      operation_id: pending.operation_id,
      confirmed: true,
      reversible: false
    }
  };
}

export const __voiceRuntimeTest = Object.freeze({
  confirmationStore,
  cleanupConfirmations,
  hashArguments
});
