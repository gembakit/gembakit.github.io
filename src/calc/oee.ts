import type { CalcOutput, CalcStep, CalcWarning } from './types';

// OEE (docs/fichas/fase-1.md, ficha 4), con las fórmulas de Vorne (oee.com,
// «Calculating OEE»). Tiempos del turno en minutos; tiempo de ciclo ideal en
// segundos por pieza.

export interface OeeInput {
  /** Duración del turno (min). */
  shift: number;
  /** Paradas planificadas: descansos, comidas (min). */
  plannedStops: number;
  /** Paradas no planificadas: averías, cambios… (min). */
  unplannedStops: number;
  /** Tiempo de ciclo ideal (s por pieza). */
  idealCycle: number;
  /** Piezas totales producidas. */
  total: number;
  /** Piezas rechazadas. */
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
}

export type OeeLoss = 'downtime' | 'speed' | 'quality';

export function oee(i: OeeInput): CalcOutput<OeeResult> {
  const warnings: CalcWarning[] = [];
  for (const field of ['shift', 'idealCycle', 'total'] as const) if (!(i[field] > 0)) warnings.push({ code: 'not-positive', field });
  for (const field of ['plannedStops', 'unplannedStops', 'rejects'] as const) if (i[field] < 0) warnings.push({ code: 'negative', field });
  for (const field of ['total', 'rejects'] as const) if (!Number.isInteger(i[field])) warnings.push({ code: 'not-whole', field });
  if (warnings.length) return { result: null, steps: [], warnings };

  const planned = i.shift - i.plannedStops;
  const run = planned - i.unplannedStops;
  if (!(planned > 0) || !(run > 0)) return { result: null, steps: [], warnings: [{ code: 'stops-exceed-time' }] };
  if (i.rejects > i.total) return { result: null, steps: [], warnings: [{ code: 'rejects-exceed-total' }] };

  const good = i.total - i.rejects;
  const availability = run / planned;
  const performance = (i.idealCycle * i.total) / (run * 60);
  const quality = good / i.total;
  const value = availability * performance * quality;
  if (performance > 1) warnings.push({ code: 'performance-over-100' });
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
      downtime: i.unplannedStops,
      speed: run - (i.idealCycle * i.total) / 60,
      quality: (i.idealCycle * i.rejects) / 60,
    },
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

/** La pérdida que más minutos se lleva. */
export function biggestLoss(r: OeeResult): OeeLoss {
  const m = r.minutes;
  return (['downtime', 'speed', 'quality'] as const).reduce((a, b) => (m[b] > m[a] ? b : a));
}
