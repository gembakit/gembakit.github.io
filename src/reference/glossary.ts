import type { Language } from '../i18n/types';

// Glosario de la sección Referencia y de las siglas tocables.
// Cada término lleva su texto en los dos idiomas (una prueba lo comprueba).
// Las definiciones se redactan con palabras propias: el código es público.

export const GLOSSARY_CATEGORIES = ['metodo', 'lean', 'indicador', 'estadistica'] as const;
export type GlossaryCategory = (typeof GLOSSARY_CATEGORIES)[number];

export interface GlossaryText {
  /** Como se escribe en la app (sigla o nombre corto). */
  term: string;
  /** Nombre completo o desarrollo de la sigla. */
  name: string;
  def: string;
}

export interface GlossaryEntry {
  id: string;
  category: GlossaryCategory;
  es: GlossaryText;
  en: GlossaryText;
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  {
    id: 'dmaic',
    category: 'metodo',
    es: {
      term: 'DMAIC',
      name: 'Definir, Medir, Analizar, Mejorar, Controlar',
      def: 'Método de Six Sigma para resolver, fase a fase, problemas cuya causa todavía no se conoce. Cada fase se cierra cuando se cumple lo que pide antes de pasar a la siguiente.',
    },
    en: {
      term: 'DMAIC',
      name: 'Define, Measure, Analyze, Improve, Control',
      def: 'Six Sigma method for solving, phase by phase, problems whose cause is not yet known. Each phase closes when its requirements are met, before moving on to the next.',
    },
  },
  {
    id: 'oee',
    category: 'indicador',
    es: {
      term: 'OEE',
      name: 'Eficiencia general de los equipos (Overall Equipment Effectiveness)',
      def: 'Disponibilidad × rendimiento × calidad: la parte del tiempo planificado que se convierte en piezas buenas a la velocidad ideal.',
    },
    en: {
      term: 'OEE',
      name: 'Overall Equipment Effectiveness',
      def: 'Availability × performance × quality: the share of planned time that becomes good parts at ideal speed.',
    },
  },
  {
    id: 'cpk',
    category: 'estadistica',
    es: {
      term: 'Cpk',
      name: 'Índice de capacidad del proceso, con centrado',
      def: 'Compara la distancia de la media al límite de especificación más cercano con tres desviaciones típicas del proceso. Cuanto mayor, menos piezas fuera de tolerancia.',
    },
    en: {
      term: 'Cpk',
      name: 'Process capability index, accounting for centering',
      def: 'Compares the distance from the mean to the nearest specification limit with three process standard deviations. The higher, the fewer parts out of tolerance.',
    },
  },
];

export function findTerm(id: string): GlossaryEntry | undefined {
  return GLOSSARY.find((g) => g.id === id);
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** Busca en término, nombre y definición, sin distinguir tildes ni mayúsculas. */
export function searchGlossary(query: string, lang: Language): GlossaryEntry[] {
  const q = normalize(query.trim());
  const list = q ? GLOSSARY.filter((g) => normalize(`${g[lang].term} ${g[lang].name} ${g[lang].def}`).includes(q)) : [...GLOSSARY];
  return list.sort((a, b) => a[lang].term.localeCompare(b[lang].term, lang, { sensitivity: 'base' }));
}
