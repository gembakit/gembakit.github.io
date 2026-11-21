import type { Messages } from '../../i18n';
import { listNames } from '../pareto/reading';
import { docSavedSheet } from '../doc/sheet';
import { field, filledRows, type DocData, type DocSchema } from '../doc/types';

// Informe A3 (docs/fichas/fase-5.md, ficha 4).

export const A3: DocSchema = {
  sections: [
    { key: 'header', fields: [{ key: 'title', kind: 'text' }, { key: 'owner', kind: 'text' }, { key: 'date', kind: 'date' }] },
    { key: 'background', fields: [{ key: 'background', kind: 'long' }] },
    { key: 'current', fields: [{ key: 'current', kind: 'long' }] },
    { key: 'goal', fields: [{ key: 'goal', kind: 'long' }] },
    { key: 'analysis', fields: [{ key: 'analysis', kind: 'long' }] },
    { key: 'actions', list: { key: 'actions', columns: [{ key: 'what', kind: 'long' }, { key: 'who', kind: 'text' }, { key: 'when', kind: 'date' }], min: 2, max: 15 } },
    { key: 'followup', fields: [{ key: 'followup', kind: 'long' }] },
  ],
};

export function a3Example(t: Messages): DocData {
  const x = t.tools.a3.exampleData;
  return {
    v: 1,
    fields: { title: x.title, owner: x.owner, date: x.date, background: x.background, current: x.current, goal: x.goal, analysis: x.analysis, followup: x.followup },
    lists: { actions: x.actions.map(([what, who, when]) => ({ what: what ?? '', who: who ?? '', when: when ?? '' })) },
  };
}

const CONTENT = ['background', 'current', 'goal', 'analysis', 'actions', 'followup'] as const;

export function a3Analyze(d: DocData, t: Messages, lang: 'es' | 'en') {
  const a = t.tools.a3;
  const title = field(d, 'title');
  const filled = (k: (typeof CONTENT)[number]) => (k === 'actions' ? filledRows(d, 'actions').length > 0 : !!field(d, k));
  const done = CONTENT.filter(filled);
  const missing = CONTENT.filter((k) => !filled(k)).map((k) => a.sections[k].title.replace(/^\d+ · /, '').toLocaleLowerCase());
  const warnings: string[] = [];
  if (filledRows(d, 'actions').some((r) => !(r.who ?? '').trim() || !(r.when ?? '').trim())) warnings.push(a.warn.noOwner);
  const conclusion = [a.conclusion(title || a.name, done.length, CONTENT.length), missing.length ? a.missing(listNames(missing, lang)) : a.complete].join(' ');
  return { ready: !!title && !!field(d, 'current'), title: title.slice(0, 60), conclusion, warnings };
}

export const a3SavedSheet = docSavedSheet(A3, (t) => t.tools.a3, a3Analyze);
