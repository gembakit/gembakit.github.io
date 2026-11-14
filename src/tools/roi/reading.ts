import type { Messages } from '../../i18n';
import { roi, type RoiResult } from '../../calc/roi';
import type { CalcWarning } from '../../calc/types';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { roiFormat } from './explain';
import { calcInput, isRoiSaved, sums, type RoiSaved } from './model';
import { roiSheet } from './sheet';

// «Cómo leerlo» del ROI sin pantalla: la usan la herramienta y la hoja del
// proyecto, para que digan siempre lo mismo.

export function roiWarnings(list: CalcWarning[], t: Messages): string[] {
  const w = t.tools.roi.warn;
  return list
    .map((x) => {
      switch (x.code) {
        case 'not-positive':
          return x.field === 'horizon' ? w.horizon : w.investment;
        case 'negative':
          return w.newCosts;
        case 'no-data':
          return w.noData;
        case 'no-payback':
          return w.noPayback;
        case 'payback-beyond-horizon':
          return w.beyond;
        default:
          return null;
      }
    })
    .filter((x): x is string => x !== null);
}

export function roiConclusion(s: RoiSaved, r: RoiResult, t: Messages, lang: 'es' | 'en'): string {
  const d = t.tools.roi;
  const f = roiFormat(lang, t, s.currency);
  const parts = [r.payback === null ? d.conclusionNever : d.conclusion(f.span(r.payback))];
  parts.push(d.roiNote(f.years(r.horizon), f.pct(r.roi), f.money(1 + r.roi), f.money(1)));
  const soft = s.mode === 'same' ? sums(s).soft : 0;
  if (soft > 0) parts.push(d.softNote(f.money(soft)));
  return parts.join(' ');
}

export function roiReadingLines(conclusion: string, warnings: string[], t: Messages): ReadingLine[] {
  return [
    { tone: 'conclusion', text: conclusion },
    ...warnings.map((w) => ({ tone: 'warning' as const, text: w })),
    { tone: 'warning', text: t.tools.roi.undiscounted },
    { tone: 'tip', text: t.tools.roi.typicalError },
  ];
}

/** Hoja de una medición guardada de ROI; null si sus datos no dan resultado. */
export function roiSavedSheet(input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  if (!isRoiSaved(input)) return null;
  const out = roi(calcInput(input));
  if (!out.result) return null;
  const reading = roiReadingLines(roiConclusion(input, out.result, t, lang), roiWarnings(out.warnings, t), t);
  return roiSheet(input, out.result, t, { reading, ...opts });
}
