import { Check } from 'lucide-react';
import { Fragment } from 'react';
import { useI18n } from '../i18n';
import type { ProjectType } from '../data/db';
import { PHASES } from './model';

type State = 'done' | 'current' | 'todo';

/** Estado de cada fase: las anteriores a la actual, completadas; las siguientes, pendientes. */
export function phaseStates(type: ProjectType, current: string): { id: string; state: State }[] {
  const phases = PHASES[type];
  const at = phases.indexOf(current);
  return phases.map((id, i) => ({ id, state: i < at ? 'done' : i === at ? 'current' : 'todo' }));
}

/**
 * Recorrido de fases (maqueta aprobada): una letra por fase marcando lo
 * completado, lo actual y lo pendiente, y debajo los nombres en una línea.
 * Con `onPick`, tocar una fase la hace la actual.
 */
export function PhaseTrack({ type, phase, onPick, compact = false }: { type: ProjectType; phase: string; onPick?: (id: string) => void; compact?: boolean }) {
  const { t } = useI18n();
  const p = t.projects;
  const states = phaseStates(type, phase);
  if (!states.length) return null;
  const letters = p.letters[type] ?? [];
  const names = states.map((s) => p.phases[s.id] ?? s.id);
  const cols = { gridTemplateColumns: `repeat(${states.length}, minmax(0, 1fr))` };

  if (compact) {
    return (
      <div className="flex flex-col gap-1.5">
        <div aria-hidden className="grid gap-1" style={cols}>
          {states.map((s, i) => (
            <span
              key={s.id}
              className={`grid h-6.5 place-items-center rounded-[8px] font-display text-[12.5px] font-bold ${
                s.state === 'current' ? 'btn-primary text-on-accent' : s.state === 'done' ? 'bg-soft text-accent-ink' : 'bg-surface-2 text-muted'
              }`}
            >
              {letters[i]}
            </span>
          ))}
        </div>
        <span className="sr-only">{p.phaseNow(names[states.findIndex((s) => s.state === 'current')] ?? '')}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div role="group" aria-label={p.phase} className="grid gap-1.5" style={cols}>
        {states.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.state === 'current'}
            aria-label={`${names[i]}${s.state === 'done' ? ` (${p.phaseDone})` : ''}`}
            onClick={() => onPick?.(s.id)}
            className={`press relative grid min-h-13 place-items-center rounded-[14px] font-display text-[22px] leading-none font-bold ${
              s.state === 'current'
                ? 'btn-primary text-on-accent'
                : s.state === 'done'
                  ? 'bg-soft text-accent-ink'
                  : 'bg-surface-2 text-muted shadow-[inset_0_1px_2px_rgb(0_0_0/0.07)]'
            }`}
          >
            {letters[i]}
            {s.state === 'done' && (
              <span aria-hidden className="absolute -top-1.5 -right-1 grid size-5 place-items-center rounded-full bg-ok text-surface shadow-[0_0_0_2px_var(--surface)]">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="text-[13.5px] leading-relaxed">
        {states.map((s, i) => (
          <Fragment key={s.id}>
            {i > 0 && <span className="text-muted"> · </span>}
            <span className={s.state === 'current' ? 'font-bold text-accent-ink' : s.state === 'done' ? 'text-text' : 'text-muted'}>
              {s.state === 'done' && '✓ '}
              {names[i]}
            </span>
          </Fragment>
        ))}
      </p>
    </div>
  );
}
