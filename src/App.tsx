import { I18nProvider, useI18n } from './i18n';
import { ThemeProvider } from './ui/theme/ThemeProvider';

function Shell() {
  const { t } = useI18n();
  return (
    <main className="min-h-dvh bg-bg p-4 text-text">
      <h1 className="font-display text-3xl font-bold tracking-tight">{t.app.name}</h1>
    </main>
  );
}

export function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </I18nProvider>
  );
}
