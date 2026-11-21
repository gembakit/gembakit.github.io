import type { Messages } from '../../i18n';
import { descriptive, type DescriptiveResult } from '../../calc/descriptive';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { fixed } from '../../sheet/types';
import { formatNumber } from '../../ui/number';

// Cronómetro de ciclos (docs/fichas/fase-4.md, ficha 1): cada ciclo con su
// hora real de inicio y de fin; la estadística es la descriptiva de las duraciones.

export interface Lap {
  start: number;
  end: number;
}

export interface CronoSaved {
  v: 1;
  name: string;
  laps: Lap[];
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

export function readCronoSaved(x: unknown): CronoSaved | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  if (o.v !== 1 || !Array.isArray(o.laps)) return null;
  const laps = (o.laps as unknown[]).flatMap((l) => {
    const r = l as Record<string, unknown> | null;
    return r && isNum(r.start) && isNum(r.end) && r.end >= r.start ? [{ start: r.start, end: r.end }] : [];
  });
  return { v: 1, name: typeof o.name === 'string' ? o.name : '', laps };
}

/** Duración de cada ciclo en segundos. */
export const durations = (laps: readonly Lap[]) => laps.map((l) => (l.end - l.start) / 1000);

/** Ejemplo: 12 ciclos de encajonado; el 8.º, lento por falta de cajas. */
export function cronoExample(name: string): CronoSaved {
  const base = new Date(2026, 10, 21, 8, 0, 0).getTime();
  const secs = [28.4, 27.1, 29.0, 26.8, 31.5, 27.9, 28.2, 45.3, 27.4, 28.8, 26.9, 28.1];
  let t = base;
  const laps = secs.map((s) => {
    const lap = { start: t, end: t + Math.round(s * 1000) };
    t = lap.end;
    return lap;
  });
  return { v: 1, name, laps };
}

export const seconds = (x: number, lang: 'es' | 'en') => `${formatNumber(x, lang, 1, 1)} s`;
export const clock = (ms: number, lang: 'es' | 'en') => new Date(ms).toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function cronoReading(s: CronoSaved, r: DescriptiveResult, t: Messages, lang: 'es' | 'en'): { conclusion: string; warnings: string[] } {
  const d = t.tools.cronometro;
  const name = s.name.trim() || d.defaultName;
  const cv = r.mean > 0 ? r.sd / r.mean : 0;
  const parts = [d.conclusion(name, r.n, seconds(r.mean, lang), seconds(r.min, lang), seconds(r.max, lang)), cv < 0.1 ? d.stable : d.variable(`${formatNumber(cv * 100, lang, 0)} %`)];
  const warnings = r.n < 10 ? [d.warn.few] : [];
  if (r.outliers.length) warnings.push(t.tools.descriptiva.warn.outliers(r.outliers.length));
  return { conclusion: parts.join(' '), warnings };
}

export function cronoSheet(s: CronoSaved, t: Messages, lang: 'es' | 'en', opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.cronometro;
  const sh = d.sheet;
  const c = t.sheet;
  const dur = durations(s.laps);
  const f1 = fixed(1);
  const name = s.name.trim() || d.defaultName;
  return {
    fileTitle: `${sh.file} · ${name} · ${opts.date}`,
    tabTitle: sh.tab,
    heading: `${d.name} · ${name}`,
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
    info: s.laps.length
      ? {
          title: sh.session,
          rows: [
            { label: sh.from, value: new Date(s.laps[0]!.start).toLocaleString(lang === 'es' ? 'es-ES' : 'en-GB') },
            { label: sh.to, value: new Date(s.laps[s.laps.length - 1]!.end).toLocaleString(lang === 'es' ? 'es-ES' : 'en-GB') },
          ],
        }
      : undefined,
    inputs: [],
    table: { labelHead: sh.head, columns: [{ key: 'x', head: sh.durHead, format: f1 }], rows: dur.map((v, i) => ({ label: `${i + 1} · ${clock(s.laps[i]!.start, lang)}`, values: { x: Math.round(v * 1000) / 1000 } })) },
    results: [
      { key: 'n', label: t.tools.descriptiva.n, formula: 'COUNT({x[]})', note: sh.notes.n, format: 'integer' },
      { key: 'mean', label: d.mean, formula: 'AVERAGE({x[]})', note: `s · ${sh.notes.mean}`, format: f1, main: true },
      { key: 'sd', label: d.sd, formula: 'STDEV.S({x[]})', note: `s · ${sh.notes.sd}`, format: fixed(2), summary: true },
      { key: 'min', label: d.min, formula: 'MIN({x[]})', note: `s · ${sh.notes.min}`, format: f1, summary: true },
      { key: 'max', label: d.max, formula: 'MAX({x[]})', note: `s · ${sh.notes.max}`, format: f1 },
      { key: 'median', label: d.median, formula: 'MEDIAN({x[]})', note: `s · ${sh.notes.median}`, format: f1 },
    ],
    reading: opts.reading,
    notes: [c.readingNote],
  };
}

export function cronoSavedSheet(input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  const s = readCronoSaved(input);
  if (!s) return null;
  const r = descriptive(durations(s.laps)).result;
  if (!r) return null;
  const a = cronoReading(s, r, t, lang);
  const reading: ReadingLine[] = [{ tone: 'conclusion', text: a.conclusion }, ...a.warnings.map((w) => ({ tone: 'warning' as const, text: w })), { tone: 'tip', text: t.tools.cronometro.typicalError }];
  return cronoSheet(s, t, lang, { reading, ...opts });
}
