import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { GembaDB } from '../data/db';
import { defaultFields, PHASES } from './model';
import { phaseStates } from './PhaseTrack';
import {
  addVersion,
  contextSuggestions,
  createProject,
  deleteMeasurement,
  FrozenError,
  getMeasurement,
  lastUsed,
  latest,
  listMeasurements,
  listProjects,
  rememberLast,
  restoreMeasurement,
  saveMeasurement,
  setFrozen,
  addMilestone,
  deleteMilestone,
  listMilestones,
  restoreMilestone,
  updateMeasurementInfo,
  updateMilestone,
} from './store';

let database: GembaDB;
beforeEach(() => {
  database = new GembaDB(`test-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await database.delete();
});

const fields = defaultFields({ equipo: 'Equipo', puesto: 'Puesto', linea: 'Línea', producto: 'Producto', supervisor: 'Supervisor', operario: 'Operario' });

async function project() {
  return createProject({ name: ' Rechazo línea 3 ', type: 'dmaic', goal: '', fields }, database);
}

function measurement(projectId: string, extra: Partial<Parameters<typeof saveMeasurement>[0]> = {}) {
  return saveMeasurement(
    {
      projectId,
      toolId: 'fpy',
      name: 'FPY · 14 nov',
      phase: 'medir',
      measuredAt: Date.UTC(2026, 10, 14, 9),
      context: { equipo: 'Day shift 1', puesto: '  llenadora ', supervisor: '' },
      note: '',
      input: { mode: 'direct', steps: [] },
      headline: { key: 'rty', value: 0.83, kind: 'percent', decimals: 1 },
      ...extra,
    },
    database,
  );
}

describe('proyectos', () => {
  test('un proyecto nace en la primera fase de su tipo, con sus campos de contexto', async () => {
    const p = await project();
    expect(p).toMatchObject({ name: 'Rechazo línea 3', type: 'dmaic', phase: 'definir' });
    expect(p.fields.map((f) => f.id)).toEqual(['equipo', 'puesto', 'linea', 'producto', 'supervisor', 'operario']);
    expect(PHASES.seguimiento).toEqual([]);
    expect((await createProject({ name: 'S', type: 'seguimiento', goal: '', fields: [] }, database)).phase).toBe('');
    expect(await listProjects(database)).toHaveLength(2);
  });
});

describe('hitos', () => {
  test('del más reciente al más antiguo; se corrigen y se borran con deshacer', async () => {
    const p = await project();
    const a = await addMilestone({ projectId: p.id, at: Date.UTC(2026, 11, 3), title: ' Implantación 5S ', note: '' }, database);
    await addMilestone({ projectId: p.id, at: Date.UTC(2026, 11, 10), title: 'Cambio de molde', note: 'SMED' }, database);
    expect((await listMilestones(p.id, database)).map((m) => m.title)).toEqual(['Cambio de molde', 'Implantación 5S']);
    await updateMilestone(a.id, { title: ' 5S en la llenadora ', note: ' turno de día ' }, database);
    expect((await listMilestones(p.id, database))[1]).toMatchObject({ title: '5S en la llenadora', note: 'turno de día' });
    await deleteMilestone(a.id, database);
    expect(await listMilestones(p.id, database)).toHaveLength(1);
    await restoreMilestone(a.id, database);
    expect(await listMilestones(p.id, database)).toHaveLength(2);
    expect(await listMilestones('otro', database)).toEqual([]);
  });
});

describe('recorrido de fases', () => {
  test('las anteriores a la actual, completadas; la actual; las siguientes, pendientes', () => {
    expect(phaseStates('dmaic', 'analizar').map((s) => s.state)).toEqual(['done', 'done', 'current', 'todo', 'todo']);
    expect(phaseStates('dmaic', 'definir')[0]!.state).toBe('current');
    expect(phaseStates('seguimiento', '')).toEqual([]);
  });
});

describe('mediciones', () => {
  test('se guardan con la versión 1, sin campos de contexto vacíos ni espacios', async () => {
    const p = await project();
    const m = await measurement(p.id);
    expect(m.versions).toHaveLength(1);
    expect(latest(m)).toMatchObject({ n: 1, headline: { key: 'rty', value: 0.83 } });
    expect(m.context).toEqual({ equipo: 'Day shift 1', puesto: 'llenadora' });
    expect(m.frozen).toBe(0);
  });

  test('cambiar los datos crea la versión 2 y la 1 queda en el historial', async () => {
    const p = await project();
    const m = await measurement(p.id);
    expect(await addVersion(m.id, { mode: 'direct', steps: [1] }, { key: 'rty', value: 0.9, kind: 'percent', decimals: 1 }, database)).toBe(2);
    const after = (await getMeasurement(m.id, database))!;
    expect(after.versions.map((v) => v.n)).toEqual([1, 2]);
    expect(after.versions[0]!.headline!.value).toBe(0.83);
    expect(latest(after).headline!.value).toBe(0.9);
  });

  test('una medición congelada no admite versiones nuevas hasta descongelarla', async () => {
    const p = await project();
    const m = await measurement(p.id);
    await setFrozen(m.id, true, database);
    await expect(addVersion(m.id, {}, null, database)).rejects.toThrow(FrozenError);
    await setFrozen(m.id, false, database);
    await expect(addVersion(m.id, {}, null, database)).resolves.toBe(2);
  });

  test('la lista va de la medición más reciente a la más antigua; borrar se puede deshacer', async () => {
    const p = await project();
    const old = await measurement(p.id, { name: 'vieja', measuredAt: Date.UTC(2026, 10, 1) });
    await measurement(p.id, { name: 'nueva', measuredAt: Date.UTC(2026, 10, 20) });
    expect((await listMeasurements(p.id, database)).map((m) => m.name)).toEqual(['nueva', 'vieja']);
    await deleteMeasurement(old.id, database);
    expect((await listMeasurements(p.id, database)).map((m) => m.name)).toEqual(['nueva']);
    await restoreMeasurement(old.id, database);
    expect(await listMeasurements(p.id, database)).toHaveLength(2);
  });

  test('sugerencias de contexto: los valores ya usados, del más usado al menos', async () => {
    const p = await project();
    await measurement(p.id, { context: { equipo: 'Day shift 2' } });
    await measurement(p.id, { context: { equipo: 'Day shift 1' } });
    await measurement(p.id, { context: { equipo: 'Day shift 1', puesto: 'etiquetadora' } });
    expect(await contextSuggestions(p.id, database)).toEqual({ equipo: ['Day shift 1', 'Day shift 2'], puesto: ['etiquetadora'] });
  });

  test('los datos de la medición se pueden corregir sin crear una versión', async () => {
    const p = await project();
    const m = await measurement(p.id);
    await updateMeasurementInfo(m.id, { name: ' FPY base ', note: ' turno corto ', context: { equipo: ' Day shift 2 ', puesto: '' } }, database);
    const after = (await getMeasurement(m.id, database))!;
    expect(after).toMatchObject({ name: 'FPY base', note: 'turno corto', context: { equipo: 'Day shift 2' } });
    expect(after.versions).toHaveLength(1);
  });

  test('recuerda el último proyecto y el último contexto de cada proyecto', async () => {
    const p = await project();
    expect((await lastUsed(database)).projectId).toBeNull();
    await rememberLast(p.id, { equipo: 'Day shift 1', puesto: ' ' }, database);
    const last = await lastUsed(database);
    expect(last.projectId).toBe(p.id);
    expect(await last.context(p.id)).toEqual({ equipo: 'Day shift 1' });
    expect(await last.context('otro')).toEqual({});
  });
});
