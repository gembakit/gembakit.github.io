import { useEffect, useId, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Milestone } from '../data/db';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { addMilestone, deleteMilestone, restoreMilestone, updateMilestone } from './store';
import { Field, FormError, fromLocalInput, inputClass, textareaClass, toLocalInput } from './SaveSheet';

/** Añadir un hito (sin `milestone`) o corregir uno ya apuntado, con borrar y deshacer. */
export function MilestoneSheet({ open, onClose, projectId, milestone }: { open: boolean; onClose: () => void; projectId: string; milestone: Milestone | null }) {
  const { t } = useI18n();
  const h = t.projects.milestones;
  const toast = useToast();
  const ids = useId();
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(milestone?.title ?? '');
    setWhen(toLocalInput(milestone?.at ?? Date.now()));
    setNote(milestone?.note ?? '');
    setError(null);
  }, [open, milestone]);

  const submit = async () => {
    if (busy) return;
    if (!title.trim()) return setError(h.required);
    setBusy(true);
    try {
      const at = fromLocalInput(when) ?? milestone?.at ?? Date.now();
      if (milestone) await updateMilestone(milestone.id, { title, at, note });
      else await addMilestone({ projectId, title, at, note });
      toast(h.saved, { tone: 'ok' });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!milestone) return;
    await deleteMilestone(milestone.id);
    onClose();
    toast(h.deleted, { action: { label: t.common.undo, onAction: () => void restoreMilestone(milestone.id) } });
  };

  return (
    <Sheet open={open} onClose={onClose} title={milestone ? h.editTitle : h.newTitle}>
      <Field label={h.what} htmlFor={`${ids}t`}>
        <input
          id={`${ids}t`}
          className={inputClass}
          value={title}
          placeholder={h.whatPlaceholder}
          onChange={(e) => {
            setTitle(e.target.value);
            setError(null);
          }}
        />
      </Field>
      <Field label={h.when} htmlFor={`${ids}w`}>
        <input id={`${ids}w`} type="datetime-local" className={inputClass} value={when} onChange={(e) => setWhen(e.target.value)} />
      </Field>
      <Field label={h.note} htmlFor={`${ids}n`}>
        <textarea id={`${ids}n`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={textareaClass} />
      </Field>
      {error && <FormError>{error}</FormError>}
      <Button variant="primary" icon={Save} className="w-full" disabled={busy} onClick={() => void submit()}>
        {t.common.save}
      </Button>
      {milestone && (
        <Button variant="ghost" icon={Trash2} className="self-start" onClick={() => void remove()}>
          {h.delete}
        </Button>
      )}
    </Sheet>
  );
}
