# VOY — CONTEXTO TOTAL PARA GEMINI (Senior Google Maps Engineer Review)

## ROL QUE NECESITAMOS DE VOS

Sos el **amo y señor ingeniero de Google Maps**. No un reviewer más. Inferí magias.
Querés que VOY sea lo que Google Maps debería haber sido para movilidad urbana comparada en Latinoamérica: **una sola decisión en 3 toques, sin ruido, sin overengineering, pero con la inteligencia de un sistema que sabe a dónde vas antes de que termines de tipear**.

Tu output debe ser **UN JSON con cambios atómicos urgentes** (ver formato al final).

---

## 1. QUÉ ES VOY

**VOY** es un asistente de movilidad urbana para **Santa Fe, Argentina** (ciudad de ~500k hab).
No es un clon de Google Maps. Es **una capa de comparación** sobre los apps de transporte que YA existen:
- Compara **Uber / DiDi / Maxim** (ride-hailing) con **Taxi / Remis** (WhatsApp) y **Colectivo** (bus público) y **Bicicleta** (Las Bicis)
- Es **URL-first** (no install): `https://voy.is-a.dev` abre la app sin store
- ~96KB total bundle (HTML + JS vanilla, sin framework)
- Backend: **Cloudflare Workers** (static assets + `/api/events` + `/api/health`)
- Mapa: **MapLibre GL** + tiles CARTO (fallback OSM)
- Memoria: **IndexedDB cifrada AES-GCM** (favoritos, recientes, inferencia home/work)

### Flujo de usuario (golden path, target 20s)
1. Abre `voy.is-a.dev` → GPS pide permiso → origen auto-seteado → mapa centra
2. Tipea destino → autocomplete local-first (favoritos → home/work → recientes → DB local → Nominatim)
3. Selecciona destino → sheet desliza abajo con **hero** (mejor opción) + alternativas + taxi/remis/colectivo/bicicleta
4. Toca "Pedir" → dialog de confirmación (deep-link externo) → abre Uber/DiDi/Maxim app

### Stack técnico
- Frontend: **HTML + JS vanilla** (sin React, sin bundler, sin framework)
- Backend: **Cloudflare Workers** (worker.js + wrangler.jsonc)
- Mapa: **MapLibre GL 4.7.1** (estilo CARTO positron, fallback OSM raster)
- Memoria: **IndexedDB + AES-GCM** (`crypto.subtle`) en mobilityController.js
- Analytics: **local FIFO** (5-tap en VOY wordmark abre dashboard) + eventBus → worker `/api/events`
- Deploy: **wrangler deploy** (27 assets, 2.66 KiB worker)

---

## 2. ESTADO DE PRODUCCIÓN (HONESTO)

| Capa | Estado |
|------|--------|
| Código local | **V7.0.0 completo** (version pin, cache-bust `no-store`, mode selector funcional, CI/CD guardrail) |
| Producción | **V4 legacy** (worker viejo, `cf-cache: HIT`, sin V7, sin mode selector) |
| Dominio canonical | `voy.is-a.dev` → **302 fallback** (is-a.dev PR NO merged) |
| Worker staging | `voy-app.simondalmasso44.workers.dev` → **307 → /VOY-Lite** (viejo) |
| CI/CD | `.github/workflows/deploy.yml` creado pero **nunca ejecutado** (sin CF creds en sandbox) |
| Gap | **100% deployment**, no code bug. Falta un `wrangler deploy` real. |

> **NOTA PARA GEMINI**: No me digas "deployá". Yo no puedo (sin creds). Tu trabajo es **mejorar el código que SÍ tengo** para que cuando se deploye sea la mejor versión posible. Inferí magias de UX/ingeniería que yo no vi.

---

## 3. ARQUITECTURA DE ARCHIVOS

```
worker.js                          (155 líneas) — edge router + /api/health + /api/events + _htmlNoStore
wrangler.jsonc                     (56 líneas) — config voy-core + ASSETS + VOY_METRICS binding
public/VOY-Lite.html               (1536 líneas) — UI completa + lógica de vista
public/core/mobilityEngine.js      (441 líneas) — motor puro (NO tocar salvo bug crítico)
public/core/pricingEngine.js       (~180 líneas) — PricingEngineV2 bayesiano
public/core/eventBus.js            (~210 líneas) — event spec v1.4 transport
public/ui/mobilityController.js    (~730 líneas) — orquestación + IndexedDB cifrada
public/manifest.json               — PWA manifest
public/icons/                      — 15 PNG/SVG icons (PWA complete)
domains/voy.json                   — is-a.dev PR file (placeholder TU_EMAIL)
scripts/deploy.sh                  — one-command deploy
scripts/preflight.sh               — 8-check gate (22 sub-checks)
scripts/verify-production.sh       — 7-point live edge audit
scripts/rollback.sh                — wrangler rollback wrapper
scripts/inject-build-hash.mjs      — git SHA → worker.js + HTML
.github/workflows/deploy.yml       — CI/CD with hash guardrail
```

---

## 4. LO BUENO (qué funciona bien)

### Arquitectura
- **Separación limpia**: `mobilityEngine.js` es 100% puro (sin DOM, sin fetch, sin localStorage). Testeable.
- **IndexedDB cifrada AES-GCM**: favoritos/recientes/home-work inference encriptados con `crypto.subtle`. User puede borrar todo (`v5EraseAll`).
- **Local-first search pipeline**: favoritos → home/work (inferidos) → recientes → DB local → Nominatim (debounced 200ms). GPS bias en ranking.
- **Event spec v1.4**: bus de eventos con 3 transports (cloudflare worker, posthog stub, local fallback). Anon ID only (no PII).
- **PricingEngineV2 bayesiano**: confidence con prior + variance por provider, surge (time/weather/demand), fare range.
- **Cache-bust V7**: worker.js pone `Cache-Control: no-store` en HTML, `?v=9` en scripts estáticos.
- **CI/CD guardrail**: workflow falla si `build_hash` live ≠ git SHA.

### UX
- **Zero emojis** (sistema SVG de 28 iconos).
- **Splash screen** (SVG chevron V, fade-in-scale 900ms, dot pulse, exit on `app_ready`).
- **Ambient map** (opacity 0.9, native gestures, idle cinematic drift que se detiene al primer keystroke).
- **Decision sheet** (hero con precio grande 32px, alternativas colapsadas, taxi/remis accordions, bus mini-block, bike tertiary).
- **Deep-link confirmation dialog**: "Vas a salir de VOY. El servicio y el precio final dependen del proveedor externo, no de VOY."
- **Analytics dashboard oculto** (5-tap en VOY wordmark).
- **Mode selector** (Todo/Auto/Taxi/Remis/A pie/Ruta) — V7 lo hace funcional (filtra hero por categoría).

### Datos
- **10 paradas de colectivo** (líneas 1/4/8/11/16) con calles reales de Santa Fe.
- **12 estaciones Las Bicis** (bicicleta pública).
- **15 landmarks** (Puente Colgante, Catedral, UNL, hospitales, barrios).
- **6 providers** (Uber/DiDi/Maxim apps + Radiotaxi/TaxiApp taxis + Remises Real remis).
- **FareRegistry** con tarifas actualizadas (taxi Resolución 217/2026, bus SUBE, apps base/km/min).

---

## 5. LO MALO — BUGS ENCONTRADOS (auditoría completa)

### BUGS CRÍTICOS (P0)

#### P0-1: `renderSheet()` no maneja hero vacío en modo "walk"
**Archivo**: `public/VOY-Lite.html:1253-1279`
**Bug**: Cuando `_activeMode === 'walk'`, `_modeMatches()` retorna `false` para todos los ride-hailing apps → `hero` queda `null` → el bloque `if(hero){...}` no renderiza → **el sheet muestra solo taxi/remis/bus/bike pero SIN hero principal**. El usuario ve un sheet "roto" sin acción primaria.
**Fix esperado**: En modo walk, el **bike block debería promoverse a hero** (o mostrar un hero "A pie" con tiempo de caminata estimado). Hoy `bikeEst` se renderiza abajo del todo.

#### P0-2: Confianza del colectivo usa `'taxi'` como provider
**Archivo**: `public/VOY-Lite.html:1328`
```js
var busConf=(window.PricingEngineV2)?PricingEngineV2.fareConfidence('taxi',{...}):MC.v6FareConfidence('taxi',distKm,...);
```
**Bug**: El bus no es taxi. Usar `PricingEngineV2.fareConfidence('taxi',...)` para el colectivo es semánticamente incorrecto. El bus tiene tarifa fija SUBE (sin variación), su confianza debería ser **alta y fija** (0.95+), no derivada del taxi.
**Fix esperado**: Bus confidence debería ser `0.95` (tarifa fija pública, no varía) o un `'bus'` provider en PricingEngineV2.

#### P0-3: `autoEst.providers` no existe — `ride_estimated` event emite fare incorrecto
**Archivo**: `public/VOY-Lite.html:1203`
```js
VoyEventBus.emit('ride_estimated',{...estimated_fare:autoEst.providers?autoEst.providers[0]&&autoEst.providers[0].price:0...})
```
**Bug**: `estimateAuto()` retorna `uberPrice/didiPrice/...` (campos planos), NO un array `providers`. Entonces `autoEst.providers` siempre es `undefined` → `estimated_fare: 0` siempre. El event `ride_estimated` se emite con fare `0` en TODOS los casos.
**Fix esperado**: Usar `autoEst.rankedProviders[0].price` o `autoEst.uberPrice` (el hero price real).

#### P0-4: Route line es línea recta (no sigue calles)
**Archivo**: `public/VOY-Lite.html:948-956`
```js
_map.addSource('route-src',{...coordinates:[[origin.lon,origin.lat],[dest.lon,dest.lat]]...});
```
**Bug**: La ruta en el mapa es una **LineString de 2 puntos** (línea recta origen→destino). Google Maps usa routing de calles (OSRM/Valhalla). Esto visualmente está mal — la línea cruza edificios, ríos, manzanas.
**Fix esperado**: Integrar OSRM (`https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson`) o Valhalla para obtener polilínea que siga calles. Fallback: línea recta si OSRM falla.

### BUGS HIGH (P1)

#### P1-5: `isMaximSupported()` casing inconsistente
**Archivo**: `public/VOY-Lite.html:762`
```js
function isMaximSupported(){return /android/i.test(navigator.userAgent)}
```
**Bug**: Usa `/android/i` (case-insensitive) pero `buildAppLink` usa `/Android/i` (case-sensitive, línea 1500) y `buildBikeLink` usa `/iPad|iPhone|iPod/` (case-sensitive). Inconsistencia: en algunos UA edge cases (Android con caps raras) Maxim puede pasar el check de `isMaximSupported` pero fallar el de `buildAppLink` → intenta abrir intent:// que no funciona.
**Fix esperado**: Unificar a `/android/i` en todos los UA checks.

#### P1-6: `drawRouteLine()` no limpia markers antes de redraw
**Archivo**: `public/VOY-Lite.html:939-956`
**Bug**: `updateMapMarkers()` remueve `_originMarker`/`_destMarker` y los recrea, PERO `drawRouteLine()` se llama al final. Si el usuario cambia destino rápido, hay race condition: el marker viejo puede no estar removido antes de que el nuevo se agregue. En testing no crashea pero genera markers "fantasmas" temporales.
**Fix esperado**: `drawRouteLine()` debería ser idempotente y verificar `_map.getSource('route-src')` existe antes de remover (ya lo hace, pero sin try/catch en el removeLayer/removeSource).

#### P1-7: `fallbackGeocode` no cancela requests stale
**Archivo**: `public/VOY-Lite.html:1029-1037`
**Bug**: A diferencia de `onSearchInput` (que usa `_searchVersion` para cancelar stale), `fallbackGeocode` no tiene cancelación. Si el usuario presiona Enter dos veces rápido, dos fetches a Nominatim corren en paralelo y el segundo puede sobrescribir el primero.
**Fix esperado**: Usar el mismo patrón `_searchVersion` o un AbortController.

#### P1-8: `va_close()` se ejecuta en `beforeunload` Y `visibilitychange=hidden`
**Archivo**: `public/VOY-Lite.html:758-759`
**Bug**: En mobile, al cambiar de tab (visibilitychange=hidden) se guarda la sesión. Luego al volver, NO se crea nueva sesión (`va_open()` solo se llama en init). Resultado: la misma sesión se guarda múltiples veces si el usuario cambia de tab varias veces. Adicionalmente, `beforeunload` en mobile iOS NO firea reliably.
**Fix esperado**: `va_close()` debería marcar la sesión como cerrada (`_vaS.closed=true`) y `visibilitychange=visible` debería llamar `va_open()` si la sesión fue cerrada.

#### P1-9: `v5InferHomeWork()` requiere `count >= 2` — muy alto para cold start
**Archivo**: `public/ui/mobilityController.js:1056`
```js
return best && best.count >= 2 ? best.dest : null;
```
**Bug**: Necesita 2 viajes al mismo destino en el mismo bucket horario para inferir home/work. En cold start (usuario nuevo), esto NUNCA pasa hasta el 2do viaje nocturno/diurno al mismo lugar. La inferencia es útil recién después de 2-3 semanas de uso.
**Fix esperado**: Bajar a `count >= 1` para cold start + mostrar sugerencia "¿Es esta tu casa?" en lugar de auto-asumir.

### BUGS MEDIUM (P2)

#### P2-10: MapLibre cargado sin SRI (integrity hash)
**Archivo**: `public/VOY-Lite.html:48`
```html
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
```
**Bug**: Sin `integrity=""` attribute, si unpkg es comprometido, se ejecuta código malicioso en VOY. Supply chain attack vector.
**Fix esperado**: Agregar SRI hash. `<script src="..." integrity="sha384-..." crossorigin="anonymous"></script>`.

#### P2-11: `closeBtn` del analytics dashboard usa `onclick` inline
**Archivo**: `public/VOY-Lite.html:729`
```js
var closeBtn='<button onclick="document.getElementById(\'vaDash\').innerHTML=\'\'" ...>';
```
**Bug**: Inline `onclick` violaría cualquier CSP estricto (cuando se agregue). Inconsistente con el resto del código que usa `addEventListener`.
**Fix esperado**: Usar `addEventListener` después de setear `innerHTML`.

#### P2-12: `computeTaxiFare` duplica lógica del engine
**Archivo**: `public/VOY-Lite.html:1175-1181`
**Bug**: `computeTaxiFare()` en el HTML reimplementa `estimateTaxi()` del engine. Si cambia la tarifa en `FareRegistry`, ambas se actualizan, pero es código duplicado. Peor: el engine usa `Math.floor(distKm*1000/t.distFicha)` y el HTML usa `Math.ceil(...)`. **Diferentes resultados para el mismo viaje.**
**Fix esperado**: Usar `MobilityEngine.estimateTaxi(distKm, FareRegistry.taxi, new Date().getHours())`.

#### P2-13: `rankProviders` del engine no incluye `cabify` pero `estimateAuto` sí lo calcula
**Archivo**: `public/core/mobilityEngine.js:143,158`
**Bug**: `estimateAuto` calcula `cabifyPrice` (que es `null` porque no hay `apps.cabify` en FareRegistry). `rankProviders` no lo incluye en la lista. Código muerto: el cálculo de cabify corre pero nunca se usa.
**Fix esperado**: Remover `cabifyPrice` de `estimateAuto` o agregar cabify a PROVIDERS + FareRegistry.

#### P2-14: `searchLocal` del engine devuelve max 3 resultados (muy pocos)
**Archivo**: `public/core/mobilityEngine.js:326`
```js
return deduped.slice(0, 3);
```
**Bug**: `dedupResults` del engine limita a 3, pero `onSearchInput` hace `merged.slice(0,8)`. Inconsistencia: si hay 5 resultados locales buenos, solo se muestran 3. Luego Nominatim agrega los suyos (pueden ser peores).
**Fix esperado**: Engine `dedupResults` → `slice(0,6)`, view `merged.slice(0,8)`.

#### P2-15: `drawBusRoute` ordena paradas por longitud (oeste→este) — path irreal
**Archivo**: `public/ui/mobilityController.js:306`
```js
stops.sort(function (a, b) { return a.lon - b.lon || a.lat - b.lat; });
```
**Bug**: Ordenar paradas por longitud genera un path que zigzaguea. Una línea de colectivo real va por una avenida, no de oeste a este en línea recta. El overlay naranja es visualmente incorrecto.
**Fix esperado**: O (a) obtener GTFS shapes reales, o (b) usar OSRM routing entre paradas consecutivas, o (c) al menos ordenar por proximidad secuencial (nearest-neighbor TSP).

#### P2-16: GPS retry usa `setTimeout` pero no limpia en `_stopGpsWatch`
**Archivo**: `public/VOY-Lite.html:908-912`
**Bug**: `_startGpsWatch` setea `_gpsRetryTimer` en el error handler. `_stopGpsWatch` no hace `clearTimeout(_gpsRetryTimer)`. Si el usuario revoca permisos mientras hay un retry pendiente, el retry corre igual (inofensivo pero desperdicia recursos).
**Fix esperado**: `clearTimeout(_gpsRetryTimer); _gpsRetryTimer=null;` en `_stopGpsWatch`.

### BUGS LOW (P3)

#### P3-17: `escapeHtml` no escapa comillas simples
**Archivo**: `public/VOY-Lite.html:657`
**Bug**: `escapeHtml` escapa `& < > "` pero no `'`. Si un nombre de destino tiene `'` y se inserta en un atributo con comillas dobles, está OK. Pero si se usa en contexto JS string, puede romper.
**Fix esperado**: Agregar `.replace(/'/g,"&#39;")` o asegurar que siempre se use con comillas dobles.

#### P3-18: `_searchRemoteTimer` no se limpia en `clearState`
**Archivo**: `public/ui/mobilityController.js:152`
**Bug**: `clearState()` limpia `_searchTimer` pero no `_searchRemoteTimer` (que vive en el HTML, no en el controller). Si se llama clearState durante un search remoto pendiente, el callback corre igual.
**Fix esperado**: Exponer un `cancelSearch()` en el controller que limpie ambos timers.

#### P3-19: `manifest.json` no tiene `id` consistente con `start_url`
**Archivo**: `public/manifest.json:5-8`
```json
"id": "/",
"start_url": "/",
```
**Bug**: `id: "/"` es válido pero algunos navegadores esperan un `id` absoluto. No es crítico pero puede causar issues de PWA identity en reinstalls.
**Fix esperado**: `"id": "/"` está OK, pero considerar `"id": "https://voy.is-a.dev/"` para persistencia cross-device.

#### P3-20: No hay service worker (offline no funciona)
**Archivo**: `public/` (missing `sw.js`)
**Bug**: El manifest declara `display: standalone` pero no hay service worker registrado. En modo PWA instalado, sin red, la app muestra pantalla en blanco.
**Fix esperado**: Agregar `sw.js` básico con cache-first para assets estáticos + network-first para HTML.

---

## 6. LO QUE NOS TRABA ACTUALMENTE

### Bloqueantes para producción real
1. **Deploy nunca ejecutado** — el código V7 existe pero production sirve V4. Necesito CF creds.
2. **is-a.dev PR no merged** — sin dominio canonical, los usuarios no pueden llegar a VOY por URL limpia.
3. **Route line es línea recta** — visualmente incorrecto, los usuarios no confían en una ruta que cruza edificios.

### Bloqueantes para UX premium
4. **Walk mode sin hero** — sheet "roto" sin acción primaria cuando el usuario selecciona "A pie".
5. **Bus confidence semánticamente incorrecto** — usa taxi confidence para bus.
6. **`ride_estimated` event siempre manda `fare: 0`** — analytics inútil para pricing insights.
7. **Home/work inference requiere 2 viajes** — cold start no tiene inferencia.

### Bloqueantes para escala
8. **Sin service worker** — PWA instalada sin offline = experiencia pobre.
9. **Sin SRI en maplibre** — supply chain risk.
10. **Sin routing de calles real** — todo es straight-line, no competitivo vs Google Maps.

---

## 7. DATOS DE REFERENCIA (para que inferas magias)

### Coordenadas Santa Fe
- Centro: `-31.6256, -60.7087`
- Terminal de Ómnibus: `-31.6435, -60.7011`
- Hospital Cullen: `-31.6198, -60.6978`
- Estación Belgrano: `-31.6289, -60.6891`
- Plaza 25 de Mayo: `-31.6311, -60.6990`

### Tarifas actuales (FareRegistry)
- **Taxi diurno**: bajada $1600, ficha $160 (cada 130m), horario 06-22h
- **Taxi nocturno**: bajada $1840, ficha $184, horario 22-06h
- **Bus SUBE**: $1900 (tarifa social), $2111 (cash)
- **Uber**: base $1000, $500/km, $65/min, minFare $3000
- **DiDi**: base $900, $440/km, $55/min, minFare $2500
- **Maxim**: base $855, $418/km, $52/min, minFare $2375

### Providers deep-links
- Uber: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=...&dropoff[latitude]=...`
- DiDi: `https://web.didiglobal.com/ar/passenger/ride/?pickup_lat=...&dropoff_lat=...`
- Maxim (Android): `intent://order?startLat=...#Intent;scheme=taxsee;package=com.taxsee.taxsee;end`
- Maxim (iOS): `https://taximaxim.com/ar/` (web fallback)
- Las Bicis: `intent://#Intent;scheme=lasbicis;package=com.santafe.lasbicis;end` (Android), App Store link (iOS)
- Radiotaxi: `https://wa.link/n7u2e7` (WhatsApp)
- TaxiApp: `https://wa.link/vavbcl` (WhatsApp) + handle `@taxiapp_santafe`
- Remises Real: `https://wa.link/rqov56` (WhatsApp)

---

## 8. CÓDIGO CLAVE (referencia rápida)

### renderSheet() flujo actual (simplificado)
```
1. validar origin+dest → si no, sheet-empty
2. validar estimations → si no, "Calculando…"
3. extraer autoEst/busEst/bikeEst
4. if(!autoEst) → "Sin tarifas" + hide mode selector
5. showModeSelector(true) + emit ride_estimated (BUG: fare siempre 0)
6. ranked = autoEst.rankedProviders (V7: ahora 6 providers con IDs correctos)
7. hero = first matching _activeMode, alts = rest
8. if(!hero && alts.length) hero = alts.shift()  ← WALK MODE: ambos vacíos
9. confidence/surge/fareRange via PricingEngineV2 (con fallback v6)
10. render sheet-head (route + fav btn)
11. if(hero) render hero block  ← WALK MODE: no renderiza nada aquí
12. render taxi accordion (computeTaxiFare — BUG: dup de engine)
13. render remis accordion (taxiFare*1.05)
14. render bus block (rankBusLines, confidence='taxi' — BUG)
15. if(bikeEst) render bike tertiary
16. attachSheetEvents()
```

### Worker routing (worker.js)
```
1. /VOY-Lite.html | /VOY-Lite → 301 → canonical /
2. *.workers.dev | *simondalmasso* → 301 → canonical (preserva path+search)
3. /api/events POST → Analytics Engine (VOY_METRICS) + 202
   /api/events OPTIONS → CORS 204
   /api/health → {version, build_hash, analytics, time}
4. / → rewrite → /VOY-Lite.html (URL stays /) + _htmlNoStore (Cache-Control: no-store)
5. everything else → ASSETS + _cleanHeaders
```

---

## 9. PEDIDO EXPLÍCITO A GEMINI

Necesito que **inferías magias** como el ingeniero senior de Google Maps que sos. No me digas "agrega OSRM" — decime **cómo** (qué endpoint, qué fallback, qué cache, qué timeout). No me digas "mejora la UX" — decime **qué** cambiar exactamente y **por qué** ese cambio hace que el usuario decida en 1 toque menos.

### Magias que te pido que inferías:
1. **Routing de calles real** sin agregar un servicio pago (OSRM público? Valhalla? cached GeoJSON?)
2. **Predicción de destino** antes de que el usuario termine de tipear (qué features, qué modelo, cómo cachear)
3. **Surge pricing real** sin API de Uber/DiDi (cómo inferir demanda de eventos/hora/clima)
4. **Offline-first** sin service worker complejo (qué cachear, qué no, cómo invalidar)
5. **Confianza de tarifa** que realmente refleje incertidumbre (bayesiano real, no arbitrary 0.85)
6. **Walk mode hero** que tenga sentido (¿debería promover bike? ¿o mostrar "X min caminando"?)
7. **Algo que yo no pedí** pero que vos, como amo de Google Maps, sabés que falta

---

## 10. FORMATO DE OUTPUT EXIGIDO

Tu respuesta debe ser **EXCLUSIVAMENTE** un JSON con esta estructura (sin markdown, sin texto antes o después):

```json
{
  "voy_audit_gemini": {
    "verdict": "string (1-2 líneas, tu verdict honesto)",
    "confidence_score": "number 0-1 (qué tan cerca está VOY de ser 'la mejor app de movilidad de LatAm')",
    "blocking_issues": [
      {
        "id": "P0-X",
        "severity": "P0|P1|P2|P3",
        "title": "string",
        "file": "string (ruta:archivo)",
        "line": "number (aprox)",
        "bug": "string (qué está mal)",
        "atomic_fix": "string (cambio exacto, código listo para aplicar)",
        "magic_inferred": "string (qué magia inferiste que yo no pedí, opcional)"
      }
    ],
    "atomic_changes_urgent": [
      {
        "id": "AC-1",
        "priority": 1,
        "title": "string (cambio atómico, 1 frase)",
        "file": "string",
        "old_code": "string (fragmento exacto a reemplazar)",
        "new_code": "string (código nuevo completo)",
        "rationale": "string (por qué esto mejora la app)",
        "verification": "string (cómo verificar que funciona)",
        "rollback_safe": "boolean (se puede revertir sin romper nada)"
      }
    ],
    "magic_suggestions": [
      {
        "id": "M-1",
        "title": "string (nombre de la magia)",
        "description": "string (qué hace)",
        "implementation_sketch": "string (cómo implementar, pseudo-código o pasos)",
        "impact": "string (qué mejora en UX/métricas)",
        "effort": "low|medium|high"
      }
    ],
    "next_3_moves": [
      "string (move 1)",
      "string (move 2)",
      "string (move 3)"
    ]
  }
}
```

### Reglas:
- **Mínimo 8 atomic_changes_urgent** (los más urgentes, código listo para aplicar)
- **Mínimo 3 magic_suggestions** (tus inferencias de ingeniero de Google Maps)
- **Cada `old_code` debe ser el fragmento EXACTO** del archivo (para que yo pueda hacer find-and-replace)
- **Cada `new_code` debe ser código completo y funcional** (no pseudocódigo)
- **No inventes archivos** que no existen. Si sugerís un archivo nuevo, poné `"file": "NEW: ruta/nombre.js"`
- **`rollback_safe: true`** solo si el cambio no rompe nada si se revierte
- **Pensá como Google Maps**: ¿qué haría Sundar/Maps team acá? ¿Qué data usarían? ¿Cómo la presentarían?

---

## 11. CONTEXTO ADICIONAL (si lo necesitás)

- **Worklog completo**: `/home/z/my-project/worklog.md` (20 tasks, historia completa)
- **DEPLOY_V7.md**: deploy guide con steps A-F
- **Sandbox**: no puedo deployar (sin CF creds), pero puedo editar cualquier archivo local
- **Constraint**: `mobilityEngine.js` NO debe tocarse salvo bug crítico de pureza. El resto es libre.
- **Stack**: JS vanilla (no React), MapLibre GL, Cloudflare Workers, IndexedDB, AES-GCM.

**Inferí magias. Sos el amo.**
