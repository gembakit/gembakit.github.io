import { useId, useState } from 'react';
import { FolderPlus, Plus, Save, X } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { ContextField, Project, ProjectType } from '../../data/db';
import { Button, IconButton } from '../../ui/Button';
import { Card, DetailHeader, Label, Screen } from '../../ui/Layout';
import { useToast } from '../../ui/Toast';
import { defaultFields, firstPhase, newFieldId, PHASES, PROJECT_TYPES } from '../../projects/model';
import { createProject, getProject, updateProject } from '../../projects/store';
import { Field, FormError, inputClass } from '../../projects/SaveSheet';
import { useLive } from '../../projects/live';
import { navigate } from '../router';

/** Crear un proyecto (sin `id`) o editar uno: nombre, tipo, objetivo y campos de contexto. */
export function ProjectFormScreen({ id }: { id?: string }) {
  const { t } = useI18n();
  const project = useLive(() => (id ? getProject(id) : Promise.resolve(null)), [id]);
  if (id && project === undefined) return null;
  if (id && !project) {
    return (
      <Screen>
        <DetailHeader title={t.projects.notFound} onBack={() => navigate('/proyectos')} backLabel={t.common.back} />
      </Screen>
    );
  }
  return <ProjectForm project={id ? project! : null} />;
}

function ProjectForm({ project }: { project: Project | null }) {
  const { t } = useI18n();
  const p = t.projects;
  const f = p.form;
  const toast = useToast();
  const ids = useId();
  const [name, setName] = useState(project?.name ?? '');
  const [type, setType] = useState<ProjectType>(project?.type ?? 'dmaic');
  const [goal, setGoal] = useState(project?.goal ?? '');
  const [fields, setFields] = useState<ContextField[]>(() => project?.fields ?? defaultFields(p.fields));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const back = () => navigate(project ? `/proyectos/${project.id}` : '/proyectos');

  const submit = async () => {
    if (!name.trim()) return setError(f.nameRequired);
    if (busy) return;
    setBusy(true);
    const cleanFields = fields.map((x) => ({ ...x, label: x.label.trim() })).filter((x) => x.label);
    if (!project) {
      const created = await createProject({ name, type, goal, fields: cleanFields });
      navigate(`/proyectos/${created.id}`);
      return;
    }
    // Con otro tipo, la fase actual se queda si el tipo nuevo la tiene; si no, vuelve a la primera.
    const phase = type === project.type || PHASES[type].includes(project.phase) ? project.phase : firstPhase(type);
    await updateProject(project.id, { name: name.trim(), type, goal: goal.trim(), fields: cleanFields, phase });
    toast(f.saved, { tone: 'ok' });
    back();
  };

  return (
    <Screen>
      <DetailHeader title={project ? f.editTitle : f.title} subtitle={project?.name} onBack={back} backLabel={t.common.back} />
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
        {project && type !== project.type && <p className="text-[14px] leading-relaxed text-muted">{f.typeChangeHint}</p>}
      </Card>

      <Card>
        <Label>{f.fields}</Label>
        <p className="text-[14px] leading-relaxed text-muted">{f.fieldsHint}</p>
        {project && <p className="text-[14px] leading-relaxed text-muted">{f.fieldsEditHint}</p>}
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

      {error && <FormError>{error}</FormError>}
      <Button variant="primary" icon={project ? Save : FolderPlus} className="w-full" disabled={busy} onClick={() => void submit()}>
        {project ? f.saveChanges : f.create}
      </Button>
    </Screen>
  );
}
