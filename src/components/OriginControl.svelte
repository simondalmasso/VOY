<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Coordinates } from '../core/coordinates';
  import { territoryLabel, type TerritoryContext } from '../core/territory';

  export let label: string;
  export let onOrigin: (coordinates: Coordinates, label: string, territory: TerritoryContext) => void;
  export let dismissToken = 0;
  export let onManualState: (open: boolean) => void = () => undefined;

  let manual = '';
  let status = '';
  let resolving = false;
  let editing = false;
  let controller: AbortController | null = null;
  let requestSequence = 0;
  let manualInput: HTMLInputElement;
  let editButton: HTMLButtonElement;
  let manualTrigger: HTMLButtonElement;
  let seenDismissToken = dismissToken;
  let locationState: 'idle' | 'requesting' | 'available' | 'denied' | 'error' = 'idle';
  const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

  $: selected = label !== 'Elegí tu origen';
  $: if (selected && !resolving) editing = false;
  $: if (dismissToken !== seenDismissToken) {
    seenDismissToken = dismissToken;
    editing = false;
    onManualState(false);
    manualInput?.blur();
    queueMicrotask(() => (selected ? editButton : manualTrigger)?.focus());
  }

  function openManual(): void {
    editing = true;
    onManualState(true);
    queueMicrotask(() => manualInput?.focus());
  }

  async function resolveTerritory(coordinates: Coordinates, signal?: AbortSignal): Promise<TerritoryContext | null> {
    const response = await fetch(`/api/territory?lat=${encodeURIComponent(String(coordinates.lat))}&lon=${encodeURIComponent(String(coordinates.lon))}`, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const payload = await response.json() as { territory?: TerritoryContext };
    return payload.territory?.countryId === 'AR' ? payload.territory : null;
  }

  function useLocation(): void {
    controller?.abort();
    const sequence = ++requestSequence;
    locationState = 'requesting';
    status = 'Solicitando ubicación…';
    if (!navigator.geolocation) {
      locationState = 'error';
      status = 'Este navegador no ofrece ubicación. Ingresá un origen manual.';
      openManual();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        void (async () => {
          const coordinates = { lat: position.coords.latitude, lon: position.coords.longitude };
          controller = new AbortController();
          status = 'Verificando territorio…';
          try {
            const territory = await resolveTerritory(coordinates, controller.signal);
            if (sequence !== requestSequence) return;
            if (!territory) {
              locationState = 'error';
              status = 'No pudimos verificar esta ubicación dentro de Argentina. Definí el origen manualmente.';
              openManual();
              return;
            }
            locationState = 'available';
            onOrigin(coordinates, `Ubicación actual · ${territoryLabel(territory)} · ±${Math.round(position.coords.accuracy)} m`, territory);
            status = '';
            editing = false;
            onManualState(false);
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            if (sequence === requestSequence) {
              locationState = 'error';
              status = 'No pudimos verificar el territorio. Definí el origen manualmente.';
              openManual();
            }
          }
        })();
      },
      () => {
        locationState = 'denied';
        status = 'No pudimos usar tu ubicación. Podés ingresar el origen manualmente.';
        openManual();
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  }

  async function useManual(): Promise<void> {
    const query = manual.trim();
    if (query.length < 3) {
      status = 'Escribí una dirección o lugar, incluyendo localidad o provincia si hace falta.';
      manualInput?.focus();
      return;
    }
    controller?.abort();
    controller = new AbortController();
    const sequence = ++requestSequence;
    resolving = true;
    status = 'Resolviendo origen en Argentina…';
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
      const payload = await response.json() as { results?: Array<{ lat?: unknown; lon?: unknown; name?: string; display_name?: string; routeEligible?: boolean; territoryVerified?: boolean; territory?: TerritoryContext }> };
      if (sequence !== requestSequence) return;
      const eligible = (payload.results || []).filter(item => item.routeEligible === true && item.territoryVerified === true && item.territory?.countryId === 'AR' && finite(item.lat) && finite(item.lon));
      if (!response.ok || eligible.length === 0) throw new Error('not_found');
      if (eligible.length > 1) {
        status = 'Hay varios resultados posibles. Agregá localidad y provincia para definir el origen sin ambigüedad.';
        manualInput?.focus();
        return;
      }
      const first = eligible[0]!;
      const coordinates = { lat: first.lat as number, lon: first.lon as number };
      const territory = first.territory!;
      onOrigin(coordinates, `${first.name || first.display_name || query} · ${territoryLabel(territory)}`, territory);
      status = '';
      editing = false;
      onManualState(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (sequence === requestSequence) status = 'No encontramos un origen territorial verificable en Argentina.';
    } finally {
      if (sequence === requestSequence) resolving = false;
    }
  }

  function onManualKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void useManual();
  }

  onDestroy(() => controller?.abort());
</script>

<section class="origin" class:compact={selected && !editing} aria-labelledby="origin-title" data-testid="origin-control" data-selected={selected ? 'true' : 'false'} data-location-state={locationState}>
  <div class="origin-summary"><span id="origin-title">Origen</span><strong>{label}</strong></div>
  {#if selected && !editing}
    <button bind:this={editButton} type="button" class="origin-edit" on:click={openManual} data-testid="origin-edit">Cambiar</button>
  {:else if editing}
    <div class="manual">
      <input bind:this={manualInput} bind:value={manual} autocomplete="street-address" placeholder="Dirección · localidad · provincia" aria-label="Origen manual" on:focus={() => onManualState(true)} on:keydown={onManualKeydown} data-testid="origin-input" />
    </div>
    <p aria-live="polite">{status}</p>
  {:else}
    <div class="manual">
      <button type="button" class="location" on:click={useLocation} aria-label="Usar mi ubicación actual" aria-busy={locationState === 'requesting'} data-testid="gps-button">Usar mi ubicación</button>
      <button bind:this={manualTrigger} type="button" class="origin-edit" on:click={openManual} data-testid="origin-manual-trigger">Definir origen</button>
    </div>
    <p aria-live="polite">{status}</p>
  {/if}
</section>
