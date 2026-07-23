# VOY — Current State

Last updated: 2026-07-23

This is the canonical operational worklog. Authority order remains production and Cloudflare runtime, then candidate state, GitHub, CI evidence and documentation.

## Production verified now

```text
WORKER=voy-app
URL=https://voy-app.simondalmasso44.workers.dev/
HEALTH_URL=https://voy-app.simondalmasso44.workers.dev/api/health
APPLICATION_VERSION=V7.8.0
PRODUCTION_BUILD=841d9f4
CURRENT_MAIN_SHA=841d9f4ecd573c32e5f9ac7238d4109812a221bf
MAIN_SHA_EQUALS_PRODUCTION_BUILD=YES
PRODUCTION_HEALTH=PASS
```

The public health endpoint currently reports `V7.8.0 / 841d9f4`. GitHub `main` currently resolves to `841d9f4ecd573c32e5f9ac7238d4109812a221bf`.

Last fully validated exact-main Cloudflare evidence:

```text
PRODUCTION_SOURCE_SHA=841d9f4ecd573c32e5f9ac7238d4109812a221bf
PRODUCTION_VERSION_ID=1ddc8c2d-5c44-4217-b64b-61470d0cbe08
PRODUCTION_DEPLOYMENT_ID=5c42e58a-085a-4845-81be-133f0c11a295
PRODUCTION_TRAFFIC=100%
EXACT_MAIN_VALIDATION_RUN=29853754971
ARTIFACT_ID=8504527408
ARTIFACT_DIGEST=sha256:138858d3a95f227f1dafbc144bd077dd08c3766b5d93d958f60e9333cdd68cf9
```

No new Cloudflare version, deployment, traffic mutation, binding, secret, DNS, KV, Durable Object or cron change is part of PR #24.

## City Platform V1

```text
PR=21
PR_STATE=MERGED
PR_HEAD=85659454cf6983c39338e0cecbed8e1a6b3f3cb4
MERGE_SHA=8080735278e92f32e7f5928ac01f4c80c3b9e0e2
SECOND_PROMOTION_RESULT=PASS
```

Reinforced production validation completed:

```text
CONVERGENCE_ROUNDS=20
REQUIRED_ASSETS=13/13
BODY_HASH_PASS=13/13
SCHEMA_PASS=13/13
PRODUCTION_DESKTOP=PASS
PRODUCTION_MOBILE=PASS
PAGEERROR=0
CONSOLE_ERROR=0
DIRECT_NOMINATIM=0
```

The first City Platform promotion encountered a required-asset `404` and executed one verified rollback. The repaired second attempt passed without rollback. No third attempt occurred.

## Voice Copilot V1

```text
PR=23
BRANCH=feat/voy-voice-copilot-v1
PR_STATE=OPEN_DRAFT
PR_HEAD=677ce176f04deff452ad257d1ca3d87c7f58a4d1
PR_MERGED=NO
VOICE_PRODUCTION_PROMOTED=NO
```

Voice Copilot remains an unfinished Draft implementation. Its final CI, browser validation and zero-traffic Cloudflare candidate have not been completed. It must not be merged or promoted without a new validated head and explicit authorization.

## Google authenticated session planning

```text
PR=24
BRANCH=feat/voy-google-account-v1
PR_STATE=OPEN_DRAFT
SCOPE=DOCUMENTATION_ONLY
RUNTIME_CHANGES=0
WORKFLOW_CHANGES=0
BINDING_CHANGES=0
SECRET_CHANGES=0
PRODUCTION_CHANGES=0
```

Canonical semantics:

```text
AUTH_MODE=GOOGLE_IDENTITY_AUTHENTICATION
VOY_IDENTITY_MODE=EPHEMERAL_AUTHENTICATED_SESSION
PERSISTENT_VOY_ACCOUNT=NO
RETURNING_USER_RECOGNITION_AFTER_EXPIRY=NO
CROSS_DEVICE_CONTINUITY=NO
SESSION_DURATION=8h
```

The Google button may say `Continuar con Google`, but VOY must explain:

```text
“Iniciá una sesión temporal. VOY no guarda historial de viajes ni crea un perfil permanente.”
```

V1 must not claim account creation, user registration, saved profile or returning-user recognition after expiry.

## Google authentication architecture

```text
RECOMMENDED_MODE=redirect POST to Worker
LOGIN_ENDPOINT=POST /api/auth/google
SESSION_ENDPOINT=GET /api/auth/session
LOGOUT_ENDPOINT=POST /api/auth/logout
```

Mandatory request and token gates:

```text
Origin exact allowlist
Content-Type application/x-www-form-urlencoded
bounded request body
Google GIS double-submit CSRF
Google signature
recognized kid
allowed alg
exact aud
exact iss
valid exp
reasonable iat
nonce when configured
server-side verification only
```

After full verification, VOY may use only:

```text
sub
name optional
picture optional
iat
exp
```

Email is not an identifier and is not persisted. The raw ID token is discarded immediately after session creation. VOY receives no Google access or refresh token.

## Session cookie contract

```text
NAME=__Host-voy_session
Secure=YES
HttpOnly=YES
SameSite=Lax
Path=/
Max-Age=28800
Domain=ABSENT
AEAD=REQUIRED
```

Allowed encrypted payload:

```text
version
session_id random
subject derived or keyed-pseudonymized
issued_at
expires_at
auth_provider=google
```

Prohibited session content:

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

V1 is stateless. Logout expires the client cookie, but there is no global early revocation of a stolen valid cookie before expiry. This limitation is mitigated by the eight-hour lifetime, AEAD and strict cookie flags and must remain documented.

## Credential and environment state

```text
GOOGLE_CLOUD_PROJECT_TEST=NOT_CREATED
GOOGLE_CLOUD_PROJECT_PRODUCTION=NOT_CREATED
TEST_CLIENT_ID_CONFIGURED=NO
PRODUCTION_CLIENT_ID_CONFIGURED=NO
VOY_GOOGLE_CLIENT_ID=NOT_CONFIGURED
VOY_AUTH_SESSION_SECRET_V1=NOT_CREATED
PRIVACY_PAGE_PUBLIC=NO
TERMS_PAGE_PUBLIC=NO
REAL_AUTH_ACTIVATION=BLOCKED
```

Approved secret creation mechanism after explicit authorization:

```text
wrangler versions secret put VOY_AUTH_SESSION_SECRET_V1
```

Prohibited for this workflow:

```text
wrangler secret put
```

Testing and production must use separate Google Cloud projects and separate Web client IDs. Localhost belongs only to the testing project with explicit ports.

## Required implementation sequence after PR #24 approval

1. create a new branch from exact productive `main`;
2. implement `/privacy` and `/terms`;
3. validate and publish both pages;
4. link both from homepage, footer and login surface;
5. create separate Google Cloud test and production projects;
6. configure branding and public URLs;
7. create separate Web client IDs;
8. implement authentication behind a disabled feature flag;
9. obtain explicit authorization before creating the real session secret;
10. create the secret through Cloudflare Versions only;
11. create and validate a zero-traffic candidate;
12. test desktop, Android and Safari;
13. stop before activation for normal users.

## Authorization boundary

PR #24 remains Draft and documentation-only. It does not authorize:

```text
runtime authentication code
public privacy or terms deployment
Google Cloud project creation
OAuth client creation
real secret creation
Cloudflare traffic mutation
production login activation
persistent account storage
user database writes
travel history writes
exact location writes
```

## Exact next step

Review PR #24 as a documentation-only contract. After approval and merge authorization, begin a separate branch with public `/privacy` and `/terms` pages. Authentication runtime and real credentials remain blocked until those pages are publicly validated and a separate authorization permits credential creation.
