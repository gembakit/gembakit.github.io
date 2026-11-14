import type { Palette } from '../ui/theme/themes';
import { createDriveFile, MIME, sheetsBatch, sheetsGet, sheetsWrite, slidesBatch, slidesGet } from './api';

// PROVISIONAL: prueba del flujo de proyectos en Google (ESTADO.md, decisiones
// del 2026-11-14). Crea una carpeta de proyecto con su hoja (una pestaña de la
// app, protegida con aviso, con un gráfico, y otra «tuya») y una presentación
// con un gráfico vinculado a esa hoja. Se retira con la pantalla de prueba.

export interface DemoTexts {
  folder: string;
  sheet: string;
  appTab: string;
  userTab: string;
  userTabNote: string;
  protect: string;
  heads: [string, string, string, string];
  steps: [string, string, string];
  chartTitle: string;
  presentation: string;
  cover: string;
  coverSub: string;
  summaryTitle: string;
  summary: string;
  tableTitle: string;
  chartSlide: string;
}

export interface DemoSheet {
  id: string;
  url: string;
  chartId: number;
}

type Rgb = { red: number; green: number; blue: number };
function rgb(hex: string): Rgb {
  const n = parseInt(hex.replace('#', ''), 16);
  return { red: ((n >> 16) & 255) / 255, green: ((n >> 8) & 255) / 255, blue: (n & 255) / 255 };
}

export async function createDemoFolder(token: string, t: DemoTexts) {
  return createDriveFile(token, t.folder, MIME.folder);
}

/** Hoja del proyecto dentro de la carpeta: pestaña de la app (protegida, con gráfico) y pestaña «tuya». */
export async function createDemoSheet(token: string, folderId: string, t: DemoTexts, palette: Palette, locale: string): Promise<DemoSheet> {
  const file = await createDriveFile(token, t.sheet, MIME.spreadsheet, folderId);
  const info = await sheetsGet<{ sheets: { properties: { sheetId: number } }[] }>(token, file.id, 'sheets.properties.sheetId');
  const app = info.sheets[0]!.properties.sheetId;
  const counts: [number, number][] = [
    [200, 186],
    [186, 180],
    [180, 171],
  ];
  await sheetsBatch(token, file.id, [
    { updateSheetProperties: { properties: { sheetId: app, title: t.appTab, tabColorStyle: { rgbColor: rgb(palette.accent) } }, fields: 'title,tabColorStyle' } },
    { addSheet: { properties: { title: t.userTab } } },
  ]);
  await sheetsWrite(token, file.id, [
    { range: `'${t.appTab}'!A1:D4`, values: [t.heads, ...t.steps.map((s, i) => [s, counts[i]![0], counts[i]![1], `=C${i + 2}/B${i + 2}`])] },
    { range: `'${t.userTab}'!A1`, values: [[t.userTabNote]] },
  ]);
  const src = (c0: number, c1: number) => ({ sourceRange: { sources: [{ sheetId: app, startRowIndex: 0, endRowIndex: 4, startColumnIndex: c0, endColumnIndex: c1 }] } });
  const replies = await sheetsBatch(token, file.id, [
    { updateSpreadsheetProperties: { properties: { locale }, fields: 'locale' } },
    {
      repeatCell: {
        range: { sheetId: app, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 4 },
        cell: { userEnteredFormat: { backgroundColor: rgb(palette.accent), textFormat: { bold: true, foregroundColor: rgb(palette.onAccent) } } },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },
    {
      repeatCell: {
        range: { sheetId: app, startRowIndex: 1, endRowIndex: 4, startColumnIndex: 3, endColumnIndex: 4 },
        cell: { userEnteredFormat: { numberFormat: { type: 'PERCENT', pattern: '0.0%' } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
    {
      addChart: {
        chart: {
          spec: {
            title: t.chartTitle,
            basicChart: {
              chartType: 'COLUMN',
              legendPosition: 'NO_LEGEND',
              headerCount: 1,
              domains: [{ domain: src(0, 1) }],
              series: [{ series: src(3, 4), targetAxis: 'LEFT_AXIS', colorStyle: { rgbColor: rgb(palette.accent) } }],
            },
          },
          position: { overlayPosition: { anchorCell: { sheetId: app, rowIndex: 5, columnIndex: 0 } } },
        },
      },
    },
    // Aviso al editar la pestaña de la app (Google no deja bloquearla del todo a su dueño).
    { addProtectedRange: { protectedRange: { range: { sheetId: app }, description: t.protect, warningOnly: true } } },
  ]);
  const chart = replies.find((r): r is { addChart: { chart: { chartId: number } } } => !!(r as { addChart?: unknown }).addChart);
  return { id: file.id, url: file.url, chartId: chart!.addChart.chart.chartId };
}

/** Presentación en la carpeta del proyecto: portada, resumen, tabla y gráfico vinculado a la hoja. */
export async function createDemoPresentation(token: string, folderId: string, sheet: DemoSheet, t: DemoTexts, palette: Palette) {
  const file = await createDriveFile(token, t.presentation, MIME.presentation, folderId);
  type El = { objectId: string; shape?: { placeholder?: { type: string } } };
  const pres = await slidesGet<{ slides: { objectId: string; pageElements?: El[] }[] }>(token, file.id, 'slides(objectId,pageElements(objectId,shape(placeholder(type))))');
  const cover = pres.slides[0]!;
  const ph = (type: string) => cover.pageElements?.find((e) => e.shape?.placeholder?.type === type)?.objectId;
  const title = ph('CENTERED_TITLE') ?? ph('TITLE');
  const sub = ph('SUBTITLE');
  const onAccent = { opaqueColor: { rgbColor: rgb(palette.onAccent) } };
  const ink = { opaqueColor: { rgbColor: rgb(palette.accentInk) } };
  const emu = (n: number) => ({ magnitude: n, unit: 'EMU' });
  const slide = (id: string, layout: string, withBody: boolean) => ({
    createSlide: {
      objectId: id,
      slideLayoutReference: { predefinedLayout: layout },
      placeholderIdMappings: [
        { layoutPlaceholder: { type: 'TITLE' }, objectId: `${id}_title` },
        ...(withBody ? [{ layoutPlaceholder: { type: 'BODY' }, objectId: `${id}_body` }] : []),
      ],
    },
  });
  const titleStyle = (id: string) => ({
    updateTextStyle: { objectId: id, textRange: { type: 'ALL' }, style: { foregroundColor: ink, bold: true }, fields: 'foregroundColor,bold' },
  });
  const rows = [t.heads, ...t.steps.map((s, i) => [s, ['200', '186', '180'][i]!, ['186', '180', '171'][i]!, ['93,0 %', '96,8 %', '95,0 %'][i]!])];

  await slidesBatch(token, file.id, [
    // Portada en el color del tema.
    {
      updatePageProperties: {
        objectId: cover.objectId,
        pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: rgb(palette.accent) } } } },
        fields: 'pageBackgroundFill.solidFill.color',
      },
    },
    ...(title
      ? [
          { insertText: { objectId: title, text: t.cover } },
          { updateTextStyle: { objectId: title, textRange: { type: 'ALL' }, style: { foregroundColor: onAccent, bold: true }, fields: 'foregroundColor,bold' } },
        ]
      : []),
    ...(sub
      ? [
          { insertText: { objectId: sub, text: t.coverSub } },
          { updateTextStyle: { objectId: sub, textRange: { type: 'ALL' }, style: { foregroundColor: onAccent }, fields: 'foregroundColor' } },
        ]
      : []),
    // Resumen con viñetas.
    slide('gk_summary', 'TITLE_AND_BODY', true),
    { insertText: { objectId: 'gk_summary_title', text: t.summaryTitle } },
    titleStyle('gk_summary_title'),
    { insertText: { objectId: 'gk_summary_body', text: t.summary } },
    // Tabla con los datos.
    slide('gk_table', 'TITLE_ONLY', false),
    { insertText: { objectId: 'gk_table_title', text: t.tableTitle } },
    titleStyle('gk_table_title'),
    {
      createTable: {
        objectId: 'gk_table_grid',
        rows: rows.length,
        columns: 4,
        elementProperties: { pageObjectId: 'gk_table', size: { width: emu(8000000), height: emu(2400000) }, transform: { scaleX: 1, scaleY: 1, translateX: 572000, translateY: 1500000, unit: 'EMU' } },
      },
    },
    ...rows.flatMap((r, ri) => r.map((text, ci) => ({ insertText: { objectId: 'gk_table_grid', cellLocation: { rowIndex: ri, columnIndex: ci }, text } }))),
    {
      updateTableCellProperties: {
        objectId: 'gk_table_grid',
        tableRange: { location: { rowIndex: 0, columnIndex: 0 }, rowSpan: 1, columnSpan: 4 },
        tableCellProperties: { tableCellBackgroundFill: { solidFill: { color: { rgbColor: rgb(palette.accent) } } } },
        fields: 'tableCellBackgroundFill.solidFill.color',
      },
    },
    ...[0, 1, 2, 3].map((ci) => ({
      updateTextStyle: { objectId: 'gk_table_grid', cellLocation: { rowIndex: 0, columnIndex: ci }, textRange: { type: 'ALL' }, style: { foregroundColor: onAccent, bold: true }, fields: 'foregroundColor,bold' },
    })),
    // Gráfico vinculado a la hoja del proyecto: en Slides se puede «Actualizar».
    slide('gk_chart', 'TITLE_ONLY', false),
    { insertText: { objectId: 'gk_chart_title', text: t.chartSlide } },
    titleStyle('gk_chart_title'),
    {
      createSheetsChart: {
        objectId: 'gk_chart_linked',
        spreadsheetId: sheet.id,
        chartId: sheet.chartId,
        linkingMode: 'LINKED',
        elementProperties: { pageObjectId: 'gk_chart', size: { width: emu(6400000), height: emu(3300000) }, transform: { scaleX: 1, scaleY: 1, translateX: 1372000, translateY: 1450000, unit: 'EMU' } },
      },
    },
  ]);
  return file;
}
