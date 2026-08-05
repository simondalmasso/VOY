<script lang="ts">
  import { tick } from 'svelte';
  import type { ExternalAction } from '../features/providers/provider.actions';
  export let action: ExternalAction | null;
  export let onConfirm: () => void;
  export let onCancel: () => void;
  let confirmButton: HTMLButtonElement;
  $: if (action) tick().then(() => confirmButton?.focus());
</script>
{#if action}
  <div class="dialog-backdrop" role="presentation" on:click|self={onCancel} on:keydown={(event) => event.key === 'Escape' && onCancel()} data-testid="external-confirmation">
    <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
      <h2 id="confirm-title">Abrir {action.provider === 'uber' ? 'Uber' : 'DiDi'}</h2>
      <p id="confirm-description">Vas a salir de VOY. La disponibilidad y el precio final se confirman en la aplicación del proveedor.</p>
      <div><button type="button" class="secondary" on:click={onCancel}>Cancelar</button><button bind:this={confirmButton} type="button" on:click={onConfirm}>Continuar</button></div>
    </section>
  </div>
{/if}
