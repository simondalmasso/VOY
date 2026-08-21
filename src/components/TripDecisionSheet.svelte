<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Destination } from '../features/destination/destination.types';
  import type { ProviderOptionModel } from '../features/providers/provider.types';
  import type { RouteResult } from '../features/trip/trip.types';
  import { nextCollapsedSnap, nextExpandedSnap, type SheetSnap } from '../app/interaction';
  import { prefersReducedMotion } from '../lib/motion';
  import ProviderOption from './ProviderOption.svelte';

  export let route: RouteResult | null;
  export let options: ProviderOptionModel[];
  export let onChoose: (option: ProviderOptionModel) => void;
  export let destination: Destination;
  export let snap: SheetSnap = 'peek';
  export let onSnapChange: (snap: SheetSnap) => void = () => undefined;

  const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const DRAG_CLICK_THRESHOLD = 8;
  const FLICK_THRESHOLD_PX_MS = 0.35;
  const MOMENTUM_HORIZON_MS = 180;
  const SPRING_STIFFNESS = 430;
  const SPRING_CRITICAL_DAMPING = 41.5;
  const SPRING_MOMENTUM_DAMPING = 33.2;
  const FLICK_STALE_MS = 100;

  let sheetElement: HTMLElement;
  let dragging = false;
  let suppressClick = false;
  let activePointerId: number | null = null;
  let dragStartY = 0;
  let dragStartTransformY = 0;
  let dragCurrentY = 0;
  let dragDistance = 0;
  let motionState: 'idle' | 'dragging' | 'settling' | 'keyboard' = 'idle';
  let releaseMode: 'none' | 'direct' | 'momentum' = 'none';
  let samples: Array<{ y: number; time: number }> = [];
  let animationFrame: number | null = null;

  onDestroy(() => {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  });

  function dateLabel(value: string | null | undefined): string {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'FECHA NO DISPONIBLE';
    return `${value.slice(8,10)} ${months[Number(value.slice(5,7)) - 1]}`;
  }

  $: destinationVerifiedDate = destination.verifiedAt || '';
  $: territoryVerifiedDate = destination.territory?.verifiedAt || '';
  $: destinationVerifiedLabel = dateLabel(destinationVerifiedDate);
  $: territoryVerifiedLabel = dateLabel(territoryVerifiedDate);

  function expandedSnap(): SheetSnap { return nextExpandedSnap(snap); }
  function collapsedSnap(): SheetSnap | null { return nextCollapsedSnap(snap); }
  function expand(): void { onSnapChange(expandedSnap()); }
  function collapse(): void { const next = collapsedSnap(); if (next) onSnapChange(next); }

  function cycle(): void {
    if (suppressClick) { suppressClick = false; return; }
    releaseMode = 'none';
    if (snap === 'expanded') collapse(); else expand();
  }

  function snapTargets(): Record<SheetSnap, number> {
    if (!sheetElement) return { expanded: 0, half: 0, peek: 0 };
    const sheetHeight = sheetElement.getBoundingClientRect().height;
    const parentHeight = sheetElement.parentElement?.getBoundingClientRect().height || sheetHeight;
    const mobile = window.matchMedia('(max-width: 759px)').matches;
    const halfVisible = parentHeight * (mobile ? 0.46 : 0.44);
    const peekVisible = mobile ? 154 : 158;
    return { expanded: 0, half: Math.max(0, sheetHeight - halfVisible), peek: Math.max(0, sheetHeight - peekVisible) };
  }

  function currentTranslateY(): number {
    if (!sheetElement) return 0;
    const transform = getComputedStyle(sheetElement).transform;
    if (!transform || transform === 'none') return snapTargets()[snap];
    try { return new DOMMatrixReadOnly(transform).m42; } catch { return snapTargets()[snap]; }
  }

  function applyTransform(value: number): void {
    dragCurrentY = value;
    sheetElement.style.transform = `translate3d(0, ${value}px, 0)`;
  }

  function rubberBand(value: number, min: number, max: number): number {
    if (value < min) {
      const distance = min - value;
      return min - (distance * 0.55) / (1 + distance / 180);
    }
    if (value > max) {
      const distance = value - max;
      return max + (distance * 0.55) / (1 + distance / 180);
    }
    return value;
  }

  function recordSample(y: number, time: number): void {
    samples.push({ y, time });
    const cutoff = time - 120;
    samples = samples.filter(sample => sample.time >= cutoff).slice(-8);
  }

  function releaseVelocity(releaseTime: number): number {
    if (samples.length < 2) return 0;
    const last = samples[samples.length - 1];
    if (!last || releaseTime - last.time > FLICK_STALE_MS) return 0;
    let first = samples[samples.length - 2];
    if (!first) return 0;
    for (let index = samples.length - 2; index >= 0; index -= 1) {
      const candidate = samples[index];
      if (!candidate) continue;
      if (last.time - candidate.time > 70) break;
      first = candidate;
      if (last.time - candidate.time >= 16) break;
    }
    const elapsed = last.time - first.time;
    return elapsed > 0 ? (last.y - first.y) / elapsed : 0;
  }

  function nearestSnap(projectedY: number): SheetSnap {
    const targets = snapTargets();
    const snaps: SheetSnap[] = ['expanded', 'half', 'peek'];
    let best: SheetSnap = 'expanded';
    for (const candidate of snaps) {
      if (Math.abs(targets[candidate] - projectedY) < Math.abs(targets[best] - projectedY)) best = candidate;
    }
    return best;
  }

  function cancelSpring(): void {
    if (animationFrame !== null) { cancelAnimationFrame(animationFrame); animationFrame = null; }
  }

  function finishVisualSettle(targetY: number): void {
    applyTransform(targetY);
    animationFrame = requestAnimationFrame(() => {
      animationFrame = null;
      motionState = 'idle';
      sheetElement.style.transform = '';
    });
  }

  function springTo(targetY: number, initialVelocityPxMs: number, momentum: boolean): void {
    cancelSpring();
    if (prefersReducedMotion()) { finishVisualSettle(targetY); return; }
    let position = dragCurrentY;
    let velocity = initialVelocityPxMs * 1000;
    let lastTime = performance.now();
    const damping = momentum ? SPRING_MOMENTUM_DAMPING : SPRING_CRITICAL_DAMPING;
    const step = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const acceleration = -SPRING_STIFFNESS * (position - targetY) - damping * velocity;
      velocity += acceleration * dt;
      position += velocity * dt;
      applyTransform(position);
      if (Math.abs(position - targetY) <= 0.5 && Math.abs(velocity) <= 4) { finishVisualSettle(targetY); return; }
      animationFrame = requestAnimationFrame(step);
    };
    animationFrame = requestAnimationFrame(step);
  }

  function startDrag(event: PointerEvent): void {
    if (activePointerId !== null) return;
    cancelSpring();
    suppressClick = false;
    releaseMode = 'none';
    dragging = true;
    motionState = 'dragging';
    activePointerId = event.pointerId;
    dragStartY = event.clientY;
    dragStartTransformY = currentTranslateY();
    dragCurrentY = dragStartTransformY;
    dragDistance = 0;
    samples = [];
    recordSample(event.clientY, event.timeStamp);
    applyTransform(dragStartTransformY);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent): void {
    if (!dragging || event.pointerId !== activePointerId) return;
    dragDistance = event.clientY - dragStartY;
    const targets = snapTargets();
    applyTransform(rubberBand(dragStartTransformY + dragDistance, targets.expanded, targets.peek));
    recordSample(event.clientY, event.timeStamp);
  }

  function finishDrag(event: PointerEvent, cancelled = false): void {
    if (!dragging || event.pointerId !== activePointerId) return;
    const handle = event.currentTarget as HTMLElement;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    const moved = Math.abs(dragDistance);
    const velocity = cancelled ? 0 : releaseVelocity(event.timeStamp);
    dragging = false;
    activePointerId = null;
    if (moved < DRAG_CLICK_THRESHOLD && !cancelled) {
      motionState = 'idle';
      sheetElement.style.transform = '';
      return;
    }
    suppressClick = true;
    const momentum = Math.abs(velocity) >= FLICK_THRESHOLD_PX_MS;
    releaseMode = momentum ? 'momentum' : 'direct';
    const projectedY = dragCurrentY + velocity * MOMENTUM_HORIZON_MS;
    const targetSnap = nearestSnap(projectedY);
    const targetY = snapTargets()[targetSnap];
    motionState = 'settling';
    onSnapChange(targetSnap);
    springTo(targetY, velocity, momentum);
  }

  function keyboardSnap(target: SheetSnap | null): void {
    if (!target) return;
    cancelSpring();
    releaseMode = 'none';
    motionState = 'keyboard';
    sheetElement.style.transform = '';
    onSnapChange(target);
    requestAnimationFrame(() => { if (motionState === 'keyboard') motionState = 'idle'; });
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp') { event.preventDefault(); keyboardSnap(expandedSnap()); }
    if (event.key === 'ArrowDown') { event.preventDefault(); keyboardSnap(collapsedSnap()); }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); keyboardSnap(snap === 'expanded' ? collapsedSnap() : expandedSnap()); }
  }
</script>

<section bind:this={sheetElement} class="sheet" class:dragging class:settling={motionState === 'settling'} aria-labelledby="decision-title" data-testid="trip-sheet" data-snap={snap} data-motion-state={motionState} data-release-mode={releaseMode}>
  <button type="button" class="sheet-handle" aria-label={`Panel de decisión: ${snap}. Usá flechas para cambiar tamaño`} on:click={cycle} on:pointerdown={startDrag} on:pointermove={moveDrag} on:pointerup={(event) => finishDrag(event)} on:pointercancel={(event) => finishDrag(event, true)} on:keydown={handleKeydown} data-testid="sheet-handle"><span class="grab" aria-hidden="true"></span></button>
  <div class="sheet-content" data-testid="sheet-content">
    <header>
      <div><span>Viaje a</span><h2 id="decision-title">{destination.name}</h2></div>
      {#if route}<p><strong>{route.distanceKm.toFixed(1)} km</strong><span>{route.source === 'osrm_route' ? 'distancia de ruta' : 'línea recta estimada'}</span></p>{:else}<p><strong>Sin cálculo</strong><span>datos insuficientes</span></p>{/if}
    </header>
    {#if destination.verified && destination.provenance}
      <p class="ranking-note trust-line" data-testid="destination-provenance"><span aria-hidden="true">✓</span><span>Destino verificado · {destination.provenance.issuer} · <time datetime={destinationVerifiedDate}>{destinationVerifiedLabel}<span class="sr-only"> · {destinationVerifiedDate}</span></time></span></p>
    {:else if destination.territoryVerified && destination.territory}
      <p class="ranking-note trust-line" data-testid="destination-provenance"><span aria-hidden="true">✓</span><span>Territorio verificado · GeoRef Argentina V2 · <time datetime={territoryVerifiedDate}>{territoryVerifiedLabel}<span class="sr-only"> · {territoryVerifiedDate}</span></time></span></p>
    {:else}
      <p class="ranking-note" data-testid="destination-provenance">Procedencia territorial no verificada.</p>
    {/if}
    <p class="ranking-note destination-address">{destination.address}</p>
    <div class="options" role="list" aria-live="polite">{#each options as option (option.id)}<ProviderOption {option} {onChoose} />{/each}</div>
    <details class="methodology"><summary>Cómo comparamos</summary><p>El orden es determinista según el modo elegido. Si un precio, tiempo o dato no puede verificarse, VOY no lo inventa.</p></details>
  </div>
</section>
