import type { TaktInput, TaktResult } from '../../calc/takt';
import type { Messages } from '../../i18n';
import type { Derivation } from '../../ui/Explained';
import { frac, minus, times } from '../../ui/expr';
import { formatNumber, formatPercent } from '../../ui/number';

/** Cómo se muestra cada valor en pantalla: la ventana usa exactamente lo mismo. */
export function taktFormat(lang: 'es' | 'en', t: Messages, unit: string) {
  const u = t.tools.takt.units[unit] ?? unit;
  const num = (x: number, d = 2) => formatNumber(x, lang, d);
  return {
    num,
    time: (x: number) => `${num(x, 2)} ${u}`,
    pieces: (x: number) => num(x, 1),
    pct: (x: number) => `${formatPercent(x, lang)} %`,
  };
}

export interface NamedStation {
  name: string;
  cycle: number;
}

export type TaktKey = 'takt' | 'capacity' | 'minStations' | 'efficiency' | 'idle';

/** De dónde sale cada valor del takt, con los números del usuario. */
export function taktExplain(input: TaktInput, stations: NamedStation[], r: TaktResult, t: Messages, lang: 'es' | 'en'): Record<TaktKey, Derivation | null> {
  const d = t.tools.takt;
  const x = d.explain;
  const f = taktFormat(lang, t, input.unit);
  const units = d.units;
  // Tiempo disponible en la unidad del takt; si se escribió en otra, se dice cuál.
  const T = f.time(r.availableInUnit);
  const Tshown = input.availableUnit === input.unit ? T : x.converted(T, `${f.num(input.available, 2)} ${units[input.availableUnit]}`);
  const D = f.num(input.demand, 2);
  const wT = { sym: x.availableSym, label: d.available, value: Tshown };
  const wD = { sym: x.demandSym, label: d.demand, value: `${D} ${d.pieces}` };
  const wTakt = { sym: 'Takt', label: x.taktLabel, value: f.time(r.takt) };
  const line = r.line;

  const takt: Derivation = { term: 'takt', lhs: 'Takt', steps: [frac(x.availableSym, x.demandSym), frac(T, D), f.time(r.takt)], where: [wT, wD], notes: [t.explain.rounded] };
  if (!line) return { takt, capacity: null, minStations: null, efficiency: null, idle: null };

  const slowest = stations[line.bottleneck]?.name ?? d.stationName(line.bottleneck + 1);
  const wMax = { sym: x.maxSym, label: x.maxLabel(slowest), value: f.time(line.bottleneckCycle) };
  const sum = f.time(line.work);
  const wSum = { sym: x.sumSym, label: x.sumLabel, value: sum };
  const n = String(stations.length);
  const wN = { sym: x.countSym, label: x.countLabel, value: n };
  const eff = f.pct(line.efficiency);
  return {
    takt,
    capacity: {
      title: d.capacity,
      meaning: x.capacityMeaning,
      lhs: d.capacity,
      steps: [frac(x.availableSym, x.maxSym), frac(T, f.time(line.bottleneckCycle)), `${f.pieces(line.capacity)} ${d.pieces}`],
      where: [wT, wMax],
      notes: [t.explain.rounded],
    },
    minStations: {
      title: d.minStations,
      meaning: x.minMeaning,
      lhs: d.minStations,
      steps: [frac(x.sumSym, 'Takt'), frac(sum, f.time(r.takt)), f.num(line.minStationsRaw, 2), String(line.minStations)],
      where: [wSum, wTakt],
      notes: [x.ceilNote],
    },
    efficiency: {
      title: d.efficiency,
      meaning: x.effMeaning,
      lhs: d.efficiency,
      steps: [frac(x.sumSym, times(x.countSym, 'Takt')), frac(sum, times(n, f.time(r.takt))), eff],
      where: [wSum, wN, wTakt],
      notes: [t.explain.rounded],
    },
    idle: {
      title: d.idle,
      meaning: x.idleMeaning,
      lhs: d.idle,
      steps: [minus('1', x.effSym), minus('100 %', eff), f.pct(line.idle)],
      where: [{ sym: x.effSym, label: d.efficiency, value: eff }],
    },
  };
}
