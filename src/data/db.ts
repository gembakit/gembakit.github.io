import Dexie, { type EntityTable } from 'dexie';
import type { SyncedRecord } from './record';

// Esquema de la base local. Las tablas de proyectos, análisis, capturas,
// conjuntos de datos y acciones existen desde ya para que su forma no cambie;
// sus campos propios se añaden con cada fase.

export interface Project extends SyncedRecord {
  name: string;
}
export interface Analysis extends SyncedRecord {
  projectId: string;
  toolId: string;
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
  }
}

export const db = new GembaDB();
