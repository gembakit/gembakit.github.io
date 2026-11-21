import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../../i18n';
import { layoutSheet } from '../../sheet/layout';
import { evaluateGrid } from '../../sheet/evaluate';
import { DEFAULT_TESTS } from '../../calc/spc';
import { cartasSheet } from './sheet';
import { cartasSavedSheet, runCharts } from './reading';
import { FILL, FLOW, type CartasSaved } from './model';

const t = MESSAGES.es;
const plain = (s: string) => s.replace(/ /g, ' ');
const base = { v: 1 as const, name: '', unit: '', subgroup: 5, limitPoints: null, tests: DEFAULT_TESTS };

function check(s: CartasSaved) {
  const c = runCharts(s);
  const grid = layoutSheet(cartasSheet(s, c, t, { reading: [], version: '0', date: 'x' }));
  const values = evaluateGrid(grid);
  const v = (k: string) => values[grid.address[k]!] as number;
  const lim = c.kind === 'imr' ? c.out.result!.individuals : c.out.result!.xbar;
  expect(v('center')).toBeCloseTo(lim.center, 10);
  expect(v('ucl')).toBeCloseTo(lim.ucl, 10);
  expect(v('lcl')).toBeCloseTo(lim.lcl, 10);
  if (c.kind === 'imr') expect(v('mrUcl')).toBeCloseTo(c.out.result!.movingRange.ucl, 10);
  else expect(v('rUcl')).toBeCloseTo(c.out.result!.range.ucl, 10);
}

describe('hoja de cartas de control: fórmulas = cálculo', () => {
  test('I-MR con el caudal de NIST', () => check({ ...base, kind: 'imr', values: FLOW }));
  test('I-MR con límites de los primeros 6 puntos', () => check({ ...base, kind: 'imr', values: FLOW, limitPoints: 6 }));
  test('X-barra R del llenado, límites con los primeros 19 subgrupos', () => check({ ...base, kind: 'xbarr', values: FILL, limitPoints: 19 }));
});

describe('carta guardada', () => {
  test('NIST: estable, con los límites publicados', () => {
    const text = plain(cartasSavedSheet({ ...base, kind: 'imr', values: FLOW, name: 'caudal' }, t, 'es', { version: '0', date: 'x' })!.reading[0]!.text);
    expect(text).toContain('Caudal: proceso estable, con media 50,81 y límites de control de 45,816 a 55,804.');
  });
  test('llenado: el desajuste desde el subgrupo 20 da señales', () => {
    const sheet = cartasSavedSheet({ ...base, kind: 'xbarr', values: FILL, limitPoints: 19 }, t, 'es', { version: '0', date: 'x' })!;
    const lines = sheet.reading.map((x) => plain(x.text));
    expect(lines[0]).toMatch(/con señal de causa especial/);
    expect(lines.some((x) => x.startsWith('1 · Un punto fuera de los límites: subgrupos 20'))).toBe(true);
  });
});
