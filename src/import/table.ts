// Lectura de tablas importadas: .csv o texto pegado desde Excel o Sheets, y
// los números que traen escritos como texto. Los .xlsx se leen en xlsx.ts y
// llegan aquí ya como celdas.

/** Celda leída: número, texto o vacía. */
export type Cell = string | number | null;

export interface RawSheet {
  name: string;
  rows: Cell[][];
  /** Separador decimal que delata el propio archivo (un .csv con «;» viene de una región con coma decimal). */
  decimal?: ',' | '.';
}

/** Un .csv o un pegado como hoja, con la pista del separador decimal si la hay. */
export function delimitedSheet(name: string, text: string): RawSheet {
  const sheet: RawSheet = { name, rows: parseDelimited(text) };
  if (detectDelimiter(text.replace(/^﻿/, '')) === ';') sheet.decimal = ',';
  return sheet;
}

const CANDIDATES = ['\t', ';', ','] as const;

/** Parte una línea respetando las comillas ("a;b" es una sola celda). */
function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"' && cur === '') quoted = true;
    else if (ch === delim) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Separador más probable: el que da el mismo número de columnas (más de una) en todas las líneas. */
export function detectDelimiter(text: string): string {
  const lines = text
    .split(/\r\n|\r|\n/)
    .filter((l) => l.trim() !== '')
    .slice(0, 20);
  let best: string = '\t';
  let bestScore = 0;
  for (const d of CANDIDATES) {
    const counts = lines.map((l) => splitLine(l, d).length);
    const consistent = counts.length > 0 && counts.every((c) => c === counts[0]) && counts[0]! > 1;
    const score = (consistent ? 1000 : 0) + counts.reduce((a, b) => a + b, 0);
    if (counts.some((c) => c > 1) && score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

/** Lee un .csv o un pegado de hoja de cálculo. Las celdas vacías quedan como null. */
export function parseDelimited(text: string): Cell[][] {
  const clean = text.replace(/^﻿/, '');
  const delim = detectDelimiter(clean);
  // Separa las líneas sin romper las celdas entre comillas que llevan saltos de línea.
  const lines: string[] = [];
  let cur = '';
  let quotes = 0;
  for (const part of clean.split(/(\r\n|\r|\n)/)) {
    if (/^(\r\n|\r|\n)$/.test(part)) {
      if (quotes % 2 === 0) {
        lines.push(cur);
        cur = '';
      } else cur += '\n';
      continue;
    }
    cur += part;
    quotes += (part.match(/"/g) ?? []).length;
  }
  if (cur !== '') lines.push(cur);
  const rows = lines.map((l) => splitLine(l, delim).map((c): Cell => (c.trim() === '' ? null : c.trim())));
  return trim(rows);
}

/** Quita las filas vacías del final y las columnas vacías de la derecha. */
export function trim(rows: Cell[][]): Cell[][] {
  const out = rows.map((r) => [...r]);
  while (out.length && out[out.length - 1]!.every((c) => c === null)) out.pop();
  const width = Math.max(0, ...out.map((r) => r.reduce<number>((w, c, i) => (c === null ? w : i + 1), 0)));
  return out.map((r) => {
    const row = r.slice(0, width);
    while (row.length < width) row.push(null);
    return row;
  });
}

// ── Números escritos como texto ──────────────────────────────────────────

/** Quita espacios (también los de separador de miles) y deja el signo normal. */
function clean(s: string): string {
  return s.replace(/[\s  ]/g, '').replace(/−/g, '-');
}

/**
 * Separador decimal del archivo, deducido de los números que no dejan duda:
 * «1.234,5» (los dos separadores: el último es el decimal) o «0,97» (un solo
 * separador sin tres cifras detrás). Null si ninguno lo aclara.
 */
export function inferDecimal(cells: Cell[]): ',' | '.' | null {
  let comma = 0;
  let dot = 0;
  for (const c of cells) {
    if (typeof c !== 'string') continue;
    const s = clean(c).replace(/%$/, '');
    if (!/^[+-]?[\d.,]+$/.test(s)) continue;
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma >= 0 && lastDot >= 0) {
      if (lastComma > lastDot) comma++;
      else dot++;
    } else {
      const sep = lastComma >= 0 ? ',' : lastDot >= 0 ? '.' : null;
      if (!sep || s.split(sep).length !== 2) continue;
      if (s.length - s.indexOf(sep) - 1 !== 3) {
        if (sep === ',') comma++;
        else dot++;
      }
    }
  }
  if (comma === dot) return null;
  return comma > dot ? ',' : '.';
}

export interface ReadNumber {
  /** El valor. «97 %» se lee como 0,97, igual que en una hoja de cálculo. */
  value: number;
  /** Sin separador decimal conocido, «1.234» se lee como 1,234 y se marca para revisarlo. */
  ambiguous: boolean;
}

/** Lee una celda como número. Null si no lo es. */
export function readNumber(cell: Cell, decimal: ',' | '.' | null): ReadNumber | null {
  if (typeof cell === 'number') return Number.isFinite(cell) ? { value: cell, ambiguous: false } : null;
  if (cell === null) return null;
  let s = clean(cell);
  const percent = s.endsWith('%');
  if (percent) s = s.slice(0, -1);
  if (!/^[+-]?(\d[\d.,]*|[.,]\d+)$/.test(s) || /[.,]{2}|[.,]$/.test(s)) return null;
  const commas = s.split(',').length - 1;
  const dots = s.split('.').length - 1;
  let ambiguous = false;
  let dec: ',' | '.' | null;
  if (commas && dots) dec = s.lastIndexOf(',') > s.lastIndexOf('.') ? ',' : '.';
  else if (commas + dots === 0) dec = null;
  else {
    const sep = commas ? ',' : '.';
    const many = commas + dots > 1;
    const three = s.length - s.lastIndexOf(sep) - 1 === 3;
    if (many) dec = null; // «1.234.567»: solo miles
    else if (decimal) dec = sep === decimal || !three ? sep : null;
    else {
      dec = sep;
      ambiguous = three;
    }
  }
  const thousands = dec === ',' ? '.' : dec === '.' ? ',' : null;
  let n = s;
  if (thousands) n = n.split(thousands).join('');
  if (dec === null) n = n.replace(/[.,]/g, '');
  else if (dec === ',') n = n.replace(',', '.');
  if (n.split('.').length > 2) return null;
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return { value: percent ? v / 100 : v, ambiguous };
}
