import type { Messages } from '../../i18n';
import { biggestLoss, furthestFactor, oee, pareto, utilization, WORLD_CLASS, type OeeResult } from '../../calc/oee';
import type { CalcWarning } from '../../calc/types';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { formatNumber } from '../../ui/number';
import { oeeFormat, oeeLook } from './explain';
import { categoryName, isOfficial, plannedName, readOeeSaved, stopName, toOeeInput, utilizationLabel, type OeeSaved } from './model';
import { oeeSheet } from './sheet';

// «Cómo leerlo» del OEE sin pantalla: la usan la herramienta y la hoja del
// proyecto, para que digan siempre lo mismo.

export function oeeWarnings(list: CalcWarning[], s: OeeSaved, t: Messages): string[] {
  const d = t.tools.oee;
  const w = d.warn;
  const field = (f: string) => (f === 'idealCycle' ? d.ideal : f === 'shift' ? d.shift : f === 'total' ? d.total : f === 'rejects' ? d.rejects : f);
  return list
    .map((x) => {
      switch (x.code) {
        case 'not-positive':
          return w.notPositive(field(x.field));
        case 'negative':
          return w.negative(field(x.field));
        case 'not-whole':
          return w.notWhole(field(x.field));
        case 'deduction-not-positive':
          return w.planned(plannedName(s, x.step, t));
        case 'step-not-positive':
          return w.stop(stopName(s, x.step, t));
        case 'standard-not-positive':
          return w.standard(stopName(s, x.step, t));
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

export function oeeConclusion(r: OeeResult, s: OeeSaved, t: Messages, lang: 'es' | 'en'): string {
  const d = t.tools.oee;
  const f = oeeFormat(lang, oeeLook(s, t));
  const one = (x: number) => formatNumber(x, lang, 1);
  const loss = biggestLoss(r);
  const parts = [d.conclusion(one(r.oee * 60)), d.biggest(d.lossNames[loss]!, one(r.minutes[loss]))];
  // La categoría que más pesa, si hay paradas repartidas en más de una.
  const cats = pareto(r.byCategory.map((minutes, key) => ({ key, minutes })));
  if (cats.length > 1) parts.push(d.topCategory(categoryName(s, cats[0]!.key, t), one(cats[0]!.minutes), formatNumber(cats[0]!.share * 100, lang, 0) + '\u00a0%'));
  if (r.standard > 0) {
    const withStd = s.stops.reduce((a, x) => a + (x.standard !== null ? x.minutes : 0), 0);
    parts.push(d.excessSentence(one(withStd), one(r.standard), one(r.excess)));
  }
  // La utilización de la torta, salvo cuando coincide con el OEE oficial.
  if (!isOfficial(s, r)) parts.push(d.utilizationSentence(utilizationLabel(s, r, t), f.pct(utilization(r, s.off).value)));
  const k = furthestFactor(r);
  parts.push(d.furthestSentence(d.factorNames[k]!, f.share(r[k]), `${formatNumber(WORLD_CLASS[k] * 100, lang, 0)}\u00a0%`));
  return parts.join(' ');
}

export function oeeReadingLines(conclusion: string, warnings: string[], t: Messages): ReadingLine[] {
  return [{ tone: 'conclusion', text: conclusion }, ...warnings.map((w) => ({ tone: 'warning' as const, text: w })), { tone: 'tip', text: t.tools.oee.typicalError }];
}

/** Hoja de una medición guardada de OEE; null si sus datos no dan resultado. */
export function oeeSavedSheet(input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  const s = readOeeSaved(input, t);
  if (!s) return null;
  const out = oee(toOeeInput(s));
  if (!out.result) return null;
  return oeeSheet(s, out.result, t, lang, { reading: oeeReadingLines(oeeConclusion(out.result, s, t, lang), oeeWarnings(out.warnings, s, t), t), ...opts });
}

