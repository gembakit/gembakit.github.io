import { lazy } from 'react';
import { Timer } from 'lucide-react';
import type { ToolDef } from '../types';

// Cronómetro de ciclos (docs/fichas/fase-4.md, ficha 1).
export const cronometroTool: ToolDef = {
  id: 'cronometro',
  category: 'capturar',
  icon: Timer,
  text: (t) => ({ name: t.tools.cronometro.name, summary: t.tools.cronometro.summary }),
  Screen: lazy(() => import('./CronometroTool')),
  savedSheet: () => import('./model').then((m) => m.cronoSavedSheet),
};
