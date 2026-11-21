import type { Messages } from '../../i18n';
import { stationStats, takt, TIME_UNITS, type Basis, type Measure, type Pace, type TaktInput, type TaktResult, type TimeUnit } from '../../calc/takt';
import type { CalcWarning } from '../../calc/types';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { taktFormat, type TaktView } from './explain';
import { taktSheet } from './sheet';

// Datos guardados del takt y su «Cómo leerlo» sin pantalla: la usan la
// herramienta y la hoja del proyecto, para que digan siempre lo mismo.

/** Una estación guardada: su unidad, lo que cuenta y sus valores en esa unidad. */
export interface TaktStationSaved {
  name: string;
  measure: Measure;
  unit: TimeUnit;
  /** Lo que cuenta si no es la unidad de la demanda («paquetes»); vacío: lo mismo que la demanda. */
  item: string;
  /** Unidades de la demanda en una de las suyas (1 paquete = 12 botellas); cuenta solo si `item` no está vacío. */
  per: number;
  theoretical: number | null;
  actual: number[];
  /** Forma en que se tomaron las medidas, si no es `measure` (se cambió la unidad después): la media se saca en esa. */
  origin?: Measure;
}

/** Datos del takt guardados en un proyecto (versión 3, 2026-11-21: cada estación con su unidad). */
export interface TaktSaved {
  v: 3;
  shift: number;
  shiftUnit: TimeUnit;
  deductions: { name: string; value: number; unit: TimeUnit }[];
  shifts: number;
  demand: number;
  /** Vacío: «piezas». */
  unitName: string;
  /** Unidad de las estaciones nuevas (la de arriba: al cambiarla, se convierten todas). */
  stationUnit: Pace;
  /** Cómo se ven los resultados. */
  result: Pace;
  balance: boolean;
  basis: Basis;
  stations: TaktStationSaved[];
  /** OEE esperado, de 0 a 1. */
  oee: number | null;
  /** Receta de la que salieron las estaciones (planta, línea y nombre), si se cargó una. */
  recipe?: { plant: string; line: string; name: string };
}

/** Formato de la versión 2 (2026-11-16 a 2026-11-21): una sola unidad para toda la línea y el tipo de línea. */
interface TaktSavedV2 {
  v: 2;
  shift: number;
  shiftUnit: TimeUnit;
  deductions: { name: string; value: number; unit: TimeUnit }[];
  shifts: number;
  demand: number;
  unitName: string;
  measure: Measure;
  measureUnit: TimeUnit;
  resultUnit: TimeUnit;
  kind: 'assembly' | 'machines';
  basis: Basis;
  stations: { name: string; theoretical: number | null; actual: number[] }[];
  oee: number | null;
}

/** Formato de la versión 1 (hasta el 2026-11-16): tiempo disponible directo y un ciclo por estación. */
interface TaktSavedV1 {
  available: number;
  availableUnit: TimeUnit;
  demand: number;
  unit: TimeUnit;
  stations: { name: string; cycle: number }[];
}

const isUnit = (u: unknown): u is TimeUnit => TIME_UNITS.includes(u as TimeUnit);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isMeasure = (m: unknown): m is Measure => m === 'time' || m === 'rate';
const isPace = (p: unknown): p is Pace => typeof p === 'object' && p !== null && isMeasure((p as Pace).measure) && isUnit((p as Pace).unit);
const isBasis = (b: unknown): b is Basis => b === 'mean' || b === 'repeatable' || b === 'theoretical';
const isDeductions = (x: unknown) => Array.isArray(x) && x.every((d) => isNum(d?.value) && isUnit(d?.unit));
const isValues = (st: { theoretical?: unknown; actual?: unknown }) => Array.isArray(st.actual) && st.actual.every(isNum) && (st.theoretical === null || isNum(st.theoretical));
const text = (x: unknown) => (typeof x === 'string' ? x : '');

/** Lee unos datos guardados, de cualquier versión; null si no son del takt. */
const isNames = (x: unknown): x is { plant: string; line: string; name: string } =>
  typeof x === 'object' && x !== null && ['plant', 'line', 'name'].every((k) => typeof (x as Record<string, unknown>)[k] === 'string');

export function readTaktSaved(x: unknown): TaktSaved | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  if (o.v === 3) {
    const s = o as unknown as TaktSaved;
    const ok =
      isNum(s.shift) &&
      isUnit(s.shiftUnit) &&
      isDeductions(s.deductions) &&
      isNum(s.shifts) &&
      isNum(s.demand) &&
      isPace(s.stationUnit) &&
      isPace(s.result) &&
      typeof s.balance === 'boolean' &&
      isBasis(s.basis) &&
      Array.isArray(s.stations) &&
      s.stations.every((st) => isMeasure(st.measure) && isUnit(st.unit) && isNum(st.per) && isValues(st) && (st.origin === undefined || isMeasure(st.origin)));
    if (!ok) return null;
    return {
      ...s,
      unitName: text(s.unitName),
      stations: s.stations.map((st) => ({ ...st, name: text(st.name), item: text(st.item) })),
      oee: isNum(s.oee) ? s.oee : null,
      recipe: isNames(s.recipe) ? s.recipe : undefined,
    };
  }
  if (o.v === 2) {
    const s = o as unknown as TaktSavedV2;
    const ok =
      isNum(s.shift) &&
      isUnit(s.shiftUnit) &&
      isDeductions(s.deductions) &&
      isNum(s.shifts) &&
      isNum(s.demand) &&
      isMeasure(s.measure) &&
      isUnit(s.measureUnit) &&
      isUnit(s.resultUnit) &&
      (s.kind === 'assembly' || s.kind === 'machines') &&
      isBasis(s.basis) &&
      Array.isArray(s.stations) &&
      s.stations.every(isValues);
    if (!ok) return null;
    // Toda la línea tenía una sola unidad; «Montaje con puestos» era el que calculaba el balanceo.
    return {
      v: 3,
      shift: s.shift,
      shiftUnit: s.shiftUnit,
      deductions: s.deductions,
      shifts: s.shifts,
      demand: s.demand,
      unitName: text(s.unitName),
      stationUnit: { measure: s.measure, unit: s.measureUnit },
      result: { measure: s.measure, unit: s.resultUnit },
      balance: s.kind === 'assembly',
      basis: s.basis,
      stations: s.stations.map((st) => ({ name: text(st.name), measure: s.measure, unit: s.measureUnit, item: '', per: 1, theoretical: st.theoretical, actual: st.actual })),
      oee: isNum(s.oee) ? s.oee : null,
    };
  }
  const v1 = o as unknown as TaktSavedV1;
  if (isNum(v1.available) && isUnit(v1.availableUnit) && isNum(v1.demand) && isUnit(v1.unit) && Array.isArray(v1.stations)) {
    return {
      v: 3,
      shift: v1.available,
      shiftUnit: v1.availableUnit,
      deductions: [],
      shifts: 1,
      demand: v1.demand,
      unitName: '',
      stationUnit: { measure: 'time', unit: v1.unit },
      result: { measure: 'time', unit: v1.unit },
      balance: true,
      basis: 'mean',
      stations: v1.stations.map((st) => ({ name: text(st.name), measure: 'time', unit: v1.unit, item: '', per: 1, theoretical: null, actual: isNum(st.cycle) ? [st.cycle] : [] })),
      oee: null,
    };
  }
  return null;
}

/** Lo que cuenta una estación: su propia cosa o, si no tiene, la unidad de la demanda. */
export const stationItem = (st: { item: string }, unitName: string) => st.item.trim() || unitName;
/** Equivalencia que cuenta: con su propia cosa, la escrita; si no, 1. */
export const stationPer = (st: { item: string; per: number }) => (st.item.trim() ? st.per : 1);

export const toTaktInput = (s: TaktSaved): TaktInput => ({
  shift: s.shift,
  shiftUnit: s.shiftUnit,
  deductions: s.deductions.map((d) => ({ value: d.value, unit: d.unit })),
  shifts: s.shifts,
  demand: s.demand,
  balance: s.balance,
  basis: s.basis,
  stations: s.stations.map((st) => ({ measure: st.measure, unit: st.unit, per: stationPer(st), theoretical: st.theoretical, actual: st.actual, origin: st.origin })),
  oee: s.oee,
});

export const taktView = (s: TaktSaved, t: Messages): TaktView => ({
  result: s.result,
  unitName: s.unitName.trim() || t.tools.takt.defaultUnit,
  balance: s.balance,
});

/** Nombres de las estaciones (sin nombre: «Estación n»). */
export const stationNames = (s: TaktSaved, t: Messages) => s.stations.map((st, i) => st.name.trim() || t.tools.takt.stationName(i + 1));
export const deductionNames = (s: TaktSaved, t: Messages) => s.deductions.map((d, i) => d.name.trim() || t.tools.takt.deductionName(i + 1));

/** La forma de medir de todas las estaciones, o null si hay de las dos. */
export function stationsMeasure(s: TaktSaved): Measure | null {
  const m = new Set(s.stations.map((st) => st.measure));
  return m.size === 0 ? s.stationUnit.measure : m.size === 1 ? [...m][0]! : null;
}

/** «Repetible»: menor en tiempos, mayor en velocidades; si las estaciones se miden de las dos formas, sin decir cuál. */
export const basisName = (basis: Basis, measure: Measure | null, t: Messages) =>
  basis === 'repeatable' ? (measure ? t.tools.takt.stat.repeatable[measure]! : t.tools.takt.bases.repeatable!) : t.tools.takt.bases[basis]!;

export function taktWarnings(list: CalcWarning[], s: TaktSaved, t: Messages, lang: 'es' | 'en'): string[] {
  const d = t.tools.takt;
  const w = d.warn;
  const names = stationNames(s, t);
  const f = taktFormat(lang, t, taktView(s, t));
  return list
    .map((x) => {
      switch (x.code) {
        case 'not-positive':
          return x.field === 'demand' ? w.demand : x.field === 'shifts' ? w.shifts : w.shift;
        case 'deduction-not-positive':
          return w.deduction(deductionNames(s, t)[x.step]!);
        case 'no-time':
          return w.noTime;
        case 'per-not-positive':
          return w.per(names[x.step]!, d.singular(s.stations[x.step]!.item.trim()), f.unitName);
        case 'step-not-positive':
          return w.station(names[x.step]!);
        case 'station-empty':
          return w.stationEmpty(names[x.step]!);
        case 'over-takt':
          return w.overTakt;
        case 'unstable': {
          const station = s.stations[x.step]!;
          const st = stationStats(station.actual, station.measure, station.origin)!;
          return w.unstable(names[x.step]!, f.station(st.min, station), f.station(st.max, station), s.balance);
        }
        case 'basis-fallback': {
          const r = takt(toTaktInput(s)).result;
          return w.fallback(names[x.step]!, w.used[r?.stations[x.step]?.source ?? 'mean']!);
        }
        case 'oee-range':
          return w.oeeRange;
        case 'oee-no-theoretical':
          return w.oeeNoTheoretical;
        case 'oee-partial':
          return w.oeePartial;
        default:
          return null;
      }
    })
    .filter((x): x is string => x !== null);
}

/** Conclusión: el takt, el cuello de botella y, con OEE, si la línea llega. */
export function taktConclusion(r: TaktResult, s: TaktSaved, t: Messages, lang: 'es' | 'en'): string {
  const d = t.tools.takt;
  const view = taktView(s, t);
  const f = taktFormat(lang, t, view);
  const names = stationNames(s, t);
  const demand = f.units(s.demand);
  const isTime = view.result.measure === 'time';
  const parts = [isTime ? d.conclusionTime(f.every(r.takt), f.alt(r.takt), demand) : d.conclusionRate(f.main(r.takt), f.every(r.takt), demand)];
  const line = r.line;
  if (line) {
    const st = r.stations[line.bottleneck]!;
    const theo = st.ofTheoretical !== null ? d.ofTheoretical(f.pct(st.ofTheoretical)) : '';
    const name = names[line.bottleneck]!;
    parts.push(
      line.over.length
        ? d.bottleneckOver(name, f.main(line.bottleneckCycle), theo, f.units(line.capacity), demand)
        : d.bottleneckOk(name, f.main(line.bottleneckCycle), theo, f.units(line.capacity)),
    );
    if (line.balance) parts.push(d.stationsNote(line.balance.minStations, s.stations.length));
  }
  const o = r.oee;
  if (o) {
    const oee = f.pct(o.oee);
    const expected = f.units(o.expected);
    // Ritmo esperado en velocidad: «36.000 botellas/h».
    const effective = o.theoreticalCycle / o.oee;
    const rate = isTime ? f.alt(effective) : f.main(effective);
    if (o.minOee > 1) parts.push(d.oeeImpossible(names[o.reference]!, f.units(r.available / o.theoreticalCycle)));
    else parts.push(o.meets ? d.oeeOk(oee, expected, rate, demand, f.pct(o.minOee)) : d.oeeShort(oee, expected, rate, demand, f.pct(o.minOee)));
    // Capacidad instalada requerida: la velocidad estándar que tiene que tener la línea para cumplir con esas pérdidas.
    parts.push(d.oeeTarget(f.main(o.targetCycle), names[o.reference]!, f.main(o.theoreticalCycle)));
    if (s.stations.some((st) => st.actual.length > 0)) parts.push(d.oeeNote);
  }
  return parts.join(' ');
}

export function taktReadingLines(conclusion: string, warnings: string[], t: Messages): ReadingLine[] {
  return [{ tone: 'conclusion', text: conclusion }, ...warnings.map((w) => ({ tone: 'warning' as const, text: w })), { tone: 'tip', text: t.tools.takt.typicalError }];
}

/** Hoja de una medición guardada de takt; null si sus datos no dan resultado. */
export function taktSavedSheet(input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  const s = readTaktSaved(input);
  if (!s) return null;
  const out = takt(toTaktInput(s));
  if (!out.result) return null;
  const reading = taktReadingLines(taktConclusion(out.result, s, t, lang), taktWarnings(out.warnings, s, t, lang), t);
  return taktSheet(s, out.result, t, lang, { reading, ...opts });
}
