import type { Messages } from '../i18n';
import { db as defaultDb, type GembaDB } from '../data/db';
import type { SheetDef } from '../sheet/types';
import { findTool } from '../tools/registry';
import { formatDay } from './Actions';
import { formatDateTime, formatHeadline } from './live';
import { getProject, latest, listActions, listMeasurements, listMilestones } from './store';

// Informe del proyecto (fase 6): el mismo contenido para el PDF (como una
// definición de hoja con apartados de texto) y para «Copiar contexto para IA»
// (texto con marcas sencillas). Las conclusiones salen de cada herramienta,
// igual que en la hoja de Google del proyecto.

export interface ProjectReport {
  def: SheetDef;
  context: string;
}

export async function projectReport(projectId: string, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }, database: GembaDB = defaultDb): Promise<ProjectReport | null> {
  const project = await getProject(projectId, database);
  if (!project) return null;
  const r = t.projectPlus.report;
  const p = t.projects;
  const measurements = await listMeasurements(projectId, database);
  const actions = await listActions(projectId, database);
  const milestones = await listMilestones(projectId, database);

  const items: { phase: string; name: string; tool: string; date: string; headline: string; conclusion: string }[] = [];
  for (const m of measurements) {
    const tool = findTool(m.toolId);
    const v = latest(m);
    let conclusion = '';
    try {
      const fn = tool?.savedSheet ? await tool.savedSheet() : null;
      conclusion = fn?.(v.input, t, lang, opts)?.reading.find((x) => x.tone === 'conclusion')?.text ?? '';
    } catch {
      // Una medición que no se puede leer va sin conclusión.
    }
    items.push({
      phase: m.phase ? (p.phases[m.phase] ?? m.phase) : p.noPhase,
      name: m.name,
      tool: tool?.text(t).name ?? m.toolId,
      date: formatDateTime(m.measuredAt, lang),
      headline: v.headline ? formatHeadline(v.headline, t, lang) : '',
      conclusion,
    });
  }
  const phaseName = project.phase ? (p.phases[project.phase] ?? project.phase) : '';
  const actionRows = actions.map((a) => ({
    label: a.what,
    value: r.actionLine(a.who, a.due !== null ? formatDay(a.due, lang) : '', t.tools.acciones.statuses[a.status] ?? a.status),
  }));
  const header = [
    { label: r.type, value: p.types[project.type].name },
    ...(phaseName ? [{ label: r.phase, value: phaseName }] : []),
    { label: r.goal, value: project.goal.trim() || r.noGoal },
  ];
  const c = t.sheet;
  const def: SheetDef = {
    fileTitle: `${r.title} · ${project.name} · ${opts.date}`,
    tabTitle: r.title,
    heading: project.name,
    subheading: c.subheading(opts.version, opts.date),
    texts: {
      summary: c.summary,
      inputs: c.inputs,
      results: c.results,
      reading: c.reading,
      notes: c.notes,
      inputHeads: [c.inputHeads[0]!, c.inputHeads[1]!, c.inputHeads[2]!],
      resultHeads: [c.resultHeads[0]!, c.resultHeads[1]!, c.resultHeads[2]!],
      editHint: c.editHint,
      prefixes: c.prefixes,
    },
    info: { title: r.project, rows: header },
    textSections: [
      {
        title: r.measurements,
        rows: items.length
          ? items.map((x) => ({ label: `${x.phase} · ${x.name}`, value: [`${x.tool} · ${x.date}`, x.headline, x.conclusion].filter(Boolean).join('\n') }))
          : [{ label: r.noMeasurements, value: '' }],
      },
      { title: r.actions, rows: actionRows.length ? actionRows : [{ label: r.noActions, value: '' }] },
      { title: r.milestones, rows: milestones.length ? milestones.map((h) => ({ label: formatDateTime(h.at, lang), value: [h.title, h.note].filter(Boolean).join('\n') })) : [{ label: r.noMilestones, value: '' }] },
    ],
    inputs: [],
    results: [],
    reading: [],
    notes: [],
  };

  const lines = [
    r.contextIntro,
    '',
    `# ${project.name}`,
    ...header.map((h) => `- ${h.label}: ${h.value}`),
    '',
    `## ${r.measurements}`,
    ...(items.length ? items.map((x) => `- [${x.phase}] ${x.name} (${x.tool}, ${r.measuredOn(x.date)})${x.headline ? `: ${x.headline}` : ''}${x.conclusion ? `. ${x.conclusion}` : ''}`) : [`- ${r.noMeasurements}`]),
    '',
    `## ${r.actions}`,
    ...(actionRows.length ? actionRows.map((a) => `- ${a.label} (${a.value})`) : [`- ${r.noActions}`]),
    '',
    `## ${r.milestones}`,
    ...(milestones.length ? milestones.map((h) => `- ${formatDateTime(h.at, lang)}: ${h.title}${h.note ? ` — ${h.note}` : ''}`) : [`- ${r.noMilestones}`]),
  ];
  return { def, context: lines.join('\n') };
}
