import { describe, expect, test } from 'vitest';
import { biggestLoss, oee } from './oee';

// Caso de referencia de la ficha 4: Vorne, oee.com, «Calculating OEE».
const VORNE = { shift: 480, plannedStops: 60, unplannedStops: 47, idealCycle: 1, total: 19271, rejects: 423 };
const pct2 = (x: number) => Math.round(x * 10000) / 100;

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

  test('avisos', () => {
    expect(oee({ ...VORNE, idealCycle: 2 }).warnings).toEqual([{ code: 'performance-over-100' }]);
    expect(oee({ ...VORNE, plannedStops: 500 }).warnings).toEqual([{ code: 'stops-exceed-time' }]);
    expect(oee({ ...VORNE, unplannedStops: 420 }).warnings).toEqual([{ code: 'stops-exceed-time' }]);
    expect(oee({ ...VORNE, rejects: 20000 }).warnings).toEqual([{ code: 'rejects-exceed-total' }]);
    expect(oee({ ...VORNE, total: 0 }).warnings).toContainEqual({ code: 'not-positive', field: 'total' });
    expect(oee({ ...VORNE, rejects: 1.5 }).warnings).toEqual([{ code: 'not-whole', field: 'rejects' }]);
  });
});
