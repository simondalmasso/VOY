/* eslint-disable @typescript-eslint/no-require-imports */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const modulePromise = import('../scripts/candidate-runtime-gate.mjs');

function payload(versions) {
  return {
    success: true,
    result: {
      deployments: [{ id: 'deployment-final', versions }]
    }
  };
}

describe('candidate runtime gate', () => {
  test('accepts one stable 100% and one candidate 0%', async () => {
    const gate = await modulePromise;
    const result = gate.inspectDeployment(payload([
      { version_id: 'stable', percentage: 100 },
      { version_id: 'candidate', percentage: 0 }
    ]), 'stable', 'candidate');
    assert.equal(result.valid, true);
    assert.equal(result.exactPair, true);
    assert.equal(result.active.id, 'deployment-final');
  });

  test('rejects missing or promoted candidate traffic', async () => {
    const gate = await modulePromise;
    const missing = gate.inspectDeployment(payload([
      { version_id: 'stable', percentage: 100 }
    ]), 'stable', 'candidate');
    const promoted = gate.inspectDeployment(payload([
      { version_id: 'stable', percentage: 95 },
      { version_id: 'candidate', percentage: 5 }
    ]), 'stable', 'candidate');
    assert.equal(missing.valid, false);
    assert.equal(promoted.valid, false);
  });

  test('requires exact health version and build hash', async () => {
    const gate = await modulePromise;
    assert.equal(gate.healthMatches({ ok: true, version: 'V7.8.0', build_hash: 'abc1234' }, 'V7.8.0', 'abc1234'), true);
    assert.equal(gate.healthMatches({ ok: true, version: 'V7.8.0', build_hash: 'stable00' }, 'V7.8.0', 'abc1234'), false);
    assert.equal(gate.healthMatches({ ok: false, version: 'V7.8.0', build_hash: 'abc1234' }, 'V7.8.0', 'abc1234'), false);
  });

  test('extracts exact candidate version events and non-ok outcomes', async () => {
    const gate = await modulePromise;
    const text = [
      '{"scriptVersion":{"id":"candidate"},"outcome":"ok"}',
      '{"scriptVersion":{"id":"candidate"},"outcome":"ok"}',
      '{"scriptVersion":{"id":"other"},"outcome":"exception"}'
    ].join('\n');
    assert.deepEqual(gate.extractTailProof(text, 'candidate'), {
      exactEvents: 2,
      observedVersionIds: ['candidate', 'other'],
      nonOkOutcomes: ['exception']
    });
  });

  test('rejects malformed deployment payloads', async () => {
    const gate = await modulePromise;
    assert.throws(() => gate.deploymentsFromPayload({ success: false }), /deployments_api_failed/);
    assert.throws(() => gate.deploymentsFromPayload({ success: true, result: {} }), /deployments_shape_unknown/);
  });
});
