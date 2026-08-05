<script lang="ts">
  import { formatArs } from '../core/pricing';
  import type { ProviderOptionModel } from '../features/providers/provider.types';
  export let option: ProviderOptionModel;
  export let onChoose: (option: ProviderOptionModel) => void;
  $: priceLabel = option.price.kind === 'regulated_estimate' ? `≈ ${formatArs(option.price.value)}` : option.price.label;
</script>
<button type="button" class="provider" class:disabled={!option.available} disabled={!option.available} on:click={() => onChoose(option)} data-testid={`provider-${option.id}`}>
  <span class="provider-main"><strong>{option.name}</strong><small>{option.detail}</small></span>
  <span class="provider-meta"><strong>{priceLabel}</strong>{#if option.available}<small>{option.etaMin} min</small>{/if}</span>
</button>
