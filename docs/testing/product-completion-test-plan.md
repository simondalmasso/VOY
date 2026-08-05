# Product completion validation plan

The final exact-head checkpoint requires:

```text
FROZEN_INSTALL
RELEASE_POLICY
LINT
FULL_NODE_TEST_SUITE
WRANGLER_DRY_RUN
LOCAL_BROWSER_DESKTOP
LOCAL_BROWSER_MOBILE
LOCAL_VOICE_DESKTOP_ANDROID_IPHONE
PWA_OFFLINE_AND_UPDATE
ACCESSIBILITY_SMOKES
AUTH_DISABLED_AND_SECURITY_CONTRACTS
PRIVACY_AND_STORAGE_ASSERTIONS
CANDIDATE_AT_0_PERCENT
CANDIDATE_DESKTOP_ANDROID_IPHONE
CANDIDATE_VOICE_DESKTOP_ANDROID_IPHONE
ASSET_HASH_AND_SCHEMA_CONVERGENCE
EXACT_VERSION_TAIL_NON_OK_0
```

Browser runs use clean storage profiles and analytics opt-out. Evidence records console errors, page errors, failed requests, horizontal overflow, direct browser Nominatim, storage/cookies, exact build identity and Cloudflare version override.

Candidate creation must re-read Cloudflare immediately before mutation, require one known stable version at 100%, reject unexpected nonzero traffic or binding drift, upload exactly one traceable version and deploy it at 0%. Production health and traffic must remain unchanged.
