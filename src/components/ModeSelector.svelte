<script lang="ts">
  import { onMount } from 'svelte';
  import type { TravelMode } from '../core/duration';
  export let value: TravelMode;
  export let onChange: (mode: TravelMode) => void;
  const modes: Array<{ id: TravelMode; label: string }> = [
    { id: 'app', label: 'Apps' }, { id: 'taxi', label: 'Taxi' }, { id: 'remis', label: 'Remis' },
    { id: 'walk', label: 'A pie' }, { id: 'bike', label: 'Bici' }, { id: 'bus', label: 'Colectivo' }
  ];
  let rail: HTMLDivElement;
  let showOverflowCue = false;

  function syncOverflowCue(): void {
    if (!rail) return;
    const hasOverflow = rail.scrollWidth > rail.clientWidth + 1;
    const atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
    showOverflowCue = hasOverflow && !atEnd;
  }

  onMount(() => {
    syncOverflowCue();
    const observer = new ResizeObserver(syncOverflowCue);
    observer.observe(rail);
    return () => observer.disconnect();
  });
</script>
<div class="modes-frame">
  <div bind:this={rail} class="modes" role="group" aria-label="Modo de viaje" data-testid="mode-selector" on:scroll={syncOverflowCue}>
    {#each modes as mode (mode.id)}
      <button type="button" class:active={value === mode.id} aria-pressed={value === mode.id} on:click={() => onChange(mode.id)} data-mode={mode.id}>{mode.label}</button>
    {/each}
  </div>
  {#if showOverflowCue}<span class="modes-overflow-cue" aria-hidden="true" data-testid="mode-overflow-cue">→</span>{/if}
</div>
