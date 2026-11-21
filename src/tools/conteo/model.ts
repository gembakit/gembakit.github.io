import type { Messages } from '../../i18n';
import { paretoAnalysis } from '../../calc/pareto';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { paretoConclusion, paretoReadingLines, paretoWarnings } from '../pareto/reading';
import { paretoSheet } from '../pareto/sheet';
import type { ParetoSaved } from '../pareto/model';

// Hoja de conteo (docs/fichas/fase-4.md, ficha 2): contadores por categoría.
// El resultado es un Pareto de lo contado (mismo cálculo, gráfico y hoja).

export interface ConteoSaved {
  v: 1;
  title: string;
  items: { name: string; count: number }[];
  /** Cuándo se empezó a contar (ms), o null. */
  startedAt: number | null;
}

export function readConteoSaved(x: unknown): ConteoSaved | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  if (o.v !== 1 || !Array.isArray(o.items)) return null;
  const items = (o.items as unknown[]).flatMap((i) => {
    const r = i as Record<string, unknown> | null;
    return r && typeof r.count === 'number' && Number.isInteger(r.count) && r.count >= 0 ? [{ name: typeof r.name === 'string' ? r.name : '', count: r.count }] : [];
  });
  return { v: 1, title: typeof o.title === 'string' ? o.title : '', items, startedAt: typeof o.startedAt === 'number' ? o.startedAt : null };
}

/** El conteo visto como un Pareto (veces), sin «Otros» al final forzado salvo que se llame así. */
export function asPareto(s: ConteoSaved, t: Messages): ParetoSaved {
  return { v: 1, what: s.title, unit: '', othersLast: true, items: s.items.map((x, i) => ({ name: x.name.trim() || t.tools.conteo.itemName(i + 1), value: x.count })) };
}

/** Cuentas del ejemplo, en el orden de sus nombres en los textos. */
export const TALLY_COUNTS = [14, 9, 22, 4, 6, 3];

export function conteoReading(s: ConteoSaved, t: Messages, lang: 'es' | 'en'): { conclusion: string; warnings: string[]; lines: ReadingLine[] } | null {
  const p = asPareto(s, t);
  const out = paretoAnalysis({ items: p.items, othersLast: t.tools.pareto.othersName });
  if (!out.result) return null;
  const conclusion = paretoConclusion(out.result, t, lang);
  const warnings = paretoWarnings(out.warnings, p, t);
  const lines = paretoReadingLines(conclusion, warnings, t).map((l) => (l.tone === 'tip' ? { ...l, text: t.tools.conteo.typicalError } : l));
  return { conclusion, warnings, lines };
}

export function conteoSavedSheet(input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  const s = readConteoSaved(input);
  if (!s) return null;
  const a = conteoReading(s, t, lang);
  if (!a) return null;
  const p = asPareto(s, t);
  const r = paretoAnalysis({ items: p.items, othersLast: t.tools.pareto.othersName }).result!;
  const def = paretoSheet(p, r, t, { reading: a.lines, ...opts });
  return { ...def, heading: s.title.trim() ? `${t.tools.conteo.name} · ${s.title.trim()}` : t.tools.conteo.name };
}
