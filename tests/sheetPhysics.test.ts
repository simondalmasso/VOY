import { describe, expect, test } from 'bun:test';
import {
  decideSheetRelease,
  nearestSheetSnap,
  releaseVelocityPxMs,
  SHEET_FLICK_THRESHOLD_PX_MS
} from '../src/lib/sheetPhysics';

const targets = { expanded: 0, half: 240, peek: 520 } as const;

describe('ORDER-046 sheet release physics', () => {
  test('slow release stays direct and chooses the nearest semantic snap', () => {
    const samples = [
      { y: 300, time: 0 },
      { y: 295, time: 20 },
      { y: 290, time: 40 }
    ];
    const decision = decideSheetRelease({ currentY: 230, samples, releaseTime: 50, targets });
    expect(Math.abs(decision.velocityPxMs)).toBeLessThan(SHEET_FLICK_THRESHOLD_PX_MS);
    expect(decision.momentum).toBeFalse();
    expect(decision.targetSnap).toBe('half');
  });

  test('timestamped upward flick crosses the momentum threshold and projects to expanded', () => {
    const samples = [
      { y: 300, time: 1000 },
      { y: 285, time: 1012 },
      { y: 210, time: 1024 }
    ];
    const decision = decideSheetRelease({ currentY: 240, samples, releaseTime: 1028, targets });
    expect(decision.velocityPxMs).toBeLessThan(-SHEET_FLICK_THRESHOLD_PX_MS);
    expect(decision.momentum).toBeTrue();
    expect(decision.projectedY).toBeLessThan(targets.half);
    expect(decision.targetSnap).toBe('expanded');
  });

  test('timestamped downward flick projects from half toward peek', () => {
    const samples = [
      { y: 200, time: 2000 },
      { y: 225, time: 2012 },
      { y: 290, time: 2024 }
    ];
    const decision = decideSheetRelease({ currentY: 260, samples, releaseTime: 2028, targets });
    expect(decision.velocityPxMs).toBeGreaterThan(SHEET_FLICK_THRESHOLD_PX_MS);
    expect(decision.momentum).toBeTrue();
    expect(decision.targetSnap).toBe('peek');
  });

  test('stale velocity cannot manufacture momentum', () => {
    const samples = [
      { y: 300, time: 1000 },
      { y: 210, time: 1024 }
    ];
    expect(releaseVelocityPxMs(samples, 1200)).toBe(0);
    const decision = decideSheetRelease({ currentY: 240, samples, releaseTime: 1200, targets });
    expect(decision.momentum).toBeFalse();
    expect(decision.targetSnap).toBe('half');
  });

  test('cancelled release ignores velocity and remains position-driven', () => {
    const samples = [
      { y: 300, time: 1000 },
      { y: 210, time: 1024 }
    ];
    const decision = decideSheetRelease({ currentY: 500, samples, releaseTime: 1028, targets, cancelled: true });
    expect(decision.velocityPxMs).toBe(0);
    expect(decision.momentum).toBeFalse();
    expect(decision.targetSnap).toBe('peek');
  });

  test('nearest snap remains deterministic without velocity', () => {
    expect(nearestSheetSnap(20, targets)).toBe('expanded');
    expect(nearestSheetSnap(250, targets)).toBe('half');
    expect(nearestSheetSnap(500, targets)).toBe('peek');
  });
});
