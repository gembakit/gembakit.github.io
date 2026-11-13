import { BookOpen, FolderKanban, LayoutGrid, Plus, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useI18n } from '../i18n';
import { navigate } from './router';

type Tab = 'proyectos' | 'herramientas' | 'referencia' | 'ajustes';

const TABS: { id: Tab; icon: LucideIcon; label: (t: ReturnType<typeof useI18n>['t']) => string; long: (t: ReturnType<typeof useI18n>['t']) => string }[] = [
  { id: 'proyectos', icon: FolderKanban, label: (t) => t.nav.projects, long: (t) => t.nav.projects },
  { id: 'herramientas', icon: LayoutGrid, label: (t) => t.nav.tools, long: (t) => t.nav.toolsLong },
  { id: 'referencia', icon: BookOpen, label: (t) => t.nav.reference, long: (t) => t.nav.reference },
  { id: 'ajustes', icon: Settings, label: (t) => t.nav.settings, long: (t) => t.nav.settings },
];

/** Barra inferior flotante (móvil): cuatro pestañas y el botón Capturar en el centro. */
export function BottomNav({ active, onCapture }: { active: string; onCapture: () => void }) {
  const { t } = useI18n();
  const item = (tab: (typeof TABS)[number]) => {
    const on = active === tab.id;
    return (
      <a
        key={tab.id}
        href={`#/${tab.id}`}
        aria-current={on ? 'page' : undefined}
        className={`flex min-h-12 flex-col items-center justify-center gap-[3px] text-[10.5px] font-semibold ${on ? 'text-accent-ink' : 'text-muted'}`}
      >
        <tab.icon aria-hidden size={21} strokeWidth={1.8} />
        <span className="max-w-full truncate px-0.5">{tab.label(t)}</span>
      </a>
    );
  };
  return (
    <nav
      aria-label={t.nav.main}
      className="fixed inset-x-0 bottom-0 z-40 px-[max(12px,env(safe-area-inset-left))] pb-[max(12px,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="raised mx-auto grid h-[68px] max-w-[480px] grid-cols-5 items-center rounded-[24px]">
        {item(TABS[0]!)}
        {item(TABS[1]!)}
        <button
          type="button"
          onClick={onCapture}
          aria-label={t.nav.capture}
          className="press btn-primary mx-auto -mt-[22px] grid size-14 place-items-center rounded-[19px] text-on-accent shadow-[0_0_0_5px_var(--bg)]"
        >
          <Plus aria-hidden size={26} strokeWidth={2} />
        </button>
        {item(TABS[2]!)}
        {item(TABS[3]!)}
      </div>
    </nav>
  );
}

/** Menú lateral (pantallas anchas). */
export function SideNav({ active, onCapture }: { active: string; onCapture: () => void }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t.nav.main} className="fixed inset-y-0 left-0 z-40 hidden w-(--side-w) flex-col gap-1 border-r border-line bg-surface px-3 py-5 md:flex">
      <div className="px-3 pb-4 font-display text-[19px] font-bold tracking-tight">{t.app.name}</div>
      <button type="button" onClick={onCapture} className="press btn-primary mb-3 flex min-h-12 items-center gap-2.5 rounded-[14px] px-3.5 font-semibold text-on-accent">
        <Plus aria-hidden size={20} />
        {t.nav.capture}
      </button>
      {TABS.map((tab) => {
        const on = active === tab.id;
        return (
          <a
            key={tab.id}
            href={`#/${tab.id}`}
            aria-current={on ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate(`/${tab.id}`);
            }}
            className={`flex min-h-12 items-center gap-3 rounded-[12px] px-3 text-[14.5px] font-semibold ${on ? 'raised-sm text-text' : 'text-muted'}`}
          >
            <tab.icon aria-hidden size={20} strokeWidth={1.8} />
            {tab.long(t)}
          </a>
        );
      })}
    </nav>
  );
}
