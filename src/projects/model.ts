import type { ContextField, ProjectType } from '../data/db';

// Tipos de proyecto, sus fases y los campos de contexto por defecto
// (ESTADO.md, sección 6, y docs/fichas/proyecto-minimo.md).

export const PROJECT_TYPES: readonly ProjectType[] = ['dmaic', 'kaizen', 'a3', '5s', 'seguimiento'];

export const PHASES: Record<ProjectType, readonly string[]> = {
  dmaic: ['definir', 'medir', 'analizar', 'mejorar', 'controlar'],
  kaizen: ['preparar', 'evento', 'seguimiento'],
  a3: ['planificar', 'hacer', 'verificar', 'actuar'],
  '5s': ['clasificar', 'ordenar', 'limpiar', 'estandarizar', 'sostener'],
  seguimiento: [],
};

/** Campos de contexto propuestos al crear un proyecto (todos opcionales al medir). */
export const DEFAULT_FIELD_IDS = ['equipo', 'puesto', 'linea', 'producto', 'supervisor', 'operario'] as const;

export function defaultFields(labels: Record<(typeof DEFAULT_FIELD_IDS)[number], string>): ContextField[] {
  return DEFAULT_FIELD_IDS.map((id) => ({ id, label: labels[id] }));
}

/** Fase con la que empieza un proyecto: la primera de su tipo. */
export function firstPhase(type: ProjectType): string {
  return PHASES[type][0] ?? '';
}

/**
 * Identificador para un campo nuevo. Único de verdad (no «campo7»): si se
 * quita un campo y se añade otro, el nuevo no hereda lo apuntado en el viejo.
 */
export function newFieldId(fields: ContextField[]): string {
  let id: string;
  do id = `campo-${crypto.randomUUID().slice(0, 8)}`;
  while (fields.some((f) => f.id === id));
  return id;
}
