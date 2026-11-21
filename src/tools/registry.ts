import type { ToolDef } from './types';
import { dpmoTool } from './dpmo';
import { fpyTool } from './fpy';
import { taktTool } from './takt';
import { oeeTool } from './oee';
import { kanbanTool } from './kanban';
import { roiTool } from './roi';
import { descriptivaTool } from './descriptiva';
import { paretoTool } from './pareto';
import { corridaTool } from './corrida';
import { capacidadTool } from './capacidad';
import { cartasTool } from './cartas';
import { porquesTool } from './porques';
import { espinaTool } from './espina';
import { a3Tool } from './a3';
import { kaizenTool } from './kaizen';
import { planControlTool } from './plancontrol';
import { accionesTool } from './acciones';

// Registro central de herramientas (CLAUDE.md, arquitectura).
// Cada herramienta vive en su carpeta y se añade aquí; la navegación y el
// catálogo se construyen a partir de esta lista.
export const TOOLS: readonly ToolDef[] = [paretoTool, corridaTool, descriptivaTool, dpmoTool, fpyTool, taktTool, oeeTool, capacidadTool, cartasTool, porquesTool, espinaTool, accionesTool, a3Tool, kaizenTool, planControlTool, kanbanTool, roiTool];

export function findTool(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id);
}
