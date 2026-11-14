import type { CalcOutput, CalcStep, CalcWarning } from './types';

// Takt y cuello de botella, con el balanceo de la línea (docs/fichas/fase-1.md, ficha 3).

export type TimeUnit = 's' | 'min' | 'h';
export const SECONDS: Record<TimeUnit, number> = { s: 1, min: 60, h: 3600 };

/** Pasa un tiempo de una unidad a otra. */
export const convert = (v: number, from: TimeUnit, to: TimeUnit) => (v * SECONDS[from]) / SECONDS[to];

export interface TaktInput {
  /** Tiempo disponible del periodo (turno menos paradas planificadas), en `availableUnit`. */
  available: number;
  availableUnit: TimeUnit;
  /** Demanda del cliente en ese periodo (piezas). */
  demand: number;
  /** Unidad del takt y de los tiempos de ciclo. */
  unit: TimeUnit;
  /** Tiempo de ciclo de cada estación, en `unit` (opcional: puede no haber ninguna). */
  cycles: number[];
}

export interface TaktLine {
  /** Estación con el mayor tiempo de ciclo (la primera, si hay empate). */
  bottleneck: number;
  bottleneckCycle: number;
  /** Piezas que la línea puede hacer en el periodo: tiempo disponible ÷ ciclo del cuello. */
  capacity: number;
  /** Suma de los tiempos de ciclo (contenido de trabajo), en `unit`. */
  work: number;
  /** Suma de ciclos ÷ takt, sin redondear. */
  minStationsRaw: number;
  /** Mínimo teórico de estaciones o personas: lo anterior redondeado hacia arriba. */
  minStations: number;
  /** Eficiencia del balanceo = suma de ciclos ÷ (estaciones × takt). */
  efficiency: number;
  /** Tiempo muerto = 1 − eficiencia. */
  idle: number;
  /** Estaciones por encima del takt. */
  over: number[];
}

export interface TaktResult {
  /** Takt, en `unit`. */
  takt: number;
  /** Tiempo disponible pasado a `unit`. */
  availableInUnit: number;
  line: TaktLine | null;
}

/** Redondeo hacia arriba que no sube 4,0000000001 (error de coma flotante) a 5. */
export const ceil = (x: number) => Math.ceil(x - 1e-9);

export function takt(input: TaktInput): CalcOutput<TaktResult> {
  const warnings: CalcWarning[] = [];
  if (!(input.available > 0)) warnings.push({ code: 'not-positive', field: 'available' });
  if (!(input.demand > 0)) warnings.push({ code: 'not-positive', field: 'demand' });
  input.cycles.forEach((c, step) => {
    if (!(c > 0)) warnings.push({ code: 'step-not-positive', step });
  });
  if (warnings.length) return { result: null, steps: [], warnings };

  const availableInUnit = convert(input.available, input.availableUnit, input.unit);
  const t = availableInUnit / input.demand;
  const steps: CalcStep[] = [{ key: 'takt', value: t }];
  let line: TaktLine | null = null;
  if (input.cycles.length) {
    const max = Math.max(...input.cycles);
    const bottleneck = input.cycles.indexOf(max);
    const work = input.cycles.reduce((a, b) => a + b, 0);
    const efficiency = work / (input.cycles.length * t);
    line = {
      bottleneck,
      bottleneckCycle: max,
      capacity: availableInUnit / max,
      work,
      minStationsRaw: work / t,
      minStations: ceil(work / t),
      efficiency,
      idle: 1 - efficiency,
      over: input.cycles.flatMap((c, i) => (c > t ? [i] : [])),
    };
    if (max > t) warnings.push({ code: 'over-takt' });
    steps.push(
      { key: 'capacity', value: line.capacity },
      { key: 'work', value: work },
      { key: 'minStations', value: line.minStations },
      { key: 'efficiency', value: efficiency },
      { key: 'idle', value: line.idle },
    );
  }
  return { result: { takt: t, availableInUnit, line }, steps, warnings };
}
