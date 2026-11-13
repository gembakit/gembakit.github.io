import type { ComponentType, LazyExoticComponent } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Messages } from '../i18n';

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
}
