<script lang="ts">
  import { onDestroy } from 'svelte';
  import { isInsideSantaFe, type Coordinates } from '../core/coordinates';

  export let label: string;
  export let onOrigin: (coordinates: Coordinates, label: string) => void;
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

  function useLocation(): void {
    controller?.abort();
    requestSequence += 1;
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
        const coordinates = { lat: position.coords.latitude, lon: position.coords.longitude };
        if (!isInsideSantaFe(coordinates)) {
          locationState = 'error';
          status = 'La ubicación está fuera de la cobertura actual de Santa Fe.';
          return;
        }
        locationState = 'available';
        onOrigin(coordinates, `Ubicación actual · ±${Math.round(position.coords.accuracy)} m`);
        status = '';
        editing = false;
        onManualState(false);
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
      status = 'Escribí una dirección o lugar.';
      manualInput?.focus();
      return;
    }
    controller?.abort();
    controller = new AbortController();
    const sequence = ++requestSequence;
    resolving = true;
    status = 'Resolviendo origen…';
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
      const payload = await response.json() as { results?: Array<{ lat?: unknown; lon?: unknown; name?: string; display_name?: string }> };
      if (sequence !== requestSequence) return;
      const first = payload.results?.[0];
      const coordinates = first && finite(first.lat) && finite(first.lon) ? { lat: first.lat, lon: first.lon } : null;
      if (!response.ok || !first || !coordinates || !isInsideSantaFe(coordinates)) throw new Error('not_found');
      onOrigin(coordinates, first.name || first.display_name || query);
      status = '';
      editing = false;
      onManualState(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (sequence === requestSequence) status = 'No encontramos ese origen dentro de Santa Fe.';
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
      <input
        bind:this={manualInput}
        bind:value={manual}
        autocomplete="street-address"
        placeholder="Escribí tu origen"
        aria-label="Origen manual"
        on:focus={() => onManualState(true)}
        on:keydown={onManualKeydown}
        data-testid="origin-input"
      />
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
