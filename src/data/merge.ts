import type { GembaDB, ProjectVersion } from './db';
import type { SyncedRecord } from './record';
import { pruneVersions } from './history';

// Sincronización entre aparatos (PLAN.md, 4.4): una «foto» de todos los
// registros, que se combina registro a registro. Gana el cambio más reciente
// (un borrado es un cambio más: el registro sigue ahí con la marca). Combinar
// es conmutativo, asociativo e idempotente: da lo mismo el orden y cuántas
// veces se repita (lo comprueban las pruebas con órdenes al azar). El
// historial de versiones de los proyectos se une sin repetir.

export const SYNC_FORMAT = 'gemba-kit-sync';
export const SYNC_TABLES = ['projects', 'analyses', 'milestones', 'captures', 'datasets', 'actions', 'recipes'] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

export interface Snapshot {
  format: typeof SYNC_FORMAT;
  v: 1;
  tables: Record<SyncTable, SyncedRecord[]>;
  versions: ProjectVersion[];
}

export const emptySnapshot = (): Snapshot => ({
  format: SYNC_FORMAT,
  v: 1,
  tables: Object.fromEntries(SYNC_TABLES.map((t) => [t, []])) as unknown as Record<SyncTable, SyncedRecord[]>,
  versions: [],
});

/** Orden estable para que dos aparatos escriban lo mismo. */
const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** El más reciente; a igualdad de fecha, el de texto mayor (para que el resultado no dependa del orden). */
export function newer<T extends SyncedRecord>(a: T, b: T): T {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  const ja = JSON.stringify(a);
  const jb = JSON.stringify(b);
  return ja >= jb ? a : b;
}

function mergeList<T extends SyncedRecord>(a: readonly T[], b: readonly T[]): T[] {
  const out = new Map<string, T>();
  for (const r of [...a, ...b]) {
    const prev = out.get(r.id);
    out.set(r.id, prev ? newer(prev, r) : r);
  }
  return [...out.values()].sort(byId);
}

export function mergeSnapshots(a: Snapshot, b: Snapshot): Snapshot {
  const tables = {} as Record<SyncTable, SyncedRecord[]>;
  for (const t of SYNC_TABLES) tables[t] = mergeList(a.tables[t] ?? [], b.tables[t] ?? []);
  const versions = new Map<string, ProjectVersion>();
  for (const v of [...a.versions, ...b.versions]) if (!versions.has(v.id)) versions.set(v.id, v);
  return { format: SYNC_FORMAT, v: 1, tables, versions: [...versions.values()].sort(byId) };
}

/** Lee una foto guardada; null si no lo es. */
export function readSnapshot(text: string): Snapshot | null {
  try {
    const x = JSON.parse(text) as Partial<Snapshot>;
    if (x.format !== SYNC_FORMAT || x.v !== 1 || typeof x.tables !== 'object' || !x.tables) return null;
    const s = emptySnapshot();
    for (const t of SYNC_TABLES) {
      const list = (x.tables as Record<string, unknown>)[t];
      s.tables[t] = Array.isArray(list) ? list.filter((r): r is SyncedRecord => typeof r?.id === 'string' && typeof r?.updatedAt === 'number') : [];
    }
    s.versions = Array.isArray(x.versions) ? x.versions.filter((v): v is ProjectVersion => typeof v?.id === 'string' && typeof v?.projectId === 'string') : [];
    return s;
  } catch {
    return null;
  }
}

/** Todo lo de este aparato (con lo borrado, que también viaja). */
export async function localSnapshot(db: GembaDB): Promise<Snapshot> {
  const s = emptySnapshot();
  for (const t of SYNC_TABLES) s.tables[t] = ((await db.table(t).toArray()) as SyncedRecord[]).sort(byId);
  s.versions = (await db.projectVersions.toArray()).sort(byId);
  return s;
}

/**
 * Deja la base local como la foto combinada: escribe solo lo que cambia, todo
 * en una transacción (si algo falla, la base queda como estaba). Devuelve
 * cuántos registros cambiaron.
 */
export async function applySnapshot(db: GembaDB, merged: Snapshot): Promise<number> {
  const tables = [...SYNC_TABLES.map((t) => db.table(t)), db.projectVersions];
  return db.transaction('rw', tables, async () => {
    let changed = 0;
    for (const t of SYNC_TABLES) {
      const table = db.table<SyncedRecord, string>(t);
      const list = merged.tables[t];
      const mine = await table.bulkGet(list.map((r) => r.id));
      const put = list.filter((r, i) => !mine[i] || JSON.stringify(mine[i]) !== JSON.stringify(r));
      if (put.length) await table.bulkPut(put);
      changed += put.length;
    }
    const have = await db.projectVersions.bulkGet(merged.versions.map((v) => v.id));
    const add = merged.versions.filter((_, i) => !have[i]);
    if (add.length) {
      await db.projectVersions.bulkAdd(add);
      for (const id of new Set(add.map((v) => v.projectId))) await pruneVersions(db, id);
    }
    return changed + add.length;
  });
}
