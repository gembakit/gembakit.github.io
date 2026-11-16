import { describe, expect, test } from 'vitest';
import { fromCycle, stationStats, takt, toCycle, type TaktInput } from './takt';

// Casos publicados de la ficha 3 (docs/fichas/fase-1.md) y ejemplos de la
// versión 2 (docs/fichas/takt-v2.md).

const base: TaktInput = {
  shift: 480,
  shiftUnit: 'min',
  deductions: [],
  shifts: 1,
  demand: 240,
  measure: 'time',
  measureUnit: 'min',
  kind: 'assembly',
  basis: 'mean',
  stations: [],
  oee: null,
};
const one = (...cycles: number[]) => cycles.map((c) => ({ theoretical: null, actual: [c] }));

describe('takt: casos publicados', () => {
  test('Lean Lexicon (LEI): 480 min/día y 240 piezas/día → takt 2 min', () => {
    const r = takt(base).result!;
    expect(r.takt).toBe(120);
    expect(r.line).toBeNull();
  });

  test('AllAboutLean (Roser): 280 h y 36.000 piezas → takt 28 s', () => {
    expect(takt({ ...base, shift: 280, shiftUnit: 'h', demand: 36_000 }).result!.takt).toBeCloseTo(28, 10);
  });

  test('CSJM Kanpur (Chase, Jacobs y Aquilano, «MS 800»): 500 coches en 420 min, 195 s de trabajo, 5 estaciones', () => {
    const out = takt({ ...base, shift: 420, demand: 500, measureUnit: 's', stations: one(50, 45, 40, 30, 30) });
    const r = out.result!;
    expect(r.takt).toBeCloseTo(50.4, 10);
    const b = r.line!.balance!;
    expect(b.work).toBe(195);
    expect(b.minStationsRaw).toBeCloseTo(3.87, 2);
    expect(b.minStations).toBe(4);
    expect(Math.round(b.efficiency * 100)).toBe(77);
    expect(Math.round(b.idle * 100)).toBe(23);
    expect(out.warnings).toEqual([]);
  });
});

describe('takt versión 2', () => {
  test('la resta del tiempo disponible: (8 h − 10 min − 20 min) × 3 turnos = 1.350 min', () => {
    const r = takt({
      ...base,
      shift: 8,
      shiftUnit: 'h',
      deductions: [
        { value: 10, unit: 'min' },
        { value: 20, unit: 'min' },
      ],
      shifts: 3,
      demand: 900_000,
    }).result!;
    expect(r.perShift).toBe(450 * 60);
    expect(r.available).toBe(1350 * 60);
    expect(r.takt).toBeCloseTo(0.09, 12);
    expect(fromCycle(r.takt, 'rate', 'h')).toBeCloseTo(40_000, 6);
  });

  test('ciclo y velocidad son lo mismo visto al revés: 48.000 /h = 0,075 s', () => {
    expect(toCycle(48_000, 'rate', 'h')).toBeCloseTo(0.075, 12);
    expect(toCycle(1.5, 'time', 'min')).toBe(90);
    expect(fromCycle(90, 'time', 'min')).toBe(1.5);
  });

  test('estadística de las medidas: media, mínimo, máximo, menor repetible y variación', () => {
    // En tiempos, el menor repetible es el segundo menor: 41 sale una vez, 48 o menos, dos.
    expect(stationStats([52, 48, 50, 41, 49], 'time')).toMatchObject({ n: 5, mean: 48, min: 41, max: 52, repeatable: 48 });
    // En velocidades, el segundo mayor.
    expect(stationStats([44_000, 45_500, 43_800, 44_700], 'rate')).toMatchObject({ mean: 44_500, repeatable: 44_700 });
    expect(stationStats([44_000, 45_500, 43_800, 44_700], 'rate')!.spread).toBeCloseTo(1700 / 44_500, 12);
    expect(stationStats([10], 'time')).toMatchObject({ n: 1, repeatable: null, spread: null });
    expect(stationStats([], 'time')).toBeNull();
  });

  test('embotelladora: máquinas en serie, la llenadora es el cuello y el OEE del 75 % no llega', () => {
    const out = takt({
      ...base,
      shift: 8,
      shiftUnit: 'h',
      deductions: [
        { value: 10, unit: 'min' },
        { value: 20, unit: 'min' },
      ],
      shifts: 3,
      demand: 900_000,
      measure: 'rate',
      measureUnit: 'h',
      kind: 'machines',
      stations: [
        { theoretical: 60_000, actual: [55_000, 56_500, 55_800, 56_200] },
        { theoretical: 48_000, actual: [44_000, 45_500, 43_800, 44_700] },
        { theoretical: 54_000, actual: [48_500, 53_800, 51_200, 54_000] },
        { theoretical: 60_000, actual: [52_000, 51_500, 53_000, 52_400] },
      ],
      oee: 0.75,
    });
    const r = out.result!;
    const line = r.line!;
    expect(line.bottleneck).toBe(1);
    expect(fromCycle(line.bottleneckCycle, 'rate', 'h')).toBeCloseTo(44_500, 6);
    expect(line.capacity).toBeCloseTo(81_000 * (44_500 / 3600), 6);
    expect(line.over).toEqual([]);
    // Máquinas: sin balanceo.
    expect(line.balance).toBeNull();
    expect(r.stations[1]!.ofTheoretical).toBeCloseTo(44_500 / 48_000, 12);
    const o = r.oee!;
    expect(o.reference).toBe(1);
    expect(o.expected).toBeCloseTo(810_000, 6);
    expect(o.minOee).toBeCloseTo(40_000 / 48_000, 12);
    expect(o.meets).toBe(false);
    // La etiquetadora varía un 10,6 %: se avisa.
    expect(out.warnings).toEqual([{ code: 'unstable', step: 2 }]);
  });

  test('con qué valor se calcula: media, menor repetible o teórico', () => {
    const stations = [{ theoretical: 100, actual: [120, 110, 130] }];
    const at = (basis: TaktInput['basis']) => takt({ ...base, measureUnit: 's', basis, stations }).result!.stations[0]!;
    expect(at('mean')).toMatchObject({ source: 'mean', value: 120, cycle: 120 });
    expect(at('repeatable')).toMatchObject({ source: 'repeatable', value: 120 });
    expect(at('theoretical')).toMatchObject({ source: 'theoretical', value: 100 });
  });

  test('si falta el valor pedido se usa otro y se avisa', () => {
    const out = takt({ ...base, measureUnit: 's', basis: 'repeatable', stations: [{ theoretical: 90, actual: [] }, { theoretical: null, actual: [100] }] });
    expect(out.result!.stations.map((s) => s.source)).toEqual(['theoretical', 'mean']);
    expect(out.warnings).toEqual([
      { code: 'basis-fallback', step: 0 },
      { code: 'basis-fallback', step: 1 },
    ]);
  });

  test('montaje: la estación por encima del takt es el cuello y la línea no llega', () => {
    const out = takt({ ...base, stations: one(1.8, 2.3, 1.5) });
    const line = out.result!.line!;
    expect(line.bottleneck).toBe(1);
    expect(line.capacity).toBeCloseTo(480 / 2.3, 10);
    expect(line.balance!.minStations).toBe(3);
    expect(line.over).toEqual([1]);
    expect(out.warnings).toEqual([{ code: 'over-takt' }]);
  });

  test('OEE: sin teórico no se puede comparar; con algunos, se avisa', () => {
    expect(takt({ ...base, oee: 0.8, stations: one(1.8) }).warnings).toEqual([{ code: 'oee-no-theoretical' }]);
    const out = takt({ ...base, oee: 0.8, stations: [{ theoretical: 1.5, actual: [1.8] }, { theoretical: null, actual: [1.7] }] });
    expect(out.result!.oee!.reference).toBe(0);
    expect(out.warnings).toEqual([{ code: 'oee-partial' }]);
  });

  test('avisos: datos no positivos, descuentos que se comen el turno, estación vacía, OEE fuera de rango', () => {
    expect(takt({ ...base, demand: 0 }).warnings).toEqual([{ code: 'not-positive', field: 'demand' }]);
    expect(takt({ ...base, deductions: [{ value: 0, unit: 'min' }] }).warnings).toEqual([{ code: 'deduction-not-positive', step: 0 }]);
    expect(takt({ ...base, deductions: [{ value: 8, unit: 'h' }] }).warnings).toEqual([{ code: 'no-time' }]);
    expect(takt({ ...base, stations: [{ theoretical: null, actual: [] }] }).warnings).toEqual([{ code: 'station-empty', step: 0 }]);
    expect(takt({ ...base, stations: [{ theoretical: 0, actual: [1] }] }).warnings).toEqual([{ code: 'step-not-positive', step: 0 }]);
    expect(takt({ ...base, oee: 1.2 }).warnings).toEqual([{ code: 'oee-range' }]);
  });
});
