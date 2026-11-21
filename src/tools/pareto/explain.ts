import type { ParetoResult } from '../../calc/pareto';
import type { Messages } from '../../i18n';
import type { Derivation } from '../../ui/Explained';
import { frac, plus } from '../../ui/expr';
import { paretoFormat } from './reading';

/** De dónde sale la parte y el acumulado de cada fila del Pareto. */
export function paretoExplain(r: ParetoResult, t: Messages, lang: 'es' | 'en'): { share: Derivation; cumulative: Derivation }[] {
  const d = t.tools.pareto;
  const x = d.explain;
  const f = paretoFormat(lang);
  const T = f.value(r.total);
  const wT = { sym: x.totalSym, label: x.totalLabel, value: T };
  return r.rows.map((row, i) => {
    const upTo = r.rows.slice(0, i + 1);
    const sum = upTo.reduce((a, y) => a + y.value, 0);
    return {
      share: {
        title: `${row.name} · ${d.share}`,
        meaning: x.shareMeaning,
        lhs: d.share,
        steps: [frac(x.vSym, x.totalSym), frac(f.value(row.value), T), f.pct(row.share)],
        where: [{ sym: x.vSym, label: row.name, value: f.value(row.value) }, wT],
        notes: [t.explain.rounded],
      },
      cumulative: {
        title: `${row.name} · ${d.cumulative}`,
        meaning: x.cumMeaning,
        lhs: d.cumulative,
        steps: [frac(upTo.length > 1 ? plus(...upTo.map((y) => f.value(y.value))) : f.value(sum), T), frac(f.value(sum), T), f.pct(row.cumulative)].filter((_, k) => upTo.length > 1 || k !== 1),
        where: [...upTo.map((y) => ({ sym: '·', label: y.name, value: f.value(y.value) })), wT],
        notes: [t.explain.rounded],
      },
    };
  });
}
