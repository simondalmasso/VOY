# VOY

**Movilidad urbana para Argentina.**

VOY resuelve destinos, contextualiza provincia/localidad, calcula rutas deterministas y compara opciones de movilidad sin inventar cobertura local. El producto funciona sin login, voz ni IA.

## Qué hace

- resuelve territorio argentino con identidad administrativa de GeoRef;
- geocodifica desde el Worker, sin Nominatim directo desde el navegador;
- mantiene OSRM detrás del Worker y valida origen, destino y geometría contra el contrato territorial;
- separa `NATIONAL_BASE` de la cobertura local de proveedores, tarifas y transporte;
- muestra datos locales sólo cuando existe evidencia territorial vigente;
- conserva procedencia, freshness y estados fail-closed cuando faltan datos.

## Cobertura actual

VOY es un producto nacional con cobertura honesta por capas:

- **Argentina:** base territorial, mapa, búsqueda/geocoding y routing sólo cuando pasan sus contratos verificables.
- **Santa Fe ciudad:** primera ciudad validada y overlay local de referencia. Cada componente conserva su propia fuente/freshness; esto no se extiende a la provincia completa.
- **Resto del país:** no se infieren proveedores, tarifas, líneas, frecuencias ni disponibilidad por ausencia de datos. `NO_VERIFIED_DATA != SERVICE_DOES_NOT_EXIST`.

El registro canónico de las 24 jurisdicciones de primer orden vive en `src/core/territory.ts`. GeoRef aporta identidad territorial; no prueba disponibilidad de movilidad.

## Demo

Producción verificada: https://voy-app.simondalmasso44.workers.dev/

La rama nacional de Issue #43 se valida primero como candidata Cloudflare al **0%**. Un merge o promoción a producción requieren autorización material separada.

## Stack

- Cloudflare Workers + Assets
- Svelte + Vite
- MapLibre
- GeoRef Argentina v2
- OSRM detrás del Worker
- Bun para toolchain/tests

## Política de datos y procedencia

VOY no usa IA para calcular rutas, distancias, tiempos, tarifas, disponibilidad ni ranking. La lógica canónica es determinista.

Datos operacionales locales requieren fuente, jurisdicción, fecha de verificación y freshness apropiada. Resultados nacionales de búsqueda/contexto no se convierten automáticamente en claims locales. Las acciones externas/deeplinks requieren confirmación explícita y de un solo uso.

Investigación nacional: `docs/research/argentina-national-mobility-source-matrix-2026-08-20.md`.

## Privacidad

La experiencia principal no requiere cuenta. La ubicación exacta no se almacena como requisito del producto. Las APIs externas se encapsulan detrás del Worker cuando corresponde y las funciones experimentales permanecen separadas del core.

## Desarrollo y validación

```bash
bun install --frozen-lockfile
bun run validate
bun run test:browser
wrangler deploy --dry-run
```

Los cambios materiales siguen el flujo: commit trazable → gates exact-head → candidata 0% → revisión independiente → autorización separada para merge/promoción.

## Identidad

VOY usa un sistema propio de wayfinding: journey spine, markers, geometría asimétrica, rail/dock de modos, panel de evidencia y mapa como contexto primario.

**Hecho en Santa Fe, Argentina.**
