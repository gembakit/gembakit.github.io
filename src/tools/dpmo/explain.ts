import type { DpmoInput, DpmoResult } from '../../calc/dpmo';
import { SIGMA_SHIFT } from '../../calc/dpmo';
import type { Messages } from '../../i18n';
import type { Derivation } from '../../ui/Explained';
import { formatNumber, formatSignificant } from '../../ui/number';

/** Cómo se muestra cada valor en pantalla: la ventana usa exactamente lo mismo. */
export function dpmoFormat(lang: 'es' | 'en') {
  const num = (x: number, decimals: number) => formatNumber(x, lang, decimals);
  return {
    num,
    count: (x: number) => num(x, 4),
    dpu: (x: number) => formatSignificant(x, lang, 3),
    dpo: (x: number) => formatSignificant(x, lang, 3),
    dpmo: (x: number) => (x >= 100 ? num(x, 0) : num(x, 2)),
    yieldPct: (x: number) => `${num(x * 100, 4)} %`,
    z: (x: number) => num(x, 4),
    sigma: (x: number) => num(x, 2),
  };
}

export type DpmoKey = 'dpu' | 'dpo' | 'dpmo' | 'yield' | 'z' | 'sigma';

/** De dónde sale cada valor de DPMO, con los números del usuario. */
export function dpmoExplain(input: DpmoInput, r: DpmoResult, t: Messages, lang: 'es' | 'en'): Record<DpmoKey, Derivation | null> {
  const d = t.tools.dpmo;
  const x = d.explain;
  const f = dpmoFormat(lang);
  const D = f.count(input.defects);
  const U = f.count(input.units);
  const O = f.count(input.opportunities);
  const total = f.count(input.units * input.opportunities);
  // Para encadenar cálculos, DPO con más cifras que en pantalla: así 1 − DPO cuadra.
  const dpoFine = formatSignificant(r.dpo, lang, 8);
  const yieldFine = formatSignificant(r.yield, lang, 8);
  const million = f.num(1_000_000, 0);
  const shift = f.num(SIGMA_SHIFT, 1);
  const wD = { sym: 'D', label: d.defects, value: D };
  const wU = { sym: 'U', label: d.units, value: U };
  const wO = { sym: 'O', label: d.opportunities, value: O };
  const wDpo = { sym: 'DPO', label: x.dpoName, value: dpoFine };

  return {
    dpu: { term: 'dpu', lhs: 'DPU', steps: ['D ÷ U', `${D} ÷ ${U}`, f.dpu(r.dpu)], where: [wD, wU] },
    dpo: { term: 'dpo', lhs: 'DPO', steps: ['D ÷ (U × O)', `${D} ÷ (${U} × ${O})`, `${D} ÷ ${total}`, f.dpo(r.dpo)], where: [wD, wU, wO] },
    dpmo: {
      term: 'dpmo',
      lhs: 'DPMO',
      steps: [`D ÷ (U × O) × ${million}`, `${D} ÷ ${total} × ${million}`, f.dpmo(r.dpmo)],
      where: [wD, wU, wO],
    },
    yield: {
      title: d.yieldLabel,
      meaning: x.yieldMeaning,
      lhs: x.yieldSym,
      steps: ['1 − DPO', `1 − ${dpoFine}`, f.yieldPct(r.yield)],
      where: [wDpo],
    },
    z:
      r.zLongTerm === null
        ? null
        : {
            term: 'z-proceso',
            lhs: 'Z',
            steps: ['Φ⁻¹(1 − DPO)', `Φ⁻¹(1 − ${dpoFine})`, `Φ⁻¹(${yieldFine})`, f.z(r.zLongTerm)],
            where: [wDpo, { sym: 'Φ⁻¹', label: x.normInv }],
            notes: [x.excel(yieldFine), t.explain.rounded],
          },
    sigma:
      r.sigmaLevel === null || r.zLongTerm === null
        ? null
        : {
            term: 'nivel-sigma',
            lhs: x.sigmaSym,
            steps: [`Z + ${shift}`, `${f.z(r.zLongTerm)} + ${shift}`, f.sigma(r.sigmaLevel)],
            where: [
              { sym: 'Z', label: x.zName, value: f.z(r.zLongTerm) },
              { sym: shift, label: x.shift },
            ],
            notes: [t.explain.rounded],
          },
  };
}
