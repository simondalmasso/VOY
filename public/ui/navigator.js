/**
 * VOY_NAVIGATOR_MVP — Phase 1 Navigator (isolated, lazy-loaded)
 * ============================================================
 * GOAL: Agregar navegación propia sin romper VOY.
 *
 * ARCHITECTURE:
 *   - isolated     — self-contained IIFE; does NOT touch the pricing
 *                    engine nor the mobility engine. Reads only from window._map
 *                    (MapLibre instance), window.maplibregl, window.MC
 *                    (MobilityController — read-only: getDest/getOrigin),
 *                    window.showToast, window.VoyEventBus.
 *   - lazy_loaded  — not loaded at boot. VOY-Lite.html injects this
 *                    script on first "Navegar" tap via ensureNavigator().
 *
 * PHASE_1 scope (this file):
 *   - GPS tracking        — dedicated watchPosition (separate from VOY's _gpsWatch)
 *   - follow user         — user marker tracks GPS fixes (marker.setLngLat + heading)
 *   - camera follow       — map.easeTo re-centers on user while follow=on
 *   - recenter            — one-shot flyTo to user position + re-enables follow
 *   - voice optional      — TTS via speechSynthesis (off by default; toggle in HUD)
 *
 * RULE compliance: No tocar el motor de pricing ni el motor de movilidad.
 *   - The pricing engine module   → untouched (not imported, not referenced).
 *   - The mobility engine module  → untouched (not imported, not referenced).
 *   - The mobility controller     → read-only (MC.getDest / MC.getOrigin only).
 *
 * PHASE_2 (future — NOT in this file): turn instructions, voice guidance,
 *   arrival detection beyond threshold. PHASE_3 (future): offline cache,
 *   rerouting, lane guidance.
 *
 * @module VoyNavigator
 * @version 1.0.0 (VOY V7.7.0)
 */
(function () {
  'use strict';
  if (window.VoyNavigator) return; // guard against double-load

  // ---- Internal state (never exposed except via _state for debugging) ----
  var _S = {
    active: false,         // navigation mode on/off
    follow: true,          // camera follow user (auto-disables on manual drag)
    watchId: null,         // dedicated geolocation watchPosition id
    userMarker: null,      // MapLibre Marker for user position
    userHeading: null,     // last heading (deg) if available
    lastPos: null,         // {lat, lon, accuracy, speed, heading, ts}
    dest: null,            // {lat, lon} snapshot of MC.getDest() at start
    destName: '',          // display name of destination
    voice: false,          // TTS on/off (voice OPTIONAL → default false)
    ttsLast: 0,            // last periodic TTS timestamp (throttle)
    arrived: false,        // arrival gate (fire once)
    hud: null,             // HUD root element
    _dragHandler: null,    // map 'dragstart' listener (auto-disable follow)
    _stopTimer: null       // auto-stop timer after arrival
  };

  // ---- Constants ----
  var ARRIVAL_THRESHOLD_M = 30;   // arrival gate (within 30m of dest)
  var FOLLOW_ZOOM = 16;           // camera zoom while following
  var FOLLOW_EASE_MS = 900;       // smooth re-center duration
  var WALK_KMH = 5;               // ETA fallback speed if no GPS speed
  var TTS_INTERVAL_MS = 30000;    // periodic distance announcement throttle
  var AUTO_STOP_AFTER_ARRIVAL_MS = 5000;

  function _log() { try { var a = ['[VoyNavigator]']; a.push.apply(a, arguments); console.log.apply(console, a); } catch (e) {} }

  // ---- Map accessors (decoupled from VOY-Lite internals) ----
  function _map() { return window._map || null; }
  function _maplibregl() { return window.maplibregl || null; }

  // ---- Self-contained haversine (does NOT import the mobility engine) ----
  function _dist(lat1, lon1, lat2, lon2) {
    var R = 6371000;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function _fmtDist(m) {
    if (m < 1000) return Math.max(10, Math.round(m / 10) * 10) + ' m';
    return (m / 1000).toFixed(m < 10000 ? 2 : 1) + ' km';
  }
  function _fmtEta(min) {
    if (min < 1) return '< 1 min';
    if (min < 60) return Math.round(min) + ' min';
    var h = Math.floor(min / 60), m = Math.round(min % 60);
    return h + ' h ' + (m ? m + ' min' : '');
  }

  // ---- TTS (voice optional) ----
  function _ttsAvailable() { return 'speechSynthesis' in window; }
  function _tts(text, opts) {
    if (!_S.voice) return;
    if (!_ttsAvailable()) return;
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-AR'; u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
      if (opts && opts.queue === false) window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function _ttsCancel() { try { if (_ttsAvailable()) window.speechSynthesis.cancel(); } catch (e) {} }

  // ---- User marker (pulsing dot + heading arrow) ----
  function _buildMarkerEl() {
    var el = document.createElement('div');
    el.className = 'voy-nav-user';
    el.innerHTML =
      '<div class="voy-nav-user-pulse" aria-hidden="true"></div>' +
      '<div class="voy-nav-user-arrow" aria-hidden="true"></div>' +
      '<div class="voy-nav-user-dot" aria-hidden="true"></div>';
    return el;
  }
  function _createUserMarker(lat, lon) {
    var ml = _maplibregl(); var map = _map();
    if (!ml || !map) return;
    if (_S.userMarker) { _S.userMarker.setLngLat([lon, lat]); return; }
    try {
      _S.userMarker = new ml.Marker({ element: _buildMarkerEl(), rotationAlignment: 'map' })
        .setLngLat([lon, lat])
        .addTo(map);
    } catch (e) { _log('marker create failed', e); }
  }
  function _removeUserMarker() {
    if (_S.userMarker) { try { _S.userMarker.remove(); } catch (e) {} _S.userMarker = null; }
  }

  // ---- GPS accuracy circle (GeoJSON fill layer) ----
  function _accuracyGeo(lat, lon, radiusM) {
    var pts = []; var N = 32; var R = 6378137;
    for (var i = 0; i <= N; i++) {
      var brng = i * 2 * Math.PI / N;
      var dLat = (radiusM * Math.cos(brng)) / R * 180 / Math.PI;
      var dLon = (radiusM * Math.sin(brng)) / (R * Math.cos(lat * Math.PI / 180 || 1e-9)) * 180 / Math.PI;
      pts.push([lon + dLon, lat + dLat]);
    }
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [pts] } };
  }
  function _ensureAccuracyLayer() {
    var map = _map(); if (!map) return;
    if (map.getSource('voy-nav-accuracy')) return;
    try {
      map.addSource('voy-nav-accuracy', { type: 'geojson', data: _accuracyGeo(0, 0, 0) });
      map.addLayer({
        id: 'voy-nav-accuracy', type: 'fill', source: 'voy-nav-accuracy',
        paint: { 'fill-color': '#007AFF', 'fill-opacity': 0.10 }
      });
    } catch (e) {}
  }
  function _updateAccuracy(lat, lon, acc) {
    var map = _map(); if (!map || !map.getSource('voy-nav-accuracy')) return;
    try { map.getSource('voy-nav-accuracy').setData(_accuracyGeo(lat, lon, acc || 0)); } catch (e) {}
  }
  function _removeAccuracyLayer() {
    var map = _map(); if (!map) return;
    try { if (map.getLayer('voy-nav-accuracy')) map.removeLayer('voy-nav-accuracy'); } catch (e) {}
    try { if (map.getSource('voy-nav-accuracy')) map.removeSource('voy-nav-accuracy'); } catch (e) {}
  }

  // ---- GPS watch (separate from VOY's _gpsWatch — fully isolated) ----
  function _startWatch() {
    if (!navigator.geolocation) { _log('geolocation unavailable'); return false; }
    _stopWatch();
    _S.watchId = navigator.geolocation.watchPosition(_onFix, _onFixErr, {
      enableHighAccuracy: true, timeout: 8000, maximumAge: 2000
    });
    return true;
  }
  function _stopWatch() {
    if (_S.watchId !== null) { try { navigator.geolocation.clearWatch(_S.watchId); } catch (e) {} _S.watchId = null; }
  }

  function _onFix(pos) {
    var lat = pos.coords.latitude, lon = pos.coords.longitude;
    var acc = pos.coords.accuracy || 0;
    var spd = (typeof pos.coords.speed === 'number' && pos.coords.speed >= 0) ? pos.coords.speed : null;
    var hdg = (typeof pos.coords.heading === 'number' && !isNaN(pos.coords.heading)) ? pos.coords.heading : null;
    _S.lastPos = { lat: lat, lon: lon, accuracy: acc, speed: spd, heading: hdg, ts: Date.now() };

    // marker tracking (follow user)
    _createUserMarker(lat, lon);
    if (hdg !== null && _S.userMarker) { _S.userHeading = hdg; try { _S.userMarker.setRotation(hdg); } catch (e) {} }

    // accuracy circle
    _ensureAccuracyLayer(); _updateAccuracy(lat, lon, acc);

    // camera follow
    if (_S.follow && _map()) {
      try { _map().easeTo({ center: [lon, lat], zoom: FOLLOW_ZOOM, duration: FOLLOW_EASE_MS }); } catch (e) {}
    }

    // HUD live update
    _updateHud(lat, lon, spd);

    // arrival + periodic voice
    if (_S.dest && !_S.arrived) {
      var d = _dist(lat, lon, _S.dest.lat, _S.dest.lon);
      if (d <= ARRIVAL_THRESHOLD_M) {
        _S.arrived = true;
        _tts('Llegaste al destino.', { queue: false });
        _flashArrival();
        _S._stopTimer = setTimeout(function () { if (_S.active) stop(true); }, AUTO_STOP_AFTER_ARRIVAL_MS);
      } else if (_S.voice && Date.now() - _S.ttsLast > TTS_INTERVAL_MS) {
        _tts('A ' + _fmtDist(d) + ' del destino.');
        _S.ttsLast = Date.now();
      }
    }
  }
  function _onFixErr(err) {
    _log('GPS error', err && err.code, err && err.message);
    var st = _S.hud && _S.hud.querySelector('.voy-nav-status');
    if (st) st.textContent = 'Señal GPS débil…';
  }

  // ---- SVG icon (self-contained; does not depend on VOY svg() helper) ----
  function _icon(name, size) {
    var P = {
      navigate: '<path d="M3 11 21 3l-8 18-2-8-8-2Z"/>',
      close: '<path d="M6 6 18 18M18 6 6 18"/>',
      locate: '<path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.5"/>',
      crosshair: '<circle cx="12" cy="12" r="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="1.5"/>',
      volume: '<path d="M5 9v6h4l5 4V5L9 9H5Z"/><path d="M17 8a5 5 0 0 1 0 8"/><path d="M19.5 5.5a9 9 0 0 1 0 13"/>',
      volumeOff: '<path d="M5 9v6h4l5 4V5L9 9H5Z"/><path d="m17 9 4 6M21 9l-4 6"/>'
    };
    var s = size || 20;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }

  // ---- HUD ----
  function _buildHud() {
    var el = document.createElement('div');
    el.className = 'voy-nav-hud';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Navegación VOY');
    el.innerHTML =
      '<div class="voy-nav-top">' +
        '<div class="voy-nav-title">' +
          '<span class="voy-nav-title-ic" aria-hidden="true"></span>' +
          '<div class="voy-nav-title-txt">' +
            '<div class="voy-nav-title-lbl">Navegando a</div>' +
            '<div class="voy-nav-title-name"></div>' +
          '</div>' +
        '</div>' +
        '<button class="voy-nav-close" type="button" aria-label="Detener navegación"></button>' +
      '</div>' +
      '<div class="voy-nav-stats">' +
        '<div class="voy-nav-stat"><span class="voy-nav-stat-lbl">Distancia</span><span class="voy-nav-stat-val voy-nav-dist">—</span></div>' +
        '<div class="voy-nav-stat"><span class="voy-nav-stat-lbl">Llegada</span><span class="voy-nav-stat-val voy-nav-eta">—</span></div>' +
        '<div class="voy-nav-stat"><span class="voy-nav-stat-lbl">GPS</span><span class="voy-nav-stat-val voy-nav-status">Buscando…</span></div>' +
      '</div>' +
      '<div class="voy-nav-ctrls">' +
        '<button class="voy-nav-btn voy-nav-follow active" type="button" aria-pressed="true"><span class="ic"></span><span class="lbl">Seguir</span></button>' +
        '<button class="voy-nav-btn voy-nav-recenter" type="button"><span class="ic"></span><span class="lbl">Centrar</span></button>' +
        '<button class="voy-nav-btn voy-nav-voice" type="button" aria-pressed="false"><span class="ic"></span><span class="lbl">Voz</span></button>' +
      '</div>';
    return el;
  }

  function _showHud() {
    if (_S.hud) return;
    var el = _buildHud();
    document.body.appendChild(el);
    _S.hud = el;
    el.querySelector('.voy-nav-title-ic').innerHTML = _icon('navigate', 18);
    el.querySelector('.voy-nav-close').innerHTML = _icon('close', 20);
    el.querySelector('.voy-nav-follow .ic').innerHTML = _icon('crosshair', 18);
    el.querySelector('.voy-nav-recenter .ic').innerHTML = _icon('locate', 18);
    el.querySelector('.voy-nav-voice .ic').innerHTML = _icon('volume', 18);
    el.querySelector('.voy-nav-title-name').textContent = _S.destName || 'Destino';
    el.querySelector('.voy-nav-close').addEventListener('click', function () { stop(); });
    el.querySelector('.voy-nav-follow').addEventListener('click', function () { toggleFollow(); });
    el.querySelector('.voy-nav-recenter').addEventListener('click', function () { recenter(); });
    el.querySelector('.voy-nav-voice').addEventListener('click', function () { toggleVoice(); });
    requestAnimationFrame(function () { el.classList.add('show'); });
    // auto-disable follow on manual map drag (like Google Maps)
    var map = _map();
    if (map && typeof map.on === 'function') {
      _S._dragHandler = function () { if (_S.follow) _setFollow(false); };
      try { map.on('dragstart', _S._dragHandler); } catch (e) {}
    }
    // reflect initial voice state
    if (_S.voice) {
      var vb = el.querySelector('.voy-nav-voice');
      vb.classList.add('active'); vb.setAttribute('aria-pressed', 'true');
      vb.querySelector('.ic').innerHTML = _icon('volume', 18);
    }
  }

  function _hideHud() {
    if (!_S.hud) return;
    var el = _S.hud; _S.hud = null;
    el.classList.remove('show');
    var map = _map();
    if (map && _S._dragHandler) { try { map.off('dragstart', _S._dragHandler); } catch (e) {} _S._dragHandler = null; }
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
  }

  function _updateHud(lat, lon, speed) {
    if (!_S.hud) return;
    var st = _S.hud.querySelector('.voy-nav-status');
    if (st) st.textContent = 'Activo';
    if (!_S.dest) return;
    var d = _dist(lat, lon, _S.dest.lat, _S.dest.lon);
    var distEl = _S.hud.querySelector('.voy-nav-dist');
    if (distEl) distEl.textContent = _fmtDist(d);
    var etaMin = (speed && speed > 0.3) ? (d / (speed * 60)) : (d / (WALK_KMH * 1000 / 60));
    var etaEl = _S.hud.querySelector('.voy-nav-eta');
    if (etaEl) etaEl.textContent = _fmtEta(etaMin);
  }

  function _flashArrival() {
    if (!_S.hud) return;
    _S.hud.classList.add('arrived');
    var distEl = _S.hud.querySelector('.voy-nav-dist');
    if (distEl) distEl.textContent = 'Llegaste';
    var etaEl = _S.hud.querySelector('.voy-nav-eta');
    if (etaEl) etaEl.textContent = '✓';
  }

  function _setFollow(on) {
    _S.follow = on;
    if (_S.hud) {
      var btn = _S.hud.querySelector('.voy-nav-follow');
      if (btn) { btn.classList.toggle('active', on); btn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    }
    if (on && _S.lastPos && _map()) {
      try { _map().easeTo({ center: [_S.lastPos.lon, _S.lastPos.lat], zoom: FOLLOW_ZOOM, duration: FOLLOW_EASE_MS }); } catch (e) {}
    }
  }

  // ---- Public API ----

  /**
   * Start navigation to the currently-selected destination (MC.getDest()).
   * @param {object} [opts]  { voice: boolean }
   * @returns {boolean} true if navigation started
   */
  function start(opts) {
    if (_S.active) return false;
    var mc = window.MC;
    var dest = mc && mc.getDest && mc.getDest();
    if (!dest) {
      if (window.showToast) window.showToast('Elegí un destino primero', 'info');
      return false;
    }
    _S.dest = { lat: dest.lat, lon: dest.lon };
    _S.destName = dest.name || 'Destino';
    _S.active = true;
    _S.follow = true;
    _S.arrived = false;
    _S.ttsLast = 0;
    _S.voice = !!(opts && opts.voice);

    _showHud();
    _ensureAccuracyLayer();
    var ok = _startWatch();
    if (!ok && window.showToast) window.showToast('GPS no disponible en este dispositivo', 'error');

    // initial recenter if a cached position exists (instant feedback before first fix)
    if (_S.lastPos && _map()) {
      try { _map().easeTo({ center: [_S.lastPos.lon, _S.lastPos.lat], zoom: FOLLOW_ZOOM, duration: FOLLOW_EASE_MS }); } catch (e) {}
    }

    // voice announcement (if enabled)
    if (_S.voice) {
      var initDist = _S.lastPos ? _dist(_S.lastPos.lat, _S.lastPos.lon, _S.dest.lat, _S.dest.lon) : null;
      var msg = 'Navegación iniciada. Destino: ' + _S.destName;
      if (initDist !== null) msg += '. Distancia: ' + _fmtDist(initDist) + '.';
      _tts(msg, { queue: false });
    }

    if (window.showToast) window.showToast('Navegación activa', 'success');

    // analytics (navigator_start — added to eventBus spec v1.6)
    try { if (window.VoyEventBus) VoyEventBus.emit('navigator_start', { dest: !!dest, voice: _S.voice }); } catch (e) {}

    _log('started →', _S.destName);
    return true;
  }

  /**
   * Stop navigation. Clears watch, removes marker + HUD.
   * @param {boolean} [silent]  if true, no toast/tts farewell (e.g. after arrival)
   */
  function stop(silent) {
    if (!_S.active) return;
    _S.active = false;
    if (_S._stopTimer) { clearTimeout(_S._stopTimer); _S._stopTimer = null; }
    _stopWatch();
    _removeUserMarker();
    _removeAccuracyLayer();
    _hideHud();
    if (_S.voice && !silent) _tts('Navegación finalizada.');
    _ttsCancel();
    try { if (window.VoyEventBus) VoyEventBus.emit('navigator_stop', { arrived: _S.arrived }); } catch (e) {}
    _log('stopped');
    if (!silent && window.showToast) window.showToast('Navegación finalizada', 'info');
  }

  /** Toggle camera follow. Returns new state. */
  function toggleFollow() { _setFollow(!_S.follow); return _S.follow; }

  /** One-shot recenter on user position + re-enable follow. */
  function recenter() {
    if (!_S.lastPos) { if (window.showToast) window.showToast('Buscando tu ubicación…', 'info'); return; }
    _setFollow(true);
    if (_map()) { try { _map().flyTo({ center: [_S.lastPos.lon, _S.lastPos.lat], zoom: FOLLOW_ZOOM, duration: 600 }); } catch (e) {} }
  }

  /** Toggle voice (TTS). Returns new state. */
  function toggleVoice() {
    _S.voice = !_S.voice;
    if (_S.hud) {
      var btn = _S.hud.querySelector('.voy-nav-voice');
      btn.classList.toggle('active', _S.voice);
      btn.setAttribute('aria-pressed', _S.voice ? 'true' : 'false');
      btn.querySelector('.ic').innerHTML = _icon(_S.voice ? 'volume' : 'volumeOff', 18);
    }
    if (_S.voice) {
      if (!_ttsAvailable()) {
        if (window.showToast) window.showToast('Voz no soportada en este dispositivo', 'error');
        _S.voice = false;
        if (_S.hud) {
          var b2 = _S.hud.querySelector('.voy-nav-voice');
          b2.classList.remove('active'); b2.setAttribute('aria-pressed', 'false');
          b2.querySelector('.ic').innerHTML = _icon('volumeOff', 18);
        }
        return false;
      }
      _tts('Voz activada.', { queue: false });
    } else {
      _ttsCancel();
    }
    return _S.voice;
  }

  function isActive() { return _S.active; }

  // ---- Export ----
  window.VoyNavigator = {
    start: start,
    stop: stop,
    toggleFollow: toggleFollow,
    recenter: recenter,
    toggleVoice: toggleVoice,
    isActive: isActive,
    _state: _S // debugging only
  };

  _log('module loaded (Phase 1 MVP)');
})();
