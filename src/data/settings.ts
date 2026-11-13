import { db, type GembaDB } from './db';
import { DEFAULT_THEME, THEME_IDS, type ThemeId } from '../ui/theme/themes';
import type { ModeChoice } from '../ui/theme/ThemeProvider';
import { LANGUAGES, type Language } from '../i18n/types';

export interface Settings {
  language: Language | 'auto';
  theme: ThemeId;
  mode: ModeChoice;
  favorites: string[];
}

export const DEFAULT_SETTINGS: Settings = { language: 'auto', theme: DEFAULT_THEME, mode: 'system', favorites: [] };

/** Lee los ajustes guardados; si falta alguno o es inválido, usa el valor por defecto. */
export async function loadSettings(database: GembaDB = db): Promise<Settings> {
  const rows = await database.settings.toArray();
  const raw = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
  const s: Settings = { ...DEFAULT_SETTINGS };
  if (raw.language === 'auto' || (LANGUAGES as readonly unknown[]).includes(raw.language)) s.language = raw.language as Settings['language'];
  if ((THEME_IDS as readonly unknown[]).includes(raw.theme)) s.theme = raw.theme as ThemeId;
  if (raw.mode === 'light' || raw.mode === 'dark' || raw.mode === 'system') s.mode = raw.mode;
  if (Array.isArray(raw.favorites) && raw.favorites.every((f) => typeof f === 'string')) s.favorites = raw.favorites as string[];
  return s;
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K], database: GembaDB = db): Promise<void> {
  await database.settings.put({ key, value });
}

/**
 * Pide al navegador que no borre los datos de la app aunque falte espacio.
 * Devuelve true si está concedido (Chrome en Android suele concederlo a apps instaladas).
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted?.()) return true;
  return navigator.storage.persist();
}
