import type { ToolDef } from './types';
import { dpmoTool } from './dpmo';

// Registro central de herramientas (CLAUDE.md, arquitectura).
// Cada herramienta vive en su carpeta y se añade aquí; la navegación y el
// catálogo se construyen a partir de esta lista.
export const TOOLS: readonly ToolDef[] = [dpmoTool];

export function findTool(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id);
}
