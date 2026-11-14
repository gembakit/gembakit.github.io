import { describe, expect, test } from 'vitest';
import { backupFolder, ensureFolder, FOLDER_KEYS, type FolderMemory } from './driveFolders';
import { KEEP_BACKUPS, saveBackupToDrive } from './driveBackup';
import { driveQuoted } from './api';

// Sin llamar a Google: un fetch falso responde según la petición y la apunta.

interface Call {
  method: string;
  url: URL;
  body: string;
}

function fakeDrive(handler: (c: Call) => { status?: number; body: unknown }) {
  const calls: Call[] = [];
  const f = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const c = { method: init.method ?? 'GET', url: new URL(String(input)), body: String(init.body ?? '') };
    calls.push(c);
    const r = handler(c);
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  return { f, calls };
}

function memory(initial: Record<string, string> = {}): FolderMemory & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, get: async (k) => data[k] ?? null, set: async (k, v) => void (data[k] = v) };
}

describe('carpetas de la app en Drive', () => {
  test('la carpeta recordada se usa aunque el usuario la haya movido o renombrado', async () => {
    const { f, calls } = fakeDrive(() => ({ body: { id: 'F1', name: 'Otro nombre', trashed: false } }));
    expect(await ensureFolder('T', FOLDER_KEYS.root, 'Gemba Kit', 'root', memory({ [FOLDER_KEYS.root]: 'F1' }), f)).toBe('F1');
    expect(calls).toHaveLength(1);
  });

  test('si está en la papelera o ya no existe, busca una con su nombre y, si no hay, la crea dentro de su carpeta madre', async () => {
    const mem = memory({ [FOLDER_KEYS.root]: 'BORRADA' });
    const { f, calls } = fakeDrive((c) => {
      if (c.url.pathname.endsWith('/BORRADA')) return { status: 404, body: { error: { message: 'File not found' } } };
      if (c.method === 'GET') return { body: { files: [] } };
      return { body: { id: c.body.includes('Copias') ? 'B2' : 'R2' } };
    });
    expect(await backupFolder('T', { root: 'Gemba Kit', backups: 'Copias de seguridad' }, mem, f)).toBe('B2');
    expect(mem.data).toEqual({ [FOLDER_KEYS.root]: 'R2', [FOLDER_KEYS.backups]: 'B2' });
    const created = calls.filter((c) => c.method === 'POST').map((c) => JSON.parse(c.body));
    expect(created).toEqual([
      { name: 'Gemba Kit', mimeType: 'application/vnd.google-apps.folder' },
      { name: 'Copias de seguridad', mimeType: 'application/vnd.google-apps.folder', parents: ['R2'] },
    ]);
    // La búsqueda por nombre se hace dentro de la carpeta madre y sin lo de la papelera.
    expect(calls.find((c) => c.url.searchParams.get('q')?.includes("'R2' in parents"))?.url.searchParams.get('q')).toContain('trashed = false');
  });

  test('los nombres con comillas no rompen la búsqueda', () => {
    expect(driveQuoted("Línea 3 d'Oro")).toBe("'Línea 3 d\\'Oro'");
  });
});

describe('copias en Drive', () => {
  test(`sube la copia como JSON y manda a la papelera las que pasan de ${KEEP_BACKUPS}`, async () => {
    const existing = Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, name: `copia ${i}` }));
    const { f, calls } = fakeDrive((c) => {
      if (c.method === 'POST') return { body: { id: 'nueva', name: 'gemba-kit-copia.json' } };
      if (c.method === 'GET') return { body: { files: existing } };
      return { body: {} };
    });
    const saved = await saveBackupToDrive('T', 'B', 'gemba-kit-copia.json', '{"format":"gemba-kit-copia"}', f);
    expect(saved.id).toBe('nueva');
    const upload = calls[0]!;
    expect(upload.url.searchParams.get('uploadType')).toBe('multipart');
    expect(upload.body).toContain('"parents":["B"]');
    expect(upload.body).toContain('{"format":"gemba-kit-copia"}');
    const trashed = calls.filter((c) => c.method === 'PATCH');
    expect(trashed.map((c) => c.url.pathname.split('/').pop())).toEqual(['c10', 'c11']);
    expect(JSON.parse(trashed[0]!.body)).toEqual({ trashed: true });
  });
});
