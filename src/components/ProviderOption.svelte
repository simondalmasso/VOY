<script lang="ts">
  import { formatArs } from '../core/pricing';
  import type { ProviderOptionModel } from '../features/providers/provider.types';
  export let option: ProviderOptionModel;
  export let onChoose: (option: ProviderOptionModel) => void;
  $: unavailable = option.price.kind === 'unavailable';
  $: unavailableLabel = unavailable ? option.price.label : null;
  $: priceLabel = option.price.kind === 'regulated_estimate' ? `≈ ${formatArs(option.price.value)}` : null;
  $: actionable = option.available && option.external;
  $: hasMeta = Boolean(priceLabel) || (option.available && option.etaMin !== null && option.etaMin > 0);
</script>
{#if actionable}
  <button type="button" class="provider provider-actionable" on:click={() => onChoose(option)} data-testid={`provider-${option.id}`} data-price-kind={option.price.kind} aria-label={`Abrir ${option.name} con confirmación`}>
    <span class="provider-main"><strong>{option.name}</strong><small>{option.detail}</small></span>
    <span class="provider-action">Abrir <span aria-hidden="true">↗</span></span>
  </button>
{:else}
  <article role="listitem" class="provider provider-info" class:disabled={!option.available} class:provider-unavailable={unavailable} data-testid={`provider-${option.id}`} data-price-kind={option.price.kind} aria-label={unavailableLabel ? `${option.name}: ${unavailableLabel}` : priceLabel ? `${option.name}: ${priceLabel}` : option.name}>
    <span class="provider-main">
      <strong>{option.name}</strong>
      <small>{option.detail}</small>
      {#if unavailableLabel}<span class="provider-unavailable-state">{unavailableLabel}</span>{/if}
    </span>
    {#if hasMeta}<span class="provider-meta">{#if priceLabel}<strong>{priceLabel}</strong>{/if}{#if option.available && option.etaMin !== null && option.etaMin > 0}<small>{option.etaMin} min</small>{/if}</span>{/if}
  </article>
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

  .provider-unavailable-state {
    display: block;
    margin-top: 4px;
    color: var(--voy-muted);
    font-size: var(--voy-type-label);
    line-height: var(--voy-leading-19);
    font-weight: var(--voy-weight-label);
    letter-spacing: normal;
    white-space: normal;
    overflow-wrap: normal;
    word-break: normal;
  }
</style>
