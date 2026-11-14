import { ceil } from './takt';
import type { CalcOutput, CalcStep, CalcWarning } from './types';

// Kanban: número de tarjetas o contenedores (docs/fichas/fase-1.md, ficha 5),
// con la fórmula de Toyota en la forma de Krajewski, Ritzman y Malhotra.
// La demanda y los tiempos van en la misma unidad (por minuto, hora o día).

export interface KanbanInput {
  /** Demanda media (piezas por unidad de tiempo). */
  demand: number;
  /** Tiempo de reposición = espera + proceso, en la misma unidad. */
  lead: number;
  /** Margen de seguridad, como fracción (0,1 = 10 %). */
  safety: number;
  /** Piezas por contenedor. */
  size: number;
}

export interface KanbanResult {
  /** Contenedores sin redondear. */
  raw: number;
  /** Contenedores o tarjetas: lo anterior redondeado hacia arriba. */
  cards: number;
  /** Piezas en circulación como máximo = tarjetas × piezas por contenedor. */
  pieces: number;
}

export function kanban(i: KanbanInput): CalcOutput<KanbanResult> {
  const warnings: CalcWarning[] = [];
  for (const field of ['demand', 'lead', 'size'] as const) if (!(i[field] > 0)) warnings.push({ code: 'not-positive', field });
  if (i.safety < 0) warnings.push({ code: 'negative', field: 'safety' });
  if (warnings.length) return { result: null, steps: [], warnings };
  if (i.safety === 0) warnings.push({ code: 'no-safety' });
  const raw = (i.demand * i.lead * (1 + i.safety)) / i.size;
  const cards = ceil(raw);
  const steps: CalcStep[] = [
    { key: 'raw', value: raw },
    { key: 'cards', value: cards },
    { key: 'pieces', value: cards * i.size },
  ];
  return { result: { raw, cards, pieces: cards * i.size }, steps, warnings };
}
