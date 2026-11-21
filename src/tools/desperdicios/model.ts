import type { Messages } from '../../i18n';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { pareto } from '../../calc/pareto';

// Recorrido de desperdicios (docs/fichas/fase-4.md, ficha 3): los 8
// desperdicios de Lean (TIMWOODS), cada hallazgo con dónde, qué se ve, una
// idea, su impacto y hasta tres fotos reducidas.

export const WASTES = ['transport', 'inventory', 'motion', 'waiting', 'overprocessing', 'overproduction', 'defects', 'skills'] as const;
export type Waste = (typeof WASTES)[number];
export const SEVERITIES = ['high', 'medium', 'low'] as const;
export type Severity = (typeof SEVERITIES)[number];
export const MAX_PHOTOS = 3;

export interface Finding {
  type: Waste;
  where: string;
  what: string;
  idea: string;
  severity: Severity;
  photos: string[];
}

export interface WasteSaved {
  v: 1;
  area: string;
  findings: Finding[];
}

const str = (x: unknown) => (typeof x === 'string' ? x : '');

export function readWasteSaved(x: unknown): WasteSaved | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  if (o.v !== 1 || !Array.isArray(o.findings)) return null;
  const findings = (o.findings as unknown[]).flatMap((f) => {
    const r = f as Record<string, unknown> | null;
    if (!r) return [];
    const type = (WASTES as readonly string[]).includes(str(r.type)) ? (r.type as Waste) : 'transport';
    const severity = (SEVERITIES as readonly string[]).includes(str(r.severity)) ? (r.severity as Severity) : 'medium';
    const photos = Array.isArray(r.photos) ? (r.photos as unknown[]).filter((p): p is string => typeof p === 'string' && p.startsWith('data:image/')).slice(0, MAX_PHOTOS) : [];
    return [{ type, where: str(r.where), what: str(r.what), idea: str(r.idea), severity, photos }];
  });
  return { v: 1, area: str(o.area), findings };
}

export function wasteExample(t: Messages): WasteSaved {
  const x = t.tools.desperdicios.exampleData;
  return {
    v: 1,
    area: x.area,
    findings: x.findings.map(([type, where, what, idea, severity]) => ({ type: type as Waste, where: where ?? '', what: what ?? '', idea: idea ?? '', severity: (severity ?? 'medium') as Severity, photos: [] })),
  };
}

/** Hallazgos con algo escrito. */
export const findingsOf = (s: WasteSaved) => s.findings.filter((f) => f.what.trim() || f.where.trim() || f.photos.length);

/** Cuántos de cada tipo, de más a menos. */
export function byType(s: WasteSaved) {
  return pareto(WASTES.map((w) => ({ key: w, minutes: findingsOf(s).filter((f) => f.type === w).length })));
}

export function wasteReading(s: WasteSaved, t: Messages): { conclusion: string; warnings: string[] } | null {
  const d = t.tools.desperdicios;
  const list = findingsOf(s);
  if (!list.length) return null;
  const rows = byType(s);
  const parts = [d.conclusion(s.area.trim() || d.defaultName, list.length, d.types[rows[0]!.key]!.toLocaleLowerCase())];
  const high = list.filter((f) => f.severity === 'high').length;
  if (high) parts.push(d.highSentence(high));
  return { conclusion: parts.join(' '), warnings: [] };
}

export function wasteSheet(s: WasteSaved, t: Messages, opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.desperdicios;
  const c = t.sheet;
  const list = findingsOf(s);
  const photos = list.reduce((a, f) => a + f.photos.length, 0);
  const title = s.area.trim() ? `${d.name} · ${s.area.trim()}` : d.name;
  const findingText = (f: Finding) =>
    [`${d.types[f.type]} · ${d.severity}: ${d.severities[f.severity]}`, f.where ? `${d.where}: ${f.where}` : '', f.what, f.idea ? `${d.idea}: ${f.idea}` : ''].filter(Boolean).join('\n');
  return {
    fileTitle: `${title} · ${opts.date}`,
    tabTitle: d.sheet.tab,
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
    textSections: [{ title: d.list, rows: list.map((f, i) => ({ label: d.findingName(i + 1), value: findingText(f) })) }],
    inputs: [],
    table: { labelHead: d.sheet.typeHead, columns: [{ key: 'n', head: d.sheet.countHead, format: 'integer' }], rows: WASTES.map((w) => ({ label: d.types[w]!, values: { n: list.filter((f) => f.type === w).length } })), highlightMax: 'n' },
    results: [{ key: 'total', label: t.tools.conteo.total, formula: 'SUM({n[]})', format: 'integer', main: true }],
    reading: opts.reading,
    notes: [...(photos ? [d.photosNote(photos)] : []), c.readingNote],
  };
}

export function wasteSavedSheet(input: unknown, t: Messages, _lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  const s = readWasteSaved(input);
  if (!s) return null;
  const a = wasteReading(s, t);
  if (!a) return null;
  return wasteSheet(s, t, { reading: [{ tone: 'conclusion', text: a.conclusion }, { tone: 'tip', text: t.tools.desperdicios.typicalError }], ...opts });
}
