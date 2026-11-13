import type { CalcOutput, CalcStep, CalcWarning } from './types';
import { normalInv } from './stats';

// DPMO y nivel sigma (docs/fichas/fase-1.md, ficha 1).

export interface DpmoInput {
  units: number;
  opportunities: number;
  defects: number;
}

export interface DpmoResult {
  dpu: number;
  dpo: number;
  dpmo: number;
  /** Rendimiento por oportunidad: 1 − DPO. */
  yield: number;
  /** Z a largo plazo = Φ⁻¹(1 − DPO): la «Z del proceso» de Minitab. Null si DPO es 0 o 1. */
  zLongTerm: number | null;
  /** Nivel sigma con el desplazamiento convencional de 1,5 = Z a largo plazo + 1,5. */
  sigmaLevel: number | null;
}

/** Desplazamiento convencional de Seis Sigma entre corto y largo plazo. */
export const SIGMA_SHIFT = 1.5;

export function dpmo({ units, opportunities, defects }: DpmoInput): CalcOutput<DpmoResult> {
  const warnings: CalcWarning[] = [];
  const fields = { units, opportunities, defects } as const;
  for (const [field, value] of Object.entries(fields)) {
    if (!Number.isInteger(value)) warnings.push({ code: 'not-whole', field });
  }
  if (!(units > 0)) warnings.push({ code: 'not-positive', field: 'units' });
  if (!(opportunities > 0)) warnings.push({ code: 'not-positive', field: 'opportunities' });
  if (defects < 0) warnings.push({ code: 'negative', field: 'defects' });
  if (warnings.length) return { result: null, steps: [], warnings };

  const total = units * opportunities;
  if (defects > total) return { result: null, steps: [], warnings: [{ code: 'defects-exceed-opportunities' }] };

  const dpo = defects / total;
  let zLongTerm: number | null = null;
  if (defects === 0) warnings.push({ code: 'zero-defects' });
  else if (defects === total) warnings.push({ code: 'all-defects' });
  // −Φ⁻¹(DPO) en lugar de Φ⁻¹(1 − DPO): mismo valor, sin perder precisión
  // cuando DPO es muy pequeño (procesos de 5 o 6 sigma).
  else zLongTerm = -normalInv(dpo);

  const result: DpmoResult = {
    dpu: defects / units,
    dpo,
    dpmo: dpo * 1_000_000,
    yield: 1 - dpo,
    zLongTerm,
    sigmaLevel: zLongTerm === null ? null : zLongTerm + SIGMA_SHIFT,
  };
  const steps: CalcStep[] = [
    { key: 'opportunitiesTotal', value: total },
    { key: 'dpu', value: result.dpu },
    { key: 'dpo', value: dpo },
    { key: 'dpmo', value: result.dpmo },
    ...(zLongTerm === null ? [] : [
      { key: 'zLongTerm', value: zLongTerm },
      { key: 'sigmaLevel', value: zLongTerm + SIGMA_SHIFT },
    ]),
  ];
  return { result, steps, warnings };
}
