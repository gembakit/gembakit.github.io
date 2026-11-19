import type { Messages } from '../../i18n';
import type { OeeResult } from '../../calc/oee';
import type { ReadingLine, SheetDef, SheetInput, SheetResult, SheetTable } from '../../sheet/types';
import { formatNumber } from '../../ui/number';
import { oeeFormat, oeeLook } from './explain';
import { categoryName, plannedName, standardLeft, stopName, toOeeInput, viewLabel, type OeeSaved } from './model';

// Hoja de OEE: los mismos cálculos que src/calc/oee.ts, como fórmulas vivas.
// La tabla lleva una fila por categoría con paradas (sus minutos y su parte
// estándar); las paradas una a una van en las notas. La prueba sheet.test.ts
// comprueba que las fórmulas dan lo mismo que el cálculo.

/** Texto entre comillas para una fórmula de hoja. */
const quoted = (s: string) => `"${s.replace(/"/g, '""')}"`;

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

  // Una fila por categoría con paradas; dos categorías con el mismo nombre se juntan.
  const rows = new Map<string, { min: number; std: number }>();
  r.byCategory.forEach((m, k) => {
    if (!(m > 0)) return;
    const name = categoryName(s, k, t);
    const row = rows.get(name) ?? { min: 0, std: 0 };
    row.min += m;
    row.std += r.standardByCategory[k] ?? 0;
    rows.set(name, row);
  });
  const table: SheetTable | undefined = rows.size
    ? {
        labelHead: sh.categoryHead,
        columns: [
          { key: 'min', head: sh.minutesHead, format: 'auto' },
          { key: 'std', head: sh.standardHead, format: 'auto' },
        ],
        rows: [...rows].map(([label, v]) => ({ label, values: { min: v.min, std: v.std } })),
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

  // La otra vista marcada al exportar, con su nombre y su fórmula.
  const label = viewLabel(s, r.standardByCategory, t);
  if (label && table) {
    const excluded = [...new Set(s.views.excluded.filter((k) => (r.byCategory[k] ?? 0) > 0).map((k) => categoryName(s, k, t)))];
    const cell = (col: string, name: string) => `INDEX({${col}[]},MATCH(${quoted(name)},{label[]},0))`;
    const parts = excluded.map((name) => cell('min', name));
    if (s.views.standard && standardLeft(s, r.standardByCategory)) parts.push(['SUM({std[]})', ...excluded.map((name) => cell('std', name))].join('-'));
    results.push({ key: 'view', label, formula: `{useful}/({planned}-(${parts.join('+') || '0'}))`, note: sh.viewNote, format: 'percent', summary: true });
  }

  const stopNotes = s.stops.map(
    (x, k) => sh.stopNote(stopName(s, k, t), num(x.minutes), categoryName(s, x.category, t)) + (x.standard !== null ? sh.stopStandard(num(x.standard)) : '') + '.',
  );
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
    notes: [...stopNotes, d.reference, d.referenceSource, c.readingNote],
  };
}
