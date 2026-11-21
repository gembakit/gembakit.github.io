import { lazy } from 'react';
import { ListTodo } from 'lucide-react';
import type { ToolDef } from '../types';

// Lista de acciones (docs/fichas/fase-5.md, ficha 3): vive en cada proyecto.
export const accionesTool: ToolDef = {
  id: 'acciones',
  category: 'actuar',
  icon: ListTodo,
  text: (t) => ({ name: t.tools.acciones.name, summary: t.tools.acciones.summary }),
  Screen: lazy(() => import('./AccionesTool')),
};
