# Optional Google ephemeral session runtime

Google authentication is optional and core VOY remains usable without it.

Endpoints:

```text
POST /api/auth/google
GET /api/auth/session
POST /api/auth/logout
```

Security contract:

- Google Identity Services redirect POST only;
- exact allowed Origin;
- bounded `application/x-www-form-urlencoded` body;
- `g_csrf_token` double-submit validation;
- nonce cookie validation;
- RS256 signature verification against official Google JWKs;
- recognized key and algorithm, exact audience, issuer, expiry, reasonable issued-at and exact authorized party for multi-audience tokens;
- raw credential discarded after verification;
- no Google access or refresh token.

Session:

```text
COOKIE=__Host-voy_session
Secure=YES
HttpOnly=YES
SameSite=Lax
Path=/
Max-Age=28800
ENCRYPTION=AES-GCM
PERSISTENT_ACCOUNT=NO
```

Only version, random session identifier, keyed-pseudonymous subject, issued/expiry times and provider are encrypted. Email, raw Google subject, token, location, trip history, audio and transcript are excluded.

Activation requires external account configuration:

```text
VOY_GOOGLE_CLIENT_ID=<public environment-specific client id>
VOY_AUTH_SESSION_SECRET_V1=<Cloudflare secret>
```

When either value is absent the login surface is hidden and `/api/auth/session` reports `enabled:false`.
