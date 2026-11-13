import { evaluateGrid, type Value } from '../sheet/evaluate';
import { COLUMNS, type Grid, type GridCell, type GridRow } from '../sheet/layout';
import type { NumFormat, SheetDef } from '../sheet/types';
import { STATUS, type Palette } from '../ui/theme/themes';

// Convierte la cuadrícula de una hoja en la petición de creación de la API de
// Google Sheets, con el estilo de la app (PLAN.md, 6.2) en la versión clara
// del tema elegido: banda de título, resumen, datos editables en color,
// tablas con encabezados y filas alternas, y «Cómo leerlo» destacado.
// La hoja se crea con región en_US para que las fórmulas (en inglés, con
// comas) se lean siempre igual; después se pasa a la región del usuario y
// Google las muestra con sus separadores. Ver ESTADO.md.

interface Color {
  red: number;
  green: number;
  blue: number;
}

function color(hex: string): Color {
  const n = parseInt(hex.replace('#', ''), 16);
  return { red: ((n >> 16) & 255) / 255, green: ((n >> 8) & 255) / 255, blue: (n & 255) / 255 };
}

/** Decimales que necesita un valor para verse sin redondeos engañosos ni ceros de sobra. */
export function decimalsFor(v: number, format: NumFormat): number {
  if (format === 'integer') return 0;
  if (format === 'decimal2') return 2;
  if (format === 'decimal4') return 4;
  if (!Number.isFinite(v) || v === 0) return 0;
  if (format === 'percent') {
    // Al menos dos decimales; más si hace falta para no mostrar 100 % cuando no lo es.
    let d = 2;
    while (d < 8 && v !== 1 && Number((v * 100).toFixed(d)) === 100) d++;
    return d;
  }
  // «auto»: tres cifras significativas, sin ceros finales.
  const d = Math.min(10, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(v)))));
  const s = Math.abs(v).toFixed(d);
  return s.includes('.') ? s.replace(/0+$/, '').split('.')[1]!.length : 0;
}

/** Patrón de número en notación inglesa; Google lo muestra con la coma o el punto de la región. */
export function patternFor(v: Value | undefined, format: NumFormat): string {
  const d = decimalsFor(typeof v === 'number' ? v : 0, format);
  const base = d === 0 ? '#,##0' : `#,##0.${'0'.repeat(d)}`;
  return format === 'percent' ? `${d === 0 ? '0' : `0.${'0'.repeat(d)}`}%` : base;
}

const WIDTHS = [18, 300, 140, 320];
const HEIGHTS: Partial<Record<GridRow['kind'], number>> = {
  title: 52,
  sub: 26,
  gap: 14,
  section: 32,
  heads: 24,
  input: 28,
  result: 28,
  hint: 24,
};
const WIDE = new Set<GridRow['kind']>(['title', 'sub', 'section', 'hint', 'reading', 'note']);
const FONT = 'Inter';

function value(cell: GridCell) {
  if (cell.formula !== undefined) return { userEnteredValue: { formulaValue: `=${cell.formula}` } };
  if (cell.number !== undefined) return { userEnteredValue: { numberValue: cell.number } };
  if (cell.text !== undefined) return { userEnteredValue: { stringValue: cell.text } };
  return {};
}

export function buildSpreadsheet(def: SheetDef, grid: Grid, palette: Palette) {
  const c = {
    text: color(palette.text),
    muted: color(palette.muted),
    accent: color(palette.accent),
    accentInk: color(palette.accentInk),
    onAccent: color(palette.onAccent),
    soft: color(palette.soft),
    surface2: color(palette.surface2),
    bg: color(palette.bg),
    line: color(palette.line),
    white: color('#FFFFFF'),
    warnSoft: color(STATUS.light.warnSoft),
  };
  // Los valores calculados deciden los decimales de las celdas «auto».
  let computed: Record<string, Value> = {};
  try {
    computed = evaluateGrid(grid);
  } catch {
    // Si el evaluador no conoce alguna función, se usan los formatos por defecto.
  }
  const text = (color: Color, size = 11, extra: object = {}) => ({ foregroundColor: color, fontFamily: FONT, fontSize: size, ...extra });
  const border = (style: string, col: Color) => ({ style, colorStyle: { rgbColor: col } });

  const rowData = grid.rows.map((row, r) => ({
    values: row.cells.map((cell, col) => {
      const addr = `${COLUMNS[col]}${r + 1}`;
      const f: Record<string, unknown> = { verticalAlignment: 'MIDDLE', textFormat: text(c.text), backgroundColor: c.white };
      const label = col === 1;
      const val = col === 2;
      const note = col === 3;
      switch (row.kind) {
        case 'title':
          f.backgroundColor = c.accent;
          f.textFormat = text(c.onAccent, 18, { bold: true });
          break;
        case 'sub':
          f.textFormat = text(c.muted, 10);
          break;
        case 'section':
          f.textFormat = text(c.accentInk, 12, { bold: true });
          f.verticalAlignment = 'BOTTOM';
          if (col > 0) f.borders = { bottom: border('SOLID_MEDIUM', c.accent) };
          break;
        case 'heads':
          f.textFormat = text(c.muted, 9, { bold: true });
          if (val) f.horizontalAlignment = 'RIGHT';
          if (col > 0) f.borders = { bottom: border('SOLID', c.line) };
          break;
        case 'kpi':
          f.backgroundColor = col > 0 ? c.surface2 : c.white;
          if (label) f.textFormat = text(c.text, row.main ? 13 : 11, { bold: row.main });
          if (val) {
            f.textFormat = text(c.accentInk, row.main ? 22 : 14, { bold: true });
            f.horizontalAlignment = 'RIGHT';
          }
          break;
        case 'input':
        case 'result':
          if (row.alt && col > 0) f.backgroundColor = c.bg;
          if (val) f.horizontalAlignment = 'RIGHT';
          if (note) f.textFormat = text(c.muted, 10);
          // Los datos que se pueden cambiar, en el color suave del tema.
          if (row.kind === 'input' && val) {
            f.backgroundColor = c.soft;
            f.textFormat = text(c.text, 11, { bold: true });
          }
          if (row.main && col > 0) {
            f.backgroundColor = c.surface2;
            if (!note) f.textFormat = text(c.text, 12, { bold: true });
          }
          if (col > 0) f.borders = { bottom: border('SOLID', c.line) };
          break;
        case 'hint':
          f.textFormat = text(c.muted, 10, { italic: true });
          break;
        case 'reading':
          f.wrapStrategy = 'WRAP';
          f.verticalAlignment = 'TOP';
          f.padding = { top: 6, bottom: 6, left: 4, right: 4 };
          if (col > 0 && row.tone === 'warning') f.backgroundColor = c.warnSoft;
          if (col > 0 && row.tone === 'tip') f.backgroundColor = c.surface2;
          break;
        case 'note':
          f.wrapStrategy = 'WRAP';
          f.verticalAlignment = 'TOP';
          f.textFormat = text(c.muted, 10);
          break;
      }
      if (val && (row.kind === 'input' || row.kind === 'result' || row.kind === 'kpi')) {
        f.numberFormat = { type: row.format === 'percent' ? 'PERCENT' : 'NUMBER', pattern: patternFor(computed[addr] ?? cell.number, row.format ?? 'auto') };
      }
      const out: Record<string, unknown> = { ...value(cell), userEnteredFormat: f };
      if (cell.boldPrefix) {
        out.textFormatRuns = [
          { startIndex: 0, format: { bold: true } },
          { startIndex: cell.boldPrefix, format: { bold: false } },
        ];
      }
      return out;
    }),
  }));

  const merges = grid.rows.flatMap((row, r) =>
    WIDE.has(row.kind) ? [{ sheetId: 0, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: 1, endColumnIndex: 4 }] : [],
  );
  const rowMetadata = grid.rows.map((row) => (HEIGHTS[row.kind] ? { pixelSize: HEIGHTS[row.kind] } : {}));
  if (rowMetadata.length) {
    const kpiMain = grid.rows.findIndex((r) => r.kind === 'kpi' && r.main);
    if (kpiMain >= 0) rowMetadata[kpiMain] = { pixelSize: 46 };
    grid.rows.forEach((r, i) => r.kind === 'kpi' && !r.main && (rowMetadata[i] = { pixelSize: 32 }));
  }

  return {
    properties: { title: def.fileTitle, locale: 'en_US' },
    sheets: [
      {
        properties: {
          sheetId: 0,
          title: def.tabTitle,
          gridProperties: { rowCount: grid.rows.length + 5, columnCount: 4, hideGridlines: true },
          tabColorStyle: { rgbColor: c.accent },
        },
        data: [{ startRow: 0, startColumn: 0, rowData, rowMetadata, columnMetadata: WIDTHS.map((pixelSize) => ({ pixelSize })) }],
        merges,
      },
    ],
  };
}

/** Región de la hoja según el idioma de la app. */
export function sheetLocale(lang: 'es' | 'en'): string {
  return lang === 'es' ? 'es_ES' : 'en_US';
}
