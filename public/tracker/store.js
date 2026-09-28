// ORDER-075 GLM53 — TrackerStore: entity registry, session trail, selection,
// follow state and time-scrub state. Pure module: no DOM, no network, no storage.
// Realtime movement is arbitrated by public/3d/temporal.js (authority engine).
import { normalizeObservation, classifyObservation, REALTIME_FRESHNESS_MS, REALTIME_MAX_SPEED_MPS, ROUTE_SNAP_MAX_METERS } from './observations.js?v=__BUILD_ID__';

export const TRAIL_MAX_OBSERVATIONS = 32;
export const TRAIL_MAX_AGE_MS = 120000;
export const MAX_TRACKER_ENTITIES = 16;
export const MAX_NEARBY_MARKERS = 12;

function distanceMeters(a, b) {
  const rad = value => Number(value) * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// The temporal engine (public/3d/temporal.js — authority) is injected by tests
// and otherwise lazy-loaded on first realtime need: the 2D baseline never
// fetches anything under /3d/ or vendor/three.

export function createTrackerStore({ now = () => Date.now(), presentTransportEntity = null } = {}) {
  let temporalFn = typeof presentTransportEntity === 'function' ? presentTransportEntity : null;
  let temporalPromise = null;
  function ensureTemporal() {
    if (temporalFn) return Promise.resolve(temporalFn);
    temporalPromise ??= import('../3d/temporal.js?v=__BUILD_ID__')
      .then(module => { temporalFn = module.presentTransportEntity; return temporalFn; })
      .catch(() => null);
    return temporalPromise;
  }
  const entities = new Map(); // id -> { id, source_id, observation, previous, trail, lastUpdate }
  let selectedId = null;
  let followMode = 'off'; // 'off' | 'following' | 'suspended'
  const time = { mode: 'now', index: 0 };
  const listeners = { change: [] };
  let revision = 0;

  function notify() { revision += 1; for (const cb of listeners.change) cb(snapshot()); }
  function snapshot() {
    return { revision, entityCount: entities.size, selectedId, follow: followMode, time: { ...time } };
  }

  function trimTrail(trail) {
    // age cap measured against the newest stored source observation
    const newest = trail.length ? Date.parse(trail[trail.length - 1].observed_at) : 0;
    while (trail.length > 1 && newest - Date.parse(trail[0].observed_at) > TRAIL_MAX_AGE_MS) trail.shift();
    while (trail.length > TRAIL_MAX_OBSERVATIONS) trail.shift();
  }

  function evictIfNeeded() {
    while (entities.size > MAX_TRACKER_ENTITIES) {
      let oldest = null, oldestKey = null;
      for (const [key, entity] of entities) {
        if (key === selectedId) continue; // selection is never evicted
        if (oldest === null || entity.lastUpdate < oldest) { oldest = entity.lastUpdate; oldestKey = key; }
      }
      if (oldestKey === null) break;
      entities.delete(oldestKey);
    }
  }

  function ingest(raw) {
    const observation = normalizeObservation(raw);
    if (!observation) return { accepted: false, reason: 'invalid_observation' };
    const existing = entities.get(observation.id) || null;
    const trail = [];
    let previous = null;
    if (existing) {
      if (existing.source_id !== observation.source_id) {
        // provenance switch: incompatible trail resets (ORDER-075 trail rule)
        previous = null;
      } else {
        previous = existing.observation;
        trail.push(...existing.trail);
      }
    }
    trail.push(observation); // only real source observations enter history
    trimTrail(trail);
    entities.set(observation.id, {
      id: observation.id,
      source_id: observation.source_id,
      observation,
      previous,
      trail,
      lastUpdate: now()
    });
    if (selectedId === observation.id && time.mode === 'scrub') {
      // new live evidence while inspecting history: return focus to now
      time.mode = 'now';
      time.index = 0;
    }
    evictIfNeeded();
    notify();
    return { accepted: true, entity: entities.get(observation.id) };
  }

  function get(id) { return entities.get(id) || null; }
  function entityList() { return [...entities.values()]; }

  function select(id) {
    if (!entities.has(id)) return false;
    selectedId = id;
    time.mode = 'now';
    time.index = 0;
    notify();
    return true;
  }
  function clearSelection() {
    selectedId = null;
    followMode = 'off';
    time.mode = 'now';
    time.index = 0;
    notify();
  }
  function selected() {
    if (!selectedId) return null;
    const entity = entities.get(selectedId);
    return entity ? { id: selectedId, entity } : null;
  }

  function setFollow(mode) {
    if (!['off', 'following', 'suspended'].includes(mode)) return false;
    if (mode !== 'off' && !selectedId) return false;
    followMode = mode;
    notify();
    return true;
  }
  function follow() { return followMode; }
  function userPanSuspend() {
    if (followMode === 'following') { followMode = 'suspended'; notify(); }
    return followMode;
  }
  function resumeFollow() {
    if (!selectedId) return false;
    followMode = 'following';
    notify();
    return true;
  }

  function trailOf(id) {
    const entity = entities.get(id);
    return entity ? entity.trail.map(observation => ({ ...observation })) : [];
  }

  function scrubTo(index) {
    const entity = selectedId ? entities.get(selectedId) : null;
    if (!entity || entity.trail.length < 2) return false; // rail appears with >=2 observations
    const max = entity.trail.length - 1;
    time.mode = 'scrub';
    time.index = Math.max(0, Math.min(max, Number(index) || 0));
    notify();
    return true;
  }
  function returnToNow() {
    time.mode = 'now';
    time.index = 0;
    notify();
    return true;
  }
  function timeState() { return { ...time }; }

  // Presentation frame. Delegates realtime movement to the temporal engine and
  // adds store-level semantics: scrub frames are discrete and land exactly on
  // stored source observations; single-observation realtime entities render as
  // static observed positions (an observation is a fact, motion is not).
  function displayFrame(id, {
    reducedMotion = false,
    freshnessMs = REALTIME_FRESHNESS_MS,
    maxSpeedMps = REALTIME_MAX_SPEED_MPS,
    maxSnapMeters = ROUTE_SNAP_MAX_METERS
  } = {}) {
    const entity = entities.get(id);
    if (!entity) return { render: false, animated: false, reason: 'unknown_entity' };
    const observation = entity.observation;
    const synthetic = observation.synthetic_fixture === true;

    if (time.mode === 'scrub' && selectedId === id) {
      const point = entity.trail[Math.min(time.index, entity.trail.length - 1)];
      if (!point) return { render: false, animated: false, reason: 'scrub_out_of_range' };
      return {
        render: true,
        animated: false,
        scrub: true,
        temporal_state: point.temporal_state,
        visual_state: point.temporal_state,
        position: { lat: point.lat, lon: point.lon },
        source_observation: point,
        source_synthetic: point.synthetic_fixture === true
      };
    }

    const classification = classifyObservation(observation, now(), { freshnessMs });
    if (observation.temporal_state === 'realtime' && classification.state === 'realtime' && entity.previous) {
      if (!temporalFn) {
        ensureTemporal(); // loads once; the next tick arbitrates with the authority engine
        return { render: false, animated: false, temporal_state: 'realtime', visual_state: 'realtime', reason: 'temporal_engine_pending', source_synthetic: synthetic };
      }
      const frame = temporalFn(entity.previous, observation, now(), {
        freshnessMs,
        maxSpeedMps,
        maxSnapMeters,
        reducedMotion,
        verifiedGeometry: observation.verified_geometry || entity.previous.verified_geometry || null
      });
      return { ...frame, source_synthetic: synthetic, classification };
    }
    if (observation.temporal_state === 'realtime' && classification.state === 'realtime') {
      // fresh single observation: honest static marker, zero invented motion
      return {
        render: true,
        animated: false,
        static_observation: true,
        temporal_state: 'realtime',
        visual_state: 'realtime',
        position: { lat: observation.lat, lon: observation.lon },
        source_observation: observation,
        source_synthetic: synthetic,
        classification
      };
    }
    if (observation.temporal_state === 'predicted') {
      return {
        render: true,
        animated: false,
        temporal_state: 'predicted',
        visual_state: 'predicted',
        position: { lat: observation.lat, lon: observation.lon },
        source_observation: observation,
        source_synthetic: synthetic,
        classification
      };
    }
    // scheduled / unknown / stale: no vehicle marker (SCHEDULED/UNKNOWN/STALE_MOVEMENT=0)
    return {
      render: false,
      animated: false,
      temporal_state: observation.temporal_state,
      visual_state: classification.state,
      reason: observation.temporal_state === 'scheduled' ? 'scheduled_no_vehicle'
        : classification.reason === 'stale_source' ? 'stale_observation'
        : observation.temporal_state === 'unknown' ? 'unknown_state' : classification.reason,
      source_synthetic: synthetic,
      classification
    };
  }

  function nearby(center, { limit = MAX_NEARBY_MARKERS } = {}) {
    if (!center || !Number.isFinite(Number(center.lat)) || !Number.isFinite(Number(center.lon))) return [];
    const rows = entityList()
      .map(entity => ({ entity, distance: distanceMeters(center, entity.observation) }))
      .sort((a, b) => a.distance - b.distance);
    const picked = rows.slice(0, limit).map(row => row.entity);
    const selectedEntity = selectedId ? entities.get(selectedId) : null;
    if (selectedEntity && !picked.some(entity => entity.id === selectedId)) {
      picked[Math.min(picked.length, limit - 1)] = selectedEntity;
    }
    return picked;
  }

  // Feeds the existing 3D renderer contract: {previous, next, verifiedGeometry}
  function transportEntries() {
    return entityList()
      .filter(entity => entity.observation.temporal_state === 'realtime' || entity.observation.temporal_state === 'predicted')
      .map(entity => ({
        id: entity.id,
        previous: entity.previous,
        next: entity.observation,
        verifiedGeometry: entity.observation.verified_geometry || null
      }));
  }

  return {
    ingest, get, entities: entityList, select, clearSelection, selected,
    setFollow, follow, userPanSuspend, resumeFollow,
    trail: trailOf, scrubTo, returnToNow, timeState,
    displayFrame, nearby, transportEntries,
    bindTemporal(fn) { if (typeof fn === 'function') temporalFn = fn; },
    ensureTemporal,
    onChange(cb) { listeners.change.push(cb); return () => { const i = listeners.change.indexOf(cb); if (i >= 0) listeners.change.splice(i, 1); }; },
    get revision() { return revision; }
  };
}
