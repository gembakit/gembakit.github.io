import { lazy } from 'react';
import { PiggyBank } from 'lucide-react';
import type { ToolDef } from '../types';

// Ahorro, ROI y payback (docs/fichas/fase-1.md, ficha 6).
export const roiTool: ToolDef = {
  id: 'roi',
  category: 'rapido',
  icon: PiggyBank,
  text: (t) => ({ name: t.tools.roi.name, summary: t.tools.roi.summary }),
  Screen: lazy(() => import('./RoiTool')),
  savedSheet: () => import('./reading').then((m) => m.roiSavedSheet),
};
