import type { Messages } from '../../i18n';

// Lo que se guarda de una medición de estadística descriptiva.

export interface DescriptivaSaved {
  v: 1;
  /** Datos en el orden en que se escribieron. */
  values: number[];
  /** Qué se mide (vacío: «los datos»). */
  name: string;
  unit: string;
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

export function readDescriptivaSaved(x: unknown): DescriptivaSaved | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  if (o.v !== 1 || !Array.isArray(o.values) || !o.values.every(isNum)) return null;
  return { v: 1, values: o.values as number[], name: typeof o.name === 'string' ? o.name : '', unit: typeof o.unit === 'string' ? o.unit : '' };
}

/** Decimales con que se escribieron los datos (para mostrar los resultados con dos más). */
export function dataDecimals(values: readonly number[]): number {
  let d = 0;
  for (const v of values.slice(0, 500)) {
    const s = String(Number(v.toPrecision(12)));
    const i = s.indexOf('.');
    if (i >= 0 && !s.includes('e')) d = Math.max(d, s.length - i - 1);
  }
  return Math.min(6, d);
}

/** Nombre de lo medido para las frases: «Diámetro del eje» o «Los datos». */
export const measuredName = (name: string, fallback: string) => {
  const n = name.trim() || fallback;
  return n[0]!.toLocaleUpperCase() + n.slice(1);
};

/** « mm» para poner detrás de un número (vacío si no hay unidad). */
export const unitSuffix = (unit: string) => (unit.trim() ? ` ${unit.trim()}` : '');

export const descriptivaName = (t: Messages, s: { name: string }) => measuredName(s.name, t.tools.descriptiva.defaultName);
