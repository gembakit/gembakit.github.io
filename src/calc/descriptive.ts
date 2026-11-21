import type { CalcOutput, CalcStep, CalcWarning } from './types';
import { normalCdf } from './stats';

// Estadística descriptiva con histograma (docs/fichas/fase-2.md, ficha 1).
// Convenciones de Minitab, que coinciden con las funciones de Excel y Google
// Sheets que lleva la hoja:
// - desviación estándar de la muestra (n − 1): STDEV.S;
// - cuartiles con la posición (n + 1)·p y interpolación lineal: QUARTILE.EXC;
// - asimetría y curtosis corregidas por muestra: SKEW y KURT;
// - normalidad: Anderson-Darling (NIST/SEMATECH e-Handbook, 1.3.5.14), con el
//   ajuste por muestra A²·(1 + 0,75/n + 2,25/n²) y los valores p de D'Agostino
//   y Stephens (1986) que publica Minitab.

export interface HistogramBin {
  from: number;
  to: number;
  count: number;
}

export interface AndersonDarling {
  a2: number;
  /** A² ajustado por el tamaño de la muestra. */
  a2adj: number;
  p: number;
}

export interface DescriptiveResult {
  n: number;
  mean: number;
  sd: number;
  variance: number;
  /** Error estándar de la media: s ÷ √n. */
  se: number;
  min: number;
  q1: number | null;
  median: number;
  q3: number | null;
  max: number;
  range: number;
  iqr: number | null;
  skewness: number | null;
  kurtosis: number | null;
  normality: AndersonDarling | null;
  /** Valores fuera de Q1 − 1,5·RIC y Q3 + 1,5·RIC (posiciones en los datos, desde 0). */
  outliers: number[];
  bins: HistogramBin[];
}

export const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
export const mean = (xs: readonly number[]) => sum(xs) / xs.length;

/** Desviación estándar de la muestra (n − 1). */
export function sampleSd(xs: readonly number[]): number {
  const m = mean(xs);
  return Math.sqrt(sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1));
}

/** Mediana de una lista ordenada. */
export function medianSorted(s: readonly number[]): number {
  const k = s.length / 2;
  return s.length % 2 ? s[Math.floor(k)]! : (s[k - 1]! + s[k]!) / 2;
}

/**
 * Cuantil de Minitab (QUARTILE.EXC / PERCENTILE.EXC): posición w = (n + 1)·p,
 * interpolando entre el dato y y el siguiente. Null si la posición se sale (muy pocos datos).
 */
export function quantileExc(s: readonly number[], p: number): number | null {
  const w = (s.length + 1) * p;
  if (w < 1 || w > s.length) return null;
  const y = Math.floor(w);
  const z = w - y;
  return y >= s.length ? s[s.length - 1]! : s[y - 1]! + z * (s[y]! - s[y - 1]!);
}

/** Asimetría de la muestra (Excel SKEW, Minitab): n/((n−1)(n−2)) · Σ((x − x̄)/s)³. */
export function skewness(xs: readonly number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const m = mean(xs);
  const s = sampleSd(xs);
  if (!(s > 0)) return null;
  return (n / ((n - 1) * (n - 2))) * sum(xs.map((x) => ((x - m) / s) ** 3));
}

/** Curtosis de la muestra (Excel KURT, Minitab): exceso sobre la normal. */
export function kurtosis(xs: readonly number[]): number | null {
  const n = xs.length;
  if (n < 4) return null;
  const m = mean(xs);
  const s = sampleSd(xs);
  if (!(s > 0)) return null;
  const a = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
  return a * sum(xs.map((x) => ((x - m) / s) ** 4)) - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
}

/** Prueba de normalidad de Anderson-Darling con media y desviación de la muestra. */
export function andersonDarling(sorted: readonly number[]): AndersonDarling | null {
  const n = sorted.length;
  if (n < 3) return null;
  const m = mean(sorted);
  const s = sampleSd(sorted);
  if (!(s > 0)) return null;
  // F(Y) con colas acotadas: un dato muy lejos daría log(0).
  const F = sorted.map((y) => Math.min(1 - 1e-15, Math.max(1e-15, normalCdf((y - m) / s))));
  let S = 0;
  for (let i = 1; i <= n; i++) S += ((2 * i - 1) / n) * (Math.log(F[i - 1]!) + Math.log(1 - F[n - i]!));
  const a2 = -n - S;
  const a2adj = a2 * (1 + 0.75 / n + 2.25 / n ** 2);
  return { a2, a2adj, p: adPValue(a2adj) };
}

/** Valor p de Anderson-Darling para la normal (D'Agostino y Stephens, 1986; Minitab). */
export function adPValue(a: number): number {
  let p: number;
  if (a >= 0.6) p = Math.exp(1.2937 - 5.709 * a + 0.0186 * a * a);
  else if (a >= 0.34) p = Math.exp(0.9177 - 4.279 * a - 1.38 * a * a);
  else if (a >= 0.2) p = 1 - Math.exp(-8.318 + 42.796 * a - 59.938 * a * a);
  else p = 1 - Math.exp(-13.436 + 101.14 * a - 223.73 * a * a);
  return Math.min(1, Math.max(0, p));
}

/** Un ancho «bonito» (1, 2, 2,5 o 5 por potencia de diez) que sea al menos el pedido. */
function niceWidth(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 2.5, 5, 10].map((m) => m * pow).find((w) => w >= raw - 1e-12 * pow) ?? 10 * pow);
}

/**
 * Barras del histograma: unas √n (entre 5 y 15), de ancho redondo, empezando
 * en un múltiplo del ancho. Cada barra cuenta [desde, hasta); la última, también su borde.
 */
export function histogramBins(values: readonly number[]): HistogramBin[] {
  if (!values.length) return [];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (lo === hi) return [{ from: lo - 0.5, to: hi + 0.5, count: values.length }];
  const k = Math.min(15, Math.max(5, Math.round(Math.sqrt(values.length))));
  const width = niceWidth((hi - lo) / k);
  const start = Math.floor(lo / width + 1e-9) * width;
  const count = Math.max(1, Math.ceil((hi - start) / width + 1e-9));
  const bins = Array.from({ length: count }, (_, i) => ({ from: Number((start + i * width).toPrecision(12)), to: Number((start + (i + 1) * width).toPrecision(12)), count: 0 }));
  for (const v of values) {
    const i = Math.min(count - 1, Math.floor((v - start) / width + 1e-9));
    bins[i]!.count++;
  }
  // Si el último dato cae justo en el borde de una barra vacía, se queda en la anterior.
  while (bins.length > 1 && bins[bins.length - 1]!.count === 0) bins.pop();
  return bins;
}

export function descriptive(values: readonly number[]): CalcOutput<DescriptiveResult> {
  const warnings: CalcWarning[] = [];
  if (values.length === 0) return { result: null, steps: [], warnings: [{ code: 'no-data' }] };
  if (values.length === 1) return { result: null, steps: [], warnings: [{ code: 'single-value' }] };
  const n = values.length;
  const s = [...values].sort((a, b) => a - b);
  const m = mean(values);
  const sd = sampleSd(values);
  const q1 = quantileExc(s, 0.25);
  const q3 = quantileExc(s, 0.75);
  const iqr = q1 !== null && q3 !== null ? q3 - q1 : null;
  const normality = andersonDarling(s);
  const outliers = iqr === null ? [] : values.flatMap((v, i) => (v < q1! - 1.5 * iqr || v > q3! + 1.5 * iqr ? [i] : []));
  if (!(sd > 0)) warnings.push({ code: 'constant' });
  if (n < 20) warnings.push({ code: 'few-data', min: 20 });
  if (normality && normality.p < 0.05) warnings.push({ code: 'not-normal', p: normality.p });
  if (outliers.length) warnings.push({ code: 'outliers', count: outliers.length });
  const result: DescriptiveResult = {
    n,
    mean: m,
    sd,
    variance: sd * sd,
    se: sd / Math.sqrt(n),
    min: s[0]!,
    q1,
    median: medianSorted(s),
    q3,
    max: s[n - 1]!,
    range: s[n - 1]! - s[0]!,
    iqr,
    skewness: skewness(values),
    kurtosis: kurtosis(values),
    normality,
    outliers,
    bins: histogramBins(values),
  };
  const steps: CalcStep[] = [
    { key: 'n', value: n },
    { key: 'mean', value: m },
    { key: 'sd', value: sd },
    { key: 'median', value: result.median },
  ];
  return { result, steps, warnings };
}

/** Densidad de la normal con esa media y desviación. */
export function normalPdf(x: number, m: number, s: number): number {
  return Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
}
