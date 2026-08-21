<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Destination } from '../features/destination/destination.types';
  import { searchDestinations } from '../features/destination/destination.service';
  import { searchPopoverTransition } from '../lib/motion';

  export let onSelect: (destination: Destination) => void;
  export let dismissToken = 0;
  export let onFocusState: (focused: boolean) => void = () => undefined;
  export let onResultsState: (open: boolean) => void = () => undefined;

  let query = '';
  let results: Destination[] = [];
  let status = '';
  let selected = false;
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let input: HTMLInputElement;
  let seenDismissToken = dismissToken;

  onDestroy(() => {
    controller?.abort();
    if (timer) clearTimeout(timer);
  });

  $: if (dismissToken !== seenDismissToken) {
    seenDismissToken = dismissToken;
    results = [];
    onResultsState(false);
    onFocusState(false);
    input?.blur();
  }

  function selectable(item: Destination): boolean {
    return item.routeEligible === true && item.territoryVerified === true && item.territory?.countryId === 'AR';
  }

  function resultKind(item: Destination): 'verified' | 'eligible' | 'unresolved' {
    if (!selectable(item)) return 'unresolved';
    return item.confidence === 'authoritative' && item.provenance ? 'verified' : 'eligible';
  }

  function closeResults(keepFocus = true): void {
    results = [];
    onResultsState(false);
    if (!keepFocus) {
      onFocusState(false);
      input?.blur();
    }
  }

  function scheduleSearch(): void {
    selected = false;
    if (timer) clearTimeout(timer);
    controller?.abort();
    if (query.trim().length < 2) {
      results = [];
      status = '';
      onResultsState(false);
      return;
    }
    status = 'Buscando en Argentina…';
    timer = setTimeout(async () => {
      controller = new AbortController();
      try {
        results = await searchDestinations(query, controller.signal);
        onResultsState(results.length > 0);
        status = results.length ? `${results.length} resultados` : 'No encontramos un resultado territorial verificable en Argentina.';
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          results = [];
          onResultsState(false);
          status = 'No pudimos completar la búsqueda. Probá otra vez.';
        }
      }
    }, 220);
  }

  function choose(item: Destination): void {
    if (!selectable(item)) {
      status = 'Ese resultado no tiene contexto territorial suficiente para calcular una ruta.';
      return;
    }
    query = item.name;
    selected = true;
    status = item.confidence === 'authoritative' ? `Destino verificado: ${item.name}` : `Destino resuelto en ${item.territory?.displayName || 'Argentina'}`;
    closeResults(false);
    onSelect(item);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') closeResults(false);
  }
</script>

<section class="search" class:compact={selected} aria-labelledby="destination-title" data-testid="destination-search" data-selected={selected ? 'true' : 'false'} data-results-open={results.length ? 'true' : 'false'}>
  <label id="destination-title" for="destination-input">¿A dónde vas?</label>
  <div class="input-wrap">
    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"/></svg>
    <input
      id="destination-input"
      bind:this={input}
      autocomplete="street-address"
      inputmode="search"
      bind:value={query}
      on:input={scheduleSearch}
      on:focus={() => onFocusState(true)}
      on:blur={() => onFocusState(false)}
      on:keydown={handleKeydown}
      placeholder="Lugar, dirección, localidad o provincia"
      data-testid="destination-input"
      aria-expanded={results.length > 0}
      aria-controls="destination-results"
    />
  </div>
  <p class="status" aria-live="polite">{status}</p>
  {#if results.length}
    <ul id="destination-results" class="results" aria-label="Resultados de destino" data-testid="destination-results" data-motion="origin-aware-popover" transition:searchPopoverTransition>
      {#each results as item (item.id)}
        <li>
          <button type="button" disabled={!selectable(item)} aria-disabled={!selectable(item)} on:click={() => choose(item)} data-testid={`destination-result-${resultKind(item)}`}>
            <strong>{item.name}</strong>
            {#if item.confidence === 'authoritative' && item.provenance}
              <span>{item.address} · Fuente oficial</span>
            {:else if selectable(item)}
              <span>{item.address} · {item.territory?.displayName} · cobertura local no asumida</span>
            {:else}
              <span>Territorio no resuelto · No disponible para calcular</span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>
