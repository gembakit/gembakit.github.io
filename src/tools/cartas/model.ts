import { DEFAULT_TESTS, type SpcTest } from '../../calc/spc';

// Lo que se guarda de una carta de control.

export type ChartKind = 'imr' | 'xbarr';

export interface CartasSaved {
  v: 1;
  kind: ChartKind;
  values: number[];
  name: string;
  unit: string;
  /** Tamaño de subgrupo (X-barra R). */
  subgroup: number;
  /** Puntos (o subgrupos) con los que se calculan los límites; null: todos. */
  limitPoints: number | null;
  tests: SpcTest[];
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

export function readCartasSaved(x: unknown): CartasSaved | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  if (o.v !== 1 || (o.kind !== 'imr' && o.kind !== 'xbarr') || !Array.isArray(o.values) || !o.values.every(isNum)) return null;
  const tests = Array.isArray(o.tests) ? (o.tests as unknown[]).filter((n): n is SpcTest => isNum(n) && n >= 1 && n <= 8 && Number.isInteger(n)) : DEFAULT_TESTS;
  return {
    v: 1,
    kind: o.kind,
    values: o.values as number[],
    name: typeof o.name === 'string' ? o.name : '',
    unit: typeof o.unit === 'string' ? o.unit : '',
    subgroup: isNum(o.subgroup) ? Math.round(o.subgroup) : 5,
    limitPoints: isNum(o.limitPoints) && o.limitPoints >= 2 ? Math.round(o.limitPoints) : null,
    tests,
  };
}

/** NIST/SEMATECH e-Handbook 6.3.2.2: caudal de 10 lotes. */
export const FLOW = [49.6, 47.6, 49.9, 51.3, 47.8, 51.2, 52.6, 52.4, 53.6, 52.1];

/** Ejemplo propio: 25 subgrupos de 5 envases (g); desde el 20 la llenadora se desajusta (+4 g). */
export const FILL = [
  499.6, 500.8, 499.6, 499.5, 498.5, 499.7, 501.8, 500.7, 501.7, 500.4, 500.6, 500.3, 497.3, 501.4, 500.8, 500.8, 497.3, 497.2, 498.6, 499.3, 500.5, 499.9, 500.8, 499.0, 500.5,
  500.6, 498.9, 502.7, 500.9, 501.9, 499.0, 498.8, 499.4, 499.8, 501.0, 500.4, 499.3, 498.5, 499.2, 502.0, 498.7, 500.4, 500.7, 497.6, 500.1, 502.1, 496.8, 499.5, 499.8, 498.7,
  500.8, 499.9, 497.7, 501.3, 501.1, 501.5, 502.3, 500.6, 500.2, 497.9, 501.0, 499.0, 499.3, 498.0, 498.5, 499.2, 502.1, 496.7, 497.7, 500.4, 502.3, 500.9, 497.0, 496.0, 500.6,
  498.8, 498.2, 501.6, 501.8, 500.3, 500.4, 500.7, 502.6, 501.0, 500.8, 500.9, 497.5, 502.1, 501.5, 500.8, 496.8, 499.0, 501.3, 497.1, 499.7, 505.6, 501.9, 506.6, 504.9, 503.8,
  504.5, 505.0, 504.2, 505.8, 502.9, 503.3, 505.7, 504.0, 502.6, 505.5, 506.3, 503.3, 501.8, 503.8, 503.8, 503.5, 506.2, 502.4, 506.0, 502.0, 502.7, 505.0, 505.8, 505.4, 504.6,
];
