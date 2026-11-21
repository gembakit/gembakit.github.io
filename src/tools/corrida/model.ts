// Lo que se guarda de un gráfico de corrida: los datos en orden, qué se mide y su unidad.

export interface CorridaSaved {
  v: 1;
  values: number[];
  name: string;
  unit: string;
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

export function readCorridaSaved(x: unknown): CorridaSaved | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  if (o.v !== 1 || !Array.isArray(o.values) || !o.values.every(isNum)) return null;
  return { v: 1, values: o.values as number[], name: typeof o.name === 'string' ? o.name : '', unit: typeof o.unit === 'string' ? o.unit : '' };
}

/** Ejemplo: 24 cambios de formato (min); desde el 13 se aplicó SMED. */
export const CHANGEOVER_EXAMPLE = [42, 38, 45, 41, 39, 44, 40, 43, 37, 46, 41, 42, 31, 29, 33, 28, 30, 32, 27, 31, 29, 30, 28, 32];
