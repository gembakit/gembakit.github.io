import { useSyncExternalStore } from 'react';
import { CHILD_TABLES, db as defaultDb, type GembaDB } from '../data/db';
import { projectNow } from '../data/history';
import type { Messages } from '../i18n';
import { layoutSheet } from '../sheet/layout';
import { syncProject, type DesiredTab, type SheetLink, type SyncResult } from '../google/projectSync';
import { buildTab, sheetLocale } from '../google/sheetsOutput';
import { buildSummaryTab } from '../google/summaryTab';
import { folderMemory } from '../google/folderMemory';
import type { Palette } from '../ui/theme/themes';
import { findTool } from '../tools/registry';
import { APP_VERSION } from '../version';
import { PHASES } from './model';
import { formatDateTime, headlineLabel } from './live';
import { latest } from './store';

// La hoja de Google de cada proyecto, vista desde la app: qué archivo es
// (ajuste `gsheet:<proyecto>`, que viaja en la copia de seguridad), cuántos
// cambios faltan por enviar, qué pestañas tocan y el estado de la
// sincronización en curso.

const linkKey = (projectId: string) => `gsheet:${projectId}`;

export async function getLink(projectId: string, database: GembaDB = defaultDb): Promise<SheetLink | null> {
  const s = await database.settings.get(linkKey(projectId));
  return (s?.value as SheetLink | undefined) ?? null;
}

/** Cambios del proyecto (también borrados) posteriores a lo que ya está en la hoja. */
export async function pendingChanges(projectId: string, since: number, database: GembaDB = defaultDb): Promise<number> {
  const p = await database.projects.get(projectId);
  let n = p && p.updatedAt > since ? 1 : 0;
  for (const name of CHILD_TABLES) {
    n += await database
      .table<{ projectId: string; updatedAt: number }>(name)
      .where('projectId')
      .equals(projectId)
      .filter((r) => r.updatedAt > since)
      .count();
  }
  return n;
}

export interface SheetStatus {
  link: SheetLink | null;
  pending: number;
}

export async function sheetStatus(projectId: string, database: GembaDB = defaultDb): Promise<SheetStatus> {
  const link = await getLink(projectId, database);
  return { link, pending: link ? await pendingChanges(projectId, link.syncedUpTo, database) : 0 };
}

/** Proyectos con hoja y cambios por enviar (para enviarlos solos). */
export async function projectsDue(database: GembaDB = defaultDb): Promise<string[]> {
  const links = await database.settings.where('key').startsWith('gsheet:').toArray();
  const due: string[] = [];
  for (const s of links) {
    const id = s.key.slice('gsheet:'.length);
    const p = await database.projects.get(id);
    if (!p || p.deleted) continue;
    if ((await pendingChanges(id, (s.value as SheetLink).syncedUpTo, database)) > 0) due.push(id);
  }
  return due;
}

export interface SheetContext {
  t: Messages;
  lang: 'es' | 'en';
  palette: Palette;
}

/** Las pestañas que debe tener la hoja del proyecto, a partir de lo guardado. */
export async function desiredTabs(projectId: string, ctx: SheetContext, database: GembaDB = defaultDb): Promise<{ name: string; tabs: DesiredTab[]; changedAt: number } | null> {
  const now = await projectNow(database, projectId);
  if (!now || now.state.project.deleted) return null;
  const { t, lang, palette } = ctx;
  const g = t.gsheet;
  const p = t.projects;
  const project = now.state.project;
  const date = (ms: number) => formatDateTime(ms, lang);
  const hasPhases = PHASES[project.type].length > 0;
  const phaseName = (ph: string) => (ph ? (p.phases[ph] ?? ph) : p.noPhase);
  const measurements = [...now.state.children.analyses].sort((a, b) => b.measuredAt - a.measuredAt || b.createdAt - a.createdAt);
  const milestones = [...now.state.children.milestones].sort((a, b) => b.at - a.at);

  const summary: DesiredTab = {
    key: 'summary',
    title: g.summaryTab,
    build: (sheetId, title) =>
      buildSummaryTab(
        {
          title: project.name,
          subtitle: g.summarySub(date(now.changedAt)),
          texts: {
            project: g.project,
            measurements: g.measurements,
            milestones: g.milestones,
            heads: g.heads,
            milestoneHeads: g.milestoneHeads,
            noMeasurements: g.noMeasurements,
            noMilestones: g.noMilestones,
            footer: g.footer,
          },
          facts: [
            { label: g.type, value: p.types[project.type].name },
            ...(hasPhases ? [{ label: g.phase, value: phaseName(project.phase) }] : []),
            ...(project.goal ? [{ label: g.goal, value: project.goal }] : []),
            { label: g.measurementCount, value: String(measurements.length) },
            { label: g.milestoneCount, value: String(milestones.length) },
          ],
          fields: project.fields.map((f) => f.label),
          measurements: measurements.map((m) => {
            const v = latest(m);
            return {
              date: date(m.measuredAt),
              name: m.name,
              tool: findTool(m.toolId)?.text(t).name ?? m.toolId,
              phase: hasPhases ? phaseName(m.phase) : '',
              indicator: v.headline ? headlineLabel(v.headline, t) : '',
              value: v.headline?.value ?? null,
              kind: v.headline?.kind ?? 'number',
              decimals: v.headline?.decimals ?? 0,
              context: project.fields.map((f) => m.context[f.id] ?? ''),
              note: m.note,
              version: g.versionOf(m.versions.length, m.frozen === 1),
            };
          }),
          milestones: milestones.map((h) => ({ date: date(h.at), title: h.title, note: h.note })),
        },
        palette,
        sheetId,
        title,
      ),
  };

  const tabs: DesiredTab[] = [summary];
  for (const m of measurements) {
    const tool = findTool(m.toolId);
    const make = tool?.savedSheet ? await tool.savedSheet() : null;
    const v = latest(m);
    const def = make?.(v.input, t, lang, { version: APP_VERSION, date: date(v.at) });
    if (!def) continue;
    const context = project.fields.filter((f) => m.context[f.id]).map((f) => ({ label: f.label, value: m.context[f.id]! }));
    def.info = {
      title: g.info.title,
      rows: [
        { label: g.info.project, value: project.name },
        { label: g.info.name, value: m.name },
        ...(hasPhases ? [{ label: g.info.phase, value: phaseName(m.phase) }] : []),
        { label: g.info.when, value: date(m.measuredAt) },
        ...context,
        ...(m.note ? [{ label: g.info.note, value: m.note }] : []),
        { label: g.info.version, value: g.info.versionText(m.versions.length, date(v.at)) },
        ...(m.frozen ? [{ label: g.info.frozen, value: g.info.yes }] : []),
      ],
    };
    const grid = layoutSheet(def);
    tabs.push({ key: m.id, title: m.name, build: (sheetId, title) => buildTab(def, grid, palette, sheetId, title) });
  }
  return { name: project.name, tabs, changedAt: now.changedAt };
}

// ── Estado de la sincronización en curso (en memoria, por proyecto) ──────

export type SyncState =
  | { k: 'idle' }
  | { k: 'syncing'; creating: boolean }
  | { k: 'done'; written: number; removed: number; created: boolean }
  | { k: 'conflict'; tabs: string[]; modifiedTime?: string; by?: string; me?: boolean }
  | { k: 'missing' }
  | { k: 'error'; error: unknown };

const IDLE: SyncState = { k: 'idle' };
const states = new Map<string, SyncState>();
const listeners = new Set<() => void>();
function setState(projectId: string, s: SyncState) {
  states.set(projectId, s);
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export function getSyncState(projectId: string): SyncState {
  return states.get(projectId) ?? IDLE;
}

export function useSyncState(projectId: string): SyncState {
  return useSyncExternalStore(subscribe, () => getSyncState(projectId));
}

/**
 * Sincroniza la hoja del proyecto. Una a la vez por proyecto. El resultado
 * queda en el estado (para la tarjeta del proyecto) y se devuelve.
 */
export async function syncNow(
  projectId: string,
  token: string,
  ctx: SheetContext,
  opts: { resolve?: 'keep' | 'overwrite'; recreate?: boolean } = {},
  f: typeof fetch = fetch,
  database: GembaDB = defaultDb,
): Promise<SyncResult | null> {
  if (getSyncState(projectId).k === 'syncing') return null;
  const link = await getLink(projectId, database);
  setState(projectId, { k: 'syncing', creating: !link || !!opts.recreate });
  try {
    const want = await desiredTabs(projectId, ctx, database);
    if (!want) {
      setState(projectId, IDLE);
      return null;
    }
    const r = await syncProject(
      token,
      {
        projectId,
        name: want.name,
        tabs: want.tabs,
        changedAt: want.changedAt,
        locale: sheetLocale(ctx.lang),
        link,
        folders: { root: ctx.t.data.folderRoot, projects: ctx.t.data.folderProjects },
        memory: folderMemory,
        editedSuffix: ctx.t.gsheet.editedSuffix(new Date().toLocaleDateString(ctx.lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short' })),
        ...opts,
      },
      f,
    );
    if (r.k === 'done') {
      await database.settings.put({ key: linkKey(projectId), value: r.link });
      setState(projectId, { k: 'done', written: r.written, removed: r.removed, created: r.created });
    } else setState(projectId, r);
    return r;
  } catch (error) {
    setState(projectId, { k: 'error', error });
    throw error;
  }
}
