import { db as defaultDb, type Analysis, type GembaDB, type Headline, type Project, type ProjectType, type ContextField } from '../data/db';
import { create, listActive, restore, softDelete, update } from '../data/repo';
import { now } from '../data/record';
import { firstPhase } from './model';

// Operaciones de proyectos y mediciones. Todo pasa por data/repo.ts (reglas
// de sincronización: identificador, fecha de cambio, borrado con marca).

export interface NewProject {
  name: string;
  type: ProjectType;
  goal: string;
  fields: ContextField[];
}

export function createProject(p: NewProject, database: GembaDB = defaultDb): Promise<Project> {
  return create(database.projects, { name: p.name.trim(), type: p.type, goal: p.goal.trim(), phase: firstPhase(p.type), fields: p.fields });
}

export function listProjects(database: GembaDB = defaultDb): Promise<Project[]> {
  return listActive(database.projects);
}

export async function getProject(id: string, database: GembaDB = defaultDb): Promise<Project | null> {
  const p = await database.projects.get(id);
  return p && !p.deleted ? p : null;
}

export function updateProject(id: string, patch: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'deleted' | 'origin'>>, database: GembaDB = defaultDb) {
  return update(database.projects, id, patch);
}

export function deleteProject(id: string, database: GembaDB = defaultDb) {
  return softDelete(database.projects, id);
}

export function restoreProject(id: string, database: GembaDB = defaultDb) {
  return restore(database.projects, id);
}

// ── Mediciones ───────────────────────────────────────────────────────────

export interface NewMeasurement {
  projectId: string;
  toolId: string;
  name: string;
  phase: string;
  measuredAt: number;
  context: Record<string, string>;
  note: string;
  input: unknown;
  headline: Headline | null;
}

/** Quita los campos vacíos y los espacios sobrantes del contexto. */
function cleanContext(c: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(c)
      .map(([k, v]) => [k, v.trim()] as const)
      .filter(([, v]) => v !== ''),
  );
}

export function saveMeasurement(m: NewMeasurement, database: GembaDB = defaultDb): Promise<Analysis> {
  const at = now();
  return create(database.analyses, {
    projectId: m.projectId,
    toolId: m.toolId,
    name: m.name.trim(),
    phase: m.phase,
    measuredAt: m.measuredAt,
    context: cleanContext(m.context),
    note: m.note.trim(),
    frozen: 0,
    versions: [{ n: 1, at, input: m.input, headline: m.headline }],
  });
}

export async function getMeasurement(id: string, database: GembaDB = defaultDb): Promise<Analysis | null> {
  const a = await database.analyses.get(id);
  return a && !a.deleted ? a : null;
}

/** Mediciones vivas de un proyecto, de la más reciente a la más antigua (por fecha de medición). */
export async function listMeasurements(projectId: string, database: GembaDB = defaultDb): Promise<Analysis[]> {
  const all = await database.analyses.where('projectId').equals(projectId).toArray();
  return all.filter((a) => !a.deleted).sort((a, b) => b.measuredAt - a.measuredAt || b.createdAt - a.createdAt);
}

export class FrozenError extends Error {}

/**
 * Guarda datos nuevos como una versión más. Las anteriores quedan en el
 * historial. Una medición congelada no cambia.
 */
export async function addVersion(id: string, input: unknown, headline: Headline | null, database: GembaDB = defaultDb): Promise<number> {
  const a = await database.analyses.get(id);
  if (!a || a.deleted) throw new Error('Medición no encontrada');
  if (a.frozen) throw new FrozenError('Medición congelada');
  const n = a.versions.length + 1;
  await update(database.analyses, id, { versions: [...a.versions, { n, at: now(), input, headline }] });
  return n;
}

export function setFrozen(id: string, frozen: boolean, database: GembaDB = defaultDb) {
  return update(database.analyses, id, { frozen: frozen ? 1 : 0 });
}

export function updateMeasurementInfo(
  id: string,
  patch: Partial<Pick<Analysis, 'name' | 'phase' | 'measuredAt' | 'context' | 'note'>>,
  database: GembaDB = defaultDb,
) {
  return update(database.analyses, id, { ...patch, ...(patch.context ? { context: cleanContext(patch.context) } : {}) });
}

export function deleteMeasurement(id: string, database: GembaDB = defaultDb) {
  return softDelete(database.analyses, id);
}

export function restoreMeasurement(id: string, database: GembaDB = defaultDb) {
  return restore(database.analyses, id);
}

/** Última versión de una medición. */
export function latest(a: Analysis) {
  return a.versions[a.versions.length - 1]!;
}

/**
 * Valores ya usados en cada campo de contexto del proyecto, del más usado al
 * menos: se ofrecen al guardar para que «Day shift 1» se escriba siempre igual.
 */
export async function contextSuggestions(projectId: string, database: GembaDB = defaultDb): Promise<Record<string, string[]>> {
  const counts: Record<string, Map<string, number>> = {};
  for (const a of await listMeasurements(projectId, database)) {
    for (const [k, v] of Object.entries(a.context)) {
      const m = (counts[k] ??= new Map());
      m.set(v, (m.get(v) ?? 0) + 1);
    }
  }
  return Object.fromEntries(Object.entries(counts).map(([k, m]) => [k, [...m.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([v]) => v)]));
}

// ── Lo último usado (para no volver a elegirlo) ──────────────────────────

const LAST_PROJECT = 'lastProject';
const lastContextKey = (projectId: string) => `lastContext:${projectId}`;

export async function rememberLast(projectId: string, context: Record<string, string>, database: GembaDB = defaultDb): Promise<void> {
  await database.settings.bulkPut([
    { key: LAST_PROJECT, value: projectId },
    { key: lastContextKey(projectId), value: cleanContext(context) },
  ]);
}

export async function lastUsed(database: GembaDB = defaultDb): Promise<{ projectId: string | null; context: (projectId: string) => Promise<Record<string, string>> }> {
  const p = await database.settings.get(LAST_PROJECT);
  return {
    projectId: typeof p?.value === 'string' ? p.value : null,
    context: async (projectId) => {
      const c = await database.settings.get(lastContextKey(projectId));
      return c && typeof c.value === 'object' && c.value !== null ? (c.value as Record<string, string>) : {};
    },
  };
}
