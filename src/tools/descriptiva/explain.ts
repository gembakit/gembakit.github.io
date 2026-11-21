import type { DescriptiveResult } from '../../calc/descriptive';
import type { Messages } from '../../i18n';
import type { Derivation } from '../../ui/Explained';
import { fn, frac, minus, paren, plus, times } from '../../ui/expr';
import { formatNumber, formatSignificant } from '../../ui/number';
import { dataDecimals, unitSuffix } from './model';

/** Cómo se muestra cada valor: con dos decimales más que los datos. */
export function descriptivaFormat(lang: 'es' | 'en', values: readonly number[], unit: string) {
  const d = Math.min(8, dataDecimals(values) + 2);
  const u = unitSuffix(unit);
  return {
    d,
    /** Un valor en las unidades de los datos. */
    val: (x: number) => formatNumber(x, lang, d),
    withUnit: (x: number) => `${formatNumber(x, lang, d)}${u}`,
    /** Un dato tal como es. */
    raw: (x: number) => formatNumber(x, lang, 10),
    count: (x: number) => formatNumber(x, lang, 0),
    stat: (x: number) => formatNumber(x, lang, 3),
    /** Valor p con su signo: «= 0,255» o «< 0,001». */
    p: (x: number) => (x < 0.001 ? (lang === 'es' ? '< 0,001' : '< 0.001') : `= ${formatNumber(x, lang, 3, 3)}`),
    big: (x: number) => formatSignificant(x, lang, 8),
  };
}

export type DescriptivaKey = 'mean' | 'sd' | 'median' | 'q1' | 'q3' | 'se' | 'ad';

export function descriptivaExplain(values: readonly number[], r: DescriptiveResult, unit: string, t: Messages, lang: 'es' | 'en'): Record<DescriptivaKey, Derivation | null> {
  const d = t.tools.descriptiva;
  const x = d.explain;
  const f = descriptivaFormat(lang, values, unit);
  const n = f.count(r.n);
  const sum = values.reduce((a, b) => a + b, 0);
  const sq = values.reduce((a, v) => a + (v - r.mean) ** 2, 0);
  const s = [...values].sort((a, b) => a - b);
  const rounded = [t.explain.rounded];
  const wN = { sym: 'n', label: x.nLabel, value: n };

  // Cuartil con la posición w = (n + 1)·p e interpolación: x₍y₎ + z·(x₍y₊₁₎ − x₍y₎).
  const quart = (p: number, key: 'q1' | 'q3', value: number | null): Derivation | null => {
    if (value === null) return null;
    const w = (r.n + 1) * p;
    const y = Math.floor(w);
    const z = w - y;
    const lo = s[y - 1]!;
    const hi = s[Math.min(y, r.n - 1)]!;
    const wText = formatNumber(w, lang, 2);
    const steps = z === 0 ? [`x₍${y}₎`, f.raw(lo), f.val(value)] : [plus(`x₍${y}₎`, times(formatNumber(z, lang, 2), paren(minus(`x₍${y + 1}₎`, `x₍${y}₎`)))), plus(f.raw(lo), times(formatNumber(z, lang, 2), paren(minus(f.raw(hi), f.raw(lo))))), f.val(value)];
    return {
      term: 'ric',
      title: d[key],
      meaning: x.quartileMeaning,
      lhs: key === 'q1' ? 'Q1' : 'Q3',
      steps,
      where: [
        { sym: x.posSym, label: `${x.posLabel}: (n + 1) × ${formatNumber(p, lang, 2)}`, value: wText },
        { sym: `x₍${y}₎`, label: x.lowLabel(y), value: f.raw(lo) },
        ...(z === 0 ? [] : [{ sym: `x₍${y + 1}₎`, label: x.lowLabel(y + 1), value: f.raw(hi) }]),
      ],
      notes: [x.sortedNote(r.n, wText), ...rounded],
    };
  };

  const k = r.n / 2;
  const median: Derivation =
    r.n % 2
      ? {
          title: d.median,
          meaning: x.medianMeaning,
          lhs: 'Me',
          steps: [`x₍${Math.floor(k) + 1}₎`, f.val(r.median)],
          where: [{ sym: `x₍${Math.floor(k) + 1}₎`, label: x.lowLabel(Math.floor(k) + 1), value: f.raw(s[Math.floor(k)]!) }, wN],
        }
      : {
          title: d.median,
          meaning: x.medianMeaning,
          lhs: 'Me',
          steps: [frac(plus(`x₍${k}₎`, `x₍${k + 1}₎`), '2'), frac(plus(f.raw(s[k - 1]!), f.raw(s[k]!)), '2'), f.val(r.median)],
          where: [
            { sym: `x₍${k}₎`, label: x.lowLabel(k), value: f.raw(s[k - 1]!) },
            { sym: `x₍${k + 1}₎`, label: x.lowLabel(k + 1), value: f.raw(s[k]!) },
            wN,
          ],
        };

  return {
    mean: {
      term: 'media',
      lhs: 'x̄',
      steps: [frac(x.sumSym, 'n'), frac(f.big(sum), n), f.val(r.mean)],
      where: [{ sym: x.sumSym, label: x.sumLabel, value: f.big(sum) }, wN],
      notes: rounded,
    },
    sd: {
      term: 'desviacion',
      lhs: 's',
      steps: [fn('√', frac(x.sqSym, minus('n', '1'))), fn('√', frac(formatSignificant(sq, lang, 6), minus(n, '1'))), f.val(r.sd)],
      where: [{ sym: x.sqSym, label: x.sqLabel, value: formatSignificant(sq, lang, 6) }, wN, { sym: 'x̄', label: d.mean, value: f.val(r.mean) }],
      notes: rounded,
    },
    median,
    q1: quart(0.25, 'q1', r.q1),
    q3: quart(0.75, 'q3', r.q3),
    se: {
      term: 'se',
      lhs: 'SE',
      steps: [frac('s', fn('√', 'n')), frac(f.val(r.sd), fn('√', n)), f.val(r.se)],
      where: [{ sym: 's', label: d.sd, value: f.val(r.sd) }, wN],
      meaning: x.seMeaning,
      notes: rounded,
    },
    ad: r.normality
      ? {
          term: 'ad',
          lhs: x.a2adjSym,
          steps: [
            times(x.a2Sym, paren(plus('1', frac(formatNumber(0.75, lang, 2), 'n'), frac(formatNumber(2.25, lang, 2), 'n²')))),
            times(f.stat(r.normality.a2), paren(plus('1', frac(formatNumber(0.75, lang, 2), n), frac(formatNumber(2.25, lang, 2), `${n}²`)))),
            f.stat(r.normality.a2adj),
          ],
          where: [
            { sym: x.a2Sym, label: x.a2Label, value: f.stat(r.normality.a2) },
            wN,
            { sym: 'p', label: d.normality, value: f.p(r.normality.p).replace(/^= /, '') },
          ],
          notes: [x.pNote, ...rounded],
        }
      : null,
  };
}
