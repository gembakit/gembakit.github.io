import type { NumFormat, SheetDef } from './types';

// Coloca la definición en una cuadrícula de tres columnas:
//   A: etiqueta · B: valor o fórmula · C: unidad o fórmula en palabras.
// Las salidas (hoja de Google, .xlsx) y la prueba que comprueba las fórmulas
// trabajan sobre esta misma cuadrícula.

export type RowKind = 'heading' | 'sub' | 'blank' | 'section' | 'input' | 'result' | 'text';

export interface GridCell {
  text?: string;
  number?: number;
  /** Fórmula ya resuelta (con direcciones de celda), sin «=». */
  formula?: string;
}

export interface GridRow {
  kind: RowKind;
  cells: [GridCell, GridCell, GridCell];
  format?: NumFormat;
  main?: boolean;
}

export interface Grid {
  rows: GridRow[];
  /** Dirección de cada clave: {units: 'B6', …}. */
  address: Record<string, string>;
}

const EMPTY: GridCell = {};

function line(kind: RowKind, text = ''): GridRow {
  return { kind, cells: [text ? { text } : EMPTY, EMPTY, EMPTY] };
}

export class SheetDefError extends Error {}

export function layoutSheet(def: SheetDef): Grid {
  const rows: GridRow[] = [line('heading', def.heading), line('sub', def.subheading), line('blank')];
  const address: Record<string, string> = {};
  const place = (key: string) => {
    if (address[key]) throw new SheetDefError(`Clave repetida en la hoja: ${key}`);
    address[key] = `B${rows.length + 1}`;
  };

  rows.push(line('section', def.sections.inputs));
  for (const i of def.inputs) {
    place(i.key);
    rows.push({ kind: 'input', cells: [{ text: i.label }, { number: i.value }, i.note ? { text: i.note } : EMPTY], format: i.format });
  }
  rows.push(line('blank'), line('section', def.sections.results));
  const pending: { row: GridRow; formula: string }[] = [];
  for (const r of def.results) {
    place(r.key);
    const row: GridRow = { kind: 'result', cells: [{ text: r.label }, EMPTY, r.note ? { text: r.note } : EMPTY], format: r.format, main: r.main };
    pending.push({ row, formula: r.formula });
    rows.push(row);
  }
  // Las fórmulas se resuelven al final: un resultado puede citar a otro.
  for (const { row, formula } of pending) {
    row.cells[1] = {
      formula: formula.replace(/\{(\w+)\}/g, (_, k: string) => {
        const a = address[k];
        if (!a) throw new SheetDefError(`Referencia desconocida en la fórmula: {${k}}`);
        return a;
      }),
    };
  }
  rows.push(line('blank'), line('section', def.sections.reading));
  for (const t of def.reading) rows.push(line('text', t));
  rows.push(line('blank'), line('section', def.sections.notes));
  for (const n of def.notes) rows.push(line('text', n));
  return { rows, address };
}
