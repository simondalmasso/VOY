import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const evidenceDir = process.env.VOY_EVIDENCE_DIR || 'test-results/hotfix-production-before';
const expectedVersion = process.env.EXPECTED_STABLE_VERSION || 'V8.0.0';
const expectedHash = process.env.EXPECTED_STABLE_HASH || 'c6aa730';

test('hotfix baseline captures current production before candidate', async ({ page, request }, testInfo) => {
  test.skip(process.env.VOY_CAPTURE_HOTFIX_BASELINE !== '1', 'candidate pre-write production baseline only');
  mkdirSync(evidenceDir, { recursive: true });

  const healthResponse = await request.get(`/api/health?candidate_baseline=${Date.now()}`, {
    headers: { Accept: 'application/json' }
  });
  expect(healthResponse.ok()).toBe(true);
  const health = await healthResponse.json() as { ok?: boolean; version?: string; build_hash?: string };
  expect(health.ok).toBe(true);
  expect(health.version).toBe(expectedVersion);
  expect(health.build_hash).toBe(expectedHash);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('app-shell')).toBeVisible();
  await expect(page.getByTestId('destination-input')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.voyBuild || '')).toBe(expectedHash);

  await page.screenshot({
    path: join(evidenceDir, `${testInfo.project.name}-stable-production-before.png`),
    fullPage: true
  });
});
