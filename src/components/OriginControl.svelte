<script lang="ts">
  import { onDestroy } from 'svelte';
  import { isInsideSantaFe, type Coordinates } from '../core/coordinates';
  export let label: string;
  export let onOrigin: (coordinates: Coordinates, label: string) => void;
  let manual = '';
  let status = '';
  let resolving = false;
  let editing = true;
  let controller: AbortController | null = null;
  let requestSequence = 0;
  const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
  $: selected = label !== 'Elegí tu origen';
  $: if (selected && !resolving) editing = false;

  function useLocation(): void {
    controller?.abort(); requestSequence += 1;
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
    if (query.length < 3) { status = 'Escribí una dirección o lugar.'; return; }
    controller?.abort(); controller = new AbortController();
    const sequence = ++requestSequence;
    resolving = true; status = 'Resolviendo origen…';
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
      const payload = await response.json() as { results?: Array<{ lat?: unknown; lon?: unknown; name?: string; display_name?: string }> };
      if (sequence !== requestSequence) return;
      const first = payload.results?.[0];
      const coordinates = first && finite(first.lat) && finite(first.lon) ? { lat: first.lat, lon: first.lon } : null;
      if (!response.ok || !first || !coordinates || !isInsideSantaFe(coordinates)) throw new Error('not_found');
      onOrigin(coordinates, first.name || first.display_name || query); status = '';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (sequence === requestSequence) status = 'No encontramos ese origen dentro de Santa Fe.';
    } finally { if (sequence === requestSequence) resolving = false; }
  }
  onDestroy(() => controller?.abort());
</script>
<section class="origin" class:compact={selected && !editing} aria-labelledby="origin-title" data-testid="origin-control" data-selected={selected ? 'true' : 'false'}>
  <div class="origin-summary"><span id="origin-title">Origen</span><strong>{label}</strong></div>
  {#if selected && !editing}
    <button type="button" class="origin-edit" on:click={() => editing = true} data-testid="origin-edit">Cambiar</button>
  {:else}
    <button type="button" class="location" on:click={useLocation} aria-label="Usar mi ubicación actual" data-testid="gps-button">Usar GPS</button>
    <div class="manual">
      <input bind:value={manual} autocomplete="street-address" placeholder="O escribí tu origen" aria-label="Origen manual" on:keydown={(event) => event.key === 'Enter' && useManual()} data-testid="origin-input" />
      <button type="button" on:click={useManual} aria-busy={resolving} data-testid="origin-apply">Aplicar</button>
    </div>
    <p aria-live="polite">{status}</p>
  {/if}
</section>
