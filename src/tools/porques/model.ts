import type { Messages } from '../../i18n';
import { docSavedSheet } from '../doc/sheet';
import { field, filledRows, type DocData, type DocSchema } from '../doc/types';

// 5 porqués (docs/fichas/fase-5.md, ficha 1).

export const PORQUES: DocSchema = {
  sections: [
    { key: 'problem', fields: [{ key: 'problem', kind: 'long' }, { key: 'where', kind: 'text' }] },
    { key: 'whys', list: { key: 'whys', columns: [{ key: 'answer', kind: 'long' }], min: 3, max: 9 } },
    { key: 'root', fields: [{ key: 'root', kind: 'long' }, { key: 'action', kind: 'long' }, { key: 'check', kind: 'long' }] },
  ],
};

export function porquesExample(t: Messages): DocData {
  const x = t.tools.porques.exampleData;
  return {
    v: 1,
    fields: { problem: x.problem, where: x.where, root: x.root, action: x.action, check: x.check },
    lists: { whys: x.whys.map((answer) => ({ answer })) },
  };
}

export function porquesAnalyze(d: DocData, t: Messages) {
  const p = t.tools.porques;
  const n = filledRows(d, 'whys').length;
  const problem = field(d, 'problem');
  const root = field(d, 'root');
  const action = field(d, 'action');
  const warnings: string[] = [];
  if (n < 3) warnings.push(p.warn.few);
  if (root && !action) warnings.push(p.warn.noAction);
  if (action && !field(d, 'check')) warnings.push(p.warn.noCheck);
  const conclusion = root ? [p.conclusion(n, root), ...(action ? [p.actionSentence(action)] : [])].join(' ') : p.conclusionNoRoot(n);
  return { ready: !!problem && n >= 1, title: problem.slice(0, 60), conclusion, warnings };
}

export const porquesSavedSheet = docSavedSheet(PORQUES, (t) => t.tools.porques, porquesAnalyze);
