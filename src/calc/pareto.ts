import type { CalcOutput, CalcWarning } from './types';

// Pareto (docs/fichas/fase-2.md, ficha 2): de mayor a menor, con la parte de
// cada uno y el acumulado; los «pocos vitales» son los que llegan al 80 %.

export interface ParetoRow<K> {
  key: K;
  minutes: number;
  /** Parte del total (0 a 1). */
  share: number;
  /** Acumulado hasta esta fila, incluida (0 a 1). */
  cumulative: number;
}

/** Pareto: de mayor a menor (a igualdad, en el orden dado), sin los ceros, con su parte y su acumulado. */
export function pareto<K>(items: { key: K; minutes: number }[]): ParetoRow<K>[] {
  const list = items.filter((x) => x.minutes > 0).sort((a, b) => b.minutes - a.minutes);
  const total = list.reduce((a, x) => a + x.minutes, 0);
  let acc = 0;
  return list.map((x) => {
    acc += x.minutes;
    return { key: x.key, minutes: x.minutes, share: x.minutes / total, cumulative: acc / total };
  });
}

export interface ParetoInput {
  items: { name: string; value: number }[];
  /** «Otros» va al final aunque sea grande (la costumbre del diagrama). */
  othersLast?: string | null;
}

export interface ParetoToolRow {
  index: number;
  name: string;
  value: number;
  share: number;
  cumulative: number;
  /** Está entre los que suman hasta el 80 % (incluido el que lo cruza). */
  vital: boolean;
}

export interface ParetoResult {
  total: number;
  rows: ParetoToolRow[];
  /** Cuántos son «pocos vitales». */
  vital: number;
}

export function paretoAnalysis(input: ParetoInput): CalcOutput<ParetoResult> {
  const warnings: CalcWarning[] = [];
  input.items.forEach((x, step) => {
    if (x.value < 0) warnings.push({ code: 'step-negative', step });
  });
  if (warnings.length) return { result: null, steps: [], warnings };
  const others = input.othersLast?.trim().toLocaleLowerCase() || null;
  const withValue = input.items.map((x, index) => ({ ...x, index })).filter((x) => x.value > 0);
  if (withValue.length === 0) return { result: null, steps: [], warnings: [{ code: 'no-data' }] };
  const isOthers = (x: { name: string }) => others !== null && x.name.trim().toLocaleLowerCase() === others;
  const main = withValue.filter((x) => !isOthers(x)).sort((a, b) => b.value - a.value || a.index - b.index);
  const sorted = [...main, ...withValue.filter(isOthers)];
  const total = sorted.reduce((a, x) => a + x.value, 0);
  let acc = 0;
  let crossed = false;
  const rows = sorted.map((x) => {
    acc += x.value;
    const vital = !crossed;
    if (acc / total >= 0.8 - 1e-9) crossed = true;
    return { index: x.index, name: x.name, value: x.value, share: x.value / total, cumulative: acc / total, vital };
  });
  if (sorted.length < 3) warnings.push({ code: 'few-categories' });
  if (sorted.length > 12) warnings.push({ code: 'many-categories' });
  const vital = rows.filter((r) => r.vital).length;
  // Sin «pocos vitales»: hacen falta casi todas para llegar al 80 % (no hay principio de Pareto).
  if (sorted.length >= 4 && vital / sorted.length > 0.6) warnings.push({ code: 'flat-pareto' });
  return { result: { total, rows, vital }, steps: [{ key: 'total', value: total }], warnings };
}
