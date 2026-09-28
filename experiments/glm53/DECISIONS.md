# ORDER-075-GLM53 — DECISIONES (log de decisiones con evidencia)

BRANCH=`lab/order075-glm53-mapfirst-alt` · BASE=`dd7fc408b5b1fdc6032a27f524246d4a89febe13`
Cada decisión está tomada contra el contrato de #59/#57 y los cánones `AUD_CANON.md` / `ARQ_CANON.md`. La evidencia citada vive en `experiments/glm53/evidence/`.

---

## D1 — Sustrato de mapa: raster instantáneo + upgrade vectorial MapLibre 6.11.2 / OpenFreeMap + fallback raster obligatorio

**Decisión.** La landing pinta primero la grilla raster z13 existente (cero JS nuevo en el camino crítico) y el sustrato vectorial se inicializa asincrónicamente con `maplibre-gl@6.11.2` (pinned) + estilo Liberty de OpenFreeMap; cuando el mapa está listo hace swap visual conservando centro, marcadores, selección y estado temporal. Cualquier falla (import, estilo, tiles, WebGL2, timeout 8s) deja el raster activo con el tracker intacto (`substrate='vector_failed'`).

**Alternativas descartadas.**
- *Raster puro con pan/zoom propio*: la interacción que exige TrackerView (el pan del usuario suspende follow) requiere un slippy map real; implementarlo a mano es exactamente el "GIS rewrite" prohibido por el order. El raster base no tiene pan/zoom ni gesture handling.
- *MapLibre como primer paint*: agrega ~304 KB gz al camino crítico y bloquea la primera pantalla útil detrás de WebGL2 + style fetch; viola el presupuesto de boot y empeora el fallback.
- *Vector sin fallback*: una falla de red/tiles dejaría sin mapa; el order exige degradación truthful, no pantalla vacía.

**Evidencia.** `evidence/map-substrate.json`: OpenFreeMap keyless (style 200 OK, TileJSON 200 OK, pbf tile 200 OK, glyphs 200 OK, overlay natural-earth 200 OK), OSM raster 200 OK; tamaños medidos raw/gz; primer paint 2D = 31.018 B gz; maplibre = 1.125.285 B raw / 303.733 B gz off-critical-path. `evidence/order075-alt-evidence.json` → `VECTOR_FAILURE_FALLBACK_RASTER=PASS` (raster sigue visible, facts y truth pill intactos tras abortar `tiles.openfreemap.org`).

**Costo aceptado.** +1 dependencia runtime pinned (maplibre-gl 6.11.2) vendoreada en `/vendor` con rewire `?v=BUILD_ID` (mismo patrón que three.core.js del build base); CSP `connect-src` += `https://tiles.openfreemap.org`; tiles NUNCA pasan por el Worker VOY (browser → proveedor público directo).

## D2 — Límites de módulos: tracker puro + controlador de sustrato, sin event bus

**Decisión.** Tres módulos nuevos con dependencias direccionales explícitas: `public/tracker/observations.js` (pure: forma normalizada + validación + clasificación), `public/tracker/store.js` (pure: registro, trail, selección, follow, scrub; sin DOM, sin red, sin storage), `public/map/substrate.js` (dueño del DOM del mapa: raster, vector, marcadores, trail render, follow). `app.js` es el único orquestador: registra callbacks concretos (`onUserInteraction`, `onSelectMarker`, `onVectorReady/Failed`); no existe event bus global.

**Por qué.** El canon de auditoría exige trazabilidad de decisión por superficie y acoplamiento acotado; un bus global difumina quién reacciona a qué y hace el comportamiento no auditable por lectura de código.

**Evidencia.** `tests/order075-glm53-*.test.mjs`: 47 contratos sobre estos módulos puros (validación, límites, invariantes de movimiento, trail, scrub, fixtures). `grep /api/` en tracker+substrate = 0 apariciones (test network).

## D3 — Modelo de verdad del tracker: `realtime|predicted|scheduled|unknown` con movimiento=0 para todo lo no-realtime

**Decisión.** Toda observación se normaliza y clasifica ANTES de entrar al store. Sólo realtime fresco CON geometría verificada puede mover el marcador; `scheduled`, `unknown`, `predicted` y realtime vencido (stale) producen `movement=0` en el tick. La geometría falta o el snap excede 35 m o la velocidad supera 45 m/s ⇒ el marcador no se mueve (reglas heredadas de `3d/temporal.js`, que se reusa tal cual como autoridad). Santa Fe sin fuente realtime muestra "Tiempo real no disponible en esta cobertura" — cero fake-live.

**Por qué.** Es el corazón del order: temporal truth visible, nada que parezca vivo sin estarlo.

**Evidencia.** Tests de invariantes de movimiento (scheduled/unknown/stale/sin geometría ⇒ cero movimiento; salto imposible rechazado). Browser: `NO_LIVE_SANTA_FE_TRUTHFUL=PASS`, `STALE_TRANSITION_ZERO_MOVEMENT=PASS` (entidad vencida: marcador desaparece y facts dicen "Sin señal").

## D4 — Trail: sólo observaciones fuente, caps 32/120s, sin puntos interpolados

**Decisión.** El trail por entidad contiene únicamente observaciones de la fuente (nunca puntos de display interpolados), con cap FIFO de 32 observaciones y purge por edad 120s contra la observación más reciente. Al cambiar identidad/fuente de la entidad, el trail incompatible se limpia. Los límites del time rail son `[trail[0].observed_at, trail.at(-1).observed_at]` — la sesión, no historia global. Cero persistencia (no localStorage, no D1/R2/KV/DO).

**Evidencia.** Tests: "actual source observations enter the trail", "interpolated display points never enter the trail", "trail observation cap is enforced", "trail age cap is enforced", "source/entity identity switch clears incompatible trail". Browser: `TRACKERVIEW_FIXTURE_REALTIME_FOLLOW=PASS` (rail max ≥3, scrub, return-to-now).

## D5 — Time rail: `input[type=range]` nativo, scrub zero-fetch

**Decisión.** El scrub usa el range nativo (teclado y a11y gratis), indexa observaciones reales del trail y NO tiene acceso a fetch: el handler vive en el store puro sin referencia a red. Al mover: `time.mode='scrub'`, marcador discreto a la observación indexada, etiqueta "Histórico de esta sesión", botón "Volver a ahora". Con reduced-motion: pasos discretos sin transiciones.

**Evidencia.** Test: "scrub is zero-fetch by construction and walks real observations only" + wiring sin `/api/`. Browser: delta de llamadas Worker durante scrub+return = 0 (assert en `TRACKERVIEW_FIXTURE_REALTIME_FOLLOW`); keyboard scrub verificado en `KEYBOARD_REACHES_TRACKERVIEW=PASS`.

## D6 — Follow: suspend inmediato por interacción del usuario, reanudar sólo explícito

**Decisión.** `following → suspended` dispara ante interacción real del usuario. MapLibre conserva `dragstart|zoomstart|rotatestart|pitchstart` como autoridad normal de gesto/cámara; además, en 2D existe un fail-safe temprano a nivel contenedor: `pointerdown` primario sólo arma el detector y recién un desplazamiento ≥8px emite `pointer_drag` para suspender follow antes de que un recenter pueda interrumpir la activación del gesto. Un tap/click sin movimiento significativo no suspende. `suspended → following` ocurre sólo por el botón "Reanudar seguimiento" (≥44px, visible). El pan/recenter programático no dispara suspensión y el fallback nunca mueve la cámara por sí mismo.

**Evidencia.** Tests: "pan suspends follow immediately and only from following", "resume requires an explicit action and a selection". Browser: drag físico sobre el canvas vectorial → "Reanudar seguimiento" aparece, delta Worker = 0. El cierre encontró dos capas distintas: (1) el harness podía arrastrar antes de `substrate.maplibreReady`, por lo que el gesto se salteaba; el runner ahora espera readiness/canvas real; (2) aun con readiness corregida persistió una carrera real de producto: el `easeTo` periódico del follow podía adelantarse a la activación de `dragstart` de MapLibre y abortar el takeover del usuario. El fail-safe ≥8px corrige esa segunda capa sin reemplazar la autoridad de gesto/cámara de MapLibre.

## D7 — 3D: reuse íntegro del stack, 2D default, selección sobrevive

**Decisión.** Three.js 0.186.0 vendoreado (ya en base), activación lazy explícita, topología del chunk Santa Fe centro, `temporal.js` como motor. 2D default ⇒ cero fetch de three/topología antes del opt-in. La selección/facts/truth viven en DOM (sheet), así que sobreviven 2D↔3D↔2D y caída de contexto WebGL. No se agrega otro motor 3D.

**Evidencia.** Tests: "baseline 2D keeps zero Three/topology fetches before opt-in", "selection survives mode/follow state changes and is store-owned". Browser: `SELECTION_SURVIVES_2D_3D=PASS` (renderCalls 5, delta Worker 0), screenshot `3d-selected-entity.png`.

## D8 — Presupuesto de red: delta 0 llamadas al Worker para todo el surface del tracker

**Decisión.** TrackerView idle, follow, scrub, pan, toggle 3D, truth pill ⇒ 0 llamadas nuevas al Worker. Los tiles van directo del browser a los proveedores públicos (openfreemap.org / tile.openstreetmap.org), nunca vía Worker. Boot default sin polling: 0 llamadas /api.

**Evidencia.** Tests network (4) + asserts `apiCalls(segment)===` en cada chequeo browser; `requests.api_total` del run completo de evidence = 0 con API mockeada local. Flujo de planner intacto en cantidad (suggest/resolve/origin/compute/radar siguen existiendo, sólo con input del usuario).

## D9 — Fixtures deterministas etiquetadas, sólo opt-in dev

**Decisión.** `public/tracker/fixtures.js` genera entidades sintéticas (bus realtime moviéndose sobre geometría verificada, tren realtime, servicio scheduled, entidad que vence) con `synthetic_fixture:true`; sólo se activan con `?fixture=realtime` (nunca por defecto, nunca en producción). La UI muestra banner "FIXTURE DEMO · no producción".

**Por qué.** El order exige TrackerView observable sin esperar una fuente real que no existe en Santa Fe; la alternativa (fake-live en producción) está prohibida.

**Evidencia.** Tests: "fixtures are opt-in only", "fixture engine is deterministic and labeled synthetic", "fixture entity goes stale when its stream stops", "no tracker persistence, telemetry or new storage", "no secret/key/credential enters client source". Browser: markerCount 7, banner visible, etiqueta "synthetic fixture" en facts.

## D10 — Build: port Linux 1:1 + sincronía sw/headers/worker

**Decisión.** `scripts/build.sh` reproduce el algoritmo de build.ps1 (mismo BUILD_ID: source_digest git ls-files + sha256; mismo layout dist/, BUILD_MANIFEST.json, worker inline de autoridad GeoRef) para verificación local en Linux. `build.ps1` sigue siendo el canónico. El CORE del service worker agrega `/tracker/` y `/map/` + vendor maplibre (mismo stale-while-revalidate); `_headers` y `runtime-config.js` (incluida la copia embebida en el worker) agregan `MAP_VECTOR` y el host OpenFreeMap en CSP.

**Evidencia.** `build.sh` reproduce BUILD_ID estable `09335687ae90d199ae835653` (dos corridas); tests: "service worker caches the new map-first shell including tracker modules", "CSP allows OpenFreeMap vector hosts and keeps strict defaults", "build inlines pinned GeoRef runtime authority" (base, sigue verde), "PWA branding / immutable build cache identity" (base, sigue verde).

## D11 — Isolation y no-regresión del planner

**Decisión.** El planner (suggest/resolve/origin/radar/handoff) se conserva en comportamiento dentro del shell nuevo; el hero amarillo desaparece del DOM; el search pasa a chip dentro del sheet expandido. Las 219 pruebas del base se realinearon (selectores/DOM nuevos) sin debilitar asserts; +47 pruebas ORDER-075 nuevas.

**Evidencia.** Suite completa: 266/266 PASS (219 base realineadas + 47 nuevas). Test: "app wiring keeps planner behavior contracts alive".

## D12 — Referencias AUD triageadas (comentario #issuecomment-5850347049)

**Decisión.** `cloud-optimized-geoparquet`: REFERENCE_ONLY — no se integra (no reemplaza MapLibre/OpenFreeMap; agregaría un formato de storage/reader antes de que exista un cuello de botella medido). `mobile-next/mobile-mcp`: OPTIONAL_QA_ONLY — no se agrega al repo/package.json/CI; el gate de QA de ORDER-075 sigue siendo Playwright/Chromium local. `SCOPE_CHANGE=NO` — ninguna de las dos entra a la arquitectura.

**Por qué.** Directiva explícita del owner (AUD REFERENCE TRIAGE): quedan documentadas como candidatos futuros sin expandir el scope actual.

---

## Qué NO se hizo (por contrato)

- Cero backend/DB/telemetry/persistence nuevos (D1–D9): todo tracker es runtime en memoria.
- Cero deploy, cero producción probe, cero PR, cero merge, cero GitHub Actions (el lane termina en el branch local del laboratorio; ver reporte).
- Cero escritura en `main`.
- Cero inspección de las ramas Grokbot/Sonnet antes de terminar esta alternativa (aislamiento clean-room respetado; los nombres de branch remotos aparecen en `git branch -a` pero sus contenidos no fueron leídos).
