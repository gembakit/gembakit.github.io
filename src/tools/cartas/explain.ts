import { SPC_CONSTANTS } from '../../calc/spc';
import type { Messages } from '../../i18n';
import type { Derivation } from '../../ui/Explained';
import { frac, minus, plus, times } from '../../ui/expr';
import { formatNumber } from '../../ui/number';
import type { CartasSaved } from './model';
import { cartasFormat, type ChartOut } from './reading';

export type CartaKey = 'center' | 'ucl' | 'lcl' | 'bar' | 'secUcl';

/** De dónde salen la línea central, los límites y el rango medio de la carta. */
export function cartasExplain(c: ChartOut, s: CartasSaved, t: Messages, lang: 'es' | 'en'): Record<CartaKey, Derivation> | null {
  const d = t.tools.cartas;
  const x = d.explain;
  const f = cartasFormat(lang, s);
  const rounded = [t.explain.rounded];
  const k3 = (v: number) => formatNumber(v, lang, 3);
  if (c.kind === 'imr') {
    const r = c.out.result;
    if (!r) return null;
    const C = f.val(r.individuals.center);
    const MR = f.val(r.mrBar);
    const d2 = k3(1.128);
    const wMR = { sym: x.mrSym, label: x.mrLabel, value: MR };
    const wX = { sym: x.xSym, label: x.xLabel, value: C };
    const lim = r.limitPoints < r.values.length ? [d.limitNote(r.limitPoints)] : [];
    return {
      center: { title: d.center, meaning: x.centerMeaning, lhs: d.center, steps: [x.xSym, C], where: [wX], notes: [...lim, ...rounded] },
      ucl: {
        title: d.ucl,
        meaning: x.limitMeaning,
        lhs: d.ucl,
        steps: [plus(x.xSym, times('3', frac(x.mrSym, d2))), plus(C, times('3', frac(MR, d2))), f.val(r.individuals.ucl)],
        where: [wX, wMR],
        notes: [...lim, ...rounded],
      },
      lcl: {
        title: d.lcl,
        meaning: x.limitMeaning,
        lhs: d.lcl,
        steps: [minus(x.xSym, times('3', frac(x.mrSym, d2))), minus(C, times('3', frac(MR, d2))), f.val(r.individuals.lcl)],
        where: [wX, wMR],
        notes: [...lim, ...rounded],
      },
      bar: { title: d.mrBar, meaning: x.mrMeaning, lhs: x.mrSym, steps: [MR], where: [wMR], notes: rounded },
      secUcl: {
        title: `${d.ucl} (MR)`,
        meaning: x.limitMeaning,
        lhs: d.ucl,
        steps: [times(k3(3.267), x.mrSym), times(k3(3.267), MR), f.val(r.movingRange.ucl)],
        where: [wMR, { sym: k3(3.267), label: x.d4Label(2) }],
        notes: rounded,
      },
    };
  }
  const r = c.out.result;
  if (!r) return null;
  const k = SPC_CONSTANTS[r.size]!;
  const C = f.val(r.xbar.center);
  const R = f.val(r.rBar);
  const wX = { sym: x.xxSym, label: x.xxLabel, value: C };
  const wR = { sym: x.rSym, label: x.rLabel, value: R };
  const wA2 = { sym: 'A2', label: x.a2Label(r.size), value: k3(k.A2) };
  const lim = r.limitPoints < r.means.length ? [d.limitNote(r.limitPoints)] : [];
  return {
    center: { title: d.center, meaning: x.centerMeaning, lhs: d.center, steps: [x.xxSym, C], where: [wX], notes: [...lim, ...rounded] },
    ucl: {
      title: d.ucl,
      meaning: x.limitMeaning,
      lhs: d.ucl,
      steps: [plus(x.xxSym, times('A2', x.rSym)), plus(C, times(k3(k.A2), R)), f.val(r.xbar.ucl)],
      where: [wX, wA2, wR],
      notes: [...lim, ...rounded],
    },
    lcl: {
      title: d.lcl,
      meaning: x.limitMeaning,
      lhs: d.lcl,
      steps: [minus(x.xxSym, times('A2', x.rSym)), minus(C, times(k3(k.A2), R)), f.val(r.xbar.lcl)],
      where: [wX, wA2, wR],
      notes: [...lim, ...rounded],
    },
    bar: { title: d.rBar, meaning: x.rMeaning, lhs: x.rSym, steps: [R], where: [wR], notes: rounded },
    secUcl: {
      title: `${d.ucl} (R)`,
      meaning: x.limitMeaning,
      lhs: d.ucl,
      steps: [times('D4', x.rSym), times(k3(k.D4), R), f.val(r.range.ucl)],
      where: [wR, { sym: 'D4', label: x.d4Label(r.size), value: k3(k.D4) }],
      notes: rounded,
    },
  };
}
