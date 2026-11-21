import type { Messages } from '../../i18n';
import { listNames } from '../pareto/reading';
import { docSavedSheet } from '../doc/sheet';
import { field, filledRows, type DocData, type DocSchema } from '../doc/types';

// Espina de pescado con las 6M (docs/fichas/fase-5.md, ficha 2).

export const SIX_M = ['people', 'method', 'machine', 'material', 'measurement', 'environment'] as const;
export const CAUSE_STATUS = ['open', 'confirmed', 'ruledOut'] as const;

export const ESPINA: DocSchema = {
  sections: [
    { key: 'effect', fields: [{ key: 'effect', kind: 'long' }] },
    {
      key: 'causes',
      list: {
        key: 'causes',
        columns: [
          { key: 'cause', kind: 'text' },
          { key: 'category', kind: 'select', options: SIX_M },
          { key: 'status', kind: 'select', options: CAUSE_STATUS },
          { key: 'note', kind: 'text' },
        ],
        min: 3,
        max: 40,
      },
    },
  ],
};

export function espinaExample(t: Messages): DocData {
  const x = t.tools.espina.exampleData;
  return {
    v: 1,
    fields: { effect: x.effect },
    lists: { causes: x.causes.map(([cause, category, status, note]) => ({ cause: cause ?? '', category: category ?? 'people', status: status ?? 'open', note: note ?? '' })) },
  };
}

/** Causas con texto, con su categoría y estado (por defecto, la primera de cada lista). */
export function causes(d: DocData) {
  return filledRows(d, 'causes')
    .filter((r) => (r.cause ?? '').trim())
    .map((r) => ({ cause: r.cause!.trim(), category: (r.category ?? 'people') as (typeof SIX_M)[number], status: (r.status ?? 'open') as (typeof CAUSE_STATUS)[number], note: (r.note ?? '').trim() }));
}

export function espinaAnalyze(d: DocData, t: Messages, lang: 'es' | 'en') {
  const e = t.tools.espina;
  const list = causes(d);
  const effect = field(d, 'effect');
  const used = new Set(list.map((c) => c.category));
  const confirmed = list.filter((c) => c.status === 'confirmed').map((c) => c.cause);
  const warnings: string[] = [];
  if (!effect) warnings.push(e.warn.noEffect);
  const empty = SIX_M.filter((m) => !used.has(m)).map((m) => e.sixM[m].toLocaleLowerCase());
  if (list.length >= 3 && empty.length) warnings.push(e.warn.emptyCats(listNames(empty, lang)));
  const conclusion = e.conclusion(list.length, used.size, confirmed.length ? e.confirmedSome(listNames(confirmed, lang)) : e.confirmedNone);
  return { ready: list.length >= 1, title: effect.slice(0, 60), conclusion, warnings };
}

export const espinaSavedSheet = docSavedSheet(ESPINA, (t) => t.tools.espina, espinaAnalyze);
