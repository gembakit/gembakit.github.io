import { describe, expect, test } from 'vitest';
import { takt } from './takt';

// Casos de referencia de la ficha 3 (docs/fichas/fase-1.md).

describe('takt y cuello de botella', () => {
  test('Lean Lexicon (LEI): 480 min/día y 240 piezas/día → takt 2 min', () => {
    const r = takt({ available: 480, availableUnit: 'min', demand: 240, unit: 'min', cycles: [] }).result!;
    expect(r.takt).toBe(2);
    expect(r.line).toBeNull();
  });

  test('AllAboutLean (Roser): 280 h y 36.000 piezas → takt 28 s, con conversión de unidades', () => {
    expect(takt({ available: 1_008_000, availableUnit: 's', demand: 36_000, unit: 's', cycles: [] }).result!.takt).toBe(28);
    expect(takt({ available: 280, availableUnit: 'h', demand: 36_000, unit: 's', cycles: [] }).result!.takt).toBeCloseTo(28, 10);
  });

  test('CSJM Kanpur (Chase, Jacobs y Aquilano, «MS 800»): 500 coches en 420 min, 195 s de trabajo, 5 estaciones', () => {
    // El reparto entre las cinco estaciones no está publicado como texto; lo que cuenta es la suma (195 s) y el número.
    const out = takt({ available: 420, availableUnit: 'min', demand: 500, unit: 's', cycles: [50, 45, 40, 30, 30] });
    const r = out.result!;
    expect(r.takt).toBeCloseTo(50.4, 10);
    expect(r.line!.work).toBe(195);
    expect(r.line!.minStationsRaw).toBeCloseTo(3.87, 2);
    expect(r.line!.minStations).toBe(4);
    expect(Math.round(r.line!.efficiency * 100)).toBe(77);
    expect(Math.round(r.line!.idle * 100)).toBe(23);
    expect(out.warnings).toEqual([]);
  });

  test('ejemplo de la ficha: la estación de 2,3 min pasa del takt de 2 min y es el cuello', () => {
    const out = takt({ available: 480, availableUnit: 'min', demand: 240, unit: 'min', cycles: [1.8, 2.3, 1.5] });
    const line = out.result!.line!;
    expect(line.bottleneck).toBe(1);
    expect(line.capacity).toBeCloseTo(480 / 2.3, 10);
    expect(line.minStations).toBe(3);
    expect(line.over).toEqual([1]);
    expect(out.warnings).toEqual([{ code: 'over-takt' }]);
  });

  test('avisos: demanda cero, tiempo no positivo y estación sin tiempo', () => {
    expect(takt({ available: 480, availableUnit: 'min', demand: 0, unit: 'min', cycles: [] }).warnings).toEqual([{ code: 'not-positive', field: 'demand' }]);
    expect(takt({ available: 0, availableUnit: 'min', demand: 10, unit: 'min', cycles: [1, 0] }).warnings).toEqual([
      { code: 'not-positive', field: 'available' },
      { code: 'step-not-positive', step: 1 },
    ]);
  });
});
