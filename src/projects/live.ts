import { createContext, useContext, useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import type { Analysis, Headline, Project } from '../data/db';
import type { Messages } from '../i18n';
import { formatNumber } from '../ui/number';
import { latest } from './store';

/**
 * Consulta a la base local que se repite sola cuando cambian los datos que
 * lee. `undefined` mientras carga.
 */
export function useLive<T>(query: () => Promise<T>, deps: readonly unknown[]): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    setValue(undefined);
    const sub = liveQuery(query).subscribe({ next: setValue, error: () => setValue(undefined) });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

/** Nombre del resultado principal de cada herramienta. */
function headlineLabel(h: Headline, t: Messages): string {
  switch (h.key) {
    case 'sigmaLevel':
      return t.tools.dpmo.sigmaLabel;
    case 'dpmo':
      return 'DPMO';
    case 'rty':
      return 'RTY';
    default:
      return h.key;
  }
}

/** «RTY 83 %», «Nivel sigma 3,83». */
export function formatHeadline(h: Headline, t: Messages, lang: 'es' | 'en'): string {
  const v = h.kind === 'percent' ? `${formatNumber(h.value * 100, lang, h.decimals)} %` : formatNumber(h.value, lang, h.decimals);
  return `${headlineLabel(h, t)} ${v}`;
}

export function formatDateTime(ms: number, lang: 'es' | 'en'): string {
  return new Date(ms).toLocaleString(lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Medición abierta ─────────────────────────────────────────────────────

export interface SavedMeasurement {
  project: Project;
  analysis: Analysis;
}

const SavedContext = createContext<SavedMeasurement | null>(null);
export const SavedProvider = SavedContext.Provider;

/** La medición guardada que se está viendo, o null si la herramienta se usa sin guardar. */
export function useSaved(): SavedMeasurement | null {
  return useContext(SavedContext);
}

/** Datos de la última versión de la medición abierta, para que la herramienta arranque con ellos. */
export function useSavedInput<T>(): T | null {
  const saved = useSaved();
  return saved ? (latest(saved.analysis).input as T) : null;
}
