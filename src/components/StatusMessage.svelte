<script lang="ts">export let message = ''; export let tone: 'info' | 'error' | 'success' = 'info';</script>
{#if message}<div class="message" class:error={tone === 'error'} class:success={tone === 'success'} role={tone === 'error' ? 'alert' : 'status'} aria-live="polite" data-testid="status-message">{message}</div>{/if}
