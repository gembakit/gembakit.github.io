import { describe, expect, test } from 'vitest';
import { fpyRty } from './fpy';

// Casos de referencia de la ficha 2 (docs/fichas/fase-1.md). Las fuentes
// publican porcentajes redondeados; la prueba admite solo ese redondeo.

describe('FPY y RTY: casos publicados', () => {
  test('iSixSigma: 4 pasos con FPY 85 % → RTY 52,2 %', () => {
    const r = fpyRty([{ fpy: 0.85 }, { fpy: 0.85 }, { fpy: 0.85 }, { fpy: 0.85 }]).result!;
    expect(Math.round(r.rty * 1000) / 10).toBe(52.2);
  });

  test('Fabrico: 97 %, 94 % y 91 % → RTY 83 %', () => {
    const r = fpyRty([{ fpy: 0.97 }, { fpy: 0.94 }, { fpy: 0.91 }]).result!;
    expect(Math.round(r.rty * 100)).toBe(83);
    expect(r.rty).toBeCloseTo(0.97 * 0.94 * 0.91, 12);
  });

  test('Fabrico: 200 placas, 14 fallan → FPY 93 %', () => {
    const r = fpyRty([{ entering: 200, good: 186 }]).result!;
    expect(r.fpy[0]).toBe(0.93);
    expect(r.rty).toBe(0.93);
  });
});

describe('FPY y RTY: reglas', () => {
  test('fábrica oculta = 1 − RTY; el peor paso es el de menor FPY', () => {
    const r = fpyRty([{ entering: 100, good: 98 }, { entering: 98, good: 90 }, { fpy: 0.99 }]).result!;
    expect(r.hiddenFactory).toBeCloseTo(1 - r.rty, 15);
    expect(r.worst).toBe(1);
  });

  test('el RTY nunca supera al peor paso', () => {
    const cases = [[0.5], [1, 1, 1], [0.999, 0.2, 0.7], [0, 1], [0.85, 0.85, 0.85, 0.85]];
    for (const c of cases) {
      const r = fpyRty(c.map((fpy) => ({ fpy }))).result!;
      expect(r.rty).toBeLessThanOrEqual(Math.min(...c));
    }
  });

  test('empate: se señala el primero', () => {
    expect(fpyRty([{ fpy: 0.9 }, { fpy: 0.8 }, { fpy: 0.8 }]).result!.worst).toBe(1);
  });

  test('avisos: más buenas que entradas, paso sin entradas, negativos, decimales y FPY fuera de 0–100 %', () => {
    expect(fpyRty([{ entering: 10, good: 11 }]).warnings).toEqual([{ code: 'good-exceed-entering', step: 0 }]);
    expect(fpyRty([{ fpy: 0.9 }, { entering: 0, good: 0 }]).warnings).toEqual([{ code: 'step-no-input', step: 1 }]);
    expect(fpyRty([{ entering: 10, good: -1 }]).warnings).toEqual([{ code: 'step-negative', step: 0 }]);
    expect(fpyRty([{ entering: 10.5, good: 3 }]).warnings).toEqual([{ code: 'step-not-whole', step: 0 }]);
    expect(fpyRty([{ fpy: 1.2 }, { fpy: -0.1 }]).warnings).toEqual([
      { code: 'fpy-out-of-range', step: 0 },
      { code: 'fpy-out-of-range', step: 1 },
    ]);
    expect(fpyRty([{ entering: 10, good: 11 }]).result).toBeNull();
    expect(fpyRty([]).warnings).toEqual([{ code: 'no-data' }]);
  });
});
