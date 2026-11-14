import { downloadDriveText, driveQuoted, listDriveItems, trashDriveItem, uploadDriveFile, type DriveItem } from './api';

type Fetch = typeof fetch;

// Copias de seguridad en `Gemba Kit / Copias de seguridad`: se guardan las 10
// últimas; las más antiguas van a la papelera de Drive (recuperables 30 días).

export const KEEP_BACKUPS = 10;
const JSON_MIME = 'application/json';

/** Copias de la carpeta, de la más reciente a la más antigua. */
export function listDriveBackups(token: string, folderId: string, f: Fetch = fetch): Promise<DriveItem[]> {
  return listDriveItems(token, `${driveQuoted(folderId)} in parents and mimeType = '${JSON_MIME}' and trashed = false`, 'createdTime desc', 100, f);
}

/** Sube la copia y deja solo las `KEEP_BACKUPS` más recientes. */
export async function saveBackupToDrive(token: string, folderId: string, name: string, content: string, f: Fetch = fetch): Promise<DriveItem> {
  const saved = await uploadDriveFile(token, name, JSON_MIME, content, folderId, f);
  const all = await listDriveBackups(token, folderId, f);
  for (const old of all.slice(KEEP_BACKUPS)) await trashDriveItem(token, old.id, f);
  return saved;
}

export function loadDriveBackup(token: string, id: string, f: Fetch = fetch): Promise<string> {
  return downloadDriveText(token, id, f);
}
