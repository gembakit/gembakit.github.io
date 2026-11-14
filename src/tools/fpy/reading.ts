import type { Messages } from '../../i18n';
import { fpyRty, type FpyResult } from '../../calc/fpy';
import type { CalcWarning } from '../../calc/types';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { formatPercent } from '../../ui/number';
import { fpySheet, type NamedStep } from './sheet';

// «Cómo leerlo» de FPY y RTY sin pantalla: la usan la herramienta y la hoja
// del proyecto, para que digan siempre lo mismo.

/** Datos de FPY guardados en un proyecto: el modo y cada paso (FPY de 0 a 1). */
export interface FpySaved {
  mode: 'counts' | 'direct';
  steps: { name: string; entering?: number; good?: number; fpy?: number }[];
}

export function fpyWarnings(list: CalcWarning[], stepName: (i: number) => string, t: Messages): string[] {
  const d = t.tools.fpy;
  const text = (w: CalcWarning): string | null => {
    switch (w.code) {
      case 'step-not-whole':
        return d.warn.notWhole(stepName(w.step));
      case 'step-no-input':
        return d.warn.noInput(stepName(w.step));
      case 'step-negative':
        return d.warn.negative(stepName(w.step));
      case 'good-exceed-entering':
        return d.warn.exceed(stepName(w.step));
      case 'fpy-out-of-range':
        return d.warn.outOfRange(stepName(w.step));
      default:
        return null;
    }
  };
  return list.map(text).filter((x): x is string => x !== null);
}

/** Conclusión, con el paso que más resta si hay varios. */
export function fpyConclusion(r: FpyResult, stepName: (i: number) => string, t: Messages, lang: 'es' | 'en'): string {
  const d = t.tools.fpy;
  const conclusion = d.conclusion(formatPercent(r.rty, lang));
  return r.fpy.length > 1 ? `${conclusion} ${d.worstNote(stepName(r.worst), formatPercent(r.fpy[r.worst]!, lang))}` : conclusion;
}

export function fpyReadingLines(conclusion: string, warnings: string[], t: Messages): ReadingLine[] {
  return [{ tone: 'conclusion', text: conclusion }, ...warnings.map((w) => ({ tone: 'warning' as const, text: w })), { tone: 'tip', text: t.tools.fpy.typicalError }];
}

/** Pasos con nombre a partir de lo guardado (sin nombre: «Paso n»). */
export function savedSteps(saved: FpySaved, t: Messages): NamedStep[] {
  return saved.steps.map((s, i) => ({
    name: s.name.trim() || t.tools.fpy.stepName(i + 1),
    step: saved.mode === 'counts' ? { entering: s.entering ?? 0, good: s.good ?? 0 } : { fpy: s.fpy ?? 0 },
  }));
}

const isSaved = (x: unknown): x is FpySaved =>
  typeof x === 'object' && x !== null && ((x as FpySaved).mode === 'counts' || (x as FpySaved).mode === 'direct') && Array.isArray((x as FpySaved).steps);

/** Hoja de una medición guardada de FPY; null si sus datos no dan resultado. */
export function fpySavedSheet(input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  if (!isSaved(input) || input.steps.length === 0) return null;
  const steps = savedSteps(input, t);
  const out = fpyRty(steps.map((s) => s.step));
  if (!out.result) return null;
  const name = (i: number) => steps[i]?.name ?? t.tools.fpy.stepName(i + 1);
  const reading = fpyReadingLines(fpyConclusion(out.result, name, t, lang), fpyWarnings(out.warnings, name, t), t);
  return fpySheet(steps, t, { reading, ...opts });
}
