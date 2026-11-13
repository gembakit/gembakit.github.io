import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { GembaDB } from './db';
import { create, listActive, restore, softDelete, update } from './repo';
import { now } from './record';
import { DEFAULT_SETTINGS, loadSettings, saveSetting } from './settings';

let database: GembaDB;
beforeEach(() => {
  database = new GembaDB(`test-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await database.delete();
});

describe('registros', () => {
  test('cada registro nace con identificador, fechas, origen y sin borrar', async () => {
    const p = await create(database.projects, { name: 'Soldadura línea 3' });
    expect(p.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(p.createdAt).toBe(p.updatedAt);
    expect(p.deleted).toBe(0);
    expect(p.origin).toBe('app');
  });

  test('editar sube la fecha de cambio', async () => {
    const p = await create(database.projects, { name: 'A' });
    await update(database.projects, p.id, { name: 'B' });
    const after = await database.projects.get(p.id);
    expect(after?.name).toBe('B');
    expect(after!.updatedAt).toBeGreaterThan(p.updatedAt);
  });

  test('borrar marca el registro y deshacer lo recupera', async () => {
    const a = await create(database.projects, { name: 'A' });
    const b = await create(database.projects, { name: 'B' });
    await softDelete(database.projects, a.id);
    expect((await listActive(database.projects)).map((p) => p.name)).toEqual(['B']);
    expect(await database.projects.get(a.id)).toMatchObject({ deleted: 1 });
    await restore(database.projects, a.id);
    expect((await listActive(database.projects)).map((p) => p.id).sort()).toEqual([a.id, b.id].sort());
  });

  test('las marcas de tiempo nunca se repiten aunque coincida el milisegundo', () => {
    const ts = Array.from({ length: 1000 }, () => now());
    expect(new Set(ts).size).toBe(ts.length);
    expect(ts).toEqual([...ts].sort((x, y) => x - y));
  });
});

describe('ajustes', () => {
  test('sin nada guardado usa los valores por defecto', async () => {
    expect(await loadSettings(database)).toEqual(DEFAULT_SETTINGS);
  });

  test('guarda y recupera idioma, tema, modo y favoritas', async () => {
    await saveSetting('language', 'en', database);
    await saveSetting('theme', 'salvia', database);
    await saveSetting('mode', 'dark', database);
    await saveSetting('favorites', ['pareto'], database);
    expect(await loadSettings(database)).toEqual({ language: 'en', theme: 'salvia', mode: 'dark', favorites: ['pareto'] });
  });

  test('un valor guardado inválido se ignora', async () => {
    await database.settings.put({ key: 'theme', value: 'rosa' });
    await database.settings.put({ key: 'language', value: 'fr' });
    expect(await loadSettings(database)).toEqual(DEFAULT_SETTINGS);
  });
});
