import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../../i18n';
import { descriptive } from '../../calc/descriptive';
import { layoutSheet } from '../../sheet/layout';
import { evaluateGrid } from '../../sheet/evaluate';
import { descriptivaSheet } from './sheet';
import { descriptivaSavedSheet } from './reading';
import { MICHELSO } from './examples';
import type { DescriptivaSaved } from './model';

// Las fórmulas de la hoja deben dar lo mismo que el módulo de cálculo.
const t = MESSAGES.es;
const plain = (s: string) => s.replace(/ /g, ' ');

function check(s: DescriptivaSaved) {
  const r = descriptive(s.values).result!;
  const def = descriptivaSheet(s, r, t, 'es', { reading: [], version: '0', date: 'x' });
  const grid = layoutSheet(def);
  const values = evaluateGrid(grid);
  const v = (k: string) => values[grid.address[k]!] as number;
  expect(v('n')).toBe(r.n);
  expect(v('mean')).toBeCloseTo(r.mean, 10);
  expect(v('sd')).toBeCloseTo(r.sd, 10);
  expect(v('median')).toBeCloseTo(r.median, 10);
  if (r.q1 !== null) expect(v('q1')).toBeCloseTo(r.q1, 10);
  if (r.q3 !== null) expect(v('q3')).toBeCloseTo(r.q3, 10);
  expect(v('range')).toBeCloseTo(r.range, 10);
  expect(v('se')).toBeCloseTo(r.se, 10);
  if (r.skewness !== null) expect(v('skewness')).toBeCloseTo(r.skewness, 10);
  if (r.kurtosis !== null) expect(v('kurtosis')).toBeCloseTo(r.kurtosis, 10);
  return def;
}

describe('hoja de estadística descriptiva: fórmulas = cálculo', () => {
  test('NIST Michelso, 100 datos', () => {
    const def = check({ v: 1, values: MICHELSO, name: 'Velocidad de la luz', unit: 'mil km/s' });
    expect(def.table!.rows).toHaveLength(100);
    expect(def.results.find((x) => x.key === 'mean')!.main).toBe(true);
  });

  test('pocos datos: sin cuartiles ni curtosis donde no se pueden calcular', () => {
    const def = check({ v: 1, values: [1, 4], name: '', unit: '' });
    expect(def.results.some((x) => x.key === 'q1')).toBe(false);
    expect(def.results.some((x) => x.key === 'kurtosis')).toBe(false);
    expect(def.results.some((x) => x.key === 'skewness')).toBe(false);
  });
});

describe('medición guardada', () => {
  test('la lectura dice media, desviación, mediana y normalidad', () => {
    const text = plain(descriptivaSavedSheet({ v: 1, values: MICHELSO, name: 'velocidad de la luz', unit: 'mil km/s' }, t, 'es', { version: '0', date: 'x' })!.reading[0]!.text);
    expect(text).toContain('Velocidad de la luz: media 299,8524 mil km/s y desviación estándar 0,079 mil km/s.');
    expect(text).toContain('La mitad de los datos está por debajo de 299,85 mil km/s.');
    expect(descriptivaSavedSheet({ v: 1, values: [1] }, t, 'es', { version: '0', date: 'x' })).toBeNull();
  });
});
