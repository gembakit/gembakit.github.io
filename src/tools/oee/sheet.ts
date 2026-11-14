import type { Messages } from '../../i18n';
import type { OeeInput } from '../../calc/oee';
import type { ReadingLine, SheetDef } from '../../sheet/types';

// Hoja de OEE: los mismos cálculos que src/calc/oee.ts, como fórmulas vivas.
// La prueba sheet.test.ts comprueba que dan lo mismo.

export function oeeSheet(i: OeeInput, t: Messages, opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.oee;
  const n = d.sheet.notes;
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
      { key: 'shift', label: d.shift, value: i.shift, note: d.min, format: 'auto' },
      { key: 'plannedStops', label: d.plannedStops, value: i.plannedStops, note: d.min, format: 'auto' },
      { key: 'unplannedStops', label: d.unplannedStops, value: i.unplannedStops, note: d.min, format: 'auto' },
      { key: 'idealCycle', label: d.idealCycle, value: i.idealCycle, note: d.sPerPiece, format: 'auto' },
      { key: 'total', label: d.total, value: i.total, note: d.pieces, format: 'integer' },
      { key: 'rejects', label: d.rejects, value: i.rejects, note: d.pieces, format: 'integer' },
    ],
    results: [
      { key: 'planned', label: d.steps.planned, formula: '{shift}-{plannedStops}', note: n.planned, format: 'auto' },
      { key: 'run', label: d.steps.run, formula: '{planned}-{unplannedStops}', note: n.run, format: 'auto' },
      { key: 'availability', label: d.availability, formula: '{run}/{planned}', note: n.availability, format: 'percent', summary: true },
      { key: 'performance', label: d.performance, formula: '{idealCycle}*{total}/({run}*60)', note: n.performance, format: 'percent', summary: true },
      { key: 'good', label: d.sheet.good, formula: '{total}-{rejects}', note: n.good, format: 'integer' },
      { key: 'quality', label: d.quality, formula: '{good}/{total}', note: n.quality, format: 'percent', summary: true },
      { key: 'oee', label: 'OEE', formula: '{availability}*{performance}*{quality}', note: n.oee, format: 'percent', main: true },
      { key: 'useful', label: d.losses.useful!, formula: '{idealCycle}*{good}/60', note: n.useful, format: 'auto' },
      { key: 'downtime', label: d.losses.downtime!, formula: '{unplannedStops}', note: n.downtime, format: 'auto' },
      { key: 'speed', label: d.losses.speed!, formula: '{run}-{idealCycle}*{total}/60', note: n.speed, format: 'auto' },
      { key: 'qualityLoss', label: d.losses.quality!, formula: '{idealCycle}*{rejects}/60', note: n.qualityLoss, format: 'auto' },
    ],
    reading: opts.reading,
    notes: [d.reference, d.referenceSource, s.readingNote],
  };
}
