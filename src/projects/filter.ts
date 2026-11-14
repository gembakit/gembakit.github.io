import type { Analysis, ContextField, ProjectType } from '../data/db';
import { PHASES } from './model';
import { latest } from './store';

// Filtrar y ordenar las mediciones de un proyecto (ficha del proyecto mínimo,
// punto 4): por herramienta, fase y cualquier campo de contexto, combinables;
// por fecha o por resultado. Por resultado solo cuando todas las que quedan
// dan el mismo resultado (no tiene sentido ordenar juntos un RTY y un DPMO).

export type SortBy = 'date-desc' | 'date-asc' | 'result-desc' | 'result-asc';

export interface MeasurementFilter {
  /** '' = todas. */
  toolId: string;
  /** '' = todas. */
  phase: string;
  /** Valor elegido de cada campo de contexto; vacío o ausente = cualquiera. */
  context: Record<string, string>;
  sort: SortBy;
}

export const NO_FILTER: MeasurementFilter = { toolId: '', phase: '', context: {}, sort: 'date-desc' };

/** Cuántos filtros hay puestos (el orden no cuenta). */
export function activeFilters(f: MeasurementFilter): number {
  return (f.toolId ? 1 : 0) + (f.phase ? 1 : 0) + Object.values(f.context).filter(Boolean).length;
}

export function isDefault(f: MeasurementFilter): boolean {
  return activeFilters(f) === 0 && f.sort === 'date-desc';
}

/** Lo que se puede elegir en cada filtro: solo lo que aparece en las mediciones. */
export function filterOptions(
  list: Analysis[],
  type: ProjectType,
  fields: ContextField[],
): { tools: string[]; phases: string[]; context: Record<string, string[]> } {
  const tools = [...new Set(list.map((m) => m.toolId))];
  const used = new Set(list.map((m) => m.phase));
  const phases = PHASES[type].filter((p) => used.has(p));
  const context: Record<string, string[]> = {};
  for (const f of fields) {
    const values = [...new Set(list.map((m) => m.context[f.id]).filter((v): v is string => Boolean(v)))];
    if (values.length) context[f.id] = values.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }
  return { tools, phases, context };
}

function matches(m: Analysis, f: MeasurementFilter): boolean {
  if (f.toolId && m.toolId !== f.toolId) return false;
  if (f.phase && m.phase !== f.phase) return false;
  return Object.entries(f.context).every(([k, v]) => !v || m.context[k] === v);
}

/** Solo las mediciones que pasan los filtros, sin ordenar. */
export function filterMeasurements(list: Analysis[], f: MeasurementFilter): Analysis[] {
  return list.filter((m) => matches(m, f));
}

/**
 * Se puede ordenar por resultado si todas las mediciones son de la misma
 * herramienta y dan el mismo resultado (DPMO puede dar nivel sigma o DPMO).
 */
export function canSortByResult(list: Analysis[]): boolean {
  if (!list.length) return false;
  const keys = new Set(list.map((m) => `${m.toolId}|${latest(m).headline?.key ?? ''}`));
  return keys.size === 1 && !keys.has(`${list[0]!.toolId}|`);
}

/** Filtra y ordena. Si el orden por resultado no tiene sentido con lo que queda, ordena por fecha. */
export function applyFilter(list: Analysis[], f: MeasurementFilter): Analysis[] {
  const out = filterMeasurements(list, f);
  const byDate = (a: Analysis, b: Analysis) => b.measuredAt - a.measuredAt || b.createdAt - a.createdAt;
  const sort = f.sort.startsWith('result') && !canSortByResult(out) ? 'date-desc' : f.sort;
  switch (sort) {
    case 'date-asc':
      return out.sort((a, b) => -byDate(a, b));
    case 'result-desc':
    case 'result-asc': {
      const sign = sort === 'result-desc' ? -1 : 1;
      return out.sort((a, b) => sign * (latest(a).headline!.value - latest(b).headline!.value) || byDate(a, b));
    }
    default:
      return out.sort(byDate);
  }
}

/** Si el filtro cambia y el orden por resultado deja de tener sentido, vuelve a fecha. */
export function fixSort(list: Analysis[], f: MeasurementFilter): MeasurementFilter {
  return f.sort.startsWith('result') && !canSortByResult(filterMeasurements(list, f)) ? { ...f, sort: 'date-desc' } : f;
}

// El filtro de cada proyecto se recuerda mientras la app está abierta: al
// volver de una medición, la lista sigue filtrada igual.
const remembered = new Map<string, MeasurementFilter>();
export const recallFilter = (projectId: string) => remembered.get(projectId) ?? NO_FILTER;
export const rememberFilter = (projectId: string, f: MeasurementFilter) => void remembered.set(projectId, f);
