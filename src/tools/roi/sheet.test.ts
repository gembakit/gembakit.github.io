import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../../i18n';
import { roi } from '../../calc/roi';
import { layoutSheet } from '../../sheet/layout';
import { evaluateGrid } from '../../sheet/evaluate';
import { calcInput, type RoiSaved } from './model';
import { roiSheet } from './sheet';
import { roiSavedSheet } from './reading';

const base: RoiSaved = { currency: '€', investment: 120_000, mode: 'same', lines: [{ name: '', kind: 'hard', how: 'direct', amount: 24_000 }], years: [], newCosts: 0, horizon: 1 };
const REFURBISH: RoiSaved = { ...base, investment: 56_000, mode: 'yearly', lines: [], years: [18_000, 16_000, 14_000, 12_000] };

function check(s: RoiSaved) {
  const r = roi(calcInput(s)).result!;
  const grid = layoutSheet(roiSheet(s, r, MESSAGES.es, { reading: [], version: '0', date: 'x' }));
  const values = evaluateGrid(grid);
  const v = (k: string) => values[grid.address[k]!];
  expect(v('total') as number).toBeCloseTo(r.total, 9);
  expect(v('roi') as number).toBeCloseTo(r.roi, 12);
  if (r.payback === null) expect(v('payback')).toBe('—');
  else expect(v('payback') as number).toBeCloseTo(r.payback, 12);
}

describe('hoja de ROI: fórmulas = cálculo', () => {
  test('Lumen: payback 5 años', () => check(base));
  test('Lumen «refurbish», ahorro distinto cada año: 3,67 años', () => check(REFURBISH));
  test('CFI: ROI del 100 %', () => check({ ...base, investment: 500_000, lines: [{ name: '', kind: 'hard', how: 'direct', amount: 1_000_000 }] }));
  test('líneas por unidad y por tiempo, una blanda, costes nuevos y horizonte', () =>
    check({
      ...base,
      lines: [
        { name: 'Mermas', kind: 'hard', how: 'unit', before: 2.5, after: 2, units: 40_000 },
        { name: 'Horas', kind: 'hard', how: 'time', hours: 300, rate: 25 },
        { name: 'Tiempo liberado', kind: 'soft', how: 'direct', amount: 9000 },
      ],
      newCosts: 1500,
      horizon: 3,
    }));
  test('sin recuperar nunca', () => check({ ...base, newCosts: 24_000 }));

  test('medición guardada: la lectura con el payback, el ROI y el ahorro blando', () => {
    const def = roiSavedSheet(
      { ...base, horizon: 5, lines: [...base.lines, { name: 'Tiempo', kind: 'soft', how: 'direct', amount: 3000 }] },
      MESSAGES.es,
      'es',
      { version: '0', date: 'x' },
    )!;
    expect(def.reading[0]!.text).toBe(
      'La inversión se recupera en 5 años. En 5 años el ROI es 0 %: cada 1 € invertido devuelve 1 €. Además, 3.000 € al año de ahorro blando, que no entra en el ROI.',
    );
    expect(def.reading.some((l) => l.text === MESSAGES.es.tools.roi.undiscounted)).toBe(true);
  });
});
