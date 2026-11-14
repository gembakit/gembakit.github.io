import { lazy } from 'react';
import { Gauge } from 'lucide-react';
import type { ToolDef } from '../types';

// OEE (docs/fichas/fase-1.md, ficha 4).
export const oeeTool: ToolDef = {
  id: 'oee',
  category: 'medir',
  icon: Gauge,
  text: (t) => ({ name: t.tools.oee.name, summary: t.tools.oee.summary }),
  Screen: lazy(() => import('./OeeTool')),
  savedSheet: () => import('./reading').then((m) => m.oeeSavedSheet),
};
