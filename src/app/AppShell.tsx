import { Suspense, useCallback, useState } from 'react';
import { useI18n } from '../i18n';
import { CaptureSheet } from './CaptureSheet';
import { Screen, DetailHeader } from '../ui/Layout';
import { findTool } from '../tools/registry';
import { BottomNav, SideNav } from './Nav';
import { HealthBanner } from './HealthBanner';
import { navigate, useRoute } from './router';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { ToolsScreen } from './screens/ToolsScreen';
import { ReferenceScreen } from './screens/ReferenceScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DataScreen } from './screens/DataScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { welcomeDone } from '../google/account';
import { currentAccount } from '../google/session';
import { ProjectFormScreen } from './screens/ProjectFormScreen';
import { ProjectScreen } from './screens/ProjectScreen';
import { PROJECT_TABS, type ProjectTab } from '../projects/ProjectPanels';
import { ProjectHistoryScreen } from './screens/ProjectHistoryScreen';
import { SavedProvider, useLive } from '../projects/live';
import { useAutoSync } from '../projects/useAutoSync';
import { useDeviceSync } from '../google/useDeviceSync';
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
  const [section = 'proyectos', sub, kind, third] = useRoute();
  useAutoSync();
  useDeviceSync();
  const [capture, setCapture] = useState(false);
  const closeCapture = useCallback(() => setCapture(false), []);
  const openCapture = useCallback(() => setCapture(true), []);
  // La bienvenida sale la primera vez que se abre la app sin cuenta conectada, o en #/bienvenida.
  const [firstRun, setFirstRun] = useState(() => !welcomeDone() && !currentAccount());
  const endWelcome = useCallback(() => {
    setFirstRun(false);
    navigate('/proyectos');
  }, []);

  if (firstRun || section === 'bienvenida') {
    return (
      <WelcomeScreen onDone={endWelcome} />
    );
  }

  let screen;
  if (section === 'herramientas' && sub) screen = <ToolRoute id={sub} />;
  else if (section === 'herramientas') screen = <ToolsScreen />;
  else if (section === 'referencia') screen = <ReferenceScreen />;
  else if (section === 'ajustes' && sub === 'datos') screen = <DataScreen />;
  else if (section === 'ajustes') screen = <SettingsScreen persisted={persisted} />;
  else if (sub === 'nuevo') screen = <ProjectFormScreen />;
  else if (sub && kind === 'editar') screen = <ProjectFormScreen key={sub} id={sub} />;
  else if (sub && kind === 'historial') screen = <ProjectHistoryScreen key={sub} id={sub} />;
  else if (sub && kind === 'm' && third) screen = <MeasurementRoute key={third} projectId={sub} id={third} />;
  else if (sub && kind && (PROJECT_TABS as readonly string[]).includes(kind)) screen = <ProjectScreen key={`${sub}-${kind}`} id={sub} tab={kind as ProjectTab} />;
  else if (sub) screen = <ProjectScreen key={sub} id={sub} />;
  else screen = <ProjectsScreen />;
  const navSection = section;

  return (
    <div className="min-h-dvh bg-bg text-text">
      <SideNav active={navSection} onCapture={openCapture} />
      <main className="pb-(--nav-h) md:pl-(--side-w)">
        <HealthBanner />
        {screen}
      </main>
      <BottomNav active={navSection} onCapture={openCapture} />
      <CaptureSheet open={capture} onClose={closeCapture} />
    </div>
  );
}
