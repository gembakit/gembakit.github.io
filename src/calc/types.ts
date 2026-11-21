// Forma común de toda función de cálculo (CLAUDE.md, arquitectura):
// el resultado, los pasos intermedios y una lista de avisos.
// Los avisos son códigos; el texto vive en los archivos de idioma.

export interface CalcStep {
  key: string;
  value: number;
}

export type CalcWarning =
  | { code: 'no-data' }
  | { code: 'single-value' }
  /** Un dato que debe ser entero no lo es. */
  | { code: 'not-whole'; field: string }
  /** Un dato que debe ser mayor que cero no lo es. */
  | { code: 'not-positive'; field: string }
  /** Un dato que no puede ser negativo lo es. */
  | { code: 'negative'; field: string }
  | { code: 'defects-exceed-opportunities' }
  | { code: 'zero-defects' }
  | { code: 'all-defects' }
  /** Avisos de una fila de una lista (paso, estación…); step empieza en 0. */
  | { code: 'step-not-whole'; step: number }
  | { code: 'step-no-input'; step: number }
  | { code: 'step-negative'; step: number }
  | { code: 'good-exceed-entering'; step: number }
  | { code: 'fpy-out-of-range'; step: number }
  /** Una fila de una lista (estación, año…) debe ser mayor que cero y no lo es. */
  | { code: 'step-not-positive'; step: number }
  /** Takt: la equivalencia de una estación que cuenta otra cosa (1 caja = 24 botellas) no es mayor que cero. */
  | { code: 'per-not-positive'; step: number }
  /** Takt: alguna estación tarda más que el takt (la línea no llega a la demanda). */
  | { code: 'over-takt' }
  /** Takt: un descuento del turno no es mayor que cero. */
  | { code: 'deduction-not-positive'; step: number }
  /** Takt: los descuentos se comen todo el turno. */
  | { code: 'no-time' }
  /** Takt: una estación sin teórico ni medidas. */
  | { code: 'station-empty'; step: number }
  /** Takt: las medidas de una estación varían mucho. */
  | { code: 'unstable'; step: number }
  /** Takt: una estación no tiene el valor pedido (media, repetible o teórico) y se usa otro. */
  | { code: 'basis-fallback'; step: number }
  /** Takt: el OEE esperado no está entre 0 y 100 %. */
  | { code: 'oee-range' }
  /** Takt: hay OEE esperado pero ninguna estación tiene teórico. */
  | { code: 'oee-no-theoretical' }
  /** Takt: hay OEE esperado y solo algunas estaciones tienen teórico. */
  | { code: 'oee-partial' }
  /** OEE: el rendimiento pasa del 100 % (el tiempo de ciclo ideal es más lento que lo real). */
  | { code: 'performance-over-100' }
  /** OEE: las paradas superan el tiempo disponible. */
  | { code: 'stops-exceed-time' }
  /** OEE: más piezas rechazadas que producidas. */
  | { code: 'rejects-exceed-total' }
  /** OEE: el tiempo estándar de una parada no es mayor que cero. */
  | { code: 'standard-not-positive'; step: number }
  /** Kanban: sin margen de seguridad. */
  | { code: 'no-safety' }
  /** ROI: el ahorro neto es cero o negativo; la inversión no se recupera. */
  | { code: 'no-payback' }
  /** ROI: la inversión no se recupera dentro del horizonte. */
  | { code: 'payback-beyond-horizon' };

export interface CalcOutput<T> {
  result: T | null;
  steps: CalcStep[];
  warnings: CalcWarning[];
}
