import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../../i18n';
import { fpyRty, type FpyStep } from '../../calc/fpy';
import { layoutSheet } from '../../sheet/layout';
import { evaluateGrid } from '../../sheet/evaluate';
import { fpySheet } from './sheet';

// Las fórmulas de la hoja deben dar lo mismo que el módulo de cálculo
// (CLAUDE.md, calidad de los cálculos), con los casos de referencia de la ficha.

const named = (steps: FpyStep[]) => steps.map((step, i) => ({ name: `Paso ${i + 1}`, step }));

function sheetValues(steps: FpyStep[]) {
  const def = fpySheet(named(steps), MESSAGES.es, { reading: [{ tone: 'conclusion', text: 'x' }], version: '0.0.0', date: '1/1/2026' });
  const grid = layoutSheet(def);
  const values = evaluateGrid(grid);
  return { grid, v: (key: string) => values[grid.address[key]!] };
}

describe('hoja de FPY y RTY: fórmulas = cálculo', () => {
  test.each([
    [[{ fpy: 0.85 }, { fpy: 0.85 }, { fpy: 0.85 }, { fpy: 0.85 }]],
    [[{ fpy: 0.97 }, { fpy: 0.94 }, { fpy: 0.91 }]],
    [[{ entering: 200, good: 186 }]],
    [[{ entering: 120, good: 111 }, { entering: 115, good: 97 }, { entering: 110, good: 108 }]],
    [[{ entering: 50, good: 0 }, { entering: 40, good: 40 }]],
  ] as FpyStep[][][])('%o', (steps) => {
    const r = fpyRty(steps).result!;
    const { v } = sheetValues(steps);
    expect(v('rty') as number).toBeCloseTo(r.rty, 12);
    expect(v('hiddenFactory') as number).toBeCloseTo(r.hiddenFactory, 12);
    expect(v('worstFpy') as number).toBeCloseTo(r.fpy[r.worst]!, 12);
    expect(v('worstStep')).toBe(`Paso ${r.worst + 1}`);
  });

  test('contando unidades, el FPY de cada fila es una fórmula de su propia fila', () => {
    const { grid } = sheetValues([{ entering: 200, good: 186 }, { entering: 186, good: 180 }]);
    const [first] = grid.address['fpy[]']!.split(':');
    const row = grid.rows[Number(first!.slice(1)) - 1]!;
    const r = first!.slice(1);
    expect(row.cells[4].formula).toBe(`D${r}/C${r}`);
    expect(row.cells[2]).toMatchObject({ number: 200, input: true });
    expect(grid.highlightMin).toBe(grid.address['fpy[]']);
  });

  test('las fórmulas usan nombres en inglés y comas, y nada de punto y coma', () => {
    const def = fpySheet(named([{ fpy: 0.9 }]), MESSAGES.es, { reading: [], version: '', date: '' });
    for (const r of def.results) expect(r.formula).not.toMatch(/;/);
  });
});
