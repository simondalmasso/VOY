/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

function runGuard(baseUrl, overrides = {}) {
  return new Promise((resolve) => {
    const child = spawn('bash', [path.join(__dirname, '..', 'scripts', 'verify-production-release.sh')], {
      env: {
        ...process.env,
        EXPECTED_HASH: '8228e35b00d6af5499dfdefa75820296cef31a50',
        EXPECTED_VERSION: 'V7.8.0',
        VOY_BASE_URL: baseUrl,
        MAX_ATTEMPTS: '3',
        POLL_SECONDS: '0',
        ...overrides
      }
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

async function withHealthServer(responses, callback) {
  let requestCount = 0;
  const server = http.createServer((request, response) => {
    if (request.url !== '/api/health') {
      response.writeHead(404).end();
      return;
    }
    const value = responses[Math.min(requestCount, responses.length - 1)];
    requestCount += 1;
    response.writeHead(value.status || 200, { 'content-type': 'application/json' });
    response.end(typeof value.body === 'string' ? value.body : JSON.stringify(value.body));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    await callback(`http://127.0.0.1:${address.port}`, () => requestCount);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('release guard tolerates stale edge responses and succeeds after convergence', async () => {
  await withHealthServer([
    { body: { ok: true, version: 'V7.8.0', build_hash: 'bb91266' } },
    { body: { ok: true, version: 'V7.8.0', build_hash: '8228e35' } }
  ], async (baseUrl, getRequestCount) => {
    const result = await runGuard(baseUrl);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(getRequestCount(), 2);
    assert.match(result.stdout, /attempt 1\/3: hash=bb91266/);
    assert.match(result.stdout, /attempt 2\/3: hash=8228e35/);
    assert.match(result.stdout, /Production release verified/);
  });
});

test('release guard fails after bounded attempts on a persistent mismatch', async () => {
  await withHealthServer([
    { body: { ok: true, version: 'V7.8.0', build_hash: 'bb91266' } }
  ], async (baseUrl, getRequestCount) => {
    const result = await runGuard(baseUrl);
    assert.equal(result.code, 1);
    assert.equal(getRequestCount(), 3);
    assert.match(result.stderr, /did not converge after 3 attempts/);
    assert.match(result.stderr, /expected hash=8228e35/);
  });
});

test('release guard rejects malformed or unhealthy responses', async () => {
  await withHealthServer([
    { body: '{not-json' },
    { body: { ok: false, version: 'V7.8.0', build_hash: '8228e35' } },
    { body: { ok: true, version: 'V7.7.0', build_hash: '8228e35' } }
  ], async (baseUrl) => {
    const result = await runGuard(baseUrl);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /did not converge after 3 attempts/);
    assert.match(result.stderr, /version=V7.8.0/);
  });
});
