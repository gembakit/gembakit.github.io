// Llamadas a Google Sheets y Google Drive con un permiso ya concedido.
// Funciones sueltas que reciben el permiso y, para las pruebas, un fetch falso.

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

type Fetch = typeof fetch;

export class GoogleApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call(token: string, url: string, init: RequestInit, f: Fetch): Promise<Response> {
  const res = await f(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers as Record<string, string> | undefined) } });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      message = body.error?.message ?? message;
    } catch {
      // Respuesta sin JSON: se queda el texto del estado.
    }
    throw new GoogleApiError(res.status, message);
  }
  return res;
}

const json = { 'Content-Type': 'application/json; charset=UTF-8' };

export interface SheetRef {
  id: string;
  url: string;
}

export async function createSpreadsheet(token: string, title: string, locale: string, f: Fetch = fetch): Promise<SheetRef> {
  const res = await call(token, SHEETS, { method: 'POST', headers: json, body: JSON.stringify({ properties: { title, locale } }) }, f);
  const body = (await res.json()) as { spreadsheetId: string; spreadsheetUrl: string };
  return { id: body.spreadsheetId, url: body.spreadsheetUrl };
}

/** Crea una hoja a partir de un cuerpo ya preparado (datos, formato y región). */
export async function createSpreadsheetFrom(token: string, body: unknown, f: Fetch = fetch): Promise<SheetRef> {
  const res = await call(token, SHEETS, { method: 'POST', headers: json, body: JSON.stringify(body) }, f);
  const r = (await res.json()) as { spreadsheetId: string; spreadsheetUrl: string };
  return { id: r.spreadsheetId, url: r.spreadsheetUrl };
}

/** Cambia la región de la hoja (formato de números, fechas e idioma de las fórmulas). */
export async function setSpreadsheetLocale(token: string, id: string, locale: string, f: Fetch = fetch): Promise<void> {
  const requests = [{ updateSpreadsheetProperties: { properties: { locale }, fields: 'locale' } }];
  await call(token, `${SHEETS}/${id}:batchUpdate`, { method: 'POST', headers: json, body: JSON.stringify({ requests }) }, f);
}

/** Fórmula de prueba, escrita como la pide la API (nombres y separadores en inglés). */
export const TEST_FORMULA = '=SUM(A3:A4)';
export const TEST_NUMBERS = [2.5, 3.5] as const;

/** Escribe un texto en A1, dos números en A3:A4 y la suma en B3. */
export async function writeTestCells(token: string, id: string, text: string, f: Fetch = fetch): Promise<void> {
  const data = [
    { range: 'A1', values: [[text]] },
    { range: 'A3:A4', values: TEST_NUMBERS.map((n) => [n]) },
    { range: 'B3', values: [[TEST_FORMULA]] },
  ];
  await call(token, `${SHEETS}/${id}/values:batchUpdate`, { method: 'POST', headers: json, body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }) }, f);
}

export interface TestRead {
  /** A1 tal como se ve. */
  text: string;
  /** Resultado de B3 sin formato. */
  value: number | null;
  /** Resultado de B3 tal como se ve en la hoja (con la coma o el punto de su región). */
  shown: string;
  /** Fórmula de B3 tal como la devuelve la API. */
  formula: string;
}

type ValueRanges = { valueRanges?: { values?: unknown[][] }[] };
const cell = (r: ValueRanges, i: number): unknown => r.valueRanges?.[i]?.values?.[0]?.[0];

export async function readTestCells(token: string, id: string, f: Fetch = fetch): Promise<TestRead> {
  const get = async (render: string): Promise<ValueRanges> => {
    const q = new URLSearchParams([
      ['ranges', 'A1'],
      ['ranges', 'B3'],
      ['valueRenderOption', render],
    ]);
    return (await call(token, `${SHEETS}/${id}/values:batchGet?${q}`, {}, f)).json() as Promise<ValueRanges>;
  };
  const shown = await get('FORMATTED_VALUE');
  const raw = await get('UNFORMATTED_VALUE');
  const formula = await get('FORMULA');
  const v = cell(raw, 1);
  return {
    text: String(cell(shown, 0) ?? ''),
    value: typeof v === 'number' ? v : null,
    shown: String(cell(shown, 1) ?? ''),
    formula: String(cell(formula, 1) ?? ''),
  };
}

/** Correo de la cuenta conectada (sirve para no enseñar la lista de cuentas al renovar). */
export async function getAccountEmail(token: string, f: Fetch = fetch): Promise<string | null> {
  const q = new URLSearchParams({ fields: 'user(emailAddress)' });
  const body = (await (await call(token, `https://www.googleapis.com/drive/v3/about?${q}`, {}, f)).json()) as { user?: { emailAddress?: string } };
  return body.user?.emailAddress ?? null;
}

export interface DriveFile {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
}

/** Hojas que la app puede ver (con el permiso mínimo, solo las que creó ella). */
export async function listAppSpreadsheets(token: string, f: Fetch = fetch): Promise<DriveFile[]> {
  const q = new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    fields: 'files(id,name,createdTime)',
    orderBy: 'createdTime desc',
    pageSize: '20',
  });
  const body = (await (await call(token, `${DRIVE}?${q}`, {}, f)).json()) as { files?: DriveFile[] };
  return body.files ?? [];
}

const APPDATA_NAME = 'prueba-conexion.json';

async function findAppDataFile(token: string, f: Fetch): Promise<DriveFile | null> {
  const q = new URLSearchParams({ spaces: 'appDataFolder', q: `name='${APPDATA_NAME}'`, fields: 'files(id,name,modifiedTime)' });
  const body = (await (await call(token, `${DRIVE}?${q}`, {}, f)).json()) as { files?: DriveFile[] };
  return body.files?.[0] ?? null;
}

/** Guarda un archivo pequeño en la carpeta oculta de la app (lo crea o lo reemplaza). */
export async function saveAppData(token: string, content: string, f: Fetch = fetch): Promise<void> {
  const existing = await findAppDataFile(token, f);
  if (existing) {
    await call(token, `${UPLOAD}/${existing.id}?uploadType=media`, { method: 'PATCH', headers: json, body: content }, f);
    return;
  }
  const boundary = 'gemba-kit-boundary';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify({ name: APPDATA_NAME, parents: ['appDataFolder'] }),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');
  await call(token, `${UPLOAD}?uploadType=multipart`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body }, f);
}

/** Lee el archivo de la carpeta oculta, o null si no existe. */
export async function loadAppData(token: string, f: Fetch = fetch): Promise<string | null> {
  const file = await findAppDataFile(token, f);
  if (!file) return null;
  return (await call(token, `${DRIVE}/${file.id}?alt=media`, {}, f)).text();
}
