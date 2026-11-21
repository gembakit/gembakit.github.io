import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { GembaDB, type Action } from '../data/db';
import { actionDue, addAction, compareActions, createProject, deleteAction, listActions, restoreAction, today, updateAction } from './store';

let database: GembaDB;
beforeEach(() => {
  database = new GembaDB(`acc-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await database.delete();
});

const DAY = 86_400_000;

describe('acciones', () => {
  test('alta, cambio a hecha con su fecha, borrado y vuelta', async () => {
    const p = await createProject({ name: 'P', type: 'kaizen', goal: '', fields: [] }, database);
    const a = await addAction(p.id, { what: ' Carro SMED ', who: 'Mantenimiento', due: today(), status: 'open', note: '' }, database);
    expect(a.what).toBe('Carro SMED');
    expect(a.doneAt).toBeNull();
    await updateAction(a.id, { what: 'Carro SMED', who: 'Mantenimiento', due: today(), status: 'done', note: 'Listo' }, database);
    const [done] = await listActions(p.id, database);
    expect(done!.status).toBe('done');
    expect(done!.doneAt).not.toBeNull();
    await deleteAction(a.id, database);
    expect(await listActions(p.id, database)).toEqual([]);
    await restoreAction(a.id, database);
    expect(await listActions(p.id, database)).toHaveLength(1);
  });

  test('vencidas y de esta semana; las hechas no cuentan', () => {
    const now = new Date(2026, 10, 21, 10).getTime();
    const t0 = today(now);
    const mk = (due: number | null, status: Action['status'] = 'open') => ({ due, status }) as Action;
    expect(actionDue([mk(t0 - DAY), mk(t0 - 3 * DAY), mk(t0), mk(t0 + 6 * DAY), mk(t0 + 8 * DAY), mk(null), mk(t0 - DAY, 'done')], now)).toEqual({ overdue: 2, soon: 2 });
  });

  test('orden: pendientes por fecha (sin fecha al final), después las hechas', () => {
    const mk = (id: string, due: number | null, status: Action['status'] = 'open', doneAt: number | null = null) => ({ id, due, status, doneAt, createdAt: 0 }) as Action;
    const list = [mk('h1', 5, 'done', 100), mk('sin', null), mk('b', 20), mk('a', 10), mk('h2', 1, 'done', 200)].sort(compareActions);
    expect(list.map((x) => x.id)).toEqual(['a', 'b', 'sin', 'h2', 'h1']);
  });
});
