import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { GembaDB } from '../data/db';
import { MESSAGES } from '../i18n';
import { THEMES } from '../ui/theme/themes';
import { FakeGoogle } from '../google/testing/fakeGoogle';
import { addMilestone, createProject, deleteMeasurement, saveMeasurement, updateMeasurementInfo } from './store';
import { getLink, sheetStatus, syncNow, projectsDue } from './sheetSync';

let db: GembaDB;
let g: FakeGoogle;
beforeEach(() => {
  db = new GembaDB(`s-${crypto.randomUUID()}`);
  g = new FakeGoogle();
});
afterEach(() => db.delete());

const ctx = { t: MESSAGES.es, lang: 'es' as const, palette: THEMES.lino.light };

async function project() {
  const p = await createProject({ name: 'Rechazo línea 3', type: 'dmaic', goal: 'Bajar el rechazo al 4 %', fields: [{ id: 'equipo', label: 'Equipo' }] }, db);
  const dpmo = await saveMeasurement(
    {
      projectId: p.id,
      toolId: 'dpmo',
      name: 'DPMO · 14 nov',
      phase: 'medir',
      measuredAt: new Date(2026, 10, 14, 9).getTime(),
      context: { equipo: 'Day shift 1' },
      note: 'Antes de la mejora',
      input: { units: 1000, opportunities: 5, defects: 50 },
      headline: { key: 'sigmaLevel', value: 3.83, kind: 'number', decimals: 2 },
    },
    db,
  );
  const fpy = await saveMeasurement(
    {
      projectId: p.id,
      toolId: 'fpy',
      name: 'FPY · 15 nov',
      phase: 'medir',
      measuredAt: new Date(2026, 10, 15, 9).getTime(),
      context: {},
      note: '',
      input: { mode: 'direct', steps: [{ name: '', fpy: 0.97 }, { name: '', fpy: 0.94 }, { name: '', fpy: 0.91 }] },
      headline: { key: 'rty', value: 0.8297, kind: 'percent', decimals: 1 },
    },
    db,
  );
  await addMilestone({ projectId: p.id, at: new Date(2026, 10, 16).getTime(), title: 'Implantación 5S', note: '' }, db);
  return { p, dpmo, fpy };
}

const flat = (values: unknown[][]) => values.flat().map(String);

describe('hoja de Google de un proyecto guardado', () => {
  test('crea el resumen y una pestaña por medición con su diseño y su contexto', async () => {
    const { p } = await project();
    const r = await syncNow(p.id, 'T', ctx, {}, g.fetch, db);
    expect(r).toMatchObject({ k: 'done', created: true, written: 3 });
    const link = (await getLink(p.id, db))!;
    const sheets = g.sheetsOf(link.fileId);
    expect(sheets.map((s) => s.title)).toEqual(['Resumen', 'FPY · 15 nov', 'DPMO · 14 nov']);

    const summary = flat(sheets[0]!.values);
    expect(summary).toEqual(expect.arrayContaining(['Rechazo línea 3', 'Bajar el rechazo al 4 %', 'Medir', 'Equipo', 'Day shift 1', 'Antes de la mejora', 'Implantación 5S', 'Nivel sigma']));
    expect(summary).toContain('3.83');

    const dpmo = flat(sheets[2]!.values);
    // Su sección «Medición» y el diseño de la herramienta, con fórmulas vivas.
    expect(dpmo).toEqual(expect.arrayContaining(['Medición', 'Rechazo línea 3', 'DPMO · 14 nov', 'Equipo', 'Day shift 1', 'Nota', 'Antes de la mejora', 'DPMO y nivel sigma']));
    expect(dpmo.some((x) => x.startsWith('=') && x.includes('NORM.S.INV'))).toBe(true);

    expect(await sheetStatus(p.id, db)).toMatchObject({ pending: 0 });
    expect(await projectsDue(db)).toEqual([]);
  });

  test('después de un cambio hay cambios por enviar, y al sincronizar solo se reescribe lo que cambió', async () => {
    const { p, dpmo, fpy } = await project();
    await syncNow(p.id, 'T', ctx, {}, g.fetch, db);
    await updateMeasurementInfo(dpmo.id, { note: 'Nota nueva' }, db);
    expect((await sheetStatus(p.id, db)).pending).toBe(1);
    expect(await projectsDue(db)).toEqual([p.id]);

    // La nota sale en el resumen y en la pestaña de DPMO: dos pestañas.
    expect(await syncNow(p.id, 'T', ctx, {}, g.fetch, db)).toMatchObject({ k: 'done', written: 2, removed: 0 });

    await deleteMeasurement(fpy.id, db);
    expect(await syncNow(p.id, 'T', ctx, {}, g.fetch, db)).toMatchObject({ k: 'done', written: 1, removed: 1 });
    const link = (await getLink(p.id, db))!;
    expect(g.sheetsOf(link.fileId).map((s) => s.title)).toEqual(['Resumen', 'DPMO · 14 nov']);
    expect((await sheetStatus(p.id, db)).pending).toBe(0);
  });
});
