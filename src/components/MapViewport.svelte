<script lang="ts">
  import { onMount } from 'svelte';
  import type { FeatureCollection } from 'geojson';
  import type { Coordinates } from '../core/coordinates';
  import type { RouteResult } from '../features/trip/trip.types';
  export let origin: Coordinates | null;
  export let destination: Coordinates | null;
  export let route: RouteResult | null;
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
  const sourceId = 'voy-route';
  const pointSourceId = 'voy-points';
  const basemapSourceId = 'voy-basemap';
  const basemapTiles = [
    'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
  ];

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
    return hostStyle.position === 'absolute'
      && shellRect.width > 20
      && shellRect.height > 20
      && hostRect.width > 20
      && hostRect.height > 20
      && canvasRect.width > 20
      && canvasRect.height > 20
      && Math.abs(shellRect.width - hostRect.width) <= tolerance
      && Math.abs(shellRect.height - hostRect.height) <= tolerance
      && Math.abs(hostRect.width - canvasRect.width) <= tolerance
      && Math.abs(hostRect.height - canvasRect.height) <= tolerance;
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
      map.addLayer({ id: 'voy-route-line', type: 'line', source: sourceId, paint: { 'line-color': '#6d28d9', 'line-width': 5, 'line-opacity': 1 } });
    }
    const pointSource = map.getSource(pointSourceId) as import('maplibre-gl').GeoJSONSource | undefined;
    if (pointSource) pointSource.setData(pointData); else {
      map.addSource(pointSourceId, { type: 'geojson', data: pointData });
      map.addLayer({ id: 'voy-points-circle', type: 'circle', source: pointSourceId, paint: { 'circle-radius': 7, 'circle-color': ['match', ['get', 'kind'], 'origin', '#1565c0', '#c62828'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });
    }
    overlayReady = points.length === 2 && (route?.source !== 'osrm_route' || Boolean(map.getLayer('voy-route-line')));
    if (points.length === 2) {
      const bounds = new maplibre.LngLatBounds();
      for (const point of points) bounds.extend([point.lon, point.lat]);
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      map.fitBounds(bounds, { padding: { top: 54, left: 32, right: 32, bottom: 96 }, duration: reducedMotion ? 0 : 250, maxZoom: 15 });
    }
  }

  function markReadyIfRendered(): void {
    if (!map || mapState === 'fallback' || !map.isStyleLoaded() || !hasRenderableGeometry()) return;
    if (!map.isSourceLoaded(basemapSourceId) || !map.areTilesLoaded()) return;
    mapState = 'ready';
    if (readinessTimer) clearTimeout(readinessTimer);
    sync();
  }

  function resizeMapToShell(): void {
    if (!map || !shell) return;
    const rect = shell.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    if (Math.abs(rect.width - lastShellWidth) < 0.5 && Math.abs(rect.height - lastShellHeight) < 0.5 && hasRenderableGeometry()) {
      markReadyIfRendered();
      return;
    }
    lastShellWidth = rect.width;
    lastShellHeight = rect.height;
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      map?.resize();
      requestAnimationFrame(() => {
        markReadyIfRendered();
        if (mapState === 'ready') sync();
      });
    });
  }

  onMount(() => {
    let disposed = false;
    void (async () => {
      try {
        await import('maplibre-gl/dist/maplibre-gl.css');
        const library = await import('maplibre-gl');
        if (disposed) return;
        maplibre = library;
        map = new library.Map({
          container,
          center: [-60.7087, -31.6256],
          zoom: 12.4,
          attributionControl: false,
          style: {
            version: 8,
            sources: { [basemapSourceId]: { type: 'raster', tiles: basemapTiles, tileSize: 256, attribution: '© OpenStreetMap contributors · © CARTO' } },
            layers: [{ id: 'voy-carto-basemap', type: 'raster', source: basemapSourceId }]
          }
        });
        resizeObserver = new ResizeObserver(() => { if (!disposed) resizeMapToShell(); });
        resizeObserver.observe(shell);
        readinessTimer = setTimeout(() => { if (!disposed && mapState !== 'ready') failMap(); }, 12_000);
        map.on('load', () => { if (!disposed) { resizeMapToShell(); sync(); markReadyIfRendered(); } });
        map.on('sourcedata', event => { if (!disposed && event.sourceId === basemapSourceId) markReadyIfRendered(); });
        map.on('idle', () => { if (!disposed) markReadyIfRendered(); });
        map.on('error', () => { if (!disposed && mapState !== 'ready') failMap(); });
        requestAnimationFrame(() => { if (!disposed) resizeMapToShell(); });
      } catch { if (!disposed) failMap(); }
    })();
    return () => {
      disposed = true;
      if (readinessTimer) clearTimeout(readinessTimer);
      resizeObserver?.disconnect();
      resizeObserver = null;
      cancelAnimationFrame(resizeFrame);
      map?.remove();
      map = null;
    };
  });
  $: {
    const dependencies = [origin, destination, route, mapState];
    if (dependencies[3] === 'ready') queueMicrotask(sync);
  }
</script>
<section class="map-shell" bind:this={shell} aria-label="Mapa del viaje" data-testid="map-shell" data-map-state={mapState} data-overlay-ready={overlayReady ? 'true' : 'false'}>
  <div class="voy-map-host" data-testid="map-host" bind:this={container}></div>
  {#if mapState === 'loading'}<div class="map-placeholder">Cargando mapa…</div>{/if}
  {#if mapState === 'fallback'}<div class="map-placeholder" data-testid="map-fallback">El mapa base no está disponible. La comparación verificable sigue funcionando.</div>{/if}
  {#if mapState === 'ready'}<span class="map-credit">© OpenStreetMap · © CARTO</span>{/if}
  {#if route?.source === 'straight_line_estimate'}<p class="map-truth" data-testid="map-truth">Referencia en línea recta: no representa calles, ciclovías ni un recorrido.</p>{/if}
</section>
