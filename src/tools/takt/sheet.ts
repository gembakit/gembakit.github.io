import type { Messages } from '../../i18n';
import { fromCycle, SECONDS, toCycle, type Pace, type TaktResult, type TimeUnit } from '../../calc/takt';
import type { ReadingLine, SheetDef, SheetInput, SheetResult, SheetTableColumn } from '../../sheet/types';
import { paceLabel, taktFormat } from './explain';
import { basisName, deductionNames, stationItem, stationNames, stationPer, stationsMeasure, taktView, type TaktSaved, type TaktStationSaved } from './reading';

// Hoja del takt: los mismos cálculos que src/calc/takt.ts, como fórmulas
// vivas. Los tiempos van en la unidad de los resultados (lo escrito en otra
// unidad se convierte y la nota dice el original). Si todas las estaciones
// se escribieron en la misma unidad y cuentan lo mismo que la demanda, la
// tabla lleva lo escrito y la última columna lo pasa a la unidad de los
// resultados; si no, la tabla lleva los valores ya pasados y una nota por
// estación dice cómo se escribieron. La prueba sheet.test.ts comprueba que la
// hoja da lo mismo que el cálculo.

/** Número para una fórmula, sin colas de coma flotante. */
const n12 = (x: number) => String(Number(x.toPrecision(12)));

/** Fórmula que pasa de una unidad a otra: «*60», «/60» o nada. */
function scale(factor: number): string {
  if (Math.abs(factor - 1) < 1e-12) return '';
  return factor > 1 ? `*${n12(factor)}` : `/${n12(1 / factor)}`;
}

/** Fórmula que pasa una celda de una unidad a otra (de ciclo a velocidad, si hace falta). */
function convertFormula(cell: string, from: Pace, to: Pace): string {
  if (from.measure === to.measure)
    return `${cell}${scale(from.measure === 'time' ? SECONDS[from.unit] / SECONDS[to.unit] : SECONDS[to.unit] / SECONDS[from.unit])}`;
  // Del ciclo a la velocidad (o al revés): K ÷ valor.
  const k = from.measure === 'rate' ? SECONDS[from.unit] / SECONDS[to.unit] : SECONDS[to.unit] / SECONDS[from.unit];
  return `${n12(k)}/${cell}`;
}

export function taktSheet(s: TaktSaved, r: TaktResult, t: Messages, lang: 'es' | 'en', opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.takt;
  const sh = d.sheet;
  const n = sh.notes;
  const g = t.sheet;
  const view = taktView(s, t);
  const f = taktFormat(lang, t, view);
  const tu = s.result.unit;
  const u = d.units[tu]!;
  const isTime = s.result.measure === 'time';
  const cycleU = paceLabel(t, { measure: 'time', unit: tu }, view.unitName);
  const rateU = paceLabel(t, { measure: 'rate', unit: tu }, view.unitName);
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
        ? { key: 'theo', label: sh.theoCycle(ref), value: o.theoreticalCycle / SECONDS[tu], note: cycleU, format: 'auto' }
        : { key: 'theo', label: sh.theoRate(ref), value: SECONDS[tu] / o.theoreticalCycle, note: rateU, format: 'auto' },
    );
  }

  const minus = s.deductions.map((_, i) => `-{d${i}}`).join('');
  const results: SheetResult[] = [
    { key: 'available', label: sh.available, formula: s.shifts === 1 && !minus ? '{shift}' : `({shift}${minus})*{shifts}`, note: `${u} · ${n.available}`, format: 'auto' },
    isTime
      ? { key: 'takt', label: d.taktTitle, formula: '{available}/{demand}', note: `${cycleU} · ${n.takt}`, format: 'auto', main: true }
      : { key: 'rate', label: sh.rate, formula: '{demand}/{available}', note: `${rateU} · ${n.rate}`, format: 'auto', main: true },
  ];

  const notes: string[] = [sh.unitNote(d.unitNames[tu] ?? u)];
  let table: SheetDef['table'];
  if (s.stations.length) {
    // Una sola unidad para todas y contando lo mismo que la demanda: la tabla lleva lo escrito.
    const first = s.stations[0]!;
    const same = s.stations.every((st) => st.measure === first.measure && st.unit === first.unit && stationPer(st) === 1 && !st.item.trim());
    const entered: Pace = same ? { measure: first.measure, unit: first.unit } : s.result;
    const enteredU = paceLabel(t, entered, view.unitName);
    // Un valor de la estación, en la unidad de la tabla.
    const toTable = (st: TaktStationSaved, v: number) => (same ? v : fromCycle(toCycle(v, st.measure, st.unit) / stationPer(st), entered.measure, entered.unit));
    const hasTheo = s.stations.some((st) => st.theoretical !== null);
    const useReal = s.basis !== 'theoretical';
    const basis = basisName(s.basis, stationsMeasure(s), t);
    const from = (col: string) => convertFormula(`{.${col}}`, entered, s.result);
    const formula = !useReal ? from('theo') : hasTheo ? `IF({.real}>0,${from('real')},${from('theo')})` : from('real');
    const columns: SheetTableColumn[] = [
      ...(hasTheo ? [{ key: 'theo', head: sh.theoHead(enteredU), format: 'auto' as const }] : []),
      ...(useReal ? [{ key: 'real', head: sh.realHead(basis, enteredU), format: 'auto' as const }] : []),
      isTime ? { key: 'cycle', head: sh.cycleHead(cycleU), format: 'auto', formula } : { key: 'rate', head: sh.rateHead(rateU), format: 'auto', formula },
    ];
    table = {
      labelHead: sh.stationHead,
      columns,
      rows: s.stations.map((st, i) => {
        const res = r.stations[i]!;
        // El valor real con el que se calcula; si la estación no tiene medidas, 0 y la fórmula usa el estándar.
        const real = res.source === 'theoretical' ? 0 : toTable(st, res.value);
        return { label: names[i]!, values: { ...(hasTheo ? { theo: st.theoretical === null ? 0 : toTable(st, st.theoretical) } : {}), ...(useReal ? { real } : {}) } };
      }),
      ...(isTime ? { highlightMax: 'cycle' } : { highlightMin: 'rate' }),
    };
    if (isTime) {
      results.push(
        { key: 'bottleneckCycle', label: sh.bottleneckCycle, formula: 'MAX({cycle[]})', note: `${cycleU} · ${n.bottleneckCycle}`, format: 'auto' },
        { key: 'bottleneckStation', label: sh.bottleneckStation, formula: 'INDEX({label[]},MATCH({bottleneckCycle},{cycle[]},0))', note: n.bottleneckStation, format: 'text', summary: true },
        { key: 'capacity', label: d.capacity, formula: '{available}/{bottleneckCycle}', note: `${view.unitName} · ${n.capacity}`, format: 'auto', summary: true },
      );
      if (s.balance)
        results.push(
          { key: 'work', label: sh.work, formula: 'SUM({cycle[]})', note: `${cycleU} · ${n.work}`, format: 'auto' },
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
      if (s.balance) notes.push(sh.balanceAppOnly);
    }
    if (o)
      results.push(
        isTime
          ? { key: 'expected', label: d.expected, formula: '{available}*{oee}/{theo}', note: `${view.unitName} · ${n.expected}`, format: 'auto', summary: true }
          : { key: 'expected', label: d.expected, formula: '{available}*{theo}*{oee}', note: `${view.unitName} · ${n.expectedRate}`, format: 'auto', summary: true },
        { key: 'minOee', label: d.minOee, formula: isTime ? '{theo}/{takt}' : '{rate}/{theo}', note: isTime ? n.minOee : n.minOeeRate, format: 'percent', summary: true },
        isTime
          ? { key: 'target', label: d.target, formula: '{takt}*{oee}', note: `${cycleU} · ${n.target}`, format: 'auto', summary: true }
          : { key: 'target', label: d.target, formula: '{rate}/{oee}', note: `${rateU} · ${n.targetRate}`, format: 'auto', summary: true },
      );
    notes.push(isTime ? sh.highlightMax : sh.highlightMin);
    if (useReal) notes.push(sh.realNote(basis));
    s.stations.forEach((st, i) => {
      const own = paceLabel(t, st, stationItem(st, view.unitName));
      if (!same) {
        const item = st.item.trim();
        notes.push(sh.stationConverted(names[i]!, own, item ? d.perText(d.singular(item), f.num(st.per), view.unitName) : '', enteredU));
      }
      if (st.actual.length) notes.push(sh.measuresNote(names[i]!, own, st.actual.map(f.num).join(' · ')));
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
