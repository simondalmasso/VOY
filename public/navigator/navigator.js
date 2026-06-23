/* ============================================================
 * VOY_NAVIGATOR — Phase 1 MVP (isolated, lazy-loaded module)
 * ------------------------------------------------------------
 * Loaded ON DEMAND by VOY-Lite.html via <script> injection the
 * first time the user taps "Navegar". Exposes window.VoyNavigator.
 *
 * PHASE 1 SCOPE (this file only):
 *   - GPS tracking   : own navigator.geolocation.watchPosition (high accuracy)
 *   - User marker    : "you are here" dot on the map (magenta, distinct from
 *                      VOY's green origin / red destination markers)
 *   - Camera follow  : map.easeTo({center:[lng,lat]}) on each GPS fix
 *   - Recenter        : control button that re-enables follow + recenters
 *   - Drag-pause     : if the user drags the map, follow pauses until Recenter
 *   - Exit           : stops the watch, removes marker + panel, restores map
 *   - Voice (optional): speechSynthesis announcements (es-AR), toggleable
 *
 * NOT IN SCOPE (future phases — do not implement here):
 *   - Phase 2: turn-by-turn instructions, routing, arrival detection
 *   - Phase 3: offline cache, rerouting, lane guidance
 *
 * ISOLATION CONTRACT (HARD RULE):
 *   - Does NOT import/modify MobilityEngine, PricingEngine, or MobilityController.
 *   - Receives the MapLibre map instance + destination as start() params (read-only).
 *   - Owns its OWN geolocation watch — fully independent of VOY's origin-detection
 *     watch (_gpsWatch in VOY-Lite.html). Stopping/clearing one never affects the other.
 *   - All DOM it creates is namespaced (.voy-nav-*) and fully removable by stop().
 * ============================================================ */
(function () {
  'use strict';
  if (window.VoyNavigator) return; // guard against double-load

  var _state = {
    running: false,
    map: null,
    dest: null,
    watchId: null,
    userMarker: null,
    panel: null,
    follow: true,
    voiceOn: false,
    lastFix: null,
    dragHandler: null
  };

  // ---------- helpers ----------
  function _hasMap() { return !!_state.map && typeof _state.map.easeTo === 'function'; }

  function _speak(text) {
    if (!_state.voiceOn) return;
    try {
      if ('speechSynthesis' in window) {
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'es-AR'; u.rate = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    } catch (e) { /* voice is optional — never fatal */ }
  }

  function _toast(msg, type) { try { if (window.showToast) window.showToast(msg, type); } catch (e) {} }
  function _event(type, data) { try { if (window.v5event) window.v5event(type, data); } catch (e) {} }

  // local icon set (keeps this module self-contained — does not depend on VOY's svg() helper)
  function _svg(name, size) {
    var s = size || 18, P = {
      locate: '<path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.5"/>',
      volume: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M19.5 6.5a8 8 0 0 1 0 11"/>',
      volumeOff: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m17 9 4 6M21 9l-4 6"/>',
      close: '<path d="M6 6 18 18M18 6 6 18"/>'
    };
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }

  function _setIcon(btn, name) { if (btn) btn.innerHTML = _svg(name, 18); }

  function _status(ok, label) {
    var dot = _state.panel ? _state.panel.querySelector('.vnp-dot') : null;
    var lab = _state.panel ? _state.panel.querySelector('.vnp-status .vnp-label') : null;
    if (dot) dot.className = 'vnp-dot' + (ok ? '' : ' err');
    if (lab && label) lab.textContent = label;
  }

  // ---------- floating panel (recenter / voice / exit) ----------
  function _buildPanel() {
    var p = document.createElement('div');
    p.className = 'voy-nav-panel';
    p.setAttribute('role', 'status');
    p.setAttribute('aria-live', 'polite');
    p.innerHTML =
      '<span class="vnp-status"><span class="vnp-dot"></span><span class="vnp-label">Siguiendo tu ubicación</span></span>' +
      '<button class="vnp-recenter" type="button" aria-label="Recentrar en mi ubicación" title="Recentrar"></button>' +
      '<button class="vnp-voice" type="button" aria-label="Activar voz" title="Voz"></button>' +
      '<button class="vnp-exit" type="button" aria-label="Salir de navegación" title="Salir"></button>';
    return p;
  }

  function _attachPanel() {
    var mapEl = document.getElementById('map');
    if (!mapEl || !_state.panel) return;
    mapEl.appendChild(_state.panel);
    _setIcon(_state.panel.querySelector('.vnp-recenter'), 'locate');
    _setIcon(_state.panel.querySelector('.vnp-voice'), _state.voiceOn ? 'volume' : 'volumeOff');
    _setIcon(_state.panel.querySelector('.vnp-exit'), 'close');
    _state.panel.querySelector('.vnp-recenter').addEventListener('click', recenter);
    _state.panel.querySelector('.vnp-voice').addEventListener('click', toggleVoice);
    _state.panel.querySelector('.vnp-exit').addEventListener('click', stop);
  }

  function _detachPanel() {
    if (_state.panel && _state.panel.parentNode) _state.panel.parentNode.removeChild(_state.panel);
    _state.panel = null;
  }

  // ---------- user marker (magenta "you are here" dot) ----------
  function _makeUserMarker(lat, lng) {
    var el = document.createElement('div');
    el.className = 'voy-nav-userdot';
    return new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(_state.map);
  }

  // ---------- GPS callbacks ----------
  function _onFix(pos) {
    var lat = pos.coords.latitude, lng = pos.coords.longitude;
    _state.lastFix = { lat: lat, lng: lng, acc: pos.coords.accuracy, ts: Date.now() };
    _status(true, 'Siguiendo tu ubicación');
    // create or move the user marker
    if (_state.userMarker) {
      _state.userMarker.setLngLat([lng, lat]);
    } else if (typeof maplibregl !== 'undefined') {
      _state.userMarker = _makeUserMarker(lat, lng);
    }
    // camera follow (only when follow is active — paused while user drags)
    if (_state.follow && _hasMap()) {
      _state.map.easeTo({ center: [lng, lat], duration: 800 });
    }
  }

  function _onFixError(err) {
    _status(false, 'GPS no disponible');
    if (err && err.code === err.PERMISSION_DENIED) {
      _speak('Necesito permiso de ubicación para navegar');
      _toast('Activá el permiso de ubicación para navegar', 'error');
    }
  }

  // ---------- public API ----------
  function recenter() {
    if (!_hasMap()) return;
    _state.follow = true;
    if (_state.lastFix) {
      var z = _state.map.getZoom();
      _state.map.easeTo({
        center: [_state.lastFix.lng, _state.lastFix.lat],
        zoom: z < 15 ? 15 : z,
        duration: 600
      });
    }
    _status(true, 'Siguiendo tu ubicación');
  }

  function toggleVoice() {
    _state.voiceOn = !_state.voiceOn;
    var btn = _state.panel ? _state.panel.querySelector('.vnp-voice') : null;
    _setIcon(btn, _state.voiceOn ? 'volume' : 'volumeOff');
    if (btn) btn.setAttribute('aria-label', _state.voiceOn ? 'Desactivar voz' : 'Activar voz');
    if (_state.voiceOn) _speak('Voz activada');
    _event('navigation_voice_toggled', { on: _state.voiceOn });
  }

  // drag-pause: when the user drags the map, pause camera follow so they can look around.
  // Recenter re-enables it. This is core Phase-1 UX (don't fight the user for the camera).
  function _bindDragPause() {
    if (!_hasMap()) return;
    _state.dragHandler = function () { _state.follow = false; _status(true, 'Pausado · tocá recentrar'); };
    _state.map.on('dragstart', _state.dragHandler);
  }
  function _unbindDragPause() {
    if (_hasMap() && _state.dragHandler) {
      try { _state.map.off('dragstart', _state.dragHandler); } catch (e) {}
    }
    _state.dragHandler = null;
  }

  function start(opts) {
    opts = opts || {};
    if (_state.running) return; // already navigating — ignore double-start
    _state.map = opts.map || null;
    _state.dest = opts.dest || null;
    _state.follow = true;
    _state.voiceOn = false;
    _state.lastFix = null;
    _state.userMarker = null;

    if (!_hasMap()) { _toast('Mapa no disponible', 'error'); return; }
    if (!navigator.geolocation) { _toast('GPS no disponible en este dispositivo', 'error'); return; }

    _state.running = true;
    _state.panel = _buildPanel();
    _attachPanel();
    _bindDragPause();

    _status(true, 'Buscando señal GPS…');

    // start an INDEPENDENT GPS watch (VOY's own origin watch is untouched).
    // NOTE: status is set BEFORE the watch so a synchronous first fix (or a
    // test mock) correctly overwrites "Buscando…" with "Siguiendo…".
    _state.watchId = navigator.geolocation.watchPosition(_onFix, _onFixError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 3000
    });

    _event('navigation_start', { provider: 'voy_navigator', phase: 1, has_dest: !!_state.dest });
    _speak('Navegación iniciada');
    _toast('Navegación activa', 'success');
  }

  function stop() {
    if (!_state.running) return;
    if (_state.watchId !== null) {
      navigator.geolocation.clearWatch(_state.watchId);
      _state.watchId = null;
    }
    _unbindDragPause();
    if (_state.userMarker) { _state.userMarker.remove(); _state.userMarker = null; }
    _detachPanel();
    _state.map = null;
    _state.dest = null;
    _state.follow = true;
    _state.running = false;
    _event('navigation_stop', { provider: 'voy_navigator' });
    _toast('Navegación detenida', 'info');
  }

  function isRunning() { return _state.running; }

  // export the public surface
  window.VoyNavigator = {
    start: start,
    stop: stop,
    recenter: recenter,
    toggleVoice: toggleVoice,
    isRunning: isRunning
  };
})();
