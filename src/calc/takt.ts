import type { CalcOutput, CalcWarning } from './types';

// Takt y cuello de botella, versión 2 (docs/fichas/takt-v2.md), con los
// cambios del 2026-11-21 (cada estación con su unidad):
// - tiempo disponible = (turno − descuentos planificados) × turnos;
// - cada estación se mide en tiempo por unidad (ciclo) o en unidades por
//   tiempo (velocidad), en su unidad, y puede contar otra cosa que la demanda
//   (paquetes de 12 botellas); por dentro todo se pasa a segundos por unidad
//   de la demanda;
// - cada estación tiene su velocidad estándar (la de diseño) y medidas reales;
// - el balanceo, solo si se pide (si el trabajo se puede repartir entre
//   estaciones);
// - con el OEE habitual: producción esperada, OEE mínimo para cumplir y la
//   capacidad instalada requerida (takt × OEE en ciclo; ritmo ÷ OEE en
//   velocidad).

export type TimeUnit = 's' | 'min' | 'h';
export const TIME_UNITS: TimeUnit[] = ['s', 'min', 'h'];
export const SECONDS: Record<TimeUnit, number> = { s: 1, min: 60, h: 3600 };

/** Pasa un tiempo de una unidad a otra. */
export const convert = (v: number, from: TimeUnit, to: TimeUnit) => (v * SECONDS[from]) / SECONDS[to];

/** Cómo se mide: tiempo por unidad (ciclo) o unidades por tiempo (velocidad). */
export type Measure = 'time' | 'rate';
/** Con qué valor de cada estación se calcula. */
export type Basis = 'mean' | 'repeatable' | 'theoretical';

/** Segundos por unidad de un valor medido en `measure` y `unit`. */
export const toCycle = (v: number, measure: Measure, unit: TimeUnit) => (measure === 'time' ? v * SECONDS[unit] : SECONDS[unit] / v);
/** De segundos por unidad a la forma y unidad pedidas. */
export const fromCycle = (sec: number, measure: Measure, unit: TimeUnit) => (measure === 'time' ? sec / SECONDS[unit] : SECONDS[unit] / sec);

/** Una unidad completa de ritmo: «min por unidad» o «unidades por hora». */
export interface Pace {
  measure: Measure;
  unit: TimeUnit;
}
export const PACES: Pace[] = [
  { measure: 'time', unit: 's' },
  { measure: 'time', unit: 'min' },
  { measure: 'time', unit: 'h' },
  { measure: 'rate', unit: 's' },
  { measure: 'rate', unit: 'min' },
  { measure: 'rate', unit: 'h' },
];
/** Clave de texto de una unidad («time-s», «rate-h»), para los desplegables. */
export const paceKey = (p: Pace) => `${p.measure}-${p.unit}`;
export const paceOf = (key: string): Pace => PACES.find((p) => paceKey(p) === key) ?? PACES[0]!;

/** El mismo ritmo en otra unidad: 10 unidades/h son 6 min/unidad (nunca 10 h/unidad). */
export const convertPace = (v: number, from: Pace, to: Pace) => fromCycle(toCycle(v, from.measure, from.unit), to.measure, to.unit);

export interface Deduction {
  value: number;
  unit: TimeUnit;
}

export interface StationInput {
  /** Cómo se mide esta estación y en qué unidad de tiempo. */
  measure: Measure;
  unit: TimeUnit;
  /**
   * Cuántas unidades de la demanda hay en una unidad de esta estación: 12 si
   * cuenta paquetes de 12 botellas; 1 si cuenta lo mismo que la demanda.
   */
  per: number;
  /** Velocidad estándar (la de diseño), en la medida y unidad de la estación; null si no se sabe. */
  theoretical: number | null;
  /** Medidas tomadas en planta, en la medida y unidad de la estación. */
  actual: number[];
  /**
   * Forma en que se tomaron las medidas (por defecto, `measure`). La media se
   * saca siempre en esa forma: la media de cuatro velocidades no es la de sus
   * cuatro tiempos, y cambiar de unidad no debe mover el resultado.
   */
  origin?: Measure;
}

export interface TaktInput {
  shift: number;
  shiftUnit: TimeUnit;
  /** Lo planificado que se quita del turno (reuniones, limpiezas, descansos si la línea para). */
  deductions: Deduction[];
  /** Turnos en el periodo de la demanda. */
  shifts: number;
  demand: number;
  /** Calcular el balanceo (si el trabajo se puede repartir entre estaciones). */
  balance: boolean;
  basis: Basis;
  stations: StationInput[];
  /** OEE esperado de la línea (0 a 1), opcional. */
  oee: number | null;
}

/** Estadística de las medidas de una estación, en su medida y unidad. */
export interface StationStats {
  n: number;
  mean: number;
  min: number;
  max: number;
  /**
   * Mejor valor alcanzado al menos dos veces: el segundo mejor (en tiempos,
   * el segundo menor; en velocidades, el segundo mayor). Con menos de dos
   * medidas, null.
   */
  repeatable: number | null;
  /** (máx − mín) ÷ media; null con menos de dos medidas. */
  spread: number | null;
}

export interface StationResult {
  stats: StationStats | null;
  /** De dónde sale el valor con el que se calcula. */
  source: Basis;
  /** El valor usado, en la medida y unidad de la estación. */
  value: number;
  /** El valor usado, en segundos por unidad de la demanda. */
  cycle: number;
  /** Estándar en segundos por unidad de la demanda. */
  theoreticalCycle: number | null;
  /** Media real frente al teórico, como fracción de su velocidad (0,93 = va al 93 %). */
  ofTheoretical: number | null;
}

export interface Balance {
  /** Suma de los ciclos (contenido de trabajo), en segundos. */
  work: number;
  minStationsRaw: number;
  minStations: number;
  efficiency: number;
  idle: number;
}

export interface LineResult {
  /** Estación más lenta (la primera, si hay empate). */
  bottleneck: number;
  bottleneckCycle: number;
  /** Unidades que la línea puede sacar en el periodo, al ritmo de la más lenta. */
  capacity: number;
  /** Estaciones más lentas que el takt. */
  over: number[];
  /** Solo si se pide. */
  balance: Balance | null;
}

export interface OeeResult {
  oee: number;
  /** Estación más lenta según su teórico (la que marca la producción esperada). */
  reference: number;
  theoreticalCycle: number;
  /** Unidades esperadas en el periodo: tiempo disponible × OEE ÷ ciclo teórico. */
  expected: number;
  /** OEE que hace falta para cumplir la demanda: ciclo teórico ÷ takt. */
  minOee: number;
  /**
   * Capacidad instalada requerida: takt × OEE, en segundos por unidad (en velocidad: ritmo ÷ OEE).
   * La velocidad estándar que tiene que tener la línea para que, con su OEE, salga la demanda.
   */
  targetCycle: number;
  meets: boolean;
}

export interface TaktResult {
  /** Turno menos descuentos, en segundos. */
  perShift: number;
  /** Tiempo disponible del periodo, en segundos. */
  available: number;
  /** Segundos por unidad. */
  takt: number;
  stations: StationResult[];
  line: LineResult | null;
  oee: OeeResult | null;
}

/** Redondeo hacia arriba que no sube 4,0000000001 (error de coma flotante) a 5. */
export const ceil = (x: number) => Math.ceil(x - 1e-9);

/** Variación (máx − mín sobre la media) a partir de la cual se avisa de que la estación es inestable. */
export const UNSTABLE = 0.1;

/**
 * Estadística de las medidas de una estación, en su medida. Si se tomaron en
 * la otra forma (`origin`), la media y la variación se sacan en esa y se
 * devuelven pasadas: el tiempo por unidad es 1 ÷ la velocidad en la misma
 * unidad de tiempo, así que basta con invertir.
 */
export function stationStats(values: number[], measure: Measure, origin: Measure = measure): StationStats | null {
  if (values.length === 0) return null;
  const n = values.length;
  const flip = origin !== measure;
  const asTaken = flip ? values.map((v) => 1 / v) : values;
  const meanTaken = asTaken.reduce((a, b) => a + b, 0) / n;
  const mean = flip ? 1 / meanTaken : meanTaken;
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Lo mejor primero: en tiempos, lo menor; en velocidades, lo mayor.
  const best = [...values].sort((a, b) => (measure === 'time' ? a - b : b - a));
  const spread = n >= 2 ? (Math.max(...asTaken) - Math.min(...asTaken)) / meanTaken : null;
  return { n, mean, min, max, repeatable: n >= 2 ? best[1]! : null, spread };
}

function stationResult(s: StationInput, input: TaktInput): StationResult | null {
  const stats = stationStats(s.actual, s.measure, s.origin);
  const pick = (): { source: Basis; value: number } | null => {
    if (input.basis === 'theoretical' && s.theoretical !== null) return { source: 'theoretical', value: s.theoretical };
    if (input.basis === 'repeatable' && stats?.repeatable != null) return { source: 'repeatable', value: stats.repeatable };
    if (stats) return { source: 'mean', value: stats.mean };
    if (s.theoretical !== null) return { source: 'theoretical', value: s.theoretical };
    return null;
  };
  const used = pick();
  if (!used) return null;
  // A segundos por unidad de la demanda: un paquete de 12 cada 6 s es una botella cada 0,5 s.
  const cycleOf = (v: number) => toCycle(v, s.measure, s.unit) / s.per;
  const theoreticalCycle = s.theoretical !== null ? cycleOf(s.theoretical) : null;
  const meanCycle = stats ? cycleOf(stats.mean) : null;
  return {
    stats,
    source: used.source,
    value: used.value,
    cycle: cycleOf(used.value),
    theoreticalCycle,
    ofTheoretical: theoreticalCycle !== null && meanCycle !== null ? theoreticalCycle / meanCycle : null,
  };
}

export function takt(input: TaktInput): CalcOutput<TaktResult> {
  const warnings: CalcWarning[] = [];
  if (!(input.shift > 0)) warnings.push({ code: 'not-positive', field: 'shift' });
  if (!(input.shifts > 0)) warnings.push({ code: 'not-positive', field: 'shifts' });
  if (!(input.demand > 0)) warnings.push({ code: 'not-positive', field: 'demand' });
  input.deductions.forEach((d, step) => {
    if (!(d.value > 0)) warnings.push({ code: 'deduction-not-positive', step });
  });
  input.stations.forEach((s, step) => {
    if (!(s.per > 0)) warnings.push({ code: 'per-not-positive', step });
    else if ((s.theoretical !== null && !(s.theoretical > 0)) || s.actual.some((v) => !(v > 0))) warnings.push({ code: 'step-not-positive', step });
    else if (s.theoretical === null && s.actual.length === 0) warnings.push({ code: 'station-empty', step });
  });
  if (warnings.length) return { result: null, steps: [], warnings };
  // Un OEE fuera de rango no tumba el resto del cálculo: se avisa y no se usa.
  const oeeOk = input.oee !== null && input.oee > 0 && input.oee <= 1;
  if (input.oee !== null && !oeeOk) warnings.push({ code: 'oee-range' });

  const shift = input.shift * SECONDS[input.shiftUnit];
  const perShift = input.deductions.reduce((a, d) => a - d.value * SECONDS[d.unit], shift);
  if (!(perShift > 0)) return { result: null, steps: [], warnings: [{ code: 'no-time' }] };
  const available = perShift * input.shifts;
  const t = available / input.demand;

  const stations = input.stations.map((s) => stationResult(s, input)!);
  let line: LineResult | null = null;
  let oee: OeeResult | null = null;
  if (stations.length) {
    const cycles = stations.map((s) => s.cycle);
    const max = Math.max(...cycles);
    const work = cycles.reduce((a, b) => a + b, 0);
    const efficiency = work / (cycles.length * t);
    line = {
      bottleneck: cycles.indexOf(max),
      bottleneckCycle: max,
      capacity: available / max,
      over: cycles.flatMap((c, i) => (c > t * (1 + 1e-12) ? [i] : [])),
      balance: input.balance ? { work, minStationsRaw: work / t, minStations: ceil(work / t), efficiency, idle: 1 - efficiency } : null,
    };
    if (line.over.length) warnings.push({ code: 'over-takt' });
    stations.forEach((s, step) => {
      if (s.stats?.spread != null && s.stats.spread > UNSTABLE) warnings.push({ code: 'unstable', step });
      if (s.source !== input.basis) warnings.push({ code: 'basis-fallback', step });
    });

    if (oeeOk) {
      // La que marca la producción esperada es la más lenta según su teórico.
      const withTheo = stations.flatMap((s, i) => (s.theoreticalCycle !== null ? [{ i, c: s.theoreticalCycle }] : []));
      if (withTheo.length === 0) warnings.push({ code: 'oee-no-theoretical' });
      else {
        const ref = withTheo.reduce((a, b) => (b.c > a.c ? b : a));
        const o = input.oee!;
        const expected = (available * o) / ref.c;
        oee = { oee: o, reference: ref.i, theoreticalCycle: ref.c, expected, minOee: ref.c / t, targetCycle: t * o, meets: expected >= input.demand * (1 - 1e-12) };
        if (withTheo.length < stations.length) warnings.push({ code: 'oee-partial' });
      }
    }
  } else if (oeeOk) warnings.push({ code: 'oee-no-theoretical' });

  return { result: { perShift, available, takt: t, stations, line, oee }, steps: [], warnings };
}
