import { db } from '../data/db';
import { ensureFolder, FOLDER_KEYS, type FolderMemory } from './driveFolders';
import { folderMemory } from './folderMemory';
import { revokeToken } from './gis';
import { currentToken, forgetToken, setAccount } from './session';

type Fetch = typeof fetch;

// La cuenta de Google conectada en este aparato y sus carpetas en Drive.
// Las carpetas se recuerdan por identificador (driveFolders.ts); son de una
// cuenta concreta, así que al cambiar de cuenta se olvidan y se buscan o
// crean en el Drive de la nueva.

/** De qué cuenta son las carpetas recordadas (ajuste de este aparato). */
const OWNER_KEY = 'drive.owner';
const WELCOME_KEY = 'gk.welcome';

export interface FolderNames {
  root: string;
  projects: string;
  loose: string;
  backups: string;
}

/** `Gemba Kit` con `Proyectos`, `Sueltas` y `Copias de seguridad` dentro, creando lo que falte. Devuelve la carpeta principal. */
export async function ensureAppFolders(token: string, names: FolderNames, memory: FolderMemory, f: Fetch = fetch): Promise<string> {
  const root = await ensureFolder(token, FOLDER_KEYS.root, names.root, 'root', memory, f);
  await ensureFolder(token, FOLDER_KEYS.projects, names.projects, root, memory, f);
  await ensureFolder(token, FOLDER_KEYS.loose, names.loose, root, memory, f);
  await ensureFolder(token, FOLDER_KEYS.backups, names.backups, root, memory, f);
  return root;
}

async function forgetFolders(): Promise<void> {
  await db.settings.bulkDelete([...Object.values(FOLDER_KEYS), OWNER_KEY]);
}

/** Guarda la cuenta recién conectada; si es otra que la de las carpetas recordadas, las olvida. */
export async function adoptAccount(email: string | null): Promise<void> {
  const owner = (await db.settings.get(OWNER_KEY))?.value;
  if (email && typeof owner === 'string' && owner !== email) await forgetFolders();
  if (email) await db.settings.put({ key: OWNER_KEY, value: email });
  setAccount(email);
  markWelcomeDone();
}

/** Desconecta: retira el permiso en Google y olvida cuenta y carpetas en este aparato. Lo que hay en Drive se queda. */
export async function disconnectGoogle(): Promise<void> {
  const tk = currentToken();
  forgetToken();
  setAccount(null);
  await forgetFolders();
  if (tk) await revokeToken(tk.accessToken).catch(() => undefined);
}

/** Carpeta principal recordada (para «Abrir la carpeta en Drive»). */
export async function rootFolderId(): Promise<string | null> {
  return folderMemory.get(FOLDER_KEYS.root);
}

/** La bienvenida sale una sola vez: la primera vez que se abre la app sin cuenta conectada. */
export function welcomeDone(): boolean {
  try {
    return localStorage.getItem(WELCOME_KEY) === 'done';
  } catch {
    return true;
  }
}

export function markWelcomeDone(): void {
  try {
    localStorage.setItem(WELCOME_KEY, 'done');
  } catch {
    // Sin almacenamiento: la bienvenida volvería a salir; no se pierde nada.
  }
}
