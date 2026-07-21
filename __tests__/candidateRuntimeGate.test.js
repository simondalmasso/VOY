/* eslint-disable @typescript-eslint/no-require-imports */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const modulePromise = import('../scripts/candidate-runtime-gate.mjs');
const contractPromise = import('../scripts/required-city-platform-assets.mjs');

function payload(versions) {
  return {
    success: true,
    result: {
      deployments: [{ id: 'deployment-final', versions }]
    }
  };
}

describe('candidate runtime gate', () => {
  test('accepts exactly one stable 100% and one candidate 0%', async () => {
    const gate = await modulePromise;
    const result = gate.inspectDeployment(payload([
      { version_id: 'stable', percentage: 100 },
      { version_id: 'candidate', percentage: 0 }
    ]), 'stable', 'candidate');
    assert.equal(result.valid, true);
    assert.equal(result.exactPair, true);
    assert.equal(result.active.id, 'deployment-final');
  });

  test('rejects missing, promoted or extra candidate traffic', async () => {
    const gate = await modulePromise;
    const missing = gate.inspectDeployment(payload([
      { version_id: 'stable', percentage: 100 }
    ]), 'stable', 'candidate');
    const promoted = gate.inspectDeployment(payload([
      { version_id: 'stable', percentage: 95 },
      { version_id: 'candidate', percentage: 5 }
    ]), 'stable', 'candidate');
    const extra = gate.inspectDeployment(payload([
      { version_id: 'stable', percentage: 100 },
      { version_id: 'candidate', percentage: 0 },
      { version_id: 'orphan', percentage: 0 }
    ]), 'stable', 'candidate');
    assert.equal(missing.valid, false);
    assert.equal(promoted.valid, false);
    assert.equal(extra.valid, false);
  });

  test('requires exact health version and build hash', async () => {
    const gate = await modulePromise;
    assert.equal(gate.healthMatches({ ok: true, version: 'V7.8.0', build_hash: 'abc1234' }, 'V7.8.0', 'abc1234'), true);
    assert.equal(gate.healthMatches({ ok: true, version: 'V7.8.0', build_hash: 'stable00' }, 'V7.8.0', 'abc1234'), false);
    assert.equal(gate.healthMatches({ ok: false, version: 'V7.8.0', build_hash: 'abc1234' }, 'V7.8.0', 'abc1234'), false);
  });

  test('requires twenty consecutive exact-asset rounds and at least 120 seconds', async () => {
    const gate = await modulePromise;
    assert.equal(gate.REQUIRED_CONSECUTIVE_ASSET_ROUNDS, 20);
    assert.equal(gate.MINIMUM_CONVERGENCE_DURATION_MS, 120_000);
    const startedAt = 1_000;
    assert.equal(gate.convergenceSatisfied({ consecutive: 19, startedAt, now: 130_000 }), false);
    assert.equal(gate.convergenceSatisfied({ consecutive: 20, startedAt, now: 120_999 }), false);
    assert.equal(gate.convergenceSatisfied({ consecutive: 20, startedAt, now: 121_000 }), true);
  });

  test('uses the canonical thirteen-asset contract', async () => {
    const contract = await contractPromise;
    assert.equal(contract.REQUIRED_CITY_PLATFORM_ASSET_COUNT, 13);
    assert.equal(contract.REQUIRED_CITY_PLATFORM_ASSETS.length, 13);
    assert.equal(contract.assertCanonicalAssetSet(), true);
    assert.ok(contract.REQUIRED_CITY_PLATFORM_ASSETS.some(asset => asset.path === '/cities/santa-fe/providers.json'));
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
