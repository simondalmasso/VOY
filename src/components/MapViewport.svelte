<script lang="ts">
  import { onMount } from 'svelte';
  import type { FeatureCollection } from 'geojson';
  import type { Coordinates } from '../core/coordinates';
  import type { RouteResult } from '../features/trip/trip.types';
  export let origin: Coordinates | null;
  export let destination: Coordinates | null;
  export let route: RouteResult | null;
  let container: HTMLDivElement;
  let map: import('maplibre-gl').Map | null = null;
  let maplibre: typeof import('maplibre-gl') | null = null;
  let mapState: 'loading' | 'ready' | 'fallback' = 'loading';
  let overlayReady = false;
  let readinessTimer: ReturnType<typeof setTimeout> | null = null;
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
  function sync(): void {
    if (!map || !maplibre || !map.isStyleLoaded()) return;
    const coordinates = route?.source === 'osrm_route' ? route.geometry.map(point => [point.lon, point.lat]) : [];
    const lineData: FeatureCollection = { type: 'FeatureCollection', features: coordinates.length >= 2 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }] : [] };
    const points = [origin, destination].filter((point): point is Coordinates => Boolean(point));
    const pointData: FeatureCollection = { type: 'FeatureCollection', features: points.map((point, index) => ({ type: 'Feature', properties: { kind: index === 0 ? 'origin' : 'destination' }, geometry: { type: 'Point', coordinates: [point.lon, point.lat] } })) };
    const lineSource = map.getSource(sourceId) as import('maplibre-gl').GeoJSONSource | undefined;
    if (lineSource) lineSource.setData(lineData); else {
      map.addSource(sourceId, { type: 'geojson', data: lineData });
      map.addLayer({ id: 'voy-route-line', type: 'line', source: sourceId, paint: { 'line-color': '#111827', 'line-width': 4, 'line-opacity': 0.85 } });
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
    if (!map || mapState === 'fallback' || !map.isStyleLoaded()) return;
    if (!map.isSourceLoaded(basemapSourceId) || !map.areTilesLoaded()) return;
    mapState = 'ready';
    if (readinessTimer) clearTimeout(readinessTimer);
    sync();
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
        readinessTimer = setTimeout(() => { if (!disposed && mapState !== 'ready') failMap(); }, 12_000);
        map.on('load', () => { if (!disposed) { sync(); markReadyIfRendered(); } });
        map.on('sourcedata', event => { if (!disposed && event.sourceId === basemapSourceId) markReadyIfRendered(); });
        map.on('idle', () => { if (!disposed) markReadyIfRendered(); });
        map.on('error', () => { if (!disposed && mapState !== 'ready') failMap(); });
      } catch { if (!disposed) failMap(); }
    })();
    return () => {
      disposed = true;
      if (readinessTimer) clearTimeout(readinessTimer);
      map?.remove();
      map = null;
    };
  });
  $: {
    const dependencies = [origin, destination, route, mapState];
    if (dependencies[3] === 'ready') queueMicrotask(sync);
  }
</script>
<section class="map-shell" aria-label="Mapa del viaje" data-testid="map-shell" data-map-state={mapState} data-overlay-ready={overlayReady ? 'true' : 'false'}>
  <div class="map" bind:this={container}></div>
  {#if mapState === 'loading'}<div class="map-placeholder">Cargando mapa…</div>{/if}
  {#if mapState === 'fallback'}<div class="map-placeholder" data-testid="map-fallback">El mapa base no está disponible. La comparación verificable sigue funcionando.</div>{/if}
  {#if mapState === 'ready'}<span class="map-credit">© OpenStreetMap · © CARTO</span>{/if}
  {#if route?.source === 'straight_line_estimate'}<p class="map-truth" data-testid="map-truth">Referencia en línea recta: no representa calles, ciclovías ni un recorrido.</p>{/if}
</section>
