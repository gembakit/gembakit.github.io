import { Check, ChevronRight, Cloud, Copy, DatabaseBackup, Monitor, Moon, ShieldCheck, ShieldAlert, Sun } from 'lucide-react';
import { navigate } from '../router';
import { Button } from '../../ui/Button';
import { useCopyHealth } from '../HealthBanner';
import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { BigHeader, Card, Label, Screen } from '../../ui/Layout';
import { useTheme, type ModeChoice } from '../../ui/theme/ThemeProvider';
import { DEFAULT_THEME, THEMES, THEME_IDS } from '../../ui/theme/themes';
import { APP_VERSION } from '../../version';
import { GoogleAccountPanel } from '../GoogleAccount';

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string; icon?: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-[15px] bg-surface-2 p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.08)]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`flex items-center justify-center rounded-[11px] px-1 text-[14px] font-semibold ${o.icon ? 'min-h-[60px] flex-col gap-1' : 'min-h-12 gap-1.5'} ${on ? 'raised-sm text-text' : 'text-muted'}`}
          >
            {o.icon}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SettingsScreen({ persisted }: { persisted: boolean | null }) {
  const { t, choice, setChoice } = useI18n();
  const { theme, setTheme, modeChoice, setModeChoice, mode } = useTheme();
  const copyHealth = useCopyHealth();

  return (
    <Screen>
      <BigHeader title={t.settings.title} />

      <section className="flex flex-col gap-2.5">
        <Label>{t.settings.language}</Label>
        <Segmented
          label={t.settings.language}
          value={choice}
          onChange={setChoice}
          options={[
            { id: 'auto', label: t.settings.languageAuto },
            { id: 'es', label: t.settings.languageNames.es },
            { id: 'en', label: t.settings.languageNames.en },
          ]}
        />
      </section>

      <section className="flex flex-col gap-2.5">
        <Label>{t.settings.mode}</Label>
        <Segmented<ModeChoice>
          label={t.settings.mode}
          value={modeChoice}
          onChange={setModeChoice}
          options={[
            { id: 'light', label: t.settings.modeLight, icon: <Sun aria-hidden size={17} /> },
            { id: 'dark', label: t.settings.modeDark, icon: <Moon aria-hidden size={17} /> },
            { id: 'system', label: t.settings.modeSystem, icon: <Monitor aria-hidden size={17} /> },
          ]}
        />
      </section>

      <section className="flex flex-col gap-2.5">
        <Label>{t.settings.theme}</Label>
        <Card className="gap-1 p-1.5">
          <div role="radiogroup" aria-label={t.settings.theme} className="flex flex-col gap-1">
            {THEME_IDS.map((id) => {
              const p = THEMES[id][mode];
              const on = id === theme;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTheme(id)}
                  className={`press grid min-h-[72px] grid-cols-[72px_minmax(0,1fr)_28px] items-center gap-3.5 rounded-[16px] border-[1.5px] p-2.5 text-left ${on ? 'border-accent bg-surface' : 'border-transparent'}`}
                >
                  <span aria-hidden className="flex h-[54px] flex-col gap-1 rounded-[10px] border border-black/10 p-1.5" style={{ background: p.bg }}>
                    <span className="flex flex-1 flex-col gap-1 rounded-[5px] p-1.5" style={{ background: p.surface }}>
                      <span className="h-1 w-[70%] rounded" style={{ background: p.text }} />
                      <span className="h-1 w-[45%] rounded opacity-60" style={{ background: p.muted }} />
                      <span className="mt-auto h-2 w-[60%] rounded-[3px]" style={{ background: p.accent }} />
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15.5px] font-semibold">
                      {t.themes[id]}
                      {id === DEFAULT_THEME && <span className="font-normal text-muted"> · {t.themes.default}</span>}
                    </span>
                    <span className="block text-[13px] text-muted">{t.themes[`${id}Desc`]}</span>
                  </span>
                  {on ? (
                    <span className="grid size-7 place-items-center rounded-full bg-accent text-on-accent">
                      <Check aria-hidden size={16} strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span />
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="flex flex-col gap-2.5">
        <Label>{t.settings.storage}</Label>
        <Card className="flex-row items-start gap-3">
          {persisted ? <ShieldCheck aria-hidden className="mt-0.5 shrink-0 text-ok" size={22} /> : <ShieldAlert aria-hidden className="mt-0.5 shrink-0 text-warn" size={22} />}
          <p className="text-[15px] leading-relaxed">{persisted ? t.settings.storageYes : t.settings.storageNo}</p>
        </Card>
        <button
          type="button"
          onClick={() => navigate('/ajustes/datos')}
          className="press raised grid min-h-18 grid-cols-[48px_minmax(0,1fr)_20px] items-center gap-3 rounded-[20px] p-3 text-left"
        >
          <span className="grid size-12 place-items-center rounded-[14px] bg-soft text-accent-ink">
            <DatabaseBackup aria-hidden size={22} />
          </span>
          <span className="min-w-0">
            <span className="block text-[15.5px] font-semibold">{t.data.title}</span>
            <span className="block text-[13px] text-muted">{t.data.entryDesc}</span>
          </span>
          <ChevronRight aria-hidden size={20} className="text-muted" />
        </button>
      </section>

      <section className="flex flex-col gap-2.5">
        <Label>{t.settings.google}</Label>
        <Card>
          <GoogleAccountPanel />
        </Card>
        <button
          type="button"
          onClick={() => navigate('/prueba-google')}
          className="press raised grid min-h-18 grid-cols-[48px_minmax(0,1fr)_20px] items-center gap-3 rounded-[20px] p-3 text-left"
        >
          <span className="grid size-12 place-items-center rounded-[14px] bg-soft text-accent-ink">
            <Cloud aria-hidden size={22} />
          </span>
          <span className="min-w-0">
            <span className="block text-[15.5px] font-semibold">{t.settings.googleTest}</span>
            <span className="block text-[13px] text-muted">{t.settings.googleTestDesc}</span>
          </span>
          <ChevronRight aria-hidden size={20} className="text-muted" />
        </button>
      </section>

      <section className="flex flex-col gap-2.5">
        <Label>{t.settings.diagnostics}</Label>
        <Card>
          <p className="text-[15px] leading-relaxed">{t.settings.diagnosticsBody}</p>
          <Button icon={Copy} className="self-start" onClick={() => void copyHealth()}>
            {t.settings.diagnosticsCopy}
          </Button>
        </Card>
      </section>

      <section className="flex flex-col gap-2.5">
        <Label>{t.settings.about}</Label>
        <p className="text-[15px] text-muted">
          {t.app.name} · {t.settings.version(APP_VERSION)}
        </p>
      </section>
    </Screen>
  );
}
