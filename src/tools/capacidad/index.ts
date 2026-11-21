import { lazy } from 'react';
import { Target } from 'lucide-react';
import type { ToolDef } from '../types';

// Capacidad de proceso (docs/fichas/fase-3.md, ficha 1).
export const capacidadTool: ToolDef = {
  id: 'capacidad',
  category: 'medir',
  icon: Target,
  text: (t) => ({ name: t.tools.capacidad.name, summary: t.tools.capacidad.summary }),
  Screen: lazy(() => import('./CapacidadTool')),
  savedSheet: () => import('./reading').then((m) => m.capacidadSavedSheet),
};
