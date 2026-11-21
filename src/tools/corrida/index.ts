import { lazy } from 'react';
import { ChartSpline } from 'lucide-react';
import type { ToolDef } from '../types';

// Gráfico de corrida (docs/fichas/fase-2.md, ficha 3).
export const corridaTool: ToolDef = {
  id: 'corrida',
  category: 'encontrar',
  icon: ChartSpline,
  text: (t) => ({ name: t.tools.corrida.name, summary: t.tools.corrida.summary }),
  Screen: lazy(() => import('./CorridaTool')),
  savedSheet: () => import('./reading').then((m) => m.corridaSavedSheet),
};
