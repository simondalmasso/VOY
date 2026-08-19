# VOY — External LLM/Product Review Synthesis for argentino.dev

Date: 2026-08-19
Status: non-canonical research input for Issue #43

## External input reviewed

Claude proposed a pre-launch checklist centered on: immediate product explanation, branding consistency, visual preview, physical-mobile QA, stability, directory submission, and optional social presence.

This synthesis separates useful product signals from unsupported assumptions.

## ACCEPT — incorporate into Issue #43

### 1. Immediate product comprehension
A first-time visitor must understand VOY without prior context. Do not add a blocking marketing landing page in front of the map-first product; instead make the product promise legible inside the first operational viewport.

Acceptance heuristic:
- identity is visible immediately;
- one concise sentence explains the product without claiming unsupported modes or coverage;
- primary action remains destination/origin planning, not marketing navigation;
- no modal/onboarding wall before the user can interact.

Recommended neutral promise:

> VOY compara opciones de movilidad con datos verificables según tu territorio.

Do not promise `auto + colectivo + bici + taxi` globally unless each mode is actually supported in the active territory.

### 2. Brand consistency
Remove product-global `Santa Fe` lock-in from title, manifest, metadata, shell copy and other national surfaces. Santa Fe remains provenance/reference city and first validated territory, not the product name.

### 3. Real-product social preview
Add OG/Twitter metadata and use a capture of the real validated VOY interface or a deterministic first-party composition derived from existing VOY assets. Generated imagery remains prohibited.

This is a public-presentation improvement, not an argentino.dev submission requirement.

### 4. Curator-mode QA
Before submission, execute a clean-profile, first-visit QA pass designed around what an external reviewer can encounter without project context.

Mandatory paths:
- cold load/no cache;
- map renders or truthful fallback is usable;
- location permission allow;
- location permission deny;
- manual origin fallback;
- destination search and selection;
- national territory/province/locality disambiguation;
- route calculation when contract permits;
- no `$0`, `NaN`, invented fares, invented ETA or stale private-app numeric prices;
- provider external action requires one-use explicit confirmation and opens only when current territorial availability is verified;
- offline/error behavior;
- pageerror=0 / unexpected console errors=0;
- reload does not cross-contaminate territorial state;
- low-end physical Android check in addition to automated mobile viewports.

Do not create favorites/history just to satisfy a generic checklist. Persistence is tested only for state the product intentionally supports.

### 5. Public repo presentation
Root README, correct homepage/demo URL, national description, verified coverage statement, data/provenance policy, tests, privacy, and `Hecho en Santa Fe, Argentina` remain part of the launch gate.

### 6. Pre-submission rehearsal
Run one final anonymous-review pass with no developer knowledge. The reviewer should be able to answer quickly:
- What is VOY?
- Is it Argentine?
- Where does it currently have verified local coverage?
- What can I do right now?
- Which result is fact, estimate, app-only price, or unavailable/unverified?

## PARTIAL — useful, but not a hard requirement

### Social/X presence
Could improve discovery but is not an acceptance gate. Do not delay product submission for social accounts.

### GIF/video demo
Potentially useful for promotion, but argentino.dev currently asks only URL + email. Not required for the product gate. Generated imagery remains prohibited; any future demo must be a recording of the real product.

### Mobile-data test
Useful additional resilience signal, but network type itself is not canonical. Test degraded/variable network conditions deterministically and optionally repeat on real mobile data.

## REFUTE / DO NOT IMPORT

### “Custom domain required / already has domain propio”
Do not use domain ownership as a requirement. A Firebase `web.app` or Workers `workers.dev` hostname is a provider subdomain, not by itself a custom owned domain. VOY should publish the exact currently verified production URL until a separately authorized canonical-domain change exists.

### “`_default` geocoding is blocked”
Not accepted as current fact. The repository already contains national `_default` context and the Worker geocoder applies `countrycodes=ar`; the actual national blockers are downstream Santa-Fe-specific coordinate, destination, provider, map and routing assumptions. Re-verify exact runtime before implementation.

### “Favorites/history must persist”
Not a launch requirement unless those features are explicitly part of product scope. Do not add product surface area for directory optics.

### “Show bus fares/lines as part of demo”
Only if current official territorial data supports it. VOY must remain fail-closed rather than manufacture a richer demo.

### “A separate landing page is required”
No. The first operational viewport can carry enough proposition/context. A separate landing page is acceptable only if evidence shows it improves comprehension without adding friction or hiding the map-first product.

### “Submit first and see what happens”
Issue #43 defines a stronger internal readiness bar. Submission occurs after the national product/public-packaging gates and production verification are green; do not use a curator as QA.

## argentino.dev facts verified 2026-08-19

The public site currently states:

- “Software, herramientas y productos digitales hechos en Argentina.”
- submission UI asks for project URL and email;
- copy says the project will be reviewed and added if it meets requirements;
- no public technical checklist, screenshot requirement, social-account requirement, or custom-domain requirement was observed in the current public submission UI.

## Research-backed UX implications

Mobile usability literature supports measuring effectiveness, efficiency and satisfaction rather than equating visual polish with usability. First-impression research also indicates that visual aesthetics can materially influence immediate interface evaluation. For VOY, that supports two independent gates: a distinctive visual system and a task-completion/resilience QA gate. Neither substitutes for the other.

## Relationship to Issue #43

This file is evidence/input only. Issue #43 remains the master product order. The implementation authority, sequencing, audit gates and no-production-mutation constraints in that order remain unchanged.
