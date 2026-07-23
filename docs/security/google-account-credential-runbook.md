# VOY Google Authenticated Session V1 — Credential and Activation Runbook

Last updated: 2026-07-23

## Objective

Prepare the minimum credentials, environments and release controls required for optional Google authentication without creating a persistent VOY account, requesting Google API access or changing production before every gate passes.

## Identity mode

```text
AUTH_MODE=GOOGLE_IDENTITY_AUTHENTICATION
VOY_IDENTITY_MODE=EPHEMERAL_AUTHENTICATED_SESSION
PERSISTENT_VOY_ACCOUNT=NO
RETURNING_USER_RECOGNITION_AFTER_EXPIRY=NO
CROSS_DEVICE_CONTINUITY=NO
SESSION_DURATION=8h
```

This runbook must not describe the V1 result as account creation, registration or saved profile creation.

## Required values

Public configuration:

```text
VOY_GOOGLE_CLIENT_ID=<environment-specific Google OAuth Web client ID>
```

Secret:

```text
VOY_AUTH_SESSION_SECRET_V1=<random high-entropy AEAD key material>
```

Classification:

```text
VOY_GOOGLE_CLIENT_ID=PUBLIC_CONFIGURATION
VOY_AUTH_SESSION_SECRET_V1=SECRET
```

No real secret value may be created until explicitly authorized.

## Google Cloud environment separation

Use two independent Google Cloud projects:

```text
GOOGLE_CLOUD_PROJECT_TEST
GOOGLE_CLOUD_PROJECT_PRODUCTION
```

Each project must have its own:

```text
branding and consent configuration
support contact
homepage link
privacy link
terms link
OAuth Web client ID
authorized origins
authorized redirect URIs
```

Do not reuse the testing client ID in production or the production client ID in testing.

## Production Google Cloud configuration

Application type:

```text
Web application
```

Authorized JavaScript origin:

```text
https://voy-app.simondalmasso44.workers.dev
```

Authorized redirect URI:

```text
https://voy-app.simondalmasso44.workers.dev/api/auth/google
```

Rules:

```text
wildcard origins=NO
wildcard redirect URIs=NO
localhost in production project=NO
Google API scopes=NO
Google access tokens=NO
Google refresh tokens=NO
client_secret.json download or commit=NO
```

## Testing Google Cloud configuration

Testing uses a separate project and Web client ID.

Localhost may be added only to the testing project and only with explicit origins and ports, for example:

```text
http://localhost:8787
http://127.0.0.1:8787
```

Only ports actually used by the test runner may be configured. Wildcards remain prohibited.

CI must not automate a personal Google account login. CI uses:

```text
synthetic JWT fixtures
local synthetic JWK set
fixed clock
fixed issuer and audience
synthetic CSRF cookie/body values
no personal Google identity
no production client ID
no production secret
```

A zero-traffic candidate may verify official button rendering, configuration and fail-closed behavior, but real personal sign-in is outside automated CI.

## Required public pages before credential activation

Publish and validate:

```text
/privacy
/terms
```

Both pages must be linked from:

```text
homepage
footer
login panel or screen
```

Before the privacy page can pass, it must contain an actual public contact mechanism and effective date. This runbook does not invent either value.

The Google Cloud production branding configuration must reference the final public homepage, privacy and terms URLs.

## Recommended authentication mode

```text
RECOMMENDED_MODE=redirect POST to Worker
ENDPOINT=POST /api/auth/google
```

The Worker receives the credential directly from Google Identity Services.

Required request checks:

```text
method=POST
Origin=exact allowlist
Content-Type=application/x-www-form-urlencoded
payload size<=16384 bytes
credential present and bounded
g_csrf_token cookie present
g_csrf_token body present
g_csrf_token cookie equals body
```

The double-submit CSRF comparison should use constant-time comparison after bounded parsing.

Reject credentials supplied through query strings, fragments, GET, JSON fallback or multipart form data.

## ID-token verification contract

The Worker must verify:

```text
Google signature
kid recognized
alg explicitly allowed
alg=RS256 for V1
aud exact environment-specific VOY_GOOGLE_CLIENT_ID
iss exact allowed Google issuer
exp valid with bounded skew
iat reasonable with bounded skew
nonce exact when configured
sub non-empty and bounded
```

Verification occurs server-side. Browser-decoded claims are untrusted.

The Google JWK reader must enforce:

```text
HTTPS only
exact Google host allowlist
redirects=0
explicit timeout
bounded response bytes
valid JSON and JWK schema
cache only according to response headers
unknown kid fail-closed
```

Do not use Google `tokeninfo` as the production verifier for each login.

## Minimal processed claims

After verification, use only:

```text
sub
name optional
picture optional
iat
exp
```

Do not use email as an identifier. Do not persist email.

The original ID token must be discarded after creating the VOY session and must never be written to:

```text
cookie
repository
logs
analytics
artifacts
screenshots
browser storage
URL
error message
```

## Session cookie contract

```text
NAME=__Host-voy_session
Secure=YES
HttpOnly=YES
SameSite=Lax
Path=/
Max-Age=28800
Domain=ABSENT
```

The cookie payload is encrypted and authenticated with AEAD and contains only:

```text
version
session_id random
subject derived or keyed-pseudonymized
issued_at
expires_at
auth_provider=google
```

Optional bounded `name` and `picture` may be included only when required for presentation during the same eight-hour session.

The cookie must not contain:

```text
email
raw Google sub
ID token
access token
refresh token
location
travel history
audio
transcript
```

## Auth endpoints

```text
POST /api/auth/google
GET /api/auth/session
POST /api/auth/logout
```

`GET /api/auth/session` returns only bounded presentation state and expiry. It must never expose tokens, raw or pseudonymous subject identifiers, session key version or internal cryptographic material.

`POST /api/auth/logout` expires `__Host-voy_session` in the current browser.

Because V1 is stateless, it cannot globally revoke a stolen valid cookie before expiry. The risk and mitigation must be documented:

```text
8-hour lifetime
AEAD
Secure
HttpOnly
SameSite=Lax
__Host- prefix
Domain absent
key rotation support
no mobility history or exact location in cookie
```

## Cloudflare secret creation

Approved secret name:

```text
VOY_AUTH_SESSION_SECRET_V1
```

For Cloudflare Versions, use only:

```text
wrangler versions secret put VOY_AUTH_SESSION_SECRET_V1
```

Do not use:

```text
wrangler secret put
```

because it may create an immediate deployment and bypass the candidate-first release sequence.

The secret must not appear in:

```text
wrangler.jsonc
GitHub source
GitHub Actions logs
PR body or comments
artifacts
screenshots
browser assets
health endpoints
diagnostics
exceptions
```

The public Web client ID must have one canonical configuration source and must not be duplicated across frontend files.

## Key rotation

Initial format:

```text
active_key_version=1
active_secret=VOY_AUTH_SESSION_SECRET_V1
```

Rotation contract:

```text
new sessions use active version
previous version accepted only during controlled bounded rotation
previous secret stored as a separately versioned Cloudflare secret
rotation window documented
previous version removed after window
undecryptable cookies fail closed
```

Do not create a generic unversioned session secret.

## Credential exposure response

If `VOY_AUTH_SESSION_SECRET_V1` is exposed:

1. disable authentication rendering and endpoints;
2. create a new versioned secret through Cloudflare Versions;
3. stop accepting the exposed key version;
4. accept that all sessions under the removed version become invalid;
5. inspect source, logs and artifacts without reproducing the value;
6. remove exposed material from repository history when necessary;
7. record the incident and final key-version state.

If a public Google client ID is disclosed, secret rotation is not required. Review the client configuration, authorized origins and redirect URIs for unauthorized changes.

## Implementation and release order

PR #24 remains Draft and documentation-only.

After documentation approval:

1. create a new implementation branch from exact productive `main`;
2. implement `/privacy` and `/terms`;
3. execute CI and browser validation;
4. publish and verify both pages in production;
5. create separate Google Cloud test and production projects;
6. configure branding, homepage, privacy and terms;
7. create separate OAuth Web client IDs;
8. implement auth endpoints and official Google button behind a disabled feature flag;
9. validate synthetic server verification, CSRF and cookie tests;
10. obtain explicit authorization before creating the real session secret;
11. create the secret only with `wrangler versions secret put`;
12. create a Cloudflare candidate with production traffic unchanged;
13. validate candidate API, privacy, security and browsers;
14. test desktop, Android and Safari;
15. stop before enabling the button for normal users.

## Mandatory activation gates

```text
PRIVACY_PAGE=PUBLIC_PASS
TERMS_PAGE=PUBLIC_PASS
TEST_PROJECT_SEPARATE=PASS
PRODUCTION_PROJECT_SEPARATE=PASS
CLIENT_ID_NOT_SECRET=PASS
SESSION_SECRET_NOT_IN_REPO=PASS
ID_TOKEN_SERVER_VERIFICATION=PASS
GOOGLE_SIGNATURE=PASS
KID=PASS
ALG=PASS
AUD=PASS
ISS=PASS
EXP=PASS
IAT=PASS
NONCE_WHEN_USED=PASS
CSRF_DOUBLE_SUBMIT=PASS
ORIGIN_ALLOWLIST=PASS
CONTENT_TYPE=PASS
PAYLOAD_SIZE=PASS
COOKIE_FLAGS=PASS
AEAD=PASS
ID_TOKEN_PERSISTED=0
GOOGLE_ACCESS_TOKEN_RECEIVED=0
GOOGLE_REFRESH_TOKEN_RECEIVED=0
USER_DATABASE_WRITES=0
TRAVEL_HISTORY_WRITES=0
EXACT_LOCATION_WRITES=0
AUTH_OPTIONAL=PASS
DESKTOP=PASS
ANDROID=PASS
SAFARI=PASS
PRODUCTION_AUTH_ENABLED=NO until explicit authorization
```

## Current state

```text
PR=24
PR_STATE=DRAFT
SCOPE=DOCUMENTATION_ONLY
RUNTIME_CHANGES=0
WORKFLOW_CHANGES=0
BINDING_CHANGES=0
SECRET_CHANGES=0
PRODUCTION_CHANGES=0
PRIVACY_PAGE_PUBLIC=NO
TERMS_PAGE_PUBLIC=NO
GOOGLE_CLOUD_PROJECT_TEST=NOT_CREATED
GOOGLE_CLOUD_PROJECT_PRODUCTION=NOT_CREATED
TEST_CLIENT_ID_CONFIGURED=NO
PRODUCTION_CLIENT_ID_CONFIGURED=NO
VOY_AUTH_SESSION_SECRET_V1_CONFIGURED=NO
REAL_AUTH_ACTIVATION=BLOCKED
```
