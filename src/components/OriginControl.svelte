<script lang="ts">
  import { isInsideSantaFe, type Coordinates } from '../core/coordinates';
  export let label: string;
  export let onOrigin: (coordinates: Coordinates, label: string) => void;
  let manual = '';
  let status = '';
  let resolving = false;

  function useLocation(): void {
    status = 'Solicitando ubicación…';
    if (!navigator.geolocation) { status = 'Este navegador no ofrece GPS. Ingresá un origen manual.'; return; }
    navigator.geolocation.getCurrentPosition(
      position => {
        const coordinates = { lat: position.coords.latitude, lon: position.coords.longitude };
        if (!isInsideSantaFe(coordinates)) { status = 'La ubicación está fuera de la cobertura actual de Santa Fe.'; return; }
        onOrigin(coordinates, `Ubicación actual · ±${Math.round(position.coords.accuracy)} m`); status = '';
      },
      () => { status = 'No pudimos usar el GPS. Ingresá un origen manual.'; },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  }
  async function useManual(): Promise<void> {
    const query = manual.trim();
    if (query.length < 3 || resolving) { status = 'Escribí una dirección o lugar.'; return; }
    resolving = true; status = 'Resolviendo origen…';
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } });
      const payload = await response.json() as { results?: Array<{ lat: number; lon: number; name?: string; display_name?: string }> };
      const first = payload.results?.[0];
      const coordinates = first ? { lat: Number(first.lat), lon: Number(first.lon) } : null;
      if (!response.ok || !first || !coordinates || !isInsideSantaFe(coordinates)) throw new Error('not_found');
      onOrigin(coordinates, first.name || first.display_name || query); status = '';
    } catch { status = 'No encontramos ese origen dentro de Santa Fe.'; }
    finally { resolving = false; }
  }
</script>
<section class="origin" aria-labelledby="origin-title" data-testid="origin-control">
  <div><span id="origin-title">Origen</span><strong>{label}</strong></div>
  <button type="button" class="location" on:click={useLocation} aria-label="Usar mi ubicación actual" data-testid="gps-button">Usar GPS</button>
  <div class="manual">
    <input bind:value={manual} autocomplete="street-address" placeholder="O escribí tu origen" aria-label="Origen manual" on:keydown={(event) => event.key === 'Enter' && useManual()} data-testid="origin-input" />
    <button type="button" on:click={useManual} disabled={resolving} data-testid="origin-apply">Aplicar</button>
  </div>
  <p aria-live="polite">{status}</p>
</section>
