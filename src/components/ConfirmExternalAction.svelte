<script lang="ts">
  import { tick } from 'svelte';
  import type { ExternalAction } from '../features/providers/provider.actions';
  import { backdropTransition, modalSurfaceTransition } from '../lib/motion';
  export let action: ExternalAction | null;
  export let onConfirm: () => void;
  export let onCancel: () => void;
  let confirmButton: HTMLButtonElement;
  $: officialInformation = action?.kind === 'official_information';
  $: title = officialInformation ? 'Abrir información oficial' : `Abrir ${action?.provider === 'uber' ? 'Uber' : 'DiDi'}`;
  $: description = officialInformation
    ? `Vas a salir de VOY para consultar la información de transporte de ${action?.authority || 'la autoridad oficial'}. VOY no comparte tu origen, destino ni búsqueda.`
    : 'Vas a salir de VOY. La disponibilidad y el precio final se confirman en la aplicación del proveedor.';
  $: if (action) tick().then(() => confirmButton?.focus());
</script>
{#if action}
  <div class="dialog-backdrop" role="presentation" on:click|self={onCancel} on:keydown={(event) => event.key === 'Escape' && onCancel()} data-testid="external-confirmation" data-action-kind={action.kind} transition:backdropTransition>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" data-motion="coordinated-surface" transition:modalSurfaceTransition>
      <h2 id="confirm-title">{title}</h2>
      <p id="confirm-description">{description}</p>
      <div><button type="button" class="secondary" on:click={onCancel}>Cancelar</button><button bind:this={confirmButton} type="button" on:click={onConfirm}>Continuar</button></div>
    </div>
  </div>
{/if}
