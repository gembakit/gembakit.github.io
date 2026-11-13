import { lazy } from 'react';
import { Workflow } from 'lucide-react';
import type { ToolDef } from '../types';

// FPY y RTY (docs/fichas/fase-1.md, ficha 2).
export const fpyTool: ToolDef = {
  id: 'fpy',
  category: 'medir',
  icon: Workflow,
  text: (t) => ({ name: t.tools.fpy.name, summary: t.tools.fpy.summary }),
  Screen: lazy(() => import('./FpyTool')),
};
