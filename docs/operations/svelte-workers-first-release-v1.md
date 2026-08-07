# Svelte Workers-first release V1

1. Finish all source, test, workflow and documentation changes on PR #31.
2. Remove mission-only transport workflows before candidate creation.
3. Run frozen install, typecheck, lint, tests, build, budgets, dry-run and browser gates.
4. Reconstruct Cloudflare deployment, traffic, public health and bindings.
5. Upload exactly one Worker version from the final exact Git head.
6. Create one deployment preserving the verified stable version at 100% and the new Svelte candidate at 0%.
7. Validate build identity, bindings, static hashes, SPA routes, APIs, privacy, security, PWA, required viewports, Voice/Auth boundaries and exact-version tail.
8. Persist one immutable evidence artifact and material checkpoints in PR #31 and Issue #30.
9. Stop before productive traffic. Promotion requires independent AUD PASS and a new exact authorization from Simón.

The prior candidate `d771226a-760b-45a2-8ae8-1fe66d8eb896` is superseded and must never be promoted.
