import type { Palette } from '../ui/theme/themes';
import { color, type TabRange, type TabSpec } from './sheetsOutput';

// Pestaña «Resumen» de la hoja de un proyecto (ficha del proyecto mínimo,
// punto 6): datos del proyecto, una tabla con todas las mediciones (una
// columna por cada campo de contexto, para poder filtrar en Sheets) y los
// hitos. Es también la que leerán Claude o Gemini. Mismo estilo que las
// pestañas de las herramientas.

export interface SummaryMeasurement {
  date: string;
  name: string;
  tool: string;
  phase: string;
  indicator: string;
  /** Valor principal; null si no tiene. */
  value: number | null;
  /** Formato del valor: porcentaje o número, con sus decimales. */
  kind: 'percent' | 'number';
  decimals: number;
  context: string[];
  note: string;
  version: string;
}

export interface SummaryInput {
  title: string;
  subtitle: string;
  texts: {
    project: string;
    measurements: string;
    milestones: string;
    heads: { date: string; name: string; tool: string; phase: string; indicator: string; value: string; note: string; version: string };
    milestoneHeads: { date: string; title: string; note: string };
    noMeasurements: string;
    noMilestones: string;
    footer: string[];
  };
  /** Datos del proyecto: tipo, fase, objetivo… */
  facts: { label: string; value: string }[];
  /** Nombres de los campos de contexto (una columna cada uno). */
  fields: string[];
  measurements: SummaryMeasurement[];
  milestones: { date: string; title: string; note: string }[];
}

type Kind = 'title' | 'sub' | 'gap' | 'section' | 'fact' | 'heads' | 'row' | 'hint' | 'note';
interface Cell {
  text?: string;
  number?: number;
  format?: { type: 'PERCENT' | 'NUMBER'; pattern: string };
}
interface Row {
  kind: Kind;
  cells: Cell[];
  alt?: boolean;
  /** Une desde esta columna hasta la última. */
  spanFrom?: number;
}

const HEIGHT: Partial<Record<Kind, number>> = { title: 52, sub: 26, gap: 14, section: 32, heads: 24, fact: 26, row: 28, hint: 24 };

function pattern(kind: 'percent' | 'number', decimals: number) {
  const d = decimals > 0 ? `.${'0'.repeat(decimals)}` : '';
  return kind === 'percent' ? { type: 'PERCENT' as const, pattern: `0${d}%` } : { type: 'NUMBER' as const, pattern: `#,##0${d}` };
}

export function buildSummaryTab(s: SummaryInput, palette: Palette, sheetId: number, title: string): TabSpec {
  const T = s.texts;
  // A margen · B fecha · C medición · D herramienta · E fase · F indicador · G valor · contexto… · nota · versión.
  const widths = [18, 150, 210, 140, 100, 120, 100, ...s.fields.map(() => 140), 240, 70];
  const cols = widths.length;
  const rows: Row[] = [];
  const blank = (): Cell[] => Array.from({ length: cols }, () => ({}));
  const wide = (kind: Kind, text: string): Row => {
    const cells = blank();
    cells[1] = { text };
    return { kind, cells, spanFrom: 1 };
  };
  const gap = () => rows.push({ kind: 'gap', cells: blank() });

  rows.push(wide('title', s.title), wide('sub', s.subtitle));
  gap();

  rows.push(wide('section', T.project));
  s.facts.forEach((f, i) => {
    const cells = blank();
    cells[1] = { text: f.label };
    cells[2] = { text: f.value };
    rows.push({ kind: 'fact', cells, alt: i % 2 === 1, spanFrom: 2 });
  });
  gap();

  rows.push(wide('section', T.measurements));
  if (s.measurements.length === 0) rows.push(wide('hint', T.noMeasurements));
  else {
    const h = T.heads;
    const heads = [h.date, h.name, h.tool, h.phase, h.indicator, h.value, ...s.fields, h.note, h.version];
    const cells = blank();
    heads.forEach((x, i) => (cells[i + 1] = { text: x }));
    rows.push({ kind: 'heads', cells });
    s.measurements.forEach((m, n) => {
      const c = blank();
      const values: Cell[] = [
        { text: m.date },
        { text: m.name },
        { text: m.tool },
        { text: m.phase },
        { text: m.indicator },
        m.value === null ? {} : { number: m.value, format: pattern(m.kind, m.decimals) },
        ...s.fields.map((_, i) => ({ text: m.context[i] ?? '' })),
        { text: m.note },
        { text: m.version },
      ];
      values.forEach((v, i) => (c[i + 1] = v));
      rows.push({ kind: 'row', cells: c, alt: n % 2 === 1 });
    });
  }
  gap();

  rows.push(wide('section', T.milestones));
  if (s.milestones.length === 0) rows.push(wide('hint', T.noMilestones));
  else {
    const cells = blank();
    cells[1] = { text: T.milestoneHeads.date };
    cells[2] = { text: T.milestoneHeads.title };
    cells[3] = { text: T.milestoneHeads.note };
    rows.push({ kind: 'heads', cells, spanFrom: 3 });
    s.milestones.forEach((m, n) => {
      const c = blank();
      c[1] = { text: m.date };
      c[2] = { text: m.title };
      c[3] = { text: m.note };
      rows.push({ kind: 'row', cells: c, alt: n % 2 === 1, spanFrom: 3 });
    });
  }
  gap();
  for (const line of T.footer) rows.push(wide('note', line));

  // Estilo: el mismo que las pestañas de las herramientas (sheetsOutput.ts).
  const c = {
    text: color(palette.text),
    muted: color(palette.muted),
    accent: color(palette.accent),
    accentInk: color(palette.accentInk),
    onAccent: color(palette.onAccent),
    surface2: color(palette.surface2),
    bg: color(palette.bg),
    line: color(palette.line),
    white: color('#FFFFFF'),
  };
  const font = (fg: typeof c.text, size = 11, extra: object = {}) => ({ foregroundColor: fg, fontFamily: 'Inter', fontSize: size, ...extra });
  const bottom = (style: string, col: typeof c.text) => ({ bottom: { style, colorStyle: { rgbColor: col } } });

  const rowData = rows.map((row) => ({
    values: row.cells.map((cell, col) => {
      const f: Record<string, unknown> = { verticalAlignment: 'MIDDLE', textFormat: font(c.text), backgroundColor: c.white };
      switch (row.kind) {
        case 'title':
          f.backgroundColor = c.accent;
          f.textFormat = font(c.onAccent, 18, { bold: true });
          break;
        case 'sub':
          f.textFormat = font(c.muted, 10);
          break;
        case 'section':
          f.textFormat = font(c.accentInk, 12, { bold: true });
          f.verticalAlignment = 'BOTTOM';
          if (col > 0) f.borders = bottom('SOLID_MEDIUM', c.accent);
          break;
        case 'fact':
          if (row.alt && col > 0) f.backgroundColor = c.bg;
          if (col === 1) f.textFormat = font(c.muted, 10, { bold: true });
          f.wrapStrategy = 'WRAP';
          if (col > 0) f.borders = bottom('SOLID', c.line);
          break;
        case 'heads':
          f.textFormat = font(c.muted, 9, { bold: true });
          if (col > 0) f.borders = bottom('SOLID', c.line);
          break;
        case 'row':
          if (row.alt && col > 0) f.backgroundColor = c.bg;
          f.wrapStrategy = 'WRAP';
          if (cell.number !== undefined) {
            f.horizontalAlignment = 'RIGHT';
            f.textFormat = font(c.text, 11, { bold: true });
          }
          if (col > 0) f.borders = bottom('SOLID', c.line);
          break;
        case 'hint':
          f.textFormat = font(c.muted, 10, { italic: true });
          break;
        case 'note':
          f.wrapStrategy = 'WRAP';
          f.verticalAlignment = 'TOP';
          f.textFormat = font(c.muted, 10);
          break;
      }
      if (cell.format) f.numberFormat = cell.format;
      const value = cell.number !== undefined ? { numberValue: cell.number } : cell.text !== undefined ? { stringValue: cell.text } : undefined;
      return { ...(value ? { userEnteredValue: value } : {}), userEnteredFormat: f };
    }),
  }));

  const merges: TabRange[] = rows.flatMap((row, r) =>
    row.spanFrom !== undefined ? [{ sheetId, startRowIndex: r, endRowIndex: r + 1, startColumnIndex: row.spanFrom, endColumnIndex: cols }] : [],
  );

  return {
    sheetId,
    title,
    rowCount: rows.length + 5,
    columnCount: cols,
    tabColor: c.accent,
    rowData,
    rowMetadata: rows.map((r) => (HEIGHT[r.kind] ? { pixelSize: HEIGHT[r.kind] } : {})),
    columnMetadata: widths.map((pixelSize) => ({ pixelSize })),
    merges,
    conditionalFormats: [],
  };
}
