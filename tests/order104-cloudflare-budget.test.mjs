import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { shouldPollGpsLine } from '../public/tracker/store.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('GPS poll budget suppresses duplicate requests per line for 30 seconds', () => {
  const lastPollByLine = new Map();
  assert.equal(shouldPollGpsLine('9', 1000, lastPollByLine, 30000), true);
  lastPollByLine.set('9', 1000);
  assert.equal(shouldPollGpsLine('9', 30999, lastPollByLine, 30000), false);
  assert.equal(shouldPollGpsLine('9', 31000, lastPollByLine, 30000), true);
  assert.equal(shouldPollGpsLine('14', 5000, lastPollByLine, 30000), true);
  assert.equal(shouldPollGpsLine('  ', 50000, lastPollByLine, 30000), false);
});

test('browser GPS polling uses the 30-second cadence, avoids hidden-tab requests and resumes only when overdue', async () => {
  const app = await read('../public/app.js');
  assert.match(app, /const SF_GPS_POLL_INTERVAL_MS=30000/);
  assert.match(app, /setInterval\(pollSantaFeGps,SF_GPS_POLL_INTERVAL_MS\)/);
  assert.match(app, /if\(!sfGpsEnabled\|\|sfGpsPolling\|\|state\.fixtureOn\|\|document\.hidden/);
  assert.match(app, /shouldPollGpsLine\(selectedLineAtRequest,pollStartedAt,sfGpsLastPollByLine,SF_GPS_POLL_INTERVAL_MS\)/);
  assert.match(app, /document\.addEventListener\('visibilitychange',\(\)=>\{if\(!document\.hidden\)pollSantaFeGps\(\)\}\)/);
});
