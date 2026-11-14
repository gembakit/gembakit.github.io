import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { GembaDB } from './db';
import { BackupError, backupFileName, makeBackup, readBackup, restoreBackup, summarize, localCounts } from './backup';
import { addMilestone, createProject, deleteMeasurement, getProject, saveMeasurement, updateProject } from '../projects/store';

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

describe('copia de seguridad', () => {
  test('un teléfono nuevo recupera todo lo de la copia, borrado incluido (para deshacer), sin los ajustes de Drive', async () => {
    const { p } = await fill(a);
    const text = JSON.stringify(await makeBackup(a, '0.1.0', Date.UTC(2026, 10, 14, 18, 30)));
    const backup = readBackup(text);
    expect(summarize(backup)).toEqual({ createdAt: Date.UTC(2026, 10, 14, 18, 30), projects: 1, measurements: 1, milestones: 1 });

    expect(await restoreBackup(b, backup)).toEqual({ added: 4, updated: 0, kept: 0 });
    expect((await getProject(p.id, b))?.name).toBe('Rechazo línea 3');
    expect(await localCounts(b)).toEqual({ projects: 1, measurements: 1, milestones: 1 });
    expect(await b.analyses.count()).toBe(2);
    expect((await b.settings.get('theme'))?.value).toBe('ambar');
    expect(await b.settings.get('drive.folder.root')).toBeUndefined();
  });

  test('junta: de cada registro gana la versión más reciente y no se borra nada de lo que hay', async () => {
    const { p } = await fill(a);
    const backup = readBackup(JSON.stringify(await makeBackup(a, '0.1.0')));
    await restoreBackup(b, backup);
    // En el teléfono se sigue trabajando después de la copia…
    await updateProject(p.id, { name: 'Nombre nuevo' }, b);
    const extra = await createProject({ name: 'Solo en el teléfono', type: '5s', goal: '', fields: [] }, b);
    await b.settings.put({ key: 'theme', value: 'azul' });
    // …y restaurar la copia vieja no pisa nada de eso.
    expect(await restoreBackup(b, backup)).toEqual({ added: 0, updated: 0, kept: 4 });
    expect((await getProject(p.id, b))?.name).toBe('Nombre nuevo');
    expect(await getProject(extra.id, b)).not.toBeNull();
    expect((await b.settings.get('theme'))?.value).toBe('azul');

    // Al revés: una copia más reciente actualiza lo que estaba.
    await updateProject(p.id, { name: 'Cambiado en el otro' }, a);
    expect(await restoreBackup(b, readBackup(JSON.stringify(await makeBackup(a, '0.1.0'))))).toMatchObject({ updated: 1 });
    expect((await getProject(p.id, b))?.name).toBe('Cambiado en el otro');
  });

  test('restaurar una copia vieja no revive lo que se borró después de hacerla', async () => {
    const { m } = await fill(a);
    const old = readBackup(JSON.stringify(await makeBackup(a, '0.1.0')));
    // Después de la copia se borra la medición que estaba viva en ella…
    await deleteMeasurement(m.id, a);
    expect(await localCounts(a)).toMatchObject({ measurements: 0 });
    // …y la copia vieja no la trae de vuelta: el borrado es más reciente.
    expect(await restoreBackup(a, old)).toMatchObject({ added: 0, updated: 0 });
    expect(await localCounts(a)).toMatchObject({ measurements: 0 });
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
