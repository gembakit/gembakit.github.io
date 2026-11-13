import type { CalcOutput, CalcStep, CalcWarning } from './types';

// FPY y RTY (docs/fichas/fase-1.md, ficha 2).

/** Un paso: contado (unidades que entran y buenas a la primera) o con su FPY ya conocido (de 0 a 1). */
export type FpyStep = { entering: number; good: number } | { fpy: number };

export interface FpyResult {
  /** FPY de cada paso, de 0 a 1. */
  fpy: number[];
  /** RTY = producto de los FPY. */
  rty: number;
  /** Fábrica oculta = 1 − RTY. */
  hiddenFactory: number;
  /** Paso con el FPY más bajo (el primero, si hay empate). */
  worst: number;
}

export function fpyRty(steps: FpyStep[]): CalcOutput<FpyResult> {
  if (steps.length === 0) return { result: null, steps: [], warnings: [{ code: 'no-data' }] };
  const warnings: CalcWarning[] = [];
  const fpy = steps.map((s, step) => {
    if ('fpy' in s) {
      if (!(s.fpy >= 0 && s.fpy <= 1)) warnings.push({ code: 'fpy-out-of-range', step });
      return s.fpy;
    }
    if (!Number.isInteger(s.entering) || !Number.isInteger(s.good)) warnings.push({ code: 'step-not-whole', step });
    else if (!(s.entering > 0)) warnings.push({ code: 'step-no-input', step });
    else if (s.good < 0) warnings.push({ code: 'step-negative', step });
    else if (s.good > s.entering) warnings.push({ code: 'good-exceed-entering', step });
    return s.good / s.entering;
  });
  if (warnings.length) return { result: null, steps: [], warnings };

  const rty = fpy.reduce((a, b) => a * b, 1);
  const worst = fpy.indexOf(Math.min(...fpy));
  // Ficha 2, tercer aviso: el RTY nunca supera al peor paso. Con todos los FPY
  // entre 0 y 1 (comprobado arriba) es imposible; la prueba fpy.test.ts lo vigila.

  const calcSteps: CalcStep[] = [...fpy.map((value, i) => ({ key: `fpy:${i}`, value })), { key: 'rty', value: rty }, { key: 'hiddenFactory', value: 1 - rty }];
  return { result: { fpy, rty, hiddenFactory: 1 - rty, worst }, steps: calcSteps, warnings: [] };
}
