# VOY Google Authenticated Session V1 — Privacy Policy and Data Map

Last updated: 2026-07-23

This document applies to the proposed optional Google-authenticated VOY session. The historical file path is retained for continuity; V1 does not create a persistent VOY account.

## Identity semantics

```text
AUTH_MODE=GOOGLE_IDENTITY_AUTHENTICATION
VOY_IDENTITY_MODE=EPHEMERAL_AUTHENTICATED_SESSION
PERSISTENT_VOY_ACCOUNT=NO
RETURNING_USER_RECOGNITION_AFTER_EXPIRY=NO
CROSS_DEVICE_CONTINUITY=NO
SESSION_DURATION=8h
```

The login UI must state:

```text
“Iniciá una sesión temporal. VOY no guarda historial de viajes ni crea un perfil permanente.”
```

VOY must not claim that a user was registered, that an account was created, that a profile was saved or that a returning user will be recognized after the session expires.

## Scope and optionality

```text
AUTH_OPTIONAL=YES
PERSISTENT_ACCOUNT_DATABASE=NO
TRAVEL_HISTORY_STORAGE=NO
EXACT_LOCATION_STORAGE=NO
AUDIO_STORAGE=NO
TRANSCRIPT_STORAGE=NO
GOOGLE_ACCESS_TOKEN_RECEIVED=NO
GOOGLE_REFRESH_TOKEN_RECEIVED=NO
GOOGLE_API_ACCESS=NO
```

All core mobility functions remain available without authentication.

## Purpose limitation

Google identity data may be processed only to:

```text
verify control of a Google identity
create an eight-hour authenticated VOY session
show a bounded optional display name
show a bounded optional Google-hosted profile image
allow explicit logout
```

It must not be used for advertising, profiling, route ranking, fare calculation, provider availability, analytics enrichment, location correlation or third-party marketing.

## Data received and verified

Google Identity Services sends a signed ID token directly to the Worker through the approved redirect POST flow.

The Worker cryptographically verifies the token before using application data. Verification necessarily examines protocol claims and headers such as:

```text
kid
alg
iss
aud
exp
iat
nonce when configured
signature
```

After verification, VOY may use only:

```text
sub
name optional for presentation
picture optional for presentation
iat
exp
```

The raw token may contain other Google claims, but VOY V1 ignores them for application behavior. Email is not used as an identifier and is not retained in the VOY session.

The raw Google ID token is transient request data and must be discarded immediately after session creation.

```text
RAW_GOOGLE_ID_TOKEN_RETENTION=0
ID_TOKEN_PERSISTED=0
```

## CSRF and request privacy

The approved mode is:

```text
RECOMMENDED_MODE=redirect POST to Worker
ENDPOINT=POST /api/auth/google
CONTENT_TYPE=application/x-www-form-urlencoded
MAX_BODY_BYTES=16384
```

The Worker must verify the official Google Identity Services double-submit pattern:

```text
g_csrf_token cookie
==
g_csrf_token body field
```

The request is rejected if either value is absent or if the values do not match. The exact production Origin allowlist is also enforced.

The credential must never appear in:

```text
URL query
URL fragment
Referer
browser history
analytics event
console output
application log
artifact
screenshot
```

## Browser-retained data

One short-lived session cookie:

```text
NAME=__Host-voy_session
Secure=YES
HttpOnly=YES
SameSite=Lax
Path=/
Max-Age=28800
Domain=ABSENT
```

The cookie is encrypted and authenticated with AEAD and cannot be read by browser JavaScript.

No authentication or identity state may be written to:

```text
localStorage
sessionStorage
IndexedDB
Cache Storage
Service Worker caches
URL parameters
analytics queues
```

## Session payload minimization

The AEAD-protected cookie may contain only:

```text
version
session_id random
subject derived or keyed-pseudonymized
issued_at
expires_at
auth_provider=google
```

Optional `name` and `picture` may be included only for presentation during the same eight-hour session when necessary. They must be bounded, encrypted and authenticated and must not be copied into persistent storage or logs.

The session must not contain:

```text
email
raw Google sub
Google ID token
access token
refresh token
location
origin or destination
travel history
audio
transcript
```

## Server-side storage

There is no persistent VOY user or session database in V1.

```text
KV_USER_WRITE=0
DURABLE_OBJECT_USER_WRITE=0
D1_USER_WRITE=0
R2_USER_WRITE=0
ANALYTICS_ENGINE_IDENTITY_WRITE=0
USER_DATABASE_WRITES=0
TRAVEL_HISTORY_WRITES=0
EXACT_LOCATION_WRITES=0
```

Google public signing keys may be cached only according to their valid HTTP cache lifetime. That cache contains no VOY user data.

## Logging and observability

Allowed telemetry is aggregate and identity-free:

```text
auth_attempt
success_or_bounded_failure_category
provider=google
latency_bucket
client_surface=desktop_or_mobile
```

Prohibited logging:

```text
raw ID token
access token
refresh token
Google sub
pseudonymous subject
email
name
profile-image URL
CSRF token
nonce
session cookie
session_id
IP combined with identity
exact location
origin or destination
travel history
```

Errors use bounded codes only, for example:

```text
auth_not_configured
origin_not_allowed
content_type_not_allowed
request_too_large
csrf_missing
csrf_mismatch
unknown_kid
invalid_algorithm
invalid_token_signature
invalid_audience
invalid_issuer
token_expired
invalid_issued_at
nonce_mismatch
session_encrypt_failed
session_decrypt_failed
```

## Retention

```text
AUTH_SESSION_MAX_AGE=8 hours
RAW_GOOGLE_ID_TOKEN_RETENTION=0
AUTH_REQUEST_BODY_RETENTION=0
IDENTITY_LOG_RETENTION=0
ACCESS_TOKEN_RETENTION=0
REFRESH_TOKEN_RETENTION=0
```

Logout expires the cookie in the current browser immediately.

Because V1 has no server-side session state, there is no global early-revocation mechanism for a stolen valid cookie. This limitation must be documented. Risk is reduced through the eight-hour lifetime, AEAD, `Secure`, `HttpOnly`, `SameSite=Lax`, the `__Host-` prefix, absence of a `Domain` attribute and key rotation support.

## User controls

The authenticated-session surface must provide:

```text
Cerrar sesión
Información de privacidad
Términos
Explanation that authentication is optional
Explanation that the session lasts eight hours
Explanation that no persistent profile is created
Explanation that no trip history or exact location is stored
```

`POST /api/auth/logout` invalidates the browser cookie. `GET /api/auth/session` exposes only bounded presentation state and expiry.

## Profile-image handling

A Google-hosted profile image is optional. It may be displayed only from an allowlisted HTTPS Google image host with a restrictive referrer policy.

It must not be:

```text
downloaded into VOY storage
proxied through an unrestricted fetcher
persistently cached
included in analytics
included in logs
```

If validation fails, VOY uses a neutral local avatar.

## Third parties

```text
IDENTITY_PROVIDER=Google
RUNTIME_AND_EDGE_PROVIDER=Cloudflare
OTHER_IDENTITY_VENDOR=NO
```

Google processes authentication through Google Identity Services. Cloudflare executes the VOY Worker and serves the application under the project configuration. VOY does not introduce another identity provider in V1.

## Public privacy page requirements

Before authentication is activated, `/privacy` must be publicly accessible and state explicitly:

```text
data processed from the verified ID token: sub, optional name, optional picture, iat, exp
no Google API scopes requested
no Google access token received
no Google refresh token received
session duration: eight hours
no persistent VOY account
no recognition after session expiry
no cross-device continuity
no stored trip history
no stored exact location
Google and Cloudflare as involved providers
actual contact mechanism
privacy effective date
```

The actual contact mechanism must be configured and published before the page can pass the public gate. It must not be invented in this planning document.

The privacy page must be linked from:

```text
homepage
footer
login panel or screen
```

## Public terms page requirements

`/terms` remains required even if optional for a basic Google configuration. It must accurately describe optional authentication, session-only identity, prohibited misuse, external-provider boundaries and absence of guaranteed account continuity.

It must be linked from the homepage, footer and login panel or screen.

## Environment separation

Testing and production use separate Google Cloud projects and separate Web client IDs.

```text
GOOGLE_CLOUD_PROJECT_TEST=separate
GOOGLE_CLOUD_PROJECT_PRODUCTION=separate
LOCALHOST_ALLOWED_IN_PRODUCTION=NO
```

Localhost may be configured only in the testing project, using explicit origins and ports.

## Production prerequisites

1. Publish and validate `/privacy`.
2. Publish and validate `/terms`.
3. Link both pages from homepage, footer and login UI.
4. Configure a real public contact mechanism and effective date.
5. Create separate testing and production Google Cloud projects.
6. Configure accurate product branding and page links.
7. Create separate Web client IDs.
8. Store the session secret only through the Cloudflare Versions workflow after explicit authorization.
9. Complete API and browser tests proving no identity, token, trip or exact-location persistence.
10. Stop before enabling authentication for normal production users.

## Mandatory privacy gates

```text
PRIVACY_PAGE=PUBLIC_PASS
TERMS_PAGE=PUBLIC_PASS
TEST_PROJECT_SEPARATE=PASS
PRODUCTION_PROJECT_SEPARATE=PASS
CLIENT_ID_NOT_SECRET=PASS
SESSION_SECRET_NOT_IN_REPO=PASS
ID_TOKEN_SERVER_VERIFICATION=PASS
CSRF=PASS
COOKIE_FLAGS=PASS
ID_TOKEN_PERSISTED=0
GOOGLE_ACCESS_TOKEN_RECEIVED=0
GOOGLE_REFRESH_TOKEN_RECEIVED=0
USER_DATABASE_WRITES=0
TRAVEL_HISTORY_WRITES=0
EXACT_LOCATION_WRITES=0
AUTH_OPTIONAL=PASS
```

## Deferred persistent identity

A future persistent VOY account or subject association requires a separate review covering:

```text
purpose and legal basis
minimum persistent data
storage system
retention and deletion
account export
account deletion
security recovery
cross-device synchronization
returning-user recognition
saved places
travel history
location minimization
breach response
```

No persistent-data binding, migration or user table may be created under this V1 contract.
