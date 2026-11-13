import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { es } from './es';
import { en } from './en';
import { LANGUAGES, type Language, type Messages } from './types';

export { LANGUAGES, type Language, type Messages };

export const MESSAGES: Record<Language, Messages> = { es, en };

/** Idioma del dispositivo: español si alguno de sus idiomas preferidos es español; si no, inglés. */
export function detectLanguage(preferred: readonly string[] = navigator.languages ?? [navigator.language]): Language {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    if (base === 'es') return 'es';
    if (base === 'en') return 'en';
  }
  return 'en';
}

type Choice = Language | 'auto';

interface I18nValue {
  lang: Language;
  choice: Choice;
  setChoice: (c: Choice) => void;
  t: Messages;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children, initial = 'auto' }: { children: ReactNode; initial?: Choice }) {
  const [choice, setChoice] = useState<Choice>(initial);
  const lang: Language = choice === 'auto' ? detectLanguage() : choice;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, choice, setChoice, t: MESSAGES[lang] }), [lang, choice]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n debe usarse dentro de <I18nProvider>');
  return ctx;
}
