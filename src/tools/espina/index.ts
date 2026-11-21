import { lazy } from 'react';
import { Fish } from 'lucide-react';
import type { ToolDef } from '../types';

// Espina de pescado (docs/fichas/fase-5.md).
export const espinaTool: ToolDef = {
  id: 'espina',
  category: 'causa',
  icon: Fish,
  text: (t) => ({ name: t.tools.espina.name, summary: t.tools.espina.summary }),
  Screen: lazy(() => import('./EspinaTool')),
  savedSheet: () => import('./model').then((m) => m.espinaSavedSheet),
};
