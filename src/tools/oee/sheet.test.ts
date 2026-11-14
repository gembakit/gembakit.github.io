import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../../i18n';
import { oee, type OeeInput } from '../../calc/oee';
import { layoutSheet } from '../../sheet/layout';
import { evaluateGrid } from '../../sheet/evaluate';
import { oeeSheet } from './sheet';
import { oeeSavedSheet } from './reading';

// Las fórmulas de la hoja deben dar lo mismo que el módulo de cálculo.
const VORNE: OeeInput = { shift: 480, plannedStops: 60, unplannedStops: 47, idealCycle: 1, total: 19271, rejects: 423 };

describe('hoja de OEE: fórmulas = cálculo', () => {
  test.each([VORNE, { ...VORNE, idealCycle: 0.9, rejects: 0 }, { shift: 600, plannedStops: 30, unplannedStops: 120, idealCycle: 12, total: 1500, rejects: 75 }])('%o', (input) => {
    const grid = layoutSheet(oeeSheet(input, MESSAGES.es, { reading: [], version: '0', date: 'x' }));
    const values = evaluateGrid(grid);
    const v = (k: string) => values[grid.address[k]!] as number;
    const r = oee(input).result!;
    for (const k of ['availability', 'performance', 'quality', 'oee'] as const) expect(v(k)).toBeCloseTo(r[k], 12);
    expect(v('useful')).toBeCloseTo(r.minutes.useful, 9);
    expect(v('speed')).toBeCloseTo(r.minutes.speed, 9);
    expect(v('qualityLoss')).toBeCloseTo(r.minutes.quality, 9);
  });

  test('medición guardada: la lectura dice la pérdida que más resta', () => {
    const def = oeeSavedSheet(VORNE, MESSAGES.es, 'es', { version: '0', date: 'x' })!;
    expect(def.reading[0]!.text).toBe('De cada hora planificada, 44,9 minutos se convierten en piezas buenas a velocidad ideal. Lo que más resta es la velocidad: 51,8 min del turno.');
    expect(oeeSavedSheet({}, MESSAGES.es, 'es', { version: '0', date: 'x' })).toBeNull();
  });
});
