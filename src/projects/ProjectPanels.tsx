import { useCallback, useId, useState } from 'react';
import { ChevronDown, ChevronUp, CircleCheck, CircleDashed, ClipboardCheck, Copy, FileText, Flag, Lightbulb, Loader2, Sheet, type LucideIcon } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Project } from '../data/db';
import { Button, IconButton } from '../ui/Button';
import { Check } from '../tools/form';
import { Card } from '../ui/Layout';
import { useToast } from '../ui/Toast';
import { PrintNow } from '../ui/PrintDoc';
import { findTool } from '../tools/registry';
import { APP_VERSION } from '../version';
import type { SheetDef } from '../sheet/types';
import { navigate } from '../app/router';
import { formatHeadline, useLive } from './live';
import { latest, listActions, listMeasurements, listMilestones, rememberLast } from './store';
import { NEEDS, PHASE_GUIDE, phaseChecks } from './phaseGuide';
import { projectReport, type ReportInclude } from './report';

export const PROJECT_TABS = ['fases', 'hoja', 'acciones', 'informe'] as const;
export type ProjectTab = (typeof PROJECT_TABS)[number];
const TAB_ICONS: Record<ProjectTab, LucideIcon> = { fases: Flag, hoja: Sheet, acciones: ClipboardCheck, informe: FileText };

/** Pestañas del proyecto: icono con su nombre debajo, caben a 320 px. */
export function ProjectTabs({ value, onChange }: { value: ProjectTab; onChange: (t: ProjectTab) => void }) {
  const { t } = useI18n();
  return (
    <div role="tablist" aria-label={t.projectPlus.tabsLabel} className="grid grid-cols-4 gap-1 rounded-[16px] bg-surface-2 p-1">
      {PROJECT_TABS.map((k) => {
        const Icon = TAB_ICONS[k];
        const on = value === k;
        return (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(k)}
            className={`press flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[13px] px-1 py-1.5 text-[13px] leading-tight font-semibold ${on ? 'raised-sm text-accent-ink' : 'text-muted'}`}
          >
            <Icon aria-hidden size={19} />
            <span className="max-w-full truncate">{t.projectPlus.tabs[k]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Abre una herramienta; con proyecto, lo deja elegido para guardar. */
async function openTool(projectId: string | undefined, toolId: string) {
  if (projectId) await rememberLast(projectId, {});
  navigate(`/herramientas/${toolId}`);
}

export function ToolChip({ projectId, toolId }: { projectId?: string; toolId: string }) {
  const { t } = useI18n();
  const tool = findTool(toolId);
  if (!tool) return null;
  const Icon = tool.icon;
  return (
    <button type="button" onClick={() => void openTool(projectId, toolId)} className="press raised-sm inline-flex min-h-12 items-center gap-2 rounded-[14px] px-3 py-2 text-left text-[14.5px] font-semibold">
      <Icon aria-hidden size={18} className="shrink-0 text-accent-ink" />
      <span className="min-w-0">{tool.text(t).name}</span>
    </button>
  );
}

/**
 * «Sugerencias», al final de Fases: qué hacer en la fase actual y qué
 * herramientas usar. Plegado siempre al entrar: es ayuda, no la vista principal.
 */
export function SuggestionsPanel({ project }: { project: Project }) {
  const { t } = useI18n();
  const x = t.projectPlus;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const measurements = useLive(() => listMeasurements(project.id), [project.id]);
  const actions = useLive(() => listActions(project.id), [project.id]);
  const guide = PHASE_GUIDE[project.type]?.[project.phase];
  if (!guide || !measurements || !actions) return null;
  const checks = phaseChecks(project, project.phase, measurements, actions);
  const done = checks.filter((c) => c.done).length;
  return (
    <section className="raised overflow-hidden rounded-[20px]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="grid min-h-16 w-full grid-cols-[24px_minmax(0,1fr)_22px] items-center gap-3 px-4 py-3 text-left"
      >
        <Lightbulb aria-hidden size={22} className="text-accent-ink" />
        <span className="min-w-0">
          <span className="block font-display text-[17px] font-bold">{x.suggestions}</span>
          <span className="block text-[13.5px] leading-snug text-muted">{x.suggestionsSub(t.projects.phases[project.phase] ?? project.phase, done, checks.length)}</span>
        </span>
        <ChevronDown aria-hidden size={22} className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-4 border-t border-line px-4 pt-3 pb-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-[14px] font-bold text-accent-ink">{x.toDo}</h3>
            <ul className="flex flex-col gap-1.5">
              {checks.map((c) => (
                <li key={c.check} className="flex items-start gap-2.5 text-[15px]">
                  {c.done ? <CircleCheck aria-hidden size={19} className="mt-0.5 shrink-0 text-ok" /> : <CircleDashed aria-hidden size={19} className="mt-0.5 shrink-0 text-warn" />}
                  <span>
                    {x.checks[c.check]} <span className="text-[13px] text-muted">· {c.done ? x.done : x.pending}</span>
                  </span>
                </li>
              ))}
            </ul>
            {done === checks.length && <p className="rounded-[12px] bg-ok-soft p-2.5 text-[14px]">{x.allDone}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-[14px] font-bold text-accent-ink">{x.usualTools}</h3>
            <div className="flex flex-wrap gap-2">
              {guide.tools.map((id) => (
                <ToolChip key={id} projectId={project.id} toolId={id} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** Lista plegable de necesidades, cada una con sus herramientas (también en Referencia). */
export function NeedsList({ projectId }: { projectId?: string }) {
  const { t } = useI18n();
  const x = t.projectPlus;
  const [open, setOpen] = useState<string | null>(null);
  return (
      <ul className="flex flex-col">
        {NEEDS.map((n) => (
          <li key={n.key} className="border-b border-line last:border-b-0">
            <button type="button" aria-expanded={open === n.key} onClick={() => setOpen(open === n.key ? null : n.key)} className="grid min-h-12 w-full grid-cols-[minmax(0,1fr)_20px] items-center gap-2 py-2 text-left text-[15px] font-semibold">
              {x.needs[n.key]}
              <ChevronDown aria-hidden size={18} className={`text-muted transition-transform ${open === n.key ? 'rotate-180' : ''}`} />
            </button>
            {open === n.key && (
              <div className="flex flex-wrap gap-2 pb-3">
                {n.tools.map((id) => (
                  <ToolChip key={id} projectId={projectId} toolId={id} />
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
  );
}

/** Pestaña «Informe»: elegir qué entra, y luego el PDF del proyecto o el contexto para IA. */
export function ReportPanel({ projectId }: { projectId: string }) {
  const { t, lang } = useI18n();
  const r = t.projectPlus.report;
  const toast = useToast();
  const measurements = useLive(() => listMeasurements(projectId), [projectId]);
  const actions = useLive(() => listActions(projectId), [projectId]);
  const milestones = useLive(() => listMilestones(projectId), [projectId]);
  // Lo que el usuario quita; todo lo demás entra (también lo que se guarde después).
  const [left, setLeft] = useState<ReadonlySet<string>>(() => new Set());
  const [withActions, setWithActions] = useState(true);
  const [withMilestones, setWithMilestones] = useState(true);
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState<SheetDef | null>(null);
  const done = useCallback(() => setPrinting(null), []);
  const all = measurements ?? [];
  const nm = all.length;
  const nIn = all.filter((m) => !left.has(m.id)).length;
  const na = actions?.length ?? 0;
  const nh = milestones?.length ?? 0;
  const include = (): ReportInclude => ({
    measurements: new Set(all.filter((m) => !left.has(m.id)).map((m) => m.id)),
    actions: withActions && na > 0,
    milestones: withMilestones && nh > 0,
  });
  const build = () => projectReport(projectId, t, lang, { version: APP_VERSION, date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB'), include: include() });
  const pdf = async () => {
    setBusy(true);
    try {
      const rep = await build();
      if (rep) setPrinting(rep.def);
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    const rep = await build();
    if (!rep) return;
    try {
      await navigator.clipboard.writeText(rep.context);
      toast(r.copied, { tone: 'ok' });
    } catch {
      toast(r.copyFailed);
    }
  };
  const toggleOne = (id: string, on: boolean) => {
    const next = new Set(left);
    if (on) next.delete(id);
    else next.add(id);
    setLeft(next);
  };
  return (
    <Card>
      <h2 className="font-display text-[18px] font-bold">{r.title}</h2>
      <p className="text-[14.5px] leading-relaxed text-muted">{r.hint}</p>
      <div className="flex flex-col">
        <h3 className="text-[14px] font-bold text-accent-ink">{r.include}</h3>
        {nm + na + nh === 0 && measurements && actions && milestones && <p className="py-2 text-[14.5px] leading-relaxed text-muted">{r.onlyProject}</p>}
        {nm > 0 && (
          <Check
            label={r.measurements}
            hint={r.chosen(nIn, nm)}
            checked={nIn > 0}
            onChange={(on) => setLeft(on ? new Set() : new Set(all.map((m) => m.id)))}
            aside={<IconButton icon={choosing ? ChevronUp : ChevronDown} label={choosing ? r.chooseClose : r.chooseOpen} onClick={() => setChoosing(!choosing)} />}
          />
        )}
        {nm > 0 && choosing && (
          <ul className="mb-1 ml-3 flex flex-col border-l-2 border-line pl-3">
            {all.map((m) => {
              const tool = findTool(m.toolId);
              const v = latest(m);
              const phase = m.phase ? (t.projects.phases[m.phase] ?? m.phase) : t.projects.noPhase;
              return (
                <li key={m.id}>
                  <Check
                    label={m.name}
                    hint={[phase, tool?.text(t).name, v.headline ? formatHeadline(v.headline, t, lang) : ''].filter(Boolean).join(' · ')}
                    checked={!left.has(m.id)}
                    onChange={(on) => toggleOne(m.id, on)}
                  />
                </li>
              );
            })}
          </ul>
        )}
        {na > 0 && <Check label={r.actions} hint={r.count(na)} checked={withActions} onChange={setWithActions} />}
        {nh > 0 && <Check label={r.milestones} hint={r.count(nh)} checked={withMilestones} onChange={setWithMilestones} />}
      </div>
      <Button variant="primary" icon={busy ? Loader2 : FileText} disabled={busy} onClick={() => void pdf()} className="w-full">
        {busy ? r.building : r.pdf}
      </Button>
      <p className="text-[13px] text-muted">{r.pdfHint}</p>
      <Button icon={Copy} onClick={() => void copy()} className="w-full">
        {r.copy}
      </Button>
      <p className="text-[13px] leading-relaxed text-muted">{r.copyHint}</p>
      {printing && <PrintNow def={printing} onDone={done} />}
    </Card>
  );
}
