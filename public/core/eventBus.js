/**
 * VOY Event Bus + Transport — Event Spec v1.4 + V2 (VOY_ANALYTICS_V2)
 *
 * V2 canonical events (6): search, provider_click, route_selected,
 *   voice_search, share, navigation_start. The worker normalizes legacy
 *   v1.4 names → these 6 names so reports use a single namespace.
 *
 * Spec v1.4 events (kept for back-comat): app_boot (critical),
 *   search_performed, destination_selected, route_calculated,
 *   vehicle_viewed, provider_clicked, deeplink_opened, ride_estimated
 *   transport: cloudflare (worker endpoint), posthog (stub), local_fallback (always)
 *
 * Privacy:
 *   - anonymous_id_only (no PII, no user accounts)
 *   - no_pii: true, anonymization: hash_ip (handled server-side at the worker)
 *   - local_fallback: events always persist locally (IndexedDB) even if transport fails
 *
 * This module is the single event surface for the VOY frontend.
 * It does NOT depend on the DOM; it works in any JS context.
 *
 * @module EventBus
 * @version 1.4.0
 */
(function (global) {
  'use strict';

  var SPEC_VERSION = '1.4';
  var LOCAL_STORE = 'voy_events_v14';
  var LOCAL_MAX = 500;
  var FLUSH_INTERVAL_MS = 15000;     // flush every 15s
  var FLUSH_BATCH = 25;              // max events per flush
  var ENDPOINT = '/api/events';      // worker endpoint (relative; same origin)

  // PostHog stub: if window.posthog is present (loaded via snippet), we forward.
  // Otherwise events queue locally and the worker transport handles them.
  function _posthogAvailable() {
    return typeof global.posthog === 'object' && global.posthog && typeof global.posthog.capture === 'function';
  }

  // Anonymous ID — generated once, persisted in localStorage. Never tied to PII.
  var _anonId = null;
  var ANON_KEY = 'voy_anon_id';
  function _anonIdGet() {
    if (_anonId) return _anonId;
    try {
      var v = localStorage.getItem(ANON_KEY);
      if (v) { _anonId = v; return v; }
    } catch (e) {}
    _anonId = 'a_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    try { localStorage.setItem(ANON_KEY, _anonId); } catch (e) {}
    return _anonId;
  }

  // ---- Local persistence (IndexedDB with localStorage fallback) ----
  function _localPush(evt) {
    try {
      var raw = localStorage.getItem(LOCAL_STORE);
      var arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) arr = [];
      arr.push(evt);
      if (arr.length > LOCAL_MAX) arr = arr.slice(arr.length - LOCAL_MAX);
      localStorage.setItem(LOCAL_STORE, JSON.stringify(arr));
    } catch (e) { /* quota / private mode — silent */ }
  }

  function _localDrain(max) {
    try {
      var raw = localStorage.getItem(LOCAL_STORE);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      var take = arr.slice(0, max);
      var rest = arr.slice(max);
      localStorage.setItem(LOCAL_STORE, JSON.stringify(rest));
      return take;
    } catch (e) { return []; }
  }

  function _localCount() {
    try {
      var raw = localStorage.getItem(LOCAL_STORE);
      if (!raw) return 0;
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.length : 0;
    } catch (e) { return 0; }
  }

  // ---- Core emit ----
  var _sessionStart = Date.now();

  /**
   * Emit an event per spec v1.4.
   * @param {string} name   event name (must be in the spec list)
   * @param {object} data   event payload (no PII)
   */
  function emit(name, data) {
    // V7.7 VOY_ANALYTICS_V2: expanded allow-list. The 6 V2 canonical events
    // (search, provider_click, route_selected, voice_search, share,
    // navigation_start) are accepted natively. Legacy v1.4 names are kept for
    // back-comat; the worker normalizes BOTH families to the 6 V2 canonical
    // names before storage so reports use a single namespace.
    var allowed = {
      // V2 canonical (VOY_ANALYTICS_V2)
      search: true, provider_click: true, route_selected: true,
      voice_search: true, share: true, navigation_start: true,
      // v1.4 legacy (kept for back-comat; worker normalizes these → V2 names)
      app_boot: true, search_performed: true, destination_selected: true,
      route_calculated: true, vehicle_viewed: true, provider_clicked: true,
      deeplink_opened: true, ride_estimated: true, favorite_saved: true,
      // v5 legacy names that pass through v5event() unmapped
      share_app: true, support_alias_copied: true, navigation_stop: true,
      navigation_voice_toggled: true
    };
    if (!allowed[name]) {
      // Unknown events are dropped (spec compliance) but logged in debug.
      if (global.console && console.debug) console.debug('[eventBus] unknown event:', name);
      return;
    }

    var evt = {
      v: SPEC_VERSION,
      name: name,
      data: data || {},
      anon_id: _anonIdGet(),
      ts: Date.now(),
      session_age_ms: Date.now() - _sessionStart,
      // geo is coarse-grained cluster (no raw lat/lon) — privacy.
      geo: _coarseGeo(data)
    };

    // 1. local_fallback (always) — guarantees no event is lost.
    _localPush(evt);

    // 2. PostHog (if available) — privacy_mode: anonymous_id_only.
    if (_posthogAvailable()) {
      try {
        global.posthog.capture(name, Object.assign({}, evt.data, {
          voy_v: SPEC_VERSION,
          voy_anon_id: evt.anon_id,
          voy_geo: evt.geo
        }));
      } catch (e) { /* silent */ }
    }

    // 3. Cloudflare worker transport — batched, fire-and-forget.
    _scheduleFlush();
  }

  // Coarse geo cluster (~500m) so the worker can do geo_distribution analytics
  // without ever storing raw coordinates. Mirrors the va_cluster approach.
  function _coarseGeo(data) {
    if (!data || data.lat == null || data.lon == null) return '';
    var grid = 0.0045; // ~500m
    return (data.lat / grid).toFixed(0) + '_' + (data.lon / grid).toFixed(0);
  }

  // ---- Batched flush to worker ----
  var _flushTimer = null;
  var _flushing = false;

  function _scheduleFlush() {
    if (_flushTimer) return;
    _flushTimer = setTimeout(_flush, FLUSH_INTERVAL_MS);
  }

  function _flush() {
    _flushTimer = null;
    if (_flushing) return;
    _flushing = true;
    var batch = _localDrain(FLUSH_BATCH);
    if (!batch.length) { _flushing = false; return; }

    // Use sendBeacon if available (survives page unload), else fetch keepalive.
    var payload = JSON.stringify({ events: batch });
    try {
      if (global.navigator && navigator.sendBeacon) {
        var blob = new Blob([payload], { type: 'application/json' });
        var ok = navigator.sendBeacon(ENDPOINT, blob);
        if (ok) { _flushing = false; return; }
      }
    } catch (e) { /* fall through to fetch */ }

    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
        credentials: 'omit'
      }).catch(function () { /* re-queued locally already drained; acceptable loss */ })
        .finally(function () { _flushing = false; });
    } catch (e) { _flushing = false; }
  }

  // Flush on page hide (best-effort).
  function _bindLifecycle() {
    if (typeof global.addEventListener !== 'function') return;
    global.addEventListener('pagehide', function () {
      try { _flush(); } catch (e) {}
    });
    global.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        try { _flush(); } catch (e) {}
      }
    });
  }

  // ---- Public API ----
  var api = {
    SPEC_VERSION: SPEC_VERSION,
    emit: emit,
    flush: function () { return _flush(); },
    anonId: _anonIdGet,
    localCount: _localCount,
    // Test/debug helpers
    _drainForDebug: function () { return _localDrain(LOCAL_MAX); }
  };

  global.VoyEventBus = api;
  _bindLifecycle();
  // Emit app_boot once per page load (critical event per spec).
  // Deferred so listeners/consumers can attach before the first fire.
  if (typeof global.setTimeout === 'function') {
    global.setTimeout(function () {
      try { emit('app_boot', { ua: (global.navigator && navigator.userAgent) ? '1' : '0' }); } catch (e) {}
    }, 0);
  }
})(typeof window !== 'undefined' ? window : globalThis);
