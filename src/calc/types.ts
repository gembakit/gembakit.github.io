// Forma común de toda función de cálculo (CLAUDE.md, arquitectura):
// el resultado, los pasos intermedios y una lista de avisos.
// Los avisos son códigos; el texto vive en los archivos de idioma.

export interface CalcStep {
  key: string;
  value: number;
}

export type CalcWarning = { code: 'no-data' } | { code: 'single-value' };

export interface CalcOutput<T> {
  result: T | null;
  steps: CalcStep[];
  warnings: CalcWarning[];
}
