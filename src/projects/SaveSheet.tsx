import { useEffect, useId, useState, type ReactNode } from 'react';
import { CircleAlert, Save } from 'lucide-react';
import { useI18n } from '../i18n';
import type { ContextField, Headline, ProjectType } from '../data/db';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { navigate } from '../app/router';
import { defaultFields, PHASES, PROJECT_TYPES } from './model';
import { contextSuggestions, createProject, lastUsed, listProjects, rememberLast, saveMeasurement } from './store';
import { useLive } from './live';

export interface SavePayload {
  input: unknown;
  headline: Headline | null;
}

const NEW = '__new__';

/** «2026-11-14T09:30» para el campo de fecha y hora, en la hora del teléfono. */
export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromLocalInput(s: string): number | null {
  const ms = new Date(s).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export const inputClass =
  'h-12 w-full min-w-0 rounded-[13px] border-[1.5px] border-line bg-surface px-3 text-[16px] outline-none placeholder:text-muted focus:border-accent';

export const textareaClass =
  'min-h-24 w-full rounded-[13px] border-[1.5px] border-line bg-surface p-3 text-[16px] outline-none placeholder:text-muted focus:border-accent';

export function Field({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2.5 rounded-[14px] bg-bad-soft p-3 text-[14px]">
      <CircleAlert aria-hidden size={18} className="mt-0.5 shrink-0 text-bad" />
      <span>{children}</span>
    </p>
  );
}

/** Campos de contexto del proyecto (Equipo, Puesto…), cada uno con los valores ya usados para elegir con un toque. */
export function ContextInputs({
  fields,
  value,
  onChange,
  suggestions,
}: {
  fields: ContextField[];
  value: Record<string, string>;
  onChange: (update: (c: Record<string, string>) => Record<string, string>) => void;
  suggestions: Record<string, string[]>;
}) {
  const { t } = useI18n();
  const ids = useId();
  if (!fields.length) return null;
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-[15px] font-semibold">{t.save.context}</legend>
      {fields.map((f) => (
        <Field key={f.id} label={f.label} htmlFor={`${ids}c${f.id}`}>
          <input
            id={`${ids}c${f.id}`}
            className={inputClass}
            list={suggestions[f.id]?.length ? `${ids}l${f.id}` : undefined}
            autoComplete="off"
            value={value[f.id] ?? ''}
            onChange={(e) => onChange((c) => ({ ...c, [f.id]: e.target.value }))}
          />
          {suggestions[f.id]?.length ? (
            <datalist id={`${ids}l${f.id}`}>
              {suggestions[f.id]!.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          ) : null}
        </Field>
      ))}
    </fieldset>
  );
}

/**
 * Hoja inferior «Guardar en un proyecto»: proyecto (el último usado), fase,
 * nombre, fecha y hora, contexto (con los valores ya usados) y nota.
 */
export function SaveSheet({
  open,
  onClose,
  toolId,
  defaultName,
  payload,
}: {
  open: boolean;
  onClose: () => void;
  toolId: string;
  defaultName: string;
  payload: () => SavePayload | null;
}) {
  const { t } = useI18n();
  const s = t.save;
  const toast = useToast();
  const ids = useId();
  const projects = useLive(() => listProjects(), []);
  const [projectId, setProjectId] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ProjectType>('dmaic');
  const [phase, setPhase] = useState('');
  const [name, setName] = useState(defaultName);
  const [when, setWhen] = useState(() => toLocalInput(Date.now()));
  const [context, setContext] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Al abrir: el último proyecto usado (o el primero, o uno nuevo si no hay ninguno).
  useEffect(() => {
    if (!open || !projects) return;
    setName(defaultName);
    setWhen(toLocalInput(Date.now()));
    setNote('');
    setError(null);
    void lastUsed().then((last) => {
      const pick = projects.find((p) => p.id === last.projectId) ?? projects[0];
      setProjectId(pick ? pick.id : NEW);
    });
    // Solo al abrir; la lista de proyectos no cambia mientras la hoja está abierta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projects === undefined]);

  const project = projects?.find((p) => p.id === projectId) ?? null;

  // Al cambiar de proyecto: su fase actual, su último contexto y sus valores ya usados.
  useEffect(() => {
    if (!project) {
      setPhase(projectId === NEW ? (PHASES[newType][0] ?? '') : '');
      setContext({});
      setSuggestions({});
      return;
    }
    setPhase(project.phase);
    void lastUsed()
      .then((last) => last.context(project.id))
      .then(setContext);
    void contextSuggestions(project.id).then(setSuggestions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, project?.id, newType]);

  const fields = project ? project.fields : projectId === NEW ? defaultFields(t.projects.fields) : [];
  const phases = PHASES[project ? project.type : newType];

  const submit = async () => {
    const data = payload();
    if (!data || busy) return;
    if (!name.trim()) return setError(s.nameRequired);
    if (projectId === NEW && !newName.trim()) return setError(t.projects.form.nameRequired);
    setBusy(true);
    try {
      const target = project ?? (await createProject({ name: newName, type: newType, goal: '', fields: defaultFields(t.projects.fields) }));
      await saveMeasurement({
        projectId: target.id,
        toolId,
        name,
        phase,
        measuredAt: fromLocalInput(when) ?? Date.now(),
        context,
        note,
        input: data.input,
        headline: data.headline,
      });
      await rememberLast(target.id, context);
      toast(s.saved(target.name), { tone: 'ok', action: { label: s.view, onAction: () => navigate(`/proyectos/${target.id}`) } });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={s.title}>
      <Field label={s.project} htmlFor={`${ids}p`}>
        <select id={`${ids}p`} className={inputClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value={NEW}>{s.newOption}</option>
        </select>
      </Field>
      {projectId === NEW && (
        <div className="flex flex-col gap-3 rounded-[16px] bg-surface-2 p-3">
          <Field label={s.newName} htmlFor={`${ids}nn`}>
            <input id={`${ids}nn`} className={inputClass} value={newName} placeholder={t.projects.form.namePlaceholder} onChange={(e) => setNewName(e.target.value)} />
          </Field>
          <Field label={s.newType} htmlFor={`${ids}nt`}>
            <select id={`${ids}nt`} className={inputClass} value={newType} onChange={(e) => setNewType(e.target.value as ProjectType)}>
              {PROJECT_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {t.projects.types[ty].name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      {phases.length > 0 && (
        <Field label={s.phase} htmlFor={`${ids}ph`}>
          <select id={`${ids}ph`} className={inputClass} value={phase} onChange={(e) => setPhase(e.target.value)}>
            {phases.map((ph) => (
              <option key={ph} value={ph}>
                {t.projects.phases[ph] ?? ph}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label={s.name} htmlFor={`${ids}n`}>
        <input id={`${ids}n`} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label={s.when} htmlFor={`${ids}w`}>
        <input id={`${ids}w`} type="datetime-local" className={inputClass} value={when} onChange={(e) => setWhen(e.target.value)} />
      </Field>
      <ContextInputs fields={fields} value={context} onChange={setContext} suggestions={suggestions} />
      <Field label={s.note} htmlFor={`${ids}no`}>
        <textarea id={`${ids}no`} rows={3} value={note} placeholder={s.notePlaceholder} onChange={(e) => setNote(e.target.value)} className={textareaClass} />
      </Field>
      {error && <FormError>{error}</FormError>}
      <Button variant="primary" icon={Save} className="w-full" disabled={busy || !projects} onClick={() => void submit()}>
        {s.save}
      </Button>
    </Sheet>
  );
}
