import type { Messages } from '../../i18n';
import { paretoAnalysis, type ParetoResult } from '../../calc/pareto';
import type { CalcWarning } from '../../calc/types';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { formatNumber } from '../../ui/number';
import { itemName, readParetoSaved, toParetoInput, type ParetoSaved } from './model';
import { paretoSheet } from './sheet';

// «Cómo leerlo» del Pareto, común a la pantalla y a la hoja.

export function paretoFormat(lang: 'es' | 'en') {
  return {
    value: (x: number) => formatNumber(x, lang, 2),
    pct: (x: number) => `${formatNumber(x * 100, lang, 1)} %`,
  };
}

export function paretoWarnings(list: CalcWarning[], s: ParetoSaved, t: Messages): string[] {
  const w = t.tools.pareto.warn;
  return list
    .map((x) => {
      switch (x.code) {
        case 'step-negative':
          return w.negative(itemName(t, s, x.step));
        case 'no-data':
          return w.noData;
        case 'few-categories':
          return w.few;
        case 'many-categories':
          return w.many;
        case 'flat-pareto':
          return w.flat;
        default:
          return null;
      }
    })
    .filter((x): x is string => x !== null);
}

/** Nombres en una frase: «A, B y C». */
export function listNames(names: string[], lang: 'es' | 'en'): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} ${lang === 'es' ? 'y' : 'and'} ${names[names.length - 1]}`;
}

export function paretoConclusion(r: ParetoResult, t: Messages, lang: 'es' | 'en'): string {
  const d = t.tools.pareto;
  const f = paretoFormat(lang);
  const vital = r.rows.filter((x) => x.vital);
  if (r.rows.length >= 4 && r.vital / r.rows.length > 0.6) return d.conclusionFlat(f.pct(r.rows[0]!.share));
  return d.conclusion(vital.length, listNames(vital.map((x) => x.name), lang), f.pct(vital[vital.length - 1]!.cumulative));
}

export function paretoReadingLines(conclusion: string, warnings: string[], t: Messages): ReadingLine[] {
  return [{ tone: 'conclusion', text: conclusion }, ...warnings.map((w) => ({ tone: 'warning' as const, text: w })), { tone: 'tip', text: t.tools.pareto.typicalError }];
}

export function paretoSavedSheet(input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  const s = readParetoSaved(input);
  if (!s) return null;
  const out = paretoAnalysis(toParetoInput(s, t));
  if (!out.result) return null;
  return paretoSheet(s, out.result, t, { reading: paretoReadingLines(paretoConclusion(out.result, t, lang), paretoWarnings(out.warnings, s, t), t), ...opts });
}
