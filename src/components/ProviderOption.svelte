<script lang="ts">
  import { formatArs } from '../core/pricing';
  import type { ProviderOptionModel } from '../features/providers/provider.types';
  export let option: ProviderOptionModel;
  export let onChoose: (option: ProviderOptionModel) => void;
  $: priceLabel = option.price.kind === 'regulated_estimate' ? `≈ ${formatArs(option.price.value)}` : option.price.kind === 'unavailable' ? option.price.label : null;
  $: actionable = option.available && option.external;
  $: hasMeta = Boolean(priceLabel) || (option.etaMin !== null && option.etaMin > 0);
</script>
{#if actionable}
  <button type="button" class="provider provider-actionable" on:click={() => onChoose(option)} data-testid={`provider-${option.id}`} data-price-kind={option.price.kind} aria-label={`Abrir ${option.name} con confirmación`}>
    <span class="provider-main"><strong>{option.name}</strong><small>{option.detail}</small></span>
    <span class="provider-action">Abrir <span aria-hidden="true">↗</span></span>
  </button>
{:else}
  <article role="listitem" class="provider provider-info" class:disabled={!option.available} data-testid={`provider-${option.id}`} data-price-kind={option.price.kind} aria-label={priceLabel ? `${option.name}: ${priceLabel}` : option.name}>
    <span class="provider-main"><strong>{option.name}</strong><small>{option.detail}</small></span>
    {#if hasMeta}<span class="provider-meta">{#if priceLabel}<strong>{priceLabel}</strong>{/if}{#if option.available && option.etaMin !== null && option.etaMin > 0}<small>{option.etaMin} min</small>{/if}</span>{/if}
  </article>
{/if}
