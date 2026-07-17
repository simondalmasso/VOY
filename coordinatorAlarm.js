const CACHE_PREFIX = 'cache:';
const SWEEP_CURSOR_KEY = 'sweepCursor';
const SWEEP_NEXT_EXPIRATION_KEY = 'sweepNextExpiration';
const SWEEP_LIMIT = 50;
const CONTINUATION_DELAY_MS = 1000;

function validExpiration(value) {
  const expiration = Number(value);
  return Number.isFinite(expiration) && expiration > 0 ? expiration : null;
}

async function persistNextExpiration(storage, expiration) {
  if (expiration === null) {
    await storage.delete(SWEEP_NEXT_EXPIRATION_KEY);
    return;
  }
  await storage.put(SWEEP_NEXT_EXPIRATION_KEY, expiration);
}

export async function recordSweepExpiration(storage, expiresAt) {
  const cursor = await storage.get(SWEEP_CURSOR_KEY);
  if (typeof cursor !== 'string' || cursor.length === 0) return;

  const expiration = validExpiration(expiresAt);
  if (expiration === null) return;

  const current = validExpiration(await storage.get(SWEEP_NEXT_EXPIRATION_KEY));
  if (current === null || expiration < current) {
    await storage.put(SWEEP_NEXT_EXPIRATION_KEY, expiration);
  }
}

export async function runCoordinatorAlarmSweep(coordinator) {
  const storage = coordinator.state.storage;
  const now = coordinator.now();
  const cursor = await storage.get(SWEEP_CURSOR_KEY);
  let nextExpiration = validExpiration(await storage.get(SWEEP_NEXT_EXPIRATION_KEY));

  const options = { prefix: CACHE_PREFIX, limit: SWEEP_LIMIT };
  if (typeof cursor === 'string' && cursor.length > 0) {
    options.startAfter = cursor;
  }

  const entries = await storage.list(options);
  let lastKey = null;
  let deleted = 0;

  for (const [key, value] of entries.entries()) {
    lastKey = key;
    const expiration = validExpiration(value && value.expiresAt);
    if (expiration === null) continue;

    if (expiration <= now) {
      await storage.delete(key);
      deleted += 1;
      continue;
    }

    if (nextExpiration === null || expiration < nextExpiration) {
      nextExpiration = expiration;
    }
  }

  if (entries.size === SWEEP_LIMIT && lastKey) {
    await storage.put(SWEEP_CURSOR_KEY, lastKey);
    await persistNextExpiration(storage, nextExpiration);
    if (typeof storage.setAlarm === 'function') {
      await storage.setAlarm(Math.max(coordinator.now() + CONTINUATION_DELAY_MS, now + CONTINUATION_DELAY_MS));
    }
    return { processed: entries.size, deleted, continued: true, nextExpiration };
  }

  await storage.delete(SWEEP_CURSOR_KEY);
  await storage.delete(SWEEP_NEXT_EXPIRATION_KEY);

  if (nextExpiration !== null && typeof storage.setAlarm === 'function') {
    await storage.setAlarm(Math.max(nextExpiration, coordinator.now() + CONTINUATION_DELAY_MS, now + CONTINUATION_DELAY_MS));
  }

  return { processed: entries.size, deleted, continued: false, nextExpiration };
}
