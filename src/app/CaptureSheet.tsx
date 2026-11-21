import { useEffect, useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n';
import { Sheet } from '../ui/Sheet';
import { findTool } from '../tools/registry';
import { useLive } from '../projects/live';
import { lastUsed, listProjects, rememberLast } from '../projects/store';
import { navigate } from './router';

/** Las herramientas de captura en planta, en el orden del botón central. */
export const CAPTURE_TOOLS = ['cronometro', 'conteo', 'desperdicios', 'auditoria5s'] as const;
const NONE = '';

/** Botón central «Capturar»: en qué proyecto (el último ya elegido) y qué se captura. */
export function CaptureSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const c = t.capture;
  const id = useId();
  const projects = useLive(() => listProjects(), []);
  const [project, setProject] = useState(NONE);
  useEffect(() => {
    if (!open) return;
    void lastUsed().then((l) => setProject(l.projectId ?? NONE));
  }, [open]);
  const pick = async (toolId: string) => {
    if (project) await rememberLast(project, {});
    onClose();
    navigate(`/herramientas/${toolId}`);
  };
  return (
    <Sheet open={open} onClose={onClose} title={c.title}>
      {projects && projects.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="text-[13px] font-semibold text-muted">
            {c.project}
          </label>
          <select id={id} value={project} onChange={(e) => setProject(e.target.value)} className="h-12 w-full rounded-[15px] border-[1.5px] border-line bg-surface px-3.5 text-[16px] font-semibold outline-none focus:border-accent">
            <option value={NONE}>{c.noProject}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-[13px] leading-relaxed text-muted">{c.projectHint}</p>
        </div>
      )}
      <h3 className="text-[13px] font-semibold text-muted">{c.what}</h3>
      <ul className="flex flex-col gap-2.5">
        {CAPTURE_TOOLS.map((tid) => {
          const tool = findTool(tid);
          if (!tool) return null;
          const { name, summary } = tool.text(t);
          const Icon = tool.icon;
          return (
            <li key={tid}>
              <button type="button" onClick={() => void pick(tid)} className="press raised grid min-h-18 w-full grid-cols-[48px_minmax(0,1fr)_20px] items-center gap-3 rounded-[18px] p-3 text-left">
                <span className="grid size-12 place-items-center rounded-[14px] bg-soft text-accent-ink">
                  <Icon aria-hidden size={22} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[16px] font-semibold">{name}</span>
                  <span className="block text-[13px] leading-snug text-muted">{summary}</span>
                </span>
                <ChevronRight aria-hidden size={20} className="text-muted" />
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
