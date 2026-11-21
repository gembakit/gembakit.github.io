import { lazy } from 'react';
import { Zap } from 'lucide-react';
import type { ToolDef } from '../types';

// Evento Kaizen (docs/fichas/fase-5.md).
export const kaizenTool: ToolDef = {
  id: 'kaizen',
  category: 'actuar',
  icon: Zap,
  text: (t) => ({ name: t.tools.kaizen.name, summary: t.tools.kaizen.summary }),
  Screen: lazy(() => import('./KaizenTool')),
  savedSheet: () => import('./model').then((m) => m.kaizenSavedSheet),
};
