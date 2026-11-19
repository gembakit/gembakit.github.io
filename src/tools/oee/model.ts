import type { Messages } from '../../i18n';
import { SECONDS, toCycle, type Measure, type TimeUnit } from '../../calc/takt';
import type { OeeInput, OeeViewDef } from '../../calc/oee';

// Lo que se guarda de una medición de OEE (versión 2, docs/fichas/oee-v2.md)
// y cómo se leen las de la versión 1 sin perder nada.

export interface OeeSaved {
  v: 2;
  shift: number;
  shiftUnit: TimeUnit;
  planned: { name: string; value: number; unit: TimeUnit }[];
  categories: string[];
  /** Paradas no planificadas: minutos, posición de su categoría y estándar (min) opcional. */
  stops: { name: string; minutes: number; category: number; standard: number | null }[];
  measure: Measure;
  measureUnit: TimeUnit;
  /** Ciclo ideal (en la unidad elegida) o velocidad ideal (unidades por esa unidad). */
  ideal: number;
  total: number;
  rejects: number;
  unitName: string;
  /** Lo marcado en «Otras vistas». */
  views: OeeViewDef;
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
  if (s.v === 2) {
    const planned = Array.isArray(s.planned) ? s.planned.map(obj) : null;
    const stops = Array.isArray(s.stops) ? s.stops.map(obj) : null;
    const categories = Array.isArray(s.categories) && s.categories.every((c) => typeof c === 'string') ? (s.categories as string[]) : null;
    if (!planned || !stops || !categories || !isNum(s.shift) || !isUnit(s.shiftUnit) || !isNum(s.ideal) || !isNum(s.total) || !isNum(s.rejects)) return null;
    if (!(s.measure === 'time' || s.measure === 'rate') || !isUnit(s.measureUnit)) return null;
    if (planned.some((p) => !p || !isNum(p.value) || !isUnit(p.unit))) return null;
    if (stops.some((p) => !p || !isNum(p.minutes) || !isNum(p.category) || !(p.category >= 0 && p.category < categories.length) || !(p.standard === null || isNum(p.standard)))) return null;
    const views = obj(s.views);
    const pareto = obj(s.pareto);
    return {
      v: 2,
      shift: s.shift,
      shiftUnit: s.shiftUnit,
      planned: planned.map((p) => ({ name: typeof p!.name === 'string' ? p!.name : '', value: p!.value as number, unit: p!.unit as TimeUnit })),
      categories,
      stops: stops.map((p) => ({ name: typeof p!.name === 'string' ? p!.name : '', minutes: p!.minutes as number, category: p!.category as number, standard: p!.standard as number | null })),
      measure: s.measure,
      measureUnit: s.measureUnit,
      ideal: s.ideal,
      total: s.total,
      rejects: s.rejects,
      unitName: typeof s.unitName === 'string' ? s.unitName : '',
      views: {
        excluded: Array.isArray(views?.excluded) ? (views.excluded as unknown[]).filter((c): c is number => isNum(c) && c >= 0 && c < categories.length) : [],
        standard: views?.standard === true,
      },
      pareto: { by: pareto?.by === 'stop' ? 'stop' : 'category', losses: pareto?.losses === true },
    };
  }
  // Versión 1: un número por tipo de parada, todo en minutos y el ciclo ideal en segundos.
  const v1 = ['shift', 'plannedStops', 'unplannedStops', 'idealCycle', 'total', 'rejects'] as const;
  if (!v1.every((k) => isNum(s[k]))) return null;
  const n = (k: (typeof v1)[number]) => s[k] as number;
  const categories = [...d.defaultCategories];
  return {
    v: 2,
    shift: n('shift'),
    shiftUnit: 'min',
    planned: n('plannedStops') > 0 ? [{ name: d.plannedStops, value: n('plannedStops'), unit: 'min' }] : [],
    categories,
    stops: n('unplannedStops') > 0 ? [{ name: d.exampleData.unplanned, minutes: n('unplannedStops'), category: categories.length - 1, standard: null }] : [],
    measure: 'time',
    measureUnit: 's',
    ideal: n('idealCycle'),
    total: n('total'),
    rejects: n('rejects'),
    unitName: '',
    views: { excluded: [], standard: false },
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

/** ¿Queda tiempo estándar fuera de las categorías quitadas? (Si no, marcarlo no cambia nada.) */
export const standardLeft = (s: OeeSaved, standardByCategory: number[]) => standardByCategory.some((m, c) => m > 0 && !s.views.excluded.includes(c));

/** Nombre de la otra vista con lo marcado, o null si no hay nada marcado. */
export function viewLabel(s: OeeSaved, standardByCategory: number[], t: Messages): string | null {
  const d = t.tools.oee;
  const parts = s.views.excluded.map((c) => inSentence(categoryName(s, c, t)));
  if (s.views.standard && standardLeft(s, standardByCategory)) parts.push(d.viewStandardPart);
  return parts.length ? d.viewName(parts) : null;
}

// ── Ejemplos ──

/** Caso publicado de Vorne (oee.com, «Calculating OEE»): OEE 74,79 %. */
export const VORNE = (t: Messages): OeeSaved => {
  const d = t.tools.oee;
  const categories = [...d.defaultCategories];
  return {
    v: 2,
    shift: 480,
    shiftUnit: 'min',
    planned: [{ name: d.exampleData.breaks, value: 60, unit: 'min' }],
    categories,
    stops: [{ name: d.exampleData.unplanned, minutes: 47, category: categories.length - 1, standard: null }],
    measure: 'time',
    measureUnit: 's',
    ideal: 1,
    total: 19271,
    rejects: 423,
    unitName: '',
    views: { excluded: [], standard: false },
    pareto: { by: 'category', losses: false },
  };
};

/**
 * Embotelladora (ficha oee-v2, cuentas propias): 8 h − 10 min de reunión = 470 min;
 * cuatro paradas (95 min), una con estándar (40 = 30 + 10 de exceso); 48.000 botellas/h
 * de placa, 270.000 producidas, 4.000 rechazadas → OEE 70,74 %; sin el estándar, 75,57 %.
 */
export const BOTTLING = (t: Messages): OeeSaved => {
  const d = t.tools.oee;
  const x = d.exampleData;
  return {
    v: 2,
    shift: 8,
    shiftUnit: 'h',
    planned: [{ name: x.meeting, value: 10, unit: 'min' }],
    categories: [...d.defaultCategories],
    stops: [
      { name: x.breakdown, minutes: 25, category: 0, standard: null },
      { name: x.changeover, minutes: 40, category: 1, standard: 30 },
      { name: x.material, minutes: 12, category: 2, standard: null },
      { name: x.jams, minutes: 18, category: 3, standard: null },
    ],
    measure: 'rate',
    measureUnit: 'h',
    ideal: 48_000,
    total: 270_000,
    rejects: 4_000,
    unitName: x.bottles,
    views: { excluded: [], standard: true },
    pareto: { by: 'category', losses: false },
  };
};
