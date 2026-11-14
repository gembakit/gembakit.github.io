import { describe, expect, test } from 'vitest';
import { es } from '../i18n/es';
import { en } from '../i18n/en';
import { dpmo } from '../calc/dpmo';
import { fpyRty } from '../calc/fpy';
import { dpmoExplain } from './dpmo/explain';
import { fpyExplain } from './fpy/explain';

// «De dónde sale cada valor»: la fórmula con letras, con los números y el
// resultado, igual que en pantalla.

describe('DPMO: de dónde sale cada valor', () => {
  // Captura del dueño: 2.500 unidades, 4 oportunidades, 360 defectos.
  const input = { units: 2500, opportunities: 4, defects: 360 };
  const ex = dpmoExplain(input, dpmo(input).result!, es, 'es');

  test('DPU = D ÷ U = 360 ÷ 2.500 = 0,144', () => {
    expect(ex.dpu).toMatchObject({ lhs: 'DPU', steps: ['D ÷ U', '360 ÷ 2.500', '0,144'] });
    expect(ex.dpu!.where).toEqual([
      { sym: 'D', label: 'Defectos encontrados', value: '360' },
      { sym: 'U', label: 'Unidades revisadas', value: '2.500' },
    ]);
  });

  test('DPO y DPMO pasan por las oportunidades en total', () => {
    expect(ex.dpo!.steps).toEqual(['D ÷ (U × O)', '360 ÷ (2.500 × 4)', '360 ÷ 10.000', '0,036']);
    expect(ex.dpmo!.steps).toEqual(['D ÷ (U × O) × 1.000.000', '360 ÷ 10.000 × 1.000.000', '36.000']);
  });

  test('rendimiento, Z del proceso y nivel sigma, con la función de Excel', () => {
    expect(ex.yield!.steps).toEqual(['1 − DPO', '1 − 0,036', '96,4 %']);
    expect(ex.z!.steps).toEqual(['Φ⁻¹(1 − DPO)', 'Φ⁻¹(1 − 0,036)', 'Φ⁻¹(0,964)', '1,7991']);
    expect(ex.z!.notes![0]).toBe('En Excel: =INV.NORM.ESTAND(0,964)');
    expect(ex.sigma!.steps).toEqual(['Z + 1,5', '1,7991 + 1,5', '3,3']);
  });

  test('sin defectos no hay Z ni nivel sigma que explicar; en inglés, con punto decimal', () => {
    const zero = { units: 100, opportunities: 1, defects: 0 };
    const e0 = dpmoExplain(zero, dpmo(zero).result!, es, 'es');
    expect(e0.z).toBeNull();
    expect(e0.sigma).toBeNull();
    expect(dpmoExplain(input, dpmo(input).result!, en, 'en').dpu!.steps).toEqual(['D ÷ U', '360 ÷ 2,500', '0.144']);
  });
});

describe('FPY y RTY: de dónde sale cada valor', () => {
  test('paso contado: FPY = B ÷ E con sus unidades', () => {
    const steps = [
      { name: 'Soldadura', step: { entering: 1200, good: 1150 } },
      { name: 'Inspección', step: { entering: 1150, good: 1100 } },
    ];
    const r = fpyRty(steps.map((s) => s.step)).result!;
    const ex = fpyExplain(steps, r, es, 'es');
    expect(ex.step[0]).toMatchObject({ title: 'FPY · Soldadura', steps: ['B ÷ E', '1.150 ÷ 1.200', '95,8 %'] });
    expect(ex.rty.steps).toEqual(['FPY₁ × FPY₂', '95,8 % × 95,7 %', '91,7 %']);
    expect(ex.rty.where.map((w) => w.label)).toEqual(['Soldadura', 'Inspección']);
    expect(ex.hidden.steps).toEqual(['1 − RTY', '100 % − 91,7 %', '8,3 %']);
  });

  test('FPY escrito a mano (caso Fabrico: 97 × 94 × 91 = 83 %); con muchos pasos, la fórmula se abrevia', () => {
    const steps = [0.97, 0.94, 0.91].map((fpy, i) => ({ name: `Paso ${i + 1}`, step: { fpy } }));
    const ex = fpyExplain(steps, fpyRty(steps.map((s) => s.step)).result!, es, 'es');
    expect(ex.step[0]!.steps).toEqual(['97 %']);
    expect(ex.step[0]!.notes).toEqual([es.tools.fpy.explain.direct]);
    expect(ex.rty.steps).toEqual(['FPY₁ × FPY₂ × FPY₃', '97 % × 94 % × 91 %', '83 %']);

    const many = Array.from({ length: 12 }, (_, i) => ({ name: `Paso ${i + 1}`, step: { fpy: 0.99 } }));
    expect(fpyExplain(many, fpyRty(many.map((s) => s.step)).result!, es, 'es').rty.steps[0]).toBe('FPY₁ × FPY₂ × … × FPY₁₂');
  });
});
