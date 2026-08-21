import type { SheetSnap } from '../app/interaction';

export type SheetMotionSample = Readonly<{ y: number; time: number }>;
export type SheetSnapTargets = Readonly<Record<SheetSnap, number>>;

export const SHEET_FLICK_THRESHOLD_PX_MS = 0.35;
export const SHEET_MOMENTUM_HORIZON_MS = 180;
export const SHEET_FLICK_STALE_MS = 100;

export function releaseVelocityPxMs(
  samples: readonly SheetMotionSample[],
  releaseTime: number
): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  if (!last || releaseTime - last.time > SHEET_FLICK_STALE_MS) return 0;

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

export function nearestSheetSnap(projectedY: number, targets: SheetSnapTargets): SheetSnap {
  const snaps: readonly SheetSnap[] = ['expanded', 'half', 'peek'];
  let best: SheetSnap = 'expanded';
  for (const candidate of snaps) {
    if (Math.abs(targets[candidate] - projectedY) < Math.abs(targets[best] - projectedY)) best = candidate;
  }
  return best;
}

export function decideSheetRelease(input: Readonly<{
  currentY: number;
  samples: readonly SheetMotionSample[];
  releaseTime: number;
  targets: SheetSnapTargets;
  cancelled?: boolean;
}>): Readonly<{
  velocityPxMs: number;
  momentum: boolean;
  projectedY: number;
  targetSnap: SheetSnap;
}> {
  const velocityPxMs = input.cancelled ? 0 : releaseVelocityPxMs(input.samples, input.releaseTime);
  const momentum = Math.abs(velocityPxMs) >= SHEET_FLICK_THRESHOLD_PX_MS;
  const projectedY = input.currentY + velocityPxMs * SHEET_MOMENTUM_HORIZON_MS;
  return {
    velocityPxMs,
    momentum,
    projectedY,
    targetSnap: nearestSheetSnap(projectedY, input.targets)
  };
}
