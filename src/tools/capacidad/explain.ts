import type { CapabilityIndices, CapabilityResult } from '../../calc/capability';
import { SPC_CONSTANTS } from '../../calc/spc';
import type { Messages } from '../../i18n';
import type { Derivation } from '../../ui/Explained';
import { fn, frac, minus, plus, times } from '../../ui/expr';
import { formatNumber } from '../../ui/number';
import { descriptivaFormat } from '../descriptiva/explain';
import type { CapacidadSaved } from './model';

export function capacidadFormat(lang: 'es' | 'en', s: CapacidadSaved) {
  const base = descriptivaFormat(lang, s.values, s.unit);
  return {
    ...base,
    idx: (x: number | null) => (x === null ? '—' : formatNumber(x, lang, 2, 2)),
    ppm: (x: number) => formatNumber(x, lang, x < 10 ? 2 : 0),
    spec: (x: number) => formatNumber(x, lang, 10),
  };
}

export type CapKey = 'cp' | 'cpk' | 'pp' | 'ppk' | 'cpm' | 'sigmaWithin' | 'sigmaOverall' | 'ppm';

export function capacidadExplain(s: CapacidadSaved, r: CapabilityResult, t: Messages, lang: 'es' | 'en'): Record<CapKey, Derivation | null> {
  const d = t.tools.capacidad;
  const x = d.explain;
  const f = capacidadFormat(lang, s);
  const rounded = [t.explain.rounded];
  const M = f.val(r.mean);
  const wMean = { sym: x.meanSym, label: d.mean, value: M };
  const wLsl = s.lsl === null ? null : { sym: x.lslSym, label: d.lsl, value: f.spec(s.lsl) };
  const wUsl = s.usl === null ? null : { sym: x.uslSym, label: d.usl, value: f.spec(s.usl) };
  const both = s.lsl !== null && s.usl !== null;

  const cpLike = (sym: string, sigma: number, sigmaLabel: string, lhs: string, meaning: string, value: number | null): Derivation | null =>
    both && value !== null
      ? {
          title: lhs,
          meaning,
          lhs,
          steps: [frac(minus(x.uslSym, x.lslSym), times('6', sym)), frac(minus(f.spec(s.usl!), f.spec(s.lsl!)), times('6', f.val(sigma))), f.idx(value)],
          where: [wUsl!, wLsl!, { sym, label: sigmaLabel, value: f.val(sigma) }],
          notes: rounded,
        }
      : null;

  // Cpk o Ppk: el lado más cercano manda; el otro va en una nota.
  const cpkLike = (sym: string, sigma: number, sigmaLabel: string, lhs: string, meaning: string, idx: CapabilityIndices): Derivation => {
    const upper = idx.cpu !== null && (idx.cpl === null || idx.cpu <= idx.cpl);
    const other = upper ? idx.cpl : idx.cpu;
    return {
      title: lhs,
      meaning,
      lhs,
      steps: upper
        ? [frac(minus(x.uslSym, x.meanSym), times('3', sym)), frac(minus(f.spec(s.usl!), M), times('3', f.val(sigma))), f.idx(idx.cpk)]
        : [frac(minus(x.meanSym, x.lslSym), times('3', sym)), frac(minus(M, f.spec(s.lsl!)), times('3', f.val(sigma))), f.idx(idx.cpk)],
      where: [...(upper ? [wUsl!] : [wLsl!]), wMean, { sym, label: sigmaLabel, value: f.val(sigma) }],
      notes: [`${upper ? x.toUsl : x.toLsl}${other !== null ? ` (${upper ? x.toLsl : x.toUsl}: ${f.idx(other)})` : ''}`, ...rounded],
    };
  };

  const k = SPC_CONSTANTS[s.subgroup];
  const n = s.values.length;
  let mrSum = 0;
  for (let i = 1; i < n; i++) mrSum += Math.abs(s.values[i]! - s.values[i - 1]!);
  const mrBar = n > 1 ? mrSum / (n - 1) : 0;
  const sigmaWithin: Derivation =
    s.subgroup <= 1
      ? {
          title: d.sigmaWithin,
          meaning: x.sigmaWMeaning,
          lhs: x.sigmaWSym,
          steps: [frac(x.mrSym, formatNumber(1.128, lang, 3)), frac(f.val(mrBar), formatNumber(1.128, lang, 3)), f.val(r.sigmaWithin)],
          where: [{ sym: x.mrSym, label: x.mrLabel, value: f.val(mrBar) }],
          notes: rounded,
        }
      : {
          title: d.sigmaWithin,
          meaning: x.sigmaWMeaning,
          lhs: x.sigmaWSym,
          steps: [frac(x.rSym, x.d2Sym), frac(f.val(r.sigmaWithin * k!.d2), formatNumber(k!.d2, lang, 3)), f.val(r.sigmaWithin)],
          where: [
            { sym: x.rSym, label: x.rLabel, value: f.val(r.sigmaWithin * k!.d2) },
            { sym: x.d2Sym, label: x.d2Label(s.subgroup), value: formatNumber(k!.d2, lang, 3) },
          ],
          notes: rounded,
        };
  const sq = s.values.reduce((a, v) => a + (v - r.mean) ** 2, 0);
  return {
    cp: cpLike(x.sigmaWSym, r.sigmaWithin, d.sigmaWithin, d.cp, x.cpMeaning, r.within.cp),
    cpk: cpkLike(x.sigmaWSym, r.sigmaWithin, d.sigmaWithin, d.cpk, x.cpkMeaning, r.within),
    pp: cpLike(x.sigmaOSym, r.sigmaOverall, d.sigmaOverall, d.pp, x.ppMeaning, r.overall.cp),
    ppk: cpkLike(x.sigmaOSym, r.sigmaOverall, d.sigmaOverall, d.ppk, x.ppkMeaning, r.overall),
    cpm:
      r.cpm === null || s.target === null
        ? null
        : {
            title: d.cpm,
            meaning: x.cpmMeaning,
            lhs: d.cpm,
            steps: [
              frac(minus(x.uslSym, x.lslSym), times('6', fn('√', plus(`${x.sigmaOSym}²`, `(${x.meanSym} − ${x.targetSym})²`)))),
              frac(minus(f.spec(s.usl!), f.spec(s.lsl!)), times('6', fn('√', plus(`${f.val(r.sigmaOverall)}²`, `(${M} − ${f.spec(s.target)})²`)))),
              f.idx(r.cpm),
            ],
            where: [wUsl!, wLsl!, { sym: x.sigmaOSym, label: d.sigmaOverall, value: f.val(r.sigmaOverall) }, wMean, { sym: x.targetSym, label: d.target, value: f.spec(s.target) }],
            notes: rounded,
          },
    sigmaWithin,
    sigmaOverall: {
      title: d.sigmaOverall,
      meaning: x.sigmaOMeaning,
      lhs: x.sigmaOSym,
      steps: [fn('√', frac('Σ(x − x̄)²', minus('n', '1'))), fn('√', frac(formatNumber(sq, lang, 6), minus(formatNumber(n, lang, 0), '1'))), f.val(r.sigmaOverall)],
      where: [{ sym: 'n', label: t.tools.descriptiva.n, value: formatNumber(n, lang, 0) }, wMean],
      notes: rounded,
    },
    ppm: {
      title: d.ppmOverall,
      meaning: x.ppmMeaning,
      lhs: 'PPM',
      steps: [plus(f.ppm(r.overall.ppmBelow), f.ppm(r.overall.ppmAbove)), f.ppm(r.overall.ppmTotal)],
      where: [
        ...(s.lsl !== null ? [{ sym: x.lslSym, label: d.lsl, value: f.ppm(r.overall.ppmBelow) }] : []),
        ...(s.usl !== null ? [{ sym: x.uslSym, label: d.usl, value: f.ppm(r.overall.ppmAbove) }] : []),
      ],
      notes: rounded,
    },
  };
}
