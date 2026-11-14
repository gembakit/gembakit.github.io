import type { Messages } from '../../i18n';
import { dpmo, type DpmoInput, type DpmoResult } from '../../calc/dpmo';
import type { CalcWarning } from '../../calc/types';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { dpmoFormat } from './explain';
import { dpmoSheet } from './sheet';

// «Cómo leerlo» de DPMO sin pantalla: la usan la herramienta y la hoja del
// proyecto, para que digan siempre lo mismo.

type Field = keyof DpmoInput;

export function dpmoWarnings(list: CalcWarning[], t: Messages): string[] {
  const d = t.tools.dpmo;
  const fieldName = (f: string) => (f in d ? (d[f as Field] as string) : f);
  const text = (w: CalcWarning): string | null => {
    switch (w.code) {
      case 'not-whole':
        return d.warn.notWhole(fieldName(w.field));
      case 'not-positive':
        return d.warn.notPositive(fieldName(w.field));
      case 'negative':
        return d.warn.negative(fieldName(w.field));
      case 'defects-exceed-opportunities':
        return d.warn.exceed;
      case 'zero-defects':
        return d.warn.zeroDefects;
      case 'all-defects':
        return d.warn.allDefects;
      default:
        return null;
    }
  };
  return list.map(text).filter((x): x is string => x !== null);
}

export function dpmoConclusion(r: DpmoResult, t: Messages, lang: 'es' | 'en'): string {
  const d = t.tools.dpmo;
  const fmt = dpmoFormat(lang);
  return r.sigmaLevel !== null ? `${d.conclusion(fmt.dpmo(r.dpmo), fmt.num(r.sigmaLevel, 2))} ${d.shiftNote(fmt.num(r.zLongTerm!, 4))}` : d.conclusionNoSigma(fmt.dpmo(r.dpmo));
}

export function dpmoReadingLines(conclusion: string, warnings: string[], t: Messages): ReadingLine[] {
  return [{ tone: 'conclusion', text: conclusion }, ...warnings.map((w) => ({ tone: 'warning' as const, text: w })), { tone: 'tip', text: t.tools.dpmo.typicalError }];
}

const isInput = (x: unknown): x is DpmoInput =>
  typeof x === 'object' && x !== null && ['units', 'opportunities', 'defects'].every((k) => typeof (x as Record<string, unknown>)[k] === 'number');

/** Hoja de una medición guardada de DPMO; null si sus datos no dan resultado. */
export function dpmoSavedSheet(input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  if (!isInput(input)) return null;
  const out = dpmo(input);
  if (!out.result) return null;
  const reading = dpmoReadingLines(dpmoConclusion(out.result, t, lang), dpmoWarnings(out.warnings, t), t);
  return dpmoSheet(input, t, { reading, ...opts });
}
