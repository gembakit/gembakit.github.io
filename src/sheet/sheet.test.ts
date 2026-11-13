import { describe, expect, test } from 'vitest';
import { evaluateGrid, FormulaError } from './evaluate';
import { layoutSheet, SheetDefError, type Grid } from './layout';
import type { SheetDef } from './types';
import { buildSpreadsheet, decimalsFor, patternFor } from '../google/sheetsOutput';
import { exportToGoogleSheet } from '../google/exportSheet';
import { THEMES } from '../ui/theme/themes';

function def(results: SheetDef['results'], inputs: SheetDef['inputs'] = [{ key: 'a', label: 'A', value: 2, format: 'integer' }]): SheetDef {
  return {
    fileTitle: 'Prueba',
    tabTitle: 'Hoja',
    heading: 'Título',
    subheading: 'Sub',
    texts: {
      summary: 'Resumen',
      inputs: 'Datos',
      results: 'Resultados',
      reading: 'Cómo leerlo',
      notes: 'Notas',
      inputHeads: ['Dato', 'Valor', 'Unidad'],
      resultHeads: ['Resultado', 'Valor', 'Cómo'],
      editHint: 'Cambia los datos.',
      prefixes: { conclusion: 'Conclusión: ', warning: 'Aviso: ' },
    },
    inputs,
    results,
    reading: [
      { tone: 'conclusion', text: 'Una frase.' },
      { tone: 'tip', text: 'Error típico: otra frase.' },
    ],
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
  test('cada clave tiene su celda en la columna C y las fórmulas citan esas celdas', () => {
    const grid = layoutSheet(def([{ key: 'doble', label: 'Doble', formula: '{a}*2', format: 'integer' }]));
    expect(grid.address.a).toMatch(/^C\d+$/);
    const row = grid.rows[Number(grid.address.doble!.slice(1)) - 1]!;
    expect(row.cells[2].formula).toBe(`${grid.address.a}*2`);
  });
  test('el resumen de arriba cita al resultado principal y da su mismo valor', () => {
    const grid = layoutSheet(def([{ key: 'doble', label: 'Doble', formula: '{a}*2', format: 'integer', main: true }]));
    const kpi = grid.rows.findIndex((r) => r.kind === 'kpi');
    expect(kpi).toBeGreaterThan(0);
    expect(kpi).toBeLessThan(Number(grid.address.doble!.slice(1)) - 1);
    expect(evaluateGrid(grid)[`C${kpi + 1}`]).toBe(4);
  });
  test('«Cómo leerlo»: los prefijos y las etiquetas propias van en negrita', () => {
    const grid = layoutSheet(def([{ key: 'x', label: 'X', formula: '1', format: 'auto' }]));
    const lines = grid.rows.filter((r) => r.kind === 'reading');
    expect(lines[0]!.cells[1]).toMatchObject({ text: 'Conclusión: Una frase.', boldPrefix: 'Conclusión: '.length });
    expect(lines[1]!.cells[1]).toMatchObject({ text: 'Error típico: otra frase.', boldPrefix: 'Error típico:'.length });
  });
  test('una referencia desconocida o una clave repetida se detectan al montar la hoja', () => {
    expect(() => layoutSheet(def([{ key: 'x', label: 'X', formula: '{nada}*2', format: 'auto' }]))).toThrow(SheetDefError);
    expect(() => layoutSheet(def([{ key: 'a', label: 'X', formula: '1', format: 'auto' }]))).toThrow(SheetDefError);
  });
});

describe('decimales de cada celda', () => {
  test('«auto» enseña tres cifras significativas sin ceros de sobra ni coma colgando', () => {
    expect(patternFor(10000, 'auto')).toBe('#,##0');
    expect(patternFor(0.05, 'auto')).toBe('#,##0.00');
    expect(patternFor(3.4, 'auto')).toBe('#,##0.0');
    expect(decimalsFor(0.0000034, 'auto')).toBe(7);
    expect(patternFor(13333.33, 'auto')).toBe('#,##0');
  });
  test('porcentajes: nunca 100 % si no lo es', () => {
    expect(patternFor(0.99, 'percent')).toBe('0.00%');
    expect(decimalsFor(0.9999966, 'percent')).toBeGreaterThan(2);
    expect(Number((0.9999966 * 100).toFixed(decimalsFor(0.9999966, 'percent')))).not.toBe(100);
  });
  test('ningún patrón termina en punto decimal', () => {
    for (const v of [0, 1, 10, 10000, 0.5, 3.4, 2.3263, 0.0000034]) {
      for (const f of ['integer', 'decimal2', 'decimal4', 'percent', 'auto'] as const) expect(patternFor(v, f)).not.toMatch(/\.%?$/);
    }
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
    expect(rows[r]!.values[2]).toMatchObject({ userEnteredValue: { formulaValue: `=${grid.address.a}*2` } });
  });

  test('títulos, secciones y textos ocupan de B a D', () => {
    const merged = new Map(body.sheets[0]!.merges.map((m) => [m.startRowIndex, m]));
    grid.rows.forEach((row, i) => {
      const wide = ['title', 'sub', 'section', 'hint', 'reading', 'note'].includes(row.kind);
      expect(merged.has(i)).toBe(wide);
      if (wide) expect(merged.get(i)).toMatchObject({ startColumnIndex: 1, endColumnIndex: 4 });
    });
  });

  test('los datos que se pueden cambiar llevan el color suave del tema', () => {
    const r = Number(grid.address.a!.slice(1)) - 1;
    const cell = body.sheets[0]!.data[0]!.rowData[r]!.values[2] as { userEnteredFormat: { backgroundColor: unknown } };
    expect(cell.userEnteredFormat.backgroundColor).toEqual({ red: 0xeb / 255, green: 0xdd / 255, blue: 0xc8 / 255 });
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
