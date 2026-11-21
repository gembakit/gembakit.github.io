import { lazy } from 'react';
import { ClipboardCheck } from 'lucide-react';
import type { ToolDef } from '../types';

// Auditoría 5S (docs/fichas/fase-4.md, ficha 4).
export const auditoria5sTool: ToolDef = {
  id: 'auditoria5s',
  category: 'capturar',
  icon: ClipboardCheck,
  text: (t) => ({ name: t.tools.auditoria5s.name, summary: t.tools.auditoria5s.summary }),
  Screen: lazy(() => import('./Auditoria5sTool')),
  savedSheet: () => import('./model').then((m) => m.auditSavedSheet),
};
