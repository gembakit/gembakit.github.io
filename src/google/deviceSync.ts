import { db as defaultDb, type GembaDB } from '../data/db';
import { applySnapshot, localSnapshot, mergeSnapshots, readSnapshot } from '../data/merge';
import { loadAppData, saveAppData } from './api';

type Fetch = typeof fetch;

// Sincronización entre los aparatos del usuario (PLAN.md, 4.4) por la carpeta
// oculta de la app en su Drive: se baja la foto de la nube, se combina con lo
// de este aparato (registro a registro, gana el cambio más reciente), se
// aplica aquí y se sube el resultado si cambió. Sin servidor propio.

export const SYNC_FILE = 'gemba-sync.json';
const LAST = 'deviceSync.last';

export interface DeviceSyncResult {
  /** Registros que cambiaron en este aparato. */
  received: number;
  /** Se subió una foto nueva a la nube. */
  sent: boolean;
  at: number;
}

export async function syncDevices(token: string, f: Fetch = fetch, database: GembaDB = defaultDb): Promise<DeviceSyncResult> {
  const text = await loadAppData(token, f, SYNC_FILE);
  const remote = text ? readSnapshot(text) : null;
  const local = await localSnapshot(database);
  const merged = remote ? mergeSnapshots(local, remote) : local;
  const received = await applySnapshot(database, merged);
  const out = JSON.stringify(merged);
  const sent = out !== text;
  if (sent) await saveAppData(token, out, f, SYNC_FILE);
  const at = Date.now();
  await database.settings.put({ key: LAST, value: at });
  return { received, sent, at };
}

/** Cuándo se sincronizó por última vez este aparato (ms), o null. */
export async function lastDeviceSync(database: GembaDB = defaultDb): Promise<number | null> {
  const s = await database.settings.get(LAST);
  return typeof s?.value === 'number' ? s.value : null;
}
