import type { Messages } from '../../i18n';
import type { ParetoResult } from '../../calc/pareto';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import type { ParetoSaved } from './model';

// Hoja de Pareto: las categorías ya ordenadas, con su valor editable y la
// parte y el acumulado como fórmulas. La prueba comprueba que dan lo mismo.

export function paretoSheet(s: ParetoSaved, r: ParetoResult, t: Messages, opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.pareto;
  const sh = d.sheet;
  const c = t.sheet;
  const unit = s.unit.trim();
  const title = s.what.trim() ? `${d.name} · ${s.what.trim()}` : d.name;
  return {
    fileTitle: `${title} · ${opts.date}`,
    tabTitle: sh.tab,
    heading: title,
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
      labelHead: sh.head,
      columns: [
        { key: 'value', head: unit ? `${sh.valueHead} (${unit})` : sh.valueHead, format: 'auto' },
        { key: 'share', head: sh.shareHead, format: 'percent', formula: '{.value}/{total}' },
        { key: 'cum', head: sh.cumHead, format: 'percent', formula: 'SUM({value[1]}:{.value})/{total}' },
      ],
      rows: r.rows.map((x) => ({ label: x.name, values: { value: x.value } })),
      highlightMax: 'value',
    },
    results: [{ key: 'total', label: d.total, formula: 'SUM({value[]})', note: unit ? `${unit} · ${sh.notes.total}` : sh.notes.total, format: 'auto', main: true }],
    reading: opts.reading,
    notes: [sh.orderNote, c.readingNote],
  };
}
