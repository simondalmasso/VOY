# Security Policy

## Supported code

Security work targets the current canonical release line. Historical ORDER branches, archived evidence and superseded experiments are not supported release channels.

Until the OSS candidate is promoted, the current runtime candidate is `release/order076-oss-candidate`; after promotion, `main` becomes the only canonical development/release base.

## Reporting a vulnerability

Do not publish exploit details, secrets, private transit credentials or sensitive location data in a public issue.

Prefer GitHub's private security reporting / Security Advisory flow for this repository. If a private reporting control is unavailable, contact the maintainer through the GitHub profile first and establish a private channel before sharing technical details.

Include the affected commit/release, impact, attack preconditions, a minimal reproduction, whether secrets/personal data/exact location are involved, and a mitigation if known.

## Security boundaries

VOY intentionally avoids several classes of risk:

- no hidden/private transit APIs or extracted app credentials;
- no fabricated realtime fallback;
- no new analytics vendor in the current runtime;
- no runtime Overpass/Firecrawl scraping path;
- bounded upstream calls and explicit failure states;
- 3D is optional and cannot become the source of mobility truth.

A source becoming stale, unavailable or unverifiable must degrade to `unknown`, scheduled/static facts or an explicit no-live state—not to invented facts.

## Dependency and release handling

Canonical CI runs unit tests, deterministic build, production dependency audit and a Wrangler dry-run. Release evidence must bind source SHA, build ID and deployed identity before a release is called complete.

Never commit Cloudflare tokens, API keys, private feeds or credentials to issues, PRs, fixtures or evidence artifacts.
