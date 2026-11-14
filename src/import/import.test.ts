import { describe, expect, test } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { delimitedSheet, detectDelimiter, inferDecimal, parseDelimited, readNumber } from './table';
import { readXlsx, XlsxError } from './xlsx';
import { columnNames, extractRows, guessHeader, guessMapping, type ImportField } from './mapping';

const FIELDS: ImportField[] = [
  { key: 'name', label: 'Paso', type: 'text', required: false, hints: ['paso', 'step', 'nombre'] },
  { key: 'entering', label: 'Entran', type: 'number', required: true, hints: ['entran', 'entrada', 'in'] },
  { key: 'good', label: 'Buenas', type: 'number', required: true, hints: ['buenas', 'good'] },
];

describe('números escritos como texto', () => {
  test('coma o punto decimal, porcentajes y signo', () => {
    expect(readNumber('0,97', null)).toEqual({ value: 0.97, ambiguous: false });
    expect(readNumber('97,00%', null)!.value).toBeCloseTo(0.97, 12);
    expect(readNumber('97 %', null)!.value).toBeCloseTo(0.97, 12);
    expect(readNumber('−2,5', null)!.value).toBe(-2.5);
    expect(readNumber('1.234,5', null)!.value).toBe(1234.5);
    expect(readNumber('1,234.5', null)!.value).toBe(1234.5);
    expect(readNumber('1.234.567', null)!.value).toBe(1234567);
    expect(readNumber('1 234', null)!.value).toBe(1234);
  });
  test('«1.200» depende del separador decimal del archivo; sin saberlo, se marca', () => {
    expect(readNumber('1.200', ',')).toEqual({ value: 1200, ambiguous: false });
    expect(readNumber('1.200', '.')).toEqual({ value: 1.2, ambiguous: false });
    expect(readNumber('1.200', null)).toEqual({ value: 1.2, ambiguous: true });
  });
  test('lo que no es un número', () => {
    for (const s of ['Total', '', '1,,2', '12,', '#DIV/0!', 'TRUE']) expect(readNumber(s, null)).toBeNull();
    expect(readNumber(null, null)).toBeNull();
  });
  test('el separador decimal se deduce de los números que no dejan duda', () => {
    expect(inferDecimal(['1.200', '0,97'])).toBe(',');
    expect(inferDecimal(['1,200', '3.5'])).toBe('.');
    expect(inferDecimal(['1.200', 5])).toBeNull();
  });
});

describe('.csv y texto pegado', () => {
  test('Excel en español: punto y coma y coma decimal', () => {
    const rows = parseDelimited('﻿Paso;Entran;Buenas\r\nSoldadura;1.200;1.150\r\nPintura;1.150;1.100,5\r\n');
    expect(detectDelimiter('a;b\n1;2')).toBe(';');
    expect(rows).toEqual([
      ['Paso', 'Entran', 'Buenas'],
      ['Soldadura', '1.200', '1.150'],
      ['Pintura', '1.150', '1.100,5'],
    ]);
    const ex = extractRows(rows, guessHeader(rows), guessMapping(rows, 0, FIELDS), FIELDS);
    expect(ex.rows.map((r) => r.values)).toEqual([
      { name: 'Soldadura', entering: 1200, good: 1150 },
      { name: 'Pintura', entering: 1150, good: 1100.5 },
    ]);
    expect(ex.ambiguous).toEqual([]);
  });
  test('Google Sheets en español: comas y números entre comillas', () => {
    const rows = parseDelimited('Paso,FPY\nCorte,"97,00%"\n"Montaje, final","94,50%"\n');
    expect(rows).toEqual([
      ['Paso', 'FPY'],
      ['Corte', '97,00%'],
      ['Montaje, final', '94,50%'],
    ]);
  });
  test('filas pegadas desde la app de Sheets: tabuladores, sin títulos', () => {
    const rows = parseDelimited('Corte\t200\t186\nMontaje\t186\t180');
    expect(guessHeader(rows)).toBeNull();
    const map = guessMapping(rows, null, FIELDS);
    expect(map).toEqual({ name: 0, entering: 1, good: 2 });
    expect(extractRows(rows, null, map, FIELDS).rows).toHaveLength(2);
  });
  test('«1.200» sin más pistas: con «;» es mil doscientos; en un dato entero, también', () => {
    const text = 'Paso;Entran;Buenas\nA;1.200;1.150\n';
    const sheet = delimitedSheet('x', text);
    expect(sheet.decimal).toBe(',');
    expect(extractRows(sheet.rows, 0, { name: 0, entering: 1, good: 2 }, FIELDS, sheet.decimal).rows[0]!.values).toEqual({ name: 'A', entering: 1200, good: 1150 });
    // Pegado con tabuladores (sin pista): solo los datos enteros se leen como miles.
    const pasted = delimitedSheet('x', 'A\t1.200\t1,150');
    expect(pasted.decimal).toBeUndefined();
    const ints = FIELDS.map((f) => (f.type === 'number' ? { ...f, integer: true } : f));
    expect(extractRows(pasted.rows, null, { name: 0, entering: 1, good: 2 }, ints).rows[0]!.values).toEqual({ name: 'A', entering: 1200, good: 1150 });
    const loose = extractRows(pasted.rows, null, { name: 0, entering: 1, good: 2 }, FIELDS);
    expect(loose.rows[0]!.values).toEqual({ name: 'A', entering: 1.2, good: 1.15 });
    expect(loose.ambiguous).toHaveLength(2);
  });
  test('una sola columna', () => {
    expect(parseDelimited('97\n94\n91')).toEqual([['97'], ['94'], ['91']]);
  });
  test('celda entre comillas con salto de línea', () => {
    expect(parseDelimited('"Paso\nlargo";1\nB;2')).toEqual([
      ['Paso\nlargo', '1'],
      ['B', '2'],
    ]);
  });
});

describe('títulos, columnas y filas descartadas', () => {
  const rows = [
    ['Línea 3 — semana 45', null, null, null],
    [null, null, null, null],
    ['Operación', 'Notas', 'Buenas a la 1.ª', 'Unidades que entran'],
    ['Corte', 'ok', 186, 200],
    ['Total', null, 'n/d', 400],
    ['Montaje', null, 180, 186],
  ];
  test('la fila de títulos es la de antes de los números, aunque haya un título encima', () => {
    expect(guessHeader(rows)).toBe(2);
  });
  test('cada dato va a su columna por el título, en cualquier orden', () => {
    const map = guessMapping(rows, 2, [{ ...FIELDS[0]!, hints: ['paso', 'operacion'] }, { ...FIELDS[1]!, hints: ['entran', 'unidades'] }, FIELDS[2]!]);
    expect(map).toEqual({ name: 0, entering: 3, good: 2 });
    expect(columnNames(rows, 2)).toEqual(['A · Operación', 'B · Notas', 'C · Buenas a la 1.ª', 'D · Unidades que entran']);
  });
  test('una fila sin número en un dato obligatorio se descarta y se dice cuál', () => {
    const ex = extractRows(rows, 2, { name: 0, entering: 3, good: 2 }, FIELDS);
    expect(ex.rows.map((r) => r.line)).toEqual([4, 6]);
    expect(ex.skipped).toEqual([{ line: 5, field: 'Buenas', raw: 'n/d' }]);
  });
});

// .xlsx montado como lo guarda Excel: textos compartidos (uno con formato
// enriquecido), una fórmula con su último valor, un porcentaje, una celda
// saltada, una hoja oculta y espacios de nombres con prefijo.
function fakeXlsx(): Uint8Array {
  const ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  return zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
    'xl/workbook.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook ${ns}><sheets><sheet name="Pasos" sheetId="1" r:id="rId1"/><sheet name="Oculta" sheetId="2" state="hidden" r:id="rId2"/><sheet name="Otra" sheetId="3" r:id="rId3"/></sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="x" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="x" Target="/xl/worksheets/sheet3.xml"/></Relationships>',
    ),
    'xl/sharedStrings.xml': strToU8(
      `<?xml version="1.0"?><sst ${ns} count="4" uniqueCount="4"><si><t>Paso</t></si><si><t>Entran</t></si><si><r><rPr><b/></rPr><t>Buenas </t></r><r><t>a la 1.ª</t></r></si><si><t>Soldadura</t></si></sst>`,
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      `<?xml version="1.0"?><x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheetData>
        <x:row r="1"><x:c r="A1" t="s"><x:v>0</x:v></x:c><x:c r="B1" t="s"><x:v>1</x:v></x:c><x:c r="C1" t="s"><x:v>2</x:v></x:c><x:c r="D1" t="inlineStr"><x:is><x:t>FPY</x:t></x:is></x:c></x:row>
        <x:row r="2"><x:c r="A2" t="s"><x:v>3</x:v></x:c><x:c r="B2"><x:v>200</x:v></x:c><x:c r="C2"><x:v>186</x:v></x:c><x:c r="D2" s="1"><x:f>C2/B2</x:f><x:v>0.93</x:v></x:c></x:row>
        <x:row r="4"><x:c r="B4"><x:v>186</x:v></x:c><x:c r="D4" t="e"><x:v>#DIV/0!</x:v></x:c></x:row>
      </x:sheetData></x:worksheet>`,
    ),
    'xl/worksheets/sheet2.xml': strToU8(`<worksheet ${ns}><sheetData/></worksheet>`),
    'xl/worksheets/sheet3.xml': strToU8(`<worksheet ${ns}><sheetData><row r="2"><c r="C2" t="str"><v>hola</v></c></row></sheetData></worksheet>`),
  });
}

describe('.xlsx', () => {
  test('lee valores, textos compartidos, fórmulas con su valor y salta las hojas ocultas', () => {
    const sheets = readXlsx(fakeXlsx());
    expect(sheets.map((s) => s.name)).toEqual(['Pasos', 'Otra']);
    expect(sheets[0]!.rows).toEqual([
      ['Paso', 'Entran', 'Buenas a la 1.ª', 'FPY'],
      ['Soldadura', 200, 186, 0.93],
      [null, null, null, null],
      [null, 186, null, '#DIV/0!'],
    ]);
    expect(sheets[1]!.rows).toEqual([[null, null, null], [null, null, 'hola']]);
  });
  test('un archivo que no es .xlsx da un error claro', () => {
    expect(() => readXlsx(strToU8('Paso;Entran'))).toThrow(XlsxError);
    expect(() => readXlsx(zipSync({ 'a.txt': strToU8('x') }))).toThrow(XlsxError);
  });
});
