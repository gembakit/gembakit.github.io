import { strFromU8, unzipSync } from 'fflate';
import { trim, type Cell, type RawSheet } from './table';

// Lectura de archivos .xlsx (Excel, y los que descarga Google Sheets): solo
// los valores de las celdas, sin estilos. Un .xlsx es un .zip con XML dentro:
// fflate lo descomprime y el navegador lee el XML. Las fórmulas llegan con el
// último valor que guardó la hoja.

export class XlsxError extends Error {}

/** Elementos por su nombre local, sin depender del prefijo del espacio de nombres. */
function els(node: Document | Element, name: string): Element[] {
  return Array.from(node.getElementsByTagNameNS('*', name));
}

function xml(files: Record<string, Uint8Array>, path: string): Document | null {
  const data = files[path];
  if (!data) return null;
  const doc = new DOMParser().parseFromString(strFromU8(data), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new XlsxError(`XML no válido en ${path}`);
  return doc;
}

/** «AB12» → índice de columna desde 0 (AB → 27). */
function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? '';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Texto de un elemento con texto enriquecido, sin las guías fonéticas (rPh). */
function richText(el: Element): string {
  return els(el, 't')
    .filter((t) => t.parentElement?.localName !== 'rPh')
    .map((t) => t.textContent ?? '')
    .join('');
}

export function readXlsx(data: Uint8Array): RawSheet[] {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data);
  } catch {
    throw new XlsxError('No es un archivo .xlsx');
  }
  const workbook = xml(files, 'xl/workbook.xml');
  if (!workbook) throw new XlsxError('No es un archivo .xlsx');

  const targets = new Map<string, string>();
  for (const rel of els(xml(files, 'xl/_rels/workbook.xml.rels') ?? workbook, 'Relationship')) {
    const target = rel.getAttribute('Target') ?? '';
    targets.set(rel.getAttribute('Id') ?? '', target.startsWith('/') ? target.slice(1) : `xl/${target}`);
  }

  const shared = els(xml(files, 'xl/sharedStrings.xml') ?? workbook, 'si').map(richText);

  const sheets: RawSheet[] = [];
  for (const sheet of els(workbook, 'sheet')) {
    if (sheet.getAttribute('state') === 'hidden' || sheet.getAttribute('state') === 'veryHidden') continue;
    const relId = Array.from(sheet.attributes).find((a) => a.localName === 'id')?.value ?? '';
    const path = targets.get(relId);
    const doc = path ? xml(files, path) : null;
    if (!doc) continue;
    const rows: Cell[][] = [];
    let nextRow = 0;
    for (const row of els(doc, 'row')) {
      const r = Number(row.getAttribute('r') ?? nextRow + 1) - 1;
      nextRow = r + 1;
      const cells: Cell[] = [];
      let nextCol = 0;
      for (const c of els(row, 'c')) {
        const ref = c.getAttribute('r');
        const col = ref ? columnIndex(ref) : nextCol;
        nextCol = col + 1;
        const type = c.getAttribute('t') ?? 'n';
        const v = els(c, 'v')[0]?.textContent ?? null;
        let value: Cell = null;
        if (type === 's') value = v === null ? null : (shared[Number(v)] ?? null);
        else if (type === 'inlineStr') value = els(c, 'is')[0] ? richText(els(c, 'is')[0]!) : null;
        else if (type === 'b') value = v === '1' ? 'TRUE' : v === '0' ? 'FALSE' : null;
        else if (type === 'str' || type === 'e' || type === 'd') value = v;
        else value = v === null || v === '' ? null : Number(v);
        if (typeof value === 'string' && value.trim() === '') value = null;
        while (cells.length < col) cells.push(null);
        cells[col] = typeof value === 'number' && !Number.isFinite(value) ? null : value;
      }
      while (rows.length < r) rows.push([]);
      rows[r] = cells;
    }
    sheets.push({ name: sheet.getAttribute('name') ?? `${sheets.length + 1}`, rows: trim(rows) });
  }
  if (!sheets.length) throw new XlsxError('El archivo no tiene hojas visibles');
  return sheets;
}
