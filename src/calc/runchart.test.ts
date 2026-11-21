import { describe, expect, test } from 'vitest';
import { runChart, runsProbability, runsTail } from './runchart';
import { paretoAnalysis } from './pareto';

describe('prueba de rachas (Swed y Eisenhart, 1943)', () => {
  test('dos y dos: las seis ordenaciones dan 2, 3 o 4 corridas, dos de cada', () => {
    expect(runsProbability(2, 2, 2)).toBeCloseTo(2 / 6, 12);
    expect(runsProbability(2, 2, 3)).toBeCloseTo(2 / 6, 12);
    expect(runsProbability(2, 2, 4)).toBeCloseTo(2 / 6, 12);
  });

  test('las probabilidades suman 1', () => {
    for (const [a, b] of [
      [10, 10],
      [7, 12],
      [1, 5],
    ] as const) {
      let s = 0;
      for (let r = 2; r <= a + b; r++) s += runsProbability(a, b, r);
      expect(s).toBeCloseTo(1, 10);
    }
  });

  test('10 y 10: P(R ≤ 6) = 3.422 / 184.756 ≈ 0,0185 (valor crítico 6 de la tabla de Swed y Eisenhart al 2,5 %)', () => {
    const t = runsTail(10, 10, 6);
    expect(t.few).toBeCloseTo(3422 / 184756, 12);
    expect(t.few).toBeLessThan(0.025);
    expect(runsTail(10, 10, 7).few).toBeGreaterThan(0.025);
  });
});

describe('gráfico de corrida (Perla, Provost y Murray, 2011)', () => {
  test('mediana, corridas y puntos en la mediana que no cuentan', () => {
    // Mediana 5; el 5 no cuenta. Lados: − + − + + − → 5 corridas con 6 útiles.
    const r = runChart([3, 7, 5, 2, 8, 9, 1]).result!;
    expect(r.median).toBe(5);
    expect(r.useful).toBe(6);
    expect(r.runs).toBe(5);
    expect(r.above).toBe(3);
    expect(r.below).toBe(3);
  });

  test('desplazamiento: 6 seguidos por encima, aunque haya uno en la mediana en medio', () => {
    // 13 datos ordenados: 1,1,1,2,2,2,5,8,8,9,9,9,9 → mediana 5 (el 8.º dato, posición 7, cae en ella).
    const r = runChart([1, 2, 1, 2, 9, 8, 9, 5, 8, 9, 9, 1, 2]).result!;
    expect(r.median).toBe(5);
    const shift = r.signals.find((s) => s.kind === 'shift')!;
    expect(shift.direction).toBe(1);
    expect(shift.points).toEqual([4, 5, 6, 8, 9, 10]);
  });

  test('tendencia: 5 subiendo, con un repetido que no corta', () => {
    const r = runChart([5, 1, 2, 3, 3, 4, 6, 2, 5, 1, 4, 2]).result!;
    const trend = r.signals.find((s) => s.kind === 'trend')!;
    expect(trend.direction).toBe(1);
    expect(trend.points).toEqual([1, 2, 3, 4, 5, 6]);
    // Cuatro subiendo no es tendencia.
    expect(runChart([1, 2, 3, 4, 1, 2, 1, 2, 1, 2, 1, 2]).result!.signals.some((s) => s.kind === 'trend')).toBe(false);
  });

  test('pocas corridas: datos agrupados; muchas corridas: datos que se alternan', () => {
    const grouped = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 9, 8, 9, 8, 9, 8, 9, 8, 9, 8];
    expect(runChart(grouped).warnings.some((w) => w.code === 'few-runs')).toBe(true);
    const alternating = Array.from({ length: 20 }, (_, i) => (i % 2 ? 9 : 1));
    expect(runChart(alternating).warnings.some((w) => w.code === 'many-runs')).toBe(true);
    expect(runChart([3, 1, 2]).warnings).toContainEqual({ code: 'few-data', min: 10 });
  });
});

describe('Pareto', () => {
  test('de mayor a menor, con acumulado y pocos vitales hasta el 80 %', () => {
    const r = paretoAnalysis({
      items: [
        { name: 'Rayas', value: 12 },
        { name: 'Golpes', value: 45 },
        { name: 'Otros', value: 30 },
        { name: 'Manchas', value: 25 },
        { name: 'Rebabas', value: 8 },
      ],
      othersLast: 'Otros',
    }).result!;
    expect(r.total).toBe(120);
    expect(r.rows.map((x) => x.name)).toEqual(['Golpes', 'Manchas', 'Rayas', 'Rebabas', 'Otros']);
    expect(r.rows.map((x) => Math.round(x.cumulative * 1000) / 10)).toEqual([37.5, 58.3, 68.3, 75, 100]);
    // El que cruza el 80 % también es vital: aquí, hasta «Otros».
    expect(r.vital).toBe(5);
  });

  test('avisos: negativos, sin datos, pocas y muchas categorías, sin pocos vitales', () => {
    expect(paretoAnalysis({ items: [{ name: 'A', value: -1 }] }).warnings).toEqual([{ code: 'step-negative', step: 0 }]);
    expect(paretoAnalysis({ items: [{ name: 'A', value: 0 }] }).warnings).toEqual([{ code: 'no-data' }]);
    expect(paretoAnalysis({ items: [{ name: 'A', value: 3 }] }).warnings).toContainEqual({ code: 'few-categories' });
    const many = Array.from({ length: 13 }, (_, i) => ({ name: `C${i}`, value: 13 - i }));
    expect(paretoAnalysis({ items: many }).warnings).toContainEqual({ code: 'many-categories' });
    const flat = Array.from({ length: 5 }, (_, i) => ({ name: `C${i}`, value: 10 }));
    expect(paretoAnalysis({ items: flat }).warnings).toContainEqual({ code: 'flat-pareto' });
  });
});
