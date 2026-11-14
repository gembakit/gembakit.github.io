import { createDriveFile, driveQuoted, getDriveItem, listDriveItems, MIME } from './api';

type Fetch = typeof fetch;

// Carpetas de la app en Drive, ordenadas desde el principio (ficha del
// proyecto mínimo, punto 6):
//
//   Mi unidad / Gemba Kit / Proyectos / …
//                         / Sueltas
//                         / Copias de seguridad
//
// Cada carpeta se recuerda por su identificador: si el usuario la mueve o la
// renombra en Drive, la app la sigue encontrando. Si la borra, se crea otra.

/** Dónde se recuerda el identificador de cada carpeta (ajustes de este aparato, no viajan en la copia). */
export interface FolderMemory {
  get: (key: string) => Promise<string | null>;
  set: (key: string, id: string) => Promise<void>;
}

export const FOLDER_KEYS = { root: 'drive.folder.root', backups: 'drive.folder.backups' } as const;

/**
 * Carpeta `name` dentro de `parent` ('root' = Mi unidad): la recordada si
 * sigue viva; si no, la que tenga ese nombre allí (creada por la app); si no,
 * una nueva.
 */
export async function ensureFolder(token: string, key: string, name: string, parent: string, memory: FolderMemory, f: Fetch = fetch): Promise<string> {
  const known = await memory.get(key);
  if (known) {
    const item = await getDriveItem(token, known, f);
    if (item && !item.trashed) return item.id;
  }
  const found = await listDriveItems(
    token,
    `name = ${driveQuoted(name)} and mimeType = '${MIME.folder}' and ${driveQuoted(parent)} in parents and trashed = false`,
    'createdTime',
    1,
    f,
  );
  const id = found[0]?.id ?? (await createDriveFile(token, name, MIME.folder, parent === 'root' ? undefined : parent, f)).id;
  await memory.set(key, id);
  return id;
}

/** `Gemba Kit / Copias de seguridad`, creando lo que falte. */
export async function backupFolder(token: string, names: { root: string; backups: string }, memory: FolderMemory, f: Fetch = fetch): Promise<string> {
  const root = await ensureFolder(token, FOLDER_KEYS.root, names.root, 'root', memory, f);
  return ensureFolder(token, FOLDER_KEYS.backups, names.backups, root, memory, f);
}

export const folderUrl = (id: string) => `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
