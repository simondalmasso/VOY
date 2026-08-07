# VOY product completion matrix

| Surface | Completion contract |
|---|---|
| Santa Fe core | origin, authoritative destination and deterministic comparison with honest unknown states |
| Destination provenance | only per-item authoritative runtime records are operational; issuer, source, coordinate method, precision and verification date are mandatory |
| Destination UI | authoritative result shows official address/source; weaker Worker references remain explicitly unverified and disabled even when they contain an address |
| Destination actions | route, fare, map, ranking and provider actions fail closed unless the selected destination is authoritative and operational |
| UI | Svelte 5 mobile-first at 360/390/412/430, desktop support, no dead controls or horizontal overflow |
| Public product surface | one canonical generated Svelte `index.html`; no alternate monolithic VOY HTML, navigator runtime or public diagnostic page |
| Public runtime data | exact allowlist of current territorial contracts under `/cities/`; no root city aliases, stale bus arrays or private-app formulas |
| Retired routes | known legacy product/data paths return safe `410` before `ASSETS` and never expose historical bytes or claims |
| Build assets | every source and emitted file is classified by `config/production-assets.json`; CI fails on missing, retired, forbidden or unclassified assets |
| Search | authoritative local-first destinations, abortable Worker geocoding, stale-response suppression and explicit unverified state |
| Routing | Worker-only road/foot routing; cycling and failed routing use labelled straight-line reference with no fake map line |
| Collective | no line, stop, route, direction, wait or frequency recommendation without current authoritative data |
| Fares | regulated taxi/remis values with source/date; private apps remain `APP_ONLY` |
| Providers | only verified external app actions are buttons; taxi/remis/walk/bike/bus are accessible information surfaces |
| Map | lazy MapLibre, point markers, route line only for verified OSRM geometry, deterministic comparison survives tile failure |
| Voice | lazy bounded typed mobility interface, same authoritative destination gate, fail-closed, text fallback, no audio/transcript persistence |
| Auth | optional ephemeral implementation, fail-closed and disabled without external public config/secret |
| Privacy | analytics opt-in only, GPC/DNT, no exact location/audio/transcript persistence |
| PWA | VOY-only cache migration, network-first city freshness, offline shell, controlled one-time update reload |
| Accessibility | semantic controls, keyboard focus, 48px targets, 200% text, reduced motion and named status regions |
| Validation | real runtime destination success, forged/unverified negatives, public-asset allowlist, retired-route HTTP probes, frozen install, exact-head CI, typecheck, lint, tests, build, budgets, dry-run, clean browser matrix and candidate evidence |
