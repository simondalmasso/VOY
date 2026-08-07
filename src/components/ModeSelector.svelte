<script lang="ts">
  import type { TravelMode } from '../core/duration';
  export let value: TravelMode;
  export let onChange: (mode: TravelMode) => void;
  const modes: Array<{ id: TravelMode; label: string }> = [
    { id: 'app', label: 'Apps' }, { id: 'taxi', label: 'Taxi' }, { id: 'remis', label: 'Remis' },
    { id: 'walk', label: 'A pie' }, { id: 'bike', label: 'Bici' }, { id: 'bus', label: 'Colectivo' }
  ];
</script>
<div class="modes-frame">
  <div class="modes" role="group" aria-label="Modo de viaje" data-testid="mode-selector">
    {#each modes as mode (mode.id)}
      <button type="button" class:active={value === mode.id} aria-pressed={value === mode.id} on:click={() => onChange(mode.id)} data-mode={mode.id}>{mode.label}</button>
    {/each}
  </div>
  <span class="modes-overflow-cue" aria-hidden="true" data-testid="mode-overflow-cue">→</span>
</div>
