import { CHILD_TABLES, type ChildRecord, type ChildrenMap, type ChildTable, type GembaDB, type ProjectState, type ProjectVersion, type VersionReason } from './db';
import { newId, now } from './record';

// Historial de versiones de cada proyecto, como hacen AutoCAD (.bak), Revit
// (proyecto.0001.rvt…) o Google Docs:
// - Se guardan solas: al empezar a cambiar un proyecto en un día nuevo, se
//   guarda cómo quedó el último día que se tocó.
// - Puntos de control: los guarda el usuario a propósito, con nombre («Fin de
//   Medir»). Van aparte de las automáticas y la app nunca los borra sola: al
//   llegar al tope pregunta cuál borrar (pedido por el dueño, 2026-11-15).
// - Volver a una versión REEMPLAZA el proyecto, pero antes guarda cómo estaba:
//   nunca se pierde nada y se puede deshacer.
// - «Abrir como copia» crea un proyecto aparte con esa versión.

/** Versiones automáticas que se quedan por proyecto (diarias, antes de volver atrás, de una copia); las más antiguas se borran. */
export const KEEP_AUTO = 10;
/** Puntos de control por proyecto. Nunca se borran solos. */
export const MAX_CHECKPOINTS = 10;

/** Punto de control: versión guardada a propósito por el usuario. */
export const isCheckpoint = (v: ProjectVersion) => v.reason === 'manual';

/** Un proyecto ahora mismo y la fecha de su último cambio (también de lo borrado). */
export interface ProjectNow {
  state: ProjectState;
  changedAt: number;
}

/** Tablas que toca cualquier cambio en el historial (para las transacciones). */
export function historyTables(db: GembaDB) {
  return [db.projects, ...CHILD_TABLES.map((n) => db.table(n)), db.projectVersions];
}

const table = (db: GembaDB, name: ChildTable) => db.table<ChildRecord, string>(name);

export async function projectNow(db: GembaDB, projectId: string): Promise<ProjectNow | null> {
  const project = await db.projects.get(projectId);
  if (!project) return null;
  let changedAt = project.updatedAt;
  const children = {} as ChildrenMap;
  for (const name of CHILD_TABLES) {
    const all = await table(db, name).where('projectId').equals(projectId).toArray();
    for (const r of all) changedAt = Math.max(changedAt, r.updatedAt);
    children[name] = all.filter((r) => !r.deleted);
  }
  return { state: { project, children: children as ProjectState['children'] }, changedAt };
}

/** Mismo día del calendario del teléfono. */
export function sameDay(a: number, b: number): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/** Versiones de un proyecto, de la más reciente a la más antigua. */
export async function listVersions(db: GembaDB, projectId: string): Promise<ProjectVersion[]> {
  const all = await db.projectVersions.where('projectId').equals(projectId).toArray();
  return all.sort((a, b) => b.at - a.at || b.savedAt - a.savedAt);
}

async function versionAt(db: GembaDB, projectId: string, at: number): Promise<ProjectVersion | undefined> {
  return db.projectVersions
    .where('projectId')
    .equals(projectId)
    .filter((v) => v.at === at)
    .first();
}

/** Guarda una versión, salvo que ya haya una del mismo momento. Devuelve la versión y si es nueva. */
export async function keepVersion(db: GembaDB, cur: ProjectNow, reason: VersionReason, copyAt?: number): Promise<{ version: ProjectVersion; fresh: boolean }> {
  const projectId = cur.state.project.id;
  const existing = await versionAt(db, projectId, cur.changedAt);
  if (existing) return { version: existing, fresh: false };
  const version: ProjectVersion = { id: newId(), projectId, at: cur.changedAt, savedAt: Date.now(), reason, ...(copyAt !== undefined ? { copyAt } : {}), state: cur.state };
  await db.projectVersions.add(version);
  await pruneVersions(db, projectId);
  return { version, fresh: true };
}

/** Deja las KEEP_AUTO automáticas más recientes. Los puntos de control no se tocan. */
export async function pruneVersions(db: GembaDB, projectId: string): Promise<void> {
  const old = (await listVersions(db, projectId)).filter((v) => !isCheckpoint(v)).slice(KEEP_AUTO);
  if (old.length) await db.projectVersions.bulkDelete(old.map((v) => v.id));
}

/**
 * Antes de cambiar un proyecto: si su último cambio fue otro día, guarda cómo
 * quedó. Así hay una versión por cada día en que se trabajó en él.
 * Va dentro de la misma transacción que el cambio (data/repo.ts).
 */
export async function checkpoint(db: GembaDB, projectId: string, today = Date.now()): Promise<void> {
  const cur = await projectNow(db, projectId);
  if (!cur || cur.state.project.deleted || sameDay(cur.changedAt, today)) return;
  await keepVersion(db, cur, 'auto');
}

export type CheckpointResult =
  | { k: 'saved'; version: ProjectVersion }
  /** Ya hay un punto de control igual a como está ahora el proyecto. */
  | { k: 'same'; version: ProjectVersion }
  /** Ya hay MAX_CHECKPOINTS: hay que elegir uno para borrar (`replace`). */
  | { k: 'full'; checkpoints: ProjectVersion[] };

/**
 * «Guardar punto de control» con su nombre. Si el proyecto está igual que en
 * una versión automática, esa versión pasa a ser el punto de control. Con
 * `replace`, borra antes ese punto de control para dejar sitio.
 */
export async function saveCheckpoint(db: GembaDB, projectId: string, label: string, replace?: string): Promise<CheckpointResult> {
  return db.transaction('rw', historyTables(db), async () => {
    const cur = await projectNow(db, projectId);
    if (!cur) throw new Error('Proyecto no encontrado');
    const existing = await versionAt(db, projectId, cur.changedAt);
    if (existing && isCheckpoint(existing)) return { k: 'same', version: existing };
    let checkpoints = (await listVersions(db, projectId)).filter(isCheckpoint);
    const gone = replace ? checkpoints.find((v) => v.id === replace) : undefined;
    if (gone) {
      await db.projectVersions.delete(gone.id);
      checkpoints = checkpoints.filter((v) => v !== gone);
    }
    if (checkpoints.length >= MAX_CHECKPOINTS) return { k: 'full', checkpoints };
    const name = label.trim();
    if (existing) {
      const version: ProjectVersion = { ...existing, reason: 'manual', label: name, savedAt: Date.now() };
      delete version.copyAt;
      await db.projectVersions.put(version);
      return { k: 'saved', version };
    }
    const version: ProjectVersion = { id: newId(), projectId, at: cur.changedAt, savedAt: Date.now(), reason: 'manual', label: name, state: cur.state };
    await db.projectVersions.add(version);
    return { k: 'saved', version };
  });
}

/** Cambia el nombre de un punto de control. */
export async function renameCheckpoint(db: GembaDB, versionId: string, label: string): Promise<void> {
  await db.projectVersions.update(versionId, { label: label.trim() });
}

/** Borra una versión; devuelve lo borrado para poder deshacer con `putVersion`. */
export async function deleteVersion(db: GembaDB, versionId: string): Promise<ProjectVersion | undefined> {
  return db.transaction('rw', db.projectVersions, async () => {
    const v = await db.projectVersions.get(versionId);
    if (v) await db.projectVersions.delete(versionId);
    return v;
  });
}

export async function putVersion(db: GembaDB, v: ProjectVersion): Promise<void> {
  await db.projectVersions.put(v);
}

/**
 * Deja el proyecto como dice `state`: lo de la versión vuelve (también lo que
 * se había borrado) y lo que se añadió después queda borrado con marca.
 * Todo queda como el cambio más reciente, para que nada lo pise al sincronizar.
 */
export async function applyState(db: GembaDB, state: ProjectState): Promise<void> {
  const projectId = state.project.id;
  await db.projects.put({ ...state.project, deleted: 0, updatedAt: now() });
  for (const name of CHILD_TABLES) {
    const want = new Map(state.children[name].map((r) => [r.id, r]));
    const write: ChildRecord[] = [...want.values()].map((r) => ({ ...r, deleted: 0, updatedAt: now() }));
    for (const r of await table(db, name).where('projectId').equals(projectId).toArray()) {
      if (!want.has(r.id) && !r.deleted) write.push({ ...r, deleted: 1, updatedAt: now() });
    }
    await table(db, name).bulkPut(write);
  }
}

/**
 * «Volver a esta versión». Antes guarda cómo está ahora; devuelve esa versión
 * para poder deshacer.
 */
export async function restoreVersion(db: GembaDB, versionId: string): Promise<ProjectVersion | null> {
  return db.transaction('rw', historyTables(db), async () => {
    const v = await db.projectVersions.get(versionId);
    if (!v) throw new Error('Versión no encontrada');
    const cur = await projectNow(db, v.projectId);
    const before = cur ? (await keepVersion(db, cur, 'before-restore')).version : null;
    await applyState(db, v.state);
    return before;
  });
}

/** «Abrir como copia»: un proyecto nuevo, aparte, con lo que había en esa versión. Devuelve su id. */
export async function copyVersion(db: GembaDB, versionId: string, name: string): Promise<string> {
  return db.transaction('rw', historyTables(db), async () => {
    const v = await db.projectVersions.get(versionId);
    if (!v) throw new Error('Versión no encontrada');
    const projectId = newId();
    const t = now();
    await db.projects.add({ ...v.state.project, id: projectId, name, createdAt: t, updatedAt: t, deleted: 0, origin: 'app' });
    for (const tn of CHILD_TABLES) {
      const copies = v.state.children[tn].map((r) => {
        const at = now();
        return { ...r, id: newId(), projectId, createdAt: at, updatedAt: at, deleted: 0 as const, origin: 'app' as const };
      });
      await table(db, tn).bulkAdd(copies);
    }
    return projectId;
  });
}
