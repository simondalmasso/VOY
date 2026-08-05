# Svelte V1 performance budgets

The release gate records dependency count, lockfile digest, build output size and gzip sizes.

- Critical initial JavaScript excluding MapLibre, Voice and Auth chunks: at most 100 KiB gzip.
- Initial CSS: at most 25 KiB gzip.
- MapLibre: required lazy chunk.
- Voice: required lazy chunk.
- Source maps: disabled in production.
- No React, Next.js, SvelteKit, Tailwind or heavy UI component library.

`node scripts/check-bundle-budgets.mjs` is the executable contract.
