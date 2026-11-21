import type { Messages } from '../../i18n';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { measuredName } from '../descriptiva/model';
import type { CorridaSaved } from './model';

// Hoja del gráfico de corrida: los datos en orden, editables, la mediana como
// fórmula y de qué lado de ella cae cada punto. Las señales (que dependen del
// orden y de las rachas) se calculan en la app y van en «Cómo leerlo».

export function corridaSheet(s: CorridaSaved, t: Messages, opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.corrida;
  const sh = d.sheet;
  const c = t.sheet;
  const unit = s.unit.trim();
  const name = measuredName(s.name, d.defaultName);
  return {
    fileTitle: `${sh.file} · ${name} · ${opts.date}`,
    tabTitle: sh.tab,
    heading: `${d.name} · ${name}`,
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
        { key: 'x', head: unit ? `${sh.valueHead} (${unit})` : sh.valueHead, format: 'auto' },
        { key: 'side', head: sh.sideHead, format: 'integer', formula: 'IF({.x}>{median},1,IF({.x}<{median},-1,0))' },
      ],
      rows: s.values.map((v, i) => ({ label: `${i + 1}`, values: { x: v } })),
    },
    results: [
      { key: 'n', label: t.tools.descriptiva.n, formula: 'COUNT({x[]})', note: sh.notes.n, format: 'integer' },
      { key: 'median', label: d.median, formula: 'MEDIAN({x[]})', note: unit ? `${unit} · ${sh.notes.median}` : sh.notes.median, format: 'auto', main: true },
    ],
    reading: opts.reading,
    notes: [sh.sideNote, sh.signalsNote, c.readingNote],
  };
}
