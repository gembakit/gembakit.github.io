import { lazy } from 'react';
import { Footprints } from 'lucide-react';
import type { ToolDef } from '../types';

// Recorrido de desperdicios con fotos (docs/fichas/fase-4.md, ficha 3).
export const desperdiciosTool: ToolDef = {
  id: 'desperdicios',
  category: 'capturar',
  icon: Footprints,
  text: (t) => ({ name: t.tools.desperdicios.name, summary: t.tools.desperdicios.summary }),
  Screen: lazy(() => import('./DesperdiciosTool')),
  savedSheet: () => import('./model').then((m) => m.wasteSavedSheet),
};
