# VOY Google Authenticated Session V1 — Authentication Contract

Last updated: 2026-07-23

This document replaces any prior “Google account” semantics for V1. The historical file path is retained for continuity, but VOY V1 does not create, register or persist a reusable VOY account.

## Canonical decision

```text
AUTH_MODE=GOOGLE_IDENTITY_AUTHENTICATION
VOY_IDENTITY_MODE=EPHEMERAL_AUTHENTICATED_SESSION
PERSISTENT_VOY_ACCOUNT=NO
RETURNING_USER_RECOGNITION_AFTER_EXPIRY=NO
CROSS_DEVICE_CONTINUITY=NO
SESSION_DURATION=8h
GOOGLE_API_AUTHORIZATION=NO
GOOGLE_ACCESS_TOKEN=NO
GOOGLE_REFRESH_TOKEN=NO
```

The visible Google action may remain:

```text
Continuar con Google
```

The login surface must also display this explanation:

```text
“Iniciá una sesión temporal. VOY no guarda historial de viajes ni crea un perfil permanente.”
```

The UI, API responses, documentation and telemetry must not claim:

```text
cuenta creada
usuario registrado
perfil guardado
usuario recurrente reconocido
```

A future persistent association with the verified Google `sub` requires a separate authorization, storage design, privacy review, deletion/export contract and migration plan.

## Scope

Google Identity Services is used only to authenticate control of a Google identity and create an eight-hour VOY session.

VOY does not request access to Google APIs or receive OAuth access or refresh tokens. Drive, Calendar, Contacts, Gmail, location and other Google scopes are prohibited in V1.

Authentication remains optional. All core VOY mobility functions must remain usable without signing in.

## UX mode

```text
RECOMMENDED_MODE=redirect POST to Worker
LOGIN_ENDPOINT=POST /api/auth/google
```

Reasons:

```text
credential received directly by backend
Google-managed official double-submit CSRF pattern
less sensitive frontend logic
no ID token in query strings, fragments or browser analytics
```

Google renders the official button. VOY must not imitate the Google logo, account chooser or button styling.

If a future implementation instead uses the popup JavaScript callback, it must introduce a separately reviewed same-origin POST and independent CSRF mechanism. The Google ID token must never be placed in a URL query, fragment, log, analytics event or client storage.

## Redirect POST flow

```text
user selects Continuar con Google
→ Google renders the official account chooser
→ Google Identity Services POSTs directly to /api/auth/google
→ Worker enforces exact Origin allowlist
→ Worker enforces application/x-www-form-urlencoded
→ Worker enforces bounded request size
→ Worker verifies g_csrf_token cookie exists
→ Worker verifies g_csrf_token body field exists
→ Worker compares both CSRF values in constant time
→ Worker verifies Google ID token cryptographically
→ Worker extracts only the minimal application claims
→ Worker discards the raw ID token
→ Worker creates __Host-voy_session
→ Worker redirects to a fixed same-origin post-login path
→ browser calls GET /api/auth/session for display state
```

No credential, token, name, subject or error detail may be returned in the redirect URL.

## Request contract

`POST /api/auth/google` must accept only the Google Identity Services redirect POST contract.

Required gates:

```text
METHOD=POST
ORIGIN=exact allowlisted VOY origin
CONTENT_TYPE=application/x-www-form-urlencoded
MAX_BODY_BYTES=16384
REDIRECTS=not applicable at request boundary
credential=present bounded JWT string
g_csrf_token_cookie=present
g_csrf_token_body=present
g_csrf_token_cookie_equals_body=YES
```

Reject the request when either CSRF value is absent or when they differ.

The endpoint must not accept credentials through query parameters, JSON fallback, multipart form data or GET.

## Google ID-token verification

The Worker must verify all of the following before using any application claim:

```text
signature=valid Google public key
kid=present and recognized
alg=explicitly allowed
alg=RS256 for V1
iss=accounts.google.com OR https://accounts.google.com
aud=exact environment-specific VOY_GOOGLE_CLIENT_ID
exp=valid with bounded clock skew
iat=reasonable and not unreasonably old or future-dated
nonce=exact match when the configured flow uses nonce
sub=non-empty bounded string
```

Verification must be performed by the Worker. Data merely decoded by browser JavaScript is untrusted.

Google public keys may be retrieved only from the exact HTTPS Google JWK endpoint with:

```text
exact host allowlist
redirects disabled
explicit timeout
bounded response size
JSON schema validation
cache lifetime limited by Google response headers
unknown kid fail-closed
unknown alg fail-closed
```

The production implementation must not call Google `tokeninfo` for every sign-in.

## Minimal application data

After full token verification, VOY may use only:

```text
sub
name optional for presentation
picture optional for presentation
iat
exp
```

`iss`, `aud`, `kid`, `alg` and nonce are verification inputs, not retained profile data.

The email claim is not used as an identifier and is not included in the VOY session. VOY V1 does not need to retain or display email.

The raw ID token must be discarded immediately after session creation. It must not be copied into the cookie, memory cache, logs, analytics, artifacts, error messages or browser storage.

## Session endpoints

```text
POST /api/auth/google
GET /api/auth/session
POST /api/auth/logout
```

`GET /api/auth/session` returns only bounded presentation state derived from the authenticated cookie, for example:

```text
authenticated=true
name optional
picture optional
expires_at
```

It must not return raw or pseudonymous subject values, tokens or internal cryptographic metadata.

`POST /api/auth/logout` expires the browser cookie immediately and returns `Cache-Control: no-store`.

## Session cookie

```text
NAME=__Host-voy_session
Secure=YES
HttpOnly=YES
SameSite=Lax
Path=/
Max-Age=28800
Domain=ABSENT
```

The cookie payload must be encrypted and authenticated with AEAD. It contains only:

```text
version
session_id random
subject derived or keyed-pseudonymized
issued_at
expires_at
auth_provider=google
```

Optional presentation fields `name` and `picture` should be omitted from the cookie when they can be returned only in the immediate post-authentication response. If retained for the eight-hour presentation session, they remain bounded, encrypted, authenticated and never persisted elsewhere.

The cookie must not contain:

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

## Stateless-session limitation

V1 keeps no server-side session or account record. Logout expires the cookie in the current browser, but VOY cannot globally revoke a previously stolen valid stateless cookie before its expiry.

Mitigations:

```text
8-hour maximum lifetime
AEAD confidentiality and integrity
Secure
HttpOnly
SameSite=Lax
__Host- prefix
no Domain attribute
key rotation support
no sensitive mobility data in payload
```

A global early-revocation mechanism would require authorized server-side state and a separate architecture review.

## Key management

Public configuration:

```text
VOY_GOOGLE_CLIENT_ID
```

Secret:

```text
VOY_AUTH_SESSION_SECRET_V1
```

Cookie format:

```text
active_key_version=1
accept previous version only during controlled rotation
```

New sessions use the active key. A previous key version may be accepted only during a documented, bounded rotation window and must then be removed.

No real key value may be created until explicitly authorized.

For Cloudflare Versions, the only approved creation command is:

```text
wrangler versions secret put VOY_AUTH_SESSION_SECRET_V1
```

Do not use:

```text
wrangler secret put
```

because it can create an immediate deployment outside the candidate-first workflow.

## Environment separation

```text
GOOGLE_CLOUD_PROJECT_TEST=separate project
GOOGLE_CLOUD_PROJECT_PRODUCTION=separate project
TEST_CLIENT_ID=separate Web client ID
PRODUCTION_CLIENT_ID=separate Web client ID
```

Production Web application configuration:

```text
AUTHORIZED_JAVASCRIPT_ORIGIN=https://voy-app.simondalmasso44.workers.dev
AUTHORIZED_REDIRECT_URI=https://voy-app.simondalmasso44.workers.dev/api/auth/google
```

Testing must use its own project, consent configuration and client ID. Localhost origins and redirect URIs are allowed only in the testing project and must use explicit ports. Wildcards are prohibited.

## Public pages and links

Before any real authentication activation, VOY must publish:

```text
/privacy
/terms
```

Both must be linked from:

```text
homepage
footer
login panel or screen
```

The privacy page must state the processed ID-token data, absence of Google API access and OAuth tokens, eight-hour session duration, absence of a persistent account, absence of stored travel history and exact location, Google and Cloudflare involvement, contact mechanism and effective date.

## Fail-closed behavior

When any credential, page, origin, CSRF, JWK, signature, audience, issuer, time, nonce, AEAD or cookie gate is unavailable or invalid:

```text
AUTH_AVAILABLE=NO
BUTTON_DISABLED_OR_NOT_RENDERED
SESSION_NOT_CREATED
NO_PASSWORD_FALLBACK
NO_UNVERIFIED_SESSION
VOY_CORE_MOBILITY_REMAINS_AVAILABLE=YES
```

## Implementation order

PR #24 remains documentation-only and Draft.

After documentation approval:

1. create a new branch from the exact productive `main`;
2. implement `/privacy` and `/terms`;
3. validate and publish both pages;
4. create separate Google Cloud testing and production projects;
5. configure branding, homepage, privacy and terms;
6. create separate Web client IDs;
7. implement authentication behind a disabled feature flag;
8. create `VOY_AUTH_SESSION_SECRET_V1` through Cloudflare Versions only, after explicit authorization;
9. create and validate a zero-traffic candidate;
10. test desktop, Android and Safari;
11. stop before enabling the button for normal users.

## Mandatory gates

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

## Deferred functionality

A separate future authorization is required for:

```text
persistent VOY account
returning-user recognition after session expiry
cross-device continuity
saved places
travel history
server-side profile database
account linking
Google API access
refresh tokens
password or email login
account recovery
```

## Official references

- Google Identity Services web overview: https://developers.google.com/identity/gsi/web/guides/overview
- Google ID-token server verification: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- Google Identity Services HTML API reference: https://developers.google.com/identity/gsi/web/reference/html-reference
- Google OAuth policies: https://developers.google.com/identity/protocols/oauth2/policies
- Cloudflare Worker secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Cloudflare Web Crypto: https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
