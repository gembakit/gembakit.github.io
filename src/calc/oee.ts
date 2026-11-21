import type { CalcOutput, CalcStep, CalcWarning } from './types';

// OEE, versión 2 (docs/fichas/oee-v2.md), con las fórmulas de Vorne (oee.com,
// «Calculating OEE»). Tiempos en minutos; ciclo ideal en segundos por unidad.
// - Las paradas no planificadas van una a una, con su categoría y, si lo
//   tienen, su tiempo estándar (la parte que le toca durar).
// - El OEE oficial cuenta siempre todas las paradas.
// - La torta del turno (versión 3, docs/fichas/oee-v3.md) reparte cada minuto
//   del turno en una sola porción. La utilización de la línea es
//   útil ÷ (turno − porciones desmarcadas); con las planificadas desmarcadas
//   es el OEE oficial.

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
  /** Duración del turno (min). */
  shift: number;
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
  /** Exceso sobre el estándar de cada categoría (min). */
  excessByCategory: number[];
  /** La torta del turno: cada minuto en una sola porción; suman el turno. */
  slices: OeeSlice[];
}

export type OeeLoss = 'downtime' | 'speed' | 'quality';

/**
 * Familias de porciones de la torta:
 * - useful: tiempo útil (no se puede desmarcar);
 * - planned: una parada planificada (`index` = su posición);
 * - stops: paradas no planificadas de una categoría, sin su parte estándar
 *   (incluye el exceso sobre el estándar); `index` = la categoría;
 * - standard: parte estándar de las paradas de una categoría;
 * - speed y quality: las pérdidas por velocidad y por calidad.
 */
export type OeeSliceKind = 'useful' | 'planned' | 'stops' | 'standard' | 'speed' | 'quality';

export interface OeeSlice {
  /** Clave estable: «useful», «p0», «c1», «s1», «speed», «quality». */
  key: string;
  kind: OeeSliceKind;
  index: number;
  minutes: number;
  /** En «stops»: cuántos de sus minutos son exceso sobre el estándar. */
  excess: number;
}

export interface OeeUtilization {
  /** Minutos desmarcados. */
  removed: number;
  /** Turno − desmarcado (min). */
  base: number;
  /** Tiempo útil ÷ base. */
  value: number;
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
  const excessByCategory = Array.from({ length: i.categories }, () => 0);
  for (const s of i.stops) {
    byCategory[s.category] = (byCategory[s.category] ?? 0) + s.minutes;
    if (s.standard !== null) {
      standardByCategory[s.category] = (standardByCategory[s.category] ?? 0) + Math.min(s.standard, s.minutes);
      excessByCategory[s.category] = (excessByCategory[s.category] ?? 0) + Math.max(0, s.minutes - s.standard);
    }
  }
  const useful = (i.idealCycle * good) / 60;
  const speed = run - (i.idealCycle * i.total) / 60;
  const qualityLoss = (i.idealCycle * i.rejects) / 60;
  const slices: OeeSlice[] = [{ key: 'useful', kind: 'useful', index: 0, minutes: useful, excess: 0 }];
  i.plannedStops.forEach((m, k) => slices.push({ key: `p${k}`, kind: 'planned', index: k, minutes: m, excess: 0 }));
  byCategory.forEach((m, c) => {
    const std = standardByCategory[c] ?? 0;
    if (m - std > 0) slices.push({ key: `c${c}`, kind: 'stops', index: c, minutes: m - std, excess: excessByCategory[c] ?? 0 });
    if (std > 0) slices.push({ key: `s${c}`, kind: 'standard', index: c, minutes: std, excess: 0 });
  });
  // Con el rendimiento por encima del 100 % (ya avisado) no hay pérdida por velocidad que enseñar.
  if (speed > 0) slices.push({ key: 'speed', kind: 'speed', index: 0, minutes: speed, excess: 0 });
  if (qualityLoss > 0) slices.push({ key: 'quality', kind: 'quality', index: 0, minutes: qualityLoss, excess: 0 });
  const result: OeeResult = {
    shift: i.shift,
    planned,
    run,
    good,
    availability,
    performance,
    quality,
    oee: value,
    minutes: { useful, downtime, speed, quality: qualityLoss },
    byCategory,
    standardByCategory,
    standard: standardByCategory.reduce((a, b) => a + b, 0),
    excess: excessByCategory.reduce((a, b) => a + b, 0),
    excessByCategory,
    slices,
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
 * Utilización de la línea con las porciones `off` desmarcadas:
 * útil ÷ (turno − desmarcado). El tiempo útil no se puede desmarcar.
 */
export function utilization(r: OeeResult, off: readonly string[]): OeeUtilization {
  const removed = r.slices.reduce((a, x) => (x.kind !== 'useful' && off.includes(x.key) ? a + x.minutes : a), 0);
  const base = r.shift - removed;
  return { removed, base, value: r.minutes.useful / base };
}

/** Las claves de las paradas planificadas: desmarcarlas da el OEE oficial. */
export const plannedKeys = (r: OeeResult) => r.slices.filter((x) => x.kind === 'planned').map((x) => x.key);

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
