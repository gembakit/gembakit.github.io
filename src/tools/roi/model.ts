import type { RoiInput } from '../../calc/roi';

// Datos del cálculo de ahorro, ROI y payback tal como los escribe el usuario
// (y se guardan en un proyecto), y cómo se pasan al cálculo.

export type How = 'direct' | 'unit' | 'time';

export interface RoiLine {
  name: string;
  kind: 'hard' | 'soft';
  how: How;
  /** Directo: ahorro al año. */
  amount?: number;
  /** Por unidad: coste antes y después, y unidades al año. */
  before?: number;
  after?: number;
  units?: number;
  /** Por tiempo: horas ahorradas al año y coste por hora. */
  hours?: number;
  rate?: number;
}

export interface RoiSaved {
  currency: string;
  investment: number;
  mode: 'same' | 'yearly';
  lines: RoiLine[];
  /** «Distinto cada año»: ahorro duro de cada año. */
  years: number[];
  newCosts: number;
  horizon: number;
}

/** Ahorro de una línea en un año. */
export function lineValue(l: RoiLine): number {
  if (l.how === 'unit') return ((l.before ?? 0) - (l.after ?? 0)) * (l.units ?? 0);
  if (l.how === 'time') return (l.hours ?? 0) * (l.rate ?? 0);
  return l.amount ?? 0;
}

export function sums(s: RoiSaved): { hard: number; soft: number } {
  let hard = 0;
  let soft = 0;
  for (const l of s.lines) {
    if (l.kind === 'hard') hard += lineValue(l);
    else soft += lineValue(l);
  }
  return { hard, soft };
}

export function calcInput(s: RoiSaved): RoiInput {
  if (s.mode === 'yearly') return { investment: s.investment, savings: s.years, repeat: false, newCosts: s.newCosts, horizon: s.years.length };
  const hard = s.lines.some((l) => l.kind === 'hard') ? [sums(s).hard] : [];
  return { investment: s.investment, savings: hard, repeat: true, newCosts: s.newCosts, horizon: s.horizon };
}

export const isRoiSaved = (x: unknown): x is RoiSaved => {
  const s = x as RoiSaved;
  return (
    typeof s === 'object' &&
    s !== null &&
    typeof s.investment === 'number' &&
    (s.mode === 'same' || s.mode === 'yearly') &&
    Array.isArray(s.lines) &&
    Array.isArray(s.years) &&
    typeof s.newCosts === 'number' &&
    typeof s.horizon === 'number'
  );
};
