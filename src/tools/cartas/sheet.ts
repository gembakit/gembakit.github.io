import type { Messages } from '../../i18n';
import { SPC_CONSTANTS } from '../../calc/spc';
import { fixed, type ReadingLine, type SheetDef, type SheetInput, type SheetResult, type SheetTable } from '../../sheet/types';
import { descriptivaFormat } from '../descriptiva/explain';
import { measuredName } from '../descriptiva/model';
import type { CartasSaved } from './model';
import type { ChartOut } from './reading';

// Hoja de la carta de control. I-MR: los datos editables con su rango móvil
// como fórmula y los límites como fórmulas. X-barra R: la media y el rango de
// cada subgrupo (calculados en la app) y los límites como fórmulas con las
// constantes de NIST. Las señales van en «Cómo leerlo».

export function cartasSheet(s: CartasSaved, c: ChartOut, t: Messages, opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.cartas;
  const sh = d.sheet;
  const n = sh.notes;
  const cm = t.sheet;
  const unit = s.unit.trim();
  const name = measuredName(s.name, d.defaultName);
  let table: SheetTable;
  let results: SheetResult[];
  let inputs: SheetInput[] = [];
  const notes: string[] = [];
  const v = fixed(descriptivaFormat('es', s.values, s.unit).d);
  if (c.kind === 'imr') {
    const r = c.out.result!;
    const m = r.limitPoints;
    // Con límites de los primeros m puntos, las medias usan solo esas filas.
    const x = m < r.values.length ? `{x[1]}:{x[${m}]}` : '{x[]}';
    const mr = m < r.values.length ? `{mr[2]}:{mr[${m}]}` : '{mr[]}';
    table = {
      labelHead: sh.pointHead,
      columns: [
        { key: 'x', head: unit ? `${sh.valueHead} (${unit})` : sh.valueHead, format: 'auto' },
        { key: 'mr', head: sh.mrHead, format: 'auto', formula: 'ABS({.x}-{^x})', formulaFirst: '' },
      ],
      rows: r.values.map((v, i) => ({ label: `${i + 1}`, values: { x: v } })),
    };
    results = [
      { key: 'center', label: d.center, formula: `AVERAGE(${x})`, note: n.center, format: v, main: true },
      { key: 'mrBar', label: d.mrBar, formula: `AVERAGE(${mr})`, note: n.mrBar, format: v },
      { key: 'ucl', label: d.ucl, formula: '{center}+3*{mrBar}/1.128', note: n.ucl, format: v, summary: true },
      { key: 'lcl', label: d.lcl, formula: '{center}-3*{mrBar}/1.128', note: n.lcl, format: v, summary: true },
      { key: 'mrUcl', label: `${d.ucl} (MR)`, formula: '3.267*{mrBar}', note: n.mrUcl, format: v },
    ];
    if (m < r.values.length) notes.push(d.limitNote(m));
  } else {
    const r = c.out.result!;
    const k = SPC_CONSTANTS[r.size]!;
    const m = r.limitPoints;
    const mean = m < r.means.length ? `{mean[1]}:{mean[${m}]}` : '{mean[]}';
    const range = m < r.ranges.length ? `{range[1]}:{range[${m}]}` : '{range[]}';
    table = {
      labelHead: sh.groupHead,
      columns: [
        { key: 'mean', head: unit ? `${sh.meanHead} (${unit})` : sh.meanHead, format: 'auto' },
        { key: 'range', head: sh.rangeHead, format: 'auto' },
      ],
      rows: r.means.map((v, i) => ({ label: `${i + 1}`, values: { mean: v, range: r.ranges[i]! } })),
    };
    inputs = [
      { key: 'a2', label: `A2 (n = ${r.size})`, value: k.A2, note: n.a2, format: 'auto' },
      { key: 'd3', label: `D3 (n = ${r.size})`, value: k.D3, note: n.a2, format: 'auto' },
      { key: 'd4', label: `D4 (n = ${r.size})`, value: k.D4, note: n.a2, format: 'auto' },
    ];
    results = [
      { key: 'center', label: d.center, formula: `AVERAGE(${mean})`, note: n.center, format: v, main: true },
      { key: 'rBar', label: d.rBar, formula: `AVERAGE(${range})`, note: n.rBar, format: v },
      { key: 'ucl', label: d.ucl, formula: '{center}+{a2}*{rBar}', note: n.xUcl, format: v, summary: true },
      { key: 'lcl', label: d.lcl, formula: '{center}-{a2}*{rBar}', note: n.xLcl, format: v, summary: true },
      { key: 'rUcl', label: `${d.ucl} (R)`, formula: '{d4}*{rBar}', note: n.rUcl, format: v },
      { key: 'rLcl', label: `${d.lcl} (R)`, formula: '{d3}*{rBar}', note: n.rLcl, format: v },
    ];
    notes.push(sh.groupNote);
    if (m < r.means.length) notes.push(d.limitNote(m));
  }
  return {
    fileTitle: `${sh.file} · ${name} · ${opts.date}`,
    tabTitle: sh.tab,
    heading: `${d.kinds[s.kind]} · ${name}`,
    subheading: cm.subheading(opts.version, opts.date),
    texts: {
      summary: cm.summary,
      inputs: cm.inputs,
      results: cm.results,
      reading: cm.reading,
      notes: cm.notes,
      inputHeads: [cm.inputHeads[0]!, cm.inputHeads[1]!, cm.inputHeads[2]!],
      resultHeads: [cm.resultHeads[0]!, cm.resultHeads[1]!, cm.resultHeads[2]!],
      editHint: cm.editHint,
      prefixes: cm.prefixes,
    },
    inputs,
    table,
    results,
    reading: opts.reading,
    notes: [...notes, sh.signalsNote, cm.readingNote],
  };
}
