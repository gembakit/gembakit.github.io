import type { Messages } from '../../i18n';
import type { ReadingLine, SheetDef, SheetInput, SheetResult } from '../../sheet/types';
import type { KanbanSaved } from './explain';

// Hoja de kanban: los mismos cálculos que src/calc/kanban.ts, como fórmulas
// vivas. La prueba sheet.test.ts comprueba que dan lo mismo.

export function kanbanSheet(s: KanbanSaved, t: Messages, opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.kanban;
  const n = d.sheet.notes;
  const sh = t.sheet;
  const u = d.units[s.unit] ?? s.unit;
  const split = s.mode === 'split';
  const inputs: SheetInput[] = [
    { key: 'demand', label: d.demand, value: s.demand, note: d.perUnit[s.unit], format: 'auto' },
    ...(split
      ? ([
          { key: 'wait', label: d.wait, value: s.wait ?? 0, note: u, format: 'auto' },
          { key: 'process', label: d.process, value: s.process ?? 0, note: u, format: 'auto' },
        ] as SheetInput[])
      : [{ key: 'lead', label: d.lead, value: s.lead ?? 0, note: u, format: 'auto' } as SheetInput]),
    { key: 'safety', label: d.safety, value: s.safetyPct / 100, note: '%', format: 'percent' },
    { key: 'size', label: d.size, value: s.size, note: d.pieces, format: 'auto' },
  ];
  const results: SheetResult[] = [
    ...(split ? [{ key: 'lead', label: d.leadLabel, formula: '{wait}+{process}', note: `${u} · ${n.lead}`, format: 'auto' } as SheetResult] : []),
    { key: 'raw', label: d.steps.raw, formula: '{demand}*{lead}*(1+{safety})/{size}', note: n.raw, format: 'decimal2' },
    { key: 'cards', label: d.cardsLabel, formula: 'ROUNDUP({raw},0)', note: n.cards, format: 'integer', main: true },
    { key: 'pieces', label: d.inCirculation, formula: '{cards}*{size}', note: n.pieces, format: 'auto', summary: true },
  ];
  return {
    fileTitle: `${d.sheet.file} · ${opts.date}`,
    tabTitle: d.sheet.tab,
    heading: d.name,
    subheading: sh.subheading(opts.version, opts.date),
    texts: {
      summary: sh.summary,
      inputs: sh.inputs,
      results: sh.results,
      reading: sh.reading,
      notes: sh.notes,
      inputHeads: [sh.inputHeads[0]!, sh.inputHeads[1]!, sh.inputHeads[2]!],
      resultHeads: [sh.resultHeads[0]!, sh.resultHeads[1]!, sh.resultHeads[2]!],
      editHint: sh.editHint,
      prefixes: sh.prefixes,
    },
    inputs,
    results,
    reading: opts.reading,
    notes: [d.sheet.unitNote(d.unitNames[s.unit] ?? u), sh.readingNote],
  };
}
