import { lazy } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { ToolDef } from '../types';

// Plan de control (docs/fichas/fase-5.md).
export const planControlTool: ToolDef = {
  id: 'plancontrol',
  category: 'actuar',
  icon: ShieldCheck,
  text: (t) => ({ name: t.tools.plancontrol.name, summary: t.tools.plancontrol.summary }),
  Screen: lazy(() => import('./PlanControlTool')),
  savedSheet: () => import('./model').then((m) => m.planControlSavedSheet),
};
