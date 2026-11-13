import type { NumFormat, ReadingLine, SheetDef } from './types';

// Coloca la definición en una cuadrícula de cuatro columnas:
//   A: margen · B: etiqueta · C: valor o fórmula · D: unidad o fórmula en palabras.
// Las salidas (hoja de Google, .xlsx) y la prueba que comprueba las fórmulas
// trabajan sobre esta misma cuadrícula.

export const COLUMNS = 'ABCD';

export type RowKind = 'title' | 'sub' | 'gap' | 'kpi' | 'hint' | 'section' | 'heads' | 'input' | 'result' | 'reading' | 'note';

export interface GridCell {
  text?: string;
  number?: number;
  /** Fórmula ya resuelta (con direcciones de celda), sin «=». */
  formula?: string;
  /** Caracteres iniciales en negrita (prefijo de «Cómo leerlo»). */
  boldPrefix?: number;
}

export type Cells = [GridCell, GridCell, GridCell, GridCell];

export interface GridRow {
  kind: RowKind;
  cells: Cells;
  format?: NumFormat;
  main?: boolean;
  /** Filas alternas de una tabla (la segunda, la cuarta…). */
  alt?: boolean;
  tone?: ReadingLine['tone'];
}

export interface Grid {
  rows: GridRow[];
  /** Dirección de cada clave: {units: 'C8', …}. */
  address: Record<string, string>;
}

const E: GridCell = {};

/** Fila con un texto en la columna B que ocupará el ancho de B a D. */
function wide(kind: RowKind, text: string, extra: Partial<GridRow> = {}, boldPrefix?: number): GridRow {
  return { kind, cells: [E, { text, boldPrefix }, E, E], ...extra };
}

export class SheetDefError extends Error {}

export function layoutSheet(def: SheetDef): Grid {
  const T = def.texts;
  const rows: GridRow[] = [];
  const address: Record<string, string> = {};
  const pending: { cell: GridCell; formula: string }[] = [];
  const place = (key: string) => {
    if (address[key]) throw new SheetDefError(`Clave repetida en la hoja: ${key}`);
    address[key] = `C${rows.length + 1}`;
  };
  const gap = () => rows.push({ kind: 'gap', cells: [E, E, E, E] });

  rows.push(wide('title', def.heading), wide('sub', def.subheading));
  gap();

  // Resumen: el resultado principal primero, después los demás marcados.
  const summary = [...def.results.filter((r) => r.main), ...def.results.filter((r) => r.summary && !r.main)];
  if (summary.length) {
    rows.push(wide('section', T.summary));
    for (const r of summary) {
      const value: GridCell = {};
      pending.push({ cell: value, formula: `{${r.key}}` });
      rows.push({ kind: 'kpi', cells: [E, { text: r.label }, value, E], format: r.format, main: r.main });
    }
    gap();
  }

  rows.push(wide('section', T.inputs), { kind: 'heads', cells: [E, { text: T.inputHeads[0] }, { text: T.inputHeads[1] }, { text: T.inputHeads[2] }] });
  def.inputs.forEach((i, n) => {
    place(i.key);
    rows.push({ kind: 'input', cells: [E, { text: i.label }, { number: i.value }, i.note ? { text: i.note } : E], format: i.format, alt: n % 2 === 1 });
  });
  rows.push(wide('hint', T.editHint));
  gap();

  rows.push(wide('section', T.results), { kind: 'heads', cells: [E, { text: T.resultHeads[0] }, { text: T.resultHeads[1] }, { text: T.resultHeads[2] }] });
  def.results.forEach((r, n) => {
    place(r.key);
    const value: GridCell = {};
    pending.push({ cell: value, formula: r.formula });
    rows.push({ kind: 'result', cells: [E, { text: r.label }, value, r.note ? { text: r.note } : E], format: r.format, main: r.main, alt: n % 2 === 1 });
  });
  gap();

  rows.push(wide('section', T.reading));
  for (const line of def.reading) {
    const prefix = line.tone === 'tip' ? '' : T.prefixes[line.tone];
    // Sin prefijo propio, si la frase ya empieza por una etiqueta («Error típico: …»), esa va en negrita.
    const own = prefix ? 0 : line.text.indexOf(': ') + 1;
    const bold = prefix ? prefix.length : own > 0 && own <= 30 ? own : 0;
    rows.push(wide('reading', prefix + line.text, { tone: line.tone }, bold || undefined));
  }
  gap();

  rows.push(wide('section', T.notes));
  for (const n of def.notes) rows.push(wide('note', n));

  // Las fórmulas se resuelven al final: un resultado puede citar a otro, y el
  // resumen cita resultados que van más abajo.
  for (const { cell, formula } of pending) {
    cell.formula = formula.replace(/\{(\w+)\}/g, (_, k: string) => {
      const a = address[k];
      if (!a) throw new SheetDefError(`Referencia desconocida en la fórmula: {${k}}`);
      return a;
    });
  }
  return { rows, address };
}
