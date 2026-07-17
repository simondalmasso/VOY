/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadAlarmHelpers() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'coordinatorAlarm.js'), 'utf8')
    .replace('export async function recordSweepExpiration', 'async function recordSweepExpiration')
    .replace('export async function runCoordinatorAlarmSweep', 'async function runCoordinatorAlarmSweep')
    .concat('\nglobalThis.__alarmHelpers = { recordSweepExpiration, runCoordinatorAlarmSweep };');
  const context = vm.createContext({ Number, Map });
  vm.runInContext(source, context, { filename: 'coordinatorAlarm.js' });
  return context.__alarmHelpers;
}

const { recordSweepExpiration, runCoordinatorAlarmSweep } = loadAlarmHelpers();

function cacheKey(index) {
  return `cache:${String(index).padStart(3, '0')}`;
}

function createHarness(entries, now = 10_000) {
  const data = new Map(entries);
  const listCalls = [];
  const alarmWrites = [];
  let alarmTime = null;
  const storage = {
    async get(key) { return data.get(key); },
    async put(key, value) { data.set(key, structuredClone(value)); },
    async delete(key) { data.delete(key); },
    async list(options) {
      listCalls.push({ ...options });
      assert.equal(Object.hasOwn(options, 'start'), false, 'inclusive start must never be used');
      const keys = [...data.keys()]
        .filter(key => key.startsWith(options.prefix))
        .filter(key => !options.startAfter || key > options.startAfter)
        .sort();
      return new Map(keys.slice(0, options.limit).map(key => [key, data.get(key)]));
    },
    async setAlarm(value) {
      alarmTime = value;
      alarmWrites.push(value);
    }
  };
  const coordinator = { state: { storage }, now: () => now };
  return {
    data,
    storage,
    coordinator,
    listCalls,
    alarmWrites,
    get alarmTime() { return alarmTime; },
    async fire() {
      alarmTime = null;
      return runCoordinatorAlarmSweep(coordinator);
    }
  };
}

function makeEntries(count, expirationFor) {
  return Array.from({ length: count }, (_, index) => [
    cacheKey(index),
    { expiresAt: expirationFor(index), body: { index } }
  ]);
}

async function completeSweep(harness, maxRuns = 10) {
  const results = [];
  for (let run = 0; run < maxRuns; run += 1) {
    const result = await harness.fire();
    results.push(result);
    if (!result.continued) return results;
  }
  assert.fail(`sweep did not complete within ${maxRuns} alarm executions`);
}

for (const expected of [0, 1, 49, 50, 51, 100, 101]) {
  test(`bounded sweep completes for ${expected} cache entries`, async () => {
    const expiration = 50_000;
    const harness = createHarness(makeEntries(expected, () => expiration));
    const results = await completeSweep(harness);

    assert.equal(results.reduce((sum, result) => sum + result.processed, 0), expected);
    assert.equal(harness.data.has('sweepCursor'), false);
    assert.equal(harness.data.has('sweepNextExpiration'), false);
    assert.equal(harness.alarmTime, expected === 0 ? null : expiration);
    assert.equal(results.length, expected === 50 ? 2 : expected === 100 ? 3 : Math.floor(expected / 50) + 1);
  });
}

test('uses real startAfter pagination across second and third alarm executions', async () => {
  const harness = createHarness(makeEntries(101, () => 80_000));
  const results = await completeSweep(harness);

  assert.deepEqual(results.map(result => result.processed), [50, 50, 1]);
  assert.equal(harness.listCalls[0].startAfter, undefined);
  assert.equal(harness.listCalls[1].startAfter, cacheKey(49));
  assert.equal(harness.listCalls[2].startAfter, cacheKey(99));
  assert.ok(harness.listCalls.every(call => call.limit === 50 && call.prefix === 'cache:'));
});

test('exactly 50 entries preserves first-page minimum through the empty terminal page', async () => {
  const harness = createHarness(makeEntries(50, index => 40_000 + index));

  const first = await harness.fire();
  assert.equal(first.continued, true);
  assert.equal(harness.data.get('sweepNextExpiration'), 40_000);
  assert.equal(harness.alarmTime, 11_000);

  const second = await harness.fire();
  assert.equal(second.processed, 0);
  assert.equal(second.continued, false);
  assert.equal(harness.alarmTime, 40_000);
  assert.equal(harness.data.has('sweepCursor'), false);
  assert.equal(harness.data.has('sweepNextExpiration'), false);
});

test('earliest future expiration on the first page survives three-page completion', async () => {
  const entries = makeEntries(101, index => index === 3 ? 25_000 : 90_000 + index);
  const harness = createHarness(entries);
  await completeSweep(harness);
  assert.equal(harness.alarmTime, 25_000);
});

test('future expirations only in the intermediate page are retained', async () => {
  const entries = makeEntries(101, index => {
    if (index < 50 || index === 100) return 9_000;
    return index === 63 ? 26_000 : 70_000 + index;
  });
  const harness = createHarness(entries);
  const results = await completeSweep(harness);

  assert.deepEqual(results.map(result => result.processed), [50, 50, 1]);
  assert.equal(harness.alarmTime, 26_000);
  assert.equal([...harness.data.keys()].filter(key => key.startsWith('cache:')).length, 50);
});

test('all expired entries are deleted without leaving a one-second alarm loop', async () => {
  const harness = createHarness(makeEntries(100, () => 9_000));
  const results = await completeSweep(harness);

  assert.deepEqual(results.map(result => result.processed), [50, 50, 0]);
  assert.equal([...harness.data.keys()].some(key => key.startsWith('cache:')), false);
  assert.equal(harness.alarmTime, null);
  assert.equal(harness.data.has('sweepCursor'), false);
  assert.equal(harness.data.has('sweepNextExpiration'), false);
});

test('no expired entries are deleted and the true minimum is scheduled', async () => {
  const harness = createHarness(makeEntries(51, index => 30_000 + (50 - index)));
  await completeSweep(harness);

  assert.equal([...harness.data.keys()].filter(key => key.startsWith('cache:')).length, 51);
  assert.equal(harness.alarmTime, 30_000);
});

test('final alarm is clamped to now plus 1000ms', async () => {
  const harness = createHarness(makeEntries(1, () => 10_500));
  await completeSweep(harness);
  assert.equal(harness.alarmTime, 11_000);
});

test('temporary sweep state is retained only while paging and metadata is untouched', async () => {
  const entries = new Map([
    ...makeEntries(51, () => 55_000),
    ['nextAllowedAt', 12_345],
    ['providerMetadata', { provider: 'nominatim', updatedAt: 9_999 }]
  ]);
  const harness = createHarness(entries);

  await harness.fire();
  assert.equal(harness.data.has('sweepCursor'), true);
  assert.equal(harness.data.has('sweepNextExpiration'), true);
  await harness.fire();

  assert.equal(harness.data.has('sweepCursor'), false);
  assert.equal(harness.data.has('sweepNextExpiration'), false);
  assert.equal(harness.data.get('nextAllowedAt'), 12_345);
  assert.deepEqual(harness.data.get('providerMetadata'), { provider: 'nominatim', updatedAt: 9_999 });
});

test('cache writes during an active sweep can lower the persisted minimum', async () => {
  const harness = createHarness(makeEntries(50, () => 60_000));
  await harness.fire();
  await recordSweepExpiration(harness.storage, 22_000);
  await harness.fire();
  assert.equal(harness.alarmTime, 22_000);
});
