import { describe, expect, test } from 'vitest';
import { biggestLoss, furthestFactor, oee, pareto, plannedKeys, utilization, type OeeInput } from './oee';

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

  test('torta del turno: cada minuto en una sola porción, y suman el turno', () => {
    const r = oee(BOTTLING).result!;
    const m = Object.fromEntries(r.slices.map((x) => [x.key, x.minutes]));
    // Útil 332,5; reunión 10; averías 25; cambio de formato 30 de estándar + 10 de exceso; material 12; microparos 18; velocidad 37,5; calidad 5.
    expect(Object.keys(m)).toEqual(['useful', 'p0', 'c0', 'c1', 's1', 'c2', 'c3', 'speed', 'quality']);
    expect(m.useful).toBeCloseTo(332.5, 9);
    expect([m.p0, m.c0, m.c1, m.s1, m.c2, m.c3]).toEqual([10, 25, 10, 30, 12, 18]);
    expect(r.slices.find((x) => x.key === 'c1')!.excess).toBe(10);
    expect(m.speed).toBeCloseTo(37.5, 9);
    expect(m.quality).toBeCloseTo(5, 9);
    expect(r.slices.reduce((a, x) => a + x.minutes, 0)).toBeCloseTo(480, 9);
  });

  test('utilización: con todo 69,27 %; sin las planificadas, el OEE oficial (70,74 %)', () => {
    const r = oee(BOTTLING).result!;
    expect(pct2(utilization(r, []).value)).toBe(69.27);
    // TEEP de Vorne (oee.com, «TEEP»): OEE × tiempo planificado ÷ todo el tiempo, aquí sobre el turno.
    expect(utilization(r, []).value).toBeCloseTo(r.oee * (r.planned / r.shift), 12);
    expect(plannedKeys(r)).toEqual(['p0']);
    expect(utilization(r, plannedKeys(r)).value).toBeCloseTo(r.oee, 12);
    // Sin la reunión ni el cambio de formato entero (estándar y exceso, una sola vez): 332,5 ÷ (480 − 10 − 40).
    const u = utilization(r, ['p0', 'c1', 's1']);
    expect(u.removed).toBe(50);
    expect(u.value).toBeCloseTo(332.5 / 430, 12);
    // El tiempo útil no se desmarca; todo lo demás fuera da el 100 %.
    expect(utilization(r, r.slices.map((x) => x.key)).value).toBeCloseTo(1, 12);
  });

  test('Vorne: sin las paradas planificadas, la utilización es el OEE publicado (74,79 %)', () => {
    const r = oee(VORNE).result!;
    expect(pct2(utilization(r, plannedKeys(r)).value)).toBe(74.79);
  });

  test('el caso del dueño: 4 h, 2 de cambio de tamaño y 2 al 70 % → 35 %; sin el cambio, 70 %', () => {
    // Cambio de tamaño como parada no planificada con su estándar (decisión del dueño, 2026-11-21); 1 s por unidad, 5.040 unidades = 84 min.
    const r = oee({ shift: 240, plannedStops: [], stops: [{ minutes: 120, category: 0, standard: 120 }], categories: 1, idealCycle: 1, total: 5040, rejects: 0 }).result!;
    expect(r.minutes.useful).toBeCloseTo(84, 9);
    expect(pct2(utilization(r, []).value)).toBe(35);
    expect(pct2(utilization(r, ['s0']).value)).toBe(70);
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
