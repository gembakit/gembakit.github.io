import type { Messages } from '../../i18n';
import type { TaktInput } from '../../calc/takt';
import { convert } from '../../calc/takt';
import type { ReadingLine, SheetDef, SheetResult } from '../../sheet/types';
import type { NamedStation } from './explain';

// Hoja de takt y cuello de botella: los mismos cálculos que src/calc/takt.ts,
// como fórmulas vivas. Todos los tiempos, en la unidad del takt (el tiempo
// disponible se convierte y la nota dice el original). La prueba
// sheet.test.ts comprueba que dan lo mismo.

export function taktSheet(input: TaktInput, stations: NamedStation[], t: Messages, opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.takt;
  const n = d.sheet.notes;
  const s = t.sheet;
  const u = d.units[input.unit] ?? input.unit;
  const converted = input.availableUnit !== input.unit;
  const original = converted ? `${input.available} ${d.units[input.availableUnit]}` : null;
  const results: SheetResult[] = [{ key: 'takt', label: d.steps.takt, formula: '{available}/{demand}', note: `${u} · ${n.takt}`, format: 'auto', main: true }];
  if (stations.length) {
    results.push(
      { key: 'bottleneckCycle', label: d.sheet.bottleneckCycle, formula: 'MAX({cycle[]})', note: `${u} · ${n.bottleneckCycle}`, format: 'auto' },
      { key: 'bottleneckStation', label: d.sheet.bottleneckStation, formula: 'INDEX({label[]},MATCH({bottleneckCycle},{cycle[]},0))', note: n.bottleneckStation, format: 'text', summary: true },
      { key: 'capacity', label: d.capacity, formula: '{available}/{bottleneckCycle}', note: n.capacity, format: 'auto', summary: true },
      { key: 'work', label: d.steps.work, formula: 'SUM({cycle[]})', note: `${u} · ${n.work}`, format: 'auto' },
      { key: 'minStations', label: d.minStations, formula: 'ROUNDUP({work}/{takt},0)', note: n.minStations, format: 'integer', summary: true },
      { key: 'efficiency', label: d.efficiency, formula: '{work}/(COUNT({cycle[]})*{takt})', note: n.efficiency, format: 'percent' },
      { key: 'idle', label: d.idle, formula: '1-{efficiency}', note: n.idle, format: 'percent' },
    );
  }
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
      { key: 'available', label: d.available, value: convert(input.available, input.availableUnit, input.unit), note: d.sheet.availableNote(u, original), format: 'auto' },
      { key: 'demand', label: d.demand, value: input.demand, note: d.pieces, format: 'auto' },
    ],
    table: stations.length
      ? {
          labelHead: d.sheet.stationHead,
          columns: [{ key: 'cycle', head: d.sheet.cycleHead(u), format: 'auto' }],
          rows: stations.map((st) => ({ label: st.name, values: { cycle: st.cycle } })),
          highlightMax: 'cycle',
        }
      : undefined,
    results,
    reading: opts.reading,
    notes: [d.sheet.unitNote(d.unitNames[input.unit] ?? u), ...(stations.length ? [d.sheet.highlightNote] : []), s.readingNote],
  };
}
