import { describe, expect, test } from 'vitest';
import { evaluateGrid, FormulaError } from './evaluate';
import { layoutSheet, SheetDefError, type Grid } from './layout';
import type { SheetDef } from './types';
import { buildSpreadsheet } from '../google/sheetsOutput';
import { exportToGoogleSheet } from '../google/exportSheet';
import { THEMES } from '../ui/theme/themes';

function def(results: SheetDef['results'], inputs: SheetDef['inputs'] = [{ key: 'a', label: 'A', value: 2, format: 'integer' }]): SheetDef {
  return {
    fileTitle: 'Prueba',
    tabTitle: 'Hoja',
    heading: 'Título',
    subheading: 'Sub',
    sections: { inputs: 'Datos', results: 'Resultados', reading: 'Cómo leerlo', notes: 'Notas' },
    inputs,
    results,
    reading: ['Una frase.'],
    notes: ['Una nota.'],
  };
}

function evaluate(formula: string): unknown {
  const grid = layoutSheet(def([{ key: 'x', label: 'X', formula, format: 'auto' }]));
  return evaluateGrid(grid)[grid.address.x!];
}

describe('evaluador de fórmulas (reglas de Excel y Google Sheets)', () => {
  test('el menos delante va antes que la potencia: -2^2 = 4', () => {
    expect(evaluate('-2^2')).toBe(4);
    expect(evaluate('0-2^2')).toBe(-4);
  });
  test('precedencia y paréntesis', () => {
    expect(evaluate('1+2*3')).toBe(7);
    expect(evaluate('(1+2)*3')).toBe(9);
    expect(evaluate('{a}*10/4')).toBe(5);
  });
  test('IF solo calcula la rama que toca; ISNUMBER no se rompe con errores', () => {
    expect(evaluate('IF({a}>1,"sí",NORM.S.INV(0))')).toBe('sí');
    expect(evaluate('ISNUMBER(NORM.S.INV(0))')).toBe(false);
  });
  test('errores como en la hoja: división entre cero y función desconocida', () => {
    expect(() => evaluate('1/0')).toThrow(FormulaError);
    expect(() => evaluate('VLOOKUP(1,2,3)')).toThrow(/#NAME\?/);
  });
});

describe('cuadrícula de la hoja', () => {
  test('cada clave tiene su celda en la columna B y las fórmulas citan esas celdas', () => {
    const grid = layoutSheet(def([{ key: 'doble', label: 'Doble', formula: '{a}*2', format: 'integer' }]));
    expect(grid.address.a).toMatch(/^B\d+$/);
    const row = grid.rows[Number(grid.address.doble!.slice(1)) - 1]!;
    expect(row.cells[1].formula).toBe(`${grid.address.a}*2`);
  });
  test('una referencia desconocida o una clave repetida se detectan al montar la hoja', () => {
    expect(() => layoutSheet(def([{ key: 'x', label: 'X', formula: '{nada}*2', format: 'auto' }]))).toThrow(SheetDefError);
    expect(() => layoutSheet(def([{ key: 'a', label: 'X', formula: '1', format: 'auto' }]))).toThrow(SheetDefError);
  });
});

describe('salida a Google Sheets', () => {
  const d = def([{ key: 'doble', label: 'Doble', formula: '{a}*2', format: 'integer', main: true }]);
  const grid: Grid = layoutSheet(d);
  const body = buildSpreadsheet(d, grid, THEMES.lino.light);

  test('se crea en región en_US, con las fórmulas con «=» y una fila por fila de la cuadrícula', () => {
    expect(body.properties.locale).toBe('en_US');
    const rows = body.sheets[0]!.data[0]!.rowData;
    expect(rows).toHaveLength(grid.rows.length);
    const r = Number(grid.address.doble!.slice(1)) - 1;
    expect(rows[r]!.values[1]).toMatchObject({ userEnteredValue: { formulaValue: `=${grid.address.a}*2` } });
  });

  test('títulos, secciones y textos ocupan las tres columnas', () => {
    const merged = new Set(body.sheets[0]!.merges.map((m) => m.startRowIndex));
    grid.rows.forEach((row, i) => {
      expect(merged.has(i)).toBe(['heading', 'sub', 'section', 'text'].includes(row.kind));
    });
  });

  test('exportar: crea la hoja y después la pasa a la región del usuario', async () => {
    const calls: { url: string; body: unknown }[] = [];
    const f = (async (url: RequestInfo | URL, init: RequestInit = {}) => {
      calls.push({ url: String(url), body: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify(calls.length === 1 ? { spreadsheetId: 'id1', spreadsheetUrl: 'https://docs.google.com/x' } : {}), { status: 200 });
    }) as typeof fetch;
    const ref = await exportToGoogleSheet('T', d, THEMES.lino.light, 'es_ES', f);
    expect(ref.url).toBe('https://docs.google.com/x');
    expect(calls[1]!.url).toContain('/id1:batchUpdate');
    expect(calls[1]!.body).toEqual({ requests: [{ updateSpreadsheetProperties: { properties: { locale: 'es_ES' }, fields: 'locale' } }] });
  });
});
