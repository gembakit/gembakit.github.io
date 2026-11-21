import type { Messages } from '../../i18n';
import { descriptive, type DescriptiveResult } from '../../calc/descriptive';
import type { CalcWarning } from '../../calc/types';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { descriptivaFormat } from './explain';
import { descriptivaName, readDescriptivaSaved, unitSuffix, type DescriptivaSaved } from './model';
import { descriptivaSheet } from './sheet';

// «Cómo leerlo» de la estadística descriptiva, común a la pantalla y a la hoja.

export function descriptivaWarnings(list: CalcWarning[], s: DescriptivaSaved, t: Messages, lang: 'es' | 'en'): string[] {
  const w = t.tools.descriptiva.warn;
  const f = descriptivaFormat(lang, s.values, s.unit);
  return list
    .map((x) => {
      switch (x.code) {
        case 'no-data':
          return w.noData;
        case 'single-value':
          return w.single;
        case 'constant':
          return w.constant;
        case 'few-data':
          return w.fewData(x.min);
        case 'not-normal':
          return w.notNormal(f.p(x.p));
        case 'outliers':
          return w.outliers(x.count);
        default:
          return null;
      }
    })
    .filter((x): x is string => x !== null);
}

export function descriptivaConclusion(r: DescriptiveResult, s: DescriptivaSaved, t: Messages, lang: 'es' | 'en'): string {
  const d = t.tools.descriptiva;
  const f = descriptivaFormat(lang, s.values, s.unit);
  const u = unitSuffix(s.unit);
  const parts = [d.conclusion(descriptivaName(t, s), f.val(r.mean), f.val(r.sd), u), d.medianNote(f.val(r.median), u)];
  if (r.normality) {
    if (r.normality.p >= 0.05) parts.push(d.normalSentence(f.p(r.normality.p)), d.spread(f.val(r.mean - r.sd), f.val(r.mean + r.sd), u));
    else parts.push(d.notNormalSentence(f.p(r.normality.p)));
  }
  return parts.join(' ');
}

export function descriptivaReadingLines(conclusion: string, warnings: string[], t: Messages): ReadingLine[] {
  return [{ tone: 'conclusion', text: conclusion }, ...warnings.map((w) => ({ tone: 'warning' as const, text: w })), { tone: 'tip', text: t.tools.descriptiva.typicalError }];
}

export function descriptivaSavedSheet(input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  const s = readDescriptivaSaved(input);
  if (!s) return null;
  const out = descriptive(s.values);
  if (!out.result) return null;
  const reading = descriptivaReadingLines(descriptivaConclusion(out.result, s, t, lang), descriptivaWarnings(out.warnings, s, t, lang), t);
  return descriptivaSheet(s, out.result, t, lang, { reading, ...opts });
}
