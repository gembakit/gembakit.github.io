import Dexie, { type EntityTable } from 'dexie';
import type { SyncedRecord } from './record';

// Esquema de la base local. Las tablas de proyectos, análisis, capturas,
// conjuntos de datos y acciones existen desde ya para que su forma no cambie;
// sus campos propios se añaden con cada fase.

export type ProjectType = 'dmaic' | 'kaizen' | 'a3' | '5s' | 'seguimiento';

/** Campo de contexto de las mediciones (Equipo, Puesto…). El nombre lo pone el usuario. */
export interface ContextField {
  id: string;
  label: string;
}

export interface Project extends SyncedRecord {
  name: string;
  type: ProjectType;
  goal: string;
  /** Fase actual (identificador de PHASES[type]); vacía si el tipo no tiene fases. */
  phase: string;
  fields: ContextField[];
}

/** Resultado principal de una medición, para listas y para ordenar. */
export interface Headline {
  /** Qué es (clave de la herramienta: «sigmaLevel», «rty»…). */
  key: string;
  value: number;
  kind: 'percent' | 'number';
  decimals: number;
}

/** Una versión de los datos de una medición. La 1 es la original. */
export interface MeasurementVersion {
  n: number;
  at: number;
  /** Datos de la herramienta, en su propio formato. */
  input: unknown;
  headline: Headline | null;
}

/** Medición guardada en un proyecto (un análisis hecho con una herramienta). */
export interface Analysis extends SyncedRecord {
  projectId: string;
  toolId: string;
  name: string;
  phase: string;
  /** Cuándo se midió (lo pone el usuario; por defecto, al guardar). */
  measuredAt: number;
  /** Valor de cada campo de contexto del proyecto: {equipo: 'Day shift 1'}. */
  context: Record<string, string>;
  note: string;
  /** 1 = congelada: sus datos ya no cambian (línea base). */
  frozen: 0 | 1;
  versions: MeasurementVersion[];
}
/** Hito de un proyecto: algo que se hizo y cuándo («3 dic · implantación 5S»). */
export interface Milestone extends SyncedRecord {
  projectId: string;
  /** Cuándo pasó (lo pone el usuario). */
  at: number;
  title: string;
  note: string;
}
export interface Capture extends SyncedRecord {
  projectId: string;
  kind: string;
}
export interface Dataset extends SyncedRecord {
  projectId: string;
  name: string;
}
export interface Action extends SyncedRecord {
  projectId: string;
  what: string;
}
export interface Setting {
  key: string;
  value: unknown;
}

export class GembaDB extends Dexie {
  projects!: EntityTable<Project, 'id'>;
  analyses!: EntityTable<Analysis, 'id'>;
  milestones!: EntityTable<Milestone, 'id'>;
  captures!: EntityTable<Capture, 'id'>;
  datasets!: EntityTable<Dataset, 'id'>;
  actions!: EntityTable<Action, 'id'>;
  settings!: EntityTable<Setting, 'key'>;

  constructor(name = 'gemba-kit') {
    super(name);
    this.version(1).stores({
      projects: 'id, updatedAt, deleted',
      analyses: 'id, projectId, toolId, updatedAt, deleted',
      captures: 'id, projectId, updatedAt, deleted',
      datasets: 'id, projectId, updatedAt, deleted',
      actions: 'id, projectId, updatedAt, deleted',
      settings: 'key',
    });
    // Versión 2: hitos de los proyectos. Las tablas anteriores no cambian.
    this.version(2).stores({
      milestones: 'id, projectId, updatedAt, deleted',
    });
  }
}

export const db = new GembaDB();
