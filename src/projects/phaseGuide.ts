import type { Action, Analysis, Project, ProjectType } from '../data/db';

// Guía de fases (fase 6): qué herramientas se suelen usar en cada fase y qué
// falta para cerrarla, comprobado con lo que ya tiene el proyecto. Y el
// asistente «¿Qué necesitas hacer?»: de una necesidad a las herramientas.

export type Check = 'goal' | 'baseline' | 'rootCause' | 'a3' | 'actions' | 'actionsDone' | 'control' | 'audit' | 'event';

export interface PhaseGuide {
  tools: string[];
  checks: Check[];
}

const DATA_TOOLS = ['descriptiva', 'capacidad', 'dpmo', 'fpy', 'cronometro', 'conteo', 'corrida', 'oee', 'takt', 'pareto', 'cartas', 'auditoria5s', 'desperdicios'];

export const PHASE_GUIDE: Record<ProjectType, Record<string, PhaseGuide>> = {
  dmaic: {
    definir: { tools: ['a3', 'pareto', 'corrida'], checks: ['goal'] },
    medir: { tools: ['descriptiva', 'capacidad', 'dpmo', 'fpy', 'oee', 'cronometro', 'conteo', 'corrida'], checks: ['baseline'] },
    analizar: { tools: ['pareto', 'porques', 'espina', 'cartas'], checks: ['rootCause'] },
    mejorar: { tools: ['acciones', 'kaizen', 'a3', 'desperdicios'], checks: ['actions', 'actionsDone'] },
    controlar: { tools: ['cartas', 'plancontrol', 'capacidad'], checks: ['control'] },
  },
  kaizen: {
    preparar: { tools: ['cronometro', 'desperdicios', 'conteo', 'takt'], checks: ['goal', 'baseline'] },
    evento: { tools: ['kaizen', 'porques', 'espina'], checks: ['event'] },
    seguimiento: { tools: ['acciones', 'corrida', 'plancontrol'], checks: ['actionsDone', 'control'] },
  },
  a3: {
    planificar: { tools: ['a3', 'pareto', 'porques', 'espina'], checks: ['goal', 'a3', 'rootCause'] },
    hacer: { tools: ['acciones', 'kaizen'], checks: ['actions'] },
    verificar: { tools: ['corrida', 'cartas', 'descriptiva'], checks: ['baseline'] },
    actuar: { tools: ['plancontrol', 'a3'], checks: ['actionsDone', 'control'] },
  },
  '5s': {
    clasificar: { tools: ['auditoria5s', 'desperdicios'], checks: ['audit'] },
    ordenar: { tools: ['acciones', 'desperdicios'], checks: ['actions'] },
    limpiar: { tools: ['auditoria5s', 'acciones'], checks: ['actions'] },
    estandarizar: { tools: ['plancontrol', 'auditoria5s'], checks: ['control'] },
    sostener: { tools: ['auditoria5s', 'acciones'], checks: ['audit', 'actionsDone'] },
  },
  seguimiento: {},
};

/** ¿Se cumple cada comprobación de la fase, con lo que tiene el proyecto? */
export function phaseChecks(project: Project, phase: string, measurements: Analysis[], actions: Action[]): { check: Check; done: boolean }[] {
  const guide = PHASE_GUIDE[project.type]?.[phase];
  if (!guide) return [];
  const has = (ids: string[]) => measurements.some((m) => ids.includes(m.toolId));
  const result = (c: Check): boolean => {
    switch (c) {
      case 'goal':
        return project.goal.trim() !== '';
      case 'baseline':
        return measurements.some((m) => m.phase === phase && DATA_TOOLS.includes(m.toolId));
      case 'rootCause':
        return has(['porques', 'espina']);
      case 'a3':
        return has(['a3']);
      case 'actions':
        return actions.length > 0;
      case 'actionsDone':
        return actions.length > 0 && actions.every((a) => a.status === 'done');
      case 'control':
        return has(['plancontrol', 'cartas']);
      case 'audit':
        return measurements.some((m) => m.toolId === 'auditoria5s' && m.phase === phase) || (phase !== 'sostener' && has(['auditoria5s']));
      case 'event':
        return has(['kaizen']);
    }
  };
  return guide.checks.map((check) => ({ check, done: result(check) }));
}

/** Necesidades del asistente «¿Qué necesitas hacer?», cada una con sus herramientas. */
export const NEEDS: { key: string; tools: string[] }[] = [
  { key: 'priority', tools: ['pareto', 'conteo'] },
  { key: 'stable', tools: ['corrida', 'cartas'] },
  { key: 'spec', tools: ['capacidad', 'descriptiva'] },
  { key: 'cause', tools: ['porques', 'espina'] },
  { key: 'time', tools: ['cronometro', 'takt'] },
  { key: 'machine', tools: ['oee'] },
  { key: 'quality', tools: ['fpy', 'dpmo'] },
  { key: 'waste', tools: ['desperdicios'] },
  { key: 'order', tools: ['auditoria5s'] },
  { key: 'act', tools: ['acciones', 'a3', 'kaizen'] },
  { key: 'sustain', tools: ['plancontrol', 'cartas'] },
  { key: 'money', tools: ['roi'] },
  { key: 'kanban', tools: ['kanban'] },
];
