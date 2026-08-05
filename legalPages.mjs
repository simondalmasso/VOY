const EFFECTIVE_DATE = '4 de agosto de 2026';
const CONTACT_URL = 'https://github.com/simonkey888/VOY/issues/new';
const SECURITY_URL = 'https://github.com/simonkey888/VOY/security/advisories/new';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function page(title, intro, sections) {
  const content = sections.map(section => `
    <section>
      <h2>${escapeHtml(section.title)}</h2>
      ${section.paragraphs.map(paragraph => `<p>${paragraph}</p>`).join('')}
    </section>`).join('');
  return `<!doctype html>
<html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · VOY</title><meta name="robots" content="index,follow"><meta name="theme-color" content="#000000">
<style>:root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;background:#f7f7f7;color:#161616;font:16px/1.65 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:780px;margin:auto;padding:32px 20px 72px}a{color:#0645ad;text-underline-offset:3px}header{margin-bottom:28px}h1{line-height:1.08;font-size:clamp(2rem,7vw,3.5rem);margin:.5em 0 .25em}h2{margin-top:34px;line-height:1.2}.card{background:#fff;border:1px solid #d7d7d7;border-radius:18px;padding:clamp(18px,4vw,28px)}.meta{color:#555}.skip{position:absolute;left:-9999px}.skip:focus{left:12px;top:12px;background:#fff;color:#111;border:2px solid #111;border-radius:10px;padding:12px;z-index:2}nav{display:flex;gap:14px;flex-wrap:wrap;margin-top:18px}p{max-width:72ch}.status{display:inline-block;border:1px solid currentColor;border-radius:999px;padding:2px 9px;font-size:.82rem;font-weight:700}@media(prefers-color-scheme:dark){body{background:#080808;color:#f4f4f5}a{color:#93c5fd}.card{background:#18181b;border-color:#3f3f46}.meta{color:#c4c4c8}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}</style></head>
<body><a class="skip" href="#contenido">Saltar al contenido</a><main id="contenido" tabindex="-1"><header><a href="/">← Volver a VOY</a><h1>${escapeHtml(title)}</h1><p>${intro}</p><p class="meta">Vigente desde ${EFFECTIVE_DATE}.</p><nav aria-label="Información de VOY"><a href="/privacy">Privacidad</a><a href="/terms">Términos</a><a href="/sources">Fuentes</a><a href="/contact">Contacto</a></nav></header><div class="card">${content}</div></main></body></html>`;
}

const pages = {
  '/privacy': page('Privacidad', 'VOY minimiza datos y funciona sin cuenta, voz ni inteligencia artificial.', [
    { title: 'Datos que VOY no guarda', paragraphs: [
      'VOY no crea un perfil permanente, no conserva historial de viajes en el servidor y no almacena audio ni transcripciones de Voice Copilot.',
      'Las coordenadas exactas del origen y destino no se envían a analítica. Las métricas permitidas se reducen a eventos operativos y valores acotados.'
    ] },
    { title: 'Ubicación y mapas', paragraphs: [
      'La ubicación se utiliza en el dispositivo para resolver el viaje solicitado. Podés denegar el permiso y elegir origen o destino manualmente.',
      'Las búsquedas remotas se canalizan por el Worker de VOY; el navegador no consulta Nominatim directamente. Los servicios cartográficos y de rutas pueden recibir la consulta técnica necesaria para servir mapas o una ruta.'
    ] },
    { title: 'Analítica y preferencias', paragraphs: [
      'VOY respeta Global Privacy Control (GPC) y Do Not Track (DNT). Cuando están activos, el tráfico queda excluido de la analítica de producto.',
      'Las cookies técnicas se limitan a una sesión analítica breve y, si se configura Google, a una sesión autenticada temporal cifrada.'
    ] },
    { title: 'Google y Voice Copilot', paragraphs: [
      'La sesión con Google es opcional. El token recibido se verifica y se descarta; el correo no se usa como identificador y no se solicitan tokens de acceso o actualización.',
      'Voice Copilot es una interfaz acotada de movilidad. Sus herramientas son tipadas, las acciones externas exigen confirmación explícita de un solo uso y la aplicación sigue funcionando sin IA.'
    ] },
    { title: 'Contacto', paragraphs: [`Podés informar una consulta de privacidad mediante el <a href="${CONTACT_URL}">canal de incidencias de VOY</a>. No publiques datos personales, ubicaciones exactas ni credenciales.`] }
  ]),
  '/terms': page('Términos de uso', 'VOY compara información de movilidad; no reemplaza al proveedor de transporte ni garantiza disponibilidad o precio final.', [
    { title: 'Información y alcance', paragraphs: [
      'Las rutas, distancias, tiempos, tarifas y recomendaciones se generan mediante contratos deterministas y fuentes declaradas. Pueden existir demoras, desvíos o cambios externos.',
      'Las tarifas reguladas muestran procedencia y fecha. Los precios de aplicaciones privadas se consultan en cada aplicación y no se presentan como importes actuales cuando VOY no puede verificarlos.'
    ] },
    { title: 'Proveedores externos', paragraphs: [
      'Al abrir Uber, DiDi u otro proveedor salís de VOY. La contratación, disponibilidad, seguridad, cobro y precio final pertenecen al proveedor externo.',
      'VOY exige una confirmación explícita antes de abrir una acción externa y no afirma que una acción ocurrió si la herramienta correspondiente no tuvo éxito.'
    ] },
    { title: 'Uso responsable', paragraphs: [
      'No uses VOY mientras conducís ni para emergencias. Confirmá paradas, horarios y condiciones de accesibilidad con el operador cuando sea necesario.',
      'No intentes eludir límites, acceder a diagnósticos restringidos ni enviar cargas automatizadas abusivas.'
    ] },
    { title: 'Cambios', paragraphs: ['Los datos y estas condiciones pueden actualizarse. La fecha efectiva se publica en esta página y en el registro auditable del proyecto.'] }
  ]),
  '/sources': page('Fuentes y vigencia', 'VOY separa datos regulados, datos verificados, referencias parciales y precios que solo pueden consultarse en aplicaciones externas.', [
    { title: 'Tarifas reguladas de Santa Fe', paragraphs: [
      '<span class="status">REGULATED_CURRENT</span> Taxi: Resolución Municipal 217/2026, vigente desde el 11 de julio de 2026. Verificación de VOY: 4 de agosto de 2026.',
      '<span class="status">REGULATED_CURRENT</span> Remis: Resolución Municipal 365/2026, vigente desde el 6 de junio de 2026. Verificación de VOY: 4 de agosto de 2026.',
      '<span class="status">REGULATED_CURRENT</span> Colectivo: Decreto DMM 00048/2026. SUBE es el medio de pago declarado; VOY no muestra una tarifa en efectivo sin fuente vigente.'
    ] },
    { title: 'Aplicaciones privadas', paragraphs: [
      '<span class="status">APP_ONLY</span> Uber y DiDi tienen disponibilidad verificada mediante sus páginas oficiales de ciudades para Santa Fe. El precio actual se consulta en cada aplicación.',
      '<span class="status">NO_VERIFICADO</span> Maxim y Cabify no se presentan como disponibilidad actual en Santa Fe mientras no exista una fuente vigente verificable.'
    ] },
    { title: 'Paradas, estaciones y destinos', paragraphs: [
      '<span class="status">REFERENCE</span> El conjunto territorial local es curado y parcial. No se presenta como un feed oficial exhaustivo de paradas, frecuencias o recorridos.',
      'Las rutas viales y sus tiempos dependen de un proveedor determinista de ruteo. Las distancias base se calculan con código determinista; la IA no calcula rutas, tarifas, distancias, tiempos ni rankings.'
    ] },
    { title: 'Estado de autenticación', paragraphs: [
      'La implementación de sesión temporal con Google está detrás de configuración externa. Si no hay cliente y secreto de producción, VOY no muestra un control de inicio de sesión y conserva todas las funciones principales.'
    ] }
  ]),
  '/contact': page('Contacto', 'VOY usa canales trazables para consultas, datos desactualizados y reportes de seguridad.', [
    { title: 'Reportar un problema', paragraphs: [`Abrí una incidencia en <a href="${CONTACT_URL}">GitHub Issues</a> e indicá qué pantalla o función falló, el dispositivo y los pasos para reproducirlo.`] },
    { title: 'Seguridad', paragraphs: [`Para una vulnerabilidad que no deba publicarse, usá el <a href="${SECURITY_URL}">canal privado de avisos de seguridad</a>. No publiques secretos ni una prueba explotable en una incidencia pública.`] },
    { title: 'Datos sensibles', paragraphs: ['No incluyas contraseñas, tokens, documentos, correos privados, números de teléfono, audio, transcripciones ni coordenadas exactas.'] },
    { title: 'Tarifas y cobertura', paragraphs: ['Al reportar un dato desactualizado, adjuntá una fuente oficial o verificable y su fecha de vigencia. VOY no reemplaza una tarifa basándose únicamente en comentarios o estimaciones.'] }
  ])
};

export function handleLegalPage(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const path = new URL(request.url).pathname.toLowerCase().replace(/\/$/, '') || '/';
  const body = pages[path];
  if (!body) return null;
  return new Response(request.method === 'HEAD' ? null : body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, must-revalidate',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export const legalContract = Object.freeze({
  effectiveDate: '2026-08-04',
  contactUrl: CONTACT_URL,
  securityUrl: SECURITY_URL,
  paths: Object.freeze(Object.keys(pages))
});
