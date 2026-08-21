const NEWTON_ITERATIONS = 8;
const NEWTON_EPSILON = 1e-6;

function sampleCurve(a1: number, a2: number, t: number): number {
  const c = 3 * a1;
  const b = 3 * (a2 - a1) - c;
  const a = 1 - c - b;
  return ((a * t + b) * t + c) * t;
}

function sampleSlope(a1: number, a2: number, t: number): number {
  const c = 3 * a1;
  const b = 3 * (a2 - a1) - c;
  const a = 1 - c - b;
  return 3 * a * t * t + 2 * b * t + c;
}

function cubicBezierAt(x1: number, y1: number, x2: number, y2: number, progress: number): number {
  if (progress <= 0 || progress >= 1) return progress;
  let t = progress;
  for (let iteration = 0; iteration < NEWTON_ITERATIONS; iteration += 1) {
    const x = sampleCurve(x1, x2, t) - progress;
    if (Math.abs(x) < NEWTON_EPSILON) break;
    const slope = sampleSlope(x1, x2, t);
    if (Math.abs(slope) < NEWTON_EPSILON) break;
    t -= x / slope;
  }
  t = Math.max(0, Math.min(1, t));
  return sampleCurve(y1, y2, t);
}

export function voyEaseOut(progress: number): number {
  return cubicBezierAt(0.23, 1, 0.32, 1, progress);
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function searchPopoverTransition(node: HTMLElement) {
  const reduced = prefersReducedMotion();
  return {
    duration: reduced ? 120 : 180,
    easing: voyEaseOut,
    tick: (t: number) => {
      node.style.opacity = t >= 0.999 ? '' : String(t);
      node.style.transform = reduced || t >= 0.999 ? '' : `scale(${0.96 + 0.04 * t})`;
    }
  };
}

export function backdropTransition(node: HTMLElement) {
  const reduced = prefersReducedMotion();
  return {
    duration: reduced ? 120 : 250,
    easing: voyEaseOut,
    tick: (t: number) => {
      node.style.opacity = t >= 0.999 ? '' : String(t);
    }
  };
}

export function modalSurfaceTransition(node: HTMLElement) {
  const reduced = prefersReducedMotion();
  const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 759px)').matches;
  return {
    duration: reduced ? 120 : 250,
    easing: voyEaseOut,
    tick: (t: number) => {
      node.style.opacity = t >= 0.999 ? '' : String(t);
      if (reduced || t >= 0.999) {
        node.style.transform = '';
      } else if (mobile) {
        node.style.transform = `translate3d(0, ${(1 - t) * 24}px, 0)`;
      } else {
        node.style.transform = `scale(${0.98 + 0.02 * t})`;
      }
    }
  };
}
