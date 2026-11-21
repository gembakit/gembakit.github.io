import { lazy } from 'react';
import { Activity } from 'lucide-react';
import type { ToolDef } from '../types';

// Cartas de control I-MR y X-barra R (docs/fichas/fase-3.md, ficha 2).
export const cartasTool: ToolDef = {
  id: 'cartas',
  category: 'vigilar',
  icon: Activity,
  text: (t) => ({ name: t.tools.cartas.name, summary: t.tools.cartas.summary }),
  Screen: lazy(() => import('./CartasTool')),
  savedSheet: () => import('./reading').then((m) => m.cartasSavedSheet),
};
