import type { Messages } from '../../i18n';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { formatNumber } from '../../ui/number';

// Auditoría 5S (docs/fichas/fase-4.md, ficha 4): 5 S × 4 preguntas, cada una
// de 0 a 4. El porcentaje de cada S (y el total) es puntos ÷ (4 × preguntas
// puntuadas); las sin puntuar no cuentan, y se avisa.

export const S_COUNT = 5;
export const Q_COUNT = 4;
export const MAX_SCORE = 4;

export interface Audit5sSaved {
  v: 1;
  area: string;
  auditor: string;
  /** Puntuación de cada pregunta (0 a 4) o −1 si no se puntuó. */
  scores: number[][];
  notes: string[][];
}

export const emptyAudit = (): Audit5sSaved => ({
  v: 1,
  area: '',
  auditor: '',
  scores: Array.from({ length: S_COUNT }, () => Array(Q_COUNT).fill(-1)),
  notes: Array.from({ length: S_COUNT }, () => Array(Q_COUNT).fill('')),
});

export function readAuditSaved(x: unknown): Audit5sSaved | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  if (o.v !== 1 || !Array.isArray(o.scores)) return null;
  const e = emptyAudit();
  (o.scores as unknown[]).slice(0, S_COUNT).forEach((row, s) => {
    if (Array.isArray(row)) row.slice(0, Q_COUNT).forEach((v, q) => (e.scores[s]![q] = typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= MAX_SCORE ? v : -1));
  });
  if (Array.isArray(o.notes))
    (o.notes as unknown[]).slice(0, S_COUNT).forEach((row, s) => {
      if (Array.isArray(row)) row.slice(0, Q_COUNT).forEach((v, q) => (e.notes[s]![q] = typeof v === 'string' ? v : ''));
    });
  return { ...e, area: typeof o.area === 'string' ? o.area : '', auditor: typeof o.auditor === 'string' ? o.auditor : '' };
}

/** Ejemplo: puesto de encajonado, con Limpiar como la S más floja. */
export const AUDIT_EXAMPLE_SCORES = [
  [3, 3, 4, 3],
  [3, 2, 3, 3],
  [2, 1, 2, 2],
  [3, 2, 3, 2],
  [2, 3, 2, 3],
];

export interface AuditResult {
  /** Por S: puntos, máximo (de las puntuadas) y porcentaje (null si ninguna puntuada). */
  perS: { points: number; max: number; pct: number | null }[];
  points: number;
  max: number;
  pct: number;
  answered: number;
  weakest: number;
  level: 'great' | 'good' | 'fair' | 'poor';
}

export function audit(s: Audit5sSaved): AuditResult | null {
  const perS = s.scores.map((row) => {
    const done = row.filter((v) => v >= 0);
    const points = done.reduce((a, b) => a + b, 0);
    const max = done.length * MAX_SCORE;
    return { points, max, pct: max ? points / max : null };
  });
  const points = perS.reduce((a, x) => a + x.points, 0);
  const max = perS.reduce((a, x) => a + x.max, 0);
  if (!max) return null;
  const pct = points / max;
  const answered = max / MAX_SCORE;
  let weakest = -1;
  perS.forEach((x, i) => {
    if (x.pct !== null && (weakest < 0 || x.pct < perS[weakest]!.pct!)) weakest = i;
  });
  const level = pct >= 0.85 ? 'great' : pct >= 0.7 ? 'good' : pct >= 0.5 ? 'fair' : 'poor';
  return { perS, points, max, pct, answered, weakest, level };
}

export const pctText = (x: number, lang: 'es' | 'en') => `${formatNumber(x * 100, lang, 0)} %`;

export function auditReading(s: Audit5sSaved, r: AuditResult, t: Messages, lang: 'es' | 'en') {
  const d = t.tools.auditoria5s;
  const conclusion = d.conclusion(s.area.trim() || d.defaultName, pctText(r.pct, lang), d.levels[r.level]!.toLocaleLowerCase(), d.sNames[r.weakest]!.toLocaleLowerCase());
  const missing = S_COUNT * Q_COUNT - r.answered;
  return { conclusion, warnings: missing ? [d.incomplete(missing)] : [] };
}

export function auditSheet(s: Audit5sSaved, r: AuditResult, t: Messages, opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.auditoria5s;
  const sh = d.sheet;
  const c = t.sheet;
  const title = s.area.trim() ? `${d.name} · ${s.area.trim()}` : d.name;
  const noted = s.notes.flatMap((row, si) => row.flatMap((n, q) => (n.trim() ? [{ label: `${d.sNames[si]} · ${q + 1}`, value: `${d.questions[si]![q]}\n${n.trim()}` }] : [])));
  return {
    fileTitle: `${title} · ${opts.date}`,
    tabTitle: sh.tab,
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
    ...(s.auditor.trim() ? { info: { title: d.name, rows: [{ label: d.auditor.replace(/ \(.*\)$/, ''), value: s.auditor.trim() }] } } : {}),
    ...(noted.length ? { textSections: [{ title: t.sheet.notes, rows: noted }] } : {}),
    inputs: [],
    table: {
      labelHead: sh.head,
      columns: [
        { key: 'pts', head: sh.ptsHead, format: 'integer' },
        { key: 'max', head: sh.maxHead, format: 'integer' },
        { key: 'pct', head: sh.pctHead, format: 'percent', formula: 'IF({.max}>0,{.pts}/{.max},"—")' },
      ],
      rows: r.perS.map((x, i) => ({ label: `${i + 1}S · ${d.sNames[i]}`, values: { pts: x.points, max: x.max } })),
      highlightMin: 'pct',
    },
    results: [
      { key: 'points', label: d.total, formula: 'SUM({pts[]})', note: sh.notes.total, format: 'integer' },
      { key: 'maxTotal', label: sh.maxHead, formula: 'SUM({max[]})', format: 'integer' },
      { key: 'pct', label: '%', formula: '{points}/{maxTotal}', note: sh.notes.pct, format: 'percent', main: true },
    ],
    reading: opts.reading,
    notes: [c.readingNote],
  };
}

export function auditSavedSheet(input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  const s = readAuditSaved(input);
  if (!s) return null;
  const r = audit(s);
  if (!r) return null;
  const a = auditReading(s, r, t, lang);
  return auditSheet(s, r, t, { reading: [{ tone: 'conclusion', text: a.conclusion }, ...a.warnings.map((w) => ({ tone: 'warning' as const, text: w })), { tone: 'tip', text: t.tools.auditoria5s.typicalError }], ...opts });
}
