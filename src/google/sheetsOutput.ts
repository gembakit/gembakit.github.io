import type { Grid, GridRow } from '../sheet/layout';
import type { NumFormat, SheetDef } from '../sheet/types';
import type { Palette } from '../ui/theme/themes';

// Convierte la cuadrícula de una hoja en la petición de creación de la API de
// Google Sheets, con el estilo de la app (PLAN.md, 6.2) en la versión clara
// del tema elegido. La hoja se crea con región en_US para que las fórmulas
// (escritas en inglés, con comas) se lean siempre igual; después se cambia a
// la región del usuario y Google las muestra en su idioma. Ver ESTADO.md.

interface Color {
  red: number;
  green: number;
  blue: number;
}

function color(hex: string): Color {
  const n = parseInt(hex.replace('#', ''), 16);
  return { red: ((n >> 16) & 255) / 255, green: ((n >> 8) & 255) / 255, blue: (n & 255) / 255 };
}

/** Patrones en notación inglesa; Google los muestra con la coma o el punto de la región. */
const PATTERNS: Record<NumFormat, string> = {
  integer: '#,##0',
  decimal2: '0.00',
  decimal4: '0.0000',
  percent: '0.00##%',
  auto: '#,##0.##########',
};

const COLUMN_WIDTHS = [320, 150, 330];

function cellData(cell: GridRow['cells'][number]) {
  if (cell.formula !== undefined) return { userEnteredValue: { formulaValue: `=${cell.formula}` } };
  if (cell.number !== undefined) return { userEnteredValue: { numberValue: cell.number } };
  if (cell.text !== undefined) return { userEnteredValue: { stringValue: cell.text } };
  return {};
}

export function buildSpreadsheet(def: SheetDef, grid: Grid, palette: Palette) {
  const text = color(palette.text);
  const muted = color(palette.muted);
  const accent = color(palette.accentInk);
  const soft = color(palette.soft);
  const surface2 = color(palette.surface2);
  const fullWidth = new Set(['heading', 'sub', 'section', 'text']);

  const rowData = grid.rows.map((row) => {
    const values = row.cells.map((cell, col) => {
      const base: Record<string, unknown> = cellData(cell);
      const fmt: Record<string, unknown> = {
        verticalAlignment: 'MIDDLE',
        textFormat: { foregroundColor: text, fontFamily: 'Inter', fontSize: 11 },
      };
      if (row.kind === 'heading') fmt.textFormat = { foregroundColor: accent, fontFamily: 'Inter', fontSize: 16, bold: true };
      if (row.kind === 'sub') fmt.textFormat = { foregroundColor: muted, fontFamily: 'Inter', fontSize: 10 };
      if (row.kind === 'section') {
        fmt.backgroundColor = soft;
        fmt.textFormat = { foregroundColor: text, fontFamily: 'Inter', fontSize: 11, bold: true };
      }
      if (row.kind === 'text') fmt.wrapStrategy = 'WRAP';
      if ((row.kind === 'input' || row.kind === 'result') && col === 1) {
        fmt.numberFormat = { type: 'NUMBER', pattern: PATTERNS[row.format ?? 'auto'] };
        fmt.horizontalAlignment = 'RIGHT';
      }
      if ((row.kind === 'input' || row.kind === 'result') && col === 2) fmt.textFormat = { foregroundColor: muted, fontFamily: 'Inter', fontSize: 10 };
      if (row.main) {
        fmt.backgroundColor = surface2;
        if (col < 2) fmt.textFormat = { foregroundColor: text, fontFamily: 'Inter', fontSize: 13, bold: true };
      }
      return { ...base, userEnteredFormat: fmt };
    });
    return { values };
  });

  const merges = grid.rows.flatMap((row, r) =>
    fullWidth.has(row.kind) ? [{ sheetId: 0, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 0, endColumnIndex: 3 }] : [],
  );

  return {
    properties: { title: def.fileTitle, locale: 'en_US' },
    sheets: [
      {
        properties: {
          sheetId: 0,
          title: def.tabTitle,
          gridProperties: { rowCount: grid.rows.length + 5, columnCount: 3, hideGridlines: true },
          tabColorStyle: { rgbColor: color(palette.accent) },
        },
        data: [{ startRow: 0, startColumn: 0, rowData, columnMetadata: COLUMN_WIDTHS.map((pixelSize) => ({ pixelSize })) }],
        merges,
      },
    ],
  };
}

/** Región de la hoja según el idioma de la app. */
export function sheetLocale(lang: 'es' | 'en'): string {
  return lang === 'es' ? 'es_ES' : 'en_US';
}
