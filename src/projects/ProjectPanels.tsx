import { useCallback, useId, useState } from 'react';
import { ChevronDown, CircleCheck, CircleDashed, ClipboardCheck, Copy, FileText, Flag, Lightbulb, Loader2, Sheet, type LucideIcon } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Project } from '../data/db';
import { Button } from '../ui/Button';
import { Card } from '../ui/Layout';
import { useToast } from '../ui/Toast';
import { PrintNow } from '../ui/PrintDoc';
import { findTool } from '../tools/registry';
import { APP_VERSION } from '../version';
import type { SheetDef } from '../sheet/types';
import { navigate } from '../app/router';
import { useLive } from './live';
import { listActions, listMeasurements, rememberLast } from './store';
import { NEEDS, PHASE_GUIDE, phaseChecks } from './phaseGuide';
import { projectReport } from './report';

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

/** Pestaña «Informe»: PDF del proyecto y contexto para IA. */
export function ReportPanel({ projectId }: { projectId: string }) {
  const { t, lang } = useI18n();
  const r = t.projectPlus.report;
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState<SheetDef | null>(null);
  const done = useCallback(() => setPrinting(null), []);
  const build = () => projectReport(projectId, t, lang, { version: APP_VERSION, date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB') });
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
  return (
    <Card>
      <h2 className="font-display text-[18px] font-bold">{r.title}</h2>
      <p className="text-[14.5px] leading-relaxed text-muted">{r.hint}</p>
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

