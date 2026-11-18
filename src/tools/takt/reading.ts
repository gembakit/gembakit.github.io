import type { Messages } from '../../i18n';
import { stationStats, takt, TIME_UNITS, type Basis, type LineKind, type Measure, type TaktInput, type TaktResult, type TimeUnit } from '../../calc/takt';
import type { CalcWarning } from '../../calc/types';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { taktFormat, type TaktView } from './explain';
import { taktSheet } from './sheet';

// Datos guardados del takt y su «Cómo leerlo» sin pantalla: la usan la
// herramienta y la hoja del proyecto, para que digan siempre lo mismo.

/** Datos del takt guardados en un proyecto (versión 2, docs/fichas/takt-v2.md). */
export interface TaktSaved {
  v: 2;
  shift: number;
  shiftUnit: TimeUnit;
  deductions: { name: string; value: number; unit: TimeUnit }[];
  shifts: number;
  demand: number;
  /** Vacío: «piezas». */
  unitName: string;
  measure: Measure;
  measureUnit: TimeUnit;
  resultUnit: TimeUnit;
  kind: LineKind;
  basis: Basis;
  stations: { name: string; theoretical: number | null; actual: number[] }[];
  /** OEE esperado, de 0 a 1. */
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

/** Lee unos datos guardados, de cualquier versión; null si no son del takt. */
export function readTaktSaved(x: unknown): TaktSaved | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  if (o.v === 2) {
    const s = o as unknown as TaktSaved;
    const ok =
      isNum(s.shift) &&
      isUnit(s.shiftUnit) &&
      Array.isArray(s.deductions) &&
      s.deductions.every((d) => isNum(d.value) && isUnit(d.unit)) &&
      isNum(s.shifts) &&
      isNum(s.demand) &&
      (s.measure === 'time' || s.measure === 'rate') &&
      isUnit(s.measureUnit) &&
      isUnit(s.resultUnit) &&
      (s.kind === 'assembly' || s.kind === 'machines') &&
      (s.basis === 'mean' || s.basis === 'repeatable' || s.basis === 'theoretical') &&
      Array.isArray(s.stations) &&
      s.stations.every((st) => Array.isArray(st.actual) && st.actual.every(isNum) && (st.theoretical === null || isNum(st.theoretical)));
    return ok ? { ...s, unitName: typeof s.unitName === 'string' ? s.unitName : '', oee: isNum(s.oee) ? s.oee : null } : null;
  }
  const v1 = o as unknown as TaktSavedV1;
  if (isNum(v1.available) && isUnit(v1.availableUnit) && isNum(v1.demand) && isUnit(v1.unit) && Array.isArray(v1.stations)) {
    return {
      v: 2,
      shift: v1.available,
      shiftUnit: v1.availableUnit,
      deductions: [],
      shifts: 1,
      demand: v1.demand,
      unitName: '',
      measure: 'time',
      measureUnit: v1.unit,
      resultUnit: v1.unit,
      kind: 'assembly',
      basis: 'mean',
      stations: v1.stations.map((st) => ({ name: st.name ?? '', theoretical: null, actual: isNum(st.cycle) ? [st.cycle] : [] })),
      oee: null,
    };
  }
  return null;
}

export const toTaktInput = (s: TaktSaved): TaktInput => ({
  shift: s.shift,
  shiftUnit: s.shiftUnit,
  deductions: s.deductions.map((d) => ({ value: d.value, unit: d.unit })),
  shifts: s.shifts,
  demand: s.demand,
  measure: s.measure,
  measureUnit: s.measureUnit,
  kind: s.kind,
  basis: s.basis,
  stations: s.stations.map((st) => ({ theoretical: st.theoretical, actual: st.actual })),
  oee: s.oee,
});

export const taktView = (s: TaktSaved, t: Messages): TaktView => ({
  measure: s.measure,
  measureUnit: s.measureUnit,
  resultUnit: s.resultUnit,
  unitName: s.unitName.trim() || t.tools.takt.defaultUnit,
  kind: s.kind,
});

/** Nombres de las estaciones (sin nombre: «Puesto n» o «Máquina n»). */
export const stationNames = (s: TaktSaved, t: Messages) => s.stations.map((st, i) => st.name.trim() || t.tools.takt.stationName(i + 1, s.kind));
export const deductionNames = (s: TaktSaved, t: Messages) => s.deductions.map((d, i) => d.name.trim() || t.tools.takt.deductionName(i + 1));

/** «Repetible»: menor en tiempos, mayor en velocidades. */
export const basisName = (basis: Basis, measure: Measure, t: Messages) => (basis === 'repeatable' ? t.tools.takt.stat.repeatable[measure]! : t.tools.takt.bases[basis]!);

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
        case 'step-not-positive':
          return w.station(names[x.step]!);
        case 'station-empty':
          return w.stationEmpty(names[x.step]!);
        case 'over-takt':
          return w.overTakt[s.kind]!;
        case 'unstable': {
          const st = stationStats(s.stations[x.step]!.actual, s.measure)!;
          return w.unstable(names[x.step]!, f.entered(st.min), f.entered(st.max), s.kind);
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
  const parts = [view.measure === 'time' ? d.conclusionTime(f.main(r.takt), f.alt(r.takt), demand) : d.conclusionRate(f.main(r.takt), f.alt(r.takt), demand)];
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
    // Ritmo esperado en la forma de la línea: «36.000 botellas/h».
    const effective = o.theoreticalCycle / o.oee;
    const rate = view.measure === 'rate' ? f.main(effective) : f.alt(effective);
    if (o.minOee > 1) parts.push(d.oeeImpossible(names[o.reference]!, f.units(r.available / o.theoreticalCycle)));
    else parts.push(o.meets ? d.oeeOk(oee, expected, rate, demand, f.pct(o.minOee)) : d.oeeShort(oee, expected, rate, demand, f.pct(o.minOee)));
    // Ritmo objetivo: a qué tiene que poder ir la línea, según su teórico, con esas pérdidas.
    const ref = names[o.reference]!;
    parts.push(
      view.measure === 'rate'
        ? d.oeeTargetRate(f.main(o.targetCycle), ref, f.main(o.theoreticalCycle))
        : d.oeeTargetTime(f.main(o.targetCycle), ref, f.main(o.theoreticalCycle)),
    );
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
