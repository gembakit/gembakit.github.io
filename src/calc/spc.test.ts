import { describe, expect, test } from 'vitest';
import { ALL_TESTS, imr, SPC_CONSTANTS, specialCauses, xbarR } from './spc';
import { capability, indices, sigmaWithin } from './capability';
import { normalCdf } from './stats';

// NIST/SEMATECH e-Handbook 6.3.2.2, ejemplo de caudal (10 lotes):
// x̄ = 50,81; MR̄ = 1,8778; LSC = 55,8041; LIC = 45,8159.
export const NIST_FLOW = [49.6, 47.6, 49.9, 51.3, 47.8, 51.2, 52.6, 52.4, 53.6, 52.1];

describe('constantes de las cartas', () => {
  test('A2 de NIST = 3 ÷ (d2·√n) con los d2 de ASTM, a tres decimales', () => {
    for (let n = 2; n <= 10; n++) {
      const k = SPC_CONSTANTS[n]!;
      expect(Math.abs(3 / (k.d2 * Math.sqrt(n)) - k.A2)).toBeLessThan(0.001);
    }
  });
});

describe('carta I-MR', () => {
  test('NIST 6.3.2.2: caudal → x̄ 50,81, MR̄ 1,8778, límites 55,8041 y 45,8159', () => {
    const r = imr(NIST_FLOW).result!;
    expect(r.individuals.center).toBeCloseTo(50.81, 10);
    expect(r.mrBar).toBeCloseTo(1.8778, 4);
    expect(r.individuals.ucl).toBeCloseTo(55.8041, 3);
    expect(r.individuals.lcl).toBeCloseTo(45.8159, 3);
    // MR: LSC = 3,267 × MR̄.
    expect(r.movingRange.ucl).toBeCloseTo(3.267 * 1.8778, 3);
    // NIST: ningún punto fuera de los límites.
    expect(r.signalsI.filter((s) => s.test === 1)).toEqual([]);
    expect(r.mr[0]).toBeNull();
  });

  test('límites con los primeros puntos: los de después se comparan con ellos', () => {
    const v = [...NIST_FLOW, 60, 61, 62];
    const r = imr(v, { limitPoints: 10 }).result!;
    expect(r.individuals.center).toBeCloseTo(50.81, 10);
    expect(r.signalsI.find((s) => s.test === 1)!.points).toEqual([10, 11, 12]);
  });
});

describe('pruebas de causa especial (Nelson, numeración de Minitab)', () => {
  const sig = (v: number[], tests = ALL_TESTS) => specialCauses(v, 0, 1, tests);
  test('1: un punto a más de 3σ', () => expect(sig([0, 3.5, 0], [1])).toEqual([{ test: 1, points: [1] }]));
  test('2: 9 seguidos del mismo lado', () => expect(sig(Array(9).fill(0.5), [2])).toEqual([{ test: 2, points: [8] }]));
  test('3: 6 seguidos subiendo', () => expect(sig([-1, -0.5, 0, 0.2, 0.4, 0.6], [3])).toEqual([{ test: 3, points: [5] }]));
  test('4: 14 alternando', () => expect(sig(Array.from({ length: 14 }, (_, i) => (i % 2 ? 0.5 : -0.5)), [4])).toEqual([{ test: 4, points: [13] }]));
  test('5: 2 de 3 a más de 2σ del mismo lado', () => expect(sig([2.5, 0, 2.2], [5])).toEqual([{ test: 5, points: [2] }]));
  test('6: 4 de 5 a más de 1σ del mismo lado', () => expect(sig([1.5, 1.2, 0, 1.1, 1.3], [6])).toEqual([{ test: 6, points: [4] }]));
  test('7: 15 dentro de 1σ', () => expect(sig(Array(15).fill(0.2), [7])).toEqual([{ test: 7, points: [14] }]));
  test('8: 8 fuera de 1σ por cualquier lado', () => expect(sig([1.5, -1.5, 1.5, -1.5, 1.5, -1.5, 1.5, -1.5], [8])).toEqual([{ test: 8, points: [7] }]));
});

describe('carta X-barra R', () => {
  test('subgrupos de 3: medias, rangos y límites con A2 = 1,023, D4 = 2,575', () => {
    const v = [10, 12, 11, 13, 11, 12, 9, 11, 10, 12, 12, 12];
    const r = xbarR(v, 3).result!;
    expect(r.means).toEqual([11, 12, 10, 12]);
    expect(r.ranges).toEqual([2, 2, 2, 0]);
    expect(r.rBar).toBe(1.5);
    expect(r.xbar.center).toBe(11.25);
    expect(r.xbar.ucl).toBeCloseTo(11.25 + 1.023 * 1.5, 12);
    expect(r.range.ucl).toBeCloseTo(2.575 * 1.5, 12);
    expect(r.range.lcl).toBe(0);
    expect(r.sigmaWithin).toBeCloseTo(1.5 / 1.693, 12);
  });

  test('avisos: tamaño fuera de tabla, pocos subgrupos, datos sobrantes', () => {
    expect(xbarR([1, 2, 3], 11).warnings).toEqual([{ code: 'subgroup-size', min: 2, max: 10 }]);
    expect(xbarR([1, 2, 3], 2).warnings).toEqual([{ code: 'few-subgroups', min: 2 }]);
    expect(xbarR([1, 2, 3, 4, 5], 2).warnings).toContainEqual({ code: 'leftover', count: 1 });
  });
});

describe('capacidad (NIST 6.1.6)', () => {
  test('el ejemplo de NIST: LIE 8, LSE 20, media 16, s 2 → Cp 1, Cpu 0,6667, Cpl 1,3333, Cpk 0,6667', () => {
    const e = indices(16, 2, 8, 20);
    expect(e.cp).toBeCloseTo(1, 12);
    expect(e.cpu).toBeCloseTo(0.6667, 4);
    expect(e.cpl).toBeCloseTo(1.3333, 4);
    expect(e.cpk).toBeCloseTo(0.6667, 4);
    // NIST: con 6σ entre límites y el proceso centrado, 0,27 % fuera (2.700 ppm).
    expect(indices(14, 2, 8, 20).ppmTotal).toBeCloseTo(2699.8, 0);
  });

  test('Cp, Cpk, Pp, Ppk, Cpm y PPM con los datos de caudal de NIST y límites 45 y 57', () => {
    const r = capability({ values: NIST_FLOW, lsl: 45, usl: 57, target: 51, subgroup: 1 }).result!;
    const sw = 1.8778 / 1.128;
    expect(r.sigmaWithin).toBeCloseTo(sw, 3);
    expect(r.within.cp!).toBeCloseTo(12 / (6 * r.sigmaWithin), 12);
    expect(r.within.cpk).toBeCloseTo(Math.min((57 - 50.81) / (3 * r.sigmaWithin), (50.81 - 45) / (3 * r.sigmaWithin)), 12);
    expect(r.overall.cpk).toBeCloseTo(Math.min((57 - 50.81) / (3 * r.sigmaOverall), (50.81 - 45) / (3 * r.sigmaOverall)), 12);
    expect(r.cpm!).toBeCloseTo(12 / (6 * Math.sqrt(r.sigmaOverall ** 2 + (50.81 - 51) ** 2)), 12);
    expect(r.within.ppmBelow).toBeCloseTo(normalCdf((45 - 50.81) / r.sigmaWithin) * 1e6, 6);
    expect(r.observedOut).toBe(0);
  });

  test('un solo límite: Cpk es el del lado que hay, sin Cp', () => {
    const r = capability({ values: NIST_FLOW, lsl: null, usl: 57, target: null, subgroup: 1 }).result!;
    expect(r.within.cp).toBeNull();
    expect(r.within.cpk).toBe(r.within.cpu);
  });

  test('sigma dentro con subgrupos: R̄ ÷ d2', () => {
    expect(sigmaWithin([10, 12, 11, 13, 11, 12], 3)).toBeCloseTo(2 / 1.693, 12);
  });

  test('avisos: sin límites, límites al revés, pocos datos, no capaz', () => {
    expect(capability({ values: [1, 2], lsl: null, usl: null, target: null, subgroup: 1 }).warnings).toEqual([{ code: 'no-spec' }]);
    expect(capability({ values: [1, 2], lsl: 5, usl: 3, target: null, subgroup: 1 }).warnings).toEqual([{ code: 'spec-order' }]);
    const w = capability({ values: NIST_FLOW, lsl: 48, usl: 54, target: null, subgroup: 1 }).warnings.map((x) => x.code);
    expect(w).toContain('few-data');
    expect(w).toContain('not-capable');
  });
});
