/* eslint-disable @typescript-eslint/no-require-imports */
// Test: estimateTaxi() — Resolución Municipal 217/2026 (tarifa taxi Santa Fe)
// Protege el cálculo de tarifa regulada más crítico del sistema.
// Runner: node:test (0 dependencias, viene con Node 18+).

const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const MobilityEngine = require(path.join(__dirname, '..', 'public', 'core', 'mobilityEngine.js'));
const { estimateTaxi } = MobilityEngine;

// Segundo tramo vigente desde el 11 de julio de 2026.
const TAXI_FARE = {
  diurno: { bajada: 1790, ficha: 179, distFicha: 130 },
  nocturno: { bajada: 2058, ficha: 206, distFicha: 130 }
};

describe('estimateTaxi — Resolución Municipal 217/2026', () => {
  test('tarifa diurna 1km: bajada + 7 fichas completadas', () => {
    assert.strictEqual(estimateTaxi(1.0, TAXI_FARE, 8), 3043);
  });

  test('tarifa nocturna es mayor que diurna para misma distancia', () => {
    const diurno = estimateTaxi(2.0, TAXI_FARE, 10);
    const nocturno = estimateTaxi(2.0, TAXI_FARE, 23);
    assert.ok(nocturno > diurno);
  });

  test('distancia cero devuelve sólo la bajada correspondiente', () => {
    assert.strictEqual(estimateTaxi(0, TAXI_FARE, 12), 1790);
    assert.strictEqual(estimateTaxi(0, TAXI_FARE, 23), 2058);
  });

  test('frontera horaria: 22:00 y 05:00 nocturno; 06:00 y 21:00 diurno', () => {
    assert.strictEqual(estimateTaxi(1.0, TAXI_FARE, 22), 3500);
    assert.strictEqual(estimateTaxi(1.0, TAXI_FARE, 5), 3500);
    assert.strictEqual(estimateTaxi(1.0, TAXI_FARE, 6), 3043);
    assert.strictEqual(estimateTaxi(1.0, TAXI_FARE, 21), 3043);
  });

  test('ficha se cuenta cada 130 metros completos', () => {
    assert.strictEqual(estimateTaxi(0.129, TAXI_FARE, 8), 1790);
    assert.strictEqual(estimateTaxi(0.130, TAXI_FARE, 8), 1969);
    assert.strictEqual(estimateTaxi(0.260, TAXI_FARE, 8), 2148);
    assert.strictEqual(estimateTaxi(0.390, TAXI_FARE, 8), 2327);
  });
});
