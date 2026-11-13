// Todo lo que se guarda lleva estos campos desde el principio, para que la
// sincronización entre dispositivos (Fase 4) se pueda añadir sin tocar las
// herramientas (PLAN.md, sección 4.1).

export type Origin = 'app' | 'sheet';

export interface SyncedRecord {
  /** Identificador único generado en el dispositivo. */
  id: string;
  createdAt: number;
  /** Fecha del último cambio (ms). Siempre crece, también dentro del mismo milisegundo. */
  updatedAt: number;
  /** 1 = borrado (va a la papelera; se puede deshacer y se propaga al sincronizar). */
  deleted: 0 | 1;
  origin: Origin;
}

let last = 0;
/** Marca de tiempo que nunca se repite ni retrocede en este dispositivo. */
export function now(): number {
  const t = Date.now();
  last = t > last ? t : last + 1;
  return last;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function newRecord<T extends object>(data: T, origin: Origin = 'app'): T & SyncedRecord {
  const t = now();
  return { ...data, id: newId(), createdAt: t, updatedAt: t, deleted: 0, origin };
}
