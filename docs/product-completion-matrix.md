# VOY product completion matrix

| Surface | Completion contract |
|---|---|
| Santa Fe core | origin, destination and deterministic comparison with honest unknown states |
| UI | Svelte 5 mobile-first at 360/390/412/430, desktop support, no dead controls or horizontal overflow |
| Search | local-first destinations, abortable Worker geocoding, stale-response suppression and explicit ambiguity |
| Routing | Worker-only road/foot routing; cycling and failed routing use labelled straight-line reference with no fake map line |
| Collective | no line, stop, route, direction, wait or frequency recommendation without current authoritative data |
| Fares | regulated taxi/remis values with source/date; private apps remain `APP_ONLY` |
| Providers | only verified external app actions are buttons; taxi/remis/walk/bike/bus are accessible information surfaces |
| Map | lazy MapLibre, point markers, route line only for verified OSRM geometry, deterministic comparison survives tile failure |
| Voice | lazy bounded typed mobility interface, fail-closed, text fallback, no audio/transcript persistence |
| Auth | optional ephemeral implementation, fail-closed and disabled without external public config/secret |
| Privacy | analytics opt-in only, GPC/DNT, no exact location/audio/transcript persistence |
| PWA | VOY-only cache migration, network-first city freshness, offline shell, controlled one-time update reload |
| Accessibility | semantic controls, keyboard focus, 48px targets, 200% text, reduced motion and named status regions |
| Validation | frozen install, exact-head CI, typecheck, lint, tests, build, budgets, dry-run, clean browser matrix and candidate evidence |
