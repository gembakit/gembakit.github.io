import { useCallback, useState } from 'react';
import { ChevronRight, Flag, History, LayoutGrid, Pencil, Plus, SlidersHorizontal, Snowflake, Trash2, X } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { Analysis, Milestone, Project } from '../../data/db';
import { Button, IconButton } from '../../ui/Button';
import { Card, DetailHeader, Label, Screen } from '../../ui/Layout';
import { useToast } from '../../ui/Toast';
import { findTool } from '../../tools/registry';
import { PHASES } from '../../projects/model';
import { PhaseTrack } from '../../projects/PhaseTrack';
import { FilterSheet } from '../../projects/FilterSheet';
import { MilestoneSheet } from '../../projects/MilestoneSheet';
import { SheetCard } from '../../projects/SheetCard';
import { ActionsSection } from '../../projects/Actions';
import { activeFilters, applyFilter, isDefault, NO_FILTER, recallFilter, rememberFilter, type MeasurementFilter } from '../../projects/filter';
import { formatDateTime, formatHeadline, useLive } from '../../projects/live';
import { deleteProject, getProject, latest, listMeasurements, listMilestones, restoreProject, updateProject } from '../../projects/store';
import { navigate } from '../router';

/** Pantalla de un proyecto: fase actual, objetivo, mediciones (con filtros) e hitos. */
export function ProjectScreen({ id }: { id: string }) {
  const { t } = useI18n();
  const p = t.projects;
  const toast = useToast();
  const project = useLive(() => getProject(id), [id]);
  const measurements = useLive(() => listMeasurements(id), [id]);
  const milestones = useLive(() => listMilestones(id), [id]);
  const [filter, setFilterState] = useState<MeasurementFilter>(() => recallFilter(id));
  const [filtering, setFiltering] = useState(false);
  const [milestone, setMilestone] = useState<Milestone | 'new' | null>(null);
  const closeFilter = useCallback(() => setFiltering(false), []);
  const closeMilestone = useCallback(() => setMilestone(null), []);
  const setFilter = (f: MeasurementFilter) => {
    setFilterState(f);
    rememberFilter(id, f);
  };

  if (project === undefined) return null;
  if (project === null) {
    return (
      <Screen>
        <DetailHeader title={p.notFound} onBack={() => navigate('/proyectos')} backLabel={t.common.back} />
      </Screen>
    );
  }

  const all = measurements ?? [];
  const shown = applyFilter(all, filter);
  const phases = PHASES[project.type];
  const flat = filter.sort.startsWith('result') || phases.length === 0;
  const groups: { phase: string; items: Analysis[] }[] = [];
  if (flat) groups.push({ phase: '', items: shown });
  else
    for (const ph of [...phases, '']) {
      const items = shown.filter((m) => (ph ? m.phase === ph : !phases.includes(m.phase)));
      if (items.length) groups.push({ phase: ph, items });
    }

  const setPhase = async (ph: string) => {
    if (ph === project.phase) return;
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
      <DetailHeader
        title={project.name}
        subtitle={p.types[project.type].name}
        onBack={() => navigate('/proyectos')}
        backLabel={t.common.back}
        right={
          <div className="flex shrink-0 gap-1">
            <IconButton icon={History} label={p.history.open} onClick={() => navigate(`/proyectos/${project.id}/historial`)} />
            <IconButton icon={Pencil} label={p.edit} onClick={() => navigate(`/proyectos/${project.id}/editar`)} />
          </div>
        }
      />

      {(phases.length > 0 || project.goal) && (
        <Card>
          {project.goal && (
            <div className="flex flex-col gap-1">
              <Label>{p.goal}</Label>
              <p className="text-[15.5px] leading-relaxed wrap-anywhere">{project.goal}</p>
            </div>
          )}
          {phases.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <Label>{p.phase}</Label>
              <PhaseTrack type={project.type} phase={project.phase} onPick={(ph) => void setPhase(ph)} />
              <p className="text-[13px] leading-relaxed text-muted">{p.phaseHint}</p>
            </div>
          )}
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex min-h-12 items-center justify-between gap-3">
          <Label>{p.measurements}</Label>
          {all.length > 1 && (
            <Button
              icon={SlidersHorizontal}
              className="relative"
              onClick={() => setFiltering(true)}
              aria-label={`${p.filter.open}${activeFilters(filter) ? ` (${activeFilters(filter)})` : ''}`}
            >
              {p.filter.open}
              {activeFilters(filter) > 0 && (
                <span
                  aria-hidden
                  className="absolute -top-1.5 -right-1.5 grid size-5.5 place-items-center rounded-full bg-accent text-[12px] text-on-accent shadow-[0_0_0_2px_var(--bg)]"
                >
                  {activeFilters(filter)}
                </span>
              )}
            </Button>
          )}
        </div>
        {!isDefault(filter) && all.length > 0 && <FilterSummary project={project} filter={filter} shown={shown.length} total={all.length} onClear={() => setFilter(NO_FILTER)} />}
        {measurements && all.length === 0 && (
          <Card>
            <p className="text-[15px] leading-relaxed text-muted">{p.noMeasurements}</p>
          </Card>
        )}
        {all.length > 0 && shown.length === 0 && (
          <Card>
            <p className="text-[15px] leading-relaxed text-muted">{p.filter.none}</p>
          </Card>
        )}
        {groups.map((g) => (
          <div key={g.phase || '-'} className="flex flex-col gap-2">
            {!flat && <h3 className="px-1 text-[14px] font-bold text-accent-ink">{g.phase ? (p.phases[g.phase] ?? g.phase) : p.noPhase}</h3>}
            <ul className="flex flex-col gap-2">
              {g.items.map((m) => (
                <MeasurementRow key={m.id} project={project} m={m} />
              ))}
            </ul>
          </div>
        ))}
        <Button icon={LayoutGrid} className="self-start" onClick={() => navigate('/herramientas')}>
          {p.goTools}
        </Button>
      </section>

      <ActionsSection projectId={project.id} />

      <section className="flex flex-col gap-3">
        <Label>{p.milestones.title}</Label>
        {milestones && milestones.length === 0 && (
          <Card>
            <p className="text-[15px] leading-relaxed text-muted">{p.milestones.empty}</p>
          </Card>
        )}
        {milestones && milestones.length > 0 && (
          <ul className="flex flex-col gap-2">
            {milestones.map((h) => (
              <MilestoneRow key={h.id} h={h} onOpen={() => setMilestone(h)} />
            ))}
          </ul>
        )}
        <Button icon={Plus} className="self-start" onClick={() => setMilestone('new')}>
          {p.milestones.add}
        </Button>
      </section>

      <SheetCard projectId={project.id} />

      <Button variant="ghost" icon={Trash2} className="mt-4 self-start" onClick={() => void remove()}>
        {p.deleteProject}
      </Button>

      <FilterSheet open={filtering} onClose={closeFilter} project={project} list={all} filter={filter} onChange={setFilter} />
      <MilestoneSheet open={milestone !== null} onClose={closeMilestone} projectId={project.id} milestone={milestone === 'new' ? null : milestone} />
    </Screen>
  );
}

/** «3 de 12 mediciones · FPY · Day shift 1 · Resultado: de mayor a menor», con «Quitar filtros». */
function FilterSummary({ project, filter, shown, total, onClear }: { project: Project; filter: MeasurementFilter; shown: number; total: number; onClear: () => void }) {
  const { t } = useI18n();
  const fl = t.projects.filter;
  const parts = [
    filter.toolId ? (findTool(filter.toolId)?.text(t).name ?? filter.toolId) : null,
    filter.phase ? (t.projects.phases[filter.phase] ?? filter.phase) : null,
    ...project.fields.map((f) => filter.context[f.id] || null),
    filter.sort !== 'date-desc' ? fl.sorts[filter.sort] : null,
  ].filter(Boolean);
  return (
    <div className="flex flex-col gap-1 rounded-[16px] bg-soft p-3">
      <p className="text-[14.5px] font-semibold">{fl.showing(shown, total)}</p>
      <p className="text-[14px] leading-relaxed wrap-anywhere">{parts.join(' · ')}</p>
      <Button variant="ghost" icon={X} className="-ml-2 self-start px-2" onClick={onClear}>
        {fl.clear}
      </Button>
    </div>
  );
}

function MeasurementRow({ project, m }: { project: Project; m: Analysis }) {
  const { t, lang } = useI18n();
  const p = t.projects;
  const tool = findTool(m.toolId);
  const Icon = tool?.icon;
  const v = latest(m);
  const context = project.fields.map((f) => m.context[f.id]).filter(Boolean);
  return (
    <li>
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
}

function MilestoneRow({ h, onOpen }: { h: Milestone; onOpen: () => void }) {
  const { lang } = useI18n();
  return (
    <li>
      <button type="button" onClick={onOpen} className="press raised grid w-full grid-cols-[40px_minmax(0,1fr)_20px] items-center gap-3 rounded-[18px] p-3.5 text-left">
        <span className="grid size-10 place-items-center rounded-[12px] bg-surface-2 text-accent-ink">
          <Flag aria-hidden size={19} />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15.5px] font-semibold wrap-anywhere">{h.title}</span>
          <span className="text-[13px] text-muted">{formatDateTime(h.at, lang)}</span>
          {h.note && <span className="text-[14px] leading-relaxed wrap-anywhere">{h.note}</span>}
        </span>
        <ChevronRight aria-hidden size={20} className="text-muted" />
      </button>
    </li>
  );
}
