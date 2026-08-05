<script lang="ts">
  import type { ProviderOptionModel } from '../features/providers/provider.types';
  import type { RouteResult } from '../features/trip/trip.types';
  import ProviderOption from './ProviderOption.svelte';
  export let route: RouteResult;
  export let options: ProviderOptionModel[];
  export let onChoose: (option: ProviderOptionModel) => void;
  export let destinationName: string;
</script>
<section class="sheet" aria-labelledby="decision-title" data-testid="trip-sheet">
  <div class="grab" aria-hidden="true"></div>
  <header>
    <div><span>Viaje a</span><h2 id="decision-title">{destinationName}</h2></div>
    <p><strong>{route.distanceKm.toFixed(1)} km</strong><span>{route.source === 'osrm_route' ? 'distancia de ruta' : 'línea recta estimada'}</span></p>
  </header>
  <p class="ranking-note">Orden determinista por modo seleccionado. Las apps sin precio comparable no reciben un valor inventado.</p>
  <div class="options" aria-live="polite">
    {#each options as option (option.id)}<ProviderOption {option} {onChoose} />{/each}
  </div>
</section>
