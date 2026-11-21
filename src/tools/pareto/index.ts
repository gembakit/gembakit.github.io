import { lazy } from 'react';
import { ChartBarDecreasing } from 'lucide-react';
import type { ToolDef } from '../types';

// Pareto (docs/fichas/fase-2.md, ficha 2).
export const paretoTool: ToolDef = {
  id: 'pareto',
  category: 'encontrar',
  icon: ChartBarDecreasing,
  text: (t) => ({ name: t.tools.pareto.name, summary: t.tools.pareto.summary }),
  Screen: lazy(() => import('./ParetoTool')),
  savedSheet: () => import('./reading').then((m) => m.paretoSavedSheet),
};
