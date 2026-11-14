import { useCallback, useState } from 'react';
import { ChevronDown, History, Lock, LockOpen, Pencil, Snowflake, Trash2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { Button, IconButton } from '../ui/Button';
import { MeasurementInfoSheet } from './MeasurementInfoSheet';
import { useToast } from '../ui/Toast';
import { navigate } from '../app/router';
import { deleteMeasurement, restoreMeasurement, setFrozen } from './store';
import { formatDateTime, formatHeadline, type SavedMeasurement } from './live';

/** Cabecera de una medición guardada: proyecto, fase, fecha, contexto, nota, versión, congelar y borrar. */
export function MeasurementPanel({ saved }: { saved: SavedMeasurement }) {
  const { t, lang } = useI18n();
  const m = t.measurement;
  const toast = useToast();
  const { project, analysis: a } = saved;
  const [history, setHistory] = useState(false);
  const [editing, setEditing] = useState(false);
  const closeEditing = useCallback(() => setEditing(false), []);
  const context = project.fields.filter((f) => a.context[f.id]).map((f) => ({ label: f.label, value: a.context[f.id]! }));
  const total = a.versions.length;

  const toggleFrozen = async () => {
    await setFrozen(a.id, !a.frozen);
    toast(a.frozen ? m.unfrozenToast : m.frozenToast);
  };
  const remove = async () => {
    await deleteMeasurement(a.id);
    navigate(`/proyectos/${project.id}`);
    toast(m.deleted, { action: { label: t.common.undo, onAction: () => void restoreMeasurement(a.id) } });
  };

  return (
    <section className="raised flex flex-col gap-3 rounded-[20px] p-4">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-muted">{m.info}</span>
          <h2 className="font-display text-[18px] leading-tight font-bold wrap-anywhere">{a.name}</h2>
          <p className="text-[14px] text-muted">
            {[a.phase ? (t.projects.phases[a.phase] ?? a.phase) : null, formatDateTime(a.measuredAt, lang), m.version(total, total)].filter(Boolean).join(' · ')}
          </p>
        </div>
        <IconButton icon={Pencil} label={m.edit} onClick={() => setEditing(true)} />
      </div>
      <MeasurementInfoSheet open={editing} onClose={closeEditing} project={project} analysis={a} />
      {context.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {context.map((c) => (
            <li key={c.label} className="rounded-full bg-surface-2 px-2.5 py-1 text-[13px] wrap-anywhere">
              <span className="text-muted">{c.label}:</span> <span className="font-semibold">{c.value}</span>
            </li>
          ))}
        </ul>
      )}
      {a.note && <p className="text-[14.5px] leading-relaxed wrap-anywhere">{a.note}</p>}
      {a.frozen === 1 && (
        <p className="flex items-start gap-2.5 rounded-[14px] bg-soft p-3 text-[14px]">
          <Snowflake aria-hidden size={18} className="mt-0.5 shrink-0 text-accent-ink" />
          <span>{m.frozen}</span>
        </p>
      )}
      {total > 1 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            aria-expanded={history}
            onClick={() => setHistory((v) => !v)}
            className="flex min-h-12 items-center gap-2 text-left text-[15px] font-semibold text-accent-ink"
          >
            <History aria-hidden size={19} />
            <span className="flex-1">{m.history}</span>
            <ChevronDown aria-hidden size={19} className={`transition-transform ${history ? 'rotate-180' : ''}`} />
          </button>
          {history && (
            <ol className="flex flex-col gap-1.5">
              {[...a.versions].reverse().map((v) => (
                <li key={v.n} className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 rounded-[12px] bg-surface-2 px-3 py-2 text-[14px]">
                  <span>{m.historyItem(v.n, formatDateTime(v.at, lang))}</span>
                  {v.headline && <span className="font-semibold tabular-nums">{formatHeadline(v.headline, t, lang)}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      {a.frozen === 0 && <p className="text-[13.5px] leading-relaxed text-muted">{m.freezeHint}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button icon={a.frozen ? LockOpen : Lock} onClick={() => void toggleFrozen()}>
          {a.frozen ? m.unfreeze : m.freeze}
        </Button>
        <Button variant="ghost" icon={Trash2} onClick={() => void remove()}>
          {m.delete}
        </Button>
      </div>
    </section>
  );
}
