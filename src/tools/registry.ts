import type { ToolDef } from './types';
import { dpmoTool } from './dpmo';
import { fpyTool } from './fpy';
import { taktTool } from './takt';
import { oeeTool } from './oee';
import { kanbanTool } from './kanban';
import { roiTool } from './roi';

// Registro central de herramientas (CLAUDE.md, arquitectura).
// Cada herramienta vive en su carpeta y se añade aquí; la navegación y el
// catálogo se construyen a partir de esta lista.
export const TOOLS: readonly ToolDef[] = [dpmoTool, fpyTool, taktTool, oeeTool, kanbanTool, roiTool];

export function findTool(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id);
}
