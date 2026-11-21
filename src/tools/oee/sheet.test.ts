import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../../i18n';
import { oee, utilization } from '../../calc/oee';
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
  expect(v('utilization')).toBeCloseTo(utilization(r, s.off).value, 12);
  return def;
}

describe('hoja de OEE: fórmulas = cálculo', () => {
  test('Vorne: una sola parada', () => {
    const def = check(VORNE(t));
    expect(def.table!.rows).toEqual([{ label: 'Otras', values: { min: 47, std: 0 } }]);
    expect(def.results.find((x) => x.key === 'utilization')!.label).toBe('Utilización de la línea');
  });

  test('embotelladora: categorías, velocidad en botellas/h, utilización con todo y el motivo de la parada', () => {
    const def = check(BOTTLING(t));
    expect(def.inputs.find((x) => x.key === 'idealCycle')).toMatchObject({ value: 0.075, note: 's por unidad (= 48.000 botellas/h)' });
    expect(def.inputs.find((x) => x.key === 'shift')).toMatchObject({ value: 480, note: 'min (= 8 h)' });
    expect(def.results.find((x) => x.key === 'utilization')).toMatchObject({ label: 'Utilización de la línea', formula: '{useful}/{shift}' });
    expect(def.notes[1]).toBe('Cambio de 330 ml a 500 ml: 40 min (Cambios de formato), estándar 30 min. Motivo: Se atascó la guía de la etiquetadora al ajustarla a 500 ml.');
  });

  test('torta: cada porción desmarcada entra en la fórmula una sola vez', () => {
    const base = BOTTLING(t);
    const name = (off: string[]) => check({ ...base, off }).results.find((x) => x.key === 'utilization')!.label;
    expect(name(['p0'])).toBe('Utilización de la línea sin reunión de arranque');
    expect(name(['c1', 's1', 'c2'])).toBe('Utilización de la línea sin cambios de formato ni falta de material');
    expect(name(['s1'])).toBe('Utilización de la línea sin cambios de formato · estándar');
    expect(name(['c1'])).toBe('Utilización de la línea sin cambios de formato · exceso sobre el estándar');
    expect(name(['speed', 'quality', 'c0'])).toBe('Utilización de la línea sin averías, la pérdida por velocidad ni la pérdida por calidad');
    // Todas las porciones menos el útil: 100 %.
    check({ ...base, off: ['p0', 'c0', 'c1', 's1', 'c2', 'c3', 'speed', 'quality'] });
  });

  test('sin paradas no planificadas: sin tabla, disponibilidad 100 %', () => {
    check({ ...BOTTLING(t), stops: [], off: ['p0'] });
  });
});

describe('mediciones guardadas', () => {
  test('una medición de la versión 1 se lee como versión 3 sin perder nada', () => {
    const s = readOeeSaved(V1, t)!;
    expect(s).toMatchObject({ v: 3, shift: 480, shiftUnit: 'min', measure: 'time', measureUnit: 's', ideal: 1, total: 19271, rejects: 423, off: [] });
    expect(s.planned).toEqual([{ name: 'Paradas planificadas', value: 60, unit: 'min', note: '' }]);
    expect(s.stops).toEqual([{ name: 'Paradas no planificadas', minutes: 47, category: 6, standard: null, note: '' }]);
    expect(Math.round(oee(toOeeInput(s)).result!.oee * 10000) / 100).toBe(74.79);
    expect(readOeeSaved({}, t)).toBeNull();
  });

  test('versión 2: lo marcado en «Otras vistas» sale desmarcado en la torta y da el mismo número', () => {
    const { off: _off, ...rest } = BOTTLING(t);
    void _off;
    const v2 = (views: unknown) => readOeeSaved({ ...rest, v: 2, planned: [{ name: 'Reunión', value: 10, unit: 'min' }], views }, t)!;
    const pct = (s: OeeSaved) => Math.round(utilization(oee(toOeeInput(s)).result!, s.off).value * 10000) / 100;
    // «OEE sin cambios de formato» 77,33 % y «OEE sin el tiempo estándar de las paradas» 75,57 %, como en la versión 2.
    expect(pct(v2({ excluded: [1], standard: false }))).toBe(77.33);
    expect(pct(v2({ excluded: [], standard: true }))).toBe(75.57);
    expect(pct(v2({ excluded: [1], standard: true }))).toBe(77.33);
    // Sin nada marcado: la torta empieza con todo.
    expect(v2({ excluded: [], standard: false }).off).toEqual([]);
    expect(v2({ excluded: [], standard: false }).planned[0]!.note).toBe('');
  });

  test('la lectura dice la pérdida que más resta, la categoría, el exceso, la utilización y el factor más lejos', () => {
    expect(plain(oeeSavedSheet(V1, t, 'es', { version: '0', date: 'x' })!.reading[0]!.text)).toBe(
      'De cada hora planificada, 44,9 minutos se convierten en producción buena a velocidad estándar. Lo que más resta es la velocidad: 51,8 min del turno. Utilización de la línea: 65,44 %. Frente a la referencia de 90 × 95 × 99, el factor más lejos es el rendimiento (86,1 % frente a 95 %).',
    );
    const text = plain(oeeSavedSheet(BOTTLING(t), t, 'es', { version: '0', date: 'x' })!.reading[0]!.text);
    expect(text).toContain('De cada hora planificada, 42,4 minutos');
    expect(text).toContain('La categoría de paradas que más pesa es Cambios de formato: 40 min, el 42 % de las paradas.');
    expect(text).toContain('Las paradas con tiempo estándar duraron 40 min frente a 30 de estándar: 10 min de exceso.');
    expect(text).toContain('Utilización de la línea: 69,27 %.');
    // Con las paradas planificadas desmarcadas es el OEE oficial: no se repite.
    expect(plain(oeeSavedSheet({ ...BOTTLING(t), off: ['p0'] }, t, 'es', { version: '0', date: 'x' })!.reading[0]!.text)).not.toContain('Utilización');
    expect(text).toContain('el factor más lejos es la disponibilidad (79,8 % frente a 90 %)');
    expect(oeeSavedSheet({}, t, 'es', { version: '0', date: 'x' })).toBeNull();
  });
});
