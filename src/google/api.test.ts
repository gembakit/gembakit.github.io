import { expect, test } from 'vitest';
import { createSpreadsheet, GoogleApiError, listAppSpreadsheets, loadAppData, readTestCells, saveAppData, writeTestCells, TEST_FORMULA } from './api';

// Las pruebas no llaman a Google: un fetch falso apunta cada petición y
// responde lo que le digamos.

interface Call {
  url: string;
  init: RequestInit;
}

function fakeFetch(responses: ((url: string) => Response)[]) {
  const calls: Call[] = [];
  const f = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    const next = responses.shift();
    if (!next) throw new Error(`petición inesperada: ${url}`);
    return next(url);
  }) as typeof fetch;
  return { f, calls };
}

const ok = (body: unknown) => () => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
const header = (c: Call, name: string) => (c.init.headers as Record<string, string>)[name];

test('crea la hoja con título y región, y envía el permiso', async () => {
  const { f, calls } = fakeFetch([ok({ spreadsheetId: 'abc', spreadsheetUrl: 'https://docs.google.com/x' })]);
  const ref = await createSpreadsheet('TOKEN', 'Prueba', 'es_ES', f);
  expect(ref).toEqual({ id: 'abc', url: 'https://docs.google.com/x' });
  expect(calls[0]!.init.method).toBe('POST');
  expect(header(calls[0]!, 'Authorization')).toBe('Bearer TOKEN');
  expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ properties: { title: 'Prueba', locale: 'es_ES' } });
});

test('escribe texto, números y la fórmula en inglés interpretada como la escribiría el usuario', async () => {
  const { f, calls } = fakeFetch([ok({})]);
  await writeTestCells('T', 'abc', 'Hola', f);
  const body = JSON.parse(String(calls[0]!.init.body));
  expect(calls[0]!.url).toContain('/abc/values:batchUpdate');
  expect(body.valueInputOption).toBe('USER_ENTERED');
  expect(body.data).toContainEqual({ range: 'B3', values: [[TEST_FORMULA]] });
  expect(body.data).toContainEqual({ range: 'A3:A4', values: [[2.5], [3.5]] });
});

test('lee lo que se ve, el valor sin formato y la fórmula', async () => {
  const { f, calls } = fakeFetch([
    ok({ valueRanges: [{ values: [['Hola']] }, { values: [['6']] }] }),
    ok({ valueRanges: [{ values: [['Hola']] }, { values: [[6]] }] }),
    ok({ valueRanges: [{ values: [['Hola']] }, { values: [['=SUM(A3:A4)']] }] }),
  ]);
  expect(await readTestCells('T', 'abc', f)).toEqual({ text: 'Hola', value: 6, shown: '6', formula: '=SUM(A3:A4)' });
  expect(calls.map((c) => new URL(c.url).searchParams.get('valueRenderOption'))).toEqual(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA']);
  expect(new URL(calls[0]!.url).searchParams.getAll('ranges')).toEqual(['A1', 'B3']);
});

test('un error de Google llega con su código y su mensaje', async () => {
  const { f } = fakeFetch([() => new Response(JSON.stringify({ error: { message: 'Invalid Credentials' } }), { status: 401 })]);
  const err = await createSpreadsheet('T', 'x', 'es_ES', f).catch((e: unknown) => e);
  expect(err).toBeInstanceOf(GoogleApiError);
  expect((err as GoogleApiError).status).toBe(401);
  expect((err as GoogleApiError).message).toBe('Invalid Credentials');
});

test('busca solo hojas de cálculo que no estén en la papelera', async () => {
  const { f, calls } = fakeFetch([ok({ files: [{ id: '1', name: 'Prueba' }] })]);
  expect(await listAppSpreadsheets('T', f)).toEqual([{ id: '1', name: 'Prueba' }]);
  const q = new URL(calls[0]!.url).searchParams.get('q');
  expect(q).toContain("mimeType='application/vnd.google-apps.spreadsheet'");
  expect(q).toContain('trashed=false');
});

test('carpeta oculta: crea el archivo la primera vez y lo reemplaza después', async () => {
  const first = fakeFetch([ok({ files: [] }), ok({ id: 'n1' })]);
  await saveAppData('T', '{"a":1}', first.f);
  expect(new URL(first.calls[0]!.url).searchParams.get('spaces')).toBe('appDataFolder');
  expect(first.calls[1]!.url).toContain('uploadType=multipart');
  expect(String(first.calls[1]!.init.body)).toContain('"parents":["appDataFolder"]');
  expect(String(first.calls[1]!.init.body)).toContain('{"a":1}');

  const again = fakeFetch([ok({ files: [{ id: 'n1', name: 'prueba-conexion.json' }] }), ok({})]);
  await saveAppData('T', '{"a":2}', again.f);
  expect(again.calls[1]!.init.method).toBe('PATCH');
  expect(again.calls[1]!.url).toContain('/n1?uploadType=media');
});

test('carpeta oculta: lee el contenido, o null si no hay archivo', async () => {
  const some = fakeFetch([ok({ files: [{ id: 'n1', name: 'x' }] }), () => new Response('{"a":1}', { status: 200 })]);
  expect(await loadAppData('T', some.f)).toBe('{"a":1}');
  expect(some.calls[1]!.url).toContain('/n1?alt=media');
  const none = fakeFetch([ok({ files: [] })]);
  expect(await loadAppData('T', none.f)).toBeNull();
});
