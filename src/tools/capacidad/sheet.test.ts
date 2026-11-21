import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../../i18n';
import { capability } from '../../calc/capability';
import { layoutSheet } from '../../sheet/layout';
import { evaluateGrid } from '../../sheet/evaluate';
import { capacidadSheet } from './sheet';
import { capacidadSavedSheet } from './reading';
import { FLOW_EXAMPLE, toCapabilityInput, type CapacidadSaved } from './model';

const t = MESSAGES.es;
const plain = (s: string) => s.replace(/ /g, ' ');
const FLOW: CapacidadSaved = { v: 1, name: 'Caudal', unit: '', subgroup: 1, ...FLOW_EXAMPLE };

function check(s: CapacidadSaved) {
  const r = capability(toCapabilityInput(s)).result!;
  const grid = layoutSheet(capacidadSheet(s, r, t, { reading: [], version: '0', date: 'x' }));
  const values = evaluateGrid(grid);
  const v = (k: string) => values[grid.address[k]!] as number;
  expect(v('mean')).toBeCloseTo(r.mean, 10);
  expect(v('sigmaOverall')).toBeCloseTo(r.sigmaOverall, 10);
  // Con subgrupos, la sigma dentro es un dato de la hoja (calculado en la app).
  const sw = s.subgroup > 1 ? (grid.rows[Number(grid.address.sigmaWithin!.slice(1)) - 1]!.cells[2].number as number) : v('sigmaWithin');
  expect(sw).toBeCloseTo(r.sigmaWithin, 10);
  expect(v('cpk')).toBeCloseTo(r.within.cpk, 10);
  expect(v('ppk')).toBeCloseTo(r.overall.cpk, 10);
  expect(v('ppm')).toBeCloseTo(r.overall.ppmTotal, 6);
  if (grid.address.cp) expect(v('cp')).toBeCloseTo(r.within.cp!, 10);
  if (grid.address.pp) expect(v('pp')).toBeCloseTo(r.overall.cp!, 10);
  if (grid.address.cpm) expect(v('cpm')).toBeCloseTo(r.cpm!, 10);
  return r;
}

describe('hoja de capacidad: fórmulas = cálculo', () => {
  test('caudal de NIST con límites 45 y 57 y objetivo 51 (rango móvil en la hoja)', () => check(FLOW));
  test('un solo límite (máximo)', () => check({ ...FLOW, lsl: null, target: null }));
  test('subgrupos de 2: la sigma dentro va como dato calculado en la app', () => check({ ...FLOW, subgroup: 2 }));
});

describe('capacidad guardada', () => {
  test('la lectura da Cpk, Ppk, veredicto y PPM', () => {
    const text = plain(capacidadSavedSheet(FLOW, t, 'es', { version: '0', date: 'x' })!.reading[0]!.text);
    expect(text).toMatch(/^Caudal: Cpk 1,16 a corto plazo y Ppk 0,95 a largo plazo\. Cabe, pero justo.*Cp 1,20: aunque estuviera centrado/);
  });
});
