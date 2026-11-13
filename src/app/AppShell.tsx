import { Suspense, useCallback, useState } from 'react';
import { Timer } from 'lucide-react';
import { useI18n } from '../i18n';
import { Sheet } from '../ui/Sheet';
import { Screen, DetailHeader } from '../ui/Layout';
import { findTool } from '../tools/registry';
import { BottomNav, SideNav } from './Nav';
import { navigate, useRoute } from './router';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { ToolsScreen } from './screens/ToolsScreen';
import { ReferenceScreen } from './screens/ReferenceScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { GoogleTestScreen } from './screens/GoogleTestScreen';

function ToolRoute({ id }: { id: string }) {
  const { t } = useI18n();
  const tool = findTool(id);
  if (!tool) {
    return (
      <Screen>
        <DetailHeader title={t.tools.noResults(id)} onBack={() => navigate('/herramientas')} backLabel={t.common.back} />
      </Screen>
    );
  }
  return (
    <Suspense fallback={null}>
      <tool.Screen />
    </Suspense>
  );
}

export function AppShell({ persisted }: { persisted: boolean | null }) {
  const { t } = useI18n();
  const [section = 'proyectos', sub] = useRoute();
  const [capture, setCapture] = useState(false);
  const closeCapture = useCallback(() => setCapture(false), []);
  const openCapture = useCallback(() => setCapture(true), []);

  let screen;
  if (section === 'herramientas' && sub) screen = <ToolRoute id={sub} />;
  else if (section === 'herramientas') screen = <ToolsScreen />;
  else if (section === 'referencia') screen = <ReferenceScreen />;
  else if (section === 'ajustes') screen = <SettingsScreen persisted={persisted} />;
  else if (section === 'prueba-google') screen = <GoogleTestScreen />;
  else screen = <ProjectsScreen />;
  // La prueba de Google cuelga de Ajustes: la barra marca Ajustes.
  const navSection = section === 'prueba-google' ? 'ajustes' : section;

  return (
    <div className="min-h-dvh bg-bg text-text">
      <SideNav active={navSection} onCapture={openCapture} />
      <main className="pb-(--nav-h) md:pl-(--side-w)">{screen}</main>
      <BottomNav active={navSection} onCapture={openCapture} />
      <Sheet open={capture} onClose={closeCapture} title={t.capture.title}>
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-soft text-accent-ink">
            <Timer aria-hidden size={22} />
          </span>
          <p className="text-[15.5px] leading-relaxed">{t.capture.body}</p>
        </div>
      </Sheet>
    </div>
  );
}
