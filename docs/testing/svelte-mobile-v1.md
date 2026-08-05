# Svelte Mobile V1 validation

The pull-request and final candidate gates run:

- frozen Bun installation;
- strict TypeScript and `svelte-check`;
- ESLint;
- deterministic unit tests plus retained valid Worker API tests;
- Vite production build and gzip budgets;
- Wrangler dry-run from the Vite-generated deployment config;
- clean browser validation at 360×800, 360×780, 390×844, 412×915, 430×932 and 1280×800;
- touch-target, overflow, 200% text, rotation, offline, PWA and legal-route checks;
- exact-version candidate API, assets, bindings, traffic, tail and 20-round/120-second convergence.

Browser tests block direct Nominatim or OSRM calls from the browser. Candidate API tests exercise the server-side routing boundary separately.
