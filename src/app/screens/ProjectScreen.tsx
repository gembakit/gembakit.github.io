import { ChevronRight, LayoutGrid, Snowflake, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { Analysis } from '../../data/db';
import { Button } from '../../ui/Button';
import { Card, DetailHeader, Label, Screen } from '../../ui/Layout';
import { useToast } from '../../ui/Toast';
import { findTool } from '../../tools/registry';
import { PHASES } from '../../projects/model';
import { formatDateTime, formatHeadline, useLive } from '../../projects/live';
import { deleteProject, getProject, latest, listMeasurements, restoreProject, updateProject } from '../../projects/store';
import { navigate } from '../router';

/** Pantalla de un proyecto: fase actual, objetivo y mediciones agrupadas por fase. */
export function ProjectScreen({ id }: { id: string }) {
  const { t, lang } = useI18n();
  const p = t.projects;
  const toast = useToast();
  const project = useLive(() => getProject(id), [id]);
  const measurements = useLive(() => listMeasurements(id), [id]);

  if (project === undefined) return null;
  if (project === null) {
    return (
      <Screen>
        <DetailHeader title={p.notFound} onBack={() => navigate('/proyectos')} backLabel={t.common.back} />
      </Screen>
    );
  }

  const phases = PHASES[project.type];
  const groups: { phase: string; items: Analysis[] }[] = [];
  for (const ph of [...phases, '']) {
    const items = (measurements ?? []).filter((m) => (ph ? m.phase === ph : !phases.includes(m.phase)));
    if (items.length) groups.push({ phase: ph, items });
  }

  const setPhase = async (ph: string) => {
    await updateProject(project.id, { phase: ph });
    toast(p.phaseChanged(p.phases[ph] ?? ph));
  };
  const remove = async () => {
    await deleteProject(project.id);
    navigate('/proyectos');
    toast(p.deleted(project.name), { action: { label: t.common.undo, onAction: () => void restoreProject(project.id) } });
  };

  return (
    <Screen>
      <DetailHeader title={project.name} subtitle={p.types[project.type].name} onBack={() => navigate('/proyectos')} backLabel={t.common.back} />

      {(phases.length > 0 || project.goal) && (
        <Card>
          {project.goal && (
            <div className="flex flex-col gap-1">
              <Label>{p.goal}</Label>
              <p className="text-[15.5px] leading-relaxed wrap-anywhere">{project.goal}</p>
            </div>
          )}
          {phases.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>{p.phase}</Label>
              <div role="group" aria-label={p.phase} className="flex flex-wrap gap-2">
                {phases.map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    aria-pressed={project.phase === ph}
                    onClick={() => void setPhase(ph)}
                    className={`press min-h-11 rounded-full px-4 text-[14.5px] font-semibold ${project.phase === ph ? 'btn-primary text-on-accent' : 'bg-surface-2 text-text'}`}
                  >
                    {p.phases[ph] ?? ph}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <Label>{p.measurements}</Label>
        {measurements && measurements.length === 0 && (
          <Card>
            <p className="text-[15px] leading-relaxed text-muted">{p.noMeasurements}</p>
          </Card>
        )}
        {groups.map((g) => (
          <div key={g.phase || '-'} className="flex flex-col gap-2">
            {(phases.length > 0 || g.phase) && <h3 className="px-1 text-[14px] font-bold text-accent-ink">{g.phase ? (p.phases[g.phase] ?? g.phase) : p.noPhase}</h3>}
            <ul className="flex flex-col gap-2">
              {g.items.map((m) => {
                const tool = findTool(m.toolId);
                const Icon = tool?.icon;
                const v = latest(m);
                const context = project.fields.map((f) => m.context[f.id]).filter(Boolean);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/proyectos/${project.id}/m/${m.id}`)}
                      className="press raised grid w-full grid-cols-[40px_minmax(0,1fr)_20px] items-center gap-3 rounded-[18px] p-3.5 text-left"
                    >
                      <span className="grid size-10 place-items-center rounded-[12px] bg-soft text-accent-ink">{Icon && <Icon aria-hidden size={20} />}</span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[15.5px] font-semibold wrap-anywhere">{m.name}</span>
                        {v.headline && <span className="font-display text-[16px] font-bold tabular-nums">{formatHeadline(v.headline, t, lang)}</span>}
                        {context.length > 0 && <span className="text-[13.5px] wrap-anywhere">{context.join(' · ')}</span>}
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
                          <span>{formatDateTime(m.measuredAt, lang)}</span>
                          {m.versions.length > 1 && <span className="rounded-full bg-surface-2 px-2 font-semibold">{p.version(m.versions.length)}</span>}
                          {m.frozen === 1 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-soft px-2 font-semibold text-accent-ink">
                              <Snowflake aria-hidden size={12} />
                              {p.frozen}
                            </span>
                          )}
                        </span>
                      </span>
                      <ChevronRight aria-hidden size={20} className="text-muted" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <Button icon={LayoutGrid} className="self-start" onClick={() => navigate('/herramientas')}>
          {p.goTools}
        </Button>
      </section>

      <Button variant="ghost" icon={Trash2} className="mt-4 self-start" onClick={() => void remove()}>
        {p.deleteProject}
      </Button>
    </Screen>
  );
}
