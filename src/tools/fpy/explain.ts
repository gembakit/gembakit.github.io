import type { FpyResult } from '../../calc/fpy';
import type { Messages } from '../../i18n';
import { findTerm } from '../../reference/glossary';
import { subscript, type Derivation } from '../../ui/Explained';
import { frac, minus, times } from '../../ui/expr';
import { formatNumber, formatPercent } from '../../ui/number';
import type { NamedStep } from './sheet';

/** Más de esto, la fórmula con letras se abrevia: FPY₁ × FPY₂ × … × FPY₉. */
const MAX_LISTED = 5;

/** De dónde sale el FPY de cada paso, el RTY y la fábrica oculta, con los números del usuario. */
export function fpyExplain(steps: NamedStep[], r: FpyResult, t: Messages, lang: 'es' | 'en'): { step: Derivation[]; rty: Derivation; hidden: Derivation } {
  const x = t.tools.fpy.explain;
  const pct = (v: number) => `${formatPercent(v, lang)} %`;
  const count = (v: number) => formatNumber(v, lang, 4);
  const n = r.fpy.length;
  const sym = (i: number) => `FPY${subscript(i + 1)}`;

  const step = steps.map(({ name, step: s }, i): Derivation => {
    const base = { term: 'fpy', title: x.stepTitle(name), lhs: 'FPY' };
    if ('fpy' in s) return { ...base, steps: [pct(r.fpy[i]!)], where: [], notes: [x.direct] };
    return {
      ...base,
      steps: [frac(x.goodSym, x.enteringSym), frac(count(s.good), count(s.entering)), pct(r.fpy[i]!)],
      where: [
        { sym: x.goodSym, label: x.goodLabel, value: count(s.good) },
        { sym: x.enteringSym, label: x.enteringLabel, value: count(s.entering) },
      ],
    };
  });

  const letters = n <= MAX_LISTED ? times(...r.fpy.map((_, i) => sym(i))) : times(sym(0), sym(1), '…', sym(n - 1));
  const rty: Derivation = {
    term: 'rty',
    lhs: 'RTY',
    steps: n === 1 ? [sym(0), pct(r.rty)] : [letters, times(...r.fpy.map(pct)), pct(r.rty)],
    where: r.fpy.map((f, i) => ({ sym: sym(i), label: steps[i]?.name ?? '', value: pct(f) })),
    notes: n > 1 ? [t.explain.rounded] : undefined,
  };

  const hidden: Derivation = {
    term: 'fabrica-oculta',
    lhs: x.hiddenSym,
    steps: [minus('1', 'RTY'), minus('100 %', pct(r.rty)), pct(r.hiddenFactory)],
    where: [{ sym: 'RTY', label: findTerm('rty')?.[lang].name ?? 'RTY', value: pct(r.rty) }],
  };

  return { step, rty, hidden };
}
