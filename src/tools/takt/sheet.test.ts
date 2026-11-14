import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../../i18n';
import { takt, type TaktInput } from '../../calc/takt';
import { layoutSheet } from '../../sheet/layout';
import { evaluateGrid } from '../../sheet/evaluate';
import { taktSheet } from './sheet';
import { taktSavedSheet } from './reading';

// Las fórmulas de la hoja deben dar lo mismo que el módulo de cálculo, con
// los casos de referencia de la ficha 3.

function check(input: TaktInput) {
  const stations = input.cycles.map((cycle, i) => ({ name: `Estación ${i + 1}`, cycle }));
  const def = taktSheet(input, stations, MESSAGES.es, { reading: [], version: '0', date: '1/1/2026' });
  const grid = layoutSheet(def);
  const values = evaluateGrid(grid);
  const v = (k: string) => values[grid.address[k]!];
  const r = takt(input).result!;
  expect(v('takt') as number).toBeCloseTo(r.takt, 10);
  if (r.line) {
    expect(v('bottleneckCycle') as number).toBeCloseTo(r.line.bottleneckCycle, 10);
    expect(v('bottleneckStation')).toBe(`Estación ${r.line.bottleneck + 1}`);
    expect(v('capacity') as number).toBeCloseTo(r.line.capacity, 10);
    expect(v('minStations')).toBe(r.line.minStations);
    expect(v('efficiency') as number).toBeCloseTo(r.line.efficiency, 10);
    expect(v('idle') as number).toBeCloseTo(r.line.idle, 10);
    expect(grid.highlightMax).toBe(grid.address['cycle[]']);
  }
  return def;
}

describe('hoja de takt: fórmulas = cálculo', () => {
  test('Lean Lexicon: 480 min y 240 piezas, sin estaciones', () => {
    const def = check({ available: 480, availableUnit: 'min', demand: 240, unit: 'min', cycles: [] });
    expect(def.table).toBeUndefined();
    expect(def.results.map((r) => r.key)).toEqual(['takt']);
  });

  test('MS 800: 420 min pasados a segundos, cinco estaciones', () => {
    const def = check({ available: 420, availableUnit: 'min', demand: 500, unit: 's', cycles: [50, 45, 40, 30, 30] });
    // El tiempo disponible va en segundos, con el original en la nota.
    expect(def.inputs[0]).toMatchObject({ value: 25200, note: 's (= 420 min)' });
  });

  test('ejemplo de la ficha, con la estación por encima del takt', () => {
    check({ available: 480, availableUnit: 'min', demand: 240, unit: 'min', cycles: [1.8, 2.3, 1.5] });
  });

  test('medición guardada: la hoja dice lo mismo que la pantalla', () => {
    const def = taktSavedSheet(
      { available: 480, availableUnit: 'min', demand: 240, unit: 'min', stations: [{ name: 'Llenadora', cycle: 1.8 }, { name: '', cycle: 2.3 }] },
      MESSAGES.es,
      'es',
      { version: '0', date: 'x' },
    )!;
    expect(def.reading[0]!.text).toContain('Hay que terminar una pieza cada 2 min');
    expect(def.reading[0]!.text).toContain('Estación 2 tarda 2,3 min, por encima del takt');
    expect(def.table!.rows.map((r) => r.label)).toEqual(['Llenadora', 'Estación 2']);
    expect(taktSavedSheet({ nada: 1 }, MESSAGES.es, 'es', { version: '0', date: 'x' })).toBeNull();
  });
});
