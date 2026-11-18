import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../../i18n';
import { fromCycle, takt } from '../../calc/takt';
import { layoutSheet } from '../../sheet/layout';
import { evaluateGrid } from '../../sheet/evaluate';
import { taktSheet } from './sheet';
import { readTaktSaved, taktSavedSheet, toTaktInput, type TaktSaved } from './reading';
import { BOTTLING, PACKS } from './examples';

// Las fórmulas de la hoja deben dar lo mismo que el módulo de cálculo.

const t = MESSAGES.es;
const SECONDS = { s: 1, min: 60, h: 3600 } as const;

function check(s: TaktSaved) {
  const r = takt(toTaktInput(s)).result!;
  const def = taktSheet(s, r, t, 'es', { reading: [], version: '0', date: '1/1/2026' });
  const grid = layoutSheet(def);
  const values = evaluateGrid(grid);
  const v = (k: string) => values[grid.address[k]!] as number;
  const tu = SECONDS[s.resultUnit];
  expect(v('available')).toBeCloseTo(r.available / tu, 9);
  if (s.measure === 'time') expect(v('takt')).toBeCloseTo(r.takt / tu, 9);
  else expect(v('rate')).toBeCloseTo(fromCycle(r.takt, 'rate', s.resultUnit), 6);
  const line = r.line;
  if (line) {
    const name = def.table!.rows[line.bottleneck]!.label;
    expect(values[grid.address['bottleneckStation']!]).toBe(name);
    expect(v('capacity')).toBeCloseTo(line.capacity, 6);
    if (line.balance && s.measure === 'time') {
      expect(v('minStations')).toBe(line.balance.minStations);
      expect(v('efficiency')).toBeCloseTo(line.balance.efficiency, 9);
      expect(v('idle')).toBeCloseTo(line.balance.idle, 9);
    }
  }
  if (r.oee) {
    expect(v('expected')).toBeCloseTo(r.oee.expected, 6);
    expect(v('minOee')).toBeCloseTo(r.oee.minOee, 9);
    if (s.measure === 'time') expect(v('target')).toBeCloseTo(r.oee.targetCycle / tu, 9);
    else expect(v('target')).toBeCloseTo(fromCycle(r.oee.targetCycle, 'rate', s.resultUnit), 6);
  }
  return def;
}

const v1 = (available: number, availableUnit: string, demand: number, unit: string, cycles: number[]) =>
  readTaktSaved({ available, availableUnit, demand, unit, stations: cycles.map((cycle, i) => ({ name: `Estación ${i + 1}`, cycle })) })!;

describe('hoja de takt: fórmulas = cálculo', () => {
  test('Lean Lexicon: 480 min y 240 piezas, sin estaciones', () => {
    const def = check(v1(480, 'min', 240, 'min', []));
    expect(def.table).toBeUndefined();
    expect(def.results.map((r) => r.key)).toEqual(['available', 'takt']);
  });

  test('MS 800: 420 min pasados a segundos, cinco estaciones', () => {
    const def = check(v1(420, 'min', 500, 's', [50, 45, 40, 30, 30]));
    expect(def.inputs[0]).toMatchObject({ value: 25200, note: 's (= 420 min)' });
  });

  test('embotelladora: velocidades, descuentos, turnos y OEE', () => {
    const def = check(BOTTLING(t));
    expect(def.inputs.map((i) => i.key)).toEqual(['shift', 'd0', 'd1', 'shifts', 'demand', 'oee', 'theo']);
    expect(def.table!.columns.map((c) => c.key)).toEqual(['theo', 'real', 'rate']);
    expect(def.table!.highlightMin).toBe('rate');
    expect(def.notes.some((n) => n.startsWith('Medidas de Llenadora (/h): 44.000 · 45.500'))).toBe(true);
  });

  test('montaje de packs: medidas en segundos, resultados en minutos, con balanceo', () => {
    const def = check(PACKS(t));
    expect(def.results.map((r) => r.key)).toContain('minStations');
    // La columna de ciclo pasa de segundos a minutos.
    expect(def.table!.columns.at(-1)!.formula).toBe('IF({.real}>0,{.real}/60,{.theo}/60)');
  });

  test('con el teórico y sin medidas: la columna real no sale', () => {
    const s: TaktSaved = { ...PACKS(t), basis: 'theoretical' };
    const def = check(s);
    expect(def.table!.columns.map((c) => c.key)).toEqual(['theo', 'cycle']);
  });
});

describe('mediciones guardadas', () => {
  test('una medición de la versión 1 se lee como versión 2 sin perder nada', () => {
    const s = readTaktSaved({ available: 480, availableUnit: 'min', demand: 240, unit: 'min', stations: [{ name: 'Llenadora', cycle: 1.8 }, { name: '', cycle: 2.3 }] })!;
    expect(s).toMatchObject({ v: 2, shift: 480, shiftUnit: 'min', deductions: [], shifts: 1, measure: 'time', measureUnit: 'min', resultUnit: 'min', kind: 'assembly' });
    expect(s.stations).toEqual([
      { name: 'Llenadora', theoretical: null, actual: [1.8] },
      { name: '', theoretical: null, actual: [2.3] },
    ]);
    const def = taktSavedSheet(s, t, 'es', { version: '0', date: 'x' })!;
    expect(def.reading[0]!.text).toContain('Hay que sacar una unidad cada 2 min');
    expect(def.reading[0]!.text).toContain('Puesto 2 va a 2,3 min, más despacio que el takt');
    expect(def.table!.rows.map((r) => r.label)).toEqual(['Llenadora', 'Puesto 2']);
    expect(taktSavedSheet({ nada: 1 }, t, 'es', { version: '0', date: 'x' })).toBeNull();
  });

  test('la embotelladora dice que con el 75 % no llega y qué OEE necesita', () => {
    const def = taktSavedSheet(BOTTLING(t), t, 'es', { version: '0', date: 'x' })!;
    const text = def.reading[0]!.text;
    expect(text).toContain('Hay que sacar 40.000 botellas/h (una cada 0,09 s) para cumplir la demanda de 900.000 botellas.');
    expect(text).toContain('La más lenta es Llenadora (44.500 botellas/h, el 92,7 % de su teórico)');
    expect(text).toContain('Con un OEE del 75 %, la línea sacaría 810.000 botellas (36.000 botellas/h), por debajo de la demanda de 900.000 botellas: necesita al menos un 83,3 %.');
    expect(text).toContain('Para cumplir con ese OEE, cada máquina tendría que poder ir a 53.333 botellas/h como mínimo según su placa; Llenadora, la más lenta, va a 48.000 botellas/h.');
    expect(def.reading.some((l) => l.tone === 'warning' && l.text.startsWith('Etiquetadora varía mucho entre medidas (de 48.500 /h a 54.000 /h)'))).toBe(true);
  });
});
