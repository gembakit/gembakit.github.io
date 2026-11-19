import type { CalcOutput, CalcStep, CalcWarning } from './types';

// OEE, versión 2 (docs/fichas/oee-v2.md), con las fórmulas de Vorne (oee.com,
// «Calculating OEE»). Tiempos en minutos; ciclo ideal en segundos por unidad.
// - Las paradas no planificadas van una a una, con su categoría y, si lo
//   tienen, su tiempo estándar (la parte que le toca durar).
// - El OEE oficial cuenta siempre todas las paradas. Las «otras vistas»
//   calculan otro porcentaje tratando como planificadas las categorías que se
//   quiten (o solo la parte estándar de las paradas): cambia la
//   disponibilidad; el rendimiento y la calidad, no.

export interface OeeStop {
  minutes: number;
  /** Posición de su categoría en la lista de categorías. */
  category: number;
  /** Tiempo estándar (min), opcional. */
  standard: number | null;
}

export interface OeeInput {
  /** Duración del turno (min). */
  shift: number;
  /** Paradas planificadas, cada una en minutos: no cuentan como pérdida. */
  plannedStops: number[];
  /** Paradas no planificadas. */
  stops: OeeStop[];
  /** Cuántas categorías hay (para repartir los minutos). */
  categories: number;
  /** Tiempo de ciclo ideal (s por unidad). */
  idealCycle: number;
  /** Unidades producidas. */
  total: number;
  /** Unidades rechazadas. */
  rejects: number;
}

export interface OeeResult {
  /** Tiempo planificado = turno − paradas planificadas (min). */
  planned: number;
  /** Tiempo en marcha = planificado − paradas no planificadas (min). */
  run: number;
  good: number;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  /** Reparto del tiempo planificado (min): útil y las tres pérdidas. Suman el tiempo planificado. */
  minutes: { useful: number; downtime: number; speed: number; quality: number };
  /** Minutos de paradas de cada categoría. */
  byCategory: number[];
  /** Parte estándar de las paradas de cada categoría (min): de cada parada con estándar, lo que le tocaba durar. */
  standardByCategory: number[];
  /** Parte estándar de todas las paradas (min). */
  standard: number;
  /** Lo que las paradas con estándar se pasaron de él (min). */
  excess: number;
}

export type OeeLoss = 'downtime' | 'speed' | 'quality';

/** Qué se quita en una de las «otras vistas». */
export interface OeeViewDef {
  /** Categorías que se tratan como planificadas. */
  excluded: number[];
  /** Tratar como planificada la parte estándar de las paradas (de las categorías no quitadas). */
  standard: boolean;
}

export interface OeeView {
  /** Minutos que pasan a planificados. */
  removed: number;
  planned: number;
  availability: number;
  oee: number;
}

export function oee(i: OeeInput): CalcOutput<OeeResult> {
  const warnings: CalcWarning[] = [];
  for (const field of ['shift', 'idealCycle', 'total'] as const) if (!(i[field] > 0)) warnings.push({ code: 'not-positive', field });
  if (i.rejects < 0) warnings.push({ code: 'negative', field: 'rejects' });
  for (const field of ['total', 'rejects'] as const) if (!Number.isInteger(i[field])) warnings.push({ code: 'not-whole', field });
  i.plannedStops.forEach((m, step) => {
    if (!(m > 0)) warnings.push({ code: 'deduction-not-positive', step });
  });
  i.stops.forEach((s, step) => {
    if (!(s.minutes > 0)) warnings.push({ code: 'step-not-positive', step });
    if (s.standard !== null && !(s.standard > 0)) warnings.push({ code: 'standard-not-positive', step });
  });
  if (warnings.length) return { result: null, steps: [], warnings };

  const planned = i.plannedStops.reduce((a, m) => a - m, i.shift);
  const downtime = i.stops.reduce((a, s) => a + s.minutes, 0);
  const run = planned - downtime;
  if (!(planned > 0) || !(run > 0)) return { result: null, steps: [], warnings: [{ code: 'stops-exceed-time' }] };
  if (i.rejects > i.total) return { result: null, steps: [], warnings: [{ code: 'rejects-exceed-total' }] };

  const good = i.total - i.rejects;
  const availability = run / planned;
  const performance = (i.idealCycle * i.total) / (run * 60);
  const quality = good / i.total;
  const value = availability * performance * quality;
  if (performance > 1) warnings.push({ code: 'performance-over-100' });

  const byCategory = Array.from({ length: i.categories }, () => 0);
  const standardByCategory = Array.from({ length: i.categories }, () => 0);
  let excess = 0;
  for (const s of i.stops) {
    byCategory[s.category] = (byCategory[s.category] ?? 0) + s.minutes;
    if (s.standard !== null) {
      standardByCategory[s.category] = (standardByCategory[s.category] ?? 0) + Math.min(s.standard, s.minutes);
      excess += Math.max(0, s.minutes - s.standard);
    }
  }
  const result: OeeResult = {
    planned,
    run,
    good,
    availability,
    performance,
    quality,
    oee: value,
    minutes: {
      useful: (i.idealCycle * good) / 60,
      downtime,
      speed: run - (i.idealCycle * i.total) / 60,
      quality: (i.idealCycle * i.rejects) / 60,
    },
    byCategory,
    standardByCategory,
    standard: standardByCategory.reduce((a, b) => a + b, 0),
    excess,
  };
  const steps: CalcStep[] = [
    { key: 'planned', value: planned },
    { key: 'run', value: run },
    { key: 'availability', value: availability },
    { key: 'performance', value: performance },
    { key: 'quality', value: quality },
    { key: 'oee', value },
  ];
  return { result, steps, warnings };
}

/**
 * Una de las «otras vistas»: el OEE tratando como planificado lo que se quita.
 * El tiempo útil no cambia; el planificado baja: OEE = útil ÷ (planificado − quitado).
 */
export function oeeView(r: OeeResult, v: OeeViewDef): OeeView {
  let removed = 0;
  r.byCategory.forEach((m, c) => {
    if (v.excluded.includes(c)) removed += m;
    else if (v.standard) removed += r.standardByCategory[c] ?? 0;
  });
  const planned = r.planned - removed;
  return { removed, planned, availability: r.run / planned, oee: r.minutes.useful / planned };
}

/** La pérdida que más minutos se lleva. */
export function biggestLoss(r: OeeResult): OeeLoss {
  const m = r.minutes;
  return (['downtime', 'speed', 'quality'] as const).reduce((a, b) => (m[b] > m[a] ? b : a));
}

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

/** Referencia de Nakajima: 90 % × 95 % × 99 % ≈ 85 %. */
export const WORLD_CLASS = { availability: 0.9, performance: 0.95, quality: 0.99 } as const;
export type OeeFactor = keyof typeof WORLD_CLASS;

/** El factor más alejado de su referencia (el de menor porcentaje de ella). */
export function furthestFactor(r: OeeResult): OeeFactor {
  return (['availability', 'performance', 'quality'] as const).reduce((a, b) => (r[b] / WORLD_CLASS[b] < r[a] / WORLD_CLASS[a] ? b : a));
}
