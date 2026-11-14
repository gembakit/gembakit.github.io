import { describe, expect, test } from 'vitest';
import { es } from '../i18n/es';
import { en } from '../i18n/en';
import { dpmo } from '../calc/dpmo';
import { fpyRty } from '../calc/fpy';
import type { Derivation } from '../ui/Explained';
import { frac, minus, paren, times, toText } from '../ui/expr';
import { dpmoExplain } from './dpmo/explain';
import { fpyExplain } from './fpy/explain';
import { takt } from '../calc/takt';
import { taktExplain } from './takt/explain';
import { oee } from '../calc/oee';
import { oeeExplain } from './oee/explain';

// «De dónde sale cada valor»: la fórmula con letras, con los números y el
// resultado, igual que en pantalla. `toText` es la versión en una línea.
const txt = (d: Derivation | null) => d!.steps.map(toText);

describe('fórmulas como estructura', () => {
  test('la división apilada agrupa sola: en una línea lleva paréntesis', () => {
    expect(toText(frac('D', times('U', 'O')))).toBe('D ÷ (U × O)');
    expect(toText(times(frac('D', 'U'), '1.000.000'))).toBe('D ÷ U × 1.000.000');
    expect(toText(times('2', minus('1', 'x')))).toBe('2 × (1 − x)');
    expect(toText(minus('a', minus('b', 'c')))).toBe('a − (b − c)');
    expect(toText(paren('x'))).toBe('(x)');
  });
});

describe('DPMO: de dónde sale cada valor', () => {
  // Captura del dueño: 2.500 unidades, 4 oportunidades, 360 defectos.
  const input = { units: 2500, opportunities: 4, defects: 360 };
  const ex = dpmoExplain(input, dpmo(input).result!, es, 'es');

  test('DPU = D ÷ U = 360 ÷ 2.500 = 0,144, con la división apilada', () => {
    expect(txt(ex.dpu)).toEqual(['D ÷ U', '360 ÷ 2.500', '0,144']);
    expect(ex.dpu!.steps[1]).toEqual(frac('360', '2.500'));
    expect(ex.dpu!.where).toEqual([
      { sym: 'D', label: 'Defectos encontrados', value: '360' },
      { sym: 'U', label: 'Unidades revisadas', value: '2.500' },
    ]);
  });

  test('DPO y DPMO pasan por las oportunidades en total', () => {
    expect(txt(ex.dpo)).toEqual(['D ÷ (U × O)', '360 ÷ (2.500 × 4)', '360 ÷ 10.000', '0,036']);
    expect(txt(ex.dpmo)).toEqual(['D ÷ (U × O) × 1.000.000', '360 ÷ 10.000 × 1.000.000', '36.000']);
    expect(ex.dpmo!.steps[0]).toEqual(times(frac('D', times('U', 'O')), '1.000.000'));
  });

  test('rendimiento, Z del proceso y nivel sigma, con la función de Excel', () => {
    expect(txt(ex.yield)).toEqual(['1 − DPO', '1 − 0,036', '96,4 %']);
    expect(txt(ex.z)).toEqual(['Φ⁻¹(1 − DPO)', 'Φ⁻¹(1 − 0,036)', 'Φ⁻¹(0,964)', '1,7991']);
    expect(ex.z!.notes![0]).toBe('En Excel: =INV.NORM.ESTAND(0,964)');
    expect(txt(ex.sigma)).toEqual(['Z + 1,5', '1,7991 + 1,5', '3,3']);
  });

  test('sin defectos no hay Z ni nivel sigma que explicar; en inglés, con punto decimal', () => {
    const zero = { units: 100, opportunities: 1, defects: 0 };
    const e0 = dpmoExplain(zero, dpmo(zero).result!, es, 'es');
    expect(e0.z).toBeNull();
    expect(e0.sigma).toBeNull();
    expect(txt(dpmoExplain(input, dpmo(input).result!, en, 'en').dpu)).toEqual(['D ÷ U', '360 ÷ 2,500', '0.144']);
  });
});

describe('Takt: de dónde sale cada valor', () => {
  test('takt = T ÷ D, con el tiempo convertido a la unidad del takt (MS 800)', () => {
    const input = { available: 420, availableUnit: 'min' as const, demand: 500, unit: 's' as const, cycles: [50, 45, 40, 30, 30] };
    const stations = input.cycles.map((cycle, i) => ({ name: `Estación ${i + 1}`, cycle }));
    const ex = taktExplain(input, stations, takt(input).result!, es, 'es');
    expect(txt(ex.takt)).toEqual(['T ÷ D', '25.200 s ÷ 500', '50,4 s']);
    expect(ex.takt!.where[0]!.value).toBe('25.200 s (420 min)');
    expect(txt(ex.minStations)).toEqual(['ΣTC ÷ Takt', '195 s ÷ 50,4 s', '3,87', '4']);
    expect(txt(ex.efficiency)).toEqual(['ΣTC ÷ (n × Takt)', '195 s ÷ (5 × 50,4 s)', '77,4 %']);
    expect(txt(ex.idle)).toEqual(['1 − Eficiencia', '100 % − 77,4 %', '22,6 %']);
    expect(txt(ex.capacity)).toEqual(['T ÷ TC máx', '25.200 s ÷ 50 s', '504 piezas']);
  });

  test('sin estaciones solo hay takt', () => {
    const input = { available: 480, availableUnit: 'min' as const, demand: 240, unit: 'min' as const, cycles: [] };
    const ex = taktExplain(input, [], takt(input).result!, es, 'es');
    expect(txt(ex.takt)).toEqual(['T ÷ D', '480 min ÷ 240', '2 min']);
    expect(ex.capacity).toBeNull();
  });
});

describe('OEE: de dónde sale cada valor (caso Vorne)', () => {
  const input = { shift: 480, plannedStops: 60, unplannedStops: 47, idealCycle: 1, total: 19271, rejects: 423 };
  const ex = oeeExplain(input, oee(input).result!, es, 'es');
  test('los tres factores y el OEE', () => {
    expect(txt(ex.availability)).toEqual(['Tm ÷ Tp', '373 min ÷ 420 min', '88,81 %']);
    expect(txt(ex.performance)).toEqual(['(TCi × N) ÷ Tm', '(1 s × 19.271) ÷ 22.380 s', '86,11 %']);
    expect(txt(ex.quality)).toEqual(['(N − R) ÷ N', '(19.271 − 423) ÷ 19.271', '18.848 ÷ 19.271', '97,8 %']);
    expect(txt(ex.oee)).toEqual(['Disp × Rend × Cal', '88,81 % × 86,11 % × 97,8 %', '74,79 %']);
  });
  test('las pérdidas en minutos', () => {
    expect(txt(ex.speed)).toEqual(['Tm − (TCi × N)', '373 min − (1 s × 19.271)', '51,8 min']);
    expect(txt(ex.qualityLoss)).toEqual(['TCi × R', '1 s × 423', '7,1 min']);
    expect(txt(ex.useful)).toEqual(['TCi × (N − R)', '1 s × 18.848', '314,1 min']);
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
    expect(ex.step[0]!.title).toBe('FPY · Soldadura');
    expect(txt(ex.step[0]!)).toEqual(['B ÷ E', '1.150 ÷ 1.200', '95,8 %']);
    expect(txt(ex.rty)).toEqual(['FPY₁ × FPY₂', '95,8 % × 95,7 %', '91,7 %']);
    expect(ex.rty.where.map((w) => w.label)).toEqual(['Soldadura', 'Inspección']);
    expect(txt(ex.hidden)).toEqual(['1 − RTY', '100 % − 91,7 %', '8,3 %']);
  });

  test('FPY escrito a mano (caso Fabrico: 97 × 94 × 91 = 83 %); con muchos pasos, la fórmula se abrevia', () => {
    const steps = [0.97, 0.94, 0.91].map((fpy, i) => ({ name: `Paso ${i + 1}`, step: { fpy } }));
    const ex = fpyExplain(steps, fpyRty(steps.map((s) => s.step)).result!, es, 'es');
    expect(txt(ex.step[0]!)).toEqual(['97 %']);
    expect(ex.step[0]!.notes).toEqual([es.tools.fpy.explain.direct]);
    expect(txt(ex.rty)).toEqual(['FPY₁ × FPY₂ × FPY₃', '97 % × 94 % × 91 %', '83 %']);

    const many = Array.from({ length: 12 }, (_, i) => ({ name: `Paso ${i + 1}`, step: { fpy: 0.99 } }));
    expect(toText(fpyExplain(many, fpyRty(many.map((s) => s.step)).result!, es, 'es').rty.steps[0]!)).toBe('FPY₁ × FPY₂ × … × FPY₁₂');
  });
});
