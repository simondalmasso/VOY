<script lang="ts">
  import { onMount } from 'svelte';
  import type { FeatureCollection } from 'geojson';
  import type { Coordinates } from '../core/coordinates';
  import { ARGENTINA_CENTER } from '../core/territory';
  import type { RouteResult } from '../features/trip/trip.types';
  import type { MapPadding } from '../app/interaction';

  export let origin: Coordinates | null;
  export let destination: Coordinates | null;
  export let route: RouteResult | null;
  export let cameraPadding: MapPadding = { top: 54, left: 32, right: 32, bottom: 96 };
  export let interactionEnabled = true;

  let shell: HTMLElement;
  let container: HTMLDivElement;
  let map: import('maplibre-gl').Map | null = null;
  let maplibre: typeof import('maplibre-gl') | null = null;
  let mapState: 'loading' | 'ready' | 'fallback' = 'loading';
  let overlayReady = false;
  let readinessTimer: ReturnType<typeof setTimeout> | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let resizeFrame = 0;
  let lastShellWidth = 0;
  let lastShellHeight = 0;
  let lastFitSignature = '';
  let cameraFitCount = 0;
  const sourceId = 'voy-route';
  const pointSourceId = 'voy-points';
  const basemapSourceId = 'voy-basemap';
  const basemapTiles = [
    'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
  ];

  function darkTheme(): boolean {
    if (typeof document === 'undefined') return false;
    const explicit = document.documentElement.dataset.theme;
    if (explicit === 'dark') return true;
    if (explicit === 'light') return false;
    return matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyMapTheme(): void {
    if (!map || !map.isStyleLoaded()) return;
    const dark = darkTheme();
    if (map.getLayer('voy-carto-basemap')) {
      map.setPaintProperty('voy-carto-basemap', 'raster-brightness-min', dark ? 0.12 : 0);
      map.setPaintProperty('voy-carto-basemap', 'raster-brightness-max', dark ? 0.58 : 1);
      map.setPaintProperty('voy-carto-basemap', 'raster-saturation', dark ? -0.72 : 0);
      map.setPaintProperty('voy-carto-basemap', 'raster-contrast', dark ? 0.14 : 0);
    }
    if (map.getLayer('voy-route-line')) map.setPaintProperty('voy-route-line', 'line-color', dark ? '#FF6847' : '#FF5A36');
    if (map.getLayer('voy-points-circle')) {
      map.setPaintProperty('voy-points-circle', 'circle-color', ['match', ['get', 'kind'], 'origin', dark ? '#F4F1E8' : '#0B0B0A', dark ? '#FF6847' : '#FF5A36']);
      map.setPaintProperty('voy-points-circle', 'circle-stroke-color', dark ? '#141412' : '#FCFBF7');
    }
  }

  function syncInteraction(): void {
    if (!map) return;
    if (interactionEnabled) {
      map.dragPan.enable();
      map.scrollZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      map.doubleClickZoom.enable();
      map.touchZoomRotate.enable();
    } else {
      map.dragPan.disable();
      map.scrollZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      map.doubleClickZoom.disable();
      map.touchZoomRotate.disable();
    }
  }

  function failMap(): void {
    if (mapState === 'ready') return;
    mapState = 'fallback';
    if (readinessTimer) clearTimeout(readinessTimer);
  }

  function hasRenderableGeometry(): boolean {
    if (!shell || !container) return false;
    const canvas = container.querySelector('.maplibregl-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return false;
    const shellRect = shell.getBoundingClientRect();
    const hostRect = container.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const hostStyle = getComputedStyle(container);
    const tolerance = 4;
    return hostStyle.position === 'absolute' && shellRect.width > 20 && shellRect.height > 20 && hostRect.width > 20 && hostRect.height > 20 && canvasRect.width > 20 && canvasRect.height > 20
      && Math.abs(shellRect.width - hostRect.width) <= tolerance && Math.abs(shellRect.height - hostRect.height) <= tolerance
      && Math.abs(hostRect.width - canvasRect.width) <= tolerance && Math.abs(hostRect.height - canvasRect.height) <= tolerance;
  }

  function normalizedPadding(): MapPadding {
    if (!shell) return cameraPadding;
    const rect = shell.getBoundingClientRect();
    const verticalBudget = Math.max(80, rect.height - 80);
    const horizontalBudget = Math.max(80, rect.width - 80);
    const verticalTotal = cameraPadding.top + cameraPadding.bottom;
    const horizontalTotal = cameraPadding.left + cameraPadding.right;
    const verticalScale = verticalTotal > verticalBudget ? verticalBudget / verticalTotal : 1;
    const horizontalScale = horizontalTotal > horizontalBudget ? horizontalBudget / horizontalTotal : 1;
    return {
      top: Math.round(cameraPadding.top * verticalScale),
      bottom: Math.round(cameraPadding.bottom * verticalScale),
      left: Math.round(cameraPadding.left * horizontalScale),
      right: Math.round(cameraPadding.right * horizontalScale)
    };
  }

  function fitSignature(points: Coordinates[], padding: MapPadding): string {
    const pointKey = points.map(point => `${point.lat.toFixed(6)},${point.lon.toFixed(6)}`).join('|');
    const routeKey = `${route?.source || 'none'}:${route?.geometry?.length || 0}`;
    return `${pointKey}:${routeKey}:${padding.top},${padding.right},${padding.bottom},${padding.left}`;
  }

  function sync(): void {
    if (!map || !maplibre || !map.isStyleLoaded() || !hasRenderableGeometry()) return;
    const coordinates = route?.source === 'osrm_route' ? route.geometry.map(point => [point.lon, point.lat]) : [];
    const lineData: FeatureCollection = { type: 'FeatureCollection', features: coordinates.length >= 2 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }] : [] };
    const points = [origin, destination].filter((point): point is Coordinates => Boolean(point));
    const pointData: FeatureCollection = { type: 'FeatureCollection', features: points.map((point, index) => ({ type: 'Feature', properties: { kind: index === 0 ? 'origin' : 'destination' }, geometry: { type: 'Point', coordinates: [point.lon, point.lat] } })) };
    const lineSource = map.getSource(sourceId) as import('maplibre-gl').GeoJSONSource | undefined;
    if (lineSource) lineSource.setData(lineData); else {
      map.addSource(sourceId, { type: 'geojson', data: lineData });
      map.addLayer({ id: 'voy-route-line', type: 'line', source: sourceId, paint: { 'line-color': darkTheme() ? '#FF6847' : '#FF5A36', 'line-width': 5, 'line-opacity': .94 } });
    }
    const pointSource = map.getSource(pointSourceId) as import('maplibre-gl').GeoJSONSource | undefined;
    if (pointSource) pointSource.setData(pointData); else {
      map.addSource(pointSourceId, { type: 'geojson', data: pointData });
      map.addLayer({ id: 'voy-points-circle', type: 'circle', source: pointSourceId, paint: { 'circle-radius': 7, 'circle-color': ['match', ['get', 'kind'], 'origin', darkTheme() ? '#F4F1E8' : '#0B0B0A', darkTheme() ? '#FF6847' : '#FF5A36'], 'circle-stroke-color': darkTheme() ? '#141412' : '#FCFBF7', 'circle-stroke-width': 2.5 } });
    }
    applyMapTheme();
    syncInteraction();
    overlayReady = points.length === 2 && (route?.source !== 'osrm_route' || Boolean(map.getLayer('voy-route-line')));
    if (points.length === 2) {
      const padding = normalizedPadding();
      const signature = fitSignature(points, padding);
      if (signature !== lastFitSignature) {
        lastFitSignature = signature;
        const bounds = new maplibre.LngLatBounds();
        for (const point of points) bounds.extend([point.lon, point.lat]);
        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        cameraFitCount += 1;
        map.fitBounds(bounds, { padding, duration: reducedMotion ? 0 : 220, maxZoom: 15 });
      }
    }
  }

  function markReadyIfRendered(): void {
    if (!map || mapState === 'fallback' || !map.isStyleLoaded() || !hasRenderableGeometry()) return;
    if (!map.isSourceLoaded(basemapSourceId) || !map.areTilesLoaded()) return;
    mapState = 'ready';
    if (readinessTimer) clearTimeout(readinessTimer);
    applyMapTheme();
    syncInteraction();
    sync();
  }

  function resizeMapToShell(): void {
    if (!map || !shell) return;
    const rect = shell.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    if (Math.abs(rect.width - lastShellWidth) < .5 && Math.abs(rect.height - lastShellHeight) < .5 && hasRenderableGeometry()) { markReadyIfRendered(); return; }
    lastShellWidth = rect.width;
    lastShellHeight = rect.height;
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => { map?.resize(); requestAnimationFrame(() => { markReadyIfRendered(); if (mapState === 'ready') sync(); }); });
  }

  onMount(() => {
    let disposed = false;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const themeListener = () => { if (!disposed) applyMapTheme(); };
    addEventListener('voy-theme-change', themeListener);
    media.addEventListener('change', themeListener);
    void (async () => {
      try {
        await import('maplibre-gl/dist/maplibre-gl.css');
        const library = await import('maplibre-gl');
        if (disposed) return;
        maplibre = library;
        const dark = darkTheme();
        map = new library.Map({
          container,
          center: [ARGENTINA_CENTER.lon, ARGENTINA_CENTER.lat],
          zoom: 3.25,
          attributionControl: false,
          style: { version: 8, sources: { [basemapSourceId]: { type: 'raster', tiles: basemapTiles, tileSize: 256, attribution: '© OpenStreetMap contributors · © CARTO' } }, layers: [{ id: 'voy-carto-basemap', type: 'raster', source: basemapSourceId, paint: { 'raster-brightness-min': dark ? .12 : 0, 'raster-brightness-max': dark ? .58 : 1, 'raster-saturation': dark ? -.72 : 0, 'raster-contrast': dark ? .14 : 0 } }] }
        });
        syncInteraction();
        resizeObserver = new ResizeObserver(() => { if (!disposed) resizeMapToShell(); });
        resizeObserver.observe(shell);
        readinessTimer = setTimeout(() => { if (!disposed && mapState !== 'ready') failMap(); }, 12_000);
        map.on('load', () => { if (!disposed) { resizeMapToShell(); sync(); applyMapTheme(); markReadyIfRendered(); } });
        map.on('sourcedata', event => { if (!disposed && event.sourceId === basemapSourceId) markReadyIfRendered(); });
        map.on('idle', () => { if (!disposed) markReadyIfRendered(); });
        map.on('error', () => { if (!disposed && mapState !== 'ready') failMap(); });
        requestAnimationFrame(() => { if (!disposed) resizeMapToShell(); });
      } catch { if (!disposed) failMap(); }
    })();
    return () => {
      disposed = true;
      removeEventListener('voy-theme-change', themeListener);
      media.removeEventListener('change', themeListener);
      if (readinessTimer) clearTimeout(readinessTimer);
      resizeObserver?.disconnect();
      resizeObserver = null;
      cancelAnimationFrame(resizeFrame);
      map?.remove();
      map = null;
    };
  });

  $: {
    const dependencies = [origin, destination, route, mapState, cameraPadding.top, cameraPadding.right, cameraPadding.bottom, cameraPadding.left];
    if (dependencies[3] === 'ready') queueMicrotask(sync);
  }
  $: {
    const enabled = interactionEnabled;
    if (map) queueMicrotask(() => { if (enabled === interactionEnabled) syncInteraction(); });
  }
</script>

<section
  class="map-shell"
  bind:this={shell}
  aria-label="Mapa del viaje"
  data-testid="map-shell"
  data-map-state={mapState}
  data-overlay-ready={overlayReady ? 'true' : 'false'}
  data-map-interaction={interactionEnabled ? 'enabled' : 'disabled'}
  data-camera-fit-count={cameraFitCount}
>
  <div class="voy-map-host" data-testid="map-host" bind:this={container}></div>
  {#if mapState === 'loading'}<div class="map-placeholder">Cargando contexto del viaje…</div>{/if}
  {#if mapState === 'fallback'}<div class="map-placeholder" data-testid="map-fallback">El mapa base no está disponible. La comparación verificable sigue funcionando.</div>{/if}
  {#if mapState === 'ready'}<span class="map-credit">© OpenStreetMap · © CARTO</span>{/if}
  {#if route?.source === 'straight_line_estimate'}<p class="map-truth" data-testid="map-truth">Referencia en línea recta: no representa calles, ciclovías ni un recorrido.</p>{/if}
</section>
