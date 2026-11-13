// Textos en español. Es el idioma de referencia: en.ts debe tener exactamente
// las mismas claves (TypeScript y una prueba lo comprueban).
export const es = {
  app: {
    name: 'Gemba Kit',
  },
  nav: {
    projects: 'Proyectos',
    tools: 'Herram.',
    toolsLong: 'Herramientas',
    capture: 'Capturar',
    reference: 'Referencia',
    settings: 'Ajustes',
  },
  settings: {
    title: 'Ajustes',
    language: 'Idioma',
    languageAuto: 'Automático',
    theme: 'Tema de color',
    mode: 'Modo',
    modeLight: 'Claro',
    modeDark: 'Oscuro',
    modeSystem: 'Automático',
    version: (v: string) => `Versión ${v}`,
  },
  themes: {
    lino: 'Lino',
    salvia: 'Salvia',
    pizarra: 'Pizarra',
    grafito: 'Grafito',
    ciruela: 'Ciruela',
    linoDesc: 'Crema y marrón claro',
    salviaDesc: 'Verde grisáceo sobre marfil',
    pizarraDesc: 'Azul acero, sobrio',
    grafitoDesc: 'Neutro con ámbar',
    ciruelaDesc: 'Malva profundo',
    default: 'por defecto',
  },
  common: {
    back: 'Volver',
    save: 'Guardar',
    cancel: 'Cancelar',
    undo: 'Deshacer',
    loadExample: 'Cargar ejemplo',
  },
};
