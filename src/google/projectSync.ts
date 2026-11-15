import { createDriveFile, createSpreadsheetFrom, getDriveItem, getDriveModified, MIME, sheetsBatch, sheetsGet, sheetsReadTabs, updateDriveItem } from './api';
import { projectsFolder, type FolderMemory } from './driveFolders';
import type { TabSpec } from './sheetsOutput';

type Fetch = typeof fetch;

// Hoja de Google de un proyecto (ficha del proyecto mínimo, punto 6):
//
//   Gemba Kit / Proyectos / <proyecto> / <proyecto>   ← un único archivo
//
// Pestaña «Resumen» y una por medición. La app recuerda qué pestañas son suyas
// (por su identificador, no por su nombre), qué escribió en cada una y una
// huella de cómo quedó. Al sincronizar:
// - solo reescribe las pestañas cuyo contenido cambió en la app;
// - borra las de mediciones borradas y añade las nuevas;
// - si alguien cambió una pestaña suya en Sheets, no la pisa sin preguntar:
//   devuelve «conflict» y, según la respuesta, guarda antes esa versión como
//   pestaña aparte (del usuario) o la reescribe;
// - las pestañas del usuario no se tocan nunca;
// - cada pestaña de la app lleva aviso para todos al editarla.
//
// Las fórmulas se escriben con la hoja en región en_US (en inglés, con comas)
// y al final se vuelve a la región del usuario, cada cambio de región en su
// propio lote: así no depende de cómo lea la API los separadores en cada
// región (ESTADO.md).

/**
 * Versión del formato de las pestañas. Subirla hace que la próxima
 * sincronización reescriba una vez todas las pestañas de la app.
 * 2: las reescritas con la versión 1 podían quedar con fórmulas rotas (2026-11-15).
 */
const TAB_FORMAT = 2;

/** Lo que la app sabe de una pestaña suya. */
export interface TabState {
  sheetId: number;
  /** Huella de lo que la app quería escribir (si cambia, se reescribe). */
  source: string;
  /** Huella de cómo quedó en la hoja al escribirla (si cambia, alguien la editó). */
  written: string;
  /** Ya lleva el aviso al editarla. */
  protected: boolean;
}

export interface SheetLink {
  fileId: string;
  folderId: string;
  url: string;
  /** Nombre del proyecto con el que se nombró el archivo (para renombrarlo si cambia). */
  fileName: string;
  /** Pestañas de la app: 'summary' o el id de cada medición. */
  tabs: Record<string, TabState>;
  /** Último cambio del proyecto que ya está en la hoja. */
  syncedUpTo: number;
  /** Cuándo se sincronizó. */
  syncedAt: number;
}

export interface DesiredTab {
  /** 'summary' o el id de la medición. */
  key: string;
  /** Nombre que se quiere para la pestaña (se le añade « (2)» si ya existe). */
  title: string;
  build: (sheetId: number, title: string) => TabSpec;
}

export interface SyncInput {
  projectId: string;
  /** Nombre del proyecto: el del archivo y el de su carpeta. */
  name: string;
  /** Pestañas, en orden: «Resumen» primero y después las mediciones, la más reciente antes. */
  tabs: DesiredTab[];
  changedAt: number;
  locale: string;
  link: SheetLink | null;
  folders: { root: string; projects: string };
  memory: FolderMemory;
  /** «editada 14 nov»: se añade al nombre de la copia de una pestaña cambiada en Sheets. */
  editedSuffix: string;
  /** Qué hacer con las pestañas cambiadas en Sheets (tras preguntar). */
  resolve?: 'keep' | 'overwrite';
  /** Volver a crear el archivo si ya no está en Drive (tras preguntar). */
  recreate?: boolean;
  now?: number;
}

export type SyncResult =
  | { k: 'done'; link: SheetLink; written: number; removed: number; created: boolean }
  | { k: 'conflict'; tabs: string[]; modifiedTime?: string; by?: string; me?: boolean }
  | { k: 'missing' };

/** Huella de un texto (cyrb53): para comparar contenidos, no para seguridad. */
export function fingerprint(value: unknown): string {
  const str = JSON.stringify(value);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Lo leído de una pestaña, sin las filas y celdas vacías del final (la API las recorta a veces sí y a veces no). */
function contentPrint(values: unknown[][]): string {
  const rows = values.map((r) => {
    const out = [...r];
    while (out.length && (out[out.length - 1] === '' || out[out.length - 1] === null)) out.pop();
    return out;
  });
  while (rows.length && rows[rows.length - 1]!.length === 0) rows.pop();
  return fingerprint(rows);
}

/** Nombre libre para una pestaña: el pedido o «nombre (2)», «nombre (3)»… */
export function uniqueTitle(base: string, taken: Set<string>): string {
  const clean = base.replace(/\s+/g, ' ').trim().slice(0, 90) || 'Gemba Kit';
  if (!taken.has(clean.toLowerCase())) return clean;
  for (let n = 2; ; n++) {
    const t = `${clean} (${n})`;
    if (!taken.has(t.toLowerCase())) return t;
  }
}

interface SheetInfo {
  properties: { sheetId: number; title: string; index: number };
  protectedRanges?: { protectedRangeId: number }[];
  conditionalFormats?: unknown[];
}

const PLACEHOLDER = 'Gemba Kit';

const protect = (sheetId: number) => ({ addProtectedRange: { protectedRange: { range: { sheetId }, warningOnly: true, description: 'Gemba Kit' } } });
const locale = (l: string) => ({ updateSpreadsheetProperties: { properties: { locale: l }, fields: 'locale' } });

/** Datos, medidas, uniones y formatos condicionales de una pestaña ya vacía. */
function contentRequests(spec: TabSpec): unknown[] {
  const sheetId = spec.sheetId;
  const rows = (startIndex: number) => ({ sheetId, dimension: 'ROWS', startIndex, endIndex: startIndex + 1 });
  return [
    { updateCells: { start: { sheetId, rowIndex: 0, columnIndex: 0 }, rows: spec.rowData, fields: 'userEnteredValue,userEnteredFormat,textFormatRuns' } },
    // Filas con altura fija; las demás (textos largos), que se ajusten solas.
    ...spec.rowMetadata.map((m, i) =>
      m.pixelSize ? { updateDimensionProperties: { range: rows(i), properties: { pixelSize: m.pixelSize }, fields: 'pixelSize' } } : { autoResizeDimensions: { dimensions: rows(i) } },
    ),
    ...spec.columnMetadata.map((m, i) => ({
      updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 }, properties: { pixelSize: m.pixelSize }, fields: 'pixelSize' },
    })),
    ...spec.merges.map((range) => ({ mergeCells: { range, mergeType: 'MERGE_ALL' } })),
    ...spec.conditionalFormats.map((rule, index) => ({ addConditionalFormatRule: { rule, index } })),
  ];
}

const gridProps = (spec: TabSpec) => ({ rowCount: spec.rowCount, columnCount: spec.columnCount, hideGridlines: true });

function addRequests(spec: TabSpec, index: number): unknown[] {
  return [
    { addSheet: { properties: { sheetId: spec.sheetId, title: spec.title, index, gridProperties: gridProps(spec), tabColorStyle: { rgbColor: spec.tabColor } } } },
    protect(spec.sheetId),
    ...contentRequests(spec),
  ];
}

function rewriteRequests(spec: TabSpec, info: SheetInfo): unknown[] {
  const sheetId = spec.sheetId;
  return [
    { unmergeCells: { range: { sheetId } } },
    { updateCells: { range: { sheetId }, fields: '*' } },
    ...(info.conditionalFormats ?? []).map(() => ({ deleteConditionalFormatRule: { sheetId, index: 0 } })),
    {
      updateSheetProperties: {
        properties: { sheetId, title: spec.title, gridProperties: gridProps(spec), tabColorStyle: { rgbColor: spec.tabColor } },
        fields: 'title,gridProperties.rowCount,gridProperties.columnCount,gridProperties.hideGridlines,tabColorStyle',
      },
    },
    ...contentRequests(spec),
  ];
}

export async function syncProject(token: string, s: SyncInput, f: Fetch = fetch): Promise<SyncResult> {
  let link = s.link;
  let created = false;

  // 1. El archivo: el recordado; si ya no está en Drive, se pregunta antes de crear otro.
  if (link) {
    const item = await getDriveItem(token, link.fileId, f);
    if (!item || item.trashed) {
      if (!s.recreate) return { k: 'missing' };
      link = { ...link, fileId: '', tabs: {} };
    }
  }
  if (!link || !link.fileId) {
    const parent = await projectsFolder(token, s.folders, s.memory, f);
    let folderId = link?.folderId;
    if (folderId) {
      const folder = await getDriveItem(token, folderId, f);
      if (!folder || folder.trashed) folderId = undefined;
    }
    folderId ??= (await createDriveFile(token, s.name, MIME.folder, parent, f)).id;
    // Se crea con una pestaña provisional que se quita al final del primer lote.
    const ref = await createSpreadsheetFrom(token, { properties: { title: s.name, locale: 'en_US' }, sheets: [{ properties: { sheetId: 0, title: PLACEHOLDER } }] }, f);
    await updateDriveItem(token, ref.id, { appProperties: { gembaProject: s.projectId } }, { to: folderId }, f);
    link = { fileId: ref.id, folderId, url: ref.url, fileName: s.name, tabs: {}, syncedUpTo: 0, syncedAt: 0 };
    created = true;
  }
  const fileId = link.fileId;

  // 2. Cómo está la hoja ahora.
  const struct = await sheetsGet<{ sheets?: SheetInfo[] }>(
    token,
    fileId,
    'sheets(properties(sheetId,title,index),protectedRanges(protectedRangeId),conditionalFormats(ranges(sheetId)))',
    f,
  );
  const sheets = new Map((struct.sheets ?? []).map((sh) => [sh.properties.sheetId, sh]));
  const allIds = new Set(sheets.keys());
  const present: Record<string, TabState> = {};
  for (const [key, st] of Object.entries(link.tabs)) if (sheets.has(st.sheetId)) present[key] = st;
  const appIds = new Set(Object.values(present).map((x) => x.sheetId));
  const placeholder = created ? 0 : null;
  const taken = new Set(
    [...sheets.values()].filter((sh) => !appIds.has(sh.properties.sheetId) && sh.properties.sheetId !== placeholder).map((sh) => sh.properties.title.toLowerCase()),
  );
  const plan = s.tabs.map((d) => {
    const title = uniqueTitle(d.title, taken);
    taken.add(title.toLowerCase());
    return { d, title, source: fingerprint([TAB_FORMAT, d.build(0, title)]) };
  });
  const titleOf = (key: string) => plan.find((p) => p.d.key === key)?.title ?? sheets.get(present[key]!.sheetId)!.properties.title;

  // 3. ¿Alguien cambió en Sheets alguna pestaña de la app?
  const check = Object.entries(present).filter(([, st]) => st.written);
  const contents = await sheetsReadTabs(
    token,
    fileId,
    check.map(([, st]) => sheets.get(st.sheetId)!.properties.title),
    f,
  );
  const edited = check.filter(([, st], i) => contentPrint(contents[i]!) !== st.written).map(([k]) => k);
  if (edited.length && !s.resolve) {
    const m = await getDriveModified(token, fileId, f);
    return { k: 'conflict', tabs: edited.map((k) => sheets.get(present[k]!.sheetId)!.properties.title), ...m };
  }

  const requests: unknown[] = [];
  // 4. «Guardar sus cambios»: cada pestaña cambiada se copia como pestaña del usuario (sin aviso).
  if (s.resolve === 'keep' && edited.length) {
    const dups = edited.map((k) => {
      const sh = sheets.get(present[k]!.sheetId)!;
      const name = uniqueTitle(`${sh.properties.title} · ${s.editedSuffix}`, taken);
      taken.add(name.toLowerCase());
      return { duplicateSheet: { sourceSheetId: sh.properties.sheetId, insertSheetIndex: sh.properties.index + 1, newSheetName: name } };
    });
    const replies = (await sheetsBatch(token, fileId, dups, f)) as { duplicateSheet?: { properties?: { sheetId?: number } } }[];
    const copies = new Set(replies.map((r) => r.duplicateSheet?.properties?.sheetId).filter((x): x is number => x !== undefined));
    copies.forEach((id) => allIds.add(id));
    const after = await sheetsGet<{ sheets?: SheetInfo[] }>(token, fileId, 'sheets(properties(sheetId),protectedRanges(protectedRangeId))', f);
    for (const sh of after.sheets ?? []) {
      if (copies.has(sh.properties.sheetId)) for (const p of sh.protectedRanges ?? []) requests.push({ deleteProtectedRange: { protectedRangeId: p.protectedRangeId } });
    }
  }

  // 5. Qué pestañas añadir, reescribir o quitar.
  const newId = () => {
    let id: number;
    do id = 1 + Math.floor(Math.random() * 2_000_000_000);
    while (allIds.has(id));
    allIds.add(id);
    return id;
  };
  const tabs: Record<string, TabState> = {};
  const adds: TabSpec[] = [];
  const rewrites: unknown[] = [];
  const protects: unknown[] = [];
  let written = 0;
  for (const p of plan) {
    const key = p.d.key;
    const cur = present[key];
    if (cur && cur.source === p.source && !edited.includes(key)) {
      tabs[key] = { ...cur, protected: true };
      if (!cur.protected) protects.push(protect(cur.sheetId));
      continue;
    }
    written++;
    const sheetId = cur?.sheetId ?? newId();
    const spec = p.d.build(sheetId, p.title);
    tabs[key] = { sheetId, source: p.source, written: '', protected: true };
    if (cur) {
      rewrites.push(...rewriteRequests(spec, sheets.get(sheetId)!));
      if (!cur.protected) protects.push(protect(sheetId));
    } else adds.push(spec);
  }
  // «Resumen» delante; las mediciones nuevas justo detrás, la más reciente primero.
  const summaryId = plan[0] ? tabs[plan[0].d.key]?.sheetId : undefined;
  const summaryAdd = adds.find((spec) => spec.sheetId === summaryId);
  const addReqs: unknown[] = summaryAdd ? addRequests(summaryAdd, 0) : [];
  // Cada una entra en la posición 1: añadidas de la más antigua a la más reciente, la más reciente queda primera.
  for (const spec of adds.filter((x) => x !== summaryAdd).reverse()) addReqs.push(...addRequests(spec, 1));
  const removedKeys = Object.keys(present).filter((k) => !tabs[k]);
  const deletes = removedKeys.map((k) => ({ deleteSheet: { sheetId: present[k]!.sheetId } }));
  if (placeholder !== null) deletes.push({ deleteSheet: { sheetId: placeholder } });

  const body = [...requests, ...addReqs, ...rewrites, ...protects, ...deletes];
  if (body.length) {
    // Tres lotes: Google lee las fórmulas de un lote con la región que tenía la hoja al empezarlo,
    // aunque el lote la cambie antes. La región del usuario vuelve aunque falle la escritura.
    await sheetsBatch(token, fileId, [locale('en_US')], f);
    try {
      await sheetsBatch(token, fileId, body, f);
    } finally {
      await sheetsBatch(token, fileId, [locale(s.locale)], f);
    }
  }

  // 6. Si el proyecto cambió de nombre, el archivo y su carpeta también.
  if (!created && link.fileName !== s.name) {
    await updateDriveItem(token, fileId, { name: s.name }, undefined, f);
    await updateDriveItem(token, link.folderId, { name: s.name }, undefined, f).catch(() => undefined);
  }

  // 7. Huella de lo escrito, tal como quedó: así se sabrá si alguien lo cambia.
  const unread = Object.keys(tabs).filter((k) => !tabs[k]!.written);
  const back = await sheetsReadTabs(token, fileId, unread.map(titleOf), f);
  unread.forEach((k, i) => (tabs[k]!.written = contentPrint(back[i]!)));

  return {
    k: 'done',
    link: { ...link, tabs, fileName: s.name, syncedUpTo: s.changedAt, syncedAt: s.now ?? Date.now() },
    written,
    removed: removedKeys.length,
    created,
  };
}
