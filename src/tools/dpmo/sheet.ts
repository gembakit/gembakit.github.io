import type { Messages } from '../../i18n';
import type { DpmoInput } from '../../calc/dpmo';
import type { ReadingLine, SheetDef } from '../../sheet/types';

// Hoja de DPMO y nivel sigma: los mismos cálculos que src/calc/dpmo.ts, como
// fórmulas vivas. La prueba sheet.test.ts comprueba que dan lo mismo.

export function dpmoSheet(input: DpmoInput, t: Messages, opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.dpmo;
  const n = d.sheet.notes;
  const u = d.sheet.units;
  const s = t.sheet;
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
    inputs: [
      { key: 'units', label: d.units, value: input.units, note: u.units, format: 'integer' },
      { key: 'opportunities', label: d.opportunities, value: input.opportunities, note: u.opportunities, format: 'integer' },
      { key: 'defects', label: d.defects, value: input.defects, note: u.defects, format: 'integer' },
    ],
    results: [
      { key: 'opportunitiesTotal', label: d.steps.opportunitiesTotal, formula: '{units}*{opportunities}', note: n.opportunitiesTotal, format: 'integer' },
      { key: 'dpu', label: d.steps.dpu, formula: '{defects}/{units}', note: n.dpu, format: 'auto' },
      { key: 'dpo', label: d.steps.dpo, formula: '{defects}/{opportunitiesTotal}', note: n.dpo, format: 'auto' },
      { key: 'dpmo', label: d.steps.dpmo, formula: '{dpo}*1000000', note: n.dpmo, format: 'auto', summary: true },
      { key: 'yield', label: d.yieldLabel, formula: '1-{dpo}', note: n.yield, format: 'percent' },
      // Sin defectos o con todo defectuoso, la Z no existe: la celda dice «—» en lugar de dar error.
      { key: 'zLongTerm', label: d.steps.zLongTerm, formula: 'IF(OR({dpo}<=0,{dpo}>=1),"—",-NORM.S.INV({dpo}))', note: n.zLongTerm, format: 'decimal4', summary: true },
      { key: 'sigmaLevel', label: d.steps.sigmaLevel, formula: 'IF(ISNUMBER({zLongTerm}),{zLongTerm}+1.5,"—")', note: n.sigmaLevel, format: 'decimal2', main: true },
    ],
    reading: opts.reading,
    notes: [d.sheet.convention, s.readingNote],
  };
}
