import type { Messages } from '../../i18n';
import { listNames } from '../pareto/reading';
import { docSavedSheet } from '../doc/sheet';
import { field, filledRows, type DocData, type DocSchema } from '../doc/types';

// Plan de control (docs/fichas/fase-5.md, ficha 6).

const COLS = ['step', 'characteristic', 'spec', 'method', 'frequency', 'who', 'control', 'reaction'] as const;

export const PLAN_CONTROL: DocSchema = {
  sections: [
    { key: 'header', fields: [{ key: 'process', kind: 'text' }, { key: 'owner', kind: 'text' }, { key: 'date', kind: 'date' }, { key: 'revision', kind: 'text' }] },
    { key: 'rows', list: { key: 'rows', columns: COLS.map((key) => ({ key, kind: key === 'reaction' ? ('long' as const) : ('text' as const) })), min: 2, max: 30 } },
  ],
};

export function planControlExample(t: Messages): DocData {
  const x = t.tools.plancontrol.exampleData;
  return {
    v: 1,
    fields: { process: x.process, owner: x.owner, date: x.date, revision: x.revision },
    lists: { rows: x.rows.map((r) => Object.fromEntries(COLS.map((c, i) => [c, r[i] ?? '']))) },
  };
}

export function planControlAnalyze(d: DocData, t: Messages, lang: 'es' | 'en') {
  const p = t.tools.plancontrol;
  const process = field(d, 'process');
  const rows = filledRows(d, 'rows');
  const name = (i: number) => p.lists.rows.item(i + 1);
  const noReaction = rows.flatMap((r, i) => ((r.reaction ?? '').trim() ? [] : [name(i)]));
  const noWho = rows.flatMap((r, i) => ((r.who ?? '').trim() ? [] : [name(i)]));
  const warnings: string[] = [];
  if (noReaction.length) warnings.push(p.warn.noReaction(listNames(noReaction, lang)));
  if (noWho.length) warnings.push(p.warn.noWho(listNames(noWho, lang)));
  return { ready: !!process && rows.some((r) => (r.characteristic ?? '').trim()), title: process.slice(0, 60), conclusion: p.conclusion(process || p.name, rows.length), warnings };
}

export const planControlSavedSheet = docSavedSheet(PLAN_CONTROL, (t) => t.tools.plancontrol, planControlAnalyze);
