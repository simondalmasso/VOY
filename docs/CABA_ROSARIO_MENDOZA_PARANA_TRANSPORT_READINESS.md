# Transport integration readiness: CABA, Rosario, Mendoza, Paraná

Status date: 2026-10-19. This document separates source discovery from production integration.

## CABA

- Official API documentation lists realtime vehicle positions for colectivos and trains, including `/colectivos/vehiclePositionsSimple` and `/trenes/vehiclePositions`.
- Official BA Data dataset page currently warns that API and GTFS resources are suspended pending review/correction. A visible Swagger endpoint is not proof that live requests are currently served.
- Adapter scaffold: `src/caba-transport-adapter.js`. Automated tests use obviously fake credentials only; they make no real network calls.
- Required before activation: owner-issued credentials; verify the current gateway host, authentication contract, response schema, license/reuse terms, rate limits, and successful live responses. Store credentials as Cloudflare Worker secrets, never in source control or browser code.
- The adapter intentionally fails closed without both secrets and does not cache or reuse stale data. It is not yet wired into production request handlers.

Official references:
- https://datosabiertos-apis.buenosaires.gob.ar/BA_Root/Documentacion?schema_name=Transporte_3
- https://data.buenosaires.gob.ar/es/dataset/api-transporte-publico

## Rosario

- Official municipal open-data catalog exposes transport-route/stop/time-table datasets; the public transport page and these datasets are not evidence of current vehicle GPS.
- Current VOY integration remains official handoff plus historical/static data where explicitly dated. Do not label this realtime.
- Next safe step: identify and verify the current resource URLs and schemas for routes, stops and schedules; ingest only with source date and license metadata.

Official references:
- https://datosabiertos.rosario.gob.ar/dataset/0b90de4c-f00f-43ee-8989-949557f919bc
- https://www.rosario.gob.ar/inicio/transporte-urbano-de-pasajeros

## Mendoza

- MendoTran is the official passenger-facing service. No authorized public realtime vehicle-position API has yet been verified in this repository.
- Keep the official handoff; do not scrape app traffic or infer GPS from route maps.
- Next safe step: verify whether Mendoza provides a documented open GTFS/GTFS-RT or developer API and its reuse terms.

Official reference:
- https://mendotran.mendoza.gov.ar/

## Paraná

- The national geographic catalogue covers Paraná, but that is not transport coverage.
- No authorized public bus GPS or rail realtime feed has yet been verified in this repository.
- Keep coverage unknown/official handoff until a documented dataset/API, freshness contract and reuse terms are verified. Do not infer service from station or route geometry.

## Release gate

No production activation until: tests pass; source and schema are independently verified; credentials are bound as Worker secrets; freshness and outage behavior are tested; UI clearly distinguishes realtime, scheduled, static and unknown; and a reviewed PR is merged separately from deployment.
