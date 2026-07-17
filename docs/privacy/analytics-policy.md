# VOY Analytics and Telemetry Policy

Effective date: 2026-07-17  
Applies to: VOY consumer PWA and Cloudflare Worker endpoints `/api/events` and `/api/telemetry`

## Purpose

VOY uses minimized operational analytics to understand whether trip comparisons render, which transport/provider actions are opened and whether the application has browser errors or poor loading performance. Analytics must never be required for the mobility product to function.

## Product events

The Worker accepts only three normalized event classes:

- `estimation`;
- `provider_tap`;
- `search`.

Before an event reaches Analytics Engine, the security boundary removes caller-controlled identifiers, exact geo strings, destination text and arbitrary nested fields. The allowed data fields are:

- provider token;
- mode token;
- estimated price;
- estimated time in minutes;
- estimated distance in kilometres.

Values are bounded. Unknown event names are discarded. A request contains at most 20 events and at most 16 KiB.

## Browser telemetry

The telemetry endpoint accepts only:

- `lcp`;
- `js_error`;
- `promise_rejection`.

Routes are reduced to a safe pathname. Query strings, fragments, complete URLs, private address text and arbitrary error payloads are not accepted by the Worker boundary. Telemetry requests are limited to 4 KiB.

## Location and identity

VOY analytics must not store:

- raw GPS coordinates;
- full origin or destination text;
- home/work labels associated with identity;
- raw IP in Analytics Engine;
- names, email addresses or account identifiers;
- conversations, prompts or audio.

The Worker may transiently read the connection IP to apply configured owner/developer exclusions and geocoding rate limits. It does not write that IP to the product analytics dataset.

## Session cookie

For ordinary traffic, the HTML response may create `voy_sid`, a random eight-character analytics session identifier. Its maximum age is one day and it is sent with `Secure`, `HttpOnly`, `SameSite=Lax` and `Path=/`.

The session identifier is not returned in analytics API responses.

## Opt-out and test exclusion

VOY excludes analytics and does not emit `voy_sid` when any of these request signals is active:

- `Sec-GPC: 1` — Global Privacy Control;
- `DNT: 1` — Do Not Track;
- `X-VOY-Test: 1` — deterministic direct API validation marker;
- `voy_analytics=off` — same-origin opt-out cookie used by browser validation and available to a future privacy control in the UI.

The first two are user privacy signals. The header and cookie test mechanisms are safe to expose publicly because spoofing either can only suppress analytics; neither grants access or broadens permissions.

Browser smoke uses the same-origin cookie rather than a global custom header. This prevents CORS preflights or failures on third-party map, tile and routing resources.

Excluded writes return HTTP 202 with `written: 0` and an exclusion reason. They are not forwarded to Analytics Engine.

## Origin and operator controls

Analytics and telemetry writes are accepted only from the same origin or an exact origin configured in `VOY_ALLOWED_ORIGINS`. Cross-origin writes from any other origin are rejected.

`/api/whoami` is closed by default. It can be enabled only for configured operator diagnostics and remains restricted to an owner/developer IP or owner IP hash allowlist.

## Retention and deletion limits

VOY controls collection and payload minimization at ingestion. Cloudflare Analytics Engine retention and deletion capabilities are provider-level constraints and must be reviewed against current official documentation before any B2B or municipal analytics product is offered.

Until a versioned retention control is implemented, VOY must not claim user-level analytics deletion or retain data that requires such deletion.

## Change rule

Any new event, field, identifier, retention period or third-party analytics provider requires:

1. documented purpose and data classification;
2. schema and byte limits;
3. opt-out behavior;
4. unit and browser tests;
5. privacy review;
6. an updated version of this document.
