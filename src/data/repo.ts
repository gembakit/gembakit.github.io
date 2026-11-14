import type { EntityTable } from 'dexie';
import type { GembaDB } from './db';
import { checkpoint, historyTables } from './history';
import { newRecord, now, type Origin, type SyncedRecord } from './record';

// Única puerta para escribir registros: aplica las reglas de la sección 4.1
// del plan (identificador, fecha de cambio, borrado con marca) y, antes de
// cambiar un proyecto, guarda su versión del último día (data/history.ts).
// Las herramientas no usan Dexie directamente.

type Data<T extends SyncedRecord> = Omit<T, keyof SyncedRecord>;

/** Proyecto al que pertenece un registro: él mismo si es un proyecto. */
async function projectOf<T extends SyncedRecord>(table: EntityTable<T, 'id'>, id: string): Promise<string | null> {
  if (table.name === 'projects') return id;
  const r = (await table.get(id as never)) as { projectId?: unknown } | undefined;
  return typeof r?.projectId === 'string' ? r.projectId : null;
}

/** Hace `write` dentro de una transacción, después de guardar la versión del proyecto si toca. */
async function withCheckpoint<R>(table: EntityTable<SyncedRecord, 'id'>, projectId: () => Promise<string | null> | string | null, write: () => Promise<R>): Promise<R> {
  const db = table.db as GembaDB;
  return db.transaction('rw', historyTables(db), async () => {
    const pid = await projectId();
    if (pid) await checkpoint(db, pid);
    return write();
  });
}

const asSynced = <T extends SyncedRecord>(table: EntityTable<T, 'id'>) => table as unknown as EntityTable<SyncedRecord, 'id'>;

export async function create<T extends SyncedRecord>(table: EntityTable<T, 'id'>, data: Data<T>, origin: Origin = 'app'): Promise<T> {
  const rec = newRecord(data, origin) as unknown as T;
  const projectId = (data as { projectId?: unknown }).projectId;
  await withCheckpoint(
    asSynced(table),
    () => (typeof projectId === 'string' ? projectId : null),
    () => table.add(rec as never),
  );
  return rec;
}

export async function update<T extends SyncedRecord>(table: EntityTable<T, 'id'>, id: string, patch: Partial<Data<T>>): Promise<void> {
  await withCheckpoint(
    asSynced(table),
    () => projectOf(table, id),
    () => table.update(id as never, { ...patch, updatedAt: now() } as never),
  );
}

/** Borra con marca: el registro sigue ahí para "deshacer" y para propagar el borrado. */
export async function softDelete<T extends SyncedRecord>(table: EntityTable<T, 'id'>, id: string): Promise<void> {
  await withCheckpoint(
    asSynced(table),
    () => projectOf(table, id),
    () => table.update(id as never, { deleted: 1, updatedAt: now() } as never),
  );
}

export async function restore<T extends SyncedRecord>(table: EntityTable<T, 'id'>, id: string): Promise<void> {
  await withCheckpoint(
    asSynced(table),
    () => projectOf(table, id),
    () => table.update(id as never, { deleted: 0, updatedAt: now() } as never),
  );
}

/** Registros vivos (no borrados), del más reciente al más antiguo. */
export async function listActive<T extends SyncedRecord>(table: EntityTable<T, 'id'>): Promise<T[]> {
  const all = await table.where('deleted').equals(0).toArray();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}
