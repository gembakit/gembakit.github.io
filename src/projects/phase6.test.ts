import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { GembaDB, type Action, type Analysis, type Project } from '../data/db';
import { MESSAGES } from '../i18n';
import { findTool } from '../tools/registry';
import { porquesExample } from '../tools/porques/model';
import { NEEDS, PHASE_GUIDE, phaseChecks } from './phaseGuide';
import { projectReport } from './report';
import { addAction, createProject, saveMeasurement } from './store';
import { PHASES, PROJECT_TYPES } from './model';

const t = MESSAGES.es;

describe('guía de fases', () => {
  test('cada fase de cada tipo tiene guía, con herramientas que existen y textos en los dos idiomas', () => {
    for (const type of PROJECT_TYPES) {
      for (const phase of PHASES[type]) {
        const g = PHASE_GUIDE[type][phase];
        expect(g, `${type}/${phase}`).toBeDefined();
        for (const id of g!.tools) expect(findTool(id), id).toBeDefined();
        for (const c of g!.checks) {
          expect(MESSAGES.es.projectPlus.checks[c]).toBeTruthy();
          expect(MESSAGES.en.projectPlus.checks[c]).toBeTruthy();
        }
      }
    }
    for (const n of NEEDS) {
      expect(MESSAGES.es.projectPlus.needs[n.key]).toBeTruthy();
      expect(MESSAGES.en.projectPlus.needs[n.key]).toBeTruthy();
      for (const id of n.tools) expect(findTool(id), id).toBeDefined();
    }
  });

  test('lo que falta para cerrar una fase sale de lo que tiene el proyecto', () => {
    const project = { type: 'dmaic', goal: '', phase: 'mejorar' } as Project;
    const m = (toolId: string, phase: string) => ({ toolId, phase }) as Analysis;
    const a = (status: Action['status']) => ({ status }) as Action;
    expect(phaseChecks(project, 'definir', [], [])).toEqual([{ check: 'goal', done: false }]);
    expect(phaseChecks({ ...project, goal: 'Bajar mermas' }, 'definir', [], [])).toEqual([{ check: 'goal', done: true }]);
    // La línea base cuenta solo si la medición es de datos y de esa fase.
    expect(phaseChecks(project, 'medir', [m('descriptiva', 'definir'), m('porques', 'medir')], [])[0]!.done).toBe(false);
    expect(phaseChecks(project, 'medir', [m('descriptiva', 'medir')], [])[0]!.done).toBe(true);
    expect(phaseChecks(project, 'analizar', [m('espina', 'medir')], [])[0]!.done).toBe(true);
    expect(phaseChecks(project, 'mejorar', [], [a('open'), a('done')])).toEqual([
      { check: 'actions', done: true },
      { check: 'actionsDone', done: false },
    ]);
    expect(phaseChecks(project, 'mejorar', [], [])[1]!.done).toBe(false);
    expect(phaseChecks(project, 'controlar', [m('cartas', 'controlar')], [])[0]!.done).toBe(true);
    expect(phaseChecks({ ...project, type: 'seguimiento' }, 'x', [], [])).toEqual([]);
  });
});

describe('informe del proyecto', () => {
  let database: GembaDB;
  beforeEach(() => {
    database = new GembaDB(`inf-${crypto.randomUUID()}`);
  });
  afterEach(async () => {
    await database.delete();
  });

  test('junta objetivo, mediciones con su conclusión y acciones, en el PDF y en el texto para IA', async () => {
    const p = await createProject({ name: 'Mermas línea 3', type: 'dmaic', goal: 'Bajar mermas al 2 %', fields: [] }, database);
    await saveMeasurement({ projectId: p.id, toolId: 'porques', name: 'Atascos', phase: 'analizar', measuredAt: Date.UTC(2026, 10, 20, 9), context: {}, note: '', input: porquesExample(t), headline: null }, database);
    await addAction(p.id, { what: 'Cambiar guía', who: 'Mantenimiento', due: null, status: 'open', note: '' }, database);
    const rep = (await projectReport(p.id, t, 'es', { version: '1', date: '21/11/2026' }, database))!;
    expect(rep.def.heading).toBe('Mermas línea 3');
    expect(rep.def.info!.rows.find((r) => r.label === 'Objetivo')!.value).toBe('Bajar mermas al 2 %');
    const meas = rep.def.textSections![0]!;
    expect(meas.rows).toHaveLength(1);
    expect(meas.rows[0]!.label).toBe('Analizar · Atascos');
    expect(meas.rows[0]!.value).toContain('5 porqués');
    expect(rep.context).toContain('# Mermas línea 3');
    expect(rep.context).toContain('- Objetivo: Bajar mermas al 2 %');
    expect(rep.context).toMatch(/- \[Analizar\] Atascos \(5 porqués, medida el .+\)\. \S/);
    expect(rep.context).toContain('- Cambiar guía (Mantenimiento · ');
    expect(await projectReport('no-existe', t, 'es', { version: '1', date: 'x' }, database)).toBeNull();
  });

  test('solo entra lo que el usuario elige', async () => {
    const p = await createProject({ name: 'Elegir', type: 'dmaic', goal: 'Meta', fields: [] }, database);
    const base = { projectId: p.id, toolId: 'porques', phase: 'analizar', measuredAt: Date.UTC(2026, 10, 20, 9), context: {}, note: '', input: porquesExample(t), headline: null };
    const a = await saveMeasurement({ ...base, name: 'Primera' }, database);
    await saveMeasurement({ ...base, name: 'Segunda' }, database);
    await addAction(p.id, { what: 'Cambiar guía', who: '', due: null, status: 'open', note: '' }, database);
    const opts = { version: '1', date: 'x' };
    // Una medición, sin acciones ni hitos: no salen ni como «Todavía no hay…».
    const one = (await projectReport(p.id, t, 'es', { ...opts, include: { measurements: new Set([a.id]), actions: false, milestones: false } }, database))!;
    expect(one.def.textSections!.map((x) => x.title)).toEqual(['Mediciones']);
    expect(one.def.textSections![0]!.rows.map((x) => x.label)).toEqual(['Analizar · Primera']);
    expect(one.context).not.toContain('Segunda');
    expect(one.context).not.toContain('## Acciones');
    expect(one.context).toContain('- Objetivo: Meta');
    // Ninguna medición, solo acciones.
    const none = (await projectReport(p.id, t, 'es', { ...opts, include: { measurements: new Set(), actions: true, milestones: false } }, database))!;
    expect(none.def.textSections!.map((x) => x.title)).toEqual(['Acciones']);
    expect(none.context).not.toContain('## Mediciones');
  });
});
