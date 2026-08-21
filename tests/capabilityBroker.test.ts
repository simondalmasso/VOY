import { afterEach, describe, expect, test } from 'bun:test';
import { capabilitySnapshot, clearCapabilityCacheForTests } from '../src/features/capabilities/capabilityBroker';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; clearCapabilityCacheForTests(); });

describe('territorial capability broker', () => {
  test('national base asserts no local provider or fare capability', async () => {
    let calls = 0;
    const fakeFetch = async (): Promise<Response> => { calls += 1; return new Response('{}', { status: 500 }); };
    globalThis.fetch = fakeFetch as unknown as typeof fetch;
    expect(await capabilitySnapshot('_default')).toEqual({ coverageKey: '_default', level: 'NATIONAL_BASE', providers: [], publicTransport: 'UNAVAILABLE' });
    expect(calls).toBe(0);
  });

  test('Santa Fe preserves APP_ONLY and REGULATED_FARE classes without upgrading unavailable bus', async () => {
    const providers = {
      source: 'verified local registry',
      providers: {
        uber: { name: 'Uber', available: true, verified: true, availability_status: 'verified_current', verified_at: '2026-08-20', expires_at: '2099-12-31', price_status: 'app_only' },
        didi: { name: 'DiDi', available: false, verified: false, price_status: 'app_only' }
      }
    };
    const fares = { fare_registry: {
      taxi: { status: 'regulated_current', source: 'Municipalidad', verified_at: '2026-08-20' },
      remis: { status: 'not_available', source: 'Sin verificar', verified_at: '' },
      bus: { status: 'not_available' }
    } };
    const fakeFetch = async (input: RequestInfo | URL): Promise<Response> => new Response(JSON.stringify(String(input).includes('providers.json') ? providers : fares), { status: 200 });
    globalThis.fetch = fakeFetch as unknown as typeof fetch;
    const result = await capabilitySnapshot('santa-fe');
    expect(result.level).toBe('LOCAL_VERIFIED');
    expect(result.providers.find(item => item.id === 'uber')).toMatchObject({ availability: 'VERIFIED_CURRENT', quoteClass: 'APP_ONLY' });
    expect(result.providers.find(item => item.id === 'taxi')).toMatchObject({ availability: 'VERIFIED_CURRENT', quoteClass: 'REGULATED_FARE' });
    expect(result.providers.find(item => item.id === 'remis')?.quoteClass).toBe('NO_VERIFIED_PRICE');
    expect(result.publicTransport).toBe('UNAVAILABLE');
  });
});
