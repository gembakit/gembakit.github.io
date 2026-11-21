import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../../i18n';
import { layoutSheet } from '../../sheet/layout';
import { emptyDoc, readDoc } from './types';
import { docSections } from './sheet';
import { PORQUES, porquesAnalyze, porquesExample, porquesSavedSheet } from '../porques/model';
import { ESPINA, espinaAnalyze, espinaExample } from '../espina/model';
import { A3, a3Analyze, a3Example } from '../a3/model';
import { goalMet, KAIZEN, kaizenAnalyze, kaizenExample } from '../kaizen/model';
import { PLAN_CONTROL, planControlAnalyze, planControlExample } from '../plancontrol/model';

const t = MESSAGES.es;

describe('documentos: 5 porqués', () => {
  test('el ejemplo llega a la causa raíz con su contramedida, sin avisos', () => {
    const a = porquesAnalyze(porquesExample(t), t);
    expect(a.ready).toBe(true);
    expect(a.conclusion).toMatch(/^5 porqués hasta la causa raíz: El plan de mantenimiento/);
    expect(a.conclusion).toContain('Contramedida: Añadir el cambio de juntas');
    expect(a.warnings).toEqual([]);
  });
  test('avisos: pocos porqués, sin contramedida', () => {
    const d = porquesExample(t);
    d.lists.whys = d.lists.whys!.slice(0, 2);
    d.fields.action = '';
    const a = porquesAnalyze(d, t);
    expect(a.warnings).toEqual([t.tools.porques.warn.few, t.tools.porques.warn.noAction]);
    expect(porquesAnalyze(emptyDoc(PORQUES), t).ready).toBe(false);
  });
  test('la hoja lleva un apartado por sección y cada porqué en su fila', () => {
    const def = porquesSavedSheet(porquesExample(t), t, 'es', { version: '0', date: 'x' })!;
    expect(def.textSections!.map((s) => s.title)).toEqual(['Problema', 'Por qués', 'Causa raíz y contramedida']);
    expect(def.textSections![1]!.rows.map((r) => r.label)).toEqual(['Por qué 1', 'Por qué 2', 'Por qué 3', 'Por qué 4', 'Por qué 5']);
    // Un documento: sin secciones de datos ni de resultados en la hoja.
    const grid = layoutSheet(def);
    expect(grid.rows.some((r) => r.kind === 'heads')).toBe(false);
  });
});

describe('documentos: espina de pescado', () => {
  test('el ejemplo: 9 causas en 6 categorías, dos confirmadas', () => {
    const a = espinaAnalyze(espinaExample(t), t, 'es');
    expect(a.conclusion).toBe('9 causas en 6 categorías. Confirmadas: Válvula de llenado desgastada y Ajuste distinto en cada turno. Son las que van a la acción.');
    expect(a.warnings).toEqual([]);
  });
  test('categorías sin causas: aviso con sus nombres', () => {
    const d = espinaExample(t);
    d.lists.causes = d.lists.causes!.filter((c) => c.category === 'machine' || c.category === 'method');
    expect(espinaAnalyze(d, t, 'es').warnings).toEqual(['Sin causas en mano de obra, material, medición y medio ambiente: repasa esas categorías antes de cerrar el análisis.']);
  });
  test('la hoja escribe la categoría y el estado con su nombre', () => {
    const s = docSections(ESPINA, t.tools.espina, espinaExample(t), 'es');
    expect(s[1]!.rows[0]).toEqual({ label: 'Causa 1', value: 'Válvula de llenado desgastada\nCategoría: Máquina\nEstado: Confirmada\nComprobación (opcional): Medido el 14/11: fuga de 0,3 g por ciclo' });
  });
});

describe('documentos: A3, Kaizen y plan de control', () => {
  test('A3: el ejemplo está completo; sin contramedidas, falta una sección', () => {
    expect(a3Analyze(a3Example(t), t, 'es').conclusion).toBe('Reducir el tiempo de cambio de formato en la línea 3: 6 de 6 secciones escritas. El A3 está completo: revísalo con tu responsable.');
    const d = a3Example(t);
    d.lists.actions = [{}];
    d.fields.followup = '';
    expect(a3Analyze(d, t, 'es').conclusion).toContain('Falta: contramedidas y seguimiento.');
    expect(docSections(A3, t.tools.a3, a3Example(t), 'es')[0]!.rows.find((r) => r.label === 'Fecha')!.value).toBe('3 nov 2026');
  });
  test('Kaizen: objetivos cumplidos según bajen o suban', () => {
    expect(goalMet('42', '30', '24')).toBe(true);
    expect(goalMet('42', '30', '33')).toBe(false);
    expect(goalMet('80', '90', '92')).toBe(true);
    expect(goalMet('80', '90', '')).toBeNull();
    const a = kaizenAnalyze(kaizenExample(t), t);
    expect(a.conclusion).toBe('Kaizen de cambio rápido en la línea 3: 2 de 2 objetivos cumplidos. Tiempo de cambio (min): de 42 a 24 (meta 30). Ajustes tras el arranque: de 6 a 1 (meta 2).');
    expect(KAIZEN.sections).toHaveLength(6);
  });
  test('plan de control: avisa de los controles sin plan de reacción', () => {
    const d = planControlExample(t);
    expect(planControlAnalyze(d, t, 'es').warnings).toEqual([]);
    d.lists.rows![1]!.reaction = '';
    expect(planControlAnalyze(d, t, 'es').warnings).toEqual(['Sin plan de reacción en Control 2.']);
    expect(PLAN_CONTROL.sections[1]!.list!.columns).toHaveLength(8);
  });
});

describe('documentos guardados', () => {
  test('se leen descartando lo que no es texto', () => {
    expect(readDoc({ v: 1, fields: { a: 'x', b: 3 }, lists: { l: [{ c: 'y', d: null }, 'z'] } })).toEqual({ v: 1, fields: { a: 'x' }, lists: { l: [{ c: 'y' }] } });
    expect(readDoc({ v: 2 })).toBeNull();
  });
});
