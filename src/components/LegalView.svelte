<script lang="ts">
  import type { PublicRoute } from '../app/routes';
  import { ARGENTINA_PROVINCES } from '../core/territory';
  import { clearVoyData } from '../lib/storage';

  export let route: PublicRoute;
  let cleared = false;

  const content = {
    '/about': {
      title: 'Qué es VOY',
      lead: 'Movilidad urbana para Argentina, hecha en Santa Fe.',
      body: 'VOY resuelve territorio, calcula rutas de forma determinista y separa lo que puede verificar de lo que todavía no sabe. No necesitás cuenta, voz ni IA para usar el núcleo del producto.'
    },
    '/coverage': {
      title: 'Cobertura',
      lead: 'Argentina es el territorio del producto; cobertura local no significa lo mismo en todas partes.',
      body: 'Las 24 jurisdicciones de primer orden tienen identidad territorial GeoRef. Santa Fe ciudad es la primera referencia local validada. En el resto del país VOY puede resolver territorio y rutas cuando las fuentes responden, pero no inventa proveedores, tarifas ni transporte público local.'
    },
    '/sources': {
      title: 'Fuentes y método',
      lead: 'Cada capa tiene su propia autoridad.',
      body: 'GeoRef Argentina V2 normaliza territorio. El Worker usa geocodificación OSM/Nominatim como complemento y OSRM para rutas, sin llamadas directas del navegador. Tarifas y presencia de proveedores sólo aparecen como verificadas cuando existe evidencia territorial vigente; las apps privadas permanecen APP_ONLY sin precio numérico inventado.'
    },
    '/privacy': {
      title: 'Privacidad',
      lead: 'VOY funciona sin cuenta y minimiza datos por diseño.',
      body: 'El núcleo no necesita login. VOY no persiste historial de viajes, coordenadas exactas, búsquedas completas, audio ni transcripciones. Si activás una cuenta Google, el servidor guarda únicamente un identificador interno, provider=google, el sub estable de Google, preferencias no sensibles, timestamps y sesiones revocables almacenadas como hash. No guarda email, nombre, avatar, ID token, access token ni refresh token de Google.'
    },
    '/terms': {
      title: 'Términos',
      lead: 'VOY ayuda a decidir; no reemplaza al prestador ni a la fuente oficial.',
      body: 'Rutas, duración y referencias se muestran según la fuente y clasificación disponible. Una tarifa regulada puede estimarse con su fórmula vigente; un precio APP_ONLY se consulta en la aplicación del proveedor. Desconocido no significa inexistente y falta de datos verificados no significa que un servicio no opere.'
    },
    '/support': {
      title: 'Soporte',
      lead: 'Reportá datos incorrectos o problemas técnicos en el repositorio oficial.',
      body: 'El canal público verificable de soporte es GitHub Issues de VOY. No publiques ubicaciones exactas, tokens, credenciales ni otros datos personales en un reporte.'
    },
    '/contact': {
      title: 'Soporte',
      lead: 'El contacto público se centraliza en el repositorio oficial.',
      body: 'Usá GitHub Issues de VOY para reportar un dato incorrecto o un problema técnico. No publiques información sensible.'
    }
  } as const;

  function clearData(): void { clearVoyData(); cleared = true; }
</script>

<main class="legal" data-testid="legal-view" data-route={route}>
  <a href="/" class="back">← Volver a VOY</a>
  <header class="trust-header">
    <img src="/brand/voy-mark.svg" width="44" height="44" alt="" />
    <div><p class="kicker">VOY · Argentina</p><h1>{content[route].title}</h1></div>
  </header>
  <p class="lead">{content[route].lead}</p>
  <p>{content[route].body}</p>

  {#if route === '/coverage'}
    <section aria-labelledby="coverage-title" class="coverage-block">
      <h2 id="coverage-title">24 jurisdicciones territoriales</h2>
      <p><strong>Santa Fe ciudad:</strong> primera ciudad con cobertura local validada por componente. <strong>Resto:</strong> base nacional; las capacidades locales se habilitan sólo con evidencia propia.</p>
      <ul class="territories">
        {#each ARGENTINA_PROVINCES as province (province.id)}
          <li><span>{province.name}</span><small>{province.id === '82' ? 'Base nacional · Santa Fe ciudad validada' : 'Base nacional'}</small></li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if route === '/sources'}
    <section class="source-list" aria-label="Fuentes principales">
      <a href="https://www.argentina.gob.ar/georef" rel="noreferrer">GeoRef Argentina V2 ↗</a>
      <a href="https://www.openstreetmap.org/copyright" rel="noreferrer">OpenStreetMap / ODbL ↗</a>
      <a href="https://project-osrm.org/" rel="noreferrer">OSRM ↗</a>
      <p>Las fuentes locales y fechas efectivas de tarifas se muestran junto a cada dato cuando corresponde.</p>
    </section>
  {/if}

  {#if route === '/support' || route === '/contact'}
    <p><a class="support-link" href="https://github.com/simonkey888/VOY/issues" rel="noreferrer">Abrir GitHub Issues de VOY ↗</a></p>
  {/if}

  {#if route === '/privacy'}
    <button type="button" on:click={clearData}>Borrar datos locales de VOY</button>
    {#if cleared}<p role="status">Datos locales borrados.</p>{/if}
  {/if}

  <nav class="trust-nav" aria-label="Información de VOY">
    <a href="/about">Acerca de</a><a href="/coverage">Cobertura</a><a href="/sources">Fuentes</a><a href="/privacy">Privacidad</a><a href="/terms">Términos</a><a href="/support">Soporte</a>
  </nav>
</main>

<style>
  .trust-header{display:flex;align-items:center;gap:14px;margin-top:18px}.trust-header h1{margin:0}.kicker{margin:0 0 3px;text-transform:uppercase;letter-spacing:.1em;font-size:12px;color:var(--voy-muted);font-weight:700}.lead{font-size:20px;line-height:1.45;color:var(--voy-ink-soft);max-width:58ch}.coverage-block,.source-list{margin-top:32px;padding-top:24px;border-top:var(--voy-border-default)}.territories{list-style:none;padding:0;margin:20px 0 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1px;background:var(--voy-border)}.territories li{background:var(--voy-surface);padding:14px;display:grid;gap:4px}.territories small{color:var(--voy-muted);line-height:1.35}.source-list{display:grid;gap:14px}.source-list a,.support-link{min-height:44px;display:flex;align-items:center;font-weight:700}.trust-nav{display:flex;flex-wrap:wrap;gap:16px;margin-top:40px;padding-top:24px;border-top:var(--voy-border-default)}.trust-nav a{min-height:44px;display:inline-flex;align-items:center}
</style>
