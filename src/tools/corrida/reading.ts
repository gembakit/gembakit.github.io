import type { Messages } from '../../i18n';
import { runChart, type RunChartResult } from '../../calc/runchart';
import type { CalcWarning } from '../../calc/types';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { descriptivaFormat } from '../descriptiva/explain';
import { measuredName, unitSuffix } from '../descriptiva/model';
import { readCorridaSaved, type CorridaSaved } from './model';
import { corridaSheet } from './sheet';

// «Cómo leerlo» del gráfico de corrida, común a la pantalla y a la hoja.

export const corridaFormat = (lang: 'es' | 'en', s: CorridaSaved) => descriptivaFormat(lang, s.values, s.unit);

/** Cada señal con palabras: «Desplazamiento hacia abajo: 12 puntos seguidos… (del 13 al 24)». */
export function signalTexts(r: RunChartResult, t: Messages, lang: 'es' | 'en'): string[] {
  const d = t.tools.corrida;
  const f = descriptivaFormat(lang, [], '');
  const out = r.signals.map((s) => {
    const from = s.points[0]! + 1;
    const to = s.points[s.points.length - 1]! + 1;
    if (s.kind === 'shift') return s.direction === 1 ? d.shiftUp(from, to, s.points.length) : d.shiftDown(from, to, s.points.length);
    return s.direction === 1 ? d.trendUp(from, to) : d.trendDown(from, to);
  });
  if (r.pFew !== null && r.pFew < 0.05) out.push(d.fewRuns(f.p(r.pFew)));
  if (r.pMany !== null && r.pMany < 0.05) out.push(d.manyRuns(f.p(r.pMany)));
  return out;
}

export function corridaWarnings(list: CalcWarning[], t: Messages): string[] {
  const w = t.tools.corrida.warn;
  return list
    .map((x) => {
      switch (x.code) {
        case 'no-data':
          return w.noData;
        case 'single-value':
          return w.single;
        case 'few-data':
          return w.fewData(x.min);
        default:
          return null;
      }
    })
    .filter((x): x is string => x !== null);
}

export function corridaConclusion(r: RunChartResult, s: CorridaSaved, t: Messages, lang: 'es' | 'en'): string {
  const d = t.tools.corrida;
  const f = corridaFormat(lang, s);
  const name = measuredName(s.name, d.defaultName);
  const n = signalTexts(r, t, lang).length;
  const u = unitSuffix(s.unit);
  return n ? d.conclusionSome(name, f.val(r.median), u, n) : d.conclusionNone(name, f.val(r.median), u);
}

export function corridaReadingLines(conclusion: string, signals: string[], warnings: string[], t: Messages): ReadingLine[] {
  return [
    { tone: 'conclusion', text: conclusion },
    ...signals.map((x) => ({ tone: 'warning' as const, text: x })),
    ...warnings.map((w) => ({ tone: 'warning' as const, text: w })),
    { tone: 'tip', text: t.tools.corrida.typicalError },
  ];
}

export function corridaSavedSheet(input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  const s = readCorridaSaved(input);
  if (!s) return null;
  const out = runChart(s.values);
  if (!out.result) return null;
  const reading = corridaReadingLines(corridaConclusion(out.result, s, t, lang), signalTexts(out.result, t, lang), corridaWarnings(out.warnings, t), t);
  return corridaSheet(s, t, { reading, ...opts });
}
