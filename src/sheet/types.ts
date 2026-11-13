// Definición única de la hoja de cada herramienta (PLAN.md, 4.2). Cada
// herramienta dice qué datos, qué resultados (como fórmulas), qué lectura y
// qué notas lleva su hoja; los módulos de salida (hoja de Google ahora,
// .xlsx más adelante) la convierten sin que la herramienta sepa cómo.

/** Formato de número de una celda. */
export type NumFormat = 'integer' | 'decimal2' | 'decimal4' | 'percent' | 'auto';

interface SheetRowBase {
  /** Nombre para referirse a la fila desde las fórmulas: {clave}. */
  key: string;
  label: string;
  /** Texto de la tercera columna: unidad o fórmula en palabras. */
  note?: string;
  format: NumFormat;
}

export interface SheetInput extends SheetRowBase {
  value: number;
}

export interface SheetResult extends SheetRowBase {
  /**
   * Fórmula en sintaxis inglesa de hoja de cálculo (comas, punto decimal,
   * nombres de función en inglés), sin el «=» inicial. Las referencias a
   * otras filas van entre llaves: {units}, {dpo}.
   */
  formula: string;
  /** Resultado principal: se destaca en la hoja. */
  main?: boolean;
}

export interface SheetDef {
  /** Nombre del archivo en Drive. */
  fileTitle: string;
  /** Nombre de la pestaña. */
  tabTitle: string;
  heading: string;
  subheading: string;
  sections: { inputs: string; results: string; reading: string; notes: string };
  inputs: SheetInput[];
  results: SheetResult[];
  /** «Cómo leerlo»: conclusión, avisos y error típico, en frases. */
  reading: string[];
  notes: string[];
}
