import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_THEME, THEMES, cssVariables, type Mode, type ThemeId } from './themes';

export type ModeChoice = Mode | 'system';

interface ThemeValue {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  modeChoice: ModeChoice;
  setModeChoice: (m: ModeChoice) => void;
  /** Modo efectivo después de resolver "system". */
  mode: Mode;
  /** Pinta la app con otro tema sin cambiar el elegido (la bienvenida va en «Pizarra»); null lo quita. */
  setPaintAs: (t: ThemeId | null) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function systemMode(): Mode {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({
  children,
  initialTheme = DEFAULT_THEME,
  initialMode = 'system',
}: {
  children: ReactNode;
  initialTheme?: ThemeId;
  initialMode?: ModeChoice;
}) {
  const [theme, setTheme] = useState<ThemeId>(initialTheme);
  const [modeChoice, setModeChoice] = useState<ModeChoice>(initialMode);
  const [sysMode, setSysMode] = useState<Mode>(systemMode);
  const [paintAs, setPaintAs] = useState<ThemeId | null>(null);

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSysMode(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const mode: Mode = modeChoice === 'system' ? sysMode : modeChoice;

  const shown = paintAs ?? theme;
  useEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(cssVariables(shown, mode))) root.style.setProperty(k, v);
    root.dataset.theme = shown;
    root.dataset.mode = mode;
    root.style.colorScheme = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES[shown][mode].bg);
  }, [shown, mode]);

  const value = useMemo(() => ({ theme, setTheme, modeChoice, setModeChoice, mode, setPaintAs }), [theme, modeChoice, mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
