import type { KanbanResult } from '../../calc/kanban';
import type { Messages } from '../../i18n';
import type { Derivation } from '../../ui/Explained';
import { frac, plus, times } from '../../ui/expr';
import { formatNumber } from '../../ui/number';

/** Datos de kanban tal como los escribe el usuario (y se guardan en un proyecto). */
export interface KanbanSaved {
  unit: 'min' | 'h' | 'day';
  demand: number;
  mode: 'split' | 'total';
  wait?: number;
  process?: number;
  lead?: number;
  /** Margen de seguridad en porcentaje (10 = 10 %). */
  safetyPct: number;
  size: number;
}

/** Tiempo de reposición: espera + proceso, o el total escrito. */
export const leadOf = (s: KanbanSaved) => (s.mode === 'split' ? (s.wait ?? 0) + (s.process ?? 0) : (s.lead ?? 0));

export function kanbanFormat(lang: 'es' | 'en', t: Messages, unit: string) {
  const num = (x: number, d = 4) => formatNumber(x, lang, d);
  return {
    num,
    time: (x: number) => `${num(x)} ${t.tools.kanban.units[unit] ?? unit}`,
    raw: (x: number) => num(x, 2),
  };
}

export type KanbanKey = 'cards' | 'pieces' | 'lead';

/** De dónde sale cada valor del kanban, con los números del usuario. */
export function kanbanExplain(s: KanbanSaved, r: KanbanResult, t: Messages, lang: 'es' | 'en'): Record<KanbanKey, Derivation | null> {
  const d = t.tools.kanban;
  const x = d.explain;
  const f = kanbanFormat(lang, t, s.unit);
  const D = `${f.num(s.demand)} ${d.perUnit[s.unit]}`;
  const L = f.time(leadOf(s));
  const a = `${f.num(s.safetyPct)} %`;
  const C = f.num(s.size);
  const wL = { sym: x.leadSym, label: d.leadLabel, value: L };
  const wC = { sym: x.sizeSym, label: d.size, value: C };
  return {
    cards: {
      term: 'kanban',
      title: d.cardsLabel,
      meaning: x.cardsMeaning,
      lhs: d.cardsLabel,
      steps: [frac(times(x.demandSym, x.leadSym, plus('1', x.safetySym)), x.sizeSym), frac(times(f.num(s.demand), f.num(leadOf(s)), plus('1', a)), C), f.raw(r.raw), String(r.cards)],
      where: [{ sym: x.demandSym, label: d.demand, value: D }, wL, { sym: x.safetySym, label: d.safety, value: a }, wC],
      notes: [x.ceilNote],
    },
    pieces: {
      title: d.inCirculation,
      meaning: x.piecesMeaning,
      lhs: d.inCirculation,
      steps: [times(x.cardsSym, x.sizeSym), times(String(r.cards), C), f.num(r.pieces)],
      where: [{ sym: x.cardsSym, label: d.cardsLabel, value: String(r.cards) }, wC],
    },
    lead:
      s.mode === 'split'
        ? {
            title: d.leadLabel,
            meaning: x.leadMeaning,
            lhs: x.leadSym,
            steps: [plus(x.waitSym, x.processSym), plus(f.time(s.wait ?? 0), f.time(s.process ?? 0)), L],
            where: [
              { sym: x.waitSym, label: d.wait, value: f.time(s.wait ?? 0) },
              { sym: x.processSym, label: d.process, value: f.time(s.process ?? 0) },
            ],
          }
        : null,
  };
}
