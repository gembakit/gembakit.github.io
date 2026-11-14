import { useCallback, useState } from 'react';
import { ChevronRight, CopyPlus, History, RotateCcw, Save } from 'lucide-react';
import { useI18n } from '../../i18n';
import { db, type ProjectState, type ProjectVersion } from '../../data/db';
import { copyVersion, listVersions, projectNow, restoreVersion, saveVersionNow } from '../../data/history';
import { Button } from '../../ui/Button';
import { Card, DetailHeader, Label, Screen } from '../../ui/Layout';
import { Sheet } from '../../ui/Sheet';
import { useToast } from '../../ui/Toast';
import { PHASES } from '../../projects/model';
import { formatDateTime, formatHeadline, useLive } from '../../projects/live';
import { getProject, latest } from '../../projects/store';
import { navigate } from '../router';

/** Cuántas mediciones o hitos se enumeran en el detalle de una versión antes de resumir. */
const LIST_MAX = 8;

/** «12 nov, 18:30»: para el nombre de una copia. */
function shortDateTime(ms: number, lang: 'es' | 'en'): string {
  return new Date(ms).toLocaleString(lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Historial de un proyecto: cómo está ahora y sus versiones guardadas, para volver a una o abrirla como copia. */
export function ProjectHistoryScreen({ id }: { id: string }) {
  const { t, lang } = useI18n();
  const h = t.projects.history;
  const toast = useToast();
  const project = useLive(() => getProject(id), [id]);
  const current = useLive(() => projectNow(db, id), [id]);
  const versions = useLive(() => listVersions(db, id), [id]);
  const [open, setOpen] = useState<ProjectVersion | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const back = () => navigate(`/proyectos/${id}`);

  if (project === undefined) return null;
  if (project === null) {
    return (
      <Screen>
        <DetailHeader title={t.projects.notFound} onBack={() => navigate('/proyectos')} backLabel={t.common.back} />
      </Screen>
    );
  }

  const saveNow = async () => {
    const r = await saveVersionNow(db, id);
    toast(r === 'saved' ? h.saved : h.same, { tone: r === 'saved' ? 'ok' : 'info' });
  };

  const goBack = async (v: ProjectVersion) => {
    const before = await restoreVersion(db, v.id);
    setOpen(null);
    back();
    toast(h.restored(shortDateTime(v.at, lang)), {
      tone: 'ok',
      action: before ? { label: t.common.undo, onAction: () => void restoreVersion(db, before.id) } : undefined,
    });
  };

  const asCopy = async (v: ProjectVersion) => {
    const name = h.copyName(v.state.project.name, shortDateTime(v.at, lang));
    const copyId = await copyVersion(db, v.id, name);
    setOpen(null);
    navigate(`/proyectos/${copyId}`);
    toast(h.copied(name), { tone: 'ok' });
  };

  return (
    <Screen>
      <DetailHeader title={h.title} subtitle={project.name} onBack={back} backLabel={t.common.back} />

      <Card>
        <div className="flex items-start gap-3">
          <History aria-hidden size={22} className="mt-0.5 shrink-0 text-accent-ink" />
          <p className="text-[15px] leading-relaxed">{h.intro}</p>
        </div>
        <Button icon={Save} className="w-full" onClick={() => void saveNow()}>
          {h.saveNow}
        </Button>
        <p className="text-[13.5px] leading-relaxed text-muted">{h.saveHint}</p>
      </Card>

      {current && (
        <section className="flex flex-col gap-2.5">
          <Label>{h.now}</Label>
          <div className="flex flex-col gap-0.5 rounded-[18px] bg-soft p-3.5">
            <span className="text-[15.5px] font-semibold">{formatDateTime(current.changedAt, lang)}</span>
            <StateLine state={current.state} />
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <Label>{h.versions}</Label>
        {versions && versions.length === 0 && (
          <Card>
            <p className="text-[15px] leading-relaxed text-muted">{h.empty}</p>
          </Card>
        )}
        {versions && versions.length > 0 && (
          <ul className="flex flex-col gap-2">
            {versions.map((v) => (
              <li key={v.id}>
                <button type="button" onClick={() => setOpen(v)} className="press raised grid w-full grid-cols-[minmax(0,1fr)_20px] items-center gap-3 rounded-[18px] p-3.5 text-left">
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[15.5px] font-semibold">{formatDateTime(v.at, lang)}</span>
                    <Reason v={v} />
                    <StateLine state={v.state} />
                  </span>
                  <ChevronRight aria-hidden size={20} className="text-muted" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Sheet open={open !== null} onClose={close} title={open ? h.asOf(formatDateTime(open.at, lang)) : ''}>
        {open && (
          <>
            <Reason v={open} />
            <VersionDetail state={open.state} />
            <div className="flex flex-col gap-2">
              <Button variant="primary" icon={RotateCcw} className="w-full" onClick={() => void goBack(open)}>
                {h.restore}
              </Button>
              <p className="text-[13.5px] leading-relaxed text-muted">{h.restoreHint}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button icon={CopyPlus} className="w-full" onClick={() => void asCopy(open)}>
                {h.copy}
              </Button>
              <p className="text-[13.5px] leading-relaxed text-muted">{h.copyHint}</p>
            </div>
          </>
        )}
      </Sheet>
    </Screen>
  );
}

/** Etiqueta de por qué se guardó la versión. */
function Reason({ v }: { v: ProjectVersion }) {
  const { t, lang } = useI18n();
  const h = t.projects.history;
  const text = v.reason === 'backup' && v.copyAt ? h.fromCopy(formatDateTime(v.copyAt, lang)) : (h.reasons[v.reason] ?? v.reason);
  return <span className="self-start rounded-[10px] bg-soft px-2.5 py-0.5 text-[13px] font-semibold text-accent-ink">{text}</span>;
}

/** «Medir · 3 mediciones · 1 hito». */
function StateLine({ state }: { state: ProjectState }) {
  const { t } = useI18n();
  const p = t.projects;
  const phase = PHASES[state.project.type].length > 0 && state.project.phase ? (p.phases[state.project.phase] ?? state.project.phase) : null;
  const counts = p.history.counts(state.children.analyses.length, state.children.milestones.length);
  return <span className="text-[14px] text-muted">{[phase, counts].filter(Boolean).join(' · ')}</span>;
}

/** Lo que había en una versión: nombre, fase, objetivo, mediciones e hitos. */
function VersionDetail({ state }: { state: ProjectState }) {
  const { t, lang } = useI18n();
  const p = t.projects;
  const { project } = state;
  const measurements = [...state.children.analyses].sort((a, b) => b.measuredAt - a.measuredAt);
  const milestones = [...state.children.milestones].sort((a, b) => b.at - a.at);
  const phases = PHASES[project.type];
  return (
    <div className="flex flex-col gap-3 rounded-[16px] bg-surface-2 p-4">
      <p className="text-[16px] font-semibold wrap-anywhere">{project.name}</p>
      {phases.length > 0 && project.phase && (
        <p className="text-[14.5px]">
          <span className="text-muted">{p.phase}: </span>
          {p.phases[project.phase] ?? project.phase}
        </p>
      )}
      {project.goal && (
        <p className="text-[14.5px] wrap-anywhere">
          <span className="text-muted">{p.goal}: </span>
          {project.goal}
        </p>
      )}
      <Listing
        title={p.measurements}
        items={measurements.map((m) => {
          const v = latest(m);
          return { id: m.id, main: m.name, sub: v.headline ? formatHeadline(v.headline, t, lang) : '' };
        })}
      />
      <Listing title={p.milestones.title} items={milestones.map((m) => ({ id: m.id, main: m.title, sub: formatDateTime(m.at, lang) }))} />
    </div>
  );
}

function Listing({ title, items }: { title: string; items: { id: string; main: string; sub: string }[] }) {
  const { t } = useI18n();
  if (items.length === 0) return null;
  const shown = items.slice(0, LIST_MAX);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[13px] font-bold tracking-wide text-muted uppercase">
        {title} ({items.length})
      </p>
      <ul className="flex flex-col gap-1.5">
        {shown.map((x) => (
          <li key={x.id} className="flex flex-col">
            <span className="text-[14.5px] font-semibold wrap-anywhere">{x.main}</span>
            {x.sub && <span className="text-[13.5px] text-muted wrap-anywhere">{x.sub}</span>}
          </li>
        ))}
      </ul>
      {items.length > LIST_MAX && <p className="text-[13.5px] text-muted">{t.projects.history.more(items.length - LIST_MAX)}</p>}
    </div>
  );
}
