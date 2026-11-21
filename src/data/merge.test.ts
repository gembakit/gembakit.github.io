import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { GembaDB } from './db';
import type { SyncedRecord } from './record';
import { applySnapshot, emptySnapshot, localSnapshot, mergeSnapshots, readSnapshot, type Snapshot } from './merge';
import { createProject, deleteProject, listProjects, updateProject } from '../projects/store';

// PLAN.md 4.4: combinar tiene que dar lo mismo sin importar el orden ni
// cuántas veces se repita. Pruebas con órdenes y repeticiones al azar.

/** Generador pseudoaleatorio con semilla (las pruebas se repiten igual). */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const rec = (id: string, updatedAt: number, extra: Record<string, unknown> = {}): SyncedRecord & Record<string, unknown> => ({ id, createdAt: 1, updatedAt, deleted: 0, origin: 'app', ...extra });

function randomSnapshot(r: () => number): Snapshot {
  const s = emptySnapshot();
  const n = Math.floor(r() * 8);
  for (let i = 0; i < n; i++) {
    const id = `p${Math.floor(r() * 5)}`;
    s.tables.projects.push(rec(id, Math.floor(r() * 4), { name: `n${Math.floor(r() * 3)}`, deleted: r() < 0.2 ? 1 : 0 }));
  }
  // Un mismo id puede venir dos veces en una foto mal formada: se queda el más reciente.
  return mergeSnapshots(s, emptySnapshot());
}

const same = (a: Snapshot, b: Snapshot) => expect(JSON.stringify(a)).toBe(JSON.stringify(b));

describe('combinar fotos', () => {
  test('gana el cambio más reciente; un borrado es un cambio', () => {
    const a = emptySnapshot();
    const b = emptySnapshot();
    a.tables.projects = [rec('x', 10, { name: 'viejo' })];
    b.tables.projects = [rec('x', 20, { name: 'viejo', deleted: 1 })];
    expect(mergeSnapshots(a, b).tables.projects).toEqual([rec('x', 20, { name: 'viejo', deleted: 1 })]);
  });

  test('conmutativo, asociativo e idempotente con 300 casos al azar', () => {
    const r = rng(42);
    for (let k = 0; k < 300; k++) {
      const a = randomSnapshot(r);
      const b = randomSnapshot(r);
      const c = randomSnapshot(r);
      same(mergeSnapshots(a, b), mergeSnapshots(b, a));
      same(mergeSnapshots(mergeSnapshots(a, b), c), mergeSnapshots(a, mergeSnapshots(b, c)));
      same(mergeSnapshots(a, a), a);
      same(mergeSnapshots(mergeSnapshots(a, b), b), mergeSnapshots(a, b));
    }
  });

  test('a igualdad de fecha, el resultado no depende del orden', () => {
    const a = emptySnapshot();
    const b = emptySnapshot();
    a.tables.projects = [rec('x', 5, { name: 'A' })];
    b.tables.projects = [rec('x', 5, { name: 'B' })];
    same(mergeSnapshots(a, b), mergeSnapshots(b, a));
  });

  test('una foto que no lo es se descarta', () => {
    expect(readSnapshot('{')).toBeNull();
    expect(readSnapshot('{"format":"otra"}')).toBeNull();
    expect(readSnapshot(JSON.stringify(emptySnapshot()))).toEqual(emptySnapshot());
  });
});

describe('dos aparatos', () => {
  let phone: GembaDB;
  let laptop: GembaDB;
  beforeEach(() => {
    phone = new GembaDB(`ph-${crypto.randomUUID()}`);
    laptop = new GembaDB(`lp-${crypto.randomUUID()}`);
  });
  afterEach(async () => {
    await phone.delete();
    await laptop.delete();
  });

  /** Lo que hace cada aparato al sincronizar: combina con la nube, aplica y sube. */
  async function sync(db: GembaDB, cloud: { s: Snapshot }) {
    const merged = mergeSnapshots(await localSnapshot(db), cloud.s);
    await applySnapshot(db, merged);
    cloud.s = merged;
  }

  test('lo hecho en uno aparece en el otro, también los borrados, y repetir no cambia nada', async () => {
    const cloud = { s: emptySnapshot() };
    const p = await createProject({ name: 'Línea 3', type: 'dmaic', goal: '', fields: [] }, phone);
    await sync(phone, cloud);
    await sync(laptop, cloud);
    expect((await listProjects(laptop)).map((x) => x.name)).toEqual(['Línea 3']);
    await updateProject(p.id, { name: 'Línea 3 · rechazo' }, laptop);
    await sync(laptop, cloud);
    await sync(phone, cloud);
    expect((await listProjects(phone)).map((x) => x.name)).toEqual(['Línea 3 · rechazo']);
    await deleteProject(p.id, phone);
    await sync(phone, cloud);
    await sync(laptop, cloud);
    expect(await listProjects(laptop)).toEqual([]);
    const before = JSON.stringify(cloud.s);
    await sync(laptop, cloud);
    await sync(phone, cloud);
    expect(JSON.stringify(cloud.s)).toBe(before);
  });

  test('si los dos suben a la vez y uno pisa al otro, el pisado se repara en su siguiente sincronización', async () => {
    const cloud = { s: emptySnapshot() };
    await createProject({ name: 'Del móvil', type: 'kaizen', goal: '', fields: [] }, phone);
    await createProject({ name: 'Del ordenador', type: 'a3', goal: '', fields: [] }, laptop);
    // Los dos leen la nube vacía a la vez; sube el móvil y después el ordenador pisa la nube.
    const start = cloud.s;
    const fromPhone = mergeSnapshots(await localSnapshot(phone), start);
    await applySnapshot(phone, fromPhone);
    const fromLaptop = mergeSnapshots(await localSnapshot(laptop), start);
    await applySnapshot(laptop, fromLaptop);
    cloud.s = fromLaptop;
    // El móvil conserva lo suyo en local y lo vuelve a subir.
    await sync(phone, cloud);
    await sync(laptop, cloud);
    expect((await listProjects(laptop)).map((x) => x.name).sort()).toEqual(['Del móvil', 'Del ordenador']);
    expect((await listProjects(phone)).map((x) => x.name).sort()).toEqual(['Del móvil', 'Del ordenador']);
  });
});
