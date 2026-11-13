import type { Messages } from './types';

export const en: Messages = {
  app: {
    name: 'Gemba Kit',
  },
  nav: {
    projects: 'Projects',
    tools: 'Tools',
    toolsLong: 'Tools',
    capture: 'Capture',
    reference: 'Reference',
    settings: 'Settings',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    languageAuto: 'Automatic',
    theme: 'Color theme',
    mode: 'Mode',
    modeLight: 'Light',
    modeDark: 'Dark',
    modeSystem: 'Automatic',
    version: (v) => `Version ${v}`,
  },
  themes: {
    lino: 'Linen',
    salvia: 'Sage',
    pizarra: 'Slate',
    grafito: 'Graphite',
    ciruela: 'Plum',
    linoDesc: 'Cream and light brown',
    salviaDesc: 'Grey-green on ivory',
    pizarraDesc: 'Steel blue, understated',
    grafitoDesc: 'Neutral with amber',
    ciruelaDesc: 'Deep mauve',
    default: 'default',
  },
  common: {
    back: 'Back',
    save: 'Save',
    cancel: 'Cancel',
    undo: 'Undo',
    loadExample: 'Load example',
  },
};
