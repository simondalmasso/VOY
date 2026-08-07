<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Destination } from '../features/destination/destination.types';
  import { searchDestinations } from '../features/destination/destination.service';
  export let onSelect: (destination: Destination) => void;
  let query = '';
  let results: Destination[] = [];
  let status = '';
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  onDestroy(() => { controller?.abort(); if (timer) clearTimeout(timer); });
  function scheduleSearch(): void {
    if (timer) clearTimeout(timer);
    controller?.abort();
    if (query.trim().length < 2) { results = []; status = ''; return; }
    status = 'Buscando…';
    timer = setTimeout(async () => {
      controller = new AbortController();
      try {
        results = await searchDestinations(query, controller.signal);
        status = results.length ? `${results.length} resultados` : 'No encontramos un resultado dentro de la cobertura.';
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) status = 'No pudimos completar la búsqueda. Probá otra vez.';
      }
    }, 220);
  }
  function choose(item: Destination): void {
    if (!item.operational || !item.verified || item.confidence !== 'authoritative') {
      status = 'Ese resultado no tiene procedencia suficiente para calcular un viaje.';
      return;
    }
    query = item.name;
    results = [];
    status = `Destino verificado: ${item.name}`;
    onSelect(item);
  }
</script>
<section class="search" aria-labelledby="destination-title" data-testid="destination-search">
  <label id="destination-title" for="destination-input">¿A dónde vas?</label>
  <div class="input-wrap">
    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"/></svg>
    <input id="destination-input" autocomplete="street-address" inputmode="search" bind:value={query} on:input={scheduleSearch} placeholder="Lugar o dirección" data-testid="destination-input" />
  </div>
  <p class="status" aria-live="polite">{status}</p>
  {#if results.length}
    <ul class="results" aria-label="Resultados de destino" data-testid="destination-results">
      {#each results as item (item.id)}
        <li>
          <button type="button" disabled={!item.operational} aria-disabled={!item.operational} on:click={() => choose(item)} data-testid={`destination-result-${item.operational ? 'verified' : 'unverified'}`}>
            <strong>{item.name}</strong>
            {#if item.operational && item.provenance}
              <span>{item.address} · Fuente oficial</span>
            {:else}
              <span>Ubicación no verificada · No disponible para calcular</span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>
