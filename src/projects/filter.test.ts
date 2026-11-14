import { describe, expect, test } from 'vitest';
import type { Analysis, Headline } from '../data/db';
import { activeFilters, applyFilter, canSortByResult, filterOptions, fixSort, NO_FILTER, type MeasurementFilter } from './filter';

let seq = 0;
function m(name: string, toolId: string, day: number, value: number | null, context: Record<string, string> = {}, phase = 'medir', key = toolId === 'fpy' ? 'rty' : 'sigmaLevel'): Analysis {
  const headline: Headline | null = value === null ? null : { key, value, kind: 'number', decimals: 1 };
  return {
    id: `id${++seq}`,
    createdAt: seq,
    updatedAt: seq,
    deleted: 0,
    origin: 'app',
    projectId: 'p',
    toolId,
    name,
    phase,
    measuredAt: Date.UTC(2026, 10, day),
    context,
    note: '',
    frozen: 0,
    versions: [{ n: 1, at: seq, input: null, headline }],
  } as Analysis;
}

const list = [
  m('fpy-a', 'fpy', 3, 0.8, { equipo: 'Day shift 1', puesto: 'llenadora' }),
  m('fpy-b', 'fpy', 10, 0.9, { equipo: 'Day shift 2', puesto: 'llenadora' }, 'mejorar'),
  m('fpy-c', 'fpy', 7, 0.7, { equipo: 'Day shift 1', puesto: 'etiquetadora' }),
  m('dpmo-a', 'dpmo', 5, 3.2, { equipo: 'Day shift 1' }),
];
const names = (l: Analysis[]) => l.map((x) => x.name);
const f = (patch: Partial<MeasurementFilter>): MeasurementFilter => ({ ...NO_FILTER, ...patch });

describe('filtrar y ordenar mediciones', () => {
  test('sin filtro: todas, de la más reciente a la más antigua', () => {
    expect(names(applyFilter(list, NO_FILTER))).toEqual(['fpy-b', 'fpy-c', 'dpmo-a', 'fpy-a']);
    expect(names(applyFilter(list, f({ sort: 'date-asc' })))).toEqual(['fpy-a', 'dpmo-a', 'fpy-c', 'fpy-b']);
  });

  test('los filtros se combinan: herramienta, fase y contexto', () => {
    expect(names(applyFilter(list, f({ toolId: 'fpy', context: { equipo: 'Day shift 1' } })))).toEqual(['fpy-c', 'fpy-a']);
    expect(names(applyFilter(list, f({ phase: 'mejorar' })))).toEqual(['fpy-b']);
    expect(names(applyFilter(list, f({ context: { equipo: 'Day shift 1', puesto: 'llenadora' } })))).toEqual(['fpy-a']);
    expect(activeFilters(f({ toolId: 'fpy', context: { equipo: 'Day shift 1', puesto: '' } }))).toBe(2);
  });

  test('por resultado solo con una herramienta; si no, por fecha', () => {
    expect(canSortByResult(list)).toBe(false);
    expect(names(applyFilter(list, f({ sort: 'result-desc' })))).toEqual(['fpy-b', 'fpy-c', 'dpmo-a', 'fpy-a']);
    expect(names(applyFilter(list, f({ toolId: 'fpy', sort: 'result-desc' })))).toEqual(['fpy-b', 'fpy-a', 'fpy-c']);
    expect(names(applyFilter(list, f({ toolId: 'fpy', sort: 'result-asc' })))).toEqual(['fpy-c', 'fpy-a', 'fpy-b']);
    // Quitar el filtro de herramienta devuelve el orden a fecha.
    expect(fixSort(list, f({ sort: 'result-asc' })).sort).toBe('date-desc');
    expect(fixSort(list, f({ toolId: 'fpy', sort: 'result-asc' })).sort).toBe('result-asc');
  });

  test('DPMO con resultados distintos (nivel sigma y DPMO) no se ordena por resultado', () => {
    const mixed = [m('s', 'dpmo', 1, 3.2), m('d', 'dpmo', 2, 6210, {}, 'medir', 'dpmo')];
    expect(canSortByResult(mixed)).toBe(false);
    expect(canSortByResult([m('n', 'fpy', 1, null)])).toBe(false);
  });

  test('opciones: solo lo que aparece, fases en su orden y valores ordenados', () => {
    const fields = [
      { id: 'equipo', label: 'Equipo' },
      { id: 'puesto', label: 'Puesto' },
      { id: 'supervisor', label: 'Supervisor' },
    ];
    expect(filterOptions(list, 'dmaic', fields)).toEqual({
      tools: ['fpy', 'dpmo'],
      phases: ['medir', 'mejorar'],
      context: { equipo: ['Day shift 1', 'Day shift 2'], puesto: ['etiquetadora', 'llenadora'] },
    });
  });
});
