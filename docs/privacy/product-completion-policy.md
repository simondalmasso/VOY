# Product privacy and security completion policy

Effective 2026-08-04.

VOY works without login, Voice or AI. It does not persist trip history, raw Google credentials, audio, transcripts or precise user location. Voice context is request/session scoped and bounded. External provider actions require explicit, expiring, single-use confirmation.

Analytics honors Global Privacy Control, Do Not Track and the VOY opt-out cookie before analytics processing. Exact location, Voice content and authentication identifiers are excluded from analytics.

The browser cannot call Nominatim directly; geocoding crosses the Worker boundary and its Durable Object rate/cache contract. API requests, form bodies, streaming responses and tool arguments are bounded. Voice uses a closed typed allowlist and cannot execute model-generated code, SQL or unrestricted fetches.

Public surfaces:

- `/privacy`
- `/terms`
- `/sources`
- `/contact`

Security reports use GitHub private security advisories; ordinary feedback uses the public issue tracker.
