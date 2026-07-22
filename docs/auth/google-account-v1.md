# VOY Google Account V1 — Authentication Contract

Last updated: 2026-07-22

## Decision

VOY Google Account V1 uses **Google Identity Services for authentication only**.

```text
GOOGLE_AUTHENTICATION=YES
GOOGLE_API_AUTHORIZATION=NO
GOOGLE_ACCESS_TOKEN=NO
GOOGLE_REFRESH_TOKEN=NO
GOOGLE_DRIVE_ACCESS=NO
GOOGLE_CALENDAR_ACCESS=NO
PERSISTENT_VOY_ACCOUNT=NO
SHORT_LIVED_VOY_SESSION=YES
```

The visible action is:

```text
Continue with Google
```

The same action covers first-time and returning users. A first-time user receives a VOY session after Google identity verification; VOY does not create a durable user record in V1.

## Why authentication and authorization are separated

Google Identity Services distinguishes sign-in from authorization to access Google APIs. VOY needs only identity authentication in this phase. Requesting Drive, Calendar, Contacts, location or other Google scopes would be unnecessary and is prohibited.

Allowed claims:

```text
sub
email
email_verified
name
picture
iss
aud
exp
iat
nonce when present
```

The canonical user identifier is the verified Google `sub` claim. Email must never be treated as an immutable account identifier.

## Credential inventory

### Public configuration

```text
VOY_GOOGLE_CLIENT_ID
```

The Web client ID is public by design and may be delivered to the browser. It must still be configured through a controlled Worker variable and must match the audience validated by the backend.

### Secret configuration

```text
VOY_AUTH_SESSION_SECRET
```

This must be stored as a Cloudflare Worker secret. It must never be committed to GitHub, placed in `wrangler.jsonc`, exposed in browser assets, included in logs or returned by diagnostics.

No Google client secret is required for the Google Identity Services ID-token callback used by this V1 design. If VOY later adopts an authorization-code flow, that is a separate architecture and requires a new review.

## Google Cloud configuration

Create one OAuth client of type:

```text
Web application
```

Authorized JavaScript origin for production:

```text
https://voy-app.simondalmasso44.workers.dev
```

Local development origins may be configured separately and must not weaken production origin checks.

The V1 client uses a JavaScript credential callback. It does not require a Google OAuth redirect endpoint and does not request access or refresh tokens.

The Google OAuth consent screen must identify VOY accurately and reference public Terms and Privacy pages before production activation.

## Authentication flow

```text
user selects Continue with Google
→ Google renders the official button and account chooser
→ browser receives a Google ID credential
→ browser POSTs credential to /api/auth/google
→ Worker enforces same-origin request and bounded body
→ Worker verifies JWT signature using Google's current JWK set
→ Worker verifies aud, iss, exp, iat and nonce/CSRF contract
→ Worker extracts only allowed claims
→ Worker creates an encrypted and authenticated short-lived VOY session cookie
→ browser fetches /api/auth/session
→ UI shows the authenticated profile
```

No plain Google user ID supplied by the browser is trusted.

## Token verification

The Worker must verify:

```text
alg=RS256
signature=valid Google public key
kid=present and known
iss=accounts.google.com OR https://accounts.google.com
aud=exact VOY_GOOGLE_CLIENT_ID
exp>now with bounded clock skew
iat<=now with bounded clock skew
sub=non-empty bounded string
email_verified=true when email is displayed as verified
```

Google public keys may be cached only according to their HTTP cache headers. The JWK response reader must enforce HTTPS, exact host allowlisting, redirects disabled, timeout and maximum response size.

The production implementation must not call Google's `tokeninfo` endpoint for each login.

## CSRF and replay controls

The login endpoint must require:

```text
Origin=exact current VOY origin
Content-Type=application/json
credential=bounded JWT string
nonce=single-use browser nonce
```

The nonce is bound to a short-lived `Secure; HttpOnly; SameSite=Lax` cookie and deleted after use. A replayed, missing, expired or mismatched nonce is rejected.

## VOY session

Default V1 session:

```text
MAX_AGE=8 hours
COOKIE_NAME=voy_auth
SECURE=YES
HTTP_ONLY=YES
SAME_SITE=Lax
PATH=/
PERSISTENT_SERVER_RECORD=NO
```

The cookie contains only an encrypted and authenticated bounded session payload:

```text
version
provider=google
sub_hash
name
picture
issued_at
expires_at
session_id
```

Raw Google ID tokens, access tokens and refresh tokens must never be stored in the session.

The email claim is returned by `/api/auth/session` only when required by the UI. It is not written to analytics or logs.

## Account UI

Unauthenticated state:

```text
Cuenta
Continue with Google
```

Authenticated state:

```text
profile picture when valid
first name or bounded display name
Account
Sign out
```

The official Google-rendered button must be used. VOY must not imitate Google's logo, button or account chooser.

## Fail-closed behavior

When credentials, origin, JWK verification, nonce validation or encryption are unavailable:

```text
AUTH_AVAILABLE=NO
BUTTON_DISABLED_OR_NOT_RENDERED
SESSION_NOT_CREATED
NO_FALLBACK_PASSWORD
NO_UNVERIFIED_ACCOUNT
```

The rest of VOY remains fully usable without signing in.

## Deferred functionality

The following require a new explicit authorization and data architecture:

```text
persistent VOY accounts
saved places
travel history
cross-device preferences
server-side profile database
account linking
Google API access
refresh tokens
password login
email login
account recovery
```

## Official references

- Google Identity Services web overview: https://developers.google.com/identity/gsi/web/guides/overview
- Google ID-token server verification: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- Google Identity Services JavaScript reference: https://developers.google.com/identity/gsi/web/reference/js-reference
- Google OAuth policies: https://developers.google.com/identity/protocols/oauth2/policies
- Cloudflare Worker secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Cloudflare Web Crypto: https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
