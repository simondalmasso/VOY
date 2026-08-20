<script lang="ts">
  import type { Destination } from '../features/destination/destination.types';
  import type { ProviderOptionModel } from '../features/providers/provider.types';
  import type { RouteResult } from '../features/trip/trip.types';
  import { nextCollapsedSnap, nextExpandedSnap, type SheetSnap } from '../app/interaction';
  import ProviderOption from './ProviderOption.svelte';

  export let route: RouteResult | null;
  export let options: ProviderOptionModel[];
  export let onChoose: (option: ProviderOptionModel) => void;
  export let destination: Destination;
  export let snap: SheetSnap = 'peek';
  export let onSnapChange: (snap: SheetSnap) => void = () => undefined;

  const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  let dragging = false;
  let dragStart = 0;
  let dragOffset = 0;
  let suppressClick = false;

  function dateLabel(value: string | null | undefined): string {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'FECHA NO DISPONIBLE';
    return `${value.slice(8,10)} ${months[Number(value.slice(5,7)) - 1]}`;
  }

  $: destinationVerifiedDate = destination.verifiedAt || '';
  $: territoryVerifiedDate = destination.territory?.verifiedAt || '';
  $: destinationVerifiedLabel = dateLabel(destinationVerifiedDate);
  $: territoryVerifiedLabel = dateLabel(territoryVerifiedDate);

  function expand(): void {
    onSnapChange(nextExpandedSnap(snap));
  }

  function collapse(): void {
    const next = nextCollapsedSnap(snap);
    if (next) onSnapChange(next);
  }

  function cycle(): void {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    if (snap === 'expanded') collapse();
    else expand();
  }

  function startDrag(event: PointerEvent): void {
    dragging = true;
    suppressClick = false;
    dragStart = event.clientY;
    dragOffset = 0;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent): void {
    if (!dragging) return;
    dragOffset = Math.max(-90, Math.min(90, event.clientY - dragStart));
  }

  function finishDrag(): void {
    if (!dragging) return;
    const delta = dragOffset;
    dragging = false;
    dragOffset = 0;
    if (Math.abs(delta) >= 8) suppressClick = true;
    if (delta <= -42) expand();
    else if (delta >= 42) collapse();
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp') { event.preventDefault(); expand(); }
    if (event.key === 'ArrowDown') { event.preventDefault(); collapse(); }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); cycle(); }
  }
</script>

<section
  class="sheet"
  class:dragging
  aria-labelledby="decision-title"
  data-testid="trip-sheet"
  data-snap={snap}
  style={`--voy-sheet-drag:${dragOffset}px`}
>
  <button
    type="button"
    class="sheet-handle"
    aria-label={`Panel de decisión: ${snap}. Usá flechas para cambiar tamaño`}
    on:click={cycle}
    on:pointerdown={startDrag}
    on:pointermove={moveDrag}
    on:pointerup={finishDrag}
    on:pointercancel={finishDrag}
    on:keydown={handleKeydown}
    data-testid="sheet-handle"
  ><span class="grab" aria-hidden="true"></span></button>

  <div class="sheet-content" data-testid="sheet-content">
    <header>
      <div><span>Viaje a</span><h2 id="decision-title">{destination.name}</h2></div>
      {#if route}
        <p><strong>{route.distanceKm.toFixed(1)} km</strong><span>{route.source === 'osrm_route' ? 'distancia de ruta' : 'línea recta estimada'}</span></p>
      {:else}
        <p><strong>Sin cálculo</strong><span>datos insuficientes</span></p>
      {/if}
    </header>
    {#if destination.verified && destination.provenance}
      <p class="ranking-note trust-line" data-testid="destination-provenance">
        <span aria-hidden="true">✓</span>
        <span>Destino verificado · {destination.provenance.issuer} · <time datetime={destinationVerifiedDate}>{destinationVerifiedLabel}<span class="sr-only"> · {destinationVerifiedDate}</span></time></span>
      </p>
    {:else if destination.territoryVerified && destination.territory}
      <p class="ranking-note trust-line" data-testid="destination-provenance">
        <span aria-hidden="true">✓</span>
        <span>Territorio verificado · GeoRef Argentina V2 · <time datetime={territoryVerifiedDate}>{territoryVerifiedLabel}<span class="sr-only"> · {territoryVerifiedDate}</span></time></span>
      </p>
    {:else}
      <p class="ranking-note" data-testid="destination-provenance">Procedencia territorial no verificada.</p>
    {/if}
    <p class="ranking-note destination-address">{destination.address}</p>
    <div class="options" role="list" aria-live="polite">
      {#each options as option (option.id)}<ProviderOption {option} {onChoose} />{/each}
    </div>
    <details class="methodology">
      <summary>Cómo comparamos</summary>
      <p>El orden es determinista según el modo elegido. Si un precio, tiempo o dato no puede verificarse, VOY no lo inventa.</p>
    </details>
  </div>
</section>
