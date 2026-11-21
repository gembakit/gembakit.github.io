// Herramientas de documento (fase 5: 5 porqués, espina de pescado, A3,
// evento Kaizen, plan de control): en lugar de números, apartados con texto
// y listas. Cada herramienta describe su esquema y sus textos; el motor común
// (DocTool.tsx) pone los campos, la vista del documento, la hoja y el PDF.

export type FieldKind = 'text' | 'long' | 'date';

export interface DocField {
  key: string;
  kind: FieldKind;
}

export interface DocColumn {
  key: string;
  kind: FieldKind | 'select';
  /** Claves de las opciones (sus nombres, en los textos). */
  options?: readonly string[];
}

export interface DocList {
  key: string;
  columns: readonly DocColumn[];
  /** Filas con las que empieza un documento nuevo. */
  min: number;
  max: number;
}

export interface DocSection {
  key: string;
  fields?: readonly DocField[];
  list?: DocList;
}

export interface DocSchema {
  sections: readonly DocSection[];
}

/** Lo que se guarda: el texto de cada campo y las filas de cada lista. */
export interface DocData {
  v: 1;
  fields: Record<string, string>;
  lists: Record<string, Record<string, string>[]>;
}

/** Textos que el motor necesita de cada herramienta (la herramienta añade los suyos). */
export interface DocTexts {
  name: string;
  summary: string;
  empty: string;
  typicalError: string;
  guide: string[];
  method: string[];
  sections: Record<string, { title: string; hint?: string }>;
  fields: Record<string, { label: string; hint?: string; ph?: string }>;
  lists: Record<
    string,
    {
      item: (n: number) => string;
      add: string;
      columns: Record<string, { label: string; ph?: string; options?: Record<string, string> }>;
    }
  >;
  examples: { title: string; one: string; oneHint: string };
  sheet: { tab: string; file: string };
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Lee un documento guardado (o null). Lo que no es texto se descarta. */
export function readDoc(x: unknown): DocData | null {
  if (!isObj(x) || x.v !== 1 || !isObj(x.fields) || !isObj(x.lists)) return null;
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(x.fields)) if (typeof v === 'string') fields[k] = v;
  const lists: Record<string, Record<string, string>[]> = {};
  for (const [k, v] of Object.entries(x.lists)) {
    if (!Array.isArray(v)) continue;
    lists[k] = v.filter(isObj).map((row) => Object.fromEntries(Object.entries(row).filter(([, c]) => typeof c === 'string')) as Record<string, string>);
  }
  return { v: 1, fields, lists };
}

/** Documento vacío con las filas mínimas de cada lista. */
export function emptyDoc(schema: DocSchema): DocData {
  const lists: DocData['lists'] = {};
  for (const s of schema.sections) if (s.list) lists[s.list.key] = Array.from({ length: s.list.min }, () => ({}));
  return { v: 1, fields: {}, lists };
}

/** Filas con algo escrito. */
export const filledRows = (d: DocData, key: string) => (d.lists[key] ?? []).filter((r) => Object.values(r).some((v) => v.trim()));

/** Texto de un campo, sin espacios sobrantes. */
export const field = (d: DocData, key: string) => (d.fields[key] ?? '').trim();

/** «2026-11-21» → fecha en el idioma. */
export function formatDocDate(iso: string, lang: 'es' | 'en'): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
