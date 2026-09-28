# ORDER-075-GLM53 — ARQUITECTURA MAP-FIRST / MOBILE-FIRST (lane GLM53_VOY)

BASE_HEAD=`dd7fc408b5b1fdc6032a27f524246d4a89febe13` · BRANCH=`lab/order075-glm53-mapfirst-alt`
Estado: arquitectura previa a la implementación (el entregable es código funcionando, no este documento).

VOY deja de ser un formulario de búsqueda con mapa decorativo y pasa a ser **una superficie de mapa con verdad temporal visible**, donde planificar destino es una acción secundaria en una hoja inferior (bottom sheet). La inspiración es clean-room (sólo comportamiento público observable): foco/follow y contexto cercano de TrackViewer; dimensión temporal legible de Tokyo Last Train; presencia de mundo sobria de CABA_OS. No se copia código, assets ni branding de esas referencias.

---

## A. Máquina de estados del producto

Un solo árbol de estado explícito en `state` (`public/app.js`) más dos módulos con estado propio acotado. **No hay event bus global**: cada módulo expone callbacks concretos que el orquestador registra (wiring explícito, dependencias direccionales app→módulos).

```
state
├─ view.mode          : 'map'                     (única landing; no hay vista hero)
├─ map
│  ├─ mode            : '2d' | '3d'               (default 2d; 3d lazy explícito)
│  ├─ substrate       : 'raster' | 'vector' | 'vector_failed' | 'unavailable'
│  ├─ center/zoom     : centro actual (raster: fijo z13; vector: interactivo)
│  └─ threeController : controller | null         (existente, reuse)
├─ tracker            (public/tracker/store.js)
│  ├─ entities        : Map<entity_id, TrackerEntity>
│  │    ├─ observation: observación fuente normalizada (última)
│  │    ├─ previous   : observación fuente anterior (para interpolar)
│  │    ├─ trail      : Array<Observation> ≤32, edad ≤120s, sólo fuente
│  │    └─ verified_geometry : LineString | null
│  ├─ selected        : entity_id | null          (sobrevive 2D↔3D↔2D y fallback de mapa)
│  ├─ follow          : 'off' | 'following' | 'suspended'
│  └─ time
│     ├─ mode         : 'now' | 'scrub'
│     └─ scrubIndex   : índice en trail (só lectura; nunca dispara fetch)
├─ trip               (estado de planner existente: origin/destination/computation/…)
├─ sheet
│  ├─ pane            : 'collapsed' | 'search' | 'facts'
│  └─ height          : colapsada ≤30% del mapa
└─ offline/error      : derivado por superficie (pill + status + fallback)
```

Transiciones que importan al contrato:
- `follow: following → suspended` **inmediatamente** ante pan/zoom/rotate/orbit del usuario. En 2D MapLibre sigue siendo autoridad normal del gesto/cámara y un fail-safe de intención a nivel contenedor suspende sólo cuando un pointer primario supera ≥8px desde `pointerdown`; no mueve la cámara, no se dispara por recenter programático y un tap sin movimiento significativo no cuenta como drag. En 3D aplica el drag/orbit existente.
- `suspended → following` sólo por acción explícita “Reanudar seguimiento” (≥44px, visible).
- `realtime → stale/unknown` (por freshness o señal) ⇒ movimiento del marcador = 0 **en ese tick**; la hoja de facts persiste con estado actualizado.
- `substrate: vector → vector_failed` ⇒ raster continúa; selección/facts/estado temporal intactos.
- `mode: 2d → 3d → 2d` ⇒ selection, facts, follow y truth pill sin cambios.

## B. Límites de módulos frontend

| Módulo | Disposición |
|---|---|
| `public/3d/temporal.js` | **REUSE tal cual** (autoridad de verdad temporal: validación, freshness, salto imposible, snap, interpolación) |
| `public/3d/voy3d.js` | **REUSE** + modificación mínima: `update()` acepta también entidades del tracker (ya soporta `{previous,next,verifiedGeometry}`); cero cambios de política de movimiento |
| `public/contracts.js`, `runtime-config.js` | **REUSE**; runtime-config agrega bloque `MAP_VECTOR` (urls OpenFreeMap, pin de versión) — actualizo la copia embebida del worker para mantener sincronía |
| `public/app.js` | **REWRITE controlado**: mismo orquestador de planner (suggest/resolve/origin/radar/handoff intactos en comportamiento), reestructurado a shell map-first; el hero amarillo desaparece del DOM |
| `public/index.html` | **REWRITE**: `map-stage` a viewport + HUD (truth pill, 2D\|3D, atribución) + bottom sheet (search secundaria + facts + time rail) |
| `public/styles.css` | **REWRITE** manteniendo tokens de marca, 44px, reduced-motion, 200% |
| `public/tracker/observations.js` | **NUEVO** pure: forma normalizada, validación, clasificación realtime/predicted/scheduled/unknown, provenance/age |
| `public/tracker/store.js` | **NUEVO** pure: registro de entidades, trail acotado, selección, follow, scrub; callbacks explícitos |
| `public/tracker/fixtures.js` | **NUEVO**: fixtures realtime deterministas etiquetadas `synthetic_fixture`; **sólo** con `?fixture=realtime` (nunca por defecto en producción) |
| `public/map/substrate.js` | **NUEVO**: controlador de sustrato raster→vector + marcadores DOM + trail + ruta + follow |
| `public/sw.js` | **MODIFY**: CORE agrega tracker/map y vendor maplibre (mismo cache stale-while-revalidate) |
| `public/_headers`, `src/worker.template.js` | **MODIFY**: CSP `connect-src` += `https://tiles.openfreemap.org`; `img-src` igual; nada más |
| `scripts/build.ps1` | **MODIFY**: copia vendor maplibre + rewire `?v=` (mismo patrón three.core.js) |
| `scripts/build.sh` | **NUEVO**: port 1:1 de build.ps1 para verificación local Linux (pwsh no existe en este entorno) |

De-emphasize (no delete): assistant contextual (queda dentro del sheet expandido), train radar cards (pasan al sheet/panel “contexto cercano”).

## C. Arquitectura de render de mapa — decisión: **raster instantáneo + upgrade vectorial MapLibre/OpenFreeMap**

Decisión basada en evidencia (mediciones en `evidence/map-substrate.json`):
- La landing actual **no tiene pan/zoom**: el raster es una grilla estática z13. TrackerView exige interacción (pan/zoom del usuario suspende follow). Reimplementar un slippy-map propio ES el “GIS rewrite” que el order prohíbe; MapLibre lo resuelve con una dependencia pinned.
- OpenFreeMap: sin API key, sin registro, tiles OSM-derived, atribución requerida (cumple contrato del order; verificado 200 OK style/tiles/glyphs).
- Costo acotado (medido en `evidence/map-substrate.json`): maplibre-gl 6.11.2 ESM = 1.125.285 B raw / 303.733 B gz (módulo+shared+worker) + CSS 83 KB. **No va al camino crítico**: primer paint útil = raster (img, sin JS nuevo; medido 31.018 B gz app+tracker+map); el módulo vector se importa dinámicamente y hace swap cuando está listo.

Flujo:
1. Paint 1: grilla raster z13 centrada (código existente, ~0 JS nuevo).
2. Boot async: `import('/vendor/maplibre-gl.mjs?v=BUILD_ID')` → init WebGL2 + style OpenFreeMap → `map.ready` → swap visual raster→vector (conservando centro/marcadores/selección/estado).
3. Interacción (pan/zoom/rotate) sólo en vector; cada gesto dispara `onUserInteraction` → suspende follow.
4. **Fallback obligatorio**: fallo de import/estilo/tiles/WebGL2/contexto ⇒ permanece raster; truth pill, facts, selección y ruta **no cambian** (viven en DOM, no en canvas). `substrate='vector_failed'` queda registrado.
5. Atribución: control de atribución de MapLibre activo (OpenFreeMap/OSM) + atribución raster existente cuando aplica. `MAP_PAN_VOY_WORKER_CALLS=0` (los tiles van a openfreemap.org, nunca por el Worker).

## D. Arquitectura de observaciones del tracker

Forma normalizada (contrato estrecho, validada en `observations.js`):
```js
{
  id, source_id, temporal_state,   // realtime|predicted|scheduled|unknown
  observed_at,                      // ISO fuente
  lat, lon,                         // finitas, rango válido
  route_id?, trip_id?, line?, next_stop?,
  delay_seconds?, speed_mps?,      // sólo si respaldados por fuente
  verified_geometry?               // LineString verificada (p/r realtime)
  synthetic_fixture?                // true => etiquetado demo, sólo dev
}
```
- **Provenance**: `source_id` + `observed_at` visibles en facts sheet; fixtures marcan `synthetic_fixture:true` y la UI los etiqueta “FIXTURE DEMO · no producción”.
- **Freshness**: reutilizo límites del temporal engine (20s realtime) — clasificación por edad en cada tick; stale ⇒ movimiento 0 y estado truthful.
- **Validación**: coordenadas finitas, timestamps parseables, id/source_id strings no vacíos; entidad malformada se rechaza (no se renderiza); salto imposible/velocidad >45 m/s y snap >35 m rechazan movimiento (reglas existentes de temporal.js, sin tocar).
- **Geometry binding**: realtime sólo se mueve con `verified_geometry` presente y snap dentro de límites; si no, marcador estático o ausente — nunca inventado.
- **History rules**: sólo observaciones fuente entran al trail; puntos interpolados de display NUNCA (test explícito); al cambiar identidad de entidad/fuente se limpia trail incompatible.

## E. Trail temporal + time rail

- **Storage**: `trail` en memoria por entidad (Map en TrackerStore): push de observación fuente real; cap `MAX_TRAIL_OBSERVATIONS=32` (FIFO) y purge por `MAX_TRAIL_AGE_MS=120000` contra `observed_at` más reciente. Cero persistencia (D1/R2/KV/DO = 0; localStorage = 0).
- **Bounds**: [trail[0].observed_at, trail.at(-1).observed_at] — la sesión, no historia global.
- **Interpolation boundary**: display interpola sólo entre `previous` y `next` **fuente** dentro de freshness (regla de temporal.js); el trail nunca recibe puntos interpolados.
- **Scrub semantics**: `input[type=range]` (nativo ⇒ keyboard/a11y gratis) indexa observaciones reales; al mover: `time.mode='scrub'`, marcador va a la observación indexada (discreto), etiqueta `Histórico de esta sesión`, conexión con `Volver a ahora`. Aparece con ≥2 observaciones. **Zero-fetch garantizado**: el handler de scrub no tiene acceso a fetch (test: 0 llamadas /api durante scrub).
- **Return-to-now**: `Volver a ahora` ⇒ `time.mode='now'`, marker vuelve a la presentación actual (interpolada), truth pill vuelve al estado vivo.
- **Reduced motion**: sin transiciones CSS del marcador; scrub y ticks avanzan por pasos discretos entre observaciones.

## F. Arquitectura 3D

- Reuse íntegro del stack: Three.js **0.186.0** vendored, activación lazy explícita, topología acotada (chunk Santa Fe centro), `temporal.js` como motor. **No se agrega otro motor 3D.**
- 2D default ⇒ **cero** fetch de three/topología antes del opt-in explícito (BASELINE_2D_THREE_FETCHES=0, test).
- Al activar 3D: `voy3d.activateVoy3D()` recibe `routeGeometry` = ruta seleccionada del planner **o** geometry del tracker seleccionado; `transportEntities` provistas desde TrackerStore (`{previous,next,verifiedGeometry}`); el renderer sigue aplicando sus reglas (realtime puede moverse; scheduled/unknown/stale no).
- Selección/facts/truth pill viven en DOM (sheet), por lo tanto sobreviven 2D↔3D↔2D y caída de contexto WebGL (fallback existente `webgl_context_lost` → 2D con facts intactos). Delta de Worker calls por 3D = 0 (test).

## G. Red / costo

Familias de requests runtime esperadas (sin cambios respecto del base en cantidad):
1. `/api/destinations/suggest` — sólo input de usuario (debounce 400ms, cache 45s) [existente]
2. `/api/destinations/resolve` — sólo click en sugerencia [existente]
3. `/api/origin/resolve`, `/api/location/reverse` — sólo acción de origen [existente]
4. `/api/mobility/compute` — sólo con origen+destino [existente]
5. `/api/radar/trains/nearby` — sólo al fijar origen en cobertura [existente]
6. Tiles/estilo **openfreemap.org** y **tile.openstreetmap.org** — directamente del browser al proveedor público (nunca via Worker)
7. Assets estáticos self-origin (incl. vendor maplibre) — SW cache

**Prueba de invariante**: TrackerView (idle), follow, scrub, pan, toggle 3D, truth pill ⇒ **delta = 0 llamadas al Worker VOY** (assert en evidence + tests regex: los módulos tracker/map no contienen `/api/`). Boot default ⇒ 0 llamadas /api (no hay polling).

## H. Fallas / fallback

| Falla | Comportamiento |
|---|---|
| Sin fuente realtime (producción Santa Fe) | truth pill “Tiempo real no disponible en esta cobertura”; mapa útil (geografía, estaciones verificadas si aplica, rutas al seleccionar); **cero fake-live** |
| Fuente vencida (stale) | movimiento = 0 en el tick; facts persisten; estado pasa a unknown/stale visible |
| Geometría inválida/ausente | marcador no se mueve (o no se muestra); nunca inventa camino |
| Fallo vector (import/estilo/tiles) | raster continúa; selección/facts/estado intactos; pill de estado del sustrato |
| WebGL2 no disponible / contexto perdido | 3D no activa o vuelve a 2D (hardening existente); facts intactos |
| Offline shell | SW cache sirve shell; navegación cae a `offline.html` (existente); mapa puede faltar pero truth/facts textuales siguen legibles |
| Datos malformados | rechazo de entidad (validation) + status honesto; sin placeholders que parezcan datos |

## I. Accesibilidad

- **Facts legibles en DOM** (sheet real con texto, aria-live en cambios de estado temporal).
- **Keyboard**: orden Tab: topbar → HUD (2D|3D, calidad) → marcadores de entidades (buttons con aria-label “Entidad X · En vivo · edad 12s”) → sheet (chip búsqueda, origen, opciones, time rail range, Reanudar seguimiento, Volver a ahora). Todos operables por teclado; focus visible (outline 3px token).
- **Focus management**: al seleccionar entidad desde mapa ⇒ focus va al encabezado de facts (no roba teclado); Escape cierra sheet expandido.
- **Reduced motion**: sin animaciones de marcador/trail/scrub (pasos discretos; transiciones CSS a 0).
- **200% texto**: layout fluido (clamp/min, sin anchos fijos >390 en móvil, scroll interno del sheet); sin overflow horizontal (verificado 390x844@200% en browser).
- **Estado temporal no sólo por color**: pill con ícono/forma + texto (● En vivo · 12s / ◔ Estimado / ◷ Programado / ○ Sin señal / ⃠ sin cobertura) y `aria-live`.

## J. Presupuestos de performance

- `MAX_TRACKER_ENTITIES = 16` cargadas; render de marcadores ≤ `MAX_NEARBY_MARKERS = 12` (orden por cercanía, selección siempre incluida).
- `TRAIL_MAX_OBSERVATIONS = 32`, `TRAIL_MAX_AGE = 120s`, purge en cada push.
- **Sin RAF continuo en 2D**: tick de presentación a **4 Hz** (250ms) sólo si existen entidades realtime visibles + documento visible; transición CSS hace el suavizado; reduced-motion = sin tick de interp (sólo en observación). 3D conserva render-on-change del base.
- Delta JS/CSS inicial (boot 2D): app.js+styles.css+tracker/map modules = 31.018 B gz medido (sin three, sin maplibre); maplibre = 303.733 B gz **off critical path** (import dinámico post-primer-paint); three ≈ 640 KB gz sólo tras opt-in 3D.
- Crecimiento acotado: marcadores DOM O(entidades visibles)≤12; instancedMesh 3D ya acotado (64); draw calls 2D vector gestionados por MapLibre (budget medido en evidence); memoria: trail ≤ 32×N entidades.

---

### Implementación que sigue a este documento
Fases (TDD: RED primero en `tests/order075-glm53-*.test.mjs`):
1. RED contracts (≥35 del §12 de #59) → 2. módulos tracker puros → 3. shell HTML/CSS map-first + substrate → 4. wiring app.js + sheet + a11y → 5. fixtures deterministas → 6. build Linux + SW/headers/worker sync → 7. GREEN suite completa (219 previas realineadas + nuevas) → 8. evidence browser (390x844 + 1440x900 + follow + trail + 200% + no-live + fallback) → 9. DECISIONS.md + ORDER075_ALT_REPORT.md.
