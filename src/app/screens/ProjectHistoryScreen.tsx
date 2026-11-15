import { useCallback, useEffect, useId, useState } from 'react';
import { BookmarkPlus, ChevronRight, CopyPlus, Flag, History, Pencil, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { db, type ProjectState, type ProjectVersion } from '../../data/db';
import {
  copyVersion,
  deleteVersion,
  isCheckpoint,
  KEEP_AUTO,
  listVersions,
  MAX_CHECKPOINTS,
  projectNow,
  putVersion,
  renameCheckpoint,
  restoreVersion,
  saveCheckpoint,
} from '../../data/history';
import { Button } from '../../ui/Button';
import { Card, DetailHeader, Label, Screen } from '../../ui/Layout';
import { Sheet } from '../../ui/Sheet';
import { useToast } from '../../ui/Toast';
import { PHASES } from '../../projects/model';
import { formatDateTime, formatHeadline, useLive } from '../../projects/live';
import { getProject, latest } from '../../projects/store';
import { Field, FormError, textareaClass } from '../../projects/SaveSheet';
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
  const [saving, setSaving] = useState(false);
  const close = useCallback(() => setOpen(null), []);
  const closeSave = useCallback(() => setSaving(false), []);
  const back = () => navigate(`/proyectos/${id}`);

  if (project === undefined) return null;
  if (project === null) {
    return (
      <Screen>
        <DetailHeader title={t.projects.notFound} onBack={() => navigate('/proyectos')} backLabel={t.common.back} />
      </Screen>
    );
  }

  const checkpoints = (versions ?? []).filter(isCheckpoint);
  const autos = (versions ?? []).filter((v) => !isCheckpoint(v));

  const removeCheckpoint = async (v: ProjectVersion) => {
    const gone = await deleteVersion(db, v.id);
    setOpen(null);
    toast(h.deleted(v.label ?? ''), { action: gone ? { label: t.common.undo, onAction: () => void putVersion(db, gone) } : undefined });
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
          <p className="text-[15px] leading-relaxed">{h.intro(KEEP_AUTO)}</p>
        </div>
        <Button variant="primary" icon={BookmarkPlus} className="w-full" onClick={() => setSaving(true)}>
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

      {versions && (
        <>
          <VersionList title={h.checkpoints(checkpoints.length, MAX_CHECKPOINTS)} empty={h.checkpointsEmpty} list={checkpoints} onOpen={setOpen} />
          <VersionList title={h.autos(KEEP_AUTO)} empty={h.empty} list={autos} onOpen={setOpen} />
        </>
      )}

      <CheckpointSheet open={saving} onClose={closeSave} projectId={id} />

      <Sheet open={open !== null} onClose={close} title={open ? (open.label ?? h.asOf(formatDateTime(open.at, lang))) : ''}>
        {open && (
          <>
            {open.label ? <span className="text-[14.5px] text-muted">{h.asOf(formatDateTime(open.at, lang))}</span> : <Reason v={open} />}
            {isCheckpoint(open) && <RenameField version={open} onDone={setOpen} />}
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
            {isCheckpoint(open) && (
              <Button variant="ghost" icon={Trash2} className="self-start" onClick={() => void removeCheckpoint(open)}>
                {h.deleteCheckpoint}
              </Button>
            )}
          </>
        )}
      </Sheet>
    </Screen>
  );
}

/** Una lista de versiones (puntos de control o automáticas), con su título. */
function VersionList({ title, empty, list, onOpen }: { title: string; empty: string; list: ProjectVersion[]; onOpen: (v: ProjectVersion) => void }) {
  const { lang } = useI18n();
  return (
    <section className="flex flex-col gap-2.5">
      <Label>{title}</Label>
      {list.length === 0 ? (
        <Card>
          <p className="text-[15px] leading-relaxed text-muted">{empty}</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((v) => (
            <li key={v.id}>
              <button type="button" onClick={() => onOpen(v)} className="press raised grid w-full grid-cols-[minmax(0,1fr)_20px] items-center gap-3 rounded-[18px] p-3.5 text-left">
                <span className="flex min-w-0 flex-col gap-1">
                  {v.label ? (
                    <>
                      <span className="flex items-start gap-2 text-[15.5px] font-semibold wrap-anywhere">
                        <Flag aria-hidden size={17} className="mt-[3px] shrink-0 text-accent-ink" />
                        <span className="min-w-0">{v.label}</span>
                      </span>
                      <span className="text-[14px]">{formatDateTime(v.at, lang)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[15.5px] font-semibold">{formatDateTime(v.at, lang)}</span>
                      <Reason v={v} />
                    </>
                  )}
                  <StateLine state={v.state} />
                </span>
                <ChevronRight aria-hidden size={20} className="text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** «Guardar punto de control»: pide el nombre y, si ya hay el máximo, cuál borrar para dejar sitio. */
function CheckpointSheet({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const { t, lang } = useI18n();
  const h = t.projects.history;
  const toast = useToast();
  const ids = useId();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [full, setFull] = useState<ProjectVersion[] | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setError(null);
    setFull(null);
    setPick(null);
  }, [open]);

  const submit = async () => {
    if (busy) return;
    if (!name.trim()) return setError(h.nameRequired);
    if (full && !pick) return setError(h.pickOne);
    setBusy(true);
    try {
      const r = await saveCheckpoint(db, projectId, name, pick ?? undefined);
      if (r.k === 'full') {
        setFull(r.checkpoints);
        return;
      }
      onClose();
      if (r.k === 'saved') toast(h.saved(r.version.label ?? name.trim()), { tone: 'ok' });
      else toast(h.same(r.version.label ?? ''), { tone: 'info' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={h.saveTitle}>
      <Field label={h.name} htmlFor={`${ids}n`}>
        <NameBox
          id={`${ids}n`}
          value={name}
          placeholder={h.namePlaceholder}
          onChange={(v) => {
            setName(v);
            setError(null);
          }}
          onEnter={() => void submit()}
        />
      </Field>
      {full && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[15px] leading-relaxed">{h.full(MAX_CHECKPOINTS)}</legend>
          {full.map((v) => (
            <label key={v.id} className="grid cursor-pointer grid-cols-[22px_minmax(0,1fr)] items-start gap-3 rounded-[14px] bg-surface-2 p-3 has-checked:outline-2 has-checked:outline-accent">
              <input
                type="radio"
                name={`${ids}pick`}
                className="mt-1 size-[18px] accent-accent"
                checked={pick === v.id}
                onChange={() => {
                  setPick(v.id);
                  setError(null);
                }}
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-[15px] font-semibold wrap-anywhere">{v.label}</span>
                <span className="text-[13.5px] text-muted">{formatDateTime(v.at, lang)}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {error && <FormError>{error}</FormError>}
      <Button variant="primary" icon={full ? Trash2 : Save} className="w-full" disabled={busy} onClick={() => void submit()}>
        {full ? h.replace : t.common.save}
      </Button>
    </Sheet>
  );
}

/** Cambiar el nombre de un punto de control, dentro de su detalle. */
function RenameField({ version, onDone }: { version: ProjectVersion; onDone: (v: ProjectVersion) => void }) {
  const { t } = useI18n();
  const h = t.projects.history;
  const toast = useToast();
  const id = useId();
  const [name, setName] = useState(version.label ?? '');
  useEffect(() => setName(version.label ?? ''), [version]);
  const changed = name.trim() !== '' && name.trim() !== version.label;
  const rename = async () => {
    if (!changed) return;
    await renameCheckpoint(db, version.id, name);
    onDone({ ...version, label: name.trim() });
    toast(h.renamed, { tone: 'ok' });
  };
  return (
    <Field label={h.name} htmlFor={id}>
      <NameBox id={id} value={name} onChange={setName} onEnter={() => void rename()} />
      {changed && (
        <Button icon={Pencil} className="mt-1 w-full" onClick={() => void rename()}>
          {h.rename}
        </Button>
      )}
    </Field>
  );
}

/** Campo del nombre: de varias líneas para que un nombre largo se lea entero; Intro no salta de línea. */
function NameBox({ id, value, onChange, onEnter, placeholder }: { id: string; value: string; onChange: (v: string) => void; onEnter: () => void; placeholder?: string }) {
  return (
    <textarea
      id={id}
      rows={2}
      maxLength={80}
      value={value}
      placeholder={placeholder}
      className={textareaClass.replace('min-h-24', 'min-h-0')}
      onChange={(e) => onChange(e.target.value.replace(/\s*\n\s*/g, ' '))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnter();
        }
      }}
    />
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
