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
import { deductionNames, readTaktSaved, stationNames, taktView, toTaktInput, type TaktSaved } from './takt/reading';
import { BOTTLING, PACKS } from './takt/examples';
import { oee } from '../calc/oee';
import { oeeExplain } from './oee/explain';
import { BOTTLING as BOTTLING_OEE, toOeeInput, VORNE as VORNE_OEE, type OeeSaved } from './oee/model';
import { kanban } from '../calc/kanban';
import { kanbanExplain } from './kanban/explain';
import { calcInput as kanbanInput } from './kanban/reading';
import { roi } from '../calc/roi';
import { lineExplain, roiExplain } from './roi/explain';
import { calcInput as roiInput } from './roi/model';

// «De dónde sale cada valor»: la fórmula con letras, con los números y el
// resultado, igual que en pantalla. `toText` es la versión en una línea.
// El espacio que no se parte («75,57\u00a0%») se compara como un espacio normal.
const txt = (d: Derivation | null) => d!.steps.map((e) => toText(e).replace(/\u00a0/g, ' '));

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
  const explainOf = (saved: TaktSaved) => {
    const r = takt(toTaktInput(saved)).result!;
    return taktExplain(toTaktInput(saved), stationNames(saved, es), deductionNames(saved, es), r, taktView(saved, es), es, 'es');
  };
  const v1 = (available: number, availableUnit: string, demand: number, unit: string, cycles: number[]) =>
    readTaktSaved({ available, availableUnit, demand, unit, stations: cycles.map((cycle, i) => ({ name: `Estación ${i + 1}`, cycle })) })!;

  test('takt = T ÷ D, con el tiempo convertido a la unidad del takt (MS 800)', () => {
    const ex = explainOf(v1(420, 'min', 500, 's', [50, 45, 40, 30, 30]));
    expect(txt(ex.takt)).toEqual(['T ÷ D', '25.200 s ÷ 500', '50,4 s/pieza']);
    expect(txt(ex.available)).toEqual(['Turno', '420', '420 min', '25.200 s']);
    expect(ex.available!.where[0]!.value).toBe('420 min');
    expect(txt(ex.minStations)).toEqual(['ΣTC ÷ Takt', '195 s/pieza ÷ 50,4 s/pieza', '3,87', '4']);
    expect(txt(ex.efficiency)).toEqual(['ΣTC ÷ (n × Takt)', '195 s/pieza ÷ (5 × 50,4 s/pieza)', '77,4 %']);
    expect(txt(ex.idle)).toEqual(['1 − Eficiencia', '100 % − 77,4 %', '22,6 %']);
    expect(txt(ex.capacity)).toEqual(['T ÷ TC máx', '25.200 s ÷ 50 s/pieza', '504 piezas']);
  });

  test('sin estaciones solo hay tiempo disponible y takt', () => {
    const ex = explainOf(v1(480, 'min', 240, 'min', []));
    expect(txt(ex.takt)).toEqual(['T ÷ D', '480 min ÷ 240', '2 min/pieza']);
    expect(ex.capacity).toBeNull();
  });

  test('embotelladora: la resta del turno, el ritmo, la capacidad y el OEE, en velocidades', () => {
    const ex = explainOf(BOTTLING(es));
    expect(txt(ex.available)).toEqual(['(Turno − d₁ − d₂) × Turnos', '(480 − 10 − 20) × 3', '1.350 min', '22,5 h']);
    expect(txt(ex.takt)).toEqual(['D ÷ T', '900.000 ÷ 22,5 h', '40.000 botellas/h']);
    expect(txt(ex.capacity)).toEqual(['T × V mín', '22,5 h × 44.500 botellas/h', '1.001.250 botellas']);
    expect(ex.minStations).toBeNull();
    expect(txt(ex.expected)).toEqual(['T × V estándar × OEE', '22,5 h × 48.000 botellas/h × 75 %', '810.000 botellas']);
    expect(txt(ex.minOee)).toEqual(['Ritmo ÷ V estándar', '40.000 botellas/h ÷ 48.000 botellas/h', '83,3 %']);
  });

  test('montaje de packs: medidas en segundos, resultados en minutos', () => {
    const ex = explainOf(PACKS(es));
    expect(txt(ex.available)).toEqual(['Turno − d₁ − d₂ − d₃', '480 − 10 − 10 − 30', '430 min']);
    expect(txt(ex.takt)).toEqual(['T ÷ D', '430 min ÷ 215', '2 min/pack']);
    expect(txt(ex.minStations)).toEqual(['ΣTC ÷ Takt', '5,52 min/pack ÷ 2 min/pack', '2,76', '3']);
  });
});

describe('OEE: de dónde sale cada valor', () => {
  const explainOee = (s: OeeSaved) => {
    const i = toOeeInput(s);
    return oeeExplain(s, i.idealCycle, oee(i).result!, es, 'es');
  };
  test('Vorne: los tres factores y el OEE', () => {
    const ex = explainOee(VORNE_OEE(es));
    expect(txt(ex.availability)).toEqual(['Tm ÷ Tp', '373 min ÷ 420 min', '88,81 %']);
    expect(txt(ex.performance)).toEqual(['(TCe × N) ÷ Tm', '(1 s/pieza × 19.271) ÷ 22.380 s', '86,11 %']);
    expect(txt(ex.quality)).toEqual(['(N − R) ÷ N', '(19.271 − 423) ÷ 19.271', '18.848 ÷ 19.271', '97,80 %']);
    expect(txt(ex.oee)).toEqual(['Disp × Rend × Cal', '88,81 % × 86,11 % × 97,80 %', '74,79 %']);
    // De dónde sale el tiempo en marcha (pregunta del dueño, 2026-11-21): 420 − 47.
    expect(ex.availability.where[0]!.label).toBe('Tiempo en marcha: planificado − paradas no planificadas = 420 min − 47 min');
    expect(ex.availability.where[1]!.label).toBe('Tiempo planificado: turno − paradas planificadas = 480 − 60 min');
    expect(ex.quality.where.map((w) => w.value)).toEqual(['19.271', '423', '18.848']);
    expect(ex.view).toBeNull();
  });
  test('Vorne: las pérdidas en minutos', () => {
    const ex = explainOee(VORNE_OEE(es));
    expect(txt(ex.speed)).toEqual(['Tm − (TCe × N)', '373 min − (1 s/pieza × 19.271)', '51,8 min']);
    expect(txt(ex.qualityLoss)).toEqual(['TCe × R', '1 s/pieza × 423', '7,1 min']);
    expect(txt(ex.useful)).toEqual(['TCe × (N − R)', '1 s/pieza × 18.848', '314,1 min']);
  });
  test('embotelladora: velocidad en botellas/h y la otra vista', () => {
    const ex = explainOee(BOTTLING_OEE(es));
    expect(txt(ex.performance)).toEqual(['N ÷ (Ve × Tm)', '270.000 ÷ (48.000 botellas/h × 6,25 h)', '90,00 %']);
    expect(txt(ex.useful)).toEqual(['(N − R) ÷ Ve', '266.000 ÷ 48.000 botellas/h', '332,5 min']);
    expect(txt(ex.view!)).toEqual(['Tu ÷ (Tp − Q)', '332,5 min ÷ (470 min − 30 min)', '75,57 %']);
  });
});

describe('Kanban: de dónde sale cada valor', () => {
  test('Westerville: D × L × (1 + α) ÷ C, redondeado hacia arriba', () => {
    const s = { unit: 'day' as const, mode: 'split' as const, demand: 2000, wait: 0.08, process: 0.02, safetyPct: 10, size: 22 };
    const ex = kanbanExplain(s, kanban(kanbanInput(s)).result!, es, 'es');
    expect(txt(ex.cards)).toEqual(['(D × L × (1 + α)) ÷ C', '(2.000 × 0,1 × (1 + 10 %)) ÷ 22', '10', '10']);
    expect(txt(ex.lead)).toEqual(['Te + Tp', '0,08 días + 0,02 días', '0,1 días']);
    expect(txt(ex.pieces)).toEqual(['k × C', '10 × 22', '220']);
  });
});

describe('ROI: de dónde sale cada valor', () => {
  test('ahorro igual cada año (Lumen): payback = I ÷ A', () => {
    const s = { currency: '€', investment: 120_000, mode: 'same' as const, lines: [{ name: '', kind: 'hard' as const, how: 'direct' as const, amount: 24_000 }], years: [], newCosts: 0, horizon: 1 };
    const ex = roiExplain(s, roi(roiInput(s)).result!, es, 'es');
    expect(txt(ex.payback)).toEqual(['I ÷ A', '120.000 € ÷ 24.000 €', '5 años']);
    expect(txt(ex.net)).toEqual(['AD − CN', '24.000 € − 0 €', '24.000 €']);
    expect(txt(ex.roi)).toEqual(['(AH − I) ÷ I', '(24.000 € − 120.000 €) ÷ 120.000 €', '−80 %']);
  });

  test('ahorro distinto cada año (Lumen «refurbish»): acumulado e interpolado', () => {
    const s = { currency: '€', investment: 56_000, mode: 'yearly' as const, lines: [], years: [18_000, 16_000, 14_000, 12_000], newCosts: 0, horizon: 0 };
    const ex = roiExplain(s, roi(roiInput(s)).result!, es, 'es');
    expect(txt(ex.payback)).toEqual(['3 + (I − Σ) ÷ A4', '3 + (56.000 € − 48.000 €) ÷ 12.000 €', '3,67 años', '3 años y 8 meses']);
    expect(ex.net).toBeNull();
  });

  test('línea por unidad: (Ca − Cd) × U', () => {
    const line = { name: 'Mermas', kind: 'hard' as const, how: 'unit' as const, before: 2.5, after: 2, units: 40_000 };
    expect(txt(lineExplain(line, 'Mermas', es, 'es', '€'))).toEqual(['(Ca − Cd) × U', '(2,5 € − 2 €) × 40.000', '20.000 €']);
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
