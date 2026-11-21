import { lazy } from 'react';
import { FileText } from 'lucide-react';
import type { ToolDef } from '../types';

// Informe A3 (docs/fichas/fase-5.md).
export const a3Tool: ToolDef = {
  id: 'a3',
  category: 'actuar',
  icon: FileText,
  text: (t) => ({ name: t.tools.a3.name, summary: t.tools.a3.summary }),
  Screen: lazy(() => import('./A3Tool')),
  savedSheet: () => import('./model').then((m) => m.a3SavedSheet),
};
