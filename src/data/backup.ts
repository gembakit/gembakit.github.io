import { CHILD_TABLES, type ChildRecord, type ChildrenMap, type GembaDB, type Project, type ProjectState, type ProjectVersion, type Recipe, type Setting } from './db';
import { applyState, historyTables, keepVersion, projectNow, pruneVersions, type ProjectNow } from './history';
import type { SyncedRecord } from './record';

// Copia de seguridad (ficha del proyecto mínimo, punto 8): un archivo JSON con
// todo lo guardado en el teléfono, historial de versiones incluido.
//
// Restaurar trabaja proyecto por proyecto y nunca pierde nada:
// - el que no está en el teléfono, se añade;
// - el que se borró en el teléfono, vuelve como estaba en la copia;
// - el que está y la copia es más antigua, la copia pasa a su historial;
// - el que está y la copia es más reciente, la copia pasa a ser la actual y
//   lo del teléfono queda en su historial.
// Las recetas (Ajustes › Mis líneas) van aparte: de cada una se queda la
// más reciente, la del teléfono o la de la copia. Las copias sin recetas
// (anteriores al 2026-11-21) se leen igual.

export const BACKUP_FORMAT = 'gemba-kit-copia';
/** 2: lleva el historial de versiones de los proyectos. */
export const BACKUP_VERSION = 2;

/** Tablas con registros sincronizables, en el orden en que se restauran. */
export const BACKUP_TABLES = ['projects', ...CHILD_TABLES] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

/** Ajustes que son de este aparato y de su cuenta de Google: no viajan en la copia. */
const LOCAL_SETTINGS = [/^drive\./, /^lastBackup$/, /^deviceSync\./];

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  /** Versión de la app que la hizo. */
  app: string;
  createdAt: number;
  tables: Record<BackupTable, SyncedRecord[]>;
  history: ProjectVersion[];
  settings: Setting[];
  recipes: Recipe[];
}

export async function makeBackup(db: GembaDB, app: string, at = Date.now()): Promise<Backup> {
  const tables = {} as Record<BackupTable, SyncedRecord[]>;
  for (const name of BACKUP_TABLES) tables[name] = (await db.table(name).toArray()) as SyncedRecord[];
  const history = await db.projectVersions.toArray();
  const settings = (await db.settings.toArray()).filter((s) => !LOCAL_SETTINGS.some((re) => re.test(s.key)));
  const recipes = await db.recipes.toArray();
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, app, createdAt: at, tables, history, settings, recipes };
}

/** «gemba-kit-copia-2026-11-14-1830.json», con la hora del teléfono. */
export function backupFileName(at: number): string {
  const d = new Date(at);
  const p = (n: number) => String(n).padStart(2, '0');
  return `gemba-kit-copia-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

export class BackupError extends Error {
  constructor(public code: 'not-json' | 'not-backup' | 'newer' | 'damaged') {
    super(code);
  }
}

const isRecord = (r: unknown): r is SyncedRecord =>
  typeof r === 'object' && r !== null && typeof (r as SyncedRecord).id === 'string' && typeof (r as SyncedRecord).updatedAt === 'number';

const isVersion = (v: unknown): v is ProjectVersion => {
  const x = v as Partial<ProjectVersion> | null;
  return (
    typeof x === 'object' &&
    x !== null &&
    typeof x.id === 'string' &&
    typeof x.projectId === 'string' &&
    typeof x.at === 'number' &&
    isRecord(x.state?.project) &&
    typeof x.state.children === 'object' &&
    x.state.children !== null
  );
};

/** Lee y comprueba un archivo de copia. Lanza BackupError si no lo es o está dañado. */
export function readBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('not-json');
  }
  const b = raw as Partial<Backup>;
  if (typeof b !== 'object' || b === null || b.format !== BACKUP_FORMAT) throw new BackupError('not-backup');
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) throw new BackupError('newer');
  if (typeof b.tables !== 'object' || b.tables === null || typeof b.createdAt !== 'number') throw new BackupError('damaged');
  const tables = {} as Record<BackupTable, SyncedRecord[]>;
  for (const name of BACKUP_TABLES) {
    const list = (b.tables as Partial<Record<BackupTable, unknown>>)[name] ?? [];
    if (!Array.isArray(list) || !list.every(isRecord)) throw new BackupError('damaged');
    tables[name] = list;
  }
  // Las copias de la versión 1 no traen historial.
  const history = Array.isArray(b.history) ? b.history.filter(isVersion) : [];
  // Versiones con tablas que no traían: se completan vacías.
  for (const v of history) for (const n of CHILD_TABLES) if (!Array.isArray(v.state.children[n])) v.state.children[n] = [];
  const settings = Array.isArray(b.settings) ? b.settings.filter((s): s is Setting => typeof s?.key === 'string') : [];
  const recipes = Array.isArray(b.recipes) ? b.recipes.filter((r): r is Recipe => isRecord(r) && typeof r.name === 'string' && Array.isArray(r.stations)) : [];
  return { format: BACKUP_FORMAT, version: b.version, app: String(b.app ?? ''), createdAt: b.createdAt, tables, history, settings, recipes };
}

export interface BackupSummary {
  createdAt: number;
  projects: number;
  measurements: number;
  milestones: number;
}

/** Lo que hay en la copia (sin contar lo borrado). */
export function summarize(b: Backup): BackupSummary {
  const live = (name: BackupTable) => b.tables[name].filter((r) => !r.deleted).length;
  return { createdAt: b.createdAt, projects: live('projects'), measurements: live('analyses'), milestones: live('milestones') };
}

/** Un proyecto de la copia tal como estaba en ella. */
function stateInCopy(b: Backup, project: Project): ProjectNow {
  let changedAt = project.updatedAt;
  const children = {} as ChildrenMap;
  for (const name of CHILD_TABLES) {
    const mine = (b.tables[name] as ChildRecord[]).filter((r) => r.projectId === project.id);
    for (const r of mine) changedAt = Math.max(changedAt, r.updatedAt);
    children[name] = mine.filter((r) => !r.deleted);
  }
  return { state: { project, children: children as ProjectState['children'] }, changedAt };
}

/**
 * Qué pasará con cada proyecto de la copia:
 * - add: no está en el teléfono, se añade.
 * - revive: se borró en el teléfono, vuelve como estaba en la copia.
 * - update: la copia es más reciente, pasa a ser la actual (lo del teléfono queda en el historial).
 * - history: la copia es más antigua, queda en su historial.
 * - same: el teléfono ya lo tiene igual, o esa versión ya está en su historial.
 */
export type RestoreAction = 'add' | 'revive' | 'update' | 'history' | 'same';
export interface RestorePlanItem {
  id: string;
  name: string;
  action: RestoreAction;
}

async function decide(db: GembaDB, copy: ProjectNow): Promise<RestoreAction> {
  const local = await projectNow(db, copy.state.project.id);
  if (!local) return 'add';
  if (local.state.project.deleted) return 'revive';
  if (copy.changedAt === local.changedAt) return 'same';
  if (copy.changedAt > local.changedAt) return 'update';
  const known = await db.projectVersions
    .where('projectId')
    .equals(local.state.project.id)
    .filter((v) => v.at === copy.changedAt)
    .first();
  return known ? 'same' : 'history';
}

const liveProjects = (b: Backup) => (b.tables.projects as Project[]).filter((p) => !p.deleted);

/** Lo que haría restaurar la copia, sin tocar nada (para enseñarlo antes). */
export async function planRestore(db: GembaDB, b: Backup): Promise<RestorePlanItem[]> {
  const plan: RestorePlanItem[] = [];
  for (const p of liveProjects(b)) plan.push({ id: p.id, name: p.name, action: await decide(db, stateInCopy(b, p)) });
  return plan;
}

/** Restaura la copia. Todo o nada: si algo falla, el teléfono queda como estaba. */
export async function restoreBackup(db: GembaDB, b: Backup): Promise<RestorePlanItem[]> {
  return db.transaction('rw', [...historyTables(db), db.settings, db.recipes], async () => {
    const plan: RestorePlanItem[] = [];
    for (const p of liveProjects(b)) {
      const copy = stateInCopy(b, p);
      const action = await decide(db, copy);
      plan.push({ id: p.id, name: p.name, action });
      if (action === 'add') {
        await db.projects.add(p);
        for (const name of CHILD_TABLES) await db.table<ChildRecord, string>(name).bulkPut(copy.state.children[name]);
      } else if (action === 'revive' || action === 'update') {
        const local = await projectNow(db, p.id);
        if (local) await keepVersion(db, local, 'before-restore');
        await applyState(db, copy.state);
      } else if (action === 'history') {
        await keepVersion(db, copy, 'backup', b.createdAt);
      }
    }

    // El historial de la copia se suma al del teléfono (sin repetir versiones).
    const touched = new Set<string>();
    for (const v of b.history) {
      if (!(await db.projects.get(v.projectId))) continue;
      if (await db.projectVersions.get(v.id)) continue;
      const same = await db.projectVersions
        .where('projectId')
        .equals(v.projectId)
        .filter((x) => x.at === v.at)
        .first();
      if (same) continue;
      await db.projectVersions.add(v);
      touched.add(v.projectId);
    }
    for (const id of touched) await pruneVersions(db, id);

    // Ajustes: solo los que faltan aquí (en un teléfono nuevo, todos). Los de este teléfono mandan.
    const settings = b.settings.filter((s) => !LOCAL_SETTINGS.some((re) => re.test(s.key)));
    const have = await db.settings.bulkGet(settings.map((s) => s.key));
    await db.settings.bulkAdd(settings.filter((_, i) => !have[i]));

    // Recetas: de cada una, la más reciente.
    const mine = await db.recipes.bulkGet(b.recipes.map((r) => r.id));
    await db.recipes.bulkPut(b.recipes.filter((r, i) => !mine[i] || r.updatedAt > mine[i]!.updatedAt));
    return plan;
  });
}

/** Lo guardado ahora mismo en el teléfono, para la pantalla de datos. */
export async function localCounts(db: GembaDB): Promise<Omit<BackupSummary, 'createdAt'>> {
  const live = async (name: BackupTable) => db.table(name).where('deleted').equals(0).count();
  return { projects: await live('projects'), measurements: await live('analyses'), milestones: await live('milestones') };
}
