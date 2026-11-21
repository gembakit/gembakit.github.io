import { describe, expect, test } from 'vitest';
import { MICHELSO } from '../tools/descriptiva/examples';
import { adPValue, andersonDarling, descriptive, histogramBins, kurtosis, quantileExc, skewness } from './descriptive';

// NIST StRD, Univariate Summary Statistics, «Michelso» (velocidad de la luz,
// Dorsey 1944): https://www.itl.nist.gov/div898/strd/univ/data/Michelso.dat
// Valores certificados: media 299,852400000000; s 0,0790105478190518.

describe('estadística descriptiva', () => {
  test('NIST StRD Michelso: media y desviación certificadas', () => {
    expect(MICHELSO).toHaveLength(100);
    const r = descriptive(MICHELSO).result!;
    expect(r.mean).toBeCloseTo(299.8524, 10);
    expect(r.sd).toBeCloseTo(0.0790105478190518, 10);
    expect(r.se).toBeCloseTo(0.0790105478190518 / 10, 10);
  });

  test('NIST StRD NumAcc1 (10000001, 10000003, 10000002): media 10000002, s 1', () => {
    const r = descriptive([10000001, 10000003, 10000002]).result!;
    expect(r.mean).toBe(10000002);
    expect(r.sd).toBeCloseTo(1, 12);
  });

  test('cuartiles como QUARTILE.EXC (ejemplo de Microsoft: 15 y 43) e interpolados', () => {
    const s = [6, 7, 15, 36, 39, 40, 41, 42, 43, 47, 49];
    expect(quantileExc(s, 0.25)).toBe(15);
    expect(quantileExc(s, 0.75)).toBe(43);
    expect(quantileExc(s, 0.5)).toBe(40);
    // 1, 2, 3, 4: posición de Q1 = 5 × 0,25 = 1,25 → 1 + 0,25 × (2 − 1) = 1,25.
    expect(quantileExc([1, 2, 3, 4], 0.25)).toBeCloseTo(1.25, 12);
    expect(quantileExc([1, 2, 3, 4], 0.75)).toBeCloseTo(3.75, 12);
    // Con dos datos la posición se sale: no hay cuartil.
    expect(quantileExc([1, 2], 0.25)).toBeNull();
  });

  test('asimetría y curtosis como SKEW y KURT (ejemplos de Microsoft)', () => {
    const x = [3, 4, 5, 2, 3, 4, 5, 6, 4, 7];
    expect(skewness(x)).toBeCloseTo(0.359543, 6);
    expect(kurtosis(x)).toBeCloseTo(-0.151799637, 8);
  });

  test('Anderson-Darling: A² según NIST y valor p de Minitab por tramos', () => {
    // Caso pequeño calculado a mano con la fórmula de NIST: datos simétricos −1, 0, 1 (s = 1).
    const ad = andersonDarling([-1, 0, 1])!;
    const F = [0.15865525393145707, 0.5, 0.8413447460685429];
    const S = (1 / 3) * (Math.log(F[0]!) + Math.log(1 - F[2]!)) + (3 / 3) * (Math.log(F[1]!) + Math.log(1 - F[1]!)) + (5 / 3) * (Math.log(F[2]!) + Math.log(1 - F[0]!));
    expect(ad.a2).toBeCloseTo(-3 - S, 9);
    expect(ad.a2adj).toBeCloseTo(ad.a2 * (1 + 0.75 / 3 + 2.25 / 9), 12);
    // Tramos de la tabla, continuos en los cortes (comprobación de que no hay erratas).
    expect(adPValue(0.6)).toBeCloseTo(Math.exp(1.2937 - 5.709 * 0.6 + 0.0186 * 0.36), 12);
    expect(Math.abs(adPValue(0.6) - adPValue(0.599999))).toBeLessThan(0.005);
    expect(Math.abs(adPValue(0.34) - adPValue(0.339999))).toBeLessThan(0.005);
    expect(Math.abs(adPValue(0.2) - adPValue(0.199999))).toBeLessThan(0.005);
    // Valor crítico del 5 % para la normal con parámetros estimados (A²* ≈ 0,752, NIST e-Handbook): p ≈ 0,05.
    expect(adPValue(0.752)).toBeCloseTo(0.05, 2);
  });

  test('datos muy asimétricos: Anderson-Darling rechaza la normalidad y avisa', () => {
    const out = descriptive([1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 5, 8, 13, 21, 34, 55, 89]);
    expect(out.result!.normality!.p).toBeLessThan(0.05);
    expect(out.warnings.some((w) => w.code === 'not-normal')).toBe(true);
  });

  test('histograma: barras de ancho redondo que cuentan todos los datos', () => {
    const bins = histogramBins(MICHELSO);
    expect(bins.reduce((a, b) => a + b.count, 0)).toBe(100);
    expect(bins.length).toBeGreaterThanOrEqual(5);
    expect(bins.length).toBeLessThanOrEqual(15);
    const w = bins[0]!.to - bins[0]!.from;
    for (const b of bins) expect(b.to - b.from).toBeCloseTo(w, 9);
    expect(bins[0]!.from).toBeLessThanOrEqual(299.62);
    expect(bins[bins.length - 1]!.to).toBeGreaterThanOrEqual(300.07);
  });

  test('avisos: sin datos, un dato, pocos datos, todos iguales, atípicos', () => {
    expect(descriptive([]).warnings).toEqual([{ code: 'no-data' }]);
    expect(descriptive([5]).warnings).toEqual([{ code: 'single-value' }]);
    expect(descriptive([2, 2, 2]).warnings).toContainEqual({ code: 'constant' });
    expect(descriptive([1, 2, 3]).warnings).toContainEqual({ code: 'few-data', min: 20 });
    const out = descriptive([10, 11, 10, 12, 11, 10, 11, 12, 10, 11, 40]);
    expect(out.warnings).toContainEqual({ code: 'outliers', count: 1 });
    expect(out.result!.outliers).toEqual([10]);
  });
});
