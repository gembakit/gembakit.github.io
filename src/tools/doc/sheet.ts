import type { Messages } from '../../i18n';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { filledRows, field, formatDocDate, readDoc, type DocData, type DocSchema, type DocTexts } from './types';

// Hoja (y PDF) de un documento: un apartado por sección, con cada campo y
// cada fila de las listas como «etiqueta: texto».

/** Texto de una celda de lista: la opción elegida con su nombre, una fecha en el idioma. */
export function cellText(schema: DocSchema, texts: DocTexts, listKey: string, colKey: string, value: string, lang: 'es' | 'en'): string {
  const col = schema.sections.find((s) => s.list?.key === listKey)?.list?.columns.find((c) => c.key === colKey);
  if (!col || !value.trim()) return value.trim();
  if (col.kind === 'select') return texts.lists[listKey]?.columns[colKey]?.options?.[value] ?? value;
  if (col.kind === 'date') return formatDocDate(value, lang);
  return value.trim();
}

export function docSections(schema: DocSchema, texts: DocTexts, d: DocData, lang: 'es' | 'en'): NonNullable<SheetDef['textSections']> {
  const out: NonNullable<SheetDef['textSections']> = [];
  for (const sec of schema.sections) {
    const rows: { label: string; value: string }[] = [];
    for (const f of sec.fields ?? []) {
      const v = field(d, f.key);
      if (v) rows.push({ label: texts.fields[f.key]?.label ?? f.key, value: f.kind === 'date' ? formatDocDate(v, lang) : v });
    }
    if (sec.list) {
      const L = texts.lists[sec.list.key]!;
      filledRows(d, sec.list.key).forEach((row, i) => {
        const [first, ...rest] = sec.list!.columns;
        const head = first ? cellText(schema, texts, sec.list!.key, first.key, row[first.key] ?? '', lang) : '';
        const others = rest
          .map((c) => {
            const v = cellText(schema, texts, sec.list!.key, c.key, row[c.key] ?? '', lang);
            return v ? `${L.columns[c.key]?.label ?? c.key}: ${v}` : '';
          })
          .filter(Boolean);
        rows.push({ label: L.item(i + 1), value: [head, ...others].filter(Boolean).join('\n') });
      });
    }
    if (rows.length) out.push({ title: texts.sections[sec.key]?.title ?? sec.key, rows });
  }
  return out;
}

export function docSheet(schema: DocSchema, texts: DocTexts, d: DocData, t: Messages, lang: 'es' | 'en', opts: { title?: string; reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const c = t.sheet;
  const title = opts.title ? `${texts.name} · ${opts.title}` : texts.name;
  return {
    fileTitle: `${title} · ${opts.date}`,
    tabTitle: texts.sheet.tab,
    heading: title,
    subheading: c.subheading(opts.version, opts.date),
    texts: {
      summary: c.summary,
      inputs: c.inputs,
      results: c.results,
      reading: c.reading,
      notes: c.notes,
      inputHeads: [c.inputHeads[0]!, c.inputHeads[1]!, c.inputHeads[2]!],
      resultHeads: [c.resultHeads[0]!, c.resultHeads[1]!, c.resultHeads[2]!],
      editHint: c.editHint,
      prefixes: c.prefixes,
    },
    inputs: [],
    results: [],
    textSections: docSections(schema, texts, d, lang),
    reading: opts.reading,
    notes: [c.readingNote],
  };
}

/** Hoja de un documento guardado (para la hoja del proyecto); null si no hay bastante escrito. */
export function docSavedSheet(
  schema: DocSchema,
  textsOf: (t: Messages) => DocTexts,
  analyze: (d: DocData, t: Messages, lang: 'es' | 'en') => { ready: boolean; title: string; conclusion: string; warnings: string[] },
) {
  return (input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null => {
    const d = readDoc(input);
    if (!d) return null;
    const a = analyze(d, t, lang);
    if (!a.ready) return null;
    const texts = textsOf(t);
    const reading: ReadingLine[] = [{ tone: 'conclusion', text: a.conclusion }, ...a.warnings.map((w) => ({ tone: 'warning' as const, text: w })), { tone: 'tip', text: texts.typicalError }];
    return docSheet(schema, texts, d, t, lang, { title: a.title, reading, ...opts });
  };
}
