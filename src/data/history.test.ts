import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { GembaDB } from './db';
import { copyVersion, deleteVersion, isCheckpoint, KEEP_AUTO, listVersions, MAX_CHECKPOINTS, putVersion, renameCheckpoint, restoreVersion, saveCheckpoint, sameDay } from './history';
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
    await saveCheckpoint(db, p.id, 'Antes de cambiar');
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

  test('punto de control con nombre; si no hubo cambios, no se repite', async () => {
    const p = await createProject({ name: 'Línea 3', type: 'dmaic', goal: '', fields: [] }, db);
    expect(await saveCheckpoint(db, p.id, '  Inicio ')).toMatchObject({ k: 'saved', version: { reason: 'manual', label: 'Inicio' } });
    expect(await saveCheckpoint(db, p.id, 'Otra vez')).toMatchObject({ k: 'same', version: { label: 'Inicio' } });
    await updateProject(p.id, { goal: 'Algo' }, db);
    expect((await saveCheckpoint(db, p.id, 'Fin de Definir')).k).toBe('saved');
    expect((await listVersions(db, p.id)).map((v) => v.label)).toEqual(['Fin de Definir', 'Inicio']);
  });

  test('una versión automática igual a como está el proyecto pasa a ser el punto de control', async () => {
    const p = await createProject({ name: 'Línea 3', type: 'dmaic', goal: '', fields: [] }, db);
    await measure(p.id, 'Lunes');
    nextDay();
    await saveCheckpoint(db, p.id, 'Primero');
    await updateProject(p.id, { goal: 'Cambio' }, db);
    const [auto] = await listVersions(db, p.id);
    await restoreVersion(db, auto!.id);
    // «Antes de volver atrás» guardó cómo estaba; un punto de control ahora no duplica nada.
    const n = (await listVersions(db, p.id)).length;
    expect((await saveCheckpoint(db, p.id, 'Tras volver')).k).toBe('saved');
    expect(await listVersions(db, p.id)).toHaveLength(n + 1);
  });

  test(`automáticas: se quedan las ${KEEP_AUTO} más recientes y nunca borran un punto de control`, async () => {
    const p = await createProject({ name: 'Línea 3', type: 'dmaic', goal: '', fields: [] }, db);
    await saveCheckpoint(db, p.id, 'El primero');
    for (let i = 0; i < KEEP_AUTO + 3; i++) {
      nextDay();
      await updateProject(p.id, { goal: `Objetivo ${i}` }, db);
    }
    const versions = await listVersions(db, p.id);
    const autos = versions.filter((v) => !isCheckpoint(v));
    expect(autos).toHaveLength(KEEP_AUTO);
    expect(autos[0]!.state.project.goal).toBe(`Objetivo ${KEEP_AUTO + 1}`);
    expect(versions.filter(isCheckpoint).map((v) => v.label)).toEqual(['El primero']);
  });

  test(`con ${MAX_CHECKPOINTS} puntos de control pregunta cuál borrar; nunca borra uno solo`, async () => {
    const p = await createProject({ name: 'Línea 3', type: 'dmaic', goal: '', fields: [] }, db);
    for (let i = 0; i < MAX_CHECKPOINTS; i++) {
      await updateProject(p.id, { goal: `Objetivo ${i}` }, db);
      expect((await saveCheckpoint(db, p.id, `Punto ${i}`)).k).toBe('saved');
    }
    await updateProject(p.id, { goal: 'Uno más' }, db);
    const full = await saveCheckpoint(db, p.id, 'Punto nuevo');
    expect(full.k).toBe('full');
    if (full.k !== 'full') return;
    expect(full.checkpoints).toHaveLength(MAX_CHECKPOINTS);
    expect((await listVersions(db, p.id)).filter(isCheckpoint)).toHaveLength(MAX_CHECKPOINTS);

    const oldest = full.checkpoints.at(-1)!;
    expect(oldest.label).toBe('Punto 0');
    expect((await saveCheckpoint(db, p.id, 'Punto nuevo', oldest.id)).k).toBe('saved');
    const labels = (await listVersions(db, p.id)).filter(isCheckpoint).map((v) => v.label);
    expect(labels).toHaveLength(MAX_CHECKPOINTS);
    expect(labels[0]).toBe('Punto nuevo');
    expect(labels).not.toContain('Punto 0');
  });

  test('cambiar el nombre de un punto de control y borrarlo con deshacer', async () => {
    const p = await createProject({ name: 'Línea 3', type: 'dmaic', goal: '', fields: [] }, db);
    const r = await saveCheckpoint(db, p.id, 'Antes');
    if (r.k !== 'saved') throw new Error(r.k);
    await renameCheckpoint(db, r.version.id, ' Fin de Medir ');
    expect((await listVersions(db, p.id))[0]!.label).toBe('Fin de Medir');
    const gone = await deleteVersion(db, r.version.id);
    expect(await listVersions(db, p.id)).toHaveLength(0);
    await putVersion(db, gone!);
    expect((await listVersions(db, p.id))[0]!.label).toBe('Fin de Medir');
  });
});
