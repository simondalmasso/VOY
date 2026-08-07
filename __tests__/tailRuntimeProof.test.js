/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const modulePromise = import('../scripts/tail-runtime-proof.mjs');

function event({ id = 'candidate', outcome = 'ok', url = 'https://voy.example/assets/app.js', method = 'GET', userAgent = 'HeadlessChrome', exceptions = [], response = { status: 200 } } = {}) {
  return { scriptVersion: { id }, outcome, exceptions, event: { request: { url, method, headers: { 'user-agent': userAgent } }, ...(response === undefined ? {} : { response }) } };
}

function stream(records) { return records.map(record => JSON.stringify(record, null, 2)).join('\n'); }

test('parses concatenated pretty JSON tail records', async () => {
  const gate = await modulePromise;
  const records = [event(), event({ id: 'other' })];
  assert.deepEqual(gate.parseJsonStream(stream(records)), records);
});

test('accepts only headless client-canceled static assets without exceptions', async () => {
  const gate = await modulePromise;
  const proof = gate.analyzeCandidateTail(stream([
    event(),
    event({ outcome: 'canceled', response: undefined, url: 'https://voy.example/assets/maplibre.js' })
  ]), 'candidate');
  assert.equal(proof.exactEvents, 2);
  assert.equal(proof.exceptions, 0);
  assert.deepEqual(proof.nonOkOutcomes, []);
  assert.equal(proof.benignClientCancellations, 1);
  assert.deepEqual(proof.benignClientCancellationPaths, ['/assets/maplibre.js']);
});

test('rejects canceled API, canceled HTML, non-headless cancellation and any exception', async () => {
  const gate = await modulePromise;
  for (const record of [
    event({ outcome: 'canceled', response: undefined, url: 'https://voy.example/api/health' }),
    event({ outcome: 'canceled', response: undefined, url: 'https://voy.example/' }),
    event({ outcome: 'canceled', response: undefined, userAgent: 'Mozilla/5.0' }),
    event({ outcome: 'exception', exceptions: [{ name: 'Error' }] })
  ]) {
    const proof = gate.analyzeCandidateTail(stream([record]), 'candidate');
    assert.ok(proof.nonOkOutcomes.length > 0 || proof.exceptions > 0);
  }
});

test('ignores other-version outcomes when assessing the exact candidate', async () => {
  const gate = await modulePromise;
  const proof = gate.analyzeCandidateTail(stream([
    event({ id: 'candidate' }),
    event({ id: 'other', outcome: 'exception', exceptions: [{ name: 'foreign' }] })
  ]), 'candidate');
  assert.deepEqual(proof.nonOkOutcomes, []);
  assert.equal(proof.exceptions, 0);
  assert.deepEqual(proof.observedVersionIds, ['candidate', 'other']);
});
