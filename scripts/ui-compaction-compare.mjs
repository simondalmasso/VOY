import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const beforeUrl = process.env.VOY_BEFORE_URL || 'http://127.0.0.1:8786';
const afterUrl = process.env.VOY_AFTER_URL || 'http://127.0.0.1:8787';
const out = process.env.VOY_UI_EVIDENCE_DIR || 'test-results/ui-compaction';
const cases = [
  { name: 'mobile-360x800', width: 360, height: 800, mobile: true },
  { name: 'mobile-390x844', width: 390, height: 844, mobile: true },
  { name: 'desktop-1280x800', width: 1280, height: 800, mobile: false }
];
const themes = ['light', 'dark'];

await mkdir(join(out, 'before'), { recursive: true });
await mkdir(join(out, 'after'), { recursive: true });
const browser = await chromium.launch({ headless: true });

async function capture(baseURL, stage, testCase, theme) {
  const context = await browser.newContext({
    viewport: { width: testCase.width, height: testCase.height },
    isMobile: testCase.mobile,
    hasTouch: testCase.mobile,
    serviceWorkers: 'block',
    userAgent: testCase.mobile
      ? 'Mozilla/5.0 (Linux; Android 13; SM-A225M) AppleWebKit/537.36 Chrome/150 Mobile Safari/537.36'
      : undefined
  });
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="destination-search"]').waitFor({ state: 'visible' });
  await page.locator('[data-testid="origin-control"]').waitFor({ state: 'visible' });
  await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
  await page.waitForTimeout(180);

  const metrics = await page.evaluate(() => {
    const q = selector => document.querySelector(selector);
    const rect = selector => {
      const node = q(selector);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom };
    };
    const height = selector => rect(selector)?.height ?? null;
    const style = selector => {
      const node = q(selector);
      return node ? getComputedStyle(node) : null;
    };
    const planner = style('.planner');
    const builder = style('[data-testid="journey-builder"]');
    const body = document.documentElement;
    return {
      destination: rect('[data-testid="destination-search"]'),
      origin: rect('[data-testid="origin-control"]'),
      builder: rect('[data-testid="journey-builder"]'),
      map: rect('.map-shell'),
      status: rect('.message'),
      destinationInputHeight: height('[data-testid="destination-input"]'),
      originInputHeight: height('[data-testid="origin-input"]'),
      gpsHeight: height('[data-testid="gps-button"]'),
      applyHeight: height('[data-testid="origin-apply"]'),
      plannerGap: planner ? Number.parseFloat(planner.rowGap || planner.gap || '0') : null,
      builderRadius: builder ? Number.parseFloat(builder.borderTopLeftRadius || '0') : null,
      pageOverflowX: Math.max(0, body.scrollWidth - body.clientWidth),
      viewport: { width: innerWidth, height: innerHeight }
    };
  });

  await page.screenshot({ path: join(out, stage, `${testCase.name}-${theme}.png`), fullPage: true });
  await context.close();
  return metrics;
}

const evidence = { beforeSha: process.env.VOY_BEFORE_SHA || null, afterSha: process.env.GITHUB_SHA || null, cases: [] };
let failed = false;
const failures = [];

for (const testCase of cases) {
  for (const theme of themes) {
    const before = await capture(beforeUrl, 'before', testCase, theme);
    const after = await capture(afterUrl, 'after', testCase, theme);
    const reduction = (a, b) => a && b ? 1 - (a / b) : null;
    const destinationReduction = reduction(after.destination?.height, before.destination?.height);
    const originReduction = reduction(after.origin?.height, before.origin?.height);
    const builderReduction = reduction(after.builder?.height, before.builder?.height);
    const checks = {
      destinationReducedAtLeast24Pct: destinationReduction !== null && destinationReduction >= .24,
      originReducedAtLeast24Pct: originReduction !== null && originReduction >= .24,
      builderVisiblyReduced: builderReduction !== null && builderReduction >= .24,
      destinationInput40to42: after.destinationInputHeight !== null && after.destinationInputHeight >= 40 && after.destinationInputHeight <= 42.5,
      originInput40to42: after.originInputHeight !== null && after.originInputHeight >= 40 && after.originInputHeight <= 42.5,
      gps36to40: after.gpsHeight !== null && after.gpsHeight >= 36 && after.gpsHeight <= 40.5,
      apply36to40: after.applyHeight !== null && after.applyHeight >= 36 && after.applyHeight <= 40.5,
      plannerGapMax10: after.plannerGap !== null && after.plannerGap <= 10.5,
      statusStripCompact: after.status !== null && after.status.height <= 36,
      subtleBuilderRadius: after.builderRadius !== null && after.builderRadius <= 14.5,
      noHorizontalOverflow: after.pageOverflowX <= 1,
      mobileMapNotShrunk: !testCase.mobile || (after.map !== null && before.map !== null && after.map.height >= before.map.height)
    };
    for (const [name, ok] of Object.entries(checks)) {
      if (!ok) { failed = true; failures.push(`${testCase.name}/${theme}:${name}`); }
    }
    evidence.cases.push({ name: testCase.name, theme, before, after, destinationReduction, originReduction, builderReduction, checks });
  }
}

await browser.close();
await writeFile(join(out, 'comparison.json'), `${JSON.stringify(evidence, null, 2)}\n`);
await writeFile(join(out, 'summary.txt'), [
  `RESULT=${failed ? 'FAIL' : 'PASS'}`,
  `BEFORE_SHA=${evidence.beforeSha || 'unknown'}`,
  `AFTER_SHA=${evidence.afterSha || 'unknown'}`,
  `CASES=${evidence.cases.length}`,
  `FAILURES=${failures.length ? failures.join(',') : 'NONE'}`
].join('\n') + '\n');

if (failed) {
  console.error(`UI compaction gate failed: ${failures.join(', ')}`);
  for (const entry of evidence.cases) {
    console.error(`${entry.name}/${entry.theme} DEST_REDUCTION=${entry.destinationReduction === null ? 'n/a' : (entry.destinationReduction * 100).toFixed(1) + '%'} ORIGIN_REDUCTION=${entry.originReduction === null ? 'n/a' : (entry.originReduction * 100).toFixed(1) + '%'} BUILDER_REDUCTION=${entry.builderReduction === null ? 'n/a' : (entry.builderReduction * 100).toFixed(1) + '%'}`);
  }
  process.exit(1);
}
console.log('UI_COMPACTION_GATE=PASS');
for (const entry of evidence.cases) {
  console.log(`${entry.name}/${entry.theme} DEST_REDUCTION=${(entry.destinationReduction * 100).toFixed(1)}% ORIGIN_REDUCTION=${(entry.originReduction * 100).toFixed(1)}% BUILDER_REDUCTION=${(entry.builderReduction * 100).toFixed(1)}%`);
}
