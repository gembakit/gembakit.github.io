import { describe, expect, test } from 'vitest';
import { dpmo } from './dpmo';

// Casos de referencia de docs/fichas/fase-1.md, ficha 1. Ningún número
// esperado está calculado por nosotros: todos salen de la fuente citada.
// Las tolerancias son las del redondeo con que publica cada fuente.

describe('DPMO: casos publicados', () => {
  // Learn Lean Sigma, guía «What is DPMO» (ejemplo de engranajes).
  test('1.000 unidades × 5 oportunidades con 50 defectos → DPMO 10.000', () => {
    const r = dpmo({ units: 1000, opportunities: 5, defects: 50 }).result!;
    expect(r.dpmo).toBe(10000);
    expect(r.dpo).toBe(0.01);
  });

  // World Class Manufacturing, «Six Sigma - Determine Process Sigma and DPMO» (rodamientos).
  test('2.000 rodamientos × 4 oportunidades con 7 defectos → DPMO 875', () => {
    expect(dpmo({ units: 2000, opportunities: 4, defects: 7 }).result!.dpmo).toBe(875);
  });

  // Quality Gurus, «Defects per million opportunities (DPMO)».
  test('10 unidades × 15 oportunidades con 2 defectos → DPMO 13.333, unos 3,7 sigma', () => {
    const r = dpmo({ units: 10, opportunities: 15, defects: 2 }).result!;
    expect(Math.round(r.dpmo)).toBe(13333);
    expect(r.sigmaLevel!).toBeCloseTo(3.7, 1);
  });
});

describe('Nivel sigma con desplazamiento de 1,5: tabla de Seis Sigma', () => {
  // Gygi, DeCarlo y Williams, «Six Sigma for Dummies» (Wiley, 2005), tabla
  // recogida en Wikipedia «Six Sigma». La tabla da el DPMO redondeado, así
  // que el nivel sigma se compara con dos decimales.
  test.each([
    [66807, 1_000_000, 3],
    [6210, 1_000_000, 4],
    [233, 1_000_000, 5],
    [34, 10_000_000, 6], // 3,4 DPMO
  ])('%i defectos en %i oportunidades → nivel sigma %i', (defects, units, sigma) => {
    const r = dpmo({ units, opportunities: 1, defects }).result!;
    expect(r.sigmaLevel!).toBeCloseTo(sigma, 2);
    expect(r.zLongTerm!).toBeCloseTo(sigma - 1.5, 2);
  });
});

describe('Z del proceso, como Minitab', () => {
  // Ayuda de Minitab, «What is Process Z?»: proporción defectuosa media
  // 0,2264 → Z del proceso 0,7507. Minitab publica la proporción con cuatro
  // decimales; ese redondeo (±0,00005) mueve la Z hasta ±0,0002.
  test('proporción 0,2264 → Z 0,7507', () => {
    const r = dpmo({ units: 10000, opportunities: 1, defects: 2264 }).result!;
    expect(Math.abs(r.zLongTerm! - 0.7507)).toBeLessThan(0.0002);
    expect(r.sigmaLevel! - r.zLongTerm!).toBeCloseTo(1.5, 12);
  });
});

describe('DPMO: relaciones y avisos', () => {
  test('DPU, DPO y rendimiento salen de los mismos datos', () => {
    const r = dpmo({ units: 200, opportunities: 10, defects: 30 }).result!;
    expect(r.dpu).toBeCloseTo(30 / 200, 15);
    expect(r.dpo).toBeCloseTo(30 / 2000, 15);
    expect(r.yield).toBeCloseTo(1 - 30 / 2000, 15);
    expect(r.dpmo).toBeCloseTo((30 / 2000) * 1e6, 9);
  });

  test('cero defectos: DPMO 0 y sin nivel sigma, con aviso', () => {
    const out = dpmo({ units: 500, opportunities: 3, defects: 0 });
    expect(out.result!.dpmo).toBe(0);
    expect(out.result!.sigmaLevel).toBeNull();
    expect(out.warnings).toContainEqual({ code: 'zero-defects' });
  });

  test('todas las oportunidades con defecto: sin nivel sigma, con aviso', () => {
    const out = dpmo({ units: 10, opportunities: 2, defects: 20 });
    expect(out.result!.sigmaLevel).toBeNull();
    expect(out.warnings).toContainEqual({ code: 'all-defects' });
  });

  test('más defectos que oportunidades: sin resultado', () => {
    const out = dpmo({ units: 10, opportunities: 2, defects: 21 });
    expect(out.result).toBeNull();
    expect(out.warnings).toContainEqual({ code: 'defects-exceed-opportunities' });
  });

  test.each([
    [{ units: 0, opportunities: 5, defects: 1 }, { code: 'not-positive', field: 'units' }],
    [{ units: 10, opportunities: 0, defects: 1 }, { code: 'not-positive', field: 'opportunities' }],
    [{ units: 10, opportunities: 5, defects: -1 }, { code: 'negative', field: 'defects' }],
    [{ units: 10.5, opportunities: 5, defects: 1 }, { code: 'not-whole', field: 'units' }],
    [{ units: 10, opportunities: 5, defects: 1.2 }, { code: 'not-whole', field: 'defects' }],
  ])('datos imposibles %o → sin resultado y aviso %o', (input, warning) => {
    const out = dpmo(input);
    expect(out.result).toBeNull();
    expect(out.warnings).toContainEqual(warning);
  });

  test('los pasos del cálculo quedan anotados para enseñar la fórmula', () => {
    const out = dpmo({ units: 1000, opportunities: 5, defects: 50 });
    expect(out.steps.map((s) => s.key)).toEqual(['opportunitiesTotal', 'dpu', 'dpo', 'dpmo', 'zLongTerm', 'sigmaLevel']);
    expect(out.steps.find((s) => s.key === 'opportunitiesTotal')!.value).toBe(5000);
  });
});
