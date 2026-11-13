import { useEffect, useRef, useState } from 'react';
import { I18nProvider, useI18n } from './i18n';
import { ThemeProvider, useTheme } from './ui/theme/ThemeProvider';
import { ToastProvider } from './ui/Toast';
import { AppShell } from './app/AppShell';
import { UpdatePrompt } from './app/UpdatePrompt';
import { DEFAULT_SETTINGS, loadSettings, requestPersistentStorage, saveSetting, type Settings } from './data/settings';

/** Guarda en el dispositivo cada cambio de idioma, tema o modo. */
function PersistSettings() {
  const { choice } = useI18n();
  const { theme, modeChoice } = useTheme();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    void saveSetting('language', choice);
    void saveSetting('theme', theme);
    void saveSetting('mode', modeChoice);
  }, [choice, theme, modeChoice]);
  return null;
}

export function App({ withServiceWorker = false }: { withServiceWorker?: boolean }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    loadSettings()
      .catch(() => DEFAULT_SETTINGS)
      .then(setSettings);
    requestPersistentStorage()
      .then(setPersisted)
      .catch(() => setPersisted(false));
  }, []);

  if (!settings) return null;
  return (
    <I18nProvider initial={settings.language}>
      <ThemeProvider initialTheme={settings.theme} initialMode={settings.mode}>
        <ToastProvider>
          <PersistSettings />
          {withServiceWorker && <UpdatePrompt />}
          <AppShell persisted={persisted} />
        </ToastProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
