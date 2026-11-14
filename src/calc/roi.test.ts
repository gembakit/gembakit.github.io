import { describe, expect, test } from 'vitest';
import { roi, yearsMonths } from './roi';

// Casos de referencia de la ficha 6 (docs/fichas/fase-1.md).

describe('ahorro, ROI y payback', () => {
  test('Lumen (Cooke), «Simple Payback»: 120.000 y 24.000 al año → payback 5 años', () => {
    const r = roi({ investment: 120_000, savings: [24_000], repeat: true, newCosts: 0, horizon: 1 }).result!;
    expect(r.payback).toBe(5);
    expect(yearsMonths(r.payback!)).toEqual({ years: 5, months: 0 });
  });

  test('Lumen, opción «refurbish»: 56.000 con 18.000 / 16.000 / 14.000 / 12.000 → 3,67 años', () => {
    const out = roi({ investment: 56_000, savings: [18_000, 16_000, 14_000, 12_000], repeat: false, newCosts: 0, horizon: 0 });
    const r = out.result!;
    expect(r.payback).toBeCloseTo(3.67, 2);
    expect(yearsMonths(r.payback!)).toEqual({ years: 3, months: 8 });
    expect(r.horizon).toBe(4);
    expect(out.warnings).toEqual([]);
  });

  test('CFI, «Return on Investment»: 500.000 → 1.000.000 es un ROI del 100 %; 1.000 → 1.250, del 25 %', () => {
    expect(roi({ investment: 500_000, savings: [1_000_000], repeat: true, newCosts: 0, horizon: 1 }).result!.roi).toBe(1);
    expect(roi({ investment: 1000, savings: [1250], repeat: true, newCosts: 0, horizon: 1 }).result!.roi).toBe(0.25);
  });

  test('los costes nuevos se restan cada año y el horizonte multiplica', () => {
    const r = roi({ investment: 10_000, savings: [6000], repeat: true, newCosts: 1000, horizon: 3 }).result!;
    expect(r.net).toEqual([5000, 5000, 5000]);
    expect(r.total).toBe(15_000);
    expect(r.roi).toBe(0.5);
    expect(r.payback).toBe(2);
  });

  test('avisos: no se recupera nunca, o no dentro del horizonte', () => {
    expect(roi({ investment: 1000, savings: [500], repeat: true, newCosts: 500, horizon: 1 }).warnings).toEqual([{ code: 'no-payback' }]);
    expect(roi({ investment: 1000, savings: [100, 100], repeat: false, newCosts: 0, horizon: 0 }).warnings).toEqual([{ code: 'no-payback' }]);
    expect(roi({ investment: 120_000, savings: [24_000], repeat: true, newCosts: 0, horizon: 1 }).warnings).toEqual([{ code: 'payback-beyond-horizon' }]);
    expect(roi({ investment: 0, savings: [1], repeat: true, newCosts: 0, horizon: 1 }).warnings).toEqual([{ code: 'not-positive', field: 'investment' }]);
  });

  test('años y meses', () => {
    expect(yearsMonths(0.5)).toEqual({ years: 0, months: 6 });
    expect(yearsMonths(1.99)).toEqual({ years: 2, months: 0 });
  });
});
