import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../i18n';
import { descriptive } from '../calc/descriptive';
import { layoutSheet } from '../sheet/layout';
import { evaluateGrid } from '../sheet/evaluate';
import { fitSize } from '../ui/photo';
import { cronoExample, cronoReading, cronoSavedSheet, durations, readCronoSaved } from './cronometro/model';
import { conteoSavedSheet, readConteoSaved, TALLY_COUNTS } from './conteo/model';
import { byType, readWasteSaved, wasteExample, wasteReading, wasteSavedSheet } from './desperdicios/model';
import { audit, AUDIT_EXAMPLE_SCORES, auditReading, auditSavedSheet, emptyAudit } from './auditoria5s/model';

const t = MESSAGES.es;
const opts = { version: '0', date: 'x' };

describe('cronómetro', () => {
  test('duraciones desde la hora real y lectura del ejemplo (un ciclo lento)', () => {
    const s = cronoExample('Encajonado');
    const d = durations(s.laps);
    expect(d[0]).toBeCloseTo(28.4, 9);
    expect(d[7]).toBeCloseTo(45.3, 9);
    const r = descriptive(d).result!;
    const a = cronoReading(s, r, t, 'es');
    expect(a.conclusion).toMatch(/^Encajonado: 12 ciclos, con una media de 29,6 s \(de 26,8 s a 45,3 s\)\. Los ciclos varían mucho/);
    expect(a.warnings).toEqual([t.tools.descriptiva.warn.outliers(1)]);
  });
  test('la hoja calcula la media y la desviación como la app', () => {
    const s = cronoExample('Encajonado');
    const def = cronoSavedSheet(s, t, 'es', opts)!;
    const grid = layoutSheet(def);
    const v = evaluateGrid(grid);
    const r = descriptive(durations(s.laps)).result!;
    expect(v[grid.address.mean!]).toBeCloseTo(r.mean, 9);
    expect(v[grid.address.sd!]).toBeCloseTo(r.sd, 9);
    expect(def.info!.rows).toHaveLength(2);
  });
  test('vueltas imposibles (fin antes que inicio) se descartan al leer', () => {
    expect(readCronoSaved({ v: 1, name: '', laps: [{ start: 2, end: 1 }, { start: 1, end: 3 }] })!.laps).toEqual([{ start: 1, end: 3 }]);
  });
});

describe('hoja de conteo', () => {
  test('el conteo es un Pareto: total y parte en la hoja', () => {
    const s = { v: 1 as const, title: 'Defectos', startedAt: null, items: t.tools.conteo.exampleData.items.map((name, i) => ({ name, count: TALLY_COUNTS[i]! })) };
    const def = conteoSavedSheet(s, t, 'es', opts)!;
    const grid = layoutSheet(def);
    expect(evaluateGrid(grid)[grid.address.total!]).toBe(58);
    expect(def.heading).toBe('Hoja de conteo · Defectos');
    expect(readConteoSaved({ v: 1, items: [{ name: 'A', count: 1.5 }, { name: 'B', count: 2 }] })!.items).toEqual([{ name: 'B', count: 2 }]);
  });
});

describe('recorrido de desperdicios', () => {
  test('cuenta por tipo y destaca los de impacto alto', () => {
    const s = wasteExample(t);
    expect(byType(s).map((x) => [x.key, x.minutes])).toEqual([
      ['transport', 1],
      ['inventory', 1],
      ['motion', 1],
      ['waiting', 1],
      ['defects', 1],
    ]);
    expect(wasteReading(s, t)!.conclusion).toBe('Línea 3, de la llenadora al paletizado: 5 desperdicios; el tipo que más se repite es transporte. 2 son de impacto alto: empieza por ahí.');
    const grid = layoutSheet(wasteSavedSheet(s, t, 'es', opts)!);
    expect(evaluateGrid(grid)[grid.address.total!]).toBe(5);
  });
  test('solo se aceptan fotos que son imágenes, como mucho tres', () => {
    const s = readWasteSaved({ v: 1, area: '', findings: [{ type: 'x', what: 'a', photos: ['data:image/jpeg;base64,1', 'http://fuera', 'data:image/png;base64,2', 'data:image/jpeg;base64,3', 'data:image/jpeg;base64,4'] }] })!;
    expect(s.findings[0]!.type).toBe('transport');
    expect(s.findings[0]!.photos).toHaveLength(3);
    expect(s.findings[0]!.photos.every((p) => p.startsWith('data:image/'))).toBe(true);
  });
  test('las fotos se reducen a 1280 px de lado mayor sin deformarse', () => {
    expect(fitSize(4000, 3000)).toEqual({ w: 1280, h: 960 });
    expect(fitSize(800, 600)).toEqual({ w: 800, h: 600 });
    expect(fitSize(1080, 2400)).toEqual({ w: 576, h: 1280 });
  });
});

describe('auditoría 5S', () => {
  test('el ejemplo: 51 de 80 = 64 %, mejorable, Limpiar la más floja', () => {
    const s = { ...emptyAudit(), area: 'Encajonado', scores: AUDIT_EXAMPLE_SCORES.map((r) => [...r]) };
    const r = audit(s)!;
    expect(r.points).toBe(51);
    expect(r.max).toBe(80);
    expect(r.level).toBe('fair');
    expect(r.weakest).toBe(2);
    expect(auditReading(s, r, t, 'es').conclusion).toBe('Encajonado: 64 % (mejorable). La S más floja es limpiar: empieza por ahí.');
    const grid = layoutSheet(auditSavedSheet(s, t, 'es', opts)!);
    expect(evaluateGrid(grid)[grid.address.pct!]).toBeCloseTo(51 / 80, 12);
  });
  test('las preguntas sin puntuar no cuentan y se avisa', () => {
    const s = emptyAudit();
    s.scores[0] = [4, 4, -1, -1];
    const r = audit(s)!;
    expect(r.pct).toBe(1);
    expect(auditReading(s, r, t, 'es').warnings).toEqual(['Faltan 18 preguntas por puntuar: el resultado puede cambiar.']);
    expect(audit(emptyAudit())).toBeNull();
  });
});
