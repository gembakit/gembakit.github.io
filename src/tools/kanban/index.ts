import { lazy } from 'react';
import { Layers } from 'lucide-react';
import type { ToolDef } from '../types';

// Kanban: número de tarjetas (docs/fichas/fase-1.md, ficha 5).
export const kanbanTool: ToolDef = {
  id: 'kanban',
  category: 'rapido',
  icon: Layers,
  text: (t) => ({ name: t.tools.kanban.name, summary: t.tools.kanban.summary }),
  Screen: lazy(() => import('./KanbanTool')),
  savedSheet: () => import('./reading').then((m) => m.kanbanSavedSheet),
};
