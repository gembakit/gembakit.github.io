import type { CalcOutput, CalcWarning } from './types';

// Takt y cuello de botella, versión 2 (docs/fichas/takt-v2.md):
// - tiempo disponible = (turno − descuentos planificados) × turnos;
// - la línea se mide en tiempo por unidad (ciclo) o en unidades por tiempo
//   (velocidad); por dentro todo se pasa a segundos por unidad;
// - cada estación o máquina tiene su teórico (de placa) y medidas reales;
// - el balanceo solo en montaje con puestos (en máquinas en serie el trabajo
//   no se puede repartir);
// - con el OEE esperado: producción esperada y OEE mínimo para cumplir.

export type TimeUnit = 's' | 'min' | 'h';
export const TIME_UNITS: TimeUnit[] = ['s', 'min', 'h'];
export const SECONDS: Record<TimeUnit, number> = { s: 1, min: 60, h: 3600 };

/** Pasa un tiempo de una unidad a otra. */
export const convert = (v: number, from: TimeUnit, to: TimeUnit) => (v * SECONDS[from]) / SECONDS[to];

/** Cómo se mide la línea: tiempo por unidad (ciclo) o unidades por tiempo (velocidad). */
export type Measure = 'time' | 'rate';
/** Montaje con puestos (el trabajo se puede repartir) o máquinas en serie. */
export type LineKind = 'assembly' | 'machines';
/** Con qué valor de cada estación se calcula. */
export type Basis = 'mean' | 'repeatable' | 'theoretical';

/** Segundos por unidad de un valor medido en `measure` y `unit`. */
export const toCycle = (v: number, measure: Measure, unit: TimeUnit) => (measure === 'time' ? v * SECONDS[unit] : SECONDS[unit] / v);
/** De segundos por unidad a la forma y unidad pedidas. */
export const fromCycle = (sec: number, measure: Measure, unit: TimeUnit) => (measure === 'time' ? sec / SECONDS[unit] : SECONDS[unit] / sec);

export interface Deduction {
  value: number;
  unit: TimeUnit;
}

export interface StationInput {
  /** De diseño o de placa, en la medida y unidad de la línea; null si no se sabe. */
  theoretical: number | null;
  /** Medidas tomadas en planta. */
  actual: number[];
}

export interface TaktInput {
  shift: number;
  shiftUnit: TimeUnit;
  /** Lo planificado que se quita del turno (reuniones, limpiezas, descansos si la línea para). */
  deductions: Deduction[];
  /** Turnos en el periodo de la demanda. */
  shifts: number;
  demand: number;
  measure: Measure;
  /** Unidad de los teóricos y de las medidas: s/min/h por unidad, o unidades por s/min/h. */
  measureUnit: TimeUnit;
  kind: LineKind;
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
  /** El valor usado, en la medida y unidad de la línea. */
  value: number;
  /** El valor usado, en segundos por unidad. */
  cycle: number;
  /** Teórico en segundos por unidad. */
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
  /** Solo en montaje con puestos. */
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

export function stationStats(values: number[], measure: Measure): StationStats | null {
  if (values.length === 0) return null;
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Lo mejor primero: en tiempos, lo menor; en velocidades, lo mayor.
  const best = [...values].sort((a, b) => (measure === 'time' ? a - b : b - a));
  return { n, mean, min, max, repeatable: n >= 2 ? best[1]! : null, spread: n >= 2 ? (max - min) / mean : null };
}

function stationResult(s: StationInput, input: TaktInput): StationResult | null {
  const stats = stationStats(s.actual, input.measure);
  const pick = (): { source: Basis; value: number } | null => {
    if (input.basis === 'theoretical' && s.theoretical !== null) return { source: 'theoretical', value: s.theoretical };
    if (input.basis === 'repeatable' && stats?.repeatable != null) return { source: 'repeatable', value: stats.repeatable };
    if (stats) return { source: 'mean', value: stats.mean };
    if (s.theoretical !== null) return { source: 'theoretical', value: s.theoretical };
    return null;
  };
  const used = pick();
  if (!used) return null;
  const theoreticalCycle = s.theoretical !== null ? toCycle(s.theoretical, input.measure, input.measureUnit) : null;
  const meanCycle = stats ? toCycle(stats.mean, input.measure, input.measureUnit) : null;
  return {
    stats,
    source: used.source,
    value: used.value,
    cycle: toCycle(used.value, input.measure, input.measureUnit),
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
    if ((s.theoretical !== null && !(s.theoretical > 0)) || s.actual.some((v) => !(v > 0))) warnings.push({ code: 'step-not-positive', step });
    else if (s.theoretical === null && s.actual.length === 0) warnings.push({ code: 'station-empty', step });
  });
  if (input.oee !== null && !(input.oee > 0 && input.oee <= 1)) warnings.push({ code: 'oee-range' });
  if (warnings.length) return { result: null, steps: [], warnings };

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
      balance: input.kind === 'assembly' ? { work, minStationsRaw: work / t, minStations: ceil(work / t), efficiency, idle: 1 - efficiency } : null,
    };
    if (line.over.length) warnings.push({ code: 'over-takt' });
    stations.forEach((s, step) => {
      if (s.stats?.spread != null && s.stats.spread > UNSTABLE) warnings.push({ code: 'unstable', step });
      if (s.source !== input.basis) warnings.push({ code: 'basis-fallback', step });
    });

    if (input.oee !== null) {
      // La que marca la producción esperada es la más lenta según su teórico.
      const withTheo = stations.flatMap((s, i) => (s.theoreticalCycle !== null ? [{ i, c: s.theoreticalCycle }] : []));
      if (withTheo.length === 0) warnings.push({ code: 'oee-no-theoretical' });
      else {
        const ref = withTheo.reduce((a, b) => (b.c > a.c ? b : a));
        const expected = (available * input.oee) / ref.c;
        oee = { oee: input.oee, reference: ref.i, theoreticalCycle: ref.c, expected, minOee: ref.c / t, meets: expected >= input.demand * (1 - 1e-12) };
        if (withTheo.length < stations.length) warnings.push({ code: 'oee-partial' });
      }
    }
  } else if (input.oee !== null) warnings.push({ code: 'oee-no-theoretical' });

  return { result: { perShift, available, takt: t, stations, line, oee }, steps: [], warnings };
}
