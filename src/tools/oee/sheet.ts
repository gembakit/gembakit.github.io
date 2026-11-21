import type { Messages } from '../../i18n';
import type { OeeResult } from '../../calc/oee';
import type { ReadingLine, SheetDef, SheetInput, SheetResult, SheetTable } from '../../sheet/types';
import { formatNumber } from '../../ui/number';
import { oeeFormat, oeeLook } from './explain';
import { categoryName, offSlices, plannedName, stopName, toOeeInput, utilizationLabel, type OeeSaved } from './model';

// Hoja de OEE: los mismos cálculos que src/calc/oee.ts, como fórmulas vivas.
// La tabla lleva una fila por categoría con paradas (sus minutos y su parte
// estándar); las paradas una a una van en las notas. La prueba sheet.test.ts
// comprueba que las fórmulas dan lo mismo que el cálculo.

export function oeeSheet(s: OeeSaved, r: OeeResult, t: Messages, lang: 'es' | 'en', opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.oee;
  const sh = d.sheet;
  const n = sh.notes;
  const c = t.sheet;
  const i = toOeeInput(s);
  const look = oeeLook(s, t);
  const f = oeeFormat(lang, look);
  const num = (x: number) => formatNumber(x, lang, 2);

  const inputs: SheetInput[] = [
    { key: 'shift', label: d.shift, value: i.shift, note: s.shiftUnit === 'min' ? 'min' : `min (= ${num(s.shift)} ${s.shiftUnit})`, format: 'auto' },
    ...s.planned.map(
      (p, k): SheetInput => ({ key: `p${k}`, label: sh.planned(plannedName(s, k, t)), value: i.plannedStops[k]!, note: p.unit === 'min' ? 'min' : `min (= ${num(p.value)} ${p.unit})`, format: 'auto' }),
    ),
    {
      key: 'idealCycle',
      label: sh.idealCycle,
      value: i.idealCycle,
      note: s.measure === 'time' && s.measureUnit === 's' ? sh.idealUnit : sh.idealNote(f.ideal(i.idealCycle)),
      format: 'auto',
    },
    { key: 'total', label: d.total, value: s.total, note: look.unitName, format: 'integer' },
    { key: 'rejects', label: d.rejects, value: s.rejects, note: look.unitName, format: 'integer' },
  ];

  // Una fila por categoría con paradas (la torta desmarca cada categoría por su posición).
  const cats = r.byCategory.flatMap((m, k) => (m > 0 ? [k] : []));
  const table: SheetTable | undefined = cats.length
    ? {
        labelHead: sh.categoryHead,
        columns: [
          { key: 'min', head: sh.minutesHead, format: 'auto' },
          { key: 'std', head: sh.standardHead, format: 'auto' },
        ],
        rows: cats.map((k) => ({ label: categoryName(s, k, t), values: { min: r.byCategory[k]!, std: r.standardByCategory[k] ?? 0 } })),
        highlightMax: 'min',
      }
    : undefined;

  const planned = ['{shift}', ...s.planned.map((_, k) => `{p${k}}`)].join('-');
  const results: SheetResult[] = [
    { key: 'planned', label: d.steps.planned, formula: planned, note: n.planned, format: 'auto' },
    { key: 'downtime', label: sh.downtime, formula: table ? 'SUM({min[]})' : '0', note: n.downtime, format: 'auto' },
    { key: 'run', label: d.steps.run, formula: '{planned}-{downtime}', note: n.run, format: 'auto' },
    { key: 'availability', label: d.availability, formula: '{run}/{planned}', note: n.availability, format: 'percent', summary: true },
    { key: 'performance', label: d.performance, formula: '{idealCycle}*{total}/({run}*60)', note: n.performance, format: 'percent', summary: true },
    { key: 'good', label: d.sheet.good, formula: '{total}-{rejects}', note: n.good, format: 'integer' },
    { key: 'quality', label: d.quality, formula: '{good}/{total}', note: n.quality, format: 'percent', summary: true },
    { key: 'oee', label: 'OEE', formula: '{availability}*{performance}*{quality}', note: n.oee, format: 'percent', main: true },
    { key: 'useful', label: d.losses.useful!, formula: '{idealCycle}*{good}/60', note: n.useful, format: 'auto' },
    { key: 'speed', label: d.losses.speed!, formula: '{run}-{idealCycle}*{total}/60', note: n.speed, format: 'auto' },
    { key: 'qualityLoss', label: d.losses.quality!, formula: '{idealCycle}*{rejects}/60', note: n.qualityLoss, format: 'auto' },
  ];

  // La utilización de la línea con lo desmarcado en la torta, como fórmula viva.
  const row = (k: number) => cats.indexOf(k) + 1;
  const removed = offSlices(s, r).map((x) => {
    switch (x.kind) {
      case 'planned':
        return `{p${x.index}}`;
      case 'stops':
        return `(INDEX({min[]},${row(x.index)})-INDEX({std[]},${row(x.index)}))`;
      case 'standard':
        return `INDEX({std[]},${row(x.index)})`;
      case 'speed':
        return '{speed}';
      case 'quality':
        return '{qualityLoss}';
      default:
        return '0';
    }
  });
  results.push({
    key: 'utilization',
    label: utilizationLabel(s, r, t),
    formula: removed.length ? `{useful}/({shift}-(${removed.join('+')}))` : '{useful}/{shift}',
    note: sh.utilizationNote,
    format: 'percent',
    summary: true,
  });

  const stopNotes = s.stops.map(
    (x, k) =>
      sh.stopNote(stopName(s, k, t), num(x.minutes), categoryName(s, x.category, t)) + (x.standard !== null ? sh.stopStandard(num(x.standard)) : '') + '.' + (x.note.trim() ? sh.notePart(x.note.trim()) : ''),
  );
  const plannedNotes = s.planned.flatMap((p, k) => (p.note.trim() ? [`${plannedName(s, k, t)}:${sh.notePart(p.note.trim())}`] : []));
  return {
    fileTitle: `${sh.file} · ${opts.date}`,
    tabTitle: sh.tab,
    heading: d.name,
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
    inputs,
    table,
    results,
    reading: opts.reading,
    notes: [...plannedNotes, ...stopNotes, d.reference, d.referenceSource, c.readingNote],
  };
}
