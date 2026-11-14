import type { Messages } from '../../i18n';
import { kanban, type KanbanResult } from '../../calc/kanban';
import type { CalcWarning } from '../../calc/types';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { formatNumber } from '../../ui/number';
import { leadOf, type KanbanSaved } from './explain';
import { kanbanSheet } from './sheet';

// «Cómo leerlo» de kanban sin pantalla: la usan la herramienta y la hoja del
// proyecto, para que digan siempre lo mismo.

export function kanbanWarnings(list: CalcWarning[], t: Messages): string[] {
  const d = t.tools.kanban;
  const name = (f: string) => (f === 'demand' ? d.demand : f === 'size' ? d.size : d.leadLabel);
  return list
    .map((x) => {
      switch (x.code) {
        case 'not-positive':
          return d.warn.notPositive(name(x.field));
        case 'negative':
          return d.warn.negative;
        case 'no-safety':
          return d.warn.noSafety;
        default:
          return null;
      }
    })
    .filter((x): x is string => x !== null);
}

export function kanbanConclusion(r: KanbanResult, t: Messages, lang: 'es' | 'en'): string {
  const d = t.tools.kanban;
  const parts = [d.conclusion(r.cards, formatNumber(r.pieces, lang, 4))];
  if (Math.abs(r.raw - r.cards) > 1e-9) parts.push(d.rawNote(formatNumber(r.raw, lang, 2)));
  return parts.join(' ');
}

export function kanbanReadingLines(conclusion: string, warnings: string[], t: Messages): ReadingLine[] {
  return [{ tone: 'conclusion', text: conclusion }, ...warnings.map((w) => ({ tone: 'warning' as const, text: w })), { tone: 'tip', text: t.tools.kanban.typicalError }];
}

export const calcInput = (s: KanbanSaved) => ({ demand: s.demand, lead: leadOf(s), safety: s.safetyPct / 100, size: s.size });

const isSaved = (x: unknown): x is KanbanSaved => {
  const s = x as KanbanSaved;
  return typeof s === 'object' && s !== null && ['min', 'h', 'day'].includes(s.unit) && ['split', 'total'].includes(s.mode) && typeof s.demand === 'number' && typeof s.size === 'number' && typeof s.safetyPct === 'number';
};

/** Hoja de una medición guardada de kanban; null si sus datos no dan resultado. */
export function kanbanSavedSheet(input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  if (!isSaved(input)) return null;
  const out = kanban(calcInput(input));
  if (!out.result) return null;
  return kanbanSheet(input, t, { reading: kanbanReadingLines(kanbanConclusion(out.result, t, lang), kanbanWarnings(out.warnings, t), t), ...opts });
}
