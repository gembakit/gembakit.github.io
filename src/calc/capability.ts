import type { CalcOutput, CalcWarning } from './types';
import { andersonDarling, mean, sampleSd } from './descriptive';
import { normalCdf } from './stats';
import { SPC_CONSTANTS } from './spc';

// Capacidad de proceso (docs/fichas/fase-3.md, ficha 1). Fórmulas de
// NIST/SEMATECH e-Handbook 6.1.6:
//   Cp = (LSE − LIE) ÷ 6σ; Cpk = mín[(LSE − x̄) ÷ 3σ, (x̄ − LIE) ÷ 3σ];
//   Cpm = (LSE − LIE) ÷ 6·√(σ² + (x̄ − T)²).
// Con la sigma «dentro» (a corto plazo) salen Cp y Cpk; con la «global»
// (la desviación de todos los datos) salen Pp y Ppk.
// - Dentro, datos individuales: MR̄ ÷ 1,128 (NIST 6.3.2.2).
// - Dentro, subgrupos: R̄ ÷ d2 (NIST 6.3.2.1). Minitab usa por defecto la
//   desviación combinada; con subgrupos puede dar algo distinto (está en la ficha).
// - Global: desviación de la muestra (n − 1).
// Partes por millón esperadas con la normal; observadas, contando.

export interface CapabilityInput {
  values: number[];
  /** Límite inferior de especificación (LIE), si lo hay. */
  lsl: number | null;
  /** Límite superior de especificación (LSE), si lo hay. */
  usl: number | null;
  /** Valor objetivo, si lo hay (para Cpm). */
  target: number | null;
  /** Tamaño de subgrupo: 1 = datos individuales. */
  subgroup: number;
}

export interface CapabilityIndices {
  /** Null con un solo límite. */
  cp: number | null;
  cpl: number | null;
  cpu: number | null;
  cpk: number;
  /** PPM esperadas por debajo del LIE y por encima del LSE, y en total. */
  ppmBelow: number;
  ppmAbove: number;
  ppmTotal: number;
}

export interface CapabilityResult {
  n: number;
  mean: number;
  sigmaWithin: number;
  sigmaOverall: number;
  within: CapabilityIndices;
  overall: CapabilityIndices;
  cpm: number | null;
  /** PPM observadas fuera de especificación. */
  observedPpm: number;
  observedOut: number;
  normalityP: number | null;
}

/** Índices con una media y una sigma dadas (con la sigma dentro, Cp y Cpk; con la global, Pp y Ppk). */
export function indices(m: number, s: number, lsl: number | null, usl: number | null): CapabilityIndices {
  const cpl = lsl === null ? null : (m - lsl) / (3 * s);
  const cpu = usl === null ? null : (usl - m) / (3 * s);
  const cp = lsl !== null && usl !== null ? (usl - lsl) / (6 * s) : null;
  const cpk = Math.min(...[cpl, cpu].filter((x): x is number => x !== null));
  const below = lsl === null ? 0 : normalCdf((lsl - m) / s) * 1e6;
  const above = usl === null ? 0 : (1 - normalCdf((usl - m) / s)) * 1e6;
  return { cp, cpl, cpu, cpk, ppmBelow: below, ppmAbove: above, ppmTotal: below + above };
}

/** Sigma dentro: MR̄ ÷ 1,128 con datos individuales; R̄ ÷ d2 con subgrupos seguidos. */
export function sigmaWithin(values: readonly number[], subgroup: number): number | null {
  if (subgroup <= 1) {
    if (values.length < 2) return null;
    let s = 0;
    for (let i = 1; i < values.length; i++) s += Math.abs(values[i]! - values[i - 1]!);
    return s / (values.length - 1) / SPC_CONSTANTS[2]!.d2;
  }
  const k = SPC_CONSTANTS[subgroup];
  const count = Math.floor(values.length / subgroup);
  if (!k || count < 1) return null;
  let r = 0;
  for (let g = 0; g < count; g++) {
    const sg = values.slice(g * subgroup, (g + 1) * subgroup);
    r += Math.max(...sg) - Math.min(...sg);
  }
  return r / count / k.d2;
}

export function capability(i: CapabilityInput): CalcOutput<CapabilityResult> {
  const warnings: CalcWarning[] = [];
  if (i.lsl === null && i.usl === null) warnings.push({ code: 'no-spec' });
  if (i.lsl !== null && i.usl !== null && !(i.usl > i.lsl)) warnings.push({ code: 'spec-order' });
  if (i.subgroup > 1 && !SPC_CONSTANTS[i.subgroup]) warnings.push({ code: 'subgroup-size', min: 2, max: 10 });
  if (i.values.length < 2) warnings.push({ code: i.values.length ? 'single-value' : 'no-data' });
  if (warnings.length) return { result: null, steps: [], warnings };
  const m = mean(i.values);
  const so = sampleSd(i.values);
  const sw = sigmaWithin(i.values, i.subgroup);
  if (!(so > 0) || sw === null || !(sw > 0)) return { result: null, steps: [], warnings: [{ code: 'constant' }] };
  const within = indices(m, sw, i.lsl, i.usl);
  const overall = indices(m, so, i.lsl, i.usl);
  const cpm = i.target !== null && i.lsl !== null && i.usl !== null ? (i.usl - i.lsl) / (6 * Math.sqrt(so * so + (m - i.target) ** 2)) : null;
  const out = i.values.filter((x) => (i.lsl !== null && x < i.lsl) || (i.usl !== null && x > i.usl)).length;
  const ad = andersonDarling([...i.values].sort((a, b) => a - b));
  if (i.values.length < 50) warnings.push({ code: 'few-data', min: 50 });
  if (ad && ad.p < 0.05) warnings.push({ code: 'not-normal', p: ad.p });
  if (i.target !== null && ((i.lsl !== null && i.target < i.lsl) || (i.usl !== null && i.target > i.usl))) warnings.push({ code: 'target-outside' });
  // Mucha diferencia entre corto y largo plazo: el proceso se mueve (inestable).
  if (so / sw > 1.5) warnings.push({ code: 'unstable-process' });
  if (within.cpk < 1) warnings.push({ code: 'not-capable' });
  return {
    result: { n: i.values.length, mean: m, sigmaWithin: sw, sigmaOverall: so, within, overall, cpm, observedPpm: (out / i.values.length) * 1e6, observedOut: out, normalityP: ad?.p ?? null },
    steps: [
      { key: 'mean', value: m },
      { key: 'sigmaWithin', value: sw },
      { key: 'sigmaOverall', value: so },
      { key: 'cpk', value: within.cpk },
      { key: 'ppk', value: overall.cpk },
    ],
    warnings,
  };
}
