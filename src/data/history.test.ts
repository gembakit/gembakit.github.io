import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { GembaDB } from './db';
import { copyVersion, KEEP_VERSIONS, listVersions, restoreVersion, saveVersionNow, sameDay } from './history';
import { addMilestone, createProject, deleteMeasurement, getProject, listMeasurements, listMilestones, saveMeasurement, updateProject } from '../projects/store';

// Los días se simulan con el reloj; siempre hacia delante, porque las marcas de
// tiempo de la app nunca retroceden.
let clock = new Date(2030, 0, 1, 12).getTime();
const nextDay = () => {
  const d = new Date(clock);
  d.setDate(d.getDate() + 1);
  clock = d.getTime();
  vi.setSystemTime(clock);
};

let db: GembaDB;
beforeAll(() => vi.useFakeTimers({ toFake: ['Date'] }));
afterAll(() => vi.useRealTimers());
beforeEach(() => {
  nextDay();
  db = new GembaDB(`h-${crypto.randomUUID()}`);
});
afterEach(() => db.delete());

const measure = (projectId: string, name: string) =>
  saveMeasurement({ projectId, toolId: 'dpmo', name, phase: 'medir', measuredAt: Date.now(), context: {}, note: '', input: {}, headline: null }, db);

describe('historial de versiones de un proyecto', () => {
  test('se guarda una versión sola al empezar a cambiar el proyecto en un día nuevo, no en el mismo día', async () => {
    const p = await createProject({ name: 'Línea 3', type: 'dmaic', goal: '', fields: [] }, db);
    await measure(p.id, 'Lunes');
    await updateProject(p.id, { phase: 'medir' }, db);
    expect(await listVersions(db, p.id)).toHaveLength(0);

    nextDay();
    await measure(p.id, 'Martes 1');
    await measure(p.id, 'Martes 2');
    const versions = await listVersions(db, p.id);
    expect(versions).toHaveLength(1);
    // La versión es cómo quedó el lunes.
    expect(versions[0]).toMatchObject({ reason: 'auto' });
    expect(sameDay(versions[0]!.at, clock)).toBe(false);
    expect(versions[0]!.state.project.phase).toBe('medir');
    expect(versions[0]!.state.children.analyses.map((m) => m.name)).toEqual(['Lunes']);

    nextDay();
    await updateProject(p.id, { name: 'Línea 3 bis' }, db);
    expect(await listVersions(db, p.id)).toHaveLength(2);
  });

  test('volver a una versión trae lo borrado, quita lo añadido después y se puede deshacer', async () => {
    const p = await createProject({ name: 'Línea 3', type: 'dmaic', goal: 'Bajar rechazo', fields: [] }, db);
    const keep = await measure(p.id, 'Se queda');
    const gone = await measure(p.id, 'Se borrará');
    await addMilestone({ projectId: p.id, at: 1, title: '5S', note: '' }, db);

    nextDay();
    await deleteMeasurement(gone.id, db);
    await measure(p.id, 'Nueva');
    await updateProject(p.id, { name: 'Renombrado' }, db);
    const [monday] = await listVersions(db, p.id);

    const before = await restoreVersion(db, monday!.id);
    expect((await getProject(p.id, db))?.name).toBe('Línea 3');
    expect((await listMeasurements(p.id, db)).map((m) => m.name).sort()).toEqual(['Se borrará', 'Se queda']);
    expect(await listMilestones(p.id, db)).toHaveLength(1);
    expect(before).toMatchObject({ reason: 'before-restore' });
    expect((await listMeasurements(p.id, db)).some((m) => m.id === keep.id)).toBe(true);

    // Deshacer: volver a la versión de justo antes.
    await restoreVersion(db, before!.id);
    expect((await getProject(p.id, db))?.name).toBe('Renombrado');
    expect((await listMeasurements(p.id, db)).map((m) => m.name).sort()).toEqual(['Nueva', 'Se queda']);
  });

  test('abrir como copia crea un proyecto aparte y no toca el original', async () => {
    const p = await createProject({ name: 'Línea 3', type: 'dmaic', goal: '', fields: [] }, db);
    const m = await measure(p.id, 'FPY');
    await addMilestone({ projectId: p.id, at: 1, title: '5S', note: '' }, db);
    await saveVersionNow(db, p.id);
    await updateProject(p.id, { name: 'Cambiado' }, db);
    const [v] = await listVersions(db, p.id);

    const copyId = await copyVersion(db, v!.id, 'Línea 3 (copia)');
    expect(copyId).not.toBe(p.id);
    expect((await getProject(copyId, db))?.name).toBe('Línea 3 (copia)');
    const copied = await listMeasurements(copyId, db);
    expect(copied.map((x) => x.name)).toEqual(['FPY']);
    expect(copied[0]!.id).not.toBe(m.id);
    expect(await listMilestones(copyId, db)).toHaveLength(1);
    // El original sigue igual.
    expect((await getProject(p.id, db))?.name).toBe('Cambiado');
    expect(await listMeasurements(p.id, db)).toHaveLength(1);
  });

  test('guardar versión a mano; si no hubo cambios, no se repite', async () => {
    const p = await createProject({ name: 'Línea 3', type: 'dmaic', goal: '', fields: [] }, db);
    expect(await saveVersionNow(db, p.id)).toBe('saved');
    expect(await saveVersionNow(db, p.id)).toBe('same');
    await updateProject(p.id, { goal: 'Algo' }, db);
    expect(await saveVersionNow(db, p.id)).toBe('saved');
    expect((await listVersions(db, p.id)).map((v) => v.reason)).toEqual(['manual', 'manual']);
  });

  test(`se quedan las ${KEEP_VERSIONS} versiones más recientes`, async () => {
    const p = await createProject({ name: 'Línea 3', type: 'dmaic', goal: '', fields: [] }, db);
    for (let i = 0; i < KEEP_VERSIONS + 3; i++) {
      await updateProject(p.id, { goal: `Objetivo ${i}` }, db);
      await saveVersionNow(db, p.id);
    }
    const versions = await listVersions(db, p.id);
    expect(versions).toHaveLength(KEEP_VERSIONS);
    expect(versions[0]!.state.project.goal).toBe(`Objetivo ${KEEP_VERSIONS + 2}`);
    expect(versions.at(-1)!.state.project.goal).toBe('Objetivo 3');
  });
});
