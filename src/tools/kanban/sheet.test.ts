import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../../i18n';
import { kanban } from '../../calc/kanban';
import { layoutSheet } from '../../sheet/layout';
import { evaluateGrid } from '../../sheet/evaluate';
import type { KanbanSaved } from './explain';
import { kanbanSheet } from './sheet';
import { calcInput, kanbanSavedSheet } from './reading';

const WESTERVILLE: KanbanSaved = { unit: 'day', mode: 'split', demand: 2000, wait: 0.08, process: 0.02, safetyPct: 10, size: 22 };
const FABRICO: KanbanSaved = { unit: 'h', mode: 'total', demand: 400, lead: 2, safetyPct: 20, size: 100 };

describe('hoja de kanban: fórmulas = cálculo', () => {
  test.each([WESTERVILLE, { ...WESTERVILLE, wait: 0.06 }, FABRICO])('%o', (s) => {
    const grid = layoutSheet(kanbanSheet(s, MESSAGES.es, { reading: [], version: '0', date: 'x' }));
    const values = evaluateGrid(grid);
    const v = (k: string) => values[grid.address[k]!] as number;
    const r = kanban(calcInput(s)).result!;
    expect(v('raw')).toBeCloseTo(r.raw, 10);
    expect(v('cards')).toBe(r.cards);
    expect(v('pieces')).toBe(r.pieces);
  });

  test('medición guardada: la lectura con las tarjetas y el valor sin redondear', () => {
    const def = kanbanSavedSheet(FABRICO, MESSAGES.es, 'es', { version: '0', date: 'x' })!;
    expect(def.reading[0]!.text).toBe('Hacen falta 10 tarjetas: 1.000 piezas en circulación como máximo. Sin redondear salen 9,6. Se redondea hacia arriba porque no hay medio contenedor.');
    // Westerville da 10 justos: no hace falta explicar el redondeo.
    expect(kanbanSavedSheet(WESTERVILLE, MESSAGES.es, 'es', { version: '0', date: 'x' })!.reading[0]!.text).toBe('Hacen falta 10 tarjetas: 220 piezas en circulación como máximo.');
  });
});
