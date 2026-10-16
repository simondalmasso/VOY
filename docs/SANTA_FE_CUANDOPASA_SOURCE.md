# Cuándo Pasa — fuente de posiciones GPS en vivo (evidencia 2026-10-16)

Investigación ejecutada bajo autorización de inspección concedida por el dueño de la app
(Nico Cavallini). Modo: `VERIFY > ASSUME / EVIDENCE FIRST / NO_FAKE_DATA`. Nada de lo
documentado aquí es una invención: cada afirmación tiene comando reproducible.

## 1. APK inspeccionado

- XAPK: `Cuándo+Pasa_+-_Santa+Fe_6.3.3_APKPure.xapk` — 54.133.827 bytes,
  SHA-256 `88271368785b43c27428d1712c16fe74b2f3fd7059b36a3822dde02a0ad79d94` (idéntico al registrado en `docs/SANTA_FE_GPS_APK_EVIDENCE.md`).
- Paquete `ncdev.cuandopasa` (versionCode 524, Expo SDK 57, React Native + Hermes).
- Bundle: `assets/index.android.bundle` 6.242.824 bytes, Hermes bytecode versión 98.
- Herramienta de ingeniería inversa: `hermes-dec` (P1 Security, clonado de
  `https://github.com/P1sec/hermes-dec`) — desensamblado completo (67 MB) y
  decompilado a pseudo-JS (33 MB). El análisis de strings por concatenación era
  ambiguo; el disassembler resolvió funciones y constantes exactas.
- Nota de entorno: la captura física con PCAPdroid sobre el A22 (`R58R84BRDXP`)
  no es ejecutable desde este sandbox (sin adb/dispositivo). Se reemplazó por
  análisis estático del bundle + sondeo reproducible de los endpoints, que produce
  evidencia superior (TLS no descifrado solo daría host/SNI, no el JSON).

## 2. Hosts y endpoints verificados

La app contiene exactamente dos hosts API (`api.cuandopasa.app` legacy y
`api.cuandopasa.com.ar` actual). El primero responde en paths conocidos; el 301 a la
landing ocurre solo en paths desconocidos.

| Endpoint | Método | Estado | Contenido |
|---|---|---|---|
| `https://api.cuandopasa.app/version_v2` | GET | 200 text/plain | versión del bundle estático, p.ej. `20261009092745` |
| `https://api.cuandopasa.app/data_v2` | GET | 200 application/json | bundle estático GTFS-like 1.162.092 bytes: `stops` (1718), `routes` (23), `trips`, `x_stop_code_to_stop_id`, … |
| `https://api.cuandopasa.app/alerts` | GET | 200 application/json | alertas de servicio versionadas (GTFS-RT style: cause/effect/severity/informed_entities) |
| **`https://api.cuandopasa.com.ar/v0/stops/{x_stop_code}/arrivals?source=poll`** | GET | 200 application/json | **posiciones GPS en vivo de colectivos** (ver §3) |
| `https://api.cuandopasa.com.ar/v1/routes/{route_id}` | GET | 200 application/json | bundle de ruta con geometría (41 KB para SF09) |
| `https://api.cuandopasa.com.ar/v1/journeys/plan?group=v1` | POST | 200 (valida body) | planificador de viajes (zod server-side) |
| `https://api.cuandopasa.com.ar/v1/places/search?` / `reverse?` | GET | 200 | geocoding |
| `https://api.cuandopasa.com.ar/v0/stops/{stopId}/reports` | POST | (auth) | reportes de usuarios, `Authorization: Bearer` — NO usado por VOY |

No hay GraphQL, WebSocket ni SSE: HTTP GET con polling (React Query `refetchInterval`
en la app). Cliente HTTP de la app: nitrofetch.

## 3. Esquema del endpoint de posiciones (verificado en vivo)

`GET /v0/stops/704/arrivals?source=poll` (704 = parada de línea 9, radicación
`x_stop_code_to_stop_id` del `data_v2`):

```json
{"CodigoEstado":0,"MensajeEstado":"ok","arribos":[
 {"DescripcionLinea":"9","DescripcionBandera":"AL POZO","Arribo":"5 min. aprox.",
  "Latitud":"-31.65173","Longitud":"-60.713448",
  "LatitudParada":"-31.647121","LongitudParada":"-60.700868",
  "EsAdaptado":"True","IdentificadorCoche":"3228",
  "IdentificadorChofer":"MARQUEZ H. (40089)","DesvioHorario":"-02:21",
  "UltimaFechaHoraGPS":"16/10/2026 17:33:49","MensajeError":"","CodigoLineaParada":"75"}]}
```

- `Latitud`/`Longitud`: **posición del colectivo** (strings, South-Santa Fe válidas).
- `UltimaFechaHoraGPS`: timestamp del GPS del coche, formato `dd/MM/yyyy HH:mm:ss`
  en hora Argentina (ART = UTC-3 fijo, sin DST). Verificado por coherencia temporal:
  consulta a las 17:34:02 ART devolvió GPS 17:33:49 (13 s de edad); dos ciclos a 75 s
  produjeron edades 38–100 s coherentes solo bajo UTC-3.
- `IdentificadorCoche`: identidad del vehículo (3228, 4120, 4159…).
- `CodigoLineaParada`: código de línea en la parada (`75` = línea 9 = SF09) — usado
  por la app para filtrar (`arribos.filter(a => a.CodigoLineaParada === x_line_code)`).
- `DesvioHorario`: desvío horario firmado `±HH:MM`.
- `IdentificadorChofer`: **identidad personal del chofer — VOY no la transporta**.
- Headers de respuesta: `x-cache-source: fresh|cache|stale` y `x-data-fetched-at`
  (ISO UTC) — la frescura del lado fuente es observable, no inferida.
- Gate: `CodigoEstado === 0 && MensajeEstado === 'ok'`; vacío con
  `MensajeEstado='Sin datos disponibles para esta parada'`; 404 JSON
  `{"error":{"kind":"StopNotFound"}}` para paradas inexistentes.

## 4. Mapeo interno de la app (del decompilado)

`mapData` (decompiled): `{id: (IdentificadorChofer+'-'+IdentificadorCoche).replace(/\s+/g,''),
x_line_id: CodigoLineaParada, x_trip_id: DescripcionBandera,
position: {latitude: parseFloat(Latitud), longitude: parseFloat(Longitud), timestamp: UltimaFechaHoraGPS},
prediction: Arribo==='Arribando..' ? 0 : parseInt(Aribo)}`.
El mapa de la app consulta arrivals para cada `raw_stop` de la ruta
(`getStopPredictionMapContent`) y deduplica por id de bus (`dedupeByBusId`).
Polling con React Query (`refetchInterval`, `gcTime: 20000`); constante de la app
`POSITION_MAX_AGE_5_MIN` (tolerancia propia del cliente de la fuente: 5 minutos).

## 5. Frecuencia y limitaciones observadas

- Edad del GPS a la recepción (x-cache-source=fresh): 38–80 s típicos; el upstream
  refresca cada ~30–60 s por coche. Intervalo de refresco efectivo del feed por parada:
  ≥ 15–60 s (cache del lado fuente).
- Cada parada devuelve los próximos ~3–4 coches (ETA hasta ~33 min): el muestreo de
  varias paradas de la línea (stride) cubre los coches activos de la línea.
- Macro-paradas devuelven múltiples líneas; el filtro por `CodigoLineaParada` es
  imprescindible.
- Sin autenticación para los endpoints GET. Rate-limiting no observado con polling
  moderado (≤ 24 llamadas por request, cache 5 s).

## 6. Reproducción

```bash
curl -sS 'https://api.cuandopasa.app/version_v2'
curl -sS 'https://api.cuandopasa.app/data_v2' | head -c 400
curl -sSD - 'https://api.cuandopasa.com.ar/v0/stops/704/arrivals?source=poll'   # body + headers
python3 scripts/live-cycle-proof.py 704 75     # dos ciclos, movimiento y timestamps (evidencia)
node scripts/sf-cuandopasa-live-proof.mjs 9 75 # dos ciclos a través del adaptador VOY
node scripts/sf-gps-evidence.mjs               # E2E browser: marcadores 2D/3D + zoom
```

Evidencia cruda de esta sesión: `artifacts-live/` (JSON de ciclos y capturas PNG) y
los scripts anteriores. `x_stop_code` válidos adicionales: 705, 706, 110052 (macro).
