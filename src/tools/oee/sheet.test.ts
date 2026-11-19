import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../../i18n';
import { oee, oeeView } from '../../calc/oee';
import { layoutSheet } from '../../sheet/layout';
import { evaluateGrid } from '../../sheet/evaluate';
import { oeeSheet } from './sheet';
import { oeeSavedSheet } from './reading';
import { BOTTLING, readOeeSaved, toOeeInput, VORNE, type OeeSaved } from './model';

// Las fórmulas de la hoja deben dar lo mismo que el módulo de cálculo.
const t = MESSAGES.es;
const plain = (s: string) => s.replace(/\u00a0/g, ' ');
const V1 = { shift: 480, plannedStops: 60, unplannedStops: 47, idealCycle: 1, total: 19271, rejects: 423 };

function check(s: OeeSaved) {
  const r = oee(toOeeInput(s)).result!;
  const def = oeeSheet(s, r, t, 'es', { reading: [], version: '0', date: 'x' });
  const grid = layoutSheet(def);
  const values = evaluateGrid(grid);
  const v = (k: string) => values[grid.address[k]!] as number;
  for (const k of ['availability', 'performance', 'quality', 'oee'] as const) expect(v(k)).toBeCloseTo(r[k], 12);
  expect(v('useful')).toBeCloseTo(r.minutes.useful, 9);
  expect(v('speed')).toBeCloseTo(r.minutes.speed, 9);
  expect(v('qualityLoss')).toBeCloseTo(r.minutes.quality, 9);
  if (grid.address['view']) expect(v('view')).toBeCloseTo(oeeView(r, s.views).oee, 12);
  return def;
}

describe('hoja de OEE: fórmulas = cálculo', () => {
  test('Vorne: una sola parada', () => {
    const def = check(VORNE(t));
    expect(def.table!.rows).toEqual([{ label: 'Otras', values: { min: 47, std: 0 } }]);
    expect(def.results.some((x) => x.key === 'view')).toBe(false);
  });

  test('embotelladora: categorías, velocidad en botellas/h y «OEE sin el tiempo estándar de las paradas»', () => {
    const def = check(BOTTLING(t));
    expect(def.inputs.find((x) => x.key === 'idealCycle')).toMatchObject({ value: 0.075, note: 's por unidad (= 48.000 botellas/h)' });
    expect(def.inputs.find((x) => x.key === 'shift')).toMatchObject({ value: 480, note: 'min (= 8 h)' });
    const view = def.results.find((x) => x.key === 'view')!;
    expect(view.label).toBe('OEE sin el tiempo estándar de las paradas');
    expect(def.notes[1]).toBe('Cambio de 330 ml a 500 ml: 40 min (Cambios de formato), estándar 30 min.');
  });

  test('quitando averías y cambios de formato, con el estándar marcado: no se cuenta dos veces', () => {
    const s: OeeSaved = { ...BOTTLING(t), views: { excluded: [0, 1], standard: true } };
    const def = check(s);
    expect(def.results.find((x) => x.key === 'view')!.label).toBe('OEE sin averías ni cambios de formato');
  });

  test('sin paradas no planificadas: sin tabla, disponibilidad 100 %', () => {
    check({ ...BOTTLING(t), stops: [], views: { excluded: [], standard: false } });
  });
});

describe('mediciones guardadas', () => {
  test('una medición de la versión 1 se lee como versión 2 sin perder nada', () => {
    const s = readOeeSaved(V1, t)!;
    expect(s).toMatchObject({ v: 2, shift: 480, shiftUnit: 'min', measure: 'time', measureUnit: 's', ideal: 1, total: 19271, rejects: 423 });
    expect(s.planned).toEqual([{ name: 'Paradas planificadas', value: 60, unit: 'min' }]);
    expect(s.stops).toEqual([{ name: 'Paradas no planificadas', minutes: 47, category: 6, standard: null }]);
    expect(Math.round(oee(toOeeInput(s)).result!.oee * 10000) / 100).toBe(74.79);
    expect(readOeeSaved({}, t)).toBeNull();
  });

  test('la lectura dice la pérdida que más resta, la categoría, el exceso, la otra vista y el factor más lejos', () => {
    expect(plain(oeeSavedSheet(V1, t, 'es', { version: '0', date: 'x' })!.reading[0]!.text)).toBe(
      'De cada hora planificada, 44,9 minutos se convierten en producción buena a velocidad ideal. Lo que más resta es la velocidad: 51,8 min del turno. Frente a la referencia de 90 × 95 × 99, el factor más lejos es el rendimiento (86,1 % frente a 95 %).',
    );
    const text = plain(oeeSavedSheet(BOTTLING(t), t, 'es', { version: '0', date: 'x' })!.reading[0]!.text);
    expect(text).toContain('De cada hora planificada, 42,4 minutos');
    expect(text).toContain('La categoría de paradas que más pesa es Cambios de formato: 40 min, el 42 % de las paradas.');
    expect(text).toContain('Las paradas con tiempo estándar duraron 40 min frente a 30 de estándar: 10 min de exceso.');
    expect(text).toContain('OEE sin el tiempo estándar de las paradas: 75,57 %. El oficial sigue siendo el 70,74 %.');
    expect(text).toContain('el factor más lejos es la disponibilidad (79,8 % frente a 90 %)');
    expect(oeeSavedSheet({}, t, 'es', { version: '0', date: 'x' })).toBeNull();
  });
});
