import { lazy } from 'react';
import { ClipboardList } from 'lucide-react';
import type { ToolDef } from '../types';

// Hoja de conteo (docs/fichas/fase-4.md, ficha 2).
export const conteoTool: ToolDef = {
  id: 'conteo',
  category: 'capturar',
  icon: ClipboardList,
  text: (t) => ({ name: t.tools.conteo.name, summary: t.tools.conteo.summary }),
  Screen: lazy(() => import('./ConteoTool')),
  savedSheet: () => import('./model').then((m) => m.conteoSavedSheet),
};
