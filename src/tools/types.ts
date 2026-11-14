import type { ComponentType, LazyExoticComponent } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Messages } from '../i18n';
import type { SheetDef } from '../sheet/types';

export const CATEGORIES = ['capturar', 'encontrar', 'causa', 'medir', 'vigilar', 'actuar', 'rapido'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Definición de una herramienta. Añadir una al registro basta para que aparezca en la app. */
export interface ToolDef {
  id: string;
  category: Category;
  icon: LucideIcon;
  /** Nombre y resumen, desde los archivos de idioma. */
  text: (t: Messages) => { name: string; summary: string };
  /** Pantalla de la herramienta (se carga solo cuando se abre). */
  Screen: LazyExoticComponent<ComponentType>;
  /**
   * Hoja de una medición guardada (para la hoja de Google del proyecto). Se
   * carga solo al sincronizar. Devuelve null si los datos no dan resultado.
   */
  savedSheet?: () => Promise<SavedSheetFn>;
}

export type SavedSheetFn = (input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }) => SheetDef | null;
