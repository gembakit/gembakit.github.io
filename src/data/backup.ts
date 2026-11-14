import type { GembaDB, Setting } from './db';
import type { SyncedRecord } from './record';

// Copia de seguridad (ficha del proyecto mínimo, punto 8): un archivo JSON con
// todo lo guardado en el teléfono. Restaurar JUNTA la copia con lo que hay:
// de cada registro se queda la versión más reciente (la misma regla que la
// sincronización, PLAN.md 4.1) y nunca se borra nada.

export const BACKUP_FORMAT = 'gemba-kit-copia';
export const BACKUP_VERSION = 1;

/** Tablas con registros sincronizables, en el orden en que se restauran. */
export const BACKUP_TABLES = ['projects', 'analyses', 'milestones', 'captures', 'datasets', 'actions'] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

/** Ajustes que son de este aparato y de su cuenta de Google: no viajan en la copia. */
const LOCAL_SETTINGS = [/^drive\./, /^lastBackup$/];

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  /** Versión de la app que la hizo. */
  app: string;
  createdAt: number;
  tables: Record<BackupTable, SyncedRecord[]>;
  settings: Setting[];
}

export async function makeBackup(db: GembaDB, app: string, at = Date.now()): Promise<Backup> {
  const tables = {} as Record<BackupTable, SyncedRecord[]>;
  for (const name of BACKUP_TABLES) tables[name] = (await db.table(name).toArray()) as SyncedRecord[];
  const settings = (await db.settings.toArray()).filter((s) => !LOCAL_SETTINGS.some((re) => re.test(s.key)));
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, app, createdAt: at, tables, settings };
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
  const settings = Array.isArray(b.settings) ? b.settings.filter((s): s is Setting => typeof s?.key === 'string') : [];
  return { format: BACKUP_FORMAT, version: b.version, app: String(b.app ?? ''), createdAt: b.createdAt, tables, settings };
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

export interface RestoreResult {
  /** Registros que no estaban en el teléfono. */
  added: number;
  /** Registros que estaban, pero la copia tenía una versión más reciente. */
  updated: number;
  /** Registros iguales o más recientes en el teléfono: no se tocan. */
  kept: number;
}

/** Junta la copia con lo que hay. Todo o nada: si algo falla, el teléfono queda como estaba. */
export async function restoreBackup(db: GembaDB, b: Backup): Promise<RestoreResult> {
  const result: RestoreResult = { added: 0, updated: 0, kept: 0 };
  const tables = [...BACKUP_TABLES.map((n) => db.table(n)), db.settings];
  await db.transaction('rw', tables, async () => {
    for (const name of BACKUP_TABLES) {
      const table = db.table<SyncedRecord, string>(name);
      const incoming = b.tables[name];
      const existing = await table.bulkGet(incoming.map((r) => r.id));
      const write: SyncedRecord[] = [];
      incoming.forEach((r, i) => {
        const mine = existing[i];
        if (!mine) {
          result.added++;
          write.push(r);
        } else if (r.updatedAt > mine.updatedAt) {
          result.updated++;
          write.push(r);
        } else result.kept++;
      });
      await table.bulkPut(write);
    }
    // Ajustes: solo los que faltan aquí (en un teléfono nuevo, todos). Los de este teléfono mandan.
    const settings = b.settings.filter((s) => !LOCAL_SETTINGS.some((re) => re.test(s.key)));
    const have = await db.settings.bulkGet(settings.map((s) => s.key));
    await db.settings.bulkAdd(settings.filter((_, i) => !have[i]));
  });
  return result;
}

/** Lo guardado ahora mismo en el teléfono, para la pantalla de datos. */
export async function localCounts(db: GembaDB): Promise<Omit<BackupSummary, 'createdAt'>> {
  const live = async (name: BackupTable) => db.table(name).where('deleted').equals(0).count();
  return { projects: await live('projects'), measurements: await live('analyses'), milestones: await live('milestones') };
}
