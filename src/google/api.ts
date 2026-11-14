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

export const MIME = {
  folder: 'application/vnd.google-apps.folder',
  spreadsheet: 'application/vnd.google-apps.spreadsheet',
  presentation: 'application/vnd.google-apps.presentation',
} as const;

/** Crea en Drive una carpeta o un archivo de Google vacío, dentro de una carpeta si se indica. */
export async function createDriveFile(token: string, name: string, mimeType: string, parent?: string, f: Fetch = fetch): Promise<{ id: string; url: string }> {
  const q = new URLSearchParams({ fields: 'id,webViewLink' });
  const res = await call(token, `${DRIVE}?${q}`, { method: 'POST', headers: json, body: JSON.stringify({ name, mimeType, ...(parent ? { parents: [parent] } : {}) }) }, f);
  const body = (await res.json()) as { id: string; webViewLink?: string };
  return { id: body.id, url: body.webViewLink ?? '' };
}

/** Texto entre comillas simples para las búsquedas de Drive (escapa ' y \). */
export function driveQuoted(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export interface DriveItem {
  id: string;
  name: string;
  trashed?: boolean;
  createdTime?: string;
  size?: string;
  webViewLink?: string;
}

/** Datos de un archivo o carpeta; null si no existe o la app ya no lo puede ver. */
export async function getDriveItem(token: string, id: string, f: Fetch = fetch): Promise<DriveItem | null> {
  const q = new URLSearchParams({ fields: 'id,name,trashed,webViewLink' });
  try {
    return (await (await call(token, `${DRIVE}/${encodeURIComponent(id)}?${q}`, {}, f)).json()) as DriveItem;
  } catch (e) {
    if (e instanceof GoogleApiError && e.status === 404) return null;
    throw e;
  }
}

/** Busca archivos que la app puede ver (con el permiso mínimo, solo los suyos). */
export async function listDriveItems(token: string, query: string, orderBy = 'createdTime desc', pageSize = 100, f: Fetch = fetch): Promise<DriveItem[]> {
  const q = new URLSearchParams({ q: query, fields: 'files(id,name,createdTime,size,webViewLink)', orderBy, pageSize: String(pageSize) });
  const body = (await (await call(token, `${DRIVE}?${q}`, {}, f)).json()) as { files?: DriveItem[] };
  return body.files ?? [];
}

/** Sube un archivo con su contenido (por ejemplo, una copia de seguridad en JSON) dentro de una carpeta. */
export async function uploadDriveFile(token: string, name: string, mimeType: string, content: string, parent: string, f: Fetch = fetch): Promise<DriveItem> {
  const boundary = `gemba-kit-${crypto.randomUUID()}`;
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify({ name, mimeType, parents: [parent] }),
    `--${boundary}`,
    `Content-Type: ${mimeType}; charset=UTF-8`,
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');
  const q = new URLSearchParams({ uploadType: 'multipart', fields: 'id,name,createdTime,size,webViewLink' });
  const res = await call(token, `${UPLOAD}?${q}`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body }, f);
  return (await res.json()) as DriveItem;
}

/** Manda un archivo a la papelera de Drive (se puede recuperar allí durante 30 días). */
export async function trashDriveItem(token: string, id: string, f: Fetch = fetch): Promise<void> {
  await call(token, `${DRIVE}/${encodeURIComponent(id)}`, { method: 'PATCH', headers: json, body: JSON.stringify({ trashed: true }) }, f);
}

/** Cambia el nombre o las propiedades de la app de un archivo o carpeta, y lo mueve a otra carpeta si se indica. */
export async function updateDriveItem(
  token: string,
  id: string,
  patch: { name?: string; appProperties?: Record<string, string> },
  move?: { to: string },
  f: Fetch = fetch,
): Promise<void> {
  const q = new URLSearchParams({ fields: 'id' });
  if (move) {
    const r = (await (await call(token, `${DRIVE}/${encodeURIComponent(id)}?fields=parents`, {}, f)).json()) as { parents?: string[] };
    q.set('addParents', move.to);
    const from = (r.parents ?? []).filter((p) => p !== move.to);
    if (from.length) q.set('removeParents', from.join(','));
  }
  await call(token, `${DRIVE}/${encodeURIComponent(id)}?${q}`, { method: 'PATCH', headers: json, body: JSON.stringify(patch) }, f);
}

/** Cuándo se modificó un archivo por última vez y quién (nombre que da Google; puede faltar). */
export async function getDriveModified(token: string, id: string, f: Fetch = fetch): Promise<{ modifiedTime?: string; by?: string; me?: boolean }> {
  const q = new URLSearchParams({ fields: 'modifiedTime,lastModifyingUser(displayName,me)' });
  const r = (await (await call(token, `${DRIVE}/${encodeURIComponent(id)}?${q}`, {}, f)).json()) as {
    modifiedTime?: string;
    lastModifyingUser?: { displayName?: string; me?: boolean };
  };
  return { modifiedTime: r.modifiedTime, by: r.lastModifyingUser?.displayName, me: r.lastModifyingUser?.me };
}

/** «'Mi pestaña'»: nombre de pestaña como rango de la API (comillas simples, dobladas dentro). */
export function tabRange(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

/** Contenido de varias pestañas enteras, con las fórmulas tal cual (sin calcular). */
export async function sheetsReadTabs(token: string, id: string, titles: string[], f: Fetch = fetch): Promise<unknown[][][]> {
  if (!titles.length) return [];
  const q = new URLSearchParams([...titles.map((t) => ['ranges', tabRange(t)]), ['valueRenderOption', 'FORMULA']]);
  const r = (await (await call(token, `${SHEETS}/${id}/values:batchGet?${q}`, {}, f)).json()) as { valueRanges?: { values?: unknown[][] }[] };
  return titles.map((_, i) => r.valueRanges?.[i]?.values ?? []);
}

/** Contenido de un archivo como texto. */
export async function downloadDriveText(token: string, id: string, f: Fetch = fetch): Promise<string> {
  return (await call(token, `${DRIVE}/${encodeURIComponent(id)}?alt=media`, {}, f)).text();
}

/** Lee la estructura de una hoja de cálculo (pestañas, gráficos…) con los campos pedidos. */
export async function sheetsGet<T>(token: string, id: string, fields: string, f: Fetch = fetch): Promise<T> {
  const q = new URLSearchParams({ fields });
  return (await call(token, `${SHEETS}/${id}?${q}`, {}, f)).json() as Promise<T>;
}

/** Cambios en una hoja de cálculo (batchUpdate). Devuelve las respuestas de cada cambio. */
export async function sheetsBatch(token: string, id: string, requests: unknown[], f: Fetch = fetch): Promise<unknown[]> {
  const res = await call(token, `${SHEETS}/${id}:batchUpdate`, { method: 'POST', headers: json, body: JSON.stringify({ requests }) }, f);
  return ((await res.json()) as { replies?: unknown[] }).replies ?? [];
}

/** Escribe valores (y fórmulas en inglés) como si los tecleara el usuario. */
export async function sheetsWrite(token: string, id: string, data: { range: string; values: unknown[][] }[], f: Fetch = fetch): Promise<void> {
  await call(token, `${SHEETS}/${id}/values:batchUpdate`, { method: 'POST', headers: json, body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }) }, f);
}

/** Exporta un archivo de Google (hoja, presentación) a otro formato, por ejemplo PDF. */
export async function exportDriveFile(token: string, id: string, mimeType: string, f: Fetch = fetch): Promise<Blob> {
  const q = new URLSearchParams({ mimeType });
  return (await call(token, `${DRIVE}/${id}/export?${q}`, {}, f)).blob();
}

const SLIDES = 'https://slides.googleapis.com/v1/presentations';

export async function slidesGet<T>(token: string, id: string, fields: string, f: Fetch = fetch): Promise<T> {
  const q = new URLSearchParams({ fields });
  return (await call(token, `${SLIDES}/${id}?${q}`, {}, f)).json() as Promise<T>;
}

export async function slidesBatch(token: string, id: string, requests: unknown[], f: Fetch = fetch): Promise<void> {
  await call(token, `${SLIDES}/${id}:batchUpdate`, { method: 'POST', headers: json, body: JSON.stringify({ requests }) }, f);
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
