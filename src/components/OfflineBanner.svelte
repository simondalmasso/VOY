<script lang="ts">
  import { onMount } from 'svelte';
  let online = true;
  onMount(() => {
    online = navigator.onLine;
    const update = () => online = navigator.onLine;
    addEventListener('online', update); addEventListener('offline', update);
    return () => { removeEventListener('online', update); removeEventListener('offline', update); };
  });
</script>
{#if !online}<div class="offline" role="status" data-testid="offline-banner"><span aria-hidden="true">↯</span><span>Sin conexión · La pantalla sigue disponible; búsqueda y rutas necesitan internet.</span></div>{/if}
