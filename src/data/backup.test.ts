import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { GembaDB } from './db';
import { BackupError, backupFileName, makeBackup, planRestore, readBackup, restoreBackup, summarize, localCounts } from './backup';
import { listVersions, restoreVersion, saveVersionNow } from './history';
import { addMilestone, createProject, deleteMeasurement, deleteProject, getProject, listMeasurements, saveMeasurement, updateProject } from '../projects/store';

let a: GembaDB;
let b: GembaDB;
beforeEach(() => {
  a = new GembaDB(`a-${crypto.randomUUID()}`);
  b = new GembaDB(`b-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await a.delete();
  await b.delete();
});

async function fill(db: GembaDB) {
  const p = await createProject({ name: 'Rechazo línea 3', type: 'dmaic', goal: '', fields: [] }, db);
  const m = await saveMeasurement(
    { projectId: p.id, toolId: 'fpy', name: 'FPY', phase: 'medir', measuredAt: 1, context: {}, note: '', input: { steps: [] }, headline: null },
    db,
  );
  await saveMeasurement({ projectId: p.id, toolId: 'dpmo', name: 'Borrada', phase: 'medir', measuredAt: 2, context: {}, note: '', input: {}, headline: null }, db).then((x) =>
    deleteMeasurement(x.id, db),
  );
  await addMilestone({ projectId: p.id, at: 3, title: '5S', note: '' }, db);
  await db.settings.bulkPut([
    { key: 'theme', value: 'ambar' },
    { key: 'drive.folder.root', value: 'carpeta-de-otra-cuenta' },
  ]);
  return { p, m };
}

const copyOf = async (db: GembaDB) => readBackup(JSON.stringify(await makeBackup(db, '0.1.0')));
const actions = (plan: { action: string }[]) => plan.map((x) => x.action);

describe('copia de seguridad', () => {
  test('un teléfono nuevo recupera todos los proyectos, con su historial y sin los ajustes de Drive', async () => {
    const { p } = await fill(a);
    await saveVersionNow(a, p.id);
    const text = JSON.stringify(await makeBackup(a, '0.1.0', Date.UTC(2026, 10, 14, 18, 30)));
    const backup = readBackup(text);
    expect(summarize(backup)).toEqual({ createdAt: Date.UTC(2026, 10, 14, 18, 30), projects: 1, measurements: 1, milestones: 1 });

    expect(actions(await planRestore(b, backup))).toEqual(['add']);
    expect(await restoreBackup(b, backup)).toEqual([{ id: p.id, name: 'Rechazo línea 3', action: 'add' }]);
    expect((await getProject(p.id, b))?.name).toBe('Rechazo línea 3');
    expect(await localCounts(b)).toEqual({ projects: 1, measurements: 1, milestones: 1 });
    expect(await listVersions(b, p.id)).toHaveLength(1);
    expect((await b.settings.get('theme'))?.value).toBe('ambar');
    expect(await b.settings.get('drive.folder.root')).toBeUndefined();
  });

  test('una copia más antigua no pisa nada: queda en el historial del proyecto, y desde ahí se vuelve a ella', async () => {
    const { p, m } = await fill(a);
    const old = await copyOf(a);
    // Después de la copia se cambia el nombre y se borra la medición.
    await updateProject(p.id, { name: 'Nombre nuevo' }, a);
    await deleteMeasurement(m.id, a);
    const extra = await createProject({ name: 'Solo en el teléfono', type: '5s', goal: '', fields: [] }, a);

    expect(await restoreBackup(a, old)).toEqual([{ id: p.id, name: 'Rechazo línea 3', action: 'history' }]);
    // Lo actual sigue igual…
    expect((await getProject(p.id, a))?.name).toBe('Nombre nuevo');
    expect(await listMeasurements(p.id, a)).toHaveLength(0);
    expect(await getProject(extra.id, a)).not.toBeNull();
    // …y la versión de la copia está en el historial, marcada como tal.
    const [v] = await listVersions(a, p.id);
    expect(v).toMatchObject({ reason: 'backup', copyAt: old.createdAt });
    expect(v!.state.project.name).toBe('Rechazo línea 3');

    // Restaurar la misma copia otra vez no repite la versión.
    expect(actions(await restoreBackup(a, old))).toEqual(['same']);
    expect(await listVersions(a, p.id)).toHaveLength(1);

    // Volver a ella trae el nombre y la medición borrada.
    await restoreVersion(a, v!.id);
    expect((await getProject(p.id, a))?.name).toBe('Rechazo línea 3');
    expect((await listMeasurements(p.id, a)).map((x) => x.id)).toEqual([m.id]);
  });

  test('una copia más reciente pasa a ser la actual y lo del teléfono queda en el historial', async () => {
    const { p } = await fill(a);
    await restoreBackup(b, await copyOf(a));
    // En el otro teléfono se sigue trabajando y se hace otra copia.
    await updateProject(p.id, { name: 'Cambiado en el otro' }, a);
    expect(actions(await restoreBackup(b, await copyOf(a)))).toEqual(['update']);
    expect((await getProject(p.id, b))?.name).toBe('Cambiado en el otro');
    const [v] = await listVersions(b, p.id);
    expect(v).toMatchObject({ reason: 'before-restore' });
    expect(v!.state.project.name).toBe('Rechazo línea 3');
  });

  test('un proyecto borrado en el teléfono vuelve como estaba en la copia', async () => {
    const { p } = await fill(a);
    const old = await copyOf(a);
    await deleteProject(p.id, a);
    expect(await getProject(p.id, a)).toBeNull();
    expect(actions(await restoreBackup(a, old))).toEqual(['revive']);
    expect((await getProject(p.id, a))?.name).toBe('Rechazo línea 3');
    expect(await localCounts(a)).toEqual({ projects: 1, measurements: 1, milestones: 1 });
  });

  test('restaurar una copia igual a lo que hay no cambia nada', async () => {
    await fill(a);
    const same = await copyOf(a);
    expect(actions(await restoreBackup(a, same))).toEqual(['same']);
    expect(await a.projectVersions.count()).toBe(0);
  });

  test('las copias de antes del historial se siguen leyendo', async () => {
    const { p } = await fill(a);
    const v1 = { ...(await makeBackup(a, '0.1.0')), version: 1 } as Record<string, unknown>;
    delete v1.history;
    const backup = readBackup(JSON.stringify(v1));
    expect(backup.history).toEqual([]);
    expect(actions(await restoreBackup(b, backup))).toEqual(['add']);
    expect((await getProject(p.id, b))?.name).toBe('Rechazo línea 3');
  });

  test('rechaza lo que no es una copia, una copia de una versión más nueva o dañada', () => {
    const code = (text: string) => {
      try {
        readBackup(text);
        return 'ok';
      } catch (e) {
        return (e as BackupError).code;
      }
    };
    expect(code('hola')).toBe('not-json');
    expect(code('{"format":"otra-cosa"}')).toBe('not-backup');
    expect(code('{"format":"gemba-kit-copia","version":99,"createdAt":1,"tables":{}}')).toBe('newer');
    expect(code('{"format":"gemba-kit-copia","version":1,"createdAt":1,"tables":{"projects":[{"nombre":"x"}]}}')).toBe('damaged');
    expect(code('{"format":"gemba-kit-copia","version":1,"createdAt":1,"tables":{}}')).toBe('ok');
  });

  test('nombre del archivo con la fecha y la hora', () => {
    expect(backupFileName(new Date(2026, 10, 4, 9, 5).getTime())).toBe('gemba-kit-copia-2026-11-04-0905.json');
  });
});
