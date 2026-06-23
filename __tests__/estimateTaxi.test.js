/* eslint-disable @typescript-eslint/no-require-imports */
// Test: estimateTaxi() — Resolución N°217/2026 (tarifa taxi Santa Fe)
// Protege el cálculo de tarifa regulada más crítico del sistema.
// Runner: node:test (0 dependencias, viene con Node 18+).
// Ejecutar: npm test  o  node --test __tests__/

const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

// Cargar MobilityEngine (CJS export). Ruta relativa desde __tests__/ al módulo.
const MobilityEngine = require(path.join(__dirname, '..', 'public', 'core', 'mobilityEngine.js'));
const { estimateTaxi } = MobilityEngine;

// FareRegistry.taxi — valores autoritativos (Resolución N°217/2026, Santa Fe).
// bajada + ficha cada distFicha metros. Diurno 06:00-22:00, nocturno 22:00-06:00.
const TAXI_FARE = {
  diurno: { bajada: 1600, ficha: 160, distFicha: 130 },
  nocturno: { bajada: 1840, ficha: 184, distFicha: 130 }
};

describe('estimateTaxi — Resolución N°217/2026', () => {

  test('tarifa diurna 1km: bajada + 7 fichas (Math.floor, no ceil)', () => {
    // 1000m / 130m = 7.69 → floor = 7 fichas completadas (la 8va está en curso)
    // 1600 + 7 * 160 = 2720
    const r = estimateTaxi(1.0, TAXI_FARE, 8);
    assert.strictEqual(r, 2720);
  });

  test('tarifa nocturna es mayor que diurna para misma distancia', () => {
    const diurno = estimateTaxi(2.0, TAXI_FARE, 10);   // 10am
    const nocturno = estimateTaxi(2.0, TAXI_FARE, 23); // 11pm
    assert.ok(nocturno > diurno,
      `nocturno (${nocturno}) debe ser > diurno (${diurno})`);
  });

  test('distancia cero = solo bajada de bandera diurna', () => {
    const r = estimateTaxi(0, TAXI_FARE, 12);
    assert.strictEqual(r, 1600);
  });

  test('distancia cero nocturna = solo bajada nocturna', () => {
    const r = estimateTaxi(0, TAXI_FARE, 23);
    assert.strictEqual(r, 1840);
  });

  test('tarifa nunca negativa (degradación graceful para input inválido)', () => {
    // Math.floor(-7.69) = -8 → 1600 + (-8)*160 = 320 (positivo, no crashea)
    const r = estimateTaxi(-1, TAXI_FARE, 12);
    assert.ok(r >= 0, `result (${r}) debe ser >= 0 incluso con distancia negativa`);
  });

  test('frontera horario: 22:00=nocturno, 05:00=nocturno, 06:00=diurno', () => {
    // 1km: 7 fichas en ambos modos
    const t22 = estimateTaxi(1.0, TAXI_FARE, 22); // 22 < 22 = false → nocturno
    const t05 = estimateTaxi(1.0, TAXI_FARE, 5);  // 5 >= 6 = false → nocturno
    const t06 = estimateTaxi(1.0, TAXI_FARE, 6);  // 6 >= 6 && 6 < 22 = true → diurno
    const t21 = estimateTaxi(1.0, TAXI_FARE, 21); // 21 < 22 = true → diurno

    assert.strictEqual(t22, 1840 + 7 * 184, '22:00 debe ser nocturno');
    assert.strictEqual(t05, 1840 + 7 * 184, '05:00 debe ser nocturno');
    assert.strictEqual(t06, 1600 + 7 * 160, '06:00 debe ser diurno');
    assert.strictEqual(t21, 1600 + 7 * 160, '21:00 debe ser diurno');
  });

  test('ficha se cuenta cada 130m exactos (escalabilidad)', () => {
    // 130m = 1 ficha, 260m = 2 fichas, 390m = 3 fichas
    assert.strictEqual(estimateTaxi(0.130, TAXI_FARE, 8), 1600 + 160);
    assert.strictEqual(estimateTaxi(0.260, TAXI_FARE, 8), 1600 + 320);
    assert.strictEqual(estimateTaxi(0.390, TAXI_FARE, 8), 1600 + 480);
  });

});
