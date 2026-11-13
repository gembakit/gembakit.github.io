import type { Messages } from '../../i18n';
import type { FpyStep } from '../../calc/fpy';
import type { ReadingLine, SheetDef, SheetTable } from '../../sheet/types';

// Hoja de FPY y RTY: los mismos cálculos que src/calc/fpy.ts, como fórmulas
// vivas sobre una tabla con una fila por paso. La prueba sheet.test.ts
// comprueba que dan lo mismo.

export interface NamedStep {
  name: string;
  step: FpyStep;
}

export function fpySheet(steps: NamedStep[], t: Messages, opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.fpy;
  const n = d.sheet.notes;
  const s = t.sheet;
  // Todos los pasos en el mismo modo: los da así la pantalla.
  const counts = steps.every((x) => 'entering' in x.step);
  const rows = steps.map(({ name, step }) => ({
    label: name,
    values: ('entering' in step ? { entering: step.entering, good: step.good } : { fpy: step.fpy }) as Record<string, number>,
  }));
  const table: SheetTable = counts
    ? {
        labelHead: d.sheet.stepHead,
        columns: [
          { key: 'entering', head: d.entering, format: 'integer' },
          { key: 'good', head: d.good, format: 'integer' },
          { key: 'fpy', head: d.fpyField, format: 'percent', formula: '{.good}/{.entering}' },
        ],
        rows,
        highlightMin: 'fpy',
      }
    : {
        labelHead: d.sheet.stepHead,
        columns: [{ key: 'fpy', head: d.fpyField, format: 'percent' }],
        rows,
        highlightMin: 'fpy',
      };
  return {
    fileTitle: `${d.sheet.file} · ${opts.date}`,
    tabTitle: d.sheet.tab,
    heading: d.name,
    subheading: s.subheading(opts.version, opts.date),
    texts: {
      summary: s.summary,
      inputs: s.inputs,
      results: s.results,
      reading: s.reading,
      notes: s.notes,
      inputHeads: [s.inputHeads[0]!, s.inputHeads[1]!, s.inputHeads[2]!],
      resultHeads: [s.resultHeads[0]!, s.resultHeads[1]!, s.resultHeads[2]!],
      editHint: s.editHint,
      prefixes: s.prefixes,
    },
    inputs: [],
    table,
    results: [
      { key: 'rty', label: d.steps.rty, formula: 'PRODUCT({fpy[]})', note: n.rty, format: 'percent', main: true },
      { key: 'hiddenFactory', label: d.steps.hiddenFactory, formula: '1-{rty}', note: n.hiddenFactory, format: 'percent', summary: true },
      { key: 'worstFpy', label: d.sheet.worstFpy, formula: 'MIN({fpy[]})', note: n.worstFpy, format: 'percent' },
      { key: 'worstStep', label: d.sheet.worstStep, formula: 'INDEX({label[]},MATCH({worstFpy},{fpy[]},0))', note: n.worstStep, format: 'text', summary: true },
    ],
    reading: opts.reading,
    notes: [...(counts ? [d.sheet.countsNote] : []), d.sheet.highlightNote, s.readingNote],
  };
}
