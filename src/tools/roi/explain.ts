import { yearsMonths, type RoiResult } from '../../calc/roi';
import type { Messages } from '../../i18n';
import type { Derivation } from '../../ui/Explained';
import { frac, minus, plus, times, type Expr } from '../../ui/expr';
import { formatNumber, formatPercent } from '../../ui/number';
import { lineValue, sums, type RoiLine, type RoiSaved } from './model';

/** Cómo se muestra cada valor en pantalla: la ventana usa exactamente lo mismo. */
export function roiFormat(lang: 'es' | 'en', t: Messages, currency: string) {
  const d = t.tools.roi;
  // Los negativos con el signo menos de verdad (−), no con el guion.
  const minusSign = (s: string) => s.replace(/^-/, '−');
  const num = (x: number, dec = 2) => minusSign(formatNumber(x, lang, dec));
  return {
    num,
    money: (x: number) => `${num(x, 2)} ${currency.trim()}`.trim(),
    pct: (x: number) => `${minusSign(formatPercent(x, lang))} %`,
    years: (x: number) => d.years(num(x, 2), x === 1),
    span: (x: number) => {
      const { years, months } = yearsMonths(x);
      return d.yearsMonths(years, months);
    },
  };
}

/** Suma abreviada si hay muchos términos: a + b + … + z. */
function sumOf(items: Expr[]): Expr {
  return items.length <= 5 ? plus(...items) : plus(items[0]!, items[1]!, '…', items[items.length - 1]!);
}

export type RoiKey = 'net' | 'payback' | 'total' | 'roi';

/** De dónde sale cada valor del ROI, con los números del usuario. */
export function roiExplain(s: RoiSaved, r: RoiResult, t: Messages, lang: 'es' | 'en'): Record<RoiKey, Derivation | null> {
  const d = t.tools.roi;
  const x = d.explain;
  const f = roiFormat(lang, t, s.currency);
  const I = f.money(s.investment);
  const CN = f.money(s.newCosts);
  const wI = { sym: x.invSym, label: d.investment, value: I };
  const wCN = { sym: x.costsSym, label: d.newCosts, value: CN };
  const yearly = s.mode === 'yearly';
  const hard = sums(s).hard;
  const net = r.net[0] ?? 0;
  const wNet = { sym: x.netSym, label: d.netAnnual, value: f.money(net) };
  const H = f.years(r.horizon);
  const rounded = [t.explain.rounded];
  // «3,67 años = 3 años y 8 meses»; si son años justos, una sola vez.
  const withSpan = (p: number) => (f.span(p) === f.years(p) ? [f.years(p)] : [f.years(p), f.span(p)]);

  const netD: Derivation | null = yearly
    ? null
    : {
        title: d.netAnnual,
        meaning: x.netMeaning,
        lhs: d.netAnnual,
        steps: [minus(x.hardSym, x.costsSym), minus(f.money(hard), CN), f.money(net)],
        where: [{ sym: x.hardSym, label: x.hardLabel, value: f.money(hard) }, wCN],
      };

  let paybackD: Derivation | null = null;
  if (r.payback !== null) {
    if (!yearly) {
      paybackD = {
        term: 'payback',
        lhs: d.payback,
        steps: [frac(x.invSym, x.netSym), frac(I, f.money(net)), ...withSpan(r.payback)],
        where: [wI, wNet],
        notes: rounded,
      };
    } else {
      const k = Math.floor(r.payback + 1e-9 >= r.net.length ? r.net.length - 1 : r.payback);
      const done = r.net.slice(0, k).reduce((a, b) => a + b, 0);
      const nk = r.net[k]!;
      paybackD = {
        term: 'payback',
        lhs: d.payback,
        steps: [plus(String(k), frac(minus(x.invSym, 'Σ'), `A${k + 1}`)), plus(String(k), frac(minus(I, f.money(done)), f.money(nk))), ...withSpan(r.payback)],
        where: [wI, { sym: 'Σ', label: x.cumulative(k, f.money(done), f.money(nk)), value: f.money(done) }, { sym: `A${k + 1}`, label: d.year(k + 1), value: f.money(nk) }],
        notes: [x.yearlyNote, ...rounded],
      };
    }
  }

  const totalD: Derivation = yearly
    ? {
        title: d.total(H),
        lhs: x.totalSym,
        steps: [sumOf(r.net.map((_, i) => `A${i + 1}`)), sumOf(r.net.map((v) => f.money(v))), f.money(r.total)],
        where: r.net.map((v, i) => ({ sym: `A${i + 1}`, label: d.year(i + 1), value: f.money(v) })).slice(0, 6),
        notes: [x.yearlyNote],
      }
    : {
        title: d.total(H),
        lhs: x.totalSym,
        steps: [times(x.netSym, x.horizonSym), times(f.money(net), f.num(r.horizon, 2)), f.money(r.total)],
        where: [wNet, { sym: x.horizonSym, label: d.horizon, value: H }],
      };

  const roiD: Derivation = {
    term: 'roi',
    lhs: 'ROI',
    steps: [frac(minus(x.totalSym, x.invSym), x.invSym), frac(minus(f.money(r.total), I), I), f.pct(r.roi)],
    where: [{ sym: x.totalSym, label: d.total(H), value: f.money(r.total) }, wI],
    notes: rounded,
  };

  return { net: netD, payback: paybackD, total: totalD, roi: roiD };
}

/** De dónde sale el ahorro de una línea por unidad o por tiempo (las directas no se calculan). */
export function lineExplain(l: RoiLine, name: string, t: Messages, lang: 'es' | 'en', currency: string): Derivation | null {
  const d = t.tools.roi;
  const x = d.explain;
  const f = roiFormat(lang, t, currency);
  const v = f.money(lineValue(l));
  if (l.how === 'unit') {
    const Ca = f.money(l.before ?? 0);
    const Cd = f.money(l.after ?? 0);
    const U = f.num(l.units ?? 0);
    return {
      title: name,
      meaning: x.lineMeaning,
      lhs: name,
      steps: [times(minus(x.beforeSym, x.afterSym), x.unitsSym), times(minus(Ca, Cd), U), v],
      where: [
        { sym: x.beforeSym, label: d.before, value: Ca },
        { sym: x.afterSym, label: d.after, value: Cd },
        { sym: x.unitsSym, label: d.units, value: U },
      ],
    };
  }
  if (l.how === 'time') {
    const h = f.num(l.hours ?? 0);
    const Ch = f.money(l.rate ?? 0);
    return {
      title: name,
      meaning: x.lineMeaning,
      lhs: name,
      steps: [times(x.hoursSym, x.rateSym), times(h, Ch), v],
      where: [
        { sym: x.hoursSym, label: d.hours, value: h },
        { sym: x.rateSym, label: d.rate, value: Ch },
      ],
    };
  }
  return null;
}
