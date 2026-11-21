import type { Messages } from '../../i18n';
import type { ParetoInput } from '../../calc/pareto';

// Lo que se guarda de una medición de Pareto.

export interface ParetoSaved {
  v: 1;
  /** Qué se cuenta («Defectos de pintura»). */
  what: string;
  /** Unidad de los valores («defectos», «€»). */
  unit: string;
  items: { name: string; value: number }[];
  /** «Otros» al final aunque sea grande. */
  othersLast: boolean;
}

export function readParetoSaved(x: unknown): ParetoSaved | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  if (o.v !== 1 || !Array.isArray(o.items)) return null;
  const items = (o.items as unknown[]).flatMap((i) => {
    const r = i as Record<string, unknown> | null;
    return r && typeof r.value === 'number' && Number.isFinite(r.value) ? [{ name: typeof r.name === 'string' ? r.name : '', value: r.value }] : [];
  });
  return { v: 1, what: typeof o.what === 'string' ? o.what : '', unit: typeof o.unit === 'string' ? o.unit : '', items, othersLast: o.othersLast === true };
}

/** Nombre de una categoría (o «Categoría n»). */
export const itemName = (t: Messages, s: ParetoSaved, i: number) => s.items[i]?.name.trim() || t.tools.pareto.itemName(i + 1);

export function toParetoInput(s: ParetoSaved, t: Messages): ParetoInput {
  return { items: s.items.map((x, i) => ({ name: itemName(t, s, i), value: x.value })), othersLast: s.othersLast ? t.tools.pareto.othersName : null };
}

/** Cuenta cuántas veces sale cada nombre (una fila importada por caso), en el orden en que aparecen. */
export function tally(names: string[]): { name: string; value: number }[] {
  const out: { name: string; value: number }[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const row = out.find((x) => x.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (row) row.value++;
    else out.push({ name, value: 1 });
  }
  return out;
}

/** Cuentas del ejemplo de defectos de pintura, en el orden de sus nombres en los textos. */
export const PAINT_COUNTS = [48, 27, 61, 15, 9, 6, 11];
