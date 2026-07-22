# VOY Google Account V1 — Credential Runbook

Last updated: 2026-07-22

## Objective

Create and activate the minimum credentials required for optional Google authentication without exposing secrets or enabling Google API access.

## Required values

```text
VOY_GOOGLE_CLIENT_ID=<Google OAuth Web client ID>
VOY_AUTH_SESSION_SECRET=<random high-entropy session key>
```

Classification:

```text
VOY_GOOGLE_CLIENT_ID=PUBLIC_CONFIGURATION
VOY_AUTH_SESSION_SECRET=SECRET
```

## Google Cloud steps

1. Use a dedicated Google Cloud project for VOY identity.
2. Configure the OAuth consent screen with:
   - application name: `VOY`;
   - accurate support contact;
   - production homepage;
   - production Privacy Policy;
   - production Terms or usage notice.
3. Create one OAuth 2.0 client:

```text
Application type=Web application
```

4. Add the exact authorized JavaScript origin:

```text
https://voy-app.simondalmasso44.workers.dev
```

5. Do not add wildcard origins.
6. Do not request Google API scopes.
7. Do not download or commit a `client_secret.json` file for the GIS ID-token callback design.
8. Record the Web client ID through the controlled deployment configuration only.

## Cloudflare steps

The session key must be created with a cryptographically secure generator and stored with Cloudflare Secrets.

Required production secret name:

```text
VOY_AUTH_SESSION_SECRET
```

The secret must not appear in:

```text
wrangler.jsonc
GitHub Actions logs
GitHub repository files
PR descriptions
artifacts
screenshots
browser bundles
health endpoints
exception messages
```

The Web client ID may be configured as a non-secret Worker variable:

```text
VOY_GOOGLE_CLIENT_ID
```

It must not be hardcoded into multiple source files. One server-provided auth configuration endpoint should be the canonical browser source.

## Local and CI configuration

Local development uses synthetic values only:

```text
VOY_GOOGLE_CLIENT_ID=synthetic-client-id.apps.googleusercontent.com
VOY_AUTH_SESSION_SECRET=<synthetic non-production key>
```

Local secret files must remain ignored by Git.

CI must not call live Google login. It uses:

```text
synthetic JWT fixtures
local synthetic JWK set
fixed clock
fixed issuer and audience
no personal Google account
no production secret
```

The live candidate test may verify button rendering and fail-closed configuration but must not automate a real personal Google login.

## Rotation

Session-key rotation must support a bounded overlap:

```text
VOY_AUTH_SESSION_SECRET_CURRENT
VOY_AUTH_SESSION_SECRET_PREVIOUS
```

New sessions use the current key. Existing sessions may be decrypted with the previous key only during a short documented rotation window. After the window, the previous key is removed and old sessions fail closed.

The initial V1 implementation may use a single secret if rotation is not yet activated, but the encrypted-cookie format must include a key version.

## Credential exposure response

If the session secret is exposed:

1. disable authentication;
2. rotate the secret;
3. invalidate all VOY auth sessions;
4. inspect logs and artifacts for the exposed value;
5. remove the exposed material from source history when necessary;
6. document the incident without reproducing the secret.

If the public Google client ID is disclosed, no secret rotation is required. Review its authorized origins and OAuth configuration for unauthorized changes.

## Activation gates

```text
PRIVACY_PAGE_PUBLIC=YES
TERMS_PAGE_PUBLIC=YES
GOOGLE_CONSENT_SCREEN_CONFIGURED=YES
PRODUCTION_ORIGIN_EXACT=YES
GOOGLE_CLIENT_ID_CONFIGURED=YES
SESSION_SECRET_CONFIGURED=YES
SERVER_TOKEN_VERIFICATION=PASS
CSRF_NONCE=PASS
COOKIE_SECURITY=PASS
NO_IDENTITY_LOGGING=PASS
NO_PERSISTENT_ACCOUNT_STORAGE=PASS
DESKTOP=PASS
MOBILE=PASS
PRODUCTION_AUTH_ENABLED=NO until explicit authorization
```

## Current state

```text
GOOGLE_CLIENT_ID_CONFIGURED=NO
SESSION_SECRET_CONFIGURED=NO
GOOGLE_CONSENT_SCREEN_CONFIGURED=NO
PRIVACY_PAGE_PUBLIC=NO
TERMS_PAGE_PUBLIC=NO
REAL_AUTH_ACTIVATION=BLOCKED
```
