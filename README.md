# VOY

**Movilidad urbana para Argentina. Hecho en Santa Fe.**

VOY es una PWA liviana para resolver destinos y comparar opciones de movilidad sin confundir arquitectura nacional con cobertura local verificada.

Producción: <https://voy-app.simondalmasso44.workers.dev/>

## Producto

- Guest-first: buscar, resolver territorio, calcular rutas y comparar no requiere cuenta.
- 24 jurisdicciones argentinas diferenciadas mediante identidad territorial GeoRef V2.
- Santa Fe ciudad es la primera referencia con cobertura local validada por componente.
- Fuera de una cobertura local verificada, VOY no inventa proveedores, tarifas ni transporte público.
- Nominatim y OSRM quedan detrás del Cloudflare Worker; el navegador no llama esos upstreams directamente.
- Precios de apps privadas permanecen `APP_ONLY` si no existe una fuente actual permitida.
- Colectivo permanece fail-closed sin recorridos/paradas/frecuencias vigentes y validados.
- El núcleo no depende de login, voz ni IA.

## Cuenta opcional

ORDER-046 incorpora Sign in with Google / GIS compatible con FedCM detrás de `GOOGLE_AUTH_ENABLED=false` por defecto. La identidad persistida se limita a `provider=google` + `provider_sub`, un ID VOY opaco, preferencias no sensibles y sesiones revocables hash-only en D1.

VOY no persiste por cuenta email, nombre, avatar, ID/access/refresh tokens de Google, historial de viajes, direcciones, coordenadas exactas, consultas, audio o transcripciones.

## Arquitectura

```text
Browser / Svelte 5 PWA
  -> Cloudflare Worker typed APIs
     -> territory: GeoRef Argentina V2
     -> geocode: Worker-bound OSM/Nominatim complement
     -> route: Worker-bound OSRM + territorial validation
     -> capability broker: territorial truth/freshness
     -> optional auth: Google ID token verification + D1 sessions
```

La IA, cuando está habilitada, interpreta y explica. No calcula la ruta, distancia, tarifa, disponibilidad o ranking canónico.

## Desarrollo

Requiere Bun según los workflows del repositorio.

```bash
bun install --frozen-lockfile
bun run validate
bun run test:browser
bunx wrangler deploy --dry-run
```

No copies `.env` al repositorio. `.env.example` contiene únicamente nombres/valores de desarrollo seguros. Secretos reales deben permanecer en el control plane correspondiente.

## Verificación

El gate de ORDER-046 reconcilia frozen install, typecheck, lint, inventario completo de tests, build, assets, budgets, Wrangler dry-run, browser/PWA y evidencia exact-head. Los cambios de runtime materiales se validan primero como versión Cloudflare trazable con 0% de tráfico productivo.

## Verdad y cobertura

- `/coverage`: estado territorial y alcance local.
- `/sources`: metodología y fuentes.
- `/privacy`: comportamiento real de datos y cuenta.
- `/terms`: límites del servicio.
- `/support`: canal público verificable de soporte.

`UNKNOWN != UNAVAILABLE`. Un dato no verificado no se transforma en una afirmación negativa ni en una estimación inventada.

## Seguridad y privacidad

Las acciones externas requieren confirmación explícita y de un solo uso. APIs sensibles aplican límites de payload y controles same-origin/CSRF según corresponda. Analytics y observabilidad no deben transportar búsquedas crudas, coordenadas exactas, rutas, identificadores Google/VOY, tokens, audio o transcripciones.

## Licencias y terceros

Cada dataset conserva su propia procedencia/licencia. GeoRef aporta identidad administrativa; OpenStreetMap/Nominatim y OSRM tienen roles separados y no prueban disponibilidad de servicios de movilidad. Consultá `/sources` para el contrato público de fuentes.
