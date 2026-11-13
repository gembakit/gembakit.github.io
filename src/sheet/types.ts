// Definición única de la hoja de cada herramienta (PLAN.md, 4.2). Cada
// herramienta dice qué datos, qué resultados (como fórmulas), qué lectura y
// qué notas lleva su hoja; los módulos de salida (hoja de Google ahora,
// .xlsx más adelante) la convierten sin que la herramienta sepa cómo.

/** Formato de número de una celda. «auto»: los decimales que pida el valor. */
export type NumFormat = 'integer' | 'decimal2' | 'decimal4' | 'percent' | 'auto';

interface SheetRowBase {
  /** Nombre para referirse a la fila desde las fórmulas: {clave}. */
  key: string;
  label: string;
  /** Texto de la última columna: unidad o fórmula en palabras. */
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
  /** Resultado principal: se destaca en la tabla y encabeza el resumen. */
  main?: boolean;
  /** Aparece también en el resumen de arriba. */
  summary?: boolean;
}

/** Una frase de «Cómo leerlo», con su tono. */
export interface ReadingLine {
  tone: 'conclusion' | 'warning' | 'tip';
  text: string;
}

export interface SheetTexts {
  summary: string;
  inputs: string;
  results: string;
  reading: string;
  notes: string;
  /** Encabezados de columna: [dato, valor, unidad]. */
  inputHeads: [string, string, string];
  /** Encabezados de columna: [resultado, valor, cómo se calcula]. */
  resultHeads: [string, string, string];
  /** Indicación junto a los datos: dónde se pueden cambiar. */
  editHint: string;
  /**
   * Prefijos en negrita de «Cómo leerlo». El error típico no lleva: su frase
   * ya empieza por la etiqueta («Error típico: …»).
   */
  prefixes: Record<Exclude<ReadingLine['tone'], 'tip'>, string>;
}

export interface SheetDef {
  /** Nombre del archivo en Drive. */
  fileTitle: string;
  /** Nombre de la pestaña. */
  tabTitle: string;
  heading: string;
  subheading: string;
  texts: SheetTexts;
  inputs: SheetInput[];
  results: SheetResult[];
  reading: ReadingLine[];
  notes: string[];
}
