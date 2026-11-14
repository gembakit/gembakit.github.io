import { db } from '../data/db';
import type { FolderMemory } from './driveFolders';

/** Las carpetas de Drive se recuerdan en los ajustes de este aparato (`drive.*`: no viajan en la copia). */
export const folderMemory: FolderMemory = {
  get: async (key) => {
    const s = await db.settings.get(key);
    return typeof s?.value === 'string' ? s.value : null;
  },
  set: async (key, id) => {
    await db.settings.put({ key, value: id });
  },
};
