import type { Messages } from '../../i18n';
import { biggestLoss, oee, type OeeInput, type OeeResult } from '../../calc/oee';
import type { CalcWarning } from '../../calc/types';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { formatNumber } from '../../ui/number';
import { oeeSheet } from './sheet';

// «Cómo leerlo» del OEE sin pantalla: la usan la herramienta y la hoja del
// proyecto, para que digan siempre lo mismo.

const FIELDS = ['shift', 'plannedStops', 'unplannedStops', 'idealCycle', 'total', 'rejects'] as const;

export function oeeWarnings(list: CalcWarning[], t: Messages): string[] {
  const d = t.tools.oee;
  const w = d.warn;
  const name = (f: string) => (FIELDS as readonly string[]).includes(f) ? (d[f as (typeof FIELDS)[number]] as string) : f;
  return list
    .map((x) => {
      switch (x.code) {
        case 'not-positive':
          return w.notPositive(name(x.field));
        case 'negative':
          return w.negative(name(x.field));
        case 'not-whole':
          return w.notWhole(name(x.field));
        case 'stops-exceed-time':
          return w.stops;
        case 'rejects-exceed-total':
          return w.rejects;
        case 'performance-over-100':
          return w.performance;
        default:
          return null;
      }
    })
    .filter((x): x is string => x !== null);
}

export function oeeConclusion(r: OeeResult, t: Messages, lang: 'es' | 'en'): string {
  const d = t.tools.oee;
  const loss = biggestLoss(r);
  return `${d.conclusion(formatNumber(r.oee * 60, lang, 1))} ${d.biggest(d.lossNames[loss]!, formatNumber(r.minutes[loss], lang, 1))}`;
}

export function oeeReadingLines(conclusion: string, warnings: string[], t: Messages): ReadingLine[] {
  return [{ tone: 'conclusion', text: conclusion }, ...warnings.map((w) => ({ tone: 'warning' as const, text: w })), { tone: 'tip', text: t.tools.oee.typicalError }];
}

const isInput = (x: unknown): x is OeeInput => typeof x === 'object' && x !== null && FIELDS.every((k) => typeof (x as Record<string, unknown>)[k] === 'number');

/** Hoja de una medición guardada de OEE; null si sus datos no dan resultado. */
export function oeeSavedSheet(input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  if (!isInput(input)) return null;
  const out = oee(input);
  if (!out.result) return null;
  return oeeSheet(input, t, { reading: oeeReadingLines(oeeConclusion(out.result, t, lang), oeeWarnings(out.warnings, t), t), ...opts });
}
