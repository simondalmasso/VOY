# VOY Multicity / TrackerView release-candidate evidence

Date: 2026-10-19  
Branch: `feat/multicity-transit-trackerview-20261019`  
Base: `5737290687fbf6ca472caba2ea2ce10d3da21ce7`

## Delivered in this branch

- Map-first city picker for Santa Fe, Paraná, Rosario, Mendoza, and Buenos Aires.
- Transport mode picker for colectivos and trains.
- Map re-centering on city changes.
- Visible temporal-truth pill with explicit no-current-positions, source-unavailable, and no-coverage wording.
- Train mode uses the existing bounded nearby-station/radar endpoint and labels the station corpus as historical; it does not claim live train positions.
- Santa Fe's existing bus route/GPS path remains city-and-mode gated. It is not reused for other cities.
- Buenos Aires open-data registration/API lead tracked at https://github.com/simondalmasso/VOY/issues/102 and in `docs/integrations/BA_DATA_ABIERTA_REGISTRATION_PENDING.md`.

## Verification evidence

- `npm test`: PASS, 385 tests, 0 failures.
- `npm run build`: PASS on commit `5dcf9546f71d782e7a38ad7a8d79e4a3b6ef5085`; build ID is generated from the source digest and is intentionally not duplicated here.
- `npm audit --omit=dev`: PASS, 0 vulnerabilities in production dependencies.
- Full `npm audit` previously reported 4 high-severity findings in development-only dependency paths (Wrangler/Miniflare/sharp/undici); no dependency upgrade was forced here.
- `node --check public/app.js`: PASS.
- `git -c core.whitespace=cr-at-eol diff --check`: PASS.
- Wrangler `deploy --dry-run`: PASS; 61 client assets read, 3780.42 KiB total upload estimate / 1110.15 KiB gzip.
- Browser smoke on local Wrangler worker, Chrome headless, viewport 390x844: PASS. Tested Rosario/colectivos, Rosario/trenes, Buenos Aires/colectivos, and Santa Fe/colectivos. Truth pill visible; no horizontal overflow; no uncaught page errors; local train-radar endpoint returned HTTP 200.
- Request-cost implementation: optional route catalog, development fixtures, and unused bus icon removed from service-worker install precache; fixtures load only for explicit `?fixture=realtime`; cache-on-demand remains; revalidation windows and map-tile preconnects added.
- Performance evidence limitation: GLM's report states a 9-round interleaved benchmark and claims 4 fewer first-visit requests / 45 KB less wire in PWA mode. The original `order099-request-cost.patch` and its `perf-matrix.mjs` were not available in this workspace, so those numeric deltas have **not** been independently reproduced for this commit. Treat them as reported upstream, not as verified branch measurements.

## Coverage and truth limits

This is a city/mode navigation and truthfulness milestone, **not full five-city live-data integration**.

- Santa Fe: retains the existing Cuándo Pasa adapter and published bus geometry; the live feed must still be judged by each fresh source response.
- Paraná, Rosario, Mendoza: bus live feeds and city-specific route geometry are not integrated by this branch; UI says coverage is not available rather than borrowing Santa Fe data.
- Buenos Aires: official API registration is awaiting response. Candidate endpoints are user-reported and not yet independently verified; no authenticated requests were made.
- Trains: station discovery/catalogue is historical and live train positions are not claimed.
- Subte and EcoBici remain future optional scope after official access/terms/schema verification.

## Promotion status

```text
MAIN_MUTATED=NO
MERGED=NO
DEPLOYED=NO
PRODUCTION_PROBED=NO
RELEASE_CANDIDATE=LOCAL_VERIFIED
```

Promotion must follow repository review/CI. Deployment must use the exact reviewed commit and then receive a production smoke check. Do not treat the local build ID as the production release ID.
