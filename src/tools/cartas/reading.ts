import type { Messages } from '../../i18n';
import { imr, xbarR, type ImrResult, type SpcSignal, type XbarRResult } from '../../calc/spc';
import type { CalcOutput, CalcWarning } from '../../calc/types';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { descriptivaFormat } from '../descriptiva/explain';
import { measuredName } from '../descriptiva/model';
import { readCartasSaved, type CartasSaved } from './model';
import { cartasSheet } from './sheet';

export type ChartOut = { kind: 'imr'; out: CalcOutput<ImrResult> } | { kind: 'xbarr'; out: CalcOutput<XbarRResult> };

export function runCharts(s: CartasSaved): ChartOut {
  const opts = { limitPoints: s.limitPoints ?? undefined, tests: s.tests };
  return s.kind === 'imr' ? { kind: 'imr', out: imr(s.values, opts) } : { kind: 'xbarr', out: xbarR(s.values, s.subgroup, opts) };
}

export const cartasFormat = (lang: 'es' | 'en', s: CartasSaved) => descriptivaFormat(lang, s.values, s.unit);

/** «3, 7 y 12». */
function list(nums: number[], lang: 'es' | 'en'): string {
  const s = nums.map((n) => String(n + 1));
  return s.length <= 1 ? s.join('') : `${s.slice(0, -1).join(', ')} ${lang === 'es' ? 'y' : 'and'} ${s[s.length - 1]}`;
}

/** Cada señal con palabras: qué prueba y en qué puntos. */
export function signalLines(c: ChartOut, t: Messages, lang: 'es' | 'en'): string[] {
  const d = t.tools.cartas;
  if (!c.out.result) return [];
  const points = (nums: number[]) => (c.kind === 'imr' ? d.pointsList(list(nums, lang)) : d.groupsList(list(nums, lang)));
  const main: SpcSignal[] = c.kind === 'imr' ? c.out.result.signalsI : c.out.result.signalsX;
  const lines = main.map((x) => d.signalLine(d.testNames[String(x.test)]!, points(x.points)));
  const sec = c.kind === 'imr' ? c.out.result.signalsMR : c.out.result.signalsR;
  for (const x of sec) lines.push(c.kind === 'imr' ? d.mrSignal(points(x.points)) : d.rangeSignal(points(x.points)));
  return lines;
}

export function cartasWarnings(list: CalcWarning[], t: Messages): string[] {
  const w = t.tools.cartas.warn;
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
        case 'subgroup-size':
          return w.subgroup(x.min, x.max);
        case 'few-subgroups':
          return w.fewSubgroups(x.min);
        case 'leftover':
          return w.leftover(x.count);
        default:
          return null;
      }
    })
    .filter((x): x is string => x !== null);
}

/** Puntos (o subgrupos) distintos con alguna señal. */
export function flaggedCount(c: ChartOut): number {
  if (!c.out.result) return 0;
  const sigs = c.kind === 'imr' ? [...c.out.result.signalsI, ...c.out.result.signalsMR] : [...c.out.result.signalsX, ...c.out.result.signalsR];
  return new Set(sigs.flatMap((x) => x.points)).size;
}

export function cartasConclusion(c: ChartOut, s: CartasSaved, t: Messages, lang: 'es' | 'en'): string {
  const d = t.tools.cartas;
  const f = cartasFormat(lang, s);
  const name = measuredName(s.name, d.defaultName);
  const n = flaggedCount(c);
  if (n) return d.conclusionUnstable(name, n);
  const l = c.kind === 'imr' ? c.out.result!.individuals : c.out.result!.xbar;
  return d.conclusionStable(name, f.val(l.center), f.val(l.lcl), f.val(l.ucl));
}

export function cartasReadingLines(conclusion: string, signals: string[], warnings: string[], t: Messages): ReadingLine[] {
  return [
    { tone: 'conclusion', text: conclusion },
    ...signals.map((x) => ({ tone: 'warning' as const, text: x })),
    ...warnings.map((w) => ({ tone: 'warning' as const, text: w })),
    { tone: 'tip', text: t.tools.cartas.typicalError },
  ];
}

export function cartasSavedSheet(input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  const s = readCartasSaved(input);
  if (!s) return null;
  const c = runCharts(s);
  if (!c.out.result) return null;
  const reading = cartasReadingLines(cartasConclusion(c, s, t, lang), signalLines(c, t, lang), cartasWarnings(c.out.warnings, t), t);
  return cartasSheet(s, c, t, { reading, ...opts });
}
