import { normalize } from '../reference/glossary';
import { inferDecimal, readNumber, type Cell } from './table';

// De una tabla importada a las filas que pide una herramienta: qué fila son
// los títulos, qué columna es cada dato y qué filas no se pueden usar.

export interface ImportField {
  key: string;
  label: string;
  type: 'text' | 'number';
  /** Sin este dato la fila no sirve. Los textos (nombres) no suelen serlo. */
  required: boolean;
  /** Palabras con las que suele empezar el título de su columna, sin tildes. */
  hints: readonly string[];
  /** Solo admite enteros (unidades): «1.200» es mil doscientos. */
  integer?: boolean;
}

export type ImportedRow = Record<string, string | number>;

export interface Extracted {
  rows: { line: number; values: ImportedRow }[];
  /** Filas descartadas: número de fila de la hoja y la celda que no es un número. */
  skipped: { line: number; field: string; raw: string }[];
  /** Números que pueden llevar separador de miles («1.234»), leídos con decimales. */
  ambiguous: { line: number; raw: string }[];
}

const isNumberish = (c: Cell) => readNumber(c, null) !== null;
const isText = (c: Cell) => c !== null && !isNumberish(c);

/**
 * Fila de títulos: la que va justo antes de la primera fila con números, si
 * solo tiene textos. Null si la tabla empieza directamente con datos.
 */
export function guessHeader(rows: Cell[][]): number | null {
  const first = rows.findIndex((r) => r.some(isNumberish));
  if (first <= 0) return null;
  const prev = rows[first - 1]!;
  return prev.some(isText) && !prev.some(isNumberish) ? first - 1 : null;
}

/** Nombre de cada columna para elegirla: «B · Entran» o, sin títulos, «B · 200». */
export function columnNames(rows: Cell[][], header: number | null): string[] {
  const width = Math.max(0, ...rows.map((r) => r.length));
  const start = header === null ? 0 : header + 1;
  return Array.from({ length: width }, (_, i) => {
    const letter = columnLetter(i);
    const title = header === null ? null : rows[header]?.[i];
    const sample = title ?? rows.slice(start).find((r) => r[i] !== null)?.[i] ?? null;
    return sample === null ? letter : `${letter} · ${String(sample)}`;
  });
}

export function columnLetter(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Columna de cada dato: por su título y, si no lo hay, por el tipo de contenido, en orden. */
export function guessMapping(rows: Cell[][], header: number | null, fields: ImportField[]): Record<string, number | null> {
  const width = Math.max(0, ...rows.map((r) => r.length));
  const data = rows.slice(header === null ? 0 : header + 1);
  const used = new Set<number>();
  const map: Record<string, number | null> = {};
  if (header !== null) {
    for (const f of fields) {
      const col = rows[header]!.findIndex((c, i) => {
        if (used.has(i) || typeof c !== 'string') return false;
        const words = normalize(c).split(/[^a-z0-9%]+/).filter(Boolean);
        return f.hints.some((h) => words.some((w) => (h.length < 3 ? w === h : w.startsWith(h))));
      });
      map[f.key] = col >= 0 ? col : null;
      if (col >= 0) used.add(col);
    }
  }
  const kind = (i: number) => {
    const cells = data.map((r) => r[i] ?? null).filter((c) => c !== null);
    if (!cells.length) return 'empty';
    return cells.filter(isNumberish).length >= cells.length / 2 ? 'number' : 'text';
  };
  for (const f of fields) {
    if (map[f.key] !== undefined && map[f.key] !== null) continue;
    let col: number | null = null;
    for (let i = 0; i < width; i++) {
      if (!used.has(i) && kind(i) === f.type) {
        col = i;
        break;
      }
    }
    map[f.key] = col;
    if (col !== null) used.add(col);
  }
  return map;
}

/** Lee las filas de datos con la columna elegida para cada dato. */
export function extractRows(
  rows: Cell[][],
  header: number | null,
  map: Record<string, number | null>,
  fields: ImportField[],
  /** Separador decimal que delata el archivo, si los números no lo aclaran. */
  hint?: ',' | '.',
): Extracted {
  const start = header === null ? 0 : header + 1;
  const numberCols = fields.filter((f) => f.type === 'number' && map[f.key] !== null).map((f) => map[f.key]!);
  const decimal = inferDecimal(rows.slice(start).flatMap((r) => numberCols.map((c) => r[c] ?? null))) ?? hint ?? null;
  const out: Extracted = { rows: [], skipped: [], ambiguous: [] };
  rows.forEach((r, i) => {
    if (i < start) return;
    const cells = fields.map((f) => (map[f.key] === null ? null : (r[map[f.key]!] ?? null)));
    if (cells.every((c) => c === null)) return;
    const line = i + 1;
    const values: ImportedRow = {};
    let ok = true;
    fields.forEach((f, k) => {
      const c = cells[k]!;
      if (f.type === 'text') {
        if (c !== null) values[f.key] = String(c).trim();
        return;
      }
      let n = readNumber(c, decimal);
      // Un dato entero con «1.200»: el separador es de miles.
      if (n?.ambiguous && f.integer && typeof c === 'string') n = readNumber(c, /,\d{3}$/.test(c.trim()) ? '.' : ',');
      if (n === null) {
        if (f.required && ok) {
          out.skipped.push({ line, field: f.label, raw: c === null ? '' : String(c) });
          ok = false;
        }
        return;
      }
      if (n.ambiguous) out.ambiguous.push({ line, raw: String(c) });
      values[f.key] = n.value;
    });
    if (ok) out.rows.push({ line, values });
  });
  return out;
}
