import { lazy } from 'react';
import { Timer } from 'lucide-react';
import type { ToolDef } from '../types';

// Takt y cuello de botella, con el balanceo de la línea (docs/fichas/fase-1.md, ficha 3).
export const taktTool: ToolDef = {
  id: 'takt',
  category: 'rapido',
  icon: Timer,
  text: (t) => ({ name: t.tools.takt.name, summary: t.tools.takt.summary }),
  Screen: lazy(() => import('./TaktTool')),
  savedSheet: () => import('./reading').then((m) => m.taktSavedSheet),
};
