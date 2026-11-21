import type { CapabilityInput } from '../../calc/capability';

// Lo que se guarda de un estudio de capacidad.

export interface CapacidadSaved {
  v: 1;
  values: number[];
  name: string;
  unit: string;
  lsl: number | null;
  usl: number | null;
  target: number | null;
  /** 1 = datos sueltos. */
  subgroup: number;
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const numOrNull = (x: unknown) => (isNum(x) ? x : null);

export function readCapacidadSaved(x: unknown): CapacidadSaved | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  if (o.v !== 1 || !Array.isArray(o.values) || !o.values.every(isNum)) return null;
  return {
    v: 1,
    values: o.values as number[],
    name: typeof o.name === 'string' ? o.name : '',
    unit: typeof o.unit === 'string' ? o.unit : '',
    lsl: numOrNull(o.lsl),
    usl: numOrNull(o.usl),
    target: numOrNull(o.target),
    subgroup: isNum(o.subgroup) && o.subgroup >= 1 ? Math.round(o.subgroup) : 1,
  };
}

export const toCapabilityInput = (s: CapacidadSaved): CapabilityInput => ({ values: s.values, lsl: s.lsl, usl: s.usl, target: s.target, subgroup: s.subgroup });

/** Ejemplo: los 10 lotes de caudal de NIST (6.3.2.2) con especificación 45 a 57 y objetivo 51. */
export const FLOW_EXAMPLE = { values: [49.6, 47.6, 49.9, 51.3, 47.8, 51.2, 52.6, 52.4, 53.6, 52.1], lsl: 45, usl: 57, target: 51 };

/** Veredicto del Cpk: capaz desde 1,33; justo entre 1 y 1,33; no capaz por debajo de 1. */
export const verdict = (cpk: number): 'good' | 'marginal' | 'bad' => (cpk >= 1.33 ? 'good' : cpk >= 1 ? 'marginal' : 'bad');
