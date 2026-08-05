import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import worker from '../worker/index';
import type { Env } from '../worker/contracts/env';

interface AssetPolicy {
  retired_public_paths: string[];
}

function testContext(): ExecutionContext {
  return {
    waitUntil() {},
    passThroughOnException() {}
  } as unknown as ExecutionContext;
}

function environment(calls: string[]): Env {
  return {
    ASSETS: {
      async fetch(input: RequestInfo | URL): Promise<Response> {
        const request = input instanceof Request ? input : new Request(input);
        const path = new URL(request.url).pathname;
        calls.push(path);
        if (path === '/manifest.json') return new Response('{"name":"VOY"}', { headers: { 'Content-Type': 'application/json' } });
        if (path === '/index.html') return new Response('<!doctype html><div id="app"></div>', { headers: { 'Content-Type': 'text/html' } });
        return new Response('missing', { status: 404, headers: { 'Content-Type': 'text/plain' } });
      }
    }
  } as unknown as Env;
}

async function dispatch(path: string, calls: string[], accept = '*/*'): Promise<Response> {
  const fetchHandler = worker.fetch;
  if (!fetchHandler) throw new Error('worker_fetch_missing');
  type IncomingRequest = Parameters<typeof fetchHandler>[0];
  return fetchHandler(new Request(`https://voy.invalid${path}`, { headers: { Accept: accept } }) as IncomingRequest, environment(calls), testContext());
}

describe('public asset truth boundary', () => {
  test('known legacy product and diagnostic routes are retired before ASSETS', async () => {
    const policy = JSON.parse(readFileSync('config/production-assets.json', 'utf8')) as AssetPolicy;
    const calls: string[] = [];
    for (const path of policy.retired_public_paths) {
      const response = await dispatch(path, calls, 'text/html,application/json');
      const body = await response.text();
      expect(response.status).toBe(410);
      expect(response.headers.get('content-type')).toContain('text/plain');
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(body).toBe('Recurso público retirado.');
      for (const forbidden of ['Belgrano y Freyre', 'window.VOY_BUILD_HASH', 'Uber', 'DiDi', 'Línea 8']) expect(body).not.toContain(forbidden);
    }
    expect(calls).toEqual([]);
  });

  test('the complete retired navigator namespace cannot fall through to SPA or assets', async () => {
    const calls: string[] = [];
    for (const path of ['/navigator/', '/navigator/other.js', '/NAVIGATOR/NAVIGATOR.JS', '/navigator/%6eavigator.js']) {
      const response = await dispatch(path, calls, 'text/html');
      expect(response.status).toBe(410);
      expect(await response.text()).toBe('Recurso público retirado.');
    }
    expect(calls).toEqual([]);
  });

  test('allowlisted assets remain served and unknown HTML routes use only the canonical SPA', async () => {
    const calls: string[] = [];
    const manifest = await dispatch('/manifest.json', calls, 'application/json');
    expect(manifest.status).toBe(200);
    const manifestPayload = await manifest.json() as { name: string };
    expect(manifestPayload).toEqual({ name: 'VOY' });
    const spa = await dispatch('/future-safe-route', calls, 'text/html');
    expect(spa.status).toBe(200);
    expect(await spa.text()).toContain('<div id="app"></div>');
    expect(calls).toEqual(['/manifest.json', '/future-safe-route', '/index.html']);
  });
});
