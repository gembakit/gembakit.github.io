import type { CalcOutput, CalcWarning } from './types';
import { medianSorted } from './descriptive';

// Gráfico de corrida (docs/fichas/fase-2.md, ficha 3), con las reglas de
// Perla, Provost y Murray, «The run chart: a simple analytical tool for
// learning from variation in healthcare processes», BMJ Quality & Safety
// 2011;20:46-51 (las de IHI):
// - desplazamiento: 6 o más puntos seguidos por encima o por debajo de la
//   mediana (los que caen en la mediana no cuentan ni cortan la racha);
// - tendencia: 5 o más puntos seguidos subiendo o bajando (los valores
//   repetidos seguidos cuentan como uno);
// - demasiadas o demasiado pocas corridas: la prueba de rachas, con la
//   distribución exacta del número de corridas (Swed y Eisenhart, 1943) y
//   un 5 % por cada lado, en lugar de la tabla aproximada del artículo.

export interface RunSignal {
  kind: 'shift' | 'trend';
  /** Posiciones de los puntos de la señal (desde 0). */
  points: number[];
  /** Hacia dónde: por encima o subiendo (1), por debajo o bajando (−1). */
  direction: 1 | -1;
}

export interface RunChartResult {
  n: number;
  median: number;
  /** Puntos que no caen en la mediana: los que cuentan para las corridas. */
  useful: number;
  above: number;
  below: number;
  runs: number;
  /** Corridas esperadas si solo hubiera azar: 1 + 2·n₁·n₂ ÷ (n₁ + n₂). */
  expectedRuns: number | null;
  /** P(R ≤ corridas): pocas corridas, los datos se agrupan. */
  pFew: number | null;
  /** P(R ≥ corridas): demasiadas corridas, los datos se alternan. */
  pMany: number | null;
  signals: RunSignal[];
  /** Puntos que forman parte de alguna señal. */
  flagged: number[];
}

/** C(n, k) con números reales (sirve hasta n de unos cientos). */
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= Math.min(k, n - k); i++) r = (r * (n - Math.min(k, n - k) + i)) / i;
  return r;
}

/** P(R = r) con n₁ y n₂ puntos a cada lado (Swed y Eisenhart, 1943). */
export function runsProbability(n1: number, n2: number, r: number): number {
  const total = choose(n1 + n2, n1);
  if (r % 2 === 0) {
    const k = r / 2;
    return (2 * choose(n1 - 1, k - 1) * choose(n2 - 1, k - 1)) / total;
  }
  const k = (r - 1) / 2;
  return (choose(n1 - 1, k - 1) * choose(n2 - 1, k) + choose(n1 - 1, k) * choose(n2 - 1, k - 1)) / total;
}

/** P(R ≤ r) y P(R ≥ r). */
export function runsTail(n1: number, n2: number, r: number): { few: number; many: number } {
  const max = 2 * Math.min(n1, n2) + (n1 === n2 ? 0 : 1);
  let few = 0;
  let many = 0;
  for (let k = 2; k <= max; k++) {
    const p = runsProbability(n1, n2, k);
    if (k <= r) few += p;
    if (k >= r) many += p;
  }
  return { few: Math.min(1, few), many: Math.min(1, many) };
}

export const SHIFT_LENGTH = 6;
export const TREND_LENGTH = 5;
/** Con menos puntos útiles, la prueba de rachas no es fiable (Perla y cols., 2011: desde 10). */
export const MIN_USEFUL = 10;

export function runChart(values: readonly number[]): CalcOutput<RunChartResult> {
  const warnings: CalcWarning[] = [];
  if (values.length === 0) return { result: null, steps: [], warnings: [{ code: 'no-data' }] };
  if (values.length === 1) return { result: null, steps: [], warnings: [{ code: 'single-value' }] };
  const n = values.length;
  const median = medianSorted([...values].sort((a, b) => a - b));
  const side = values.map((v) => (v > median ? 1 : v < median ? -1 : 0));
  const useful = side.filter((s) => s !== 0);
  const above = useful.filter((s) => s === 1).length;
  const below = useful.length - above;
  let runs = useful.length ? 1 : 0;
  for (let i = 1; i < useful.length; i++) if (useful[i] !== useful[i - 1]) runs++;

  const signals: RunSignal[] = [];
  // Desplazamientos: rachas del mismo lado, saltando los puntos en la mediana.
  let start = -1;
  let dir = 0;
  let pts: number[] = [];
  const closeShift = () => {
    if (pts.length >= SHIFT_LENGTH) signals.push({ kind: 'shift', points: pts, direction: dir as 1 | -1 });
  };
  side.forEach((s, i) => {
    if (s === 0) return;
    if (s !== dir) {
      closeShift();
      dir = s;
      start = i;
      pts = [];
    }
    pts.push(i);
  });
  closeShift();
  void start;

  // Tendencias: subidas o bajadas seguidas; los iguales seguidos cuentan como uno.
  const distinct: number[] = [];
  values.forEach((v, i) => {
    if (i === 0 || v !== values[i - 1]) distinct.push(i);
  });
  let tStart = 0;
  let tDir = 0;
  const closeTrend = (end: number) => {
    const seq = distinct.slice(tStart, end + 1);
    if (seq.length >= TREND_LENGTH && tDir !== 0) {
      // Los repetidos de dentro de la tendencia también se marcan.
      const points: number[] = [];
      for (let i = seq[0]!; i <= seq[seq.length - 1]!; i++) points.push(i);
      signals.push({ kind: 'trend', points, direction: tDir as 1 | -1 });
    }
  };
  for (let k = 1; k < distinct.length; k++) {
    const d = values[distinct[k]!]! > values[distinct[k - 1]!]! ? 1 : -1;
    if (k === 1) {
      tDir = d;
      tStart = 0;
    } else if (d !== tDir) {
      closeTrend(k - 1);
      tDir = d;
      tStart = k - 1;
    }
  }
  if (distinct.length > 1) closeTrend(distinct.length - 1);

  let pFew: number | null = null;
  let pMany: number | null = null;
  let expectedRuns: number | null = null;
  if (above > 0 && below > 0) {
    expectedRuns = 1 + (2 * above * below) / (above + below);
    const tail = runsTail(above, below, runs);
    pFew = tail.few;
    pMany = tail.many;
  }
  if (useful.length < MIN_USEFUL) warnings.push({ code: 'few-data', min: MIN_USEFUL });
  if (pFew !== null && pFew < 0.05) warnings.push({ code: 'few-runs', p: pFew });
  if (pMany !== null && pMany < 0.05) warnings.push({ code: 'many-runs', p: pMany });
  const flagged = [...new Set(signals.flatMap((s) => s.points))].sort((a, b) => a - b);
  return {
    result: { n, median, useful: useful.length, above, below, runs, expectedRuns, pFew, pMany, signals, flagged },
    steps: [
      { key: 'median', value: median },
      { key: 'runs', value: runs },
    ],
    warnings,
  };
}
