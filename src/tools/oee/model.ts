import type { Messages } from '../../i18n';
import { SECONDS, toCycle, type Measure, type TimeUnit } from '../../calc/takt';
import type { OeeInput, OeeResult } from '../../calc/oee';

// Lo que se guarda de una medición de OEE (versión 3, docs/fichas/oee-v3.md)
// y cómo se leen las de las versiones 1 y 2 sin perder nada.

export interface OeeSaved {
  v: 3;
  shift: number;
  shiftUnit: TimeUnit;
  /** Paradas planificadas, con su motivo o comentario. */
  planned: { name: string; value: number; unit: TimeUnit; note: string }[];
  categories: string[];
  /** Paradas no planificadas: minutos, posición de su categoría, estándar (min) opcional y motivo o comentario. */
  stops: { name: string; minutes: number; category: number; standard: number | null; note: string }[];
  measure: Measure;
  measureUnit: TimeUnit;
  /** Ciclo ideal (en la unidad elegida) o velocidad ideal (unidades por esa unidad). */
  ideal: number;
  total: number;
  rejects: number;
  unitName: string;
  /** Porciones desmarcadas en la torta del turno («p0», «c1», «s1», «speed», «quality»). */
  off: string[];
  pareto: { by: 'category' | 'stop'; losses: boolean };
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isUnit = (x: unknown): x is TimeUnit => x === 's' || x === 'min' || x === 'h';
const obj = (x: unknown): Record<string, unknown> | null => (typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : null);

/** Una medición guardada de OEE (versión 1 o 2), o null si no lo es. */
export function readOeeSaved(x: unknown, t: Messages): OeeSaved | null {
  const s = obj(x);
  if (!s) return null;
  const d = t.tools.oee;
  if (s.v === 2 || s.v === 3) {
    const planned = Array.isArray(s.planned) ? s.planned.map(obj) : null;
    const stops = Array.isArray(s.stops) ? s.stops.map(obj) : null;
    const categories = Array.isArray(s.categories) && s.categories.every((c) => typeof c === 'string') ? (s.categories as string[]) : null;
    if (!planned || !stops || !categories || !isNum(s.shift) || !isUnit(s.shiftUnit) || !isNum(s.ideal) || !isNum(s.total) || !isNum(s.rejects)) return null;
    if (!(s.measure === 'time' || s.measure === 'rate') || !isUnit(s.measureUnit)) return null;
    if (planned.some((p) => !p || !isNum(p.value) || !isUnit(p.unit))) return null;
    if (stops.some((p) => !p || !isNum(p.minutes) || !isNum(p.category) || !(p.category >= 0 && p.category < categories.length) || !(p.standard === null || isNum(p.standard)))) return null;
    const pareto = obj(s.pareto);
    const text = (x: unknown) => (typeof x === 'string' ? x : '');
    let off: string[] = [];
    if (s.v === 3) off = Array.isArray(s.off) ? (s.off as unknown[]).filter((k): k is string => typeof k === 'string') : [];
    else {
      // Versión 2: «Otras vistas» se medía sobre el tiempo planificado. Lo marcado pasa a
      // desmarcado en la torta, junto con las paradas planificadas, y sale el mismo número.
      const views = obj(s.views);
      const excluded = Array.isArray(views?.excluded) ? (views.excluded as unknown[]).filter((c): c is number => isNum(c) && c >= 0 && c < categories.length) : [];
      const standard = views?.standard === true;
      if (excluded.length || standard) {
        const keys = new Set([...planned.map((_, k) => `p${k}`), ...excluded.flatMap((c) => [`c${c}`, `s${c}`])]);
        if (standard) categories.forEach((_, c) => keys.add(`s${c}`));
        off = [...keys];
      }
    }
    return {
      v: 3,
      shift: s.shift,
      shiftUnit: s.shiftUnit,
      planned: planned.map((p) => ({ name: text(p!.name), value: p!.value as number, unit: p!.unit as TimeUnit, note: text(p!.note) })),
      categories,
      stops: stops.map((p) => ({ name: text(p!.name), minutes: p!.minutes as number, category: p!.category as number, standard: p!.standard as number | null, note: text(p!.note) })),
      measure: s.measure,
      measureUnit: s.measureUnit,
      ideal: s.ideal,
      total: s.total,
      rejects: s.rejects,
      unitName: typeof s.unitName === 'string' ? s.unitName : '',
      off,
      pareto: { by: pareto?.by === 'stop' ? 'stop' : 'category', losses: pareto?.losses === true },
    };
  }
  // Versión 1: un número por tipo de parada, todo en minutos y el ciclo ideal en segundos.
  const v1 = ['shift', 'plannedStops', 'unplannedStops', 'idealCycle', 'total', 'rejects'] as const;
  if (!v1.every((k) => isNum(s[k]))) return null;
  const n = (k: (typeof v1)[number]) => s[k] as number;
  const categories = [...d.defaultCategories];
  return {
    v: 3,
    shift: n('shift'),
    shiftUnit: 'min',
    planned: n('plannedStops') > 0 ? [{ name: d.plannedStops, value: n('plannedStops'), unit: 'min', note: '' }] : [],
    categories,
    stops: n('unplannedStops') > 0 ? [{ name: d.exampleData.unplanned, minutes: n('unplannedStops'), category: categories.length - 1, standard: null, note: '' }] : [],
    measure: 'time',
    measureUnit: 's',
    ideal: n('idealCycle'),
    total: n('total'),
    rejects: n('rejects'),
    unitName: '',
    off: [],
    pareto: { by: 'category', losses: false },
  };
}

/** Datos del cálculo: todo en minutos y el ciclo ideal en segundos por unidad. */
export function toOeeInput(s: OeeSaved): OeeInput {
  return {
    shift: (s.shift * SECONDS[s.shiftUnit]) / 60,
    plannedStops: s.planned.map((p) => (p.value * SECONDS[p.unit]) / 60),
    stops: s.stops.map((x) => ({ minutes: x.minutes, category: x.category, standard: x.standard })),
    categories: s.categories.length,
    idealCycle: s.ideal > 0 ? toCycle(s.ideal, s.measure, s.measureUnit) : 0,
    total: s.total,
    rejects: s.rejects,
  };
}

/** Nombre de una categoría (o «Categoría n» si está vacía). */
export const categoryName = (s: OeeSaved, i: number, t: Messages) => s.categories[i]?.trim() || t.tools.oee.categoryName(i + 1);
export const stopName = (s: OeeSaved, i: number, t: Messages) => s.stops[i]?.name.trim() || t.tools.oee.stopName(i + 1);
export const plannedName = (s: OeeSaved, i: number, t: Messages) => s.planned[i]?.name.trim() || t.tools.oee.plannedName(i + 1);

/** «Cambios de formato» → «cambios de formato» dentro de una frase (deja «CIP» como está). */
export function inSentence(name: string): string {
  return name.length > 1 && name[1] === name[1]!.toLowerCase() ? name[0]!.toLowerCase() + name.slice(1) : name;
}

/** Nombre de una porción de la torta: «Reunión de arranque», «Cambios de formato · estándar», «Pérdida por velocidad». */
export function sliceName(s: OeeSaved, key: string, r: OeeResult, t: Messages): string {
  const d = t.tools.oee;
  const x = r.slices.find((y) => y.key === key);
  if (!x) return key;
  switch (x.kind) {
    case 'useful':
      return d.losses.useful!;
    case 'planned':
      return plannedName(s, x.index, t);
    case 'standard':
      return d.slice.standard(categoryName(s, x.index, t));
    case 'stops':
      // Si todo lo que queda de la categoría es exceso sobre el estándar, se llama así.
      return x.excess >= x.minutes - 1e-9 ? d.slice.excess(categoryName(s, x.index, t)) : categoryName(s, x.index, t);
    case 'speed':
      return d.losses.speed!;
    case 'quality':
      return d.losses.quality!;
  }
}

/** Porciones desmarcadas que existen (sin el tiempo útil), en el orden de la torta. */
export const offSlices = (s: OeeSaved, r: OeeResult) => r.slices.filter((x) => x.kind !== 'useful' && s.off.includes(x.key));

/** ¿Lo desmarcado son justo las paradas planificadas? Entonces es el OEE oficial. */
export function isOfficial(s: OeeSaved, r: OeeResult): boolean {
  const off = offSlices(s, r);
  const planned = r.slices.filter((x) => x.kind === 'planned');
  return off.length === planned.length && off.every((x) => x.kind === 'planned');
}

/** Nombre del número de la torta: «Utilización de la línea» o «… sin cambios de formato ni la reunión». */
export function utilizationLabel(s: OeeSaved, r: OeeResult, t: Messages): string {
  const d = t.tools.oee;
  const off = offSlices(s, r);
  if (!off.length) return d.utilization;
  const planned = r.slices.filter((x) => x.kind === 'planned');
  const allPlanned = planned.length > 1 && planned.every((x) => s.off.includes(x.key));
  // Una categoría desmarcada entera (lo suyo y su estándar) se nombra una sola vez, por su nombre.
  const has = (key: string) => r.slices.some((x) => x.key === key);
  const whole = (c: number) => [`c${c}`, `s${c}`].every((k) => !has(k) || s.off.includes(k));
  const parts: string[] = [];
  if (allPlanned) parts.push(d.slice.allPlanned);
  const named = new Set<number>();
  for (const x of off) {
    if (x.kind === 'planned') {
      if (!allPlanned) parts.push(inSentence(plannedName(s, x.index, t)));
    } else if ((x.kind === 'stops' || x.kind === 'standard') && whole(x.index)) {
      if (!named.has(x.index)) parts.push(inSentence(categoryName(s, x.index, t)));
      named.add(x.index);
    } else if (x.kind === 'speed') parts.push(d.slice.speedPart);
    else if (x.kind === 'quality') parts.push(d.slice.qualityPart);
    else parts.push(inSentence(sliceName(s, x.key, r, t)));
  }
  return d.utilizationWithout(parts);
}

// ── Ejemplos ──

/** Caso publicado de Vorne (oee.com, «Calculating OEE»): OEE 74,79 %. */
export const VORNE = (t: Messages): OeeSaved => {
  const d = t.tools.oee;
  const categories = [...d.defaultCategories];
  return {
    v: 3,
    shift: 480,
    shiftUnit: 'min',
    planned: [{ name: d.exampleData.breaks, value: 60, unit: 'min', note: '' }],
    categories,
    stops: [{ name: d.exampleData.unplanned, minutes: 47, category: categories.length - 1, standard: null, note: '' }],
    measure: 'time',
    measureUnit: 's',
    ideal: 1,
    total: 19271,
    rejects: 423,
    unitName: '',
    off: [],
    pareto: { by: 'category', losses: false },
  };
};

/**
 * Embotelladora (ficha oee-v2, cuentas propias): 8 h − 10 min de reunión = 470 min;
 * cuatro paradas (95 min), una con estándar (40 = 30 + 10 de exceso, con su motivo);
 * 48.000 botellas/h estándar, 270.000 producidas, 4.000 rechazadas → OEE 70,74 %;
 * utilización de la línea con todo, 69,27 % (ficha oee-v3).
 */
export const BOTTLING = (t: Messages): OeeSaved => {
  const d = t.tools.oee;
  const x = d.exampleData;
  return {
    v: 3,
    shift: 8,
    shiftUnit: 'h',
    planned: [{ name: x.meeting, value: 10, unit: 'min', note: '' }],
    categories: [...d.defaultCategories],
    stops: [
      { name: x.breakdown, minutes: 25, category: 0, standard: null, note: '' },
      { name: x.changeover, minutes: 40, category: 1, standard: 30, note: x.changeoverNote },
      { name: x.material, minutes: 12, category: 2, standard: null, note: '' },
      { name: x.jams, minutes: 18, category: 3, standard: null, note: '' },
    ],
    measure: 'rate',
    measureUnit: 'h',
    ideal: 48_000,
    total: 270_000,
    rejects: 4_000,
    unitName: x.bottles,
    off: [],
    pareto: { by: 'category', losses: false },
  };
};
