import type { CalcOutput, CalcWarning } from './types';
import { mean } from './descriptive';

// Cartas de control I-MR y X-barra R (docs/fichas/fase-3.md, ficha 2).
// Fórmulas de NIST/SEMATECH e-Handbook, 6.3.2.1 y 6.3.2.2:
// - I: x̄ ± 3·MR̄/1,128; MR: LSC = 3,267·MR̄ (D4 con n = 2), LIC = 0.
// - X-barra: x̿ ± A2·R̄; R: D3·R̄ y D4·R̄.
// Tabla de A2, D3 y D4: la de NIST (6.3.2.1); d2: ASTM STP 15D (la misma de
// Montgomery, apéndice VI), coherente con A2 = 3 ÷ (d2·√n) (lo comprueba la prueba).
// Señales de causa especial: las pruebas de Nelson (1984), con la numeración
// que usa Minitab.

export interface SpcConstants {
  A2: number;
  D3: number;
  D4: number;
  d2: number;
}

export const SPC_CONSTANTS: Record<number, SpcConstants> = {
  2: { A2: 1.88, D3: 0, D4: 3.267, d2: 1.128 },
  3: { A2: 1.023, D3: 0, D4: 2.575, d2: 1.693 },
  4: { A2: 0.729, D3: 0, D4: 2.282, d2: 2.059 },
  5: { A2: 0.577, D3: 0, D4: 2.115, d2: 2.326 },
  6: { A2: 0.483, D3: 0, D4: 2.004, d2: 2.534 },
  7: { A2: 0.419, D3: 0.076, D4: 1.924, d2: 2.704 },
  8: { A2: 0.373, D3: 0.136, D4: 1.864, d2: 2.847 },
  9: { A2: 0.337, D3: 0.184, D4: 1.816, d2: 2.97 },
  10: { A2: 0.308, D3: 0.223, D4: 1.777, d2: 3.078 },
};
export const MIN_SUBGROUP = 2;
export const MAX_SUBGROUP = 10;

/** Pruebas de causa especial (Nelson, 1984; numeración de Minitab). */
export type SpcTest = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const ALL_TESTS: SpcTest[] = [1, 2, 3, 4, 5, 6, 7, 8];
/** Las que la app usa si no se cambian: la 1 y las de Western Electric (2, 5, 6) más la tendencia (3). */
export const DEFAULT_TESTS: SpcTest[] = [1, 2, 3, 5, 6];

export interface SpcSignal {
  test: SpcTest;
  /** Puntos que disparan la prueba (posiciones desde 0): el último de cada patrón. */
  points: number[];
}

/**
 * Pruebas de causa especial sobre una serie con su línea central y su sigma:
 * 1 punto a más de 3σ; 9 seguidos del mismo lado; 6 seguidos subiendo o
 * bajando; 14 seguidos alternando; 2 de 3 a más de 2σ del mismo lado; 4 de 5
 * a más de 1σ del mismo lado; 15 seguidos dentro de 1σ; 8 seguidos fuera de
 * 1σ (de cualquier lado).
 */
export function specialCauses(values: readonly (number | null)[], center: number, sigma: number, tests: readonly SpcTest[], limits?: { ucl: number; lcl: number }): SpcSignal[] {
  const out: SpcSignal[] = [];
  const v = values;
  const z = (x: number) => (sigma > 0 ? (x - center) / sigma : 0);
  const add = (test: SpcTest, i: number) => {
    let s = out.find((x) => x.test === test);
    if (!s) out.push((s = { test, points: [] }));
    if (!s.points.includes(i)) s.points.push(i);
  };
  const idx = v.flatMap((x, i) => (x === null ? [] : [i]));
  const at = (k: number) => v[idx[k]!]!;
  for (let k = 0; k < idx.length; k++) {
    const i = idx[k]!;
    const x = at(k);
    const zi = z(x);
    if (tests.includes(1) && (limits ? x > limits.ucl + 1e-12 || x < limits.lcl - 1e-12 : Math.abs(zi) > 3)) add(1, i);
    const window = (n: number) => (k + 1 >= n ? Array.from({ length: n }, (_, j) => at(k - n + 1 + j)) : null);
    if (tests.includes(2)) {
      const w = window(9);
      if (w && (w.every((y) => y > center) || w.every((y) => y < center))) add(2, i);
    }
    if (tests.includes(3)) {
      const w = window(6);
      if (w && (w.every((y, j) => j === 0 || y > w[j - 1]!) || w.every((y, j) => j === 0 || y < w[j - 1]!))) add(3, i);
    }
    if (tests.includes(4)) {
      const w = window(14);
      if (w && w.every((y, j) => j < 2 || (y - w[j - 1]!) * (w[j - 1]! - w[j - 2]!) < 0)) add(4, i);
    }
    if (tests.includes(5)) {
      const w = window(3);
      if (w && (w.filter((y) => z(y) > 2).length >= 2 || w.filter((y) => z(y) < -2).length >= 2)) add(5, i);
    }
    if (tests.includes(6)) {
      const w = window(5);
      if (w && (w.filter((y) => z(y) > 1).length >= 4 || w.filter((y) => z(y) < -1).length >= 4)) add(6, i);
    }
    if (tests.includes(7)) {
      const w = window(15);
      if (w && w.every((y) => Math.abs(z(y)) < 1)) add(7, i);
    }
    if (tests.includes(8)) {
      const w = window(8);
      if (w && w.every((y) => Math.abs(z(y)) > 1)) add(8, i);
    }
  }
  return out.sort((a, b) => a.test - b.test);
}

export interface ChartLimits {
  center: number;
  ucl: number;
  lcl: number;
  /** Sigma de la carta (la de un punto). */
  sigma: number;
}

export interface ImrResult {
  values: number[];
  /** Rango móvil de cada punto (el primero no tiene). */
  mr: (number | null)[];
  mrBar: number;
  individuals: ChartLimits;
  movingRange: ChartLimits;
  /** Sigma del proceso a corto plazo: MR̄ ÷ 1,128. */
  sigmaWithin: number;
  /** Puntos usados para los límites. */
  limitPoints: number;
  signalsI: SpcSignal[];
  signalsMR: SpcSignal[];
}

/**
 * Carta I-MR. Si `limitPoints` es menor que el total, los límites salen de
 * los primeros puntos y el resto se compara con ellos (antes y después).
 */
export function imr(values: readonly number[], opts: { limitPoints?: number; tests?: readonly SpcTest[] } = {}): CalcOutput<ImrResult> {
  const warnings: CalcWarning[] = [];
  if (values.length === 0) return { result: null, steps: [], warnings: [{ code: 'no-data' }] };
  if (values.length < 2) return { result: null, steps: [], warnings: [{ code: 'single-value' }] };
  const m = Math.min(values.length, Math.max(2, Math.round(opts.limitPoints ?? values.length)));
  const base = values.slice(0, m);
  const mr = values.map((x, i) => (i === 0 ? null : Math.abs(x - values[i - 1]!)));
  const mrBase = mr.slice(1, m) as number[];
  const mrBar = mean(mrBase);
  const center = mean(base);
  const sigma = mrBar / SPC_CONSTANTS[2]!.d2;
  const individuals = { center, ucl: center + 3 * sigma, lcl: center - 3 * sigma, sigma };
  const movingRange = { center: mrBar, ucl: SPC_CONSTANTS[2]!.D4 * mrBar, lcl: 0, sigma: 0 };
  const tests = opts.tests ?? DEFAULT_TESTS;
  const signalsI = specialCauses(values, center, sigma, tests, individuals);
  const signalsMR = specialCauses(mr, mrBar, 0, [1], movingRange);
  if (!(mrBar > 0)) warnings.push({ code: 'constant' });
  if (m < 20) warnings.push({ code: 'few-data', min: 20 });
  if (signalsI.length) warnings.push({ code: 'out-of-control', count: new Set(signalsI.flatMap((s) => s.points)).size });
  return {
    result: { values: [...values], mr, mrBar, individuals, movingRange, sigmaWithin: sigma, limitPoints: m, signalsI, signalsMR },
    steps: [
      { key: 'center', value: center },
      { key: 'mrBar', value: mrBar },
      { key: 'ucl', value: individuals.ucl },
      { key: 'lcl', value: individuals.lcl },
    ],
    warnings,
  };
}

export interface XbarRResult {
  size: number;
  subgroups: number[][];
  means: number[];
  ranges: number[];
  rBar: number;
  xbar: ChartLimits;
  range: ChartLimits;
  sigmaWithin: number;
  limitPoints: number;
  /** Datos que sobran al final (no completan un subgrupo). */
  leftover: number;
  signalsX: SpcSignal[];
  signalsR: SpcSignal[];
}

/** Carta X-barra R con subgrupos seguidos de `size` datos. */
export function xbarR(values: readonly number[], size: number, opts: { limitPoints?: number; tests?: readonly SpcTest[] } = {}): CalcOutput<XbarRResult> {
  const warnings: CalcWarning[] = [];
  const k = SPC_CONSTANTS[size];
  if (!k) return { result: null, steps: [], warnings: [{ code: 'subgroup-size', min: MIN_SUBGROUP, max: MAX_SUBGROUP }] };
  if (values.length === 0) return { result: null, steps: [], warnings: [{ code: 'no-data' }] };
  const count = Math.floor(values.length / size);
  if (count < 2) return { result: null, steps: [], warnings: [{ code: 'few-subgroups', min: 2 }] };
  const subgroups = Array.from({ length: count }, (_, i) => values.slice(i * size, (i + 1) * size));
  const means = subgroups.map(mean);
  const ranges = subgroups.map((g) => Math.max(...g) - Math.min(...g));
  const m = Math.min(count, Math.max(2, Math.round(opts.limitPoints ?? count)));
  const rBar = mean(ranges.slice(0, m));
  const center = mean(means.slice(0, m));
  const sigmaWithin = rBar / k.d2;
  const xbar = { center, ucl: center + k.A2 * rBar, lcl: center - k.A2 * rBar, sigma: (k.A2 * rBar) / 3 };
  const range = { center: rBar, ucl: k.D4 * rBar, lcl: k.D3 * rBar, sigma: 0 };
  const tests = opts.tests ?? DEFAULT_TESTS;
  const signalsX = specialCauses(means, center, xbar.sigma, tests, xbar);
  const signalsR = specialCauses(ranges, rBar, 0, [1], range);
  const leftover = values.length - count * size;
  if (leftover) warnings.push({ code: 'leftover', count: leftover });
  if (!(rBar > 0)) warnings.push({ code: 'constant' });
  if (m < 20) warnings.push({ code: 'few-data', min: 20 });
  if (signalsX.length || signalsR.length) warnings.push({ code: 'out-of-control', count: new Set([...signalsX, ...signalsR].flatMap((s) => s.points)).size });
  return {
    result: { size, subgroups, means, ranges, rBar, xbar, range, sigmaWithin, limitPoints: m, leftover, signalsX, signalsR },
    steps: [
      { key: 'center', value: center },
      { key: 'rBar', value: rBar },
      { key: 'ucl', value: xbar.ucl },
      { key: 'lcl', value: xbar.lcl },
    ],
    warnings,
  };
}
