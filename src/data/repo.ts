import type { EntityTable } from 'dexie';
import { newRecord, now, type Origin, type SyncedRecord } from './record';

// Única puerta para escribir registros: aplica las reglas de la sección 4.1
// del plan (identificador, fecha de cambio, borrado con marca).
// Las herramientas no usan Dexie directamente.

type Data<T extends SyncedRecord> = Omit<T, keyof SyncedRecord>;

export async function create<T extends SyncedRecord>(table: EntityTable<T, 'id'>, data: Data<T>, origin: Origin = 'app'): Promise<T> {
  const rec = newRecord(data, origin) as unknown as T;
  await table.add(rec as never);
  return rec;
}

export async function update<T extends SyncedRecord>(table: EntityTable<T, 'id'>, id: string, patch: Partial<Data<T>>): Promise<void> {
  await table.update(id as never, { ...patch, updatedAt: now() } as never);
}

/** Borra con marca: el registro sigue ahí para "deshacer" y para propagar el borrado. */
export async function softDelete<T extends SyncedRecord>(table: EntityTable<T, 'id'>, id: string): Promise<void> {
  await table.update(id as never, { deleted: 1, updatedAt: now() } as never);
}

export async function restore<T extends SyncedRecord>(table: EntityTable<T, 'id'>, id: string): Promise<void> {
  await table.update(id as never, { deleted: 0, updatedAt: now() } as never);
}

/** Registros vivos (no borrados), del más reciente al más antiguo. */
export async function listActive<T extends SyncedRecord>(table: EntityTable<T, 'id'>): Promise<T[]> {
  const all = await table.where('deleted').equals(0).toArray();
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}
