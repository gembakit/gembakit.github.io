import { lazy } from 'react';
import { ChartColumn } from 'lucide-react';
import type { ToolDef } from '../types';

// Estadística descriptiva con histograma (docs/fichas/fase-2.md, ficha 1).
export const descriptivaTool: ToolDef = {
  id: 'descriptiva',
  category: 'encontrar',
  icon: ChartColumn,
  text: (t) => ({ name: t.tools.descriptiva.name, summary: t.tools.descriptiva.summary }),
  Screen: lazy(() => import('./DescriptivaTool')),
  savedSheet: () => import('./reading').then((m) => m.descriptivaSavedSheet),
};
