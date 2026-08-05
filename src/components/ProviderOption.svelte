<script lang="ts">
  import { formatArs } from '../core/pricing';
  import type { ProviderOptionModel } from '../features/providers/provider.types';
  export let option: ProviderOptionModel;
  export let onChoose: (option: ProviderOptionModel) => void;
  $: priceLabel = option.price.kind === 'regulated_estimate' ? `≈ ${formatArs(option.price.value)}` : option.price.label;
  $: actionable = option.available && option.external;
</script>
{#if actionable}
  <button type="button" class="provider" on:click={() => onChoose(option)} data-testid={`provider-${option.id}`} aria-label={`${option.name}: ${priceLabel}. Abrir con confirmación`}>
    <span class="provider-main"><strong>{option.name}</strong><small>{option.detail}</small></span>
    <span class="provider-meta"><strong>{priceLabel}</strong><small>{option.etaMin} min</small></span>
  </button>
{:else}
  <article role="listitem" class="provider provider-info" class:disabled={!option.available} data-testid={`provider-${option.id}`} aria-label={`${option.name}: ${priceLabel}`}>
    <span class="provider-main"><strong>{option.name}</strong><small>{option.detail}</small></span>
    <span class="provider-meta"><strong>{priceLabel}</strong>{#if option.available && option.etaMin > 0}<small>{option.etaMin} min</small>{/if}</span>
  </article>
{/if}
