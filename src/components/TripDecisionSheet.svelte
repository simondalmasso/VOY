<script lang="ts">
  import type { Destination } from '../features/destination/destination.types';
  import type { ProviderOptionModel } from '../features/providers/provider.types';
  import type { RouteResult } from '../features/trip/trip.types';
  import ProviderOption from './ProviderOption.svelte';
  export let route: RouteResult | null;
  export let options: ProviderOptionModel[];
  export let onChoose: (option: ProviderOptionModel) => void;
  export let destination: Destination;
  const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  $: verifiedDate = destination.verifiedAt || '';
  $: verifiedLabel = /^\d{4}-\d{2}-\d{2}$/.test(verifiedDate)
    ? `${verifiedDate.slice(8,10)} ${months[Number(verifiedDate.slice(5,7)) - 1]}`
    : 'FECHA NO DISPONIBLE';
</script>
<section class="sheet" aria-labelledby="decision-title" data-testid="trip-sheet">
  <div class="grab" aria-hidden="true"></div>
  <header>
    <div><span>Viaje a</span><h2 id="decision-title">{destination.name}</h2></div>
    {#if route}
      <p><strong>{route.distanceKm.toFixed(1)} km</strong><span>{route.source === 'osrm_route' ? 'distancia de ruta' : 'línea recta estimada'}</span></p>
    {:else}
      <p><strong>Sin cálculo</strong><span>datos insuficientes</span></p>
    {/if}
  </header>
  <p class="ranking-note trust-line" data-testid="destination-provenance">
    <span aria-hidden="true">✓</span>
    <span>Verificado · {destination.provenance?.issuer || 'Fuente institucional'} · <time datetime={verifiedDate}>{verifiedLabel}<span class="sr-only"> · {verifiedDate}</span></time></span>
  </p>
  <p class="ranking-note destination-address">{destination.address}</p>
  <div class="options" role="list" aria-live="polite">
    {#each options as option (option.id)}<ProviderOption {option} {onChoose} />{/each}
  </div>
  <details class="methodology">
    <summary>Cómo comparamos</summary>
    <p>El orden es determinista según el modo elegido. Si un precio, tiempo o dato no puede verificarse, VOY no lo inventa.</p>
  </details>
</section>
