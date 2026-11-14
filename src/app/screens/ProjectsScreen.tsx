import { ChevronRight, CircleCheck, CloudUpload, FolderPlus, LayoutGrid } from 'lucide-react';
import { sheetStatus, type SheetStatus } from '../../projects/sheetSync';
import { useI18n } from '../../i18n';
import { db } from '../../data/db';
import { Button, IconButton } from '../../ui/Button';
import { BigHeader, Card, Screen } from '../../ui/Layout';
import { useLive } from '../../projects/live';
import { listProjects } from '../../projects/store';
import { PhaseTrack } from '../../projects/PhaseTrack';
import { navigate } from '../router';

export function ProjectsScreen() {
  const { t, lang } = useI18n();
  const p = t.projects;
  const projects = useLive(() => listProjects(), []);
  // Número de mediciones de cada proyecto.
  const counts = useLive(async () => {
    const all = await db.analyses.where('deleted').equals(0).toArray();
    const c: Record<string, number> = {};
    for (const a of all) c[a.projectId] = (c[a.projectId] ?? 0) + 1;
    return c;
  }, []);
  // Estado de la hoja de Google de cada proyecto que tiene una.
  const sheets = useLive(async () => {
    const out: Record<string, SheetStatus> = {};
    for (const pr of await listProjects()) {
      const s = await sheetStatus(pr.id);
      if (s.link) out[pr.id] = s;
    }
    return out;
  }, []);
  const date = (ms: number) => new Date(ms).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short' });

  return (
    <Screen>
      <BigHeader title={p.title} right={<IconButton icon={FolderPlus} label={p.newProject} onClick={() => navigate('/proyectos/nuevo')} />} />
      {projects && projects.length === 0 && (
        <Card className="items-start gap-3 py-6">
          <span className="grid size-14 place-items-center rounded-[16px] bg-soft text-accent-ink">
            <FolderPlus aria-hidden size={26} strokeWidth={1.8} />
          </span>
          <h2 className="font-display text-[20px] font-bold tracking-tight">{p.emptyTitle}</h2>
          <p className="text-[15px] leading-relaxed text-muted">{p.emptyBody}</p>
          <div className="mt-1 flex w-full flex-col gap-2.5 sm:flex-row">
            <Button variant="primary" icon={FolderPlus} onClick={() => navigate('/proyectos/nuevo')} className="w-full sm:w-auto">
              {p.newProject}
            </Button>
            <Button icon={LayoutGrid} onClick={() => navigate('/herramientas')} className="w-full sm:w-auto">
              {p.openTools}
            </Button>
          </div>
        </Card>
      )}
      {projects && projects.length > 0 && (
        <ul className="flex flex-col gap-3">
          {projects.map((pr) => (
            <li key={pr.id}>
              <button
                type="button"
                onClick={() => navigate(`/proyectos/${pr.id}`)}
                className="press raised grid min-h-20 w-full grid-cols-[minmax(0,1fr)_20px] items-center gap-3 rounded-[20px] p-4 text-left"
              >
                <span className="flex min-w-0 flex-col gap-1.5">
                  <span className="font-display text-[18px] leading-tight font-bold wrap-anywhere">{pr.name}</span>
                  <span className="text-[14px] text-muted">
                    {[p.types[pr.type].name, pr.phase ? p.phases[pr.phase] : null].filter(Boolean).join(' · ')}
                  </span>
                  <PhaseTrack type={pr.type} phase={pr.phase} compact />
                  <span className="text-[13.5px] text-muted">
                    {p.count(counts?.[pr.id] ?? 0)} · {date(pr.updatedAt)}
                  </span>
                  {sheets?.[pr.id] && (
                    <span className={`flex items-center gap-1.5 text-[13.5px] ${sheets[pr.id]!.pending ? 'text-text' : 'text-muted'}`}>
                      {sheets[pr.id]!.pending ? (
                        <CloudUpload aria-hidden size={16} className="shrink-0 text-accent-ink" />
                      ) : (
                        <CircleCheck aria-hidden size={16} className="shrink-0 text-ok" />
                      )}
                      {sheets[pr.id]!.pending ? t.gsheet.listPending(sheets[pr.id]!.pending) : t.gsheet.listUpToDate}
                    </span>
                  )}
                </span>
                <ChevronRight aria-hidden size={20} className="text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
