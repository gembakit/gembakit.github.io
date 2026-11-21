import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../../i18n';
import { paretoAnalysis } from '../../calc/pareto';
import { layoutSheet } from '../../sheet/layout';
import { evaluateGrid } from '../../sheet/evaluate';
import { paretoSheet } from './sheet';
import { paretoSavedSheet } from './reading';
import { PAINT_COUNTS, tally, toParetoInput, type ParetoSaved } from './model';

const t = MESSAGES.es;
const plain = (s: string) => s.replace(/ /g, ' ');
const PAINT: ParetoSaved = { v: 1, what: 'Defectos de pintura', unit: 'defectos', othersLast: true, items: t.tools.pareto.exampleData.items.map((name, i) => ({ name, value: PAINT_COUNTS[i]! })) };

describe('hoja de Pareto: fórmulas = cálculo', () => {
  test('parte y acumulado de cada fila, con «Otros» al final', () => {
    const r = paretoAnalysis(toParetoInput(PAINT, t)).result!;
    const def = paretoSheet(PAINT, r, t, { reading: [], version: '0', date: 'x' });
    const grid = layoutSheet(def);
    const values = evaluateGrid(grid);
    expect(values[grid.address.total!]).toBe(177);
    const [shareCol] = grid.address['share[]']!.split(':');
    const [cumCol] = grid.address['cum[]']!.split(':');
    const first = Number(shareCol!.slice(1));
    r.rows.forEach((row, i) => {
      expect(values[`D${first + i}`]).toBeCloseTo(row.share, 12);
      expect(values[`E${first + i}`]).toBeCloseTo(row.cumulative, 12);
    });
    expect(cumCol!.startsWith('E')).toBe(true);
    expect(def.table!.rows[def.table!.rows.length - 1]!.label).toBe('Otros');
  });
});

describe('Pareto guardado y lista importada', () => {
  test('la lectura nombra los pocos vitales y su parte', () => {
    const text = plain(paretoSavedSheet(PAINT, t, 'es', { version: '0', date: 'x' })!.reading[0]!.text);
    // 61 + 48 + 27 = 136 de 177 = 76,8 %; con Falta de cubrición (15) se pasa del 80 %: 85,3 %.
    expect(text).toBe('4 categorías (Suciedad, Piel de naranja, Descolgado y Falta de cubrición) se llevan el 85,3 % del total: son los pocos vitales, empieza por ellas.');
  });

  test('una fila por caso: cuenta cuántas veces sale cada categoría', () => {
    expect(tally(['Rayas', 'Golpes', 'rayas', '', 'Golpes', 'Rayas'])).toEqual([
      { name: 'Rayas', value: 3 },
      { name: 'Golpes', value: 2 },
    ]);
  });
});
