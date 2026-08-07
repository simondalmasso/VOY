<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { createVoiceSession, sendVoiceText, voiceCapabilities } from '../features/voice/voice.client';
  import type { VoiceSession } from '../features/voice/voice.contracts';
  export let onClose: () => void;
  let session: VoiceSession | null = null;
  let message = '';
  let responseText = '';
  let status = 'Comprobando disponibilidad…';
  let enabled = false;
  let pending = false;
  let controller = new AbortController();
  onMount(async () => {
    const capabilities = await voiceCapabilities(controller.signal).catch(() => ({ ok: false, enabled: false }));
    enabled = capabilities.ok && capabilities.enabled;
    status = enabled ? 'Escribí una consulta. El asistente no ejecuta acciones externas sin confirmación.' : 'El asistente está desactivado. El comparador principal sigue disponible.';
  });
  onDestroy(() => controller.abort());
  async function submit(): Promise<void> {
    const text = message.trim();
    if (!enabled || text.length < 2 || pending) return;
    pending = true; status = 'Procesando…';
    try {
      session ||= await createVoiceSession(controller.signal);
      const result = await sendVoiceText(text, session, controller.signal);
      session = result.session; responseText = result.response; status = 'Respuesta del asistente'; message = '';
    } catch { status = 'No pudimos completar la consulta. Probá de nuevo o usá la búsqueda principal.'; }
    finally { pending = false; }
  }
</script>
<section class="voice-panel" aria-labelledby="voice-title" data-testid="voice-panel">
  <header><div><span>Opcional</span><h2 id="voice-title">Asistente VOY</h2></div><button type="button" class="icon-button" on:click={onClose} aria-label="Cerrar asistente">Cerrar</button></header>
  <p role="status">{status}</p>
  {#if enabled}
    <label for="voice-text">Consulta por texto</label>
    <div class="voice-input"><input id="voice-text" bind:value={message} maxlength="500" placeholder="Ej.: explicame las opciones" on:keydown={(event) => event.key === 'Enter' && submit()} /><button type="button" on:click={submit} disabled={pending}>Enviar</button></div>
    {#if responseText}<div class="voice-response" aria-live="polite">{responseText}</div>{/if}
  {/if}
</section>
