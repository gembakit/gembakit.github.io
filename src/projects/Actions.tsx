import { useCallback, useEffect, useId, useState } from 'react';
import { CircleCheck, CircleDashed, Clock, Plus, Save, Trash2, TriangleAlert, UserRound } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Action, ActionStatus } from '../data/db';
import { Button } from '../ui/Button';
import { Card, Label } from '../ui/Layout';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { Segmented } from '../tools/form';
import { Field, FormError, inputClass, textareaClass } from './SaveSheet';
import { useLive } from './live';
import { actionDue, addAction, deleteAction, listActions, restoreAction, today, updateAction } from './store';

// Acciones de un proyecto (fase 5): qué, quién y para cuándo, con las
// vencidas a la vista. Cada estado lleva icono y texto, no solo color.

/** «2026-11-21» ↔ medianoche local. */
export const dateToInput = (ms: number | null) => {
  if (ms === null) return '';
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const inputToDate = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : null;
};

export const formatDay = (ms: number, lang: 'es' | 'en') => new Date(ms).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short' });

function ActionSheet({ open, onClose, projectId, action }: { open: boolean; onClose: () => void; projectId: string; action: Action | null }) {
  const { t } = useI18n();
  const a = t.tools.acciones;
  const toast = useToast();
  const ids = useId();
  const [what, setWhat] = useState('');
  const [who, setWho] = useState('');
  const [due, setDue] = useState('');
  const [status, setStatus] = useState<ActionStatus>('open');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setWhat(action?.what ?? '');
    setWho(action?.who ?? '');
    setDue(dateToInput(action?.due ?? null));
    setStatus(action?.status ?? 'open');
    setNote(action?.note ?? '');
    setError(null);
  }, [open, action]);
  const submit = async () => {
    if (busy) return;
    if (!what.trim()) return setError(a.needWhat);
    setBusy(true);
    try {
      const input = { what, who, due: inputToDate(due), status, note };
      if (action) await updateAction(action.id, input);
      else await addAction(projectId, input);
      toast(a.saved, { tone: 'ok' });
      onClose();
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!action) return;
    await deleteAction(action.id);
    onClose();
    toast(a.deleted, { action: { label: t.common.undo, onAction: () => void restoreAction(action.id) } });
  };
  return (
    <Sheet open={open} onClose={onClose} title={action ? a.edit : a.add}>
      <Field label={a.what} htmlFor={`${ids}w`}>
        <textarea
          id={`${ids}w`}
          rows={2}
          className={textareaClass}
          value={what}
          placeholder={a.whatPh}
          onChange={(e) => {
            setWhat(e.target.value);
            setError(null);
          }}
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        <Field label={a.who} htmlFor={`${ids}p`}>
          <input id={`${ids}p`} className={inputClass} value={who} placeholder={a.whoPh} autoComplete="off" onChange={(e) => setWho(e.target.value)} />
        </Field>
        <Field label={a.due} htmlFor={`${ids}d`}>
          <input id={`${ids}d`} type="date" className={inputClass} value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
      </div>
      <Segmented label={a.status} value={status} options={(['open', 'doing', 'done'] as const).map((s) => ({ value: s, label: a.statuses[s]! }))} onChange={setStatus} />
      <Field label={a.note} htmlFor={`${ids}n`}>
        <textarea id={`${ids}n`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={textareaClass} />
      </Field>
      {error && <FormError>{error}</FormError>}
      <Button variant="primary" icon={Save} className="w-full" disabled={busy} onClick={() => void submit()}>
        {a.save}
      </Button>
      {action && (
        <Button variant="ghost" icon={Trash2} className="self-start" onClick={() => void remove()}>
          {a.delete}
        </Button>
      )}
    </Sheet>
  );
}

function ActionRow({ a, onOpen }: { a: Action; onOpen: () => void }) {
  const { t, lang } = useI18n();
  const x = t.tools.acciones;
  const overdue = a.status !== 'done' && a.due !== null && a.due < today();
  const Icon = a.status === 'done' ? CircleCheck : overdue ? TriangleAlert : a.status === 'doing' ? Clock : CircleDashed;
  const tone = a.status === 'done' ? 'text-ok' : overdue ? 'text-bad' : a.status === 'doing' ? 'text-accent-ink' : 'text-muted';
  return (
    <li>
      <button type="button" onClick={onOpen} className="press raised grid w-full grid-cols-[28px_minmax(0,1fr)] items-start gap-3 rounded-[18px] p-3.5 text-left">
        <Icon aria-hidden size={22} className={`mt-0.5 ${tone}`} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={`text-[15.5px] font-semibold wrap-break-word ${a.status === 'done' ? 'text-muted line-through' : ''}`}>{a.what}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span className={`font-semibold ${tone}`}>{overdue ? x.overdueTag : x.statuses[a.status]}</span>
            {a.who && (
              <span className="inline-flex items-center gap-1">
                <UserRound aria-hidden size={13} />
                {a.who}
              </span>
            )}
            {a.status === 'done' && a.doneAt ? <span>{x.doneTag(formatDay(a.doneAt, lang))}</span> : a.due !== null && <span className={overdue ? 'font-semibold text-bad' : ''}>{x.dueTag(formatDay(a.due, lang))}</span>}
          </span>
          {a.note && <span className="text-[13.5px] leading-snug wrap-break-word">{a.note}</span>}
        </span>
      </button>
    </li>
  );
}

/** Sección «Acciones» de la pantalla del proyecto. */
export function ActionsSection({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const x = t.tools.acciones;
  const list = useLive(() => listActions(projectId), [projectId]);
  const [editing, setEditing] = useState<Action | 'new' | null>(null);
  const [showDone, setShowDone] = useState(false);
  const close = useCallback(() => setEditing(null), []);
  const all = list ?? [];
  const done = all.filter((a) => a.status === 'done');
  const open = all.filter((a) => a.status !== 'done');
  const due = actionDue(all);
  return (
    <section id="acciones" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <Label>{x.title}</Label>
        {all.length > 0 && <span className="text-[13px] text-muted">{x.counts(open.length, done.length)}</span>}
      </div>
      {(due.overdue > 0 || due.soon > 0) && (
        <p className={`flex items-start gap-2.5 rounded-[14px] p-3 text-[14.5px] ${due.overdue ? 'bg-bad-soft' : 'bg-warn-soft'}`}>
          <TriangleAlert aria-hidden size={18} className={`mt-0.5 shrink-0 ${due.overdue ? 'text-bad' : 'text-warn'}`} />
          <span>{[due.overdue ? x.overdue(due.overdue) : null, due.soon ? x.dueSoon(due.soon) : null].filter(Boolean).join(' · ')}</span>
        </p>
      )}
      {list && all.length === 0 && (
        <Card>
          <p className="text-[15px] leading-relaxed text-muted">{x.empty}</p>
        </Card>
      )}
      {open.length > 0 && (
        <ul className="flex flex-col gap-2">
          {open.map((a) => (
            <ActionRow key={a.id} a={a} onOpen={() => setEditing(a)} />
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <>
          <Button variant="ghost" className="self-start" onClick={() => setShowDone((v) => !v)}>
            {showDone ? x.hideDone : `${x.showDone} (${done.length})`}
          </Button>
          {showDone && (
            <ul className="flex flex-col gap-2">
              {done.map((a) => (
                <ActionRow key={a.id} a={a} onOpen={() => setEditing(a)} />
              ))}
            </ul>
          )}
        </>
      )}
      <Button icon={Plus} className="self-start" onClick={() => setEditing('new')}>
        {x.add}
      </Button>
      <ActionSheet open={editing !== null} onClose={close} projectId={projectId} action={editing === 'new' ? null : editing} />
    </section>
  );
}
