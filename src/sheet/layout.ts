import type { NumFormat, ReadingLine, SheetDef } from './types';

// Coloca la definición en una cuadrícula de cinco columnas:
//   A: margen · B: etiqueta · C: valor o fórmula · D y E: unidad o fórmula en palabras.
// Las tablas usan B para el nombre de cada fila y C, D y E para sus números.
// Las salidas (hoja de Google, .xlsx) y la prueba que comprueba las fórmulas
// trabajan sobre esta misma cuadrícula.

export const COLUMNS = 'ABCDE';
/** Columnas de números de una tabla. */
const TABLE_COLUMNS = 'CDE';

export type RowKind = 'title' | 'sub' | 'gap' | 'info' | 'kpi' | 'hint' | 'section' | 'heads' | 'input' | 'result' | 'theads' | 'trow' | 'reading' | 'note';

export interface GridCell {
  text?: string;
  number?: number;
  /** Fórmula ya resuelta (con direcciones de celda), sin «=». */
  formula?: string;
  /** Caracteres iniciales en negrita (prefijo de «Cómo leerlo»). */
  boldPrefix?: number;
  /** Formato propio de la celda (celdas de tabla). */
  format?: NumFormat;
  /** Dato que el usuario puede cambiar (celdas de tabla). */
  input?: boolean;
}

export type Cells = [GridCell, GridCell, GridCell, GridCell, GridCell];

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
  /** Dirección de cada clave: {units: 'C8', fpy[]: 'E12:E14', …}. */
  address: Record<string, string>;
  /** Rango en el que se resalta el valor más bajo. */
  highlightMin?: string;
  /** Rango en el que se resalta el valor más alto. */
  highlightMax?: string;
}

const E: GridCell = {};
const empty = (): Cells => [E, E, E, E, E];

/** Fila con un texto en la columna B que ocupará el ancho de B a E. */
function wide(kind: RowKind, text: string, extra: Partial<GridRow> = {}, boldPrefix?: number): GridRow {
  return { kind, cells: [E, { text, boldPrefix }, E, E, E], ...extra };
}

export class SheetDefError extends Error {}

export function layoutSheet(def: SheetDef): Grid {
  const T = def.texts;
  const rows: GridRow[] = [];
  const address: Record<string, string> = {};
  const pending: { cell: GridCell; formula: string; row?: Record<string, string> }[] = [];
  const setAddress = (key: string, a: string) => {
    if (address[key]) throw new SheetDefError(`Clave repetida en la hoja: ${key}`);
    address[key] = a;
  };
  const place = (key: string) => setAddress(key, `C${rows.length + 1}`);
  const gap = () => rows.push({ kind: 'gap', cells: empty() });
  let highlightMin: string | undefined;
  let highlightMax: string | undefined;

  rows.push(wide('title', def.heading), wide('sub', def.subheading));
  gap();

  // Medición guardada: de qué proyecto es, cuándo, su contexto y su nota (el valor ocupa de C a E).
  if (def.info) {
    rows.push(wide('section', def.info.title));
    def.info.rows.forEach((r, n) => rows.push({ kind: 'info', cells: [E, { text: r.label }, { text: r.value }, E, E], alt: n % 2 === 1 }));
    gap();
  }

  for (const sec of def.textSections ?? []) {
    rows.push(wide('section', sec.title));
    sec.rows.forEach((r, n) => rows.push({ kind: 'info', cells: [E, { text: r.label }, { text: r.value }, E, E], alt: n % 2 === 1 }));
    gap();
  }

  // Resumen: el resultado principal primero, después los demás marcados.
  const summary = [...def.results.filter((r) => r.main), ...def.results.filter((r) => r.summary && !r.main)];
  if (summary.length) {
    rows.push(wide('section', T.summary));
    for (const r of summary) {
      const value: GridCell = {};
      pending.push({ cell: value, formula: `{${r.key}}` });
      rows.push({ kind: 'kpi', cells: [E, { text: r.label }, value, E, E], format: r.format, main: r.main });
    }
    gap();
  }

  // Sin datos ni tabla (un documento), no hay sección de datos.
  const hasData = def.inputs.length > 0 || !!def.table;
  if (hasData) rows.push(wide('section', T.inputs));
  if (def.inputs.length) {
    rows.push({ kind: 'heads', cells: [E, { text: T.inputHeads[0] }, { text: T.inputHeads[1] }, { text: T.inputHeads[2] }, E] });
    def.inputs.forEach((i, n) => {
      place(i.key);
      rows.push({ kind: 'input', cells: [E, { text: i.label }, { number: i.value }, i.note ? { text: i.note } : E, E], format: i.format, alt: n % 2 === 1 });
    });
  }

  const table = def.table;
  if (table) {
    if (table.columns.length > TABLE_COLUMNS.length) throw new SheetDefError(`Una tabla admite ${TABLE_COLUMNS.length} columnas`);
    if (def.inputs.length) gap();
    const heads = empty();
    heads[1] = { text: table.labelHead };
    table.columns.forEach((c, i) => (heads[i + 2] = { text: c.head }));
    rows.push({ kind: 'theads', cells: heads });
    const first = rows.length + 1;
    const last = first + table.rows.length - 1;
    setAddress('label[]', `B${first}:B${last}`);
    table.columns.forEach((c, i) => {
      setAddress(`${c.key}[]`, `${TABLE_COLUMNS[i]}${first}:${TABLE_COLUMNS[i]}${last}`);
      // Celda n de la columna ({valor[1]}, {valor[20]}), para acumulados y límites con los primeros puntos.
      table.rows.forEach((_, n) => (address[`${c.key}[${n + 1}]`] = `${TABLE_COLUMNS[i]}${first + n}`));
    });
    if (table.highlightMin) highlightMin = address[`${table.highlightMin}[]`];
    if (table.highlightMax) highlightMax = address[`${table.highlightMax}[]`];
    table.rows.forEach((tr, n) => {
      const r = rows.length + 1;
      const own: Record<string, string> = {};
      table.columns.forEach((c, i) => (own[c.key] = `${TABLE_COLUMNS[i]}${r}`));
      // La fila anterior: {^clave} (rango móvil).
      if (n > 0) table.columns.forEach((c, i) => (own[`^${c.key}`] = `${TABLE_COLUMNS[i]}${r - 1}`));
      const cells = empty();
      cells[1] = { text: tr.label };
      table.columns.forEach((c, i) => {
        if (c.formula) {
          const cell: GridCell = { format: c.format };
          const formula = n === 0 && c.formulaFirst !== undefined ? c.formulaFirst : c.formula;
          if (formula === '') cells[i + 2] = { text: '' };
          else {
            pending.push({ cell, formula, row: own });
            cells[i + 2] = cell;
          }
        } else {
          const v = tr.values[c.key];
          if (v === undefined) throw new SheetDefError(`Falta el dato ${c.key} en la fila «${tr.label}»`);
          cells[i + 2] = { number: v, format: c.format, input: true };
        }
      });
      rows.push({ kind: 'trow', cells, alt: n % 2 === 1 });
    });
  }
  if (hasData) {
    rows.push(wide('hint', T.editHint));
    gap();
  }

  if (def.results.length) rows.push(wide('section', T.results), { kind: 'heads', cells: [E, { text: T.resultHeads[0] }, { text: T.resultHeads[1] }, { text: T.resultHeads[2] }, E] });
  def.results.forEach((r, n) => {
    place(r.key);
    const value: GridCell = {};
    pending.push({ cell: value, formula: r.formula });
    rows.push({ kind: 'result', cells: [E, { text: r.label }, value, r.note ? { text: r.note } : E, E], format: r.format, main: r.main, alt: n % 2 === 1 });
  });
  if (def.results.length) gap();

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
  for (const { cell, formula, row } of pending) {
    cell.formula = formula.replace(/\{([.^]?)(\w+(?:\[\d*\])?)\}/g, (_, dot: string, k: string) => {
      const a = dot === '.' ? row?.[k] : dot === '^' ? row?.[`^${k}`] : address[k];
      if (!a) throw new SheetDefError(`Referencia desconocida en la fórmula: {${dot}${k}}`);
      return a;
    });
  }
  return { rows, address, highlightMin, highlightMax };
}
