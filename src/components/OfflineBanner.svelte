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
{#if !online}<div class="offline" role="status" data-testid="offline-banner">Sin conexión. La pantalla sigue disponible, pero la búsqueda y las rutas necesitan internet.</div>{/if}
