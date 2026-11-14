import { afterEach, describe, expect, test, vi } from 'vitest';
import { MESSAGES } from '../i18n';
import { THEMES } from '../ui/theme/themes';
import { createDemoFolder, createDemoPresentation, createDemoSheet } from './projectTest';

// Google simulado: comprueba el orden de las llamadas y la forma de lo que se
// envía (lo que Google rechazaría). La prueba real la hace el dueño en el paso 6.

const calls: { url: string; method: string; body: unknown }[] = [];
function fakeGoogle() {
  let n = 0;
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    const body = init.body ? JSON.parse(String(init.body)) : null;
    calls.push({ url: String(url), method: init.method ?? 'GET', body });
    let out: unknown = {};
    if (url.includes('/drive/v3/files')) out = { id: `file${++n}`, webViewLink: `https://drive/${n}` };
    else if (url.includes('sheets.googleapis.com') && init.method !== 'POST') out = { sheets: [{ properties: { sheetId: 0 } }] };
    else if (url.includes(':batchUpdate') && JSON.stringify(body).includes('addChart')) out = { replies: [{}, {}, {}, { addChart: { chart: { chartId: 777 } } }, {}] };
    else if (url.includes('slides.googleapis.com') && init.method !== 'POST')
      out = { slides: [{ objectId: 'p', pageElements: [{ objectId: 'i0', shape: { placeholder: { type: 'CENTERED_TITLE' } } }, { objectId: 'i1', shape: { placeholder: { type: 'SUBTITLE' } } }] }] };
    return new Response(JSON.stringify(out), { status: 200 });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  calls.length = 0;
});

describe('proyecto de prueba en Google', () => {
  const t = MESSAGES.es.googleTest.demo;
  const palette = THEMES.lino.light;

  test('carpeta, hoja dentro de la carpeta con aviso y gráfico, y presentación con el gráfico vinculado', async () => {
    fakeGoogle();
    const folder = await createDemoFolder('T', t);
    const sheet = await createDemoSheet('T', folder.id, t, palette, 'es_ES');
    expect(sheet.chartId).toBe(777);
    await createDemoPresentation('T', folder.id, sheet, t, palette);

    const creates = calls.filter((c) => c.url.includes('/drive/v3/files') && c.method === 'POST').map((c) => c.body as { mimeType: string; parents?: string[] });
    expect(creates.map((c) => c.mimeType.split('.').pop())).toEqual(['folder', 'spreadsheet', 'presentation']);
    expect(creates[1]!.parents).toEqual([folder.id]);
    expect(creates[2]!.parents).toEqual([folder.id]);

    const sheetReqs = calls.filter((c) => c.url.includes('sheets.googleapis.com') && c.url.includes(':batchUpdate')).flatMap((c) => (c.body as { requests: object[] }).requests);
    expect(sheetReqs).toContainEqual(expect.objectContaining({ addProtectedRange: { protectedRange: expect.objectContaining({ warningOnly: true, range: { sheetId: 0 } }) } }));

    const slideReqs = calls.filter((c) => c.url.includes('slides.googleapis.com') && c.method === 'POST').flatMap((c) => (c.body as { requests: object[] }).requests);
    const chart = slideReqs.find((r) => 'createSheetsChart' in r) as { createSheetsChart: { chartId: number; linkingMode: string; spreadsheetId: string } };
    expect(chart.createSheetsChart).toMatchObject({ chartId: 777, linkingMode: 'LINKED', spreadsheetId: sheet.id });
    // Google exige identificadores de 5 a 50 caracteres: letras, números y «_».
    const ids = JSON.stringify(slideReqs).match(/"objectId":"([^"]+)"/g)!.map((m) => m.slice(12, -1));
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_][A-Za-z0-9_:-]{4,49}$|^i[01]$|^p$/);
  });
});
