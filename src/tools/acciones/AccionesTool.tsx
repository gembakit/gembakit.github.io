import { ChevronRight, TriangleAlert } from 'lucide-react';
import { useI18n } from '../../i18n';
import { db } from '../../data/db';
import { Card, DetailHeader, Screen } from '../../ui/Layout';
import { useLive } from '../../projects/live';
import { actionDue, listProjects, normalizeAction } from '../../projects/store';
import { navigate } from '../../app/router';

/** Lista de acciones desde el catálogo: las acciones viven en cada proyecto; aquí se elige cuál. */
export default function AccionesTool() {
  const { t } = useI18n();
  const x = t.tools.acciones;
  const projects = useLive(() => listProjects(), []);
  const stats = useLive(async () => {
    const all = (await db.actions.where('deleted').equals(0).toArray()).map(normalizeAction);
    const by: Record<string, { open: number; done: number; overdue: number; soon: number }> = {};
    for (const p of new Set(all.map((a) => a.projectId))) {
      const list = all.filter((a) => a.projectId === p);
      by[p] = { open: list.filter((a) => a.status !== 'done').length, done: list.filter((a) => a.status === 'done').length, ...actionDue(list) };
    }
    return by;
  }, []);
  return (
    <Screen>
      <DetailHeader title={x.name} subtitle={x.summary} onBack={() => navigate('/herramientas')} backLabel={t.common.back} />
      <Card>
        <h2 className="font-display text-[18px] font-bold">{x.pickTitle}</h2>
        <p className="text-[14.5px] leading-relaxed text-muted">{x.pickHint}</p>
      </Card>
      {projects && projects.length === 0 && (
        <Card>
          <p className="text-[15px] text-muted">{x.noProjects}</p>
        </Card>
      )}
      <ul className="flex flex-col gap-2.5">
        {(projects ?? []).map((p) => {
          const s = stats?.[p.id];
          return (
            <li key={p.id}>
              <button type="button" onClick={() => navigate(`/proyectos/${p.id}/acciones`)} className="press raised grid min-h-16 w-full grid-cols-[minmax(0,1fr)_20px] items-center gap-3 rounded-[18px] p-3.5 text-left">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[16px] font-semibold wrap-anywhere">{p.name}</span>
                  <span className="text-[13.5px] text-muted">{x.counts(s?.open ?? 0, s?.done ?? 0)}</span>
                  {s && (s.overdue > 0 || s.soon > 0) && (
                    <span className={`flex items-center gap-1.5 text-[13.5px] font-semibold ${s.overdue ? 'text-bad' : ''}`}>
                      <TriangleAlert aria-hidden size={15} className={s.overdue ? 'text-bad' : 'text-warn'} />
                      {[s.overdue ? x.overdue(s.overdue) : null, s.soon ? x.dueSoon(s.soon) : null].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
                <ChevronRight aria-hidden size={20} className="text-muted" />
              </button>
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
