import { describe, expect, test } from 'vitest';
import { kanban } from './kanban';

// Casos de referencia de la ficha 5 (docs/fichas/fase-1.md).

describe('kanban', () => {
  test('Krajewski, Ritzman y Malhotra, «Westerville Auto Parts»: 10 contenedores', () => {
    const r = kanban({ demand: 2000, lead: 0.08 + 0.02, safety: 0.1, size: 22 }).result!;
    expect(r.raw).toBeCloseTo(10, 10);
    expect(r.cards).toBe(10);
    expect(r.pieces).toBe(220);
  });

  test('el mismo ejemplo con espera de 0,06 días: 8 contenedores', () => {
    expect(kanban({ demand: 2000, lead: 0.06 + 0.02, safety: 0.1, size: 22 }).result!.cards).toBe(8);
  });

  test('Fabrico: 400/h, 2 h, 20 %, 100 por contenedor → 9,6 → 10 tarjetas', () => {
    const r = kanban({ demand: 400, lead: 2, safety: 0.2, size: 100 }).result!;
    expect(r.raw).toBeCloseTo(9.6, 10);
    expect(r.cards).toBe(10);
  });

  test('avisos: sin margen de seguridad y datos que no valen', () => {
    expect(kanban({ demand: 400, lead: 2, safety: 0, size: 100 }).warnings).toEqual([{ code: 'no-safety' }]);
    expect(kanban({ demand: 0, lead: 2, safety: 0.1, size: 0 }).warnings).toEqual([
      { code: 'not-positive', field: 'demand' },
      { code: 'not-positive', field: 'size' },
    ]);
    expect(kanban({ demand: 1, lead: 1, safety: -0.1, size: 1 }).warnings).toEqual([{ code: 'negative', field: 'safety' }]);
  });
});
