import type { Messages } from '../../i18n';
import type { DescriptiveResult } from '../../calc/descriptive';
import type { ReadingLine, SheetDef, SheetResult } from '../../sheet/types';
import { descriptivaFormat } from './explain';
import { descriptivaName, type DescriptivaSaved } from './model';

// Hoja de estadística descriptiva: los datos en una columna editable y los
// resultados como fórmulas de hoja (las mismas convenciones que el cálculo:
// STDEV.S, QUARTILE.EXC, SKEW, KURT). La prueba sheet.test.ts comprueba que
// dan lo mismo.

export function descriptivaSheet(s: DescriptivaSaved, r: DescriptiveResult, t: Messages, lang: 'es' | 'en', opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.descriptiva;
  const sh = d.sheet;
  const n = sh.notes;
  const c = t.sheet;
  const f = descriptivaFormat(lang, s.values, s.unit);
  const unit = s.unit.trim();
  const results: SheetResult[] = [
    { key: 'n', label: d.n, formula: 'COUNT({x[]})', note: n.n, format: 'integer' },
    { key: 'mean', label: d.mean, formula: 'AVERAGE({x[]})', note: unit ? `${unit} · ${n.mean}` : n.mean, format: 'auto', main: true },
    { key: 'sd', label: d.sd, formula: 'STDEV.S({x[]})', note: unit ? `${unit} · ${n.sd}` : n.sd, format: 'auto', summary: true },
    { key: 'median', label: d.median, formula: 'MEDIAN({x[]})', note: n.median, format: 'auto', summary: true },
    ...(r.q1 !== null ? [{ key: 'q1', label: d.q1, formula: 'QUARTILE.EXC({x[]},1)', note: n.q1, format: 'auto' as const }] : []),
    ...(r.q3 !== null ? [{ key: 'q3', label: d.q3, formula: 'QUARTILE.EXC({x[]},3)', note: n.q3, format: 'auto' as const }] : []),
    { key: 'min', label: d.min, formula: 'MIN({x[]})', note: n.min, format: 'auto' },
    { key: 'max', label: d.max, formula: 'MAX({x[]})', note: n.max, format: 'auto' },
    { key: 'range', label: d.range, formula: '{max}-{min}', note: n.range, format: 'auto' },
    { key: 'se', label: d.se, formula: '{sd}/SQRT({n})', note: n.se, format: 'auto' },
    ...(r.skewness !== null ? [{ key: 'skewness', label: d.skewness, formula: 'SKEW({x[]})', note: n.skewness, format: 'decimal4' as const }] : []),
    ...(r.kurtosis !== null ? [{ key: 'kurtosis', label: d.kurtosis, formula: 'KURT({x[]})', note: n.kurtosis, format: 'decimal4' as const }] : []),
  ];
  return {
    fileTitle: `${sh.file} · ${descriptivaName(t, s)} · ${opts.date}`,
    tabTitle: sh.tab,
    heading: `${d.name} · ${descriptivaName(t, s)}`,
    subheading: c.subheading(opts.version, opts.date),
    texts: {
      summary: c.summary,
      inputs: c.inputs,
      results: c.results,
      reading: c.reading,
      notes: c.notes,
      inputHeads: [c.inputHeads[0]!, c.inputHeads[1]!, c.inputHeads[2]!],
      resultHeads: [c.resultHeads[0]!, c.resultHeads[1]!, c.resultHeads[2]!],
      editHint: c.editHint,
      prefixes: c.prefixes,
    },
    inputs: [],
    table: {
      labelHead: sh.valuesHead,
      columns: [{ key: 'x', head: unit ? `${sh.valueHead} (${unit})` : sh.valueHead, format: 'auto' }],
      rows: s.values.map((v, i) => ({ label: sh.rowLabel(i + 1), values: { x: v } })),
    },
    results,
    reading: opts.reading,
    notes: [...(r.normality ? [sh.adNote(f.stat(r.normality.a2adj), f.p(r.normality.p))] : []), c.readingNote],
  };
}
