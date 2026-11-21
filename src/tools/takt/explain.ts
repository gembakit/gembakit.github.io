import { SECONDS, type Pace, type TaktInput, type TaktResult, type TimeUnit } from '../../calc/takt';
import type { Messages } from '../../i18n';
import { subscript, type Derivation } from '../../ui/Explained';
import { frac, minus, times, type Expr } from '../../ui/expr';
import { formatNumber, formatPercent } from '../../ui/number';

/** Cómo se ve el resultado: en qué unidad completa, con qué nombre de unidad y si lleva balanceo. */
export interface TaktView {
  result: Pace;
  unitName: string;
  balance: boolean;
}

/** Unidad de tiempo con la que un número se lee bien: s por debajo del minuto, min por debajo de la hora. */
export const readableUnit = (sec: number): TimeUnit => (sec < 60 ? 's' : sec < 3600 ? 'min' : 'h');

/** Unidad de la resta del turno: la más pequeña entre el turno y sus descuentos. */
export function subtractionUnit(input: { shiftUnit: TimeUnit; deductions: { unit: TimeUnit }[] }): TimeUnit {
  return [input.shiftUnit, ...input.deductions.map((x) => x.unit)].reduce((a, b) => (SECONDS[b] < SECONDS[a] ? b : a));
}

/** Los decimales que pide el número: 44.500, 140,2, 1,8, 0,09, 0,0809. */
export function smartDecimals(x: number): number {
  const a = Math.abs(x);
  return a === 0 ? 0 : a >= 1000 ? 0 : a >= 100 ? 1 : a >= 1 ? 2 : Math.min(8, 2 - Math.floor(Math.log10(a)));
}

export function smartNumber(x: number, lang: 'es' | 'en'): string {
  return formatNumber(x, lang, smartDecimals(x));
}

/** Unidad completa: «min/pack», «botellas/h» (el nombre va en plural y se pasa a singular cuando hace falta). */
export function paceLabel(t: Messages, p: Pace, item: string): string {
  const d = t.tools.takt;
  return p.measure === 'time' ? d.perItem(d.units[p.unit]!, d.singular(item)) : d.rateOf(item, d.units[p.unit]!);
}

/** Cómo se muestra cada valor en pantalla y en la hoja: la ventana de «de dónde sale» usa exactamente lo mismo. */
export function taktFormat(lang: 'es' | 'en', t: Messages, v: TaktView) {
  const d = t.tools.takt;
  const num = (x: number) => smartNumber(x, lang);
  const ru = v.result.unit;
  /** Una duración: «430 min». */
  const time = (sec: number, u: TimeUnit = ru) => `${num(sec / SECONDS[u])} ${d.units[u]}`;
  /** Un tiempo por unidad: «2 min/pack». */
  const cycle = (sec: number, u: TimeUnit = ru) => `${num(sec / SECONDS[u])} ${paceLabel(t, { measure: 'time', unit: u }, v.unitName)}`;
  /** Una velocidad: «30 packs/h». */
  const rate = (sec: number, u: TimeUnit = ru) => `${num(SECONDS[u] / sec)} ${paceLabel(t, { measure: 'rate', unit: u }, v.unitName)}`;
  return {
    num,
    time,
    cycle,
    rate,
    unitName: v.unitName,
    /** En la unidad de los resultados. */
    main: (sec: number) => (v.result.measure === 'time' ? cycle(sec) : rate(sec)),
    /** La otra forma, en una unidad legible: «30 packs/h», «0,09 s/botella». */
    alt: (sec: number) => (v.result.measure === 'time' ? rate(sec, 'h') : cycle(sec, readableUnit(sec))),
    /** Cada cuánto sale una unidad, para las frases: «cada 2 min». */
    every: (sec: number) => time(sec, v.result.measure === 'time' ? ru : readableUnit(sec)),
    /** Un valor de una estación tal como se escribe, con su unidad completa: «44.500 botellas/h», «98 s/pack». */
    station: (x: number, st: Pace & { item: string }) => `${num(x)} ${paceLabel(t, st, st.item.trim() || v.unitName)}`,
    /** Unidades: «900.000 botellas». */
    units: (x: number) => `${formatNumber(x, lang, x >= 100 ? 0 : 1)} ${v.unitName}`,
    pct: (x: number) => `${formatPercent(x, lang)} %`,
  };
}

export type TaktKey = 'available' | 'takt' | 'capacity' | 'minStations' | 'efficiency' | 'idle' | 'expected' | 'minOee' | 'target';

/** De dónde sale cada valor del takt, con los números del usuario. */
export function taktExplain(
  input: TaktInput,
  names: string[],
  deductionNames: string[],
  r: TaktResult,
  view: TaktView,
  t: Messages,
  lang: 'es' | 'en',
): Record<TaktKey, Derivation | null> {
  const d = t.tools.takt;
  const x = d.explain;
  const f = taktFormat(lang, t, view);
  const u = view.result.unit;
  // La resta del turno, en la unidad más pequeña escrita (480 − 10 − 20 min, no 8 − 0,167 − 0,333 h).
  const au = subtractionUnit(input);
  const inU = (value: number, unit: TimeUnit) => (value * SECONDS[unit]) / SECONDS[au];
  const shown = (value: number, unit: TimeUnit) =>
    unit === au ? f.time(value * SECONDS[unit], au) : x.converted(f.time(value * SECONDS[unit], au), `${f.num(value)} ${d.units[unit]}`);

  // Tiempo disponible: (turno − d₁ − d₂…) × turnos.
  const dSym = (i: number) => `d${subscript(i + 1)}`;
  const chain = (first: Expr, rest: Expr[]) => rest.reduce<Expr>((a, b) => minus(a, b), first);
  const shiftNum = f.num(inU(input.shift, input.shiftUnit));
  let symbolic = chain(x.shiftSym, input.deductions.map((_, i) => dSym(i)));
  let numeric = chain(shiftNum, input.deductions.map((dd) => f.num(inU(dd.value, dd.unit))));
  if (input.shifts !== 1) {
    symbolic = times(symbolic, x.shiftsSym);
    numeric = times(numeric, f.num(input.shifts));
  }
  const available: Derivation = {
    title: d.availableStat,
    meaning: x.availableMeaning,
    lhs: x.availableSym,
    steps: [symbolic, numeric, f.time(r.available, au), ...(au !== u ? [f.time(r.available)] : [])],
    where: [
      { sym: x.shiftSym, label: d.shift, value: shown(input.shift, input.shiftUnit) },
      ...input.deductions.map((dd, i) => ({ sym: dSym(i), label: deductionNames[i] ?? d.deductionName(i + 1), value: shown(dd.value, dd.unit) })),
      ...(input.shifts !== 1 ? [{ sym: x.shiftsSym, label: d.shifts, value: f.num(input.shifts) }] : []),
    ],
    notes: [t.explain.rounded],
  };

  const T = f.time(r.available);
  const D = f.units(input.demand);
  const wT = { sym: x.availableSym, label: d.availableStat, value: T };
  const wD = { sym: x.demandSym, label: d.demand, value: D };
  const isTime = view.result.measure === 'time';
  const takt: Derivation = isTime
    ? { term: 'takt', lhs: 'Takt', steps: [frac(x.availableSym, x.demandSym), frac(T, f.num(input.demand)), f.cycle(r.takt)], where: [wT, wD], notes: [t.explain.rounded] }
    : {
        term: 'takt',
        title: d.rateTitle,
        lhs: x.rateSym,
        steps: [frac(x.demandSym, x.availableSym), frac(f.num(input.demand), T), f.rate(r.takt)],
        where: [wD, wT],
        notes: [t.explain.rounded],
      };

  const none = { capacity: null, minStations: null, efficiency: null, idle: null, expected: null, minOee: null, target: null };
  const line = r.line;
  if (!line) return { available, takt, ...none };

  const slowest = names[line.bottleneck] ?? d.stationName(line.bottleneck + 1);
  const capacity: Derivation = isTime
    ? {
        title: d.capacity,
        meaning: x.capacityMeaning,
        lhs: d.capacity,
        steps: [frac(x.availableSym, x.maxSym), frac(T, f.cycle(line.bottleneckCycle)), f.units(line.capacity)],
        where: [wT, { sym: x.maxSym, label: x.maxLabel(slowest), value: f.cycle(line.bottleneckCycle) }],
        notes: [t.explain.rounded],
      }
    : {
        title: d.capacity,
        meaning: x.capacityMeaning,
        lhs: d.capacity,
        steps: [times(x.availableSym, x.minRateSym), times(T, f.rate(line.bottleneckCycle)), f.units(line.capacity)],
        where: [wT, { sym: x.minRateSym, label: x.minRateLabel(slowest), value: f.rate(line.bottleneckCycle) }],
        notes: [t.explain.rounded],
      };

  let balance: Pick<Record<TaktKey, Derivation | null>, 'minStations' | 'efficiency' | 'idle'> = { minStations: null, efficiency: null, idle: null };
  const b = line.balance;
  if (b) {
    // El balanceo es de tiempos: con velocidades, en una unidad legible.
    const bu = isTime ? u : readableUnit(r.takt);
    const bt = (sec: number) => f.cycle(sec, bu);
    const sum = bt(b.work);
    const n = String(r.stations.length);
    const eff = f.pct(b.efficiency);
    const wSum = { sym: x.sumSym, label: x.sumLabel, value: sum };
    const wTakt = { sym: 'Takt', label: x.taktLabel, value: bt(r.takt) };
    balance = {
      minStations: {
        title: d.minStations,
        meaning: x.minMeaning,
        lhs: d.minStations,
        steps: [frac(x.sumSym, 'Takt'), frac(sum, bt(r.takt)), f.num(b.minStationsRaw), String(b.minStations)],
        where: [wSum, wTakt],
        notes: [x.ceilNote],
      },
      efficiency: {
        title: d.efficiency,
        meaning: x.effMeaning,
        lhs: d.efficiency,
        steps: [frac(x.sumSym, times(x.countSym, 'Takt')), frac(sum, times(n, bt(r.takt))), eff],
        where: [wSum, { sym: x.countSym, label: x.countLabel, value: n }, wTakt],
        notes: [t.explain.rounded],
      },
      idle: {
        title: d.idle,
        meaning: x.idleMeaning,
        lhs: d.idle,
        steps: [minus('1', x.effSym), minus('100 %', eff), f.pct(b.idle)],
        where: [{ sym: x.effSym, label: d.efficiency, value: eff }],
      },
    };
  }

  const o = r.oee;
  if (!o) return { available, takt, capacity, ...balance, expected: null, minOee: null, target: null };
  const ref = names[o.reference] ?? d.stationName(o.reference + 1);
  const oeePct = f.pct(o.oee);
  const wOee = { sym: x.oeeSym, label: x.oeeLabel, value: oeePct };
  const wTheo = isTime
    ? { sym: x.theoSym, label: x.theoLabel(ref), value: f.cycle(o.theoreticalCycle) }
    : { sym: x.theoRateSym, label: x.theoRateLabel(ref), value: f.rate(o.theoreticalCycle) };
  return {
    available,
    takt,
    capacity,
    ...balance,
    expected: {
      title: d.expected,
      meaning: x.expectedMeaning,
      lhs: d.expected,
      steps: isTime
        ? [frac(times(x.availableSym, x.oeeSym), x.theoSym), frac(times(T, oeePct), f.cycle(o.theoreticalCycle)), f.units(o.expected)]
        : [times(x.availableSym, x.theoRateSym, x.oeeSym), times(T, f.rate(o.theoreticalCycle), oeePct), f.units(o.expected)],
      where: [wT, wTheo, wOee],
      notes: [t.explain.rounded],
    },
    minOee: {
      title: d.minOee,
      meaning: x.minOeeMeaning,
      lhs: d.minOee,
      steps: isTime
        ? [frac(x.theoSym, 'Takt'), frac(f.cycle(o.theoreticalCycle), f.cycle(r.takt)), f.pct(o.minOee)]
        : [frac(x.rateSym, x.theoRateSym), frac(f.rate(r.takt), f.rate(o.theoreticalCycle)), f.pct(o.minOee)],
      where: isTime ? [wTheo, { sym: 'Takt', label: x.taktLabel, value: f.cycle(r.takt) }] : [{ sym: x.rateSym, label: d.rateTitle, value: f.rate(r.takt) }, wTheo],
      notes: [t.explain.rounded],
    },
    target: {
      title: d.target,
      meaning: isTime ? x.targetMeaning : x.targetRateMeaning,
      lhs: x.targetSym,
      steps: isTime
        ? [times('Takt', x.oeeSym), times(f.cycle(r.takt), oeePct), f.cycle(o.targetCycle)]
        : [frac(x.rateSym, x.oeeSym), frac(f.rate(r.takt), oeePct), f.rate(o.targetCycle)],
      where: isTime ? [{ sym: 'Takt', label: x.taktLabel, value: f.cycle(r.takt) }, wOee] : [{ sym: x.rateSym, label: d.rateTitle, value: f.rate(r.takt) }, wOee],
      notes: [x.targetNote(isTime ? f.cycle(o.theoreticalCycle) : f.rate(o.theoreticalCycle), ref), t.explain.rounded],
    },
  };
}
