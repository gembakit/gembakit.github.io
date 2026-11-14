import { useId, useState } from 'react';
import { CircleAlert, FolderPlus, Plus, X } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { ContextField, ProjectType } from '../../data/db';
import { Button, IconButton } from '../../ui/Button';
import { Card, DetailHeader, Label, Screen } from '../../ui/Layout';
import { defaultFields, newFieldId, PROJECT_TYPES } from '../../projects/model';
import { createProject } from '../../projects/store';
import { Field, inputClass } from '../../projects/SaveSheet';
import { navigate } from '../router';

/** Crear un proyecto: nombre, tipo (con sus fases), objetivo y campos de contexto. */
export function NewProjectScreen() {
  const { t } = useI18n();
  const p = t.projects;
  const f = p.form;
  const ids = useId();
  const [name, setName] = useState('');
  const [type, setType] = useState<ProjectType>('dmaic');
  const [goal, setGoal] = useState('');
  const [fields, setFields] = useState<ContextField[]>(() => defaultFields(p.fields));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim()) return setError(f.nameRequired);
    if (busy) return;
    setBusy(true);
    const project = await createProject({ name, type, goal, fields: fields.map((x) => ({ ...x, label: x.label.trim() })).filter((x) => x.label) });
    navigate(`/proyectos/${project.id}`);
  };

  return (
    <Screen>
      <DetailHeader title={f.title} onBack={() => navigate('/proyectos')} backLabel={t.common.back} />
      <Card>
        <Field label={f.name} htmlFor={`${ids}n`}>
          <input
            id={`${ids}n`}
            className={inputClass}
            value={name}
            placeholder={f.namePlaceholder}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
        </Field>
        <Field label={f.goal} htmlFor={`${ids}g`}>
          <textarea
            id={`${ids}g`}
            rows={2}
            value={goal}
            placeholder={f.goalPlaceholder}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full rounded-[13px] border-[1.5px] border-line bg-surface px-3 py-2.5 text-[16px] leading-snug outline-none placeholder:text-muted focus:border-accent"
          />
        </Field>
      </Card>

      <Card>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2">
            <Label>{f.type}</Label>
          </legend>
          {PROJECT_TYPES.map((ty) => (
            <label
              key={ty}
              className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-[15px] p-3 ${type === ty ? 'bg-soft shadow-[inset_0_0_0_1.5px_var(--accent)]' : 'bg-surface-2'}`}
            >
              <input type="radio" name={`${ids}t`} value={ty} checked={type === ty} onChange={() => setType(ty)} className="mt-1 size-5 shrink-0 accent-accent" />
              <span className="flex min-w-0 flex-col">
                <span className="text-[15.5px] font-semibold">{p.types[ty].name}</span>
                <span className="text-[13.5px] text-muted">{p.types[ty].desc}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </Card>

      <Card>
        <Label>{f.fields}</Label>
        <p className="text-[14px] leading-relaxed text-muted">{f.fieldsHint}</p>
        <ul className="flex flex-col gap-2">
          {fields.map((fd, i) => (
            <li key={fd.id} className="flex items-center gap-2">
              <input
                aria-label={f.fieldLabel(i + 1)}
                className={inputClass}
                value={fd.label}
                onChange={(e) => setFields((all) => all.map((x) => (x.id === fd.id ? { ...x, label: e.target.value } : x)))}
              />
              <IconButton icon={X} label={f.removeField(fd.label || String(i + 1))} onClick={() => setFields((all) => all.filter((x) => x.id !== fd.id))} />
            </li>
          ))}
        </ul>
        <Button icon={Plus} className="self-start" onClick={() => setFields((all) => [...all, { id: newFieldId(all), label: '' }])}>
          {f.addField}
        </Button>
      </Card>

      {error && (
        <p role="alert" className="flex items-start gap-2.5 rounded-[14px] bg-bad-soft p-3 text-[14.5px]">
          <CircleAlert aria-hidden size={18} className="mt-0.5 shrink-0 text-bad" />
          <span>{error}</span>
        </p>
      )}
      <Button variant="primary" icon={FolderPlus} className="w-full" disabled={busy} onClick={() => void create()}>
        {f.create}
      </Button>
    </Screen>
  );
}
