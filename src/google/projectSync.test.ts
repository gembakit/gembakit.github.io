import { beforeEach, describe, expect, test } from 'vitest';
import { syncProject, uniqueTitle, type DesiredTab, type SheetLink, type SyncInput } from './projectSync';
import type { FolderMemory } from './driveFolders';
import type { TabSpec } from './sheetsOutput';
import { FakeGoogle } from './testing/fakeGoogle';

// Pestaña de prueba: un texto y una fórmula.
function tab(key: string, title: string, content: string): DesiredTab {
  return {
    key,
    title,
    build: (sheetId: number, t: string): TabSpec => ({
      sheetId,
      title: t,
      rowCount: 5,
      columnCount: 3,
      tabColor: { red: 0, green: 0, blue: 0 },
      rowData: [{ values: [{ userEnteredValue: { stringValue: content } }, { userEnteredValue: { formulaValue: '=1+1' } }] }],
      rowMetadata: [{ pixelSize: 30 }],
      columnMetadata: [{ pixelSize: 100 }],
      merges: [],
      conditionalFormats: [],
    }),
  };
}

let g: FakeGoogle;
let memory: FolderMemory;
beforeEach(() => {
  g = new FakeGoogle();
  const saved = new Map<string, string>();
  memory = { get: async (k) => saved.get(k) ?? null, set: async (k, id) => void saved.set(k, id) };
});

const input = (link: SheetLink | null, tabs: DesiredTab[], extra: Partial<SyncInput> = {}): SyncInput => ({
  projectId: 'p1',
  name: 'Rechazo línea 3',
  tabs,
  changedAt: 100,
  locale: 'es_ES',
  link,
  folders: { root: 'Gemba Kit', projects: 'Proyectos' },
  memory,
  editedSuffix: 'editada 14 nov',
  now: 1,
  ...extra,
});
const base = () => [tab('summary', 'Resumen', 'resumen v1'), tab('m2', 'DPMO · 15 nov', 'dpmo'), tab('m1', 'FPY · 14 nov', 'fpy')];

async function first() {
  const r = await syncProject('T', input(null, base()), g.fetch);
  if (r.k !== 'done') throw new Error(r.k);
  return r.link;
}

describe('hoja de Google del proyecto', () => {
  test('la primera vez crea Gemba Kit / Proyectos / <proyecto> / <proyecto>, con «Resumen» y una pestaña por medición', async () => {
    const r = await syncProject('T', input(null, base()), g.fetch);
    expect(r).toMatchObject({ k: 'done', created: true, written: 3 });
    const root = g.find('Gemba Kit')[0]!;
    const projects = g.find('Proyectos')[0]!;
    const folder = g.find('Rechazo línea 3').find((f) => f.mimeType.endsWith('folder'))!;
    const file = g.find('Rechazo línea 3').find((f) => f.mimeType.endsWith('spreadsheet'))!;
    expect(projects.parents).toEqual([root.id]);
    expect(folder.parents).toEqual([projects.id]);
    expect(file.parents).toEqual([folder.id]);
    expect(file.appProperties).toEqual({ gembaProject: 'p1' });
    // La pestaña provisional se fue; el orden es Resumen y la medición más reciente primero.
    expect(g.sheetsOf(file.id).map((s) => s.title)).toEqual(['Resumen', 'DPMO · 15 nov', 'FPY · 14 nov']);
    // Todas con aviso al editar, las fórmulas escritas en en_US y la hoja en la región del usuario.
    expect(g.sheetsOf(file.id).every((s) => s.protectedRanges.length === 1)).toBe(true);
    expect(file.locale).toBe('es_ES');
    expect(g.sheetsOf(file.id)[0]!.values).toEqual([['resumen v1', '=1+1']]);
  });

  test('sin cambios no escribe nada; con cambios, solo lo que cambió', async () => {
    let link = await first();
    const batches = g.batches.length;
    let r = await syncProject('T', input(link, base()), g.fetch);
    expect(r).toMatchObject({ k: 'done', written: 0, removed: 0 });
    expect(g.batches.length).toBe(batches);

    // Cambia el resumen, se borra FPY y llega una medición nueva.
    link = (r as { link: SheetLink }).link;
    r = await syncProject('T', input(link, [tab('summary', 'Resumen', 'resumen v2'), tab('m3', 'OEE · 16 nov', 'oee'), tab('m2', 'DPMO · 15 nov', 'dpmo')]), g.fetch);
    expect(r).toMatchObject({ k: 'done', written: 2, removed: 1 });
    const sheets = g.sheetsOf(link.fileId);
    expect(sheets.map((s) => s.title)).toEqual(['Resumen', 'OEE · 16 nov', 'DPMO · 15 nov']);
    expect(sheets[0]!.values[0]![0]).toBe('resumen v2');
    // El resumen conserva su pestaña (no se borra y se crea otra).
    expect(sheets[0]!.sheetId).toBe(link.tabs.summary!.sheetId);
  });

  test('las pestañas del usuario no se tocan, y sus nombres no se repiten', async () => {
    const link = await first();
    g.addUserTab(link.fileId, 'Mis cálculos', [['hola']]);
    g.addUserTab(link.fileId, 'OEE · 16 nov', [['mía']]);
    const r = await syncProject('T', input(link, [...base(), tab('m3', 'OEE · 16 nov', 'oee')]), g.fetch);
    expect(r.k).toBe('done');
    const sheets = g.sheetsOf(link.fileId);
    expect(sheets.find((s) => s.title === 'Mis cálculos')!.values).toEqual([['hola']]);
    expect(sheets.find((s) => s.title === 'OEE · 16 nov')!.values).toEqual([['mía']]);
    expect(sheets.find((s) => s.title === 'OEE · 16 nov (2)')!.values[0]![0]).toBe('oee');
  });

  test('si alguien cambió una pestaña de la app en Sheets, pregunta antes; «guardar» la copia aparte y actualiza', async () => {
    const link = await first();
    g.edit(link.fileId, 'FPY · 14 nov', 0, 0, 'cambiado a mano');
    const ask = await syncProject('T', input(link, base()), g.fetch);
    expect(ask).toMatchObject({ k: 'conflict', tabs: ['FPY · 14 nov'], by: 'Ana Pérez' });

    const r = await syncProject('T', input(link, base(), { resolve: 'keep' }), g.fetch);
    expect(r).toMatchObject({ k: 'done', written: 1 });
    const sheets = g.sheetsOf(link.fileId);
    const copy = sheets.find((s) => s.title === 'FPY · 14 nov · editada 14 nov')!;
    expect(copy.values[0]![0]).toBe('cambiado a mano');
    expect(copy.protectedRanges).toEqual([]); // la copia es del usuario: sin aviso
    expect(sheets.find((s) => s.title === 'FPY · 14 nov')!.values[0]![0]).toBe('fpy');
    // Y ya no hay nada que preguntar.
    expect((await syncProject('T', input((r as { link: SheetLink }).link, base()), g.fetch)).k).toBe('done');
  });

  test('«actualizar sin guardar» reescribe la pestaña cambiada', async () => {
    const link = await first();
    g.edit(link.fileId, 'Resumen', 0, 0, 'tocado');
    const r = await syncProject('T', input(link, base(), { resolve: 'overwrite' }), g.fetch);
    expect(r).toMatchObject({ k: 'done', written: 1 });
    expect(g.sheetsOf(link.fileId).map((s) => s.title)).toEqual(['Resumen', 'DPMO · 15 nov', 'FPY · 14 nov']);
    expect(g.sheetsOf(link.fileId)[0]!.values[0]![0]).toBe('resumen v1');
  });

  test('si el archivo ya no está en Drive, avisa; al confirmar, lo crea de nuevo en la misma carpeta', async () => {
    const link = await first();
    g.files.get(link.fileId)!.trashed = true;
    expect(await syncProject('T', input(link, base()), g.fetch)).toEqual({ k: 'missing' });
    const r = await syncProject('T', input(link, base(), { recreate: true }), g.fetch);
    expect(r).toMatchObject({ k: 'done', created: true, written: 3 });
    const again = (r as { link: SheetLink }).link;
    expect(again.fileId).not.toBe(link.fileId);
    expect(again.folderId).toBe(link.folderId);
  });

  test('si el proyecto cambia de nombre, el archivo y su carpeta también', async () => {
    const link = await first();
    await syncProject('T', input(link, base(), { name: 'Rechazo L3' }), g.fetch);
    expect(g.files.get(link.fileId)!.name).toBe('Rechazo L3');
    expect(g.files.get(link.folderId)!.name).toBe('Rechazo L3');
  });

  test('nombres de pestaña libres', () => {
    const taken = new Set(['resumen', 'resumen (2)']);
    expect(uniqueTitle('Resumen', taken)).toBe('Resumen (3)');
    expect(uniqueTitle('  FPY   · 14 nov ', new Set())).toBe('FPY · 14 nov');
  });
});
