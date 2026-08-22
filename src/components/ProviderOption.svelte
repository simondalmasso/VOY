<script lang="ts">
  import { formatArs } from '../core/pricing';
  import type { ProviderOptionModel } from '../features/providers/provider.types';
  export let option: ProviderOptionModel;
  export let onChoose: (option: ProviderOptionModel) => void;
  $: unavailable = option.price.kind === 'unavailable';
  $: unavailableLabel = option.price.kind === 'unavailable' ? option.price.label : null;
  $: priceLabel = option.price.kind === 'regulated_estimate' ? `≈ ${formatArs(option.price.value)}` : null;
  $: actionable = option.available && option.external;
  $: handoffActionable = Boolean(option.handoff);
  $: hasMeta = Boolean(priceLabel) || (option.available && option.etaMin !== null && option.etaMin > 0);
</script>
{#if actionable}
  <button type="button" class="provider provider-actionable" on:click={() => onChoose(option)} data-testid={`provider-${option.id}`} data-price-kind={option.price.kind} data-disabled="false" aria-label={`Abrir ${option.name} con confirmación`}>
    <span class="provider-main"><strong>{option.name}</strong><small>{option.detail}</small></span>
    <span class="provider-action">Abrir <span aria-hidden="true">↗</span></span>
  </button>
{:else}
  <article role="listitem" class="provider provider-info" class:disabled={!option.available} class:provider-unavailable={unavailable} data-testid={`provider-${option.id}`} data-price-kind={option.price.kind} data-disabled={!option.available ? 'true' : 'false'} aria-label={unavailableLabel ? `${option.name}: ${unavailableLabel}` : priceLabel ? `${option.name}: ${priceLabel}` : option.name}>
    <span class="provider-main">
      <strong>{option.name}</strong>
      <small>{option.detail}</small>
      {#if unavailableLabel}<span class="provider-unavailable-state">{unavailableLabel}</span>{/if}
    </span>
    {#if hasMeta}<span class="provider-meta">{#if priceLabel}<strong>{priceLabel}</strong>{/if}{#if option.available && option.etaMin !== null && option.etaMin > 0}<small>{option.etaMin} min</small>{/if}</span>{/if}
  </article>
  {#if handoffActionable && option.handoff}
    <div class="provider-handoff-group" role="presentation" data-testid={`provider-${option.id}-handoff-group`}>
      <span class="provider-handoff-trust" data-testid={`provider-${option.id}-handoff-source`}>Información externa · {option.handoff.authority}</span>
      <button type="button" class="provider-handoff" on:click={() => onChoose(option)} data-testid={`provider-${option.id}-handoff`} aria-label={`${option.handoff.label} en ${option.handoff.authority}`}>
        {option.handoff.label} <span aria-hidden="true">↗</span>
      </button>
    </div>
  {/if}
{/if}

<style>
  .provider-unavailable {
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
    gap: 6px;
  }

  .provider-unavailable .provider-main {
    width: 100%;
    min-width: 0;
  }

  .provider-unavailable-state,
  .provider-handoff-trust {
    display: block;
    color: var(--voy-muted);
    font-size: var(--voy-type-label);
    line-height: var(--voy-leading-19);
    font-weight: var(--voy-weight-label);
    letter-spacing: normal;
    white-space: normal;
    overflow-wrap: normal;
    word-break: normal;
  }

  .provider-unavailable-state {
    margin-top: 4px;
  }

  .provider-handoff-group {
    margin-top: 8px;
    padding: 0 2px 8px;
  }

  .provider-handoff-trust {
    margin-bottom: 6px;
  }

  .provider-handoff {
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid var(--voy-border);
    border-radius: var(--voy-radius-button);
    background: transparent;
    color: var(--voy-ink);
    font: inherit;
    font-weight: var(--voy-weight-label);
    cursor: pointer;
  }

  .provider-handoff:hover {
    background: var(--voy-surface-2);
  }

  .provider-handoff:focus-visible {
    outline: 3px solid var(--voy-focus);
    outline-offset: 2px;
  }
</style>
