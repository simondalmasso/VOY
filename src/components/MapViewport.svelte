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

  function sync(): void {
    if (!map || !maplibre || !map.isStyleLoaded()) return;
    const coordinates = route?.geometry.map(point => [point.lon, point.lat]) || [];
    const data: FeatureCollection = { type: 'FeatureCollection', features: coordinates.length >= 2 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }] : [] };
    const source = map.getSource(sourceId) as import('maplibre-gl').GeoJSONSource | undefined;
    if (source) source.setData(data); else {
      map.addSource(sourceId, { type: 'geojson', data });
      map.addLayer({ id: 'voy-route-line', type: 'line', source: sourceId, paint: { 'line-color': '#111827', 'line-width': 4, 'line-opacity': 0.85 } });
    }
    const points = [origin, destination].filter((point): point is Coordinates => Boolean(point));
    if (points.length === 2) {
      const bounds = new maplibre.LngLatBounds();
      for (const point of points) bounds.extend([point.lon, point.lat]);
      map.fitBounds(bounds, { padding: { top: 70, left: 40, right: 40, bottom: 160 }, duration: 250, maxZoom: 15 });
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
        map.on('load', () => { ready = true; sync(); });
        map.on('error', () => { failed = true; });
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
</section>
