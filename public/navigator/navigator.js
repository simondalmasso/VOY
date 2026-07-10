/* ============================================================
 * VOY_NAVIGATOR — NAVIGATION_MODULE_MINIMAL_V1
 * ------------------------------------------------------------
 * Loaded ON DEMAND by VOY-Lite.html via <script> injection the
 * first time the user taps "Navegar". Exposes window.VoyNavigator.
 *
 * MINIMAL_V1 SCOPE (overlay layer only — adds, never replaces):
 *   1. VOY_NAV_MODE  — overlay_state_machine
 *      Modes: walking | driving | transit_light_inference
 *      Activation: user_opt_in_button_only (the "Navegar" button).
 *      Default mode inferred from VOY's _activeMode at start();
 *      user can cycle modes via the panel mode button.
 *   2. VOICE_GUIDANCE — WebSpeechAPI (speechSynthesis), step_based
 *      Muted by default (voiceOn=false). When unmuted, announces
 *      the next maneuver step as the user approaches it (threshold
 *      scales per mode: 50m walk / 150m drive). For transit mode,
 *      announces nearby bus-stop proximity hints instead of turns.
 *   3. GPS overlay    — independent navigator.geolocation.watchPosition
 *      (VOY's origin watch is untouched). "You are here" magenta dot
 *      + camera follow + drag-pause + recenter.
 *
 * CORE RULES (HARD — never violate):
 *   - NO_BREAK_EXISTING_OSRM: never touches drawRouteLine() / the
 *     'route-src' source / 'route-line' / 'route-shadow' layers.
 *     Makes its OWN read-only OSRM fetch (steps=true) solely for
 *     voice-maneuver data; does not render a competing route.
 *   - NO_REPLACE_ROUTE_ENGINE: never imports/modified MobilityEngine,
 *     PricingEngine, or MobilityController. Reads window.MC only to
 *     infer the initial mode + ranked bus lines (read-only).
 *   - ADD_LAYER_ONLY: all DOM is namespaced (.voy-nav-*) and fully
 *     removable by stop(). Adds zero competing route layers.
 *
 * ISOLATION CONTRACT (unchanged from Phase 1):
 *   - Owns its OWN geolocation watch — fully independent of VOY's
 *     origin-detection watch. Stopping one never affects the other.
 *   - Receives the MapLibre map instance + destination as start()
 *     params (read-only usage of the map for easeTo + marker only).
 * ============================================================ */
(function () {
  'use strict';
  if (window.VoyNavigator) return; // guard against double-load

  // ---------- MODES (overlay_state_machine) ----------
  // transit_light_inference is NEVER auto-selected on start; the user
  // must cycle to it explicitly via the panel mode button.
  var MODES = {
    walking: {
      label: 'Caminando',
      osrmProfile: 'foot',
      announceThreshold: 50,   // meters — announce next maneuver when within this distance
      icon: 'walk'
    },
    driving: {
      label: 'Manejando',
      osrmProfile: 'driving',
      announceThreshold: 150,
      icon: 'car'
    },
    transit_light_inference: {
      label: 'Colectivo',
      osrmProfile: null,        // no turn-by-turn fetch — light inference only
      announceThreshold: 60,    // bus-stop proximity hint threshold
      icon: 'bus'
    }
  };
  var MODE_ORDER = ['walking', 'driving', 'transit_light_inference'];

  var _state = {
    running: false,
    map: null,
    dest: null,
    mode: 'walking',
    watchId: null,
    userMarker: null,
    panel: null,
    follow: true,
    voiceOn: false,          // muted_default — voice OFF until user toggles
    lastFix: null,
    dragHandler: null,
    // step-based voice guidance state
    steps: [],               // [{location:[lng,lat], maneuver:{type,modifier}, name, announced}]
    stepIdx: 0,              // index of next unannounced step
    routeFetched: false,     // whether OSRM steps have been fetched for current mode
    // transit light inference state
    announcedStops: {}       // key "linea|nombre" → true (avoid repeating the same stop)
  };

  // ---------- helpers ----------
  function _hasMap() { return !!_state.map && typeof _state.map.easeTo === 'function'; }

  function _speak(text) {
    if (!_state.voiceOn) return;          // muted_default — never speaks unless user opted in
    if (!text) return;
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

  // haversine distance in meters (lightweight, no deps)
  function _distMeters(lat1, lon1, lat2, lon2) {
    var R = 6371000, toRad = Math.PI / 180;
    var dLat = (lat2 - lat1) * toRad, dLon = (lon2 - lon1) * toRad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // local icon set (keeps this module self-contained — does not depend on VOY's svg() helper)
  function _svg(name, size) {
    var s = size || 18, P = {
      locate: '<path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.5"/>',
      volume: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M19.5 6.5a8 8 0 0 1 0 11"/>',
      volumeOff: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m17 9 4 6M21 9l-4 6"/>',
      close: '<path d="M6 6 18 18M18 6 6 18"/>',
      walk: '<circle cx="13" cy="4" r="2"/><path d="M11 8l2 3 3 1-2 5"/><path d="M9 13l2-2"/><path d="M14 21l-2-5-3-2"/>',
      car: '<path d="M5 17h14M5 17v3M19 17v3M5 17l1.5-6h11L19 17"/><circle cx="8" cy="17" r="1.5"/><circle cx="16" cy="17" r="1.5"/>',
      bus: '<rect x="4" y="4" width="16" height="14" rx="2"/><path d="M4 12h16"/><circle cx="8" cy="18" r="1.2"/><circle cx="16" cy="18" r="1.2"/><path d="M7 8h4"/>'
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

  // ---------- floating panel (mode / recenter / voice / exit) ----------
  function _buildPanel() {
    var p = document.createElement('div');
    p.className = 'voy-nav-panel';
    p.setAttribute('role', 'status');
    p.setAttribute('aria-live', 'polite');
    p.innerHTML =
      '<span class="vnp-status"><span class="vnp-dot"></span><span class="vnp-label">Siguiendo tu ubicación</span></span>' +
      '<button class="vnp-mode" type="button" aria-label="Cambiar modo de navegación" title="Modo"></button>' +
      '<button class="vnp-recenter" type="button" aria-label="Recentrar en mi ubicación" title="Recentrar"></button>' +
      '<button class="vnp-voice" type="button" aria-label="Activar voz" title="Voz"></button>' +
      '<button class="vnp-exit" type="button" aria-label="Salir de navegación" title="Salir"></button>';
    return p;
  }

  function _attachPanel() {
    var mapEl = document.getElementById('map');
    if (!mapEl || !_state.panel) return;
    mapEl.appendChild(_state.panel);
    _refreshModeButton();
    _setIcon(_state.panel.querySelector('.vnp-recenter'), 'locate');
    _setIcon(_state.panel.querySelector('.vnp-voice'), _state.voiceOn ? 'volume' : 'volumeOff');
    _setIcon(_state.panel.querySelector('.vnp-exit'), 'close');
    _state.panel.querySelector('.vnp-mode').addEventListener('click', cycleMode);
    _state.panel.querySelector('.vnp-recenter').addEventListener('click', recenter);
    _state.panel.querySelector('.vnp-voice').addEventListener('click', toggleVoice);
    _state.panel.querySelector('.vnp-exit').addEventListener('click', stop);
  }

  function _detachPanel() {
    if (_state.panel && _state.panel.parentNode) _state.panel.parentNode.removeChild(_state.panel);
    _state.panel = null;
  }

  function _refreshModeButton() {
    var btn = _state.panel ? _state.panel.querySelector('.vnp-mode') : null;
    if (!btn) return;
    var m = MODES[_state.mode];
    _setIcon(btn, m.icon);
    btn.setAttribute('aria-label', 'Modo: ' + m.label + ' (tocá para cambiar)');
    btn.setAttribute('title', 'Modo: ' + m.label);
    btn.setAttribute('data-mode', _state.mode);
  }

  // ---------- user marker (magenta "you are here" dot) ----------
  function _makeUserMarker(lat, lng) {
    var el = document.createElement('div');
    el.className = 'voy-nav-userdot';
    return new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(_state.map);
  }

  // ---------- step-based voice guidance (OSRM, read-only) ----------
  // Fetches the OSRM route WITH steps for the current mode's profile, solely to
  // obtain maneuver data for voice announcements. Does NOT render a route — the
  // existing drawRouteLine() already renders A→B. This is ADD_LAYER_ONLY: we add
  // voice, not a visual layer.
  function _fetchSteps() {
    var m = MODES[_state.mode];
    if (!m.osrmProfile) { _state.steps = []; _state.stepIdx = 0; _state.routeFetched = true; return; }
    var origin = null;
    try { origin = window.MC && window.MC.getOrigin ? window.MC.getOrigin() : null; } catch (e) {}
    // Prefer the latest GPS fix as the origin for step relevance; fall back to MC origin.
    var oLat = _state.lastFix ? _state.lastFix.lat : (origin ? origin.lat : null);
    var oLng = _state.lastFix ? _state.lastFix.lng : (origin ? origin.lon : null);
    var d = _state.dest;
    if (oLat == null || oLng == null || !d) { _state.steps = []; _state.routeFetched = true; return; }
    _state.routeFetched = false;
    var url = 'https://router.project-osrm.org/route/v1/' + m.osrmProfile + '/' +
              oLng + ',' + oLat + ';' + d.lon + ',' + d.lat +
              '?overview=false&steps=true';
    fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      _state.routeFetched = true;
      if (!data || !data.routes || !data.routes[0] || !data.routes[0].legs) { _state.steps = []; return; }
      var steps = [];
      data.routes[0].legs.forEach(function (leg) {
        (leg.steps || []).forEach(function (st) {
          if (st.maneuver && st.maneuver.location) {
            steps.push({
              location: st.maneuver.location, // [lng, lat]
              type: st.maneuver.type,          // 'turn' | 'arrive' | 'depart' | 'merge' | ...
              modifier: st.maneuver.modifier,   // 'left' | 'right' | 'straight' | ...
              name: st.name || '',
              announced: false
            });
          }
        });
      });
      _state.steps = steps;
      _state.stepIdx = 0;
    }).catch(function () { _state.routeFetched = true; _state.steps = []; });
  }

  // Map OSRM maneuver type+modifier to a short es-AR spoken phrase.
  function _maneuverPhrase(st) {
    if (!st) return '';
    if (st.type === 'arrive') return 'Llegaste a destino';
    if (st.type === 'depart') return 'Iniciá recorrido por ' + (st.name || 'la ruta');
    var mod = st.modifier || '';
    var dir = { left: 'a la izquierda', right: 'a la derecha',
                'slight left': 'levemente a la izquierda', 'slight right': 'levemente a la derecha',
                'sharp left': 'fuertemente a la izquierda', 'sharp right': 'fuertemente a la derecha',
                straight: 'recto', uturn: 'en U' }[mod] || '';
    var act = (st.type === 'turn') ? 'Girá' : (st.type === 'merge' ? 'Incorporate' : (st.type === 'roundabout' ? 'Tomá la rotonda' : 'Continuá'));
    if (dir) return act + ' ' + dir + (st.name ? ' por ' + st.name : '');
    return act + (st.name ? ' por ' + st.name : '');
  }

  // Called on each GPS fix: find the next unannounced step, and if the user is
  // within the mode's threshold, speak the maneuver phrase and mark it announced.
  function _maybeAnnounceStep(lat, lng) {
    if (!_state.voiceOn) return;              // muted_default — no announcements unless user opted in
    if (!(_state.steps && _state.steps.length)) return;
    var m = MODES[_state.mode];
    // advance stepIdx past already-announced steps
    while (_state.stepIdx < _state.steps.length && _state.steps[_state.stepIdx].announced) _state.stepIdx++;
    if (_state.stepIdx >= _state.steps.length) return;
    var st = _state.steps[_state.stepIdx];
    var d = _distMeters(lat, lng, st.location[1], st.location[0]);
    if (d <= m.announceThreshold) {
      var phrase = _maneuverPhrase(st);
      if (phrase) _speak(phrase);
      st.announced = true;
      _state.stepIdx++;
      _event('navigation_step_announced', { mode: _state.mode, type: st.type, modifier: st.modifier || '' });
    }
  }

  // ---------- transit light inference ----------
  // In transit_light_inference mode, on each GPS fix we check whether the user is
  // near any bus stop (from window.BUS_STOPS). If within threshold and not yet
  // announced for that stop, speak a light hint. This is NOT transit routing —
  // just proximity awareness. Does not touch MC.rankBusLines() output.
  function _maybeAnnounceTransitStop(lat, lng) {
    if (!_state.voiceOn) return;
    if (_state.mode !== 'transit_light_inference') return;
    var stops = null;
    try { stops = window.BUS_STOPS || null; } catch (e) {}
    if (!stops || !stops.length) return;
    var m = MODES[_state.mode];
    for (var i = 0; i < stops.length; i++) {
      var s = stops[i];
      var d = _distMeters(lat, lng, s.lat, s.lon);
      if (d <= m.announceThreshold) {
        var key = s.linea + '|' + s.nombre;
        if (!_state.announcedStops[key]) {
          _state.announcedStops[key] = true;
          _speak('Cerca de parada de línea ' + s.linea + ': ' + s.nombre);
          _event('navigation_transit_stop_near', { linea: s.linea, nombre: s.nombre });
        }
      }
    }
  }

  // ---------- GPS callbacks ----------
  function _onFix(pos) {
    var lat = pos.coords.latitude, lng = pos.coords.longitude;
    _state.lastFix = { lat: lat, lng: lng, acc: pos.coords.accuracy, ts: Date.now() };
    _status(true, 'Siguiendo · ' + MODES[_state.mode].label);
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
    // step-based voice guidance + transit light inference
    _maybeAnnounceStep(lat, lng);
    _maybeAnnounceTransitStop(lat, lng);
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
    _status(true, 'Siguiendo · ' + MODES[_state.mode].label);
  }

  function toggleVoice() {
    _state.voiceOn = !_state.voiceOn;
    var btn = _state.panel ? _state.panel.querySelector('.vnp-voice') : null;
    _setIcon(btn, _state.voiceOn ? 'volume' : 'volumeOff');
    if (btn) btn.setAttribute('aria-label', _state.voiceOn ? 'Desactivar voz' : 'Activar voz');
    if (_state.voiceOn) {
      _speak('Voz activada');
      // If steps already fetched, immediately announce the next maneuver so the
      // user gets feedback as soon as they opt in (step_based, not just generic).
      if (_state.lastFix) _maybeAnnounceStep(_state.lastFix.lat, _state.lastFix.lng);
    } else {
      try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) {}
    }
    _event('navigation_voice_toggled', { on: _state.voiceOn });
  }

  // cycle walking → driving → transit_light_inference → walking
  function cycleMode() {
    var idx = MODE_ORDER.indexOf(_state.mode);
    _setMode(MODE_ORDER[(idx + 1) % MODE_ORDER.length]);
  }

  function _setMode(mode) {
    if (!MODES[mode] || mode === _state.mode) return;
    _state.mode = mode;
    // reset step-based state for the new mode
    _state.steps = [];
    _state.stepIdx = 0;
    _state.routeFetched = false;
    _state.announcedStops = {};
    _refreshModeButton();
    _status(true, 'Siguiendo · ' + MODES[mode].label);
    // re-fetch steps for the new mode (transit mode clears steps — light inference only)
    _fetchSteps();
    if (_state.voiceOn) _speak('Modo ' + MODES[mode].label);
    _event('navigation_mode_changed', { mode: mode });
  }

  // drag-pause: when the user drags the map, pause camera follow so they can look around.
  // Recenter re-enables it. This is core UX (don't fight the user for the camera).
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
    _state.voiceOn = false;        // muted_default — always starts muted
    _state.lastFix = null;
    _state.userMarker = null;
    _state.steps = [];
    _state.stepIdx = 0;
    _state.routeFetched = false;
    _state.announcedStops = {};

    // infer initial mode from VOY's _activeMode (read-only). transit is NEVER
    // auto-selected — user must cycle to it explicitly (do_not_auto_enable).
    var am = null;
    try { am = window._activeMode || null; } catch (e) {}
    if (am === 'walk') _state.mode = 'walking';
    else if (am === 'car' || am === 'taxi' || am === 'remis') _state.mode = 'driving';
    else _state.mode = 'walking'; // default — safest, slowest announce threshold

    if (!_hasMap()) { _toast('Mapa no disponible', 'error'); return; }
    if (!navigator.geolocation) { _toast('GPS no disponible en este dispositivo', 'error'); return; }

    _state.running = true;
    _state.panel = _buildPanel();
    _attachPanel();
    _bindDragPause();

    _status(true, 'Buscando señal GPS…');

    // start an INDEPENDENT GPS watch (VOY's own origin watch is untouched).
    _state.watchId = navigator.geolocation.watchPosition(_onFix, _onFixError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 3000
    });

    _event('navigation_start', { provider: 'voy_navigator', phase: 'minimal_v1', mode: _state.mode, has_dest: !!_state.dest });
    _speak('Navegación iniciada, modo ' + MODES[_state.mode].label);
    _toast('Navegación activa · ' + MODES[_state.mode].label, 'success');

    // fetch OSRM steps for step-based voice (transit mode skips this — light inference only)
    _fetchSteps();
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
    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) {}
    _state.map = null;
    _state.dest = null;
    _state.follow = true;
    _state.voiceOn = false;
    _state.steps = [];
    _state.stepIdx = 0;
    _state.routeFetched = false;
    _state.announcedStops = {};
    _state.running = false;
    _event('navigation_stop', { provider: 'voy_navigator' });
    _toast('Navegación detenida', 'info');
  }

  function isRunning() { return _state.running; }
  function getMode() { return _state.mode; }
  function isVoiceOn() { return _state.voiceOn; }

  // export the public surface
  window.VoyNavigator = {
    start: start,
    stop: stop,
    recenter: recenter,
    toggleVoice: toggleVoice,
    cycleMode: cycleMode,
    isRunning: isRunning,
    getMode: getMode,
    isVoiceOn: isVoiceOn
  };
})();
