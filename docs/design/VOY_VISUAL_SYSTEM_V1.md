# VOY Visual System V1 — Wayfinding

Status: Issue #39 candidate design system. This document does not authorize merge or production promotion.

## Product signature

VOY uses the visual language of an urban wayfinding instrument: a map is the operational canvas and the controls behave like route-building signs layered on top of it. The design must remain recognizable if the VOY wordmark and brand colors are removed.

The signature is structural:

- a directional journey spine links destination and origin;
- destination and origin use geometric route markers rather than generic ride-hail dots;
- planner surfaces use asymmetric corners and a clipped/notched edge;
- mode choice is a route dock with a position indicator, not a collection of pills;
- the decision sheet is a notched information panel with a lateral drag instrument and a route/signal top bar;
- provider rows use wayfinding ticks and evidence hierarchy rather than large ride-hail CTA cards;
- map chrome uses compact instrument labels and source/truth plaques;
- brand chrome uses a compact directional lockup and transit-signage-like metadata rhythm.

## Semantic tokens

Core roles are defined in `src/styles/voy-identity.css` and inherit the existing accessibility infrastructure.

- `--voy-route`: route/planning structure and selected mode.
- `--voy-wayfinding`: verified navigation/context structure.
- `--voy-signal`: action/attention signal.
- `--voy-surface`, `--voy-surface-2`: information surfaces.
- `--voy-ink`, `--voy-ink-soft`, `--voy-muted`: text hierarchy.
- `--voy-wayfinding-cut`: asymmetric corner geometry.
- `--voy-wayfinding-line`: directional spine thickness.

Color is supportive, not the identity mechanism. Shape, hierarchy and component composition carry the product signature.

## Typography

No external font request is required. VOY uses the platform sans stack for low-end Android performance and privacy. Hierarchy comes from a compact signage rhythm:

- brand: dense, heavy, directional lockup;
- planner promise: compact display scale, left aligned;
- navigation metadata: uppercase, high tracking, small scale;
- user-entered locations: strong mid-scale text;
- metrics: tabular, high-emphasis numeric scale;
- provenance: compact evidence labels distinct from primary actions.

## Geometry and spacing

- Default component corners are intentionally asymmetric or nearly square; pill geometry is reserved for semantic badges only.
- Main planner and map frame use a cut upper-right corner.
- Route elements align to a visible directional spine.
- Spacing remains based on the existing VOY spacing tokens; the identity layer does not add a second arbitrary spacing scale.
- Minimum interactive targets remain 44px on touch layouts.

## Map chrome

The map remains first. VOY adds only lightweight CSS chrome:

- `VOY / MAPA` instrument tag;
- compact truth/source plaque;
- no decorative image layer;
- no map-blocking hero art;
- no direct browser geocoder/routing calls are introduced.

## Journey controls

Destination is visually primary. Origin remains progressive disclosure:

1. initial state exposes `Usar mi ubicación` and `Definir origen`;
2. manual origin input opens only by explicit action or location failure;
3. Enter/deterministic selection commits the origin;
4. no `Aplicar` ceremony returns.

The visual layer must not change those state transitions.

## Decision sheet

The sheet is an evidence panel, not a generic rounded card:

- clipped corner silhouette;
- lateral handle rather than centered ride-hail handle treatment;
- route/signal bar across the leading edge;
- provenance label receives its own evidence treatment;
- providers are rows with wayfinding ticks and deterministic information hierarchy;
- snap states and map camera padding remain governed by the existing interaction state machine.

## Motion

Motion communicates direction or state only. All identity transitions inherit the existing bounded durations. Under `prefers-reduced-motion: reduce`, transitions and animations are reduced to zero by the identity layer.

## Accessibility and resilience

The visual system must preserve:

- keyboard navigation and Escape/Back hierarchy;
- 44px minimum touch controls on mobile;
- focus-visible ring;
- dark mode and system theme;
- reduced motion;
- text reflow without horizontal page overflow;
- explicit offline/error states;
- deterministic origin/destination/routing behavior;
- low-end Android performance: CSS geometry only, no generated imagery, webfonts, canvas decoration or additional runtime dependency.

## Acceptance gate

A candidate passes the visual directive only if all are true:

1. `data-visual-system="voy-wayfinding-v1"` is present on the application root.
2. Journey builder has a directional spine and asymmetric geometry.
3. Mode choice is a dock/rail, not pill-primary navigation.
4. Decision sheet has the VOY notched evidence-panel silhouette.
5. Map chrome carries the instrument/source treatment without obstructing route/origin/destination.
6. The mandatory Issue #39 viewport/state matrix passes.
7. Existing Map-First interaction, accessibility, dark-mode, reduced-motion and offline gates still pass.
8. No generated-image asset or external font is required.
