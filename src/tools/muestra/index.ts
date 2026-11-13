import { lazy } from 'react';
import { Sigma } from 'lucide-react';
import type { ToolDef } from '../types';

// Herramienta de muestra para probar la plantilla única. Se borra en la Fase 1.
export const muestra: ToolDef = {
  id: 'muestra',
  category: 'medir',
  icon: Sigma,
  text: (t) => ({ name: t.tools.muestra.name, summary: t.tools.muestra.summary }),
  Screen: lazy(() => import('./MuestraTool')),
};
