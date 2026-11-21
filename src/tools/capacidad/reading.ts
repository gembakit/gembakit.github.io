import type { Messages } from '../../i18n';
import { capability, type CapabilityResult } from '../../calc/capability';
import type { CalcWarning } from '../../calc/types';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { measuredName } from '../descriptiva/model';
import { capacidadFormat } from './explain';
import { readCapacidadSaved, toCapabilityInput, verdict, type CapacidadSaved } from './model';
import { capacidadSheet } from './sheet';

export function capacidadWarnings(list: CalcWarning[], s: CapacidadSaved, t: Messages, lang: 'es' | 'en'): string[] {
  const w = t.tools.capacidad.warn;
  const f = capacidadFormat(lang, s);
  return list
    .map((x) => {
      switch (x.code) {
        case 'no-data':
          return w.noData;
        case 'single-value':
          return w.single;
        case 'no-spec':
          return w.noSpec;
        case 'spec-order':
          return w.specOrder;
        case 'subgroup-size':
          return w.subgroup(x.min, x.max);
        case 'constant':
          return w.constant;
        case 'few-data':
          return w.fewData(x.min);
        case 'not-normal':
          return w.notNormal(f.p(x.p));
        case 'target-outside':
          return w.target;
        case 'unstable-process':
          return w.unstable;
        case 'not-capable':
          return w.notCapable;
        default:
          return null;
      }
    })
    .filter((x): x is string => x !== null);
}

export function capacidadConclusion(r: CapabilityResult, s: CapacidadSaved, t: Messages, lang: 'es' | 'en'): string {
  const d = t.tools.capacidad;
  const f = capacidadFormat(lang, s);
  const parts = [d.conclusion(measuredName(s.name, d.defaultName), f.idx(r.within.cpk), f.idx(r.overall.cpk))];
  const v = verdict(r.within.cpk);
  parts.push(v === 'good' ? d.good : v === 'marginal' ? d.marginal : d.bad);
  if (v !== 'good' && r.within.cp !== null) {
    if (r.within.cp >= 1.33) parts.push(d.centerHint(f.idx(r.within.cp), f.idx(r.within.cpk)));
    else parts.push(d.spreadHint(f.idx(r.within.cp)));
  }
  parts.push(d.ppmSentence(f.ppm(r.overall.ppmTotal)));
  return parts.join(' ');
}

export function capacidadReadingLines(conclusion: string, warnings: string[], t: Messages): ReadingLine[] {
  return [{ tone: 'conclusion', text: conclusion }, ...warnings.map((w) => ({ tone: 'warning' as const, text: w })), { tone: 'tip', text: t.tools.capacidad.typicalError }];
}

export function capacidadSavedSheet(input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  const s = readCapacidadSaved(input);
  if (!s) return null;
  const out = capability(toCapabilityInput(s));
  if (!out.result) return null;
  return capacidadSheet(s, out.result, t, { reading: capacidadReadingLines(capacidadConclusion(out.result, s, t, lang), capacidadWarnings(out.warnings, s, t, lang), t), ...opts });
}
