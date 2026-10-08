// ORDER-075 GLM53 — map substrate controller.
// Strategy: raster-first instant paint, MapLibre+OpenFreeMap as async vector
// upgrade, raster as mandatory fallback. Facts/selection/truth live in DOM
// outside any canvas, so a vector failure never loses tracker state.
// This module never calls the VOY Worker: external map hosts only.
// Vector style/tiles/glyphs host: https://tiles.openfreemap.org (public, keyless).
// Attribution is preserved on both substrates (© OpenStreetMap contributors;)
// OpenFreeMap style "liberty" is keyless and public.

const RASTER_RECENTER_METERS = 350;
const VECTOR_LOAD_TIMEOUT_MS = 8000;

function worldPixel(lon, lat, z) {
  const scale = 256 * Math.pow(2, z);
  const x = (Number(lon) + 180) / 360 * scale;
  const r = Number(lat) * Math.PI / 180;
  const y = (1 - Math.asinh(Math.tan(r)) / Math.PI) / 2 * scale;
  return { x, y };
}
function distanceMeters(a, b) {
  const rad = v => Number(v) * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function createMapSubstrate({
  tilesEl, canvasEl, fallbackEl, attributionEl, config, buildId = '__BUILD_ID__',
  onUserInteraction = () => {}, onViewportChange = () => {}, onSelectMarker = () => {}, onVectorReady = () => {}, onVectorFailed = () => {},
  reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
} = {}) {
  if (!tilesEl || !canvasEl || !config) throw new Error('substrate_args_required');
  const provider = config.MAP_PROVIDER || {};
  const vectorConf = config.MAP_VECTOR || {};
  const zoom = Number(provider.zoom) || 13;

  let substrate = 'raster'; // 'raster' | 'vector' | 'vector_failed'
  let mode = '2d';
  let center = null;
  let rasterCenter = null;
  let map = null;
  let MarkerClass = null; // maplibre.Marker, bound at import
  let vectorPromise = null;
  let vectorTimer = 0;

  const markers = new Map();      // entity id -> {element, mlMarker, lat, lon}
  const stationMarkers = new Map(); // station name -> {element, mlMarker, lat, lon}
  const trailDots = new Map();    // index -> {element, mlMarker, lat, lon}
  let routeLayer = null;
  let networkLayer = null;
  let networkRef = null;
  let networkMode = null;
  let trailLine = null;
  const emitUserInteraction = source => onUserInteraction(source);
  const inVector = () => substrate === 'vector' && Boolean(map);

  // ---------- container-level pointer gesture fallback ----------
  // MapLibre v6 fires handler events (dragstart/zoomstart/...) only AFTER the
  // gesture activates. A follow recenter (easeTo) landing between pointerdown
  // and activation can interrupt the gesture before it ever fires, letting
  // follow fight the user. This fallback emits user interaction as soon as a
  // real pointer drag begins (>=8px while pressed), independent of handler
  // activation timing. Marker clicks never reach the threshold.
  let pointerGesture = null;
  const POINTER_DRAG_THRESHOLD_PX = 8;
  canvasEl.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.button !== 2) return;
    pointerGesture = { x: e.clientX, y: e.clientY, moved: false };
  });
  canvasEl.addEventListener('pointermove', e => {
    if (!pointerGesture || pointerGesture.moved) return;
    const dx = e.clientX - pointerGesture.x, dy = e.clientY - pointerGesture.y;
    if (dx * dx + dy * dy >= POINTER_DRAG_THRESHOLD_PX * POINTER_DRAG_THRESHOLD_PX) {
      pointerGesture.moved = true;
      emitUserInteraction('pointer_drag');
    }
  });
  const endPointerGesture = () => { pointerGesture = null; };
  canvasEl.addEventListener('pointerup', endPointerGesture);
  canvasEl.addEventListener('pointercancel', endPointerGesture);
  canvasEl.addEventListener('lostpointercapture', endPointerGesture);

  // ---------- raster: instant first paint + mandatory fallback ----------
  function renderRaster(coords, { label = 'Mapa', showPin = false } = {}) {
    center = { lat: Number(coords.lat), lon: Number(coords.lon) };
    rasterCenter = { ...center };
    tilesEl.replaceChildren();
    trailLine = null;
    routeLayer = null;
    networkLayer = null; networkRef = null; networkMode = null;
    const z = zoom, c = worldPixel(center.lon, center.lat, zoom);
    const cx = Math.floor(c.x / 256), cy = Math.floor(c.y / 256);
    const radius = Number(provider.tile_radius) || 1;
    let loaded = 0, failed = 0, total = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        total++;
        const x = cx + dx, y = cy + dy;
        const img = document.createElement('img');
        img.className = 'map-tile'; img.alt = ''; img.decoding = 'async'; img.loading = 'eager';
        img.referrerPolicy = 'strict-origin-when-cross-origin';
        img.style.left = `calc(50% + ${x * 256 - c.x}px)`;
        img.style.top = `calc(50% + ${y * 256 - c.y}px)`;
        img.src = String(provider.tile_template || '').replace('{z}', z).replace('{x}', x).replace('{y}', y);
        img.addEventListener('load', () => { loaded++; });
        img.addEventListener('error', () => {
          failed++;
          if (failed === total && loaded === 0) { fallbackEl.hidden = false; if (attributionEl) attributionEl.hidden = true; }
        });
        tilesEl.appendChild(img);
      }
    }
    if (label) tilesEl.parentElement?.setAttribute('aria-label', label);
    if (showPin) {
      const pin = document.createElement('div');
      pin.className = 'selected-pin';
      pin.setAttribute('aria-hidden', 'true');
      tilesEl.appendChild(pin);
    }
    resyncOverlayElements();
    updateAttribution();
  }

  function updateAttribution() {
    if (attributionEl) attributionEl.hidden = substrate === 'vector' || mode === '3d';
  }

  function needsRasterRecenter(coords) {
    if (!rasterCenter) return true;
    return distanceMeters(rasterCenter, coords) > RASTER_RECENTER_METERS;
  }

  // ---------- vector upgrade: async, non-blocking, fail-closed ----------
  function injectVectorStylesheet() {
    if (document.querySelector('link[data-voy-maplibre]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/vendor/maplibre-gl.css?v=__BUILD_ID__';
    link.dataset.voyMaplibre = 'true';
    document.head.appendChild(link);
  }

  function vectorFailed(reason) {
    substrate = 'vector_failed';
    try { map?.remove?.(); } catch {}
    map = null; MarkerClass = null; vectorPromise = null;
    canvasEl.style.visibility = '';
    canvasEl.hidden = true;
    tilesEl.classList.remove('is-underlay');
    tilesEl.hidden = mode === '3d';
    // raster keeps rendering: selection/facts/truth are DOM-owned and untouched
    onVectorFailed(reason);
    resyncOverlayElements();
    updateAttribution();
  }

  function upgradeToVector(coords) {
    if (vectorPromise) return vectorPromise;
    if (substrate === 'vector_failed' || substrate === 'vector') return Promise.resolve(substrate === 'vector');
    if (!vectorConf || vectorConf.enabled === false) return Promise.resolve(false);
    if (String(vectorConf.maplibre_version) !== '6.11.2') { vectorFailed('version_not_pinned'); return Promise.resolve(false); }
    try {
      const probe = document.createElement('canvas');
      if (!probe.getContext('webgl2')) { vectorFailed('unsupported_webgl2'); return Promise.resolve(false); }
    } catch { vectorFailed('unsupported_webgl2'); return Promise.resolve(false); }

    vectorPromise = (async () => {
      injectVectorStylesheet();
      let maplibregl;
      try {
        maplibregl = await import('/vendor/maplibre-gl.mjs?v=__BUILD_ID__');
      } catch {
        vectorFailed('vector_module_unavailable');
        return false;
      }
      MarkerClass = maplibregl.Marker;
      const styleUrl = String(vectorConf.style_url || '');
      if (!/^https:\/\/tiles\.openfreemap\.org\//.test(styleUrl) || !styleUrl.includes('/styles/liberty')) {
        vectorFailed('style_host_not_allowed');
        return false;
      }
      const startCenter = coords && Number.isFinite(Number(coords.lon)) ? [Number(coords.lon), Number(coords.lat)] : [-60.7050, -31.6520];
      // MapLibre needs a laid-out container: keep it invisible but dimensioned
      // (visibility keeps layout; [hidden] display:none would give width 0).
      canvasEl.hidden = false;
      canvasEl.style.visibility = 'hidden';
      return await new Promise(resolve => {
        let settled = false;
        const finish = ok => {
          if (settled) return;
          settled = true;
          clearTimeout(vectorTimer);
          if (!ok) { canvasEl.style.visibility = ''; vectorFailed('vector_init_failed'); resolve(false); return; }
          substrate = 'vector';
          canvasEl.style.visibility = '';
          applyModeVisibility();
          tilesEl.classList.add('is-underlay');
          onVectorReady('openfreemap_maplibre');
          resyncOverlayElements();
          updateAttribution();
          resolve(true);
        };
        try {
          map = new maplibregl.Map({
            container: canvasEl,
            style: styleUrl, // public OpenFreeMap style: keyless, attribution preserved
            center: startCenter,
            zoom: zoom + 0.5,
            attributionControl: { compact: true },
            interactive: true
          });
          for (const gesture of ['dragstart', 'zoomstart', 'rotatestart', 'pitchstart']) {
            map.on(gesture, () => emitUserInteraction('map_' + gesture));
          }
          map.on('moveend', () => {
            const next = map?.getCenter?.();
            if (!next || !Number.isFinite(Number(next.lat)) || !Number.isFinite(Number(next.lng))) return;
            center = { lat: Number(next.lat), lon: Number(next.lng) };
            onViewportChange({ ...center });
          });
          map.on('error', () => { /* post-load tile hiccups tolerated; init failure handled by timeout */ });
          vectorTimer = setTimeout(() => finish(false), VECTOR_LOAD_TIMEOUT_MS);
          map.on('load', () => finish(true));
        } catch {
          finish(false);
        }
      });
    })();
    return vectorPromise;
  }

  // ---------- overlays: dual substrate rendering ----------
  function applyModeVisibility() {
    tilesEl.hidden = mode === '3d' || substrate === 'vector';
    canvasEl.hidden = !(mode === '2d' && substrate === 'vector');
    updateAttribution();
  }

  function ensureMarker(id, kind, label) {
    let entry = markers.get(id);
    if (!entry) {
      const element = document.createElement('button');
      element.type = 'button';
      element.dataset.entityId = id;
      element.addEventListener('click', () => onSelectMarker(id));
      entry = { element, mlMarker: null, lat: null, lon: null };
      markers.set(id, entry);
    }
    entry.element.className = `tracker-marker tracker-marker-${kind || 'unknown'}`;
    if (label) entry.element.setAttribute('aria-label', label);
    return entry;
  }

  function mountElement(entry) {
    if (inVector()) {
      entry.element.classList.add('is-vector');
      if (!entry.mlMarker && MarkerClass && entry.lat != null) {
        // v6 requires the lngLat before addTo (Marker._update reads it)
        entry.mlMarker = new MarkerClass({ element: entry.element, anchor: 'center' }).setLngLat([entry.lon, entry.lat]).addTo(map);
      }
    } else {
      entry.element.classList.remove('is-vector');
      if (entry.mlMarker) { try { entry.mlMarker.remove(); } catch {} entry.mlMarker = null; }
      if (!entry.element.isConnected) tilesEl.appendChild(entry.element);
    }
  }

  function place(entry, lat, lon) {
    entry.lat = lat; entry.lon = lon;
    mountElement(entry);
    if (entry.mlMarker) {
      entry.mlMarker.setLngLat([lon, lat]);
    } else if (center) {
      const c = worldPixel(center.lon, center.lat, zoom);
      const p = worldPixel(lon, lat, zoom);
      entry.element.style.left = `calc(50% + ${p.x - c.x}px)`;
      entry.element.style.top = `calc(50% + ${p.y - c.y}px)`;
    }
  }

  function sync({ markers: markerModels = [], stations = [], networkGeometries = [], routeGeometry = null, trail = [], scrubIndex = -1 } = {}) {
    if (mode !== '2d') return;
    const seen = new Set();
    for (const model of markerModels) {
      if (!model || !Number.isFinite(Number(model.lat)) || !Number.isFinite(Number(model.lon))) continue;
      if (model.hidden) continue;
      seen.add(model.id);
      const entry = ensureMarker(model.id, model.kind, model.label);
      entry.element.classList.toggle('is-selected', model.selected === true);
      place(entry, Number(model.lat), Number(model.lon));
    }
    for (const [id, entry] of markers) {
      if (!seen.has(id)) {
        if (entry.mlMarker) { try { entry.mlMarker.remove(); } catch {} }
        entry.element.remove();
        markers.delete(id);
      }
    }

    const seenStations = new Set();
    for (const station of stations) {
      if (!station || !Number.isFinite(Number(station.lat)) || !Number.isFinite(Number(station.lon))) continue;
      seenStations.add(station.name);
      let entry = stationMarkers.get(station.name);
      if (!entry) {
        const element = document.createElement('div');
        element.className = 'train-station-marker';
        element.dataset.station = station.name;
        element.title = station.name;
        const dot = document.createElement('span');
        dot.className = 'station-dot';
        dot.setAttribute('aria-hidden', 'true');
        element.appendChild(dot);
        const label = document.createElement('span');
        label.className = 'station-label';
        label.textContent = station.name;
        element.appendChild(label);
        entry = { element, mlMarker: null, lat: null, lon: null };
        stationMarkers.set(station.name, entry);
      }
      place(entry, Number(station.lat), Number(station.lon));
    }
    for (const [name, entry] of stationMarkers) {
      if (!seenStations.has(name)) {
        if (entry.mlMarker) { try { entry.mlMarker.remove(); } catch {} }
        entry.element.remove();
        stationMarkers.delete(name);
      }
    }

    syncBusNetwork(networkGeometries);
    syncTrail(trail, scrubIndex);
    syncRoute(routeGeometry);
  }

  function syncTrail(trail, scrubIndex) {
    for (const [index, entry] of [...trailDots]) {
      if (index >= trail.length) {
        if (entry.mlMarker) { try { entry.mlMarker.remove(); } catch {} }
        entry.element.remove();
        trailDots.delete(index);
      }
    }
    trail.forEach((point, index) => {
      let entry = trailDots.get(index);
      if (!entry) {
        const element = document.createElement('div');
        element.className = 'trail-dot';
        element.setAttribute('aria-hidden', 'true');
        entry = { element, mlMarker: null, lat: null, lon: null };
        trailDots.set(index, entry);
      }
      if (!entry.element.isConnected && !entry.mlMarker) tilesEl.appendChild(entry.element);
      entry.element.style.setProperty('--dot-age', String(point.ageRatio ?? 0));
      entry.element.classList.toggle('is-scrub', index === scrubIndex);
      place(entry, Number(point.lat), Number(point.lon));
    });
    if (!inVector()) {
      if (trailLine) { trailLine.remove(); trailLine = null; }
      if (trail.length >= 2) {
        const svg = rasterLine(trail.map(p => [p.lon, p.lat]), 'trail-connector');
        if (svg) { trailLine = svg; tilesEl.appendChild(svg); }
      }
    } else {
      updateVectorLine('voy-trail-source', 'voy-trail-layer', trail.map(p => [p.lon, p.lat]), '#8fd3ff', 3, 0.55);
    }
  }

  function rasterMultiLine(geometries, cssClass, strokeWidth=2) {
    if (!center || !Array.isArray(geometries) || geometries.length === 0) return null;
    const width = Math.max(1, tilesEl.clientWidth || 320), height = Math.max(1, tilesEl.clientHeight || 320);
    const c = worldPixel(center.lon, center.lat, zoom);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add(cssClass, 'route-overlay');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    for (const coordinates of geometries) {
      if (!Array.isArray(coordinates) || coordinates.length < 2) continue;
      const points = coordinates.map(pair => {
        const p = worldPixel(pair[0], pair[1], zoom);
        return `${(width / 2 + p.x - c.x).toFixed(1)},${(height / 2 + p.y - c.y).toFixed(1)}`;
      }).join(' ');
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      line.setAttribute('points', points); line.setAttribute('fill', 'none'); line.setAttribute('stroke', 'currentColor');
      line.setAttribute('stroke-width', String(strokeWidth)); line.setAttribute('stroke-linecap', 'round'); line.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(line);
    }
    return svg.childNodes.length ? svg : null;
  }

  function updateVectorNetwork(geometries) {
    if (!inVector()) return;
    const lines=(Array.isArray(geometries)?geometries:[]).filter(line=>Array.isArray(line)&&line.length>=2);
    const data={type:'FeatureCollection',features:lines.map((coordinates,index)=>({type:'Feature',properties:{index},geometry:{type:'LineString',coordinates}}))};
    if (!map.getSource('voy-bus-network-source')) {
      map.addSource('voy-bus-network-source',{type:'geojson',data});
      map.addLayer({id:'voy-bus-network-layer',type:'line',source:'voy-bus-network-source',paint:{'line-color':'#ffd42a','line-width':2.4,'line-opacity':0.72}});
    } else {
      map.getSource('voy-bus-network-source').setData(data);
    }
  }

  function syncBusNetwork(geometries=[]) {
    const nextMode=inVector()?'vector':'raster';
    if (networkRef===geometries && networkMode===nextMode && (nextMode==='vector'?Boolean(map.getSource('voy-bus-network-source')):Boolean(networkLayer))) return;
    networkRef=geometries;networkMode=nextMode;
    if (!inVector()) {
      if (networkLayer) { networkLayer.remove(); networkLayer=null; }
      const svg=rasterMultiLine(geometries,'transit-network-overlay',3);
      if (svg) { networkLayer=svg; tilesEl.appendChild(svg); }
    } else {
      updateVectorNetwork(geometries);
    }
  }

  function rasterLine(coordinates, cssClass) {
    if (!center || !Array.isArray(coordinates) || coordinates.length < 2) return null;
    const width = Math.max(1, tilesEl.clientWidth || 320), height = Math.max(1, tilesEl.clientHeight || 320);
    const c = worldPixel(center.lon, center.lat, zoom);
    const points = coordinates.map(pair => {
      const p = worldPixel(pair[0], pair[1], zoom);
      return `${(width / 2 + p.x - c.x).toFixed(1)},${(height / 2 + p.y - c.y).toFixed(1)}`;
    }).join(' ');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add(cssClass, 'route-overlay');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', points);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', '6');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(line);
    return svg;
  }

  function updateVectorLine(sourceId, layerId, coordinates, color, width, opacity) {
    if (!inVector()) return;
    const data = { type: 'Feature', geometry: coordinates.length >= 2 ? { type: 'LineString', coordinates } : null };
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: 'geojson', data });
      map.addLayer({ id: layerId, type: 'line', source: sourceId, paint: { 'line-color': color, 'line-width': width, 'line-opacity': opacity } });
    } else {
      (map.getSource(sourceId)).setData(data);
    }
  }

  function syncRoute(geometry) {
    if (!inVector()) {
      if (routeLayer) { routeLayer.remove(); routeLayer = null; }
      if (geometry && geometry.length >= 2) {
        const svg = rasterLine(geometry, 'route-overlay');
        if (svg) { routeLayer = svg; tilesEl.appendChild(svg); }
      }
    } else {
      updateVectorLine('voy-route-source', 'voy-route-layer', geometry || [], '#ffd42a', 5, 0.9);
    }
  }

  function resyncOverlayElements() {
    // re-place every overlay after raster re-render or raster->vector swap
    for (const entry of markers.values()) if (entry.lat != null) place(entry, entry.lat, entry.lon);
    for (const entry of stationMarkers.values()) if (entry.lat != null) place(entry, entry.lat, entry.lon);
    for (const entry of trailDots.values()) if (entry.lat != null) place(entry, entry.lat, entry.lon);
  }

  // ---------- follow ----------
  function focusTo(coords) {
    if (!coords || !Number.isFinite(Number(coords.lat)) || !Number.isFinite(Number(coords.lon))) return;
    const target = { lat: Number(coords.lat), lon: Number(coords.lon) };
    center = { ...target };
    if (inVector()) {
      if (reducedMotion()) map.jumpTo({ center: [target.lon, target.lat] });
      else map.easeTo({ center: [target.lon, target.lat], duration: 300 });
      return;
    }
    if (mode === '2d') {
      if (needsRasterRecenter(target)) renderRaster(target, { showPin: false });
      else resyncOverlayElements();
    }
  }

  function setMode(nextMode) {
    mode = nextMode === '3d' ? '3d' : '2d';
    applyModeVisibility();
    if (mode === '2d') resyncOverlayElements();
  }

  function setCenter(coords, { label = 'Mapa', showPin = false } = {}) {
    center = { lat: Number(coords.lat), lon: Number(coords.lon) };
    if (inVector()) {
      map.jumpTo({ center: [center.lon, center.lat] });
    } else if (mode === '2d') {
      renderRaster(center, { label, showPin });
    }
  }

  function getCenter() { return center ? { ...center } : null; }
  function state() { return { substrate, mode, center: getCenter(), markerCount: markers.size }; }

  return {
    renderRaster, upgradeToVector, sync, focusTo, setMode, setCenter, getCenter, state,
    get maplibreReady() { return inVector(); },
    get center() { return getCenter(); },
    dispose() {
      clearTimeout(vectorTimer);
      try { map?.remove?.(); } catch {}
      map = null; MarkerClass = null;
      markers.clear(); stationMarkers.clear(); trailDots.clear();
      routeLayer?.remove?.(); networkLayer?.remove?.(); trailLine?.remove?.();
    }
  };
}
