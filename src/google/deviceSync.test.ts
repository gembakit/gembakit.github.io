import { afterEach, beforeEach, expect, test } from 'vitest';
import { GembaDB } from '../data/db';
import { createProject, listProjects } from '../projects/store';
import { saveRecipe, listRecipes } from '../recipes/store';
import { lastDeviceSync, SYNC_FILE, syncDevices } from './deviceSync';

// Una carpeta oculta de Drive falsa: guarda un archivo por nombre.
function fakeAppData() {
  const files = new Map<string, { id: string; content: string }>();
  let n = 0;
  const f = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (url.searchParams.get('spaces') === 'appDataFolder') {
      const name = /name='([^']+)'/.exec(url.searchParams.get('q') ?? '')![1]!;
      const file = files.get(name);
      return json({ files: file ? [{ id: file.id, name }] : [] });
    }
    if (url.searchParams.get('alt') === 'media') {
      const id = url.pathname.split('/').pop()!;
      return new Response([...files.values()].find((x) => x.id === id)!.content, { status: 200 });
    }
    if (url.searchParams.get('uploadType') === 'multipart') {
      const parts = String(init.body).split('--gemba-kit-boundary');
      const meta = JSON.parse(parts[1]!.split('\r\n\r\n')[1]!.trim()) as { name: string };
      const content = parts[2]!.split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, '');
      files.set(meta.name, { id: `f${++n}`, content });
      return json({ id: `f${n}` });
    }
    if (init.method === 'PATCH') {
      const id = url.pathname.split('/').pop()!;
      const entry = [...files.entries()].find(([, v]) => v.id === id)!;
      files.set(entry[0], { id, content: String(init.body) });
      return json({});
    }
    throw new Error(`petición inesperada: ${url}`);
  }) as typeof fetch;
  return { f, files };
}

let phone: GembaDB;
let laptop: GembaDB;
beforeEach(() => {
  phone = new GembaDB(`sp-${crypto.randomUUID()}`);
  laptop = new GembaDB(`sl-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await phone.delete();
  await laptop.delete();
});

test('el móvil sube sus proyectos y recetas, el ordenador los recibe, y repetir no vuelve a subir', async () => {
  const drive = fakeAppData();
  await createProject({ name: 'Línea 3', type: 'dmaic', goal: '', fields: [] }, phone);
  await saveRecipe({ plant: 'Norte', line: 'L3', name: '12 oz' }, { unitName: 'botellas' }, phone);
  const first = await syncDevices('T', drive.f, phone);
  expect(first.sent).toBe(true);
  expect(drive.files.has(SYNC_FILE)).toBe(true);
  const second = await syncDevices('T', drive.f, laptop);
  expect(second.received).toBeGreaterThan(0);
  expect((await listProjects(laptop)).map((p) => p.name)).toEqual(['Línea 3']);
  expect((await listRecipes(laptop)).map((r) => r.name)).toEqual(['12 oz']);
  // Nada nuevo: no se vuelve a subir.
  expect((await syncDevices('T', drive.f, phone)).sent).toBe(false);
  expect(await lastDeviceSync(phone)).not.toBeNull();
});
