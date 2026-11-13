import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../../i18n';
import { dpmo, type DpmoInput } from '../../calc/dpmo';
import { layoutSheet } from '../../sheet/layout';
import { evaluateGrid } from '../../sheet/evaluate';
import { dpmoSheet } from './sheet';

// Las fórmulas de la hoja deben dar lo mismo que el módulo de cálculo
// (CLAUDE.md, calidad de los cálculos), con los casos de referencia de la ficha.

function sheetValues(input: DpmoInput) {
  const def = dpmoSheet(input, MESSAGES.es, { reading: [{ tone: 'conclusion', text: 'x' }], version: '0.0.0', date: '1/1/2026' });
  const grid = layoutSheet(def);
  const values = evaluateGrid(grid);
  return (key: string) => values[grid.address[key]!];
}

describe('hoja de DPMO: fórmulas = cálculo', () => {
  test.each([
    { units: 1000, opportunities: 5, defects: 50 },
    { units: 2000, opportunities: 4, defects: 7 },
    { units: 10, opportunities: 15, defects: 2 },
    { units: 1_000_000, opportunities: 1, defects: 66807 },
    { units: 10_000_000, opportunities: 1, defects: 34 },
    { units: 10000, opportunities: 1, defects: 2264 },
  ])('%o', (input) => {
    const r = dpmo(input).result!;
    const v = sheetValues(input);
    const close = (key: string, expected: number) => expect(v(key) as number).toBeCloseTo(expected, 9);
    close('opportunitiesTotal', input.units * input.opportunities);
    close('dpu', r.dpu);
    close('dpo', r.dpo);
    close('dpmo', r.dpmo);
    close('yield', r.yield);
    close('zLongTerm', r.zLongTerm!);
    close('sigmaLevel', r.sigmaLevel!);
  });

  test('sin defectos: la Z y el nivel sigma dicen «—» en lugar de dar error', () => {
    const v = sheetValues({ units: 100, opportunities: 2, defects: 0 });
    expect(v('dpmo')).toBe(0);
    expect(v('zLongTerm')).toBe('—');
    expect(v('sigmaLevel')).toBe('—');
  });

  test('las fórmulas usan nombres en inglés y comas, y nada de punto y coma', () => {
    const def = dpmoSheet({ units: 1, opportunities: 1, defects: 0 }, MESSAGES.es, { reading: [], version: '', date: '' });
    for (const r of def.results) expect(r.formula).not.toMatch(/;/);
    expect(def.results.find((r) => r.key === 'zLongTerm')!.formula).toContain('NORM.S.INV');
  });
});
