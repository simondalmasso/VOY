<script lang="ts">
  import type { LegalRoute } from '../app/routes';
  import { clearVoyData } from '../lib/storage';
  export let route: Exclude<LegalRoute, '/'>;
  let cleared = false;
  const content = {
    '/privacy': { title: 'Privacidad', body: 'VOY funciona sin cuenta. No guarda ubicaciones exactas, consultas completas, audio ni transcripciones en analytics. Las preferencias locales son opcionales y podés borrarlas.' },
    '/terms': { title: 'Términos', body: 'VOY compara referencias y estimaciones. La tarifa regulada puede estimarse; los precios de Uber y DiDi se consultan únicamente en sus aplicaciones. Confirmá siempre la información final.' },
    '/sources': { title: 'Fuentes y cobertura', body: 'La cobertura actual corresponde a Santa Fe. Las tarifas reguladas muestran fuente y fecha. Las recomendaciones de líneas de colectivo están desactivadas hasta contar con datos actuales verificables.' },
    '/contact': { title: 'Contacto', body: 'Para informar un dato incorrecto o un problema técnico, usá el canal de contacto publicado en el repositorio oficial de VOY.' }
  } as const;
  function clearData(): void { clearVoyData(); cleared = true; }
</script>
<main class="legal" data-testid="legal-view">
  <a href="/" class="back">Volver a VOY</a>
  <h1>{content[route].title}</h1>
  <p>{content[route].body}</p>
  {#if route === '/privacy'}<button type="button" on:click={clearData}>Borrar datos locales de VOY</button>{#if cleared}<p role="status">Datos locales borrados.</p>{/if}{/if}
</main>
