import { useEffect, useId, useState } from 'react';
import { Save } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Analysis, Project } from '../data/db';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { PHASES } from './model';
import { contextSuggestions, updateMeasurementInfo } from './store';
import { ContextInputs, Field, FormError, fromLocalInput, inputClass, textareaClass, toLocalInput } from './SaveSheet';

/**
 * Corregir la información de una medición guardada (nombre, fase, fecha,
 * contexto y nota) sin tocar sus datos: no crea versión y vale también
 * para una medición congelada.
 */
export function MeasurementInfoSheet({ open, onClose, project, analysis: a }: { open: boolean; onClose: () => void; project: Project; analysis: Analysis }) {
  const { t } = useI18n();
  const s = t.save;
  const m = t.measurement;
  const toast = useToast();
  const ids = useId();
  const [name, setName] = useState(a.name);
  const [phase, setPhase] = useState(a.phase);
  const [when, setWhen] = useState(() => toLocalInput(a.measuredAt));
  const [context, setContext] = useState<Record<string, string>>(a.context);
  const [note, setNote] = useState(a.note);
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Al abrir, lo que hay guardado ahora.
  useEffect(() => {
    if (!open) return;
    setName(a.name);
    setPhase(a.phase);
    setWhen(toLocalInput(a.measuredAt));
    setContext(a.context);
    setNote(a.note);
    setError(null);
    void contextSuggestions(project.id).then(setSuggestions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const phases = PHASES[project.type];
  // Una fase que el tipo actual del proyecto ya no tiene se puede dejar como está.
  const phaseOptions = a.phase && !phases.includes(a.phase) ? [...phases, a.phase] : phases;

  const submit = async () => {
    if (busy) return;
    if (!name.trim()) return setError(s.nameRequired);
    setBusy(true);
    try {
      await updateMeasurementInfo(a.id, { name, phase, measuredAt: fromLocalInput(when) ?? a.measuredAt, context, note });
      toast(m.infoSaved, { tone: 'ok' });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={m.editTitle}>
      <p className="text-[14px] leading-relaxed text-muted">{m.editHint}</p>
      <Field label={s.name} htmlFor={`${ids}n`}>
        <input
          id={`${ids}n`}
          className={inputClass}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
      </Field>
      {phaseOptions.length > 0 && (
        <Field label={s.phase} htmlFor={`${ids}ph`}>
          <select id={`${ids}ph`} className={inputClass} value={phase} onChange={(e) => setPhase(e.target.value)}>
            {!phase && <option value="">{t.projects.noPhase}</option>}
            {phaseOptions.map((ph) => (
              <option key={ph} value={ph}>
                {t.projects.phases[ph] ?? ph}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label={s.when} htmlFor={`${ids}w`}>
        <input id={`${ids}w`} type="datetime-local" className={inputClass} value={when} onChange={(e) => setWhen(e.target.value)} />
      </Field>
      <ContextInputs fields={project.fields} value={context} onChange={setContext} suggestions={suggestions} />
      <Field label={s.note} htmlFor={`${ids}no`}>
        <textarea id={`${ids}no`} rows={3} value={note} placeholder={s.notePlaceholder} onChange={(e) => setNote(e.target.value)} className={textareaClass} />
      </Field>
      {error && <FormError>{error}</FormError>}
      <Button variant="primary" icon={Save} className="w-full" disabled={busy} onClick={() => void submit()}>
        {t.common.save}
      </Button>
    </Sheet>
  );
}
