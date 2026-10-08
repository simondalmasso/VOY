// ORDER-075 — normalized tracker observations.
// Pure module: no DOM, no network, no persistence. Truth contract lives here.

export const TEMPORAL_STATES = Object.freeze(['realtime', 'predicted', 'scheduled', 'unknown']);
export const REALTIME_FRESHNESS_MS = 20000;
export const REALTIME_MAX_SPEED_MPS = 45;
export const ROUTE_SNAP_MAX_METERS = 35;

export function isValidObservation(raw) {
  return normalizeObservation(raw) !== null;
}

export function normalizeObservation(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const sourceId = typeof raw.source_id === 'string' ? raw.source_id.trim() : '';
  if (!id || !sourceId) return null;
  if (!TEMPORAL_STATES.includes(raw.temporal_state)) return null;
  const observedAt = Date.parse(String(raw.observed_at ?? ''));
  if (!Number.isFinite(observedAt)) return null;
  const lat = Number(raw.lat), lon = Number(raw.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  const observation = {
    id,
    source_id: sourceId,
    temporal_state: raw.temporal_state,
    observed_at: new Date(observedAt).toISOString(),
    lat,
    lon
  };
  for (const key of ['route_id', 'trip_id', 'line', 'next_stop']) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) observation[key] = value.trim();
  }
  for (const key of ['delay_seconds', 'speed_mps']) {
    const value = Number(raw[key]);
    if (Number.isFinite(value)) observation[key] = value;
  }
  if (Array.isArray(raw.verified_geometry)) {
    const coordinates = raw.verified_geometry
      .map(pair => Array.isArray(pair) && pair.length >= 2 ? [Number(pair[0]), Number(pair[1])] : null)
      .filter(pair => pair && Number.isFinite(pair[0]) && Number.isFinite(pair[1]));
    if (coordinates.length >= 2) observation.verified_geometry = coordinates;
  }
  if (Array.isArray(raw.scheduled_times)) {
    const times = raw.scheduled_times.filter(t => typeof t === 'string' && t.trim());
    if (times.length) observation.scheduled_times = times;
  }
  if (raw.synthetic_fixture === true) observation.synthetic_fixture = true;
  if (raw.observed_position_only === true) observation.observed_position_only = true;
  return observation;
}

export function classifyObservation(observation, nowMs, { freshnessMs = REALTIME_FRESHNESS_MS } = {}) {
  if (!observation) return { state: 'unknown', movable: false, reason: 'invalid_observation' };
  const state = observation.temporal_state;
  if (state === 'realtime') {
    const observedAt = Date.parse(observation.observed_at);
    const ageMs = Number.isFinite(observedAt) ? Math.max(0, nowMs - observedAt) : Infinity;
    if (!Number.isFinite(ageMs) || ageMs > freshnessMs) {
      return { state: 'unknown', movable: false, reason: 'stale_source', age_ms: ageMs, temporal_state: state };
    }
    return { state: 'realtime', movable: true, reason: 'fresh', age_ms: ageMs, temporal_state: state };
  }
  if (state === 'predicted') return { state: 'predicted', movable: false, reason: 'predicted_static', temporal_state: state };
  if (state === 'scheduled') return { state: 'scheduled', movable: false, reason: 'scheduled_no_vehicle', temporal_state: state };
  return { state: 'unknown', movable: false, reason: 'unknown_state', temporal_state: state };
}

export function ageLabel(ageMs) {
  if (!Number.isFinite(ageMs) || ageMs < 0) return '';
  const seconds = Math.round(ageMs / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${seconds % 60} s`;
}
