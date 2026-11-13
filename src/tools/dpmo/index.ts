import { lazy } from 'react';
import { Sigma } from 'lucide-react';
import type { ToolDef } from '../types';

// DPMO y nivel sigma (docs/fichas/fase-1.md, ficha 1).
export const dpmoTool: ToolDef = {
  id: 'dpmo',
  category: 'medir',
  icon: Sigma,
  text: (t) => ({ name: t.tools.dpmo.name, summary: t.tools.dpmo.summary }),
  Screen: lazy(() => import('./DpmoTool')),
};
