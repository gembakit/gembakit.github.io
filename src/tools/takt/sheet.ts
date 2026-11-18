import type { Messages } from '../../i18n';
import { SECONDS, type TaktResult, type TimeUnit } from '../../calc/takt';
import type { ReadingLine, SheetDef, SheetInput, SheetResult, SheetTableColumn } from '../../sheet/types';
import { taktFormat } from './explain';
import { basisName, deductionNames, stationNames, taktView, type TaktSaved } from './reading';

// Hoja del takt (versión 2): los mismos cálculos que src/calc/takt.ts, como
// fórmulas vivas. Los tiempos van en la unidad de los resultados (lo escrito
// en otra unidad se convierte y la nota dice el original). En las líneas
// medidas en velocidad, la tabla y los resultados van en velocidades. La
// prueba sheet.test.ts comprueba que la hoja da lo mismo que el cálculo.

/** Fórmula que pasa de una unidad a otra: «*60», «/60» o nada. */
function scale(factor: number): string {
  if (Math.abs(factor - 1) < 1e-12) return '';
  return factor > 1 ? `*${Number(factor.toPrecision(12))}` : `/${Number((1 / factor).toPrecision(12))}`;
}

export function taktSheet(s: TaktSaved, r: TaktResult, t: Messages, lang: 'es' | 'en', opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.takt;
  const sh = d.sheet;
  const n = sh.notes;
  const g = t.sheet;
  const view = taktView(s, t);
  const f = taktFormat(lang, t, view);
  const tu = s.resultUnit;
  const u = d.units[tu]!;
  const isTime = s.measure === 'time';
  const rateU = d.rateOf(view.unitName, u);
  const names = stationNames(s, t);
  const inU = (value: number, unit: TimeUnit) => (value * SECONDS[unit]) / SECONDS[tu];
  const timeNote = (value: number, unit: TimeUnit) => (unit === tu ? u : sh.convertedNote(u, `${f.num(value)} ${d.units[unit]}`));

  const inputs: SheetInput[] = [
    { key: 'shift', label: sh.shift, value: inU(s.shift, s.shiftUnit), note: timeNote(s.shift, s.shiftUnit), format: 'auto' },
    ...s.deductions.map((dd, i) => ({ key: `d${i}`, label: sh.deduction(deductionNames(s, t)[i]!), value: inU(dd.value, dd.unit), note: timeNote(dd.value, dd.unit), format: 'auto' as const })),
    { key: 'shifts', label: sh.shifts, value: s.shifts, format: 'auto' },
    { key: 'demand', label: d.demand, value: s.demand, note: view.unitName, format: 'auto' },
  ];
  const o = r.oee;
  if (o) {
    const ref = names[o.reference]!;
    inputs.push(
      { key: 'oee', label: sh.oee, value: o.oee, format: 'percent' },
      isTime
        ? { key: 'theo', label: sh.theoCycle(ref), value: o.theoreticalCycle / SECONDS[tu], note: u, format: 'auto' }
        : { key: 'theo', label: sh.theoRate(ref), value: SECONDS[tu] / o.theoreticalCycle, note: rateU, format: 'auto' },
    );
  }

  const minus = s.deductions.map((_, i) => `-{d${i}}`).join('');
  const results: SheetResult[] = [
    { key: 'available', label: sh.available, formula: s.shifts === 1 && !minus ? '{shift}' : `({shift}${minus})*{shifts}`, note: `${u} · ${n.available}`, format: 'auto' },
    isTime
      ? { key: 'takt', label: d.taktTitle, formula: '{available}/{demand}', note: `${u} · ${n.takt}`, format: 'auto', main: true }
      : { key: 'rate', label: sh.rate, formula: '{demand}/{available}', note: `${rateU} · ${n.rate}`, format: 'auto', main: true },
  ];

  const notes: string[] = [sh.unitNote(d.unitNames[tu] ?? u)];
  let table: SheetDef['table'];
  if (s.stations.length) {
    const mu = s.measureUnit;
    const entered = isTime ? d.units[mu]! : d.perUnit(d.units[mu]!);
    const hasTheo = s.stations.some((st) => st.theoretical !== null);
    const useReal = s.basis !== 'theoretical';
    const basis = basisName(s.basis, s.measure, t);
    // De la medida escrita a la unidad de los resultados.
    const k = isTime ? scale(SECONDS[mu] / SECONDS[tu]) : scale(SECONDS[tu] / SECONDS[mu]);
    const from = (col: string) => `{.${col}}${k}`;
    const formula = !useReal ? from('theo') : hasTheo ? `IF({.real}>0,${from('real')},${from('theo')})` : from('real');
    const columns: SheetTableColumn[] = [
      ...(hasTheo ? [{ key: 'theo', head: sh.theoHead(entered), format: 'auto' as const }] : []),
      ...(useReal ? [{ key: 'real', head: sh.realHead(basis, entered), format: 'auto' as const }] : []),
      isTime ? { key: 'cycle', head: sh.cycleHead(u), format: 'auto', formula } : { key: 'rate', head: sh.rateHead(rateU), format: 'auto', formula },
    ];
    table = {
      labelHead: sh.stationHead,
      columns,
      rows: s.stations.map((st, i) => {
        const res = r.stations[i]!;
        // El valor real con el que se calcula; si la estación no tiene medidas, 0 y la fórmula usa el teórico.
        const real = res.source === 'theoretical' ? 0 : res.value;
        return { label: names[i]!, values: { ...(hasTheo ? { theo: st.theoretical ?? 0 } : {}), ...(useReal ? { real } : {}) } };
      }),
      ...(isTime ? { highlightMax: 'cycle' } : { highlightMin: 'rate' }),
    };
    if (isTime) {
      results.push(
        { key: 'bottleneckCycle', label: sh.bottleneckCycle, formula: 'MAX({cycle[]})', note: `${u} · ${n.bottleneckCycle}`, format: 'auto' },
        { key: 'bottleneckStation', label: sh.bottleneckStation, formula: 'INDEX({label[]},MATCH({bottleneckCycle},{cycle[]},0))', note: n.bottleneckStation, format: 'text', summary: true },
        { key: 'capacity', label: d.capacity, formula: '{available}/{bottleneckCycle}', note: `${view.unitName} · ${n.capacity}`, format: 'auto', summary: true },
      );
      if (s.kind === 'assembly')
        results.push(
          { key: 'work', label: sh.work, formula: 'SUM({cycle[]})', note: `${u} · ${n.work}`, format: 'auto' },
          { key: 'minStations', label: d.minStations, formula: 'ROUNDUP({work}/{takt},0)', note: n.minStations, format: 'integer', summary: true },
          { key: 'efficiency', label: d.efficiency, formula: '{work}/(COUNT({cycle[]})*{takt})', note: n.efficiency, format: 'percent' },
          { key: 'idle', label: d.idle, formula: '1-{efficiency}', note: n.idle, format: 'percent' },
        );
    } else {
      results.push(
        { key: 'bottleneckRate', label: sh.bottleneckRate, formula: 'MIN({rate[]})', note: `${rateU} · ${n.bottleneckRate}`, format: 'auto' },
        { key: 'bottleneckStation', label: sh.bottleneckStation, formula: 'INDEX({label[]},MATCH({bottleneckRate},{rate[]},0))', note: n.bottleneckStation, format: 'text', summary: true },
        { key: 'capacity', label: d.capacity, formula: '{available}*{bottleneckRate}', note: `${view.unitName} · ${n.capacityRate}`, format: 'auto', summary: true },
      );
      if (s.kind === 'assembly') notes.push(sh.balanceAppOnly);
    }
    if (o)
      results.push(
        isTime
          ? { key: 'expected', label: d.expected, formula: '{available}*{oee}/{theo}', note: `${view.unitName} · ${n.expected}`, format: 'auto', summary: true }
          : { key: 'expected', label: d.expected, formula: '{available}*{theo}*{oee}', note: `${view.unitName} · ${n.expectedRate}`, format: 'auto', summary: true },
        { key: 'minOee', label: d.minOee, formula: isTime ? '{theo}/{takt}' : '{rate}/{theo}', note: isTime ? n.minOee : n.minOeeRate, format: 'percent', summary: true },
        isTime
          ? { key: 'target', label: d.target, formula: '{takt}*{oee}', note: `${u} · ${n.target}`, format: 'auto', summary: true }
          : { key: 'target', label: d.target, formula: '{rate}/{oee}', note: `${rateU} · ${n.targetRate}`, format: 'auto', summary: true },
      );
    notes.push(isTime ? sh.highlightMax : sh.highlightMin);
    if (useReal) notes.push(sh.realNote(basis));
    s.stations.forEach((st, i) => {
      if (st.actual.length) notes.push(sh.measuresNote(names[i]!, entered, st.actual.map(f.num).join(' · ')));
    });
  }
  notes.push(g.readingNote);

  return {
    fileTitle: `${sh.file} · ${opts.date}`,
    tabTitle: sh.tab,
    heading: d.name,
    subheading: g.subheading(opts.version, opts.date),
    texts: {
      summary: g.summary,
      inputs: g.inputs,
      results: g.results,
      reading: g.reading,
      notes: g.notes,
      inputHeads: [g.inputHeads[0]!, g.inputHeads[1]!, g.inputHeads[2]!],
      resultHeads: [g.resultHeads[0]!, g.resultHeads[1]!, g.resultHeads[2]!],
      editHint: g.editHint,
      prefixes: g.prefixes,
    },
    inputs,
    table,
    results,
    reading: opts.reading,
    notes,
  };
}
