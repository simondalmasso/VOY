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
  let ready = false;
  let failed = false;
  const sourceId = 'voy-route';
  const pointSourceId = 'voy-points';

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
    if (points.length === 2) {
      const bounds = new maplibre.LngLatBounds();
      for (const point of points) bounds.extend([point.lon, point.lat]);
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      map.fitBounds(bounds, { padding: { top: 70, left: 40, right: 40, bottom: 160 }, duration: reducedMotion ? 0 : 250, maxZoom: 15 });
    }
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
          container, center: [-60.7087, -31.6256], zoom: 12.4, attributionControl: false,
          style: { version: 8, sources: { carto: { type: 'raster', tiles: ['https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap © CARTO' } }, layers: [{ id: 'carto', type: 'raster', source: 'carto' }] }
        });
        map.on('load', () => { ready = true; failed = false; sync(); });
        map.on('error', () => { /* tile/network errors do not disable deterministic comparison */ });
      } catch { if (!disposed) failed = true; }
    })();
    return () => { disposed = true; map?.remove(); map = null; };
  });
  $: {
    const dependencies = [origin, destination, route, ready];
    if (dependencies[3]) queueMicrotask(sync);
  }
</script>
<section class="map-shell" aria-label="Mapa del viaje" data-testid="map-shell">
  <div class="map" bind:this={container}></div>
  {#if !ready && !failed}<div class="map-placeholder">Cargando mapa…</div>{/if}
  {#if failed}<div class="map-placeholder">El mapa no está disponible. La comparación sigue funcionando.</div>{/if}
  {#if route?.source === 'straight_line_estimate'}<p class="map-truth" data-testid="map-truth">Referencia en línea recta: no representa calles, ciclovías ni un recorrido.</p>{/if}
</section>
