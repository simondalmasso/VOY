# VOY Google Account V1 — Privacy Policy and Data Map

Last updated: 2026-07-22

## Scope

This policy applies only to the proposed Google-authenticated VOY session in Draft PR `feat/voy-google-account-v1`.

```text
PERSISTENT_ACCOUNT_DATABASE=NO
TRAVEL_HISTORY_STORAGE=NO
EXACT_LOCATION_STORAGE=NO
AUDIO_STORAGE=NO
TRANSCRIPT_STORAGE=NO
GOOGLE_ACCESS_TOKEN_STORAGE=NO
GOOGLE_REFRESH_TOKEN_STORAGE=NO
```

Authentication remains optional. VOY must remain fully usable without a Google account.

## Purpose limitation

Google identity data may be processed only to:

```text
verify that the user controls a Google Account
create a short-lived authenticated VOY session
show the user's bounded display name and optional profile image
allow explicit sign-out
```

It must not be used for advertising, profiling, route ranking, fare calculation, mobility availability, analytics enrichment or third-party sharing.

## Data received from Google

The Worker may receive a signed Google ID token containing claims such as:

```text
sub
email
email_verified
name
given_name
family_name
picture
iss
aud
exp
iat
nonce
```

The raw token is transient request data. It must be discarded immediately after verification and session creation.

## Data retained in V1

### Browser

One session cookie:

```text
voy_auth
```

The cookie is encrypted and authenticated, short-lived, `Secure`, `HttpOnly`, `SameSite=Lax`, and inaccessible to browser JavaScript.

No auth state may be written to:

```text
localStorage
sessionStorage
IndexedDB
Cache Storage
Service Worker caches
URL query parameters
analytics queues
```

### Worker memory

Google public signing keys may be cached according to their HTTP cache lifetime. The cache contains no VOY user data.

Single-use anti-CSRF or nonce state may be held only for its short expiration window and must not contain email, name, location or travel information.

### Server-side persistent storage

None in V1.

```text
KV_WRITE=NO
DURABLE_OBJECT_USER_WRITE=NO
D1_WRITE=NO
R2_WRITE=NO
ANALYTICS_ENGINE_IDENTITY_WRITE=NO
```

## Session payload minimization

The encrypted session may contain only:

```text
version
provider
pseudonymous sub hash
bounded display name
validated profile-image URL or no image
issued_at
expires_at
random session_id
```

The raw Google `sub` must not appear in logs, analytics, browser assets or public responses. A keyed pseudonymous representation is preferred for the session payload.

Email is not required for core VOY use and should not be stored in the session unless a reviewed UI requirement demonstrates necessity. If temporarily returned by the login response, it must not be logged or persisted.

## Logging and observability

Allowed authentication telemetry is aggregate and identity-free:

```text
auth_attempt
success_or_failure_category
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
email
name
profile-image URL
nonce
session cookie
IP combined with account identity
exact location
origin or destination
travel history
```

Errors must use bounded codes such as:

```text
auth_not_configured
origin_not_allowed
csrf_mismatch
invalid_token_signature
invalid_audience
invalid_issuer
token_expired
session_decrypt_failed
```

## Retention

```text
AUTH_SESSION_MAX_AGE=8 hours
NONCE_MAX_AGE=10 minutes
RAW_GOOGLE_ID_TOKEN_RETENTION=0
AUTH_REQUEST_BODY_RETENTION=0
IDENTITY_LOG_RETENTION=0
```

Sign-out invalidates the browser session immediately by expiring the cookie. Because V1 has no account database, there is no server-side profile record to delete.

## User controls

The account surface must expose:

```text
Sign out
Privacy information
Explanation that Google sign-in is optional
Explanation that no travel history is saved in V1
```

The interface must not imply that VOY synchronizes Google data or saves trips when those capabilities do not exist.

## Profile image handling

A Google-hosted profile image is optional. It may be displayed only from a validated HTTPS Google image host and must use a restrictive referrer policy. It must not be downloaded, proxied, cached persistently or copied into VOY storage.

If image-host validation fails, VOY displays a generated neutral avatar based on the bounded display name.

## Children and sensitive data

V1 does not infer age and does not request birthday, gender, contacts, health, payment or other sensitive Google data.

VOY must never combine authenticated identity with exact location or mobility queries in logs or persistent storage.

## Third parties

Google is the identity provider. Cloudflare executes the Worker and may process requests under the project's Cloudflare configuration. No additional identity vendor is introduced.

## Production prerequisites

Before activation:

1. Publish a VOY privacy page on the production origin.
2. Publish Terms of Service or an equivalent usage notice.
3. Configure the Google consent screen with accurate product identity and links.
4. Verify the production domain/origin in Google Cloud.
5. Store the session key only in Cloudflare Secrets.
6. Complete browser and API tests proving no identity data enters storage, URLs or logs.
7. Review the final data map before enabling the button for normal traffic.

## Deferred persistent accounts

A future persistent VOY account requires a separate privacy review covering:

```text
lawful purpose and user notice
storage system
retention and deletion
account export
account deletion
security recovery
cross-device synchronization
saved places
travel history
location minimization
breach response
```

That future review must precede any persistent-data binding or migration.
