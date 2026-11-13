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
  | { code: 'fpy-out-of-range'; step: number };

export interface CalcOutput<T> {
  result: T | null;
  steps: CalcStep[];
  warnings: CalcWarning[];
}
