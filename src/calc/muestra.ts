import type { CalcOutput } from './types';

// Cálculo de la herramienta de muestra (media aritmética). Se borra en la Fase 1,
// junto con la herramienta, cuando llegue la estadística descriptiva real.
export function sampleMean(values: readonly number[]): CalcOutput<number> {
  const n = values.length;
  if (n === 0) return { result: null, steps: [], warnings: [{ code: 'no-data' }] };
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    result: sum / n,
    steps: [
      { key: 'sum', value: sum },
      { key: 'count', value: n },
    ],
    warnings: n === 1 ? [{ code: 'single-value' }] : [],
  };
}
