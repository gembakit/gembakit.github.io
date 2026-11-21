import { lazy } from 'react';
import { CircleHelp } from 'lucide-react';
import type { ToolDef } from '../types';

// 5 porqués (docs/fichas/fase-5.md).
export const porquesTool: ToolDef = {
  id: 'porques',
  category: 'causa',
  icon: CircleHelp,
  text: (t) => ({ name: t.tools.porques.name, summary: t.tools.porques.summary }),
  Screen: lazy(() => import('./PorquesTool')),
  savedSheet: () => import('./model').then((m) => m.porquesSavedSheet),
};
