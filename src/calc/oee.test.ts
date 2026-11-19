import { describe, expect, test } from 'vitest';
import { biggestLoss, furthestFactor, oee, oeeView, pareto, type OeeInput } from './oee';

// Caso de referencia de la ficha 4: Vorne, oee.com, «Calculating OEE».
const VORNE: OeeInput = { shift: 480, plannedStops: [60], stops: [{ minutes: 47, category: 0, standard: null }], categories: 1, idealCycle: 1, total: 19271, rejects: 423 };
const pct2 = (x: number) => Math.round(x * 10000) / 100;

// Embotelladora de la ficha oee-v2 (cuentas propias): 8 h − 10 min de reunión; categorías
// 0 averías, 1 cambios de formato, 2 falta de material, 3 microparos; 48.000 /h = 0,075 s.
const BOTTLING: OeeInput = {
  shift: 480,
  plannedStops: [10],
  stops: [
    { minutes: 25, category: 0, standard: null },
    { minutes: 40, category: 1, standard: 30 },
    { minutes: 12, category: 2, standard: null },
    { minutes: 18, category: 3, standard: null },
  ],
  categories: 7,
  idealCycle: 0.075,
  total: 270_000,
  rejects: 4_000,
};

describe('OEE', () => {
  test('Vorne: disponibilidad 88,81 %, rendimiento 86,11 %, calidad 97,80 %, OEE 74,79 %', () => {
    const r = oee(VORNE).result!;
    expect(r.planned).toBe(420);
    expect(r.run).toBe(373);
    expect(pct2(r.availability)).toBe(88.81);
    expect(pct2(r.performance)).toBe(86.11);
    expect(pct2(r.quality)).toBe(97.8);
    expect(pct2(r.oee)).toBe(74.79);
  });

  test('el tiempo planificado se reparte entre tiempo útil y las tres pérdidas, y el útil da el OEE', () => {
    const r = oee(VORNE).result!;
    const m = r.minutes;
    expect(m.useful + m.downtime + m.speed + m.quality).toBeCloseTo(r.planned, 9);
    expect(m.useful / r.planned).toBeCloseTo(r.oee, 12);
    expect(biggestLoss(r)).toBe('speed');
  });

  test('embotelladora: 70,74 %, paradas por categoría, estándar y exceso', () => {
    const r = oee(BOTTLING).result!;
    expect(r.planned).toBe(470);
    expect(r.run).toBe(375);
    expect(r.availability).toBeCloseTo(375 / 470, 12);
    expect(r.performance).toBeCloseTo(0.9, 12);
    expect(r.quality).toBeCloseTo(266_000 / 270_000, 12);
    expect(pct2(r.oee)).toBe(70.74);
    expect(r.minutes.useful).toBeCloseTo(332.5, 9);
    expect(r.minutes.speed).toBeCloseTo(37.5, 9);
    expect(r.minutes.quality).toBeCloseTo(5, 9);
    expect(r.byCategory).toEqual([25, 40, 12, 18, 0, 0, 0]);
    expect(r.standard).toBe(30);
    expect(r.excess).toBe(10);
  });

  test('otras vistas: sin cambios de formato 77,33 %; sin el estándar 75,57 %; el oficial no cambia', () => {
    const r = oee(BOTTLING).result!;
    expect(pct2(oeeView(r, { excluded: [1], standard: false }).oee)).toBe(77.33);
    expect(pct2(oeeView(r, { excluded: [], standard: true }).oee)).toBe(75.57);
    // Quitar una categoría entera ya incluye su estándar: no se cuenta dos veces.
    expect(oeeView(r, { excluded: [1], standard: true }).removed).toBe(40);
    expect(oeeView(r, { excluded: [0, 1], standard: false }).removed).toBe(65);
    // Solo cambia la disponibilidad: OEE de la vista = disponibilidad de la vista × rendimiento × calidad.
    const v = oeeView(r, { excluded: [1], standard: false });
    expect(v.oee).toBeCloseTo(v.availability * r.performance * r.quality, 12);
    expect(pct2(r.oee)).toBe(70.74);
  });

  test('un estándar mayor que la parada: todo es estándar, sin exceso', () => {
    const r = oee({ ...BOTTLING, stops: [{ minutes: 20, category: 1, standard: 30 }] }).result!;
    expect(r.standard).toBe(20);
    expect(r.excess).toBe(0);
  });

  test('Pareto por categoría: 42,1 % · 68,4 % · 87,4 % · 100 %', () => {
    const r = oee(BOTTLING).result!;
    const rows = pareto(r.byCategory.map((minutes, key) => ({ key, minutes })));
    expect(rows.map((x) => x.key)).toEqual([1, 0, 3, 2]);
    expect(rows.map((x) => Math.round(x.cumulative * 1000) / 10)).toEqual([42.1, 68.4, 87.4, 100]);
  });

  test('referencia 90 × 95 × 99: el más lejos', () => {
    expect(furthestFactor(oee(BOTTLING).result!)).toBe('availability');
    expect(furthestFactor(oee(VORNE).result!)).toBe('performance');
  });

  test('sin paradas: disponibilidad 100 %', () => {
    expect(oee({ ...BOTTLING, plannedStops: [], stops: [] }).result!.availability).toBe(1);
  });

  test('avisos', () => {
    expect(oee({ ...VORNE, idealCycle: 2 }).warnings).toEqual([{ code: 'performance-over-100' }]);
    expect(oee({ ...VORNE, plannedStops: [500] }).warnings).toEqual([{ code: 'stops-exceed-time' }]);
    expect(oee({ ...VORNE, stops: [{ minutes: 420, category: 0, standard: null }] }).warnings).toEqual([{ code: 'stops-exceed-time' }]);
    expect(oee({ ...VORNE, rejects: 20000 }).warnings).toEqual([{ code: 'rejects-exceed-total' }]);
    expect(oee({ ...VORNE, total: 0 }).warnings).toContainEqual({ code: 'not-positive', field: 'total' });
    expect(oee({ ...VORNE, rejects: 1.5 }).warnings).toEqual([{ code: 'not-whole', field: 'rejects' }]);
    expect(oee({ ...VORNE, plannedStops: [0] }).warnings).toEqual([{ code: 'deduction-not-positive', step: 0 }]);
    expect(oee({ ...VORNE, stops: [{ minutes: 0, category: 0, standard: null }] }).warnings).toEqual([{ code: 'step-not-positive', step: 0 }]);
    expect(oee({ ...VORNE, stops: [{ minutes: 5, category: 0, standard: 0 }] }).warnings).toEqual([{ code: 'standard-not-positive', step: 0 }]);
  });
});
