import { Suspense, useCallback, useState } from 'react';
import { Timer } from 'lucide-react';
import { useI18n } from '../i18n';
import { Sheet } from '../ui/Sheet';
import { Screen, DetailHeader } from '../ui/Layout';
import { findTool } from '../tools/registry';
import { BottomNav, SideNav } from './Nav';
import { HealthBanner } from './HealthBanner';
import { navigate, useRoute } from './router';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { ToolsScreen } from './screens/ToolsScreen';
import { ReferenceScreen } from './screens/ReferenceScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { GoogleTestScreen } from './screens/GoogleTestScreen';
import { ProjectFormScreen } from './screens/ProjectFormScreen';
import { ProjectScreen } from './screens/ProjectScreen';
import { SavedProvider, useLive } from '../projects/live';
import { getMeasurement, getProject } from '../projects/store';

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

/** Una medición guardada: su herramienta, arrancando con sus datos y con el panel de la medición. */
function MeasurementRoute({ projectId, id }: { projectId: string; id: string }) {
  const { t } = useI18n();
  const project = useLive(() => getProject(projectId), [projectId]);
  const analysis = useLive(() => getMeasurement(id), [id]);
  if (project === undefined || analysis === undefined) return null;
  const tool = analysis ? findTool(analysis.toolId) : undefined;
  if (!project || !analysis || !tool || analysis.projectId !== project.id) {
    return (
      <Screen>
        <DetailHeader title={t.measurement.notFound} onBack={() => navigate(project ? `/proyectos/${project.id}` : '/proyectos')} backLabel={t.common.back} />
      </Screen>
    );
  }
  return (
    <SavedProvider value={{ project, analysis }}>
      <Suspense fallback={null}>
        <tool.Screen key={analysis.id} />
      </Suspense>
    </SavedProvider>
  );
}

export function AppShell({ persisted }: { persisted: boolean | null }) {
  const { t } = useI18n();
  const [section = 'proyectos', sub, kind, third] = useRoute();
  const [capture, setCapture] = useState(false);
  const closeCapture = useCallback(() => setCapture(false), []);
  const openCapture = useCallback(() => setCapture(true), []);

  let screen;
  if (section === 'herramientas' && sub) screen = <ToolRoute id={sub} />;
  else if (section === 'herramientas') screen = <ToolsScreen />;
  else if (section === 'referencia') screen = <ReferenceScreen />;
  else if (section === 'ajustes') screen = <SettingsScreen persisted={persisted} />;
  else if (section === 'prueba-google') screen = <GoogleTestScreen />;
  else if (sub === 'nuevo') screen = <ProjectFormScreen />;
  else if (sub && kind === 'editar') screen = <ProjectFormScreen key={sub} id={sub} />;
  else if (sub && kind === 'm' && third) screen = <MeasurementRoute key={third} projectId={sub} id={third} />;
  else if (sub) screen = <ProjectScreen key={sub} id={sub} />;
  else screen = <ProjectsScreen />;
  // La prueba de Google cuelga de Ajustes: la barra marca Ajustes.
  const navSection = section === 'prueba-google' ? 'ajustes' : section;

  return (
    <div className="min-h-dvh bg-bg text-text">
      <SideNav active={navSection} onCapture={openCapture} />
      <main className="pb-(--nav-h) md:pl-(--side-w)">
        <HealthBanner />
        {screen}
      </main>
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
