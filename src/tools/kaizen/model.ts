import type { Messages } from '../../i18n';
import { parseDecimal } from '../../ui/number';
import { docSavedSheet } from '../doc/sheet';
import { field, filledRows, type DocData, type DocSchema } from '../doc/types';

// Evento Kaizen (docs/fichas/fase-5.md, ficha 5).

export const KAIZEN: DocSchema = {
  sections: [
    { key: 'header', fields: [{ key: 'title', kind: 'text' }, { key: 'scope', kind: 'long' }, { key: 'start', kind: 'date' }, { key: 'end', kind: 'date' }] },
    { key: 'team', fields: [{ key: 'team', kind: 'long' }] },
    { key: 'goals', list: { key: 'goals', columns: [{ key: 'metric', kind: 'text' }, { key: 'baseline', kind: 'text' }, { key: 'target', kind: 'text' }, { key: 'result', kind: 'text' }], min: 2, max: 10 } },
    { key: 'log', list: { key: 'log', columns: [{ key: 'done', kind: 'long' }], min: 3, max: 10 } },
    { key: 'results', fields: [{ key: 'results', kind: 'long' }] },
    { key: 'pending', list: { key: 'pending', columns: [{ key: 'what', kind: 'long' }, { key: 'who', kind: 'text' }, { key: 'when', kind: 'date' }], min: 1, max: 15 } },
  ],
};

export function kaizenExample(t: Messages): DocData {
  const x = t.tools.kaizen.exampleData;
  return {
    v: 1,
    fields: { title: x.title, scope: x.scope, start: x.start, end: x.end, team: x.team, results: x.results },
    lists: {
      goals: x.goals.map(([metric, baseline, target, result]) => ({ metric: metric ?? '', baseline: baseline ?? '', target: target ?? '', result: result ?? '' })),
      log: x.log.map((done) => ({ done })),
      pending: x.pending.map(([what, who, when]) => ({ what: what ?? '', who: who ?? '', when: when ?? '' })),
    },
  };
}

/** ¿Se cumplió el objetivo? Si la meta es menor que la partida, hay que bajar; si es mayor, subir. Null si falta un número. */
export function goalMet(baseline: string, target: string, result: string): boolean | null {
  const b = parseDecimal(baseline);
  const g = parseDecimal(target);
  const r = parseDecimal(result);
  if (b === null || g === null || r === null) return null;
  return g < b ? r <= g : r >= g;
}

export function kaizenAnalyze(d: DocData, t: Messages) {
  const k = t.tools.kaizen;
  const title = field(d, 'title');
  const goals = filledRows(d, 'goals').filter((g) => (g.metric ?? '').trim());
  const judged = goals.map((g) => goalMet(g.baseline ?? '', g.target ?? '', g.result ?? '')).filter((x): x is boolean => x !== null);
  const met = judged.filter(Boolean).length;
  const warnings: string[] = [];
  if (goals.some((g) => !(g.result ?? '').trim())) warnings.push(k.warn.noResult);
  if (filledRows(d, 'pending').some((r) => !(r.who ?? '').trim() || !(r.when ?? '').trim())) warnings.push(k.warn.noOwner);
  const lines = goals.filter((g) => (g.result ?? '').trim()).map((g) => k.goalLine(g.metric!.trim(), (g.baseline ?? '').trim(), (g.target ?? '').trim(), g.result!.trim()));
  const conclusion = [k.conclusion(title || k.name, met, judged.length), ...lines].join(' ');
  return { ready: !!title && goals.length > 0, title: title.slice(0, 60), conclusion, warnings };
}

export const kaizenSavedSheet = docSavedSheet(KAIZEN, (t) => t.tools.kaizen, kaizenAnalyze);
