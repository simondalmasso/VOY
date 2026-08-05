import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { isInsideSantaFe } from '../src/core/coordinates';
import { isAuthoritativeDestinationRecord, normalizeLocalDestination } from '../src/features/destination/destination.service';

interface RuntimeData {
  landmarks: Array<Record<string, unknown>>;
  bus_stops: unknown[];
  bike_stations: unknown[];
  status: string;
  components: Record<string, { status: string; count?: number }>;
}

const runtime = JSON.parse(readFileSync('public/cities/santa-fe/transport.json', 'utf8')) as RuntimeData;

function byId(id: string): Record<string, unknown> {
  const record = runtime.landmarks.find(item => item.canonicalId === id);
  if (!record) throw new Error(`missing_runtime_destination:${id}`);
  return record;
}

describe('territorial destination provenance', () => {
  test('runtime exposes only the three authoritative operational destinations', () => {
    expect(runtime.landmarks.map(item => item.canonicalId)).toEqual([
      'santafe:landmark:terminal-omnibus',
      'santafe:landmark:estacion-belgrano',
      'santafe:landmark:puente-colgante'
    ]);
    for (const landmark of runtime.landmarks) {
      expect(isInsideSantaFe({ lat: Number(landmark.lat), lon: Number(landmark.lon) })).toBe(true);
      expect(isAuthoritativeDestinationRecord(landmark)).toBe(true);
      const normalized = normalizeLocalDestination(landmark);
      expect(normalized?.operational).toBe(true);
      expect(normalized?.confidence).toBe('authoritative');
      expect(normalized?.provenance?.sourceUrl.startsWith('https://')).toBe(true);
      expect(normalized?.verifiedAt).toBe('2026-08-05');
    }
    expect(runtime.components.landmarks?.status).toBe('operational_authoritative_only');
    expect(runtime.components.landmarks?.count).toBe(3);
  });

  test('pins corrected addresses and coordinates against authoritative records', () => {
    expect(byId('santafe:landmark:terminal-omnibus')).toMatchObject({
      address: 'Belgrano 2910', lat: -31.643533, lon: -60.700503
    });
    expect(byId('santafe:landmark:estacion-belgrano')).toMatchObject({
      address: 'Bv. Gálvez 1150', lat: -31.638849, lon: -60.686789
    });
    expect(byId('santafe:landmark:puente-colgante')).toMatchObject({
      address: 'Costanera Oeste–Este, Laguna Setúbal', lat: -31.639764, lon: -60.682736
    });
  });

  test('rejects forged, stale or incomplete destination records even inside Santa Fe', () => {
    const trustedTerminal = byId('santafe:landmark:terminal-omnibus');
    const wrongAddress = { ...trustedTerminal, address: 'Belgrano y Freyre' };
    delete (wrongAddress as Record<string, unknown>).provenance;
    expect(normalizeLocalDestination(wrongAddress)).toBeNull();

    expect(normalizeLocalDestination({
      canonicalId: 'santafe:landmark:forged',
      nombre: 'Terminal de Ómnibus',
      address: 'Belgrano 2910',
      lat: -31.643533,
      lon: -60.700503,
      verified: false,
      source: 'curated',
      precision: 'poi'
    })).toBeNull();

    const forgedCoordinate = { ...trustedTerminal, lat: -31.600001, lon: -60.700001 };
    delete (forgedCoordinate as Record<string, unknown>).provenance;
    expect(normalizeLocalDestination(forgedCoordinate)).toBeNull();
  });

  test('keeps bus and bike operational data unavailable', () => {
    expect(runtime.bus_stops).toEqual([]);
    expect(runtime.bike_stations).toEqual([]);
    expect(runtime.components.bus_routes?.status).toBe('unavailable');
    expect(runtime.status).toContain('no_bus_or_bike_operational_data');
  });
});
