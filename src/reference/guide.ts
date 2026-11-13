import type { Language } from '../i18n/types';

// Guía de uso de la sección Referencia: cómo funciona la app en general.
// La guía de cada herramienta vive con la herramienta y se añade al
// construirla. Cada tema lleva su texto en los dos idiomas (una prueba lo
// comprueba). Cuando cambie la app, cambia también esto.

export interface GuideText {
  title: string;
  /** Párrafos cortos, en el orden en que se leen. */
  body: string[];
}

export interface GuideTopic {
  id: string;
  es: GuideText;
  en: GuideText;
}

export const GUIDE: readonly GuideTopic[] = [
  {
    id: 'que-es',
    es: {
      title: 'Qué es Gemba Kit',
      body: [
        'Un asistente de bolsillo para Mejora Continua: te ayuda a elegir la herramienta, capturar datos en planta, calcular, entender el resultado y documentarlo.',
        'Está pensado para usarse de pie, con una mano y sin cobertura. No sustituye a Minitab ni a Excel: te ahorra montar el cálculo cada vez.',
      ],
    },
    en: {
      title: 'What Gemba Kit is',
      body: [
        'A pocket assistant for Continuous Improvement: it helps you choose the tool, capture data on the shop floor, calculate, understand the result and document it.',
        'It is designed to be used standing up, with one hand and without coverage. It does not replace Minitab or Excel: it saves you setting up the calculation every time.',
      ],
    },
  },
  {
    id: 'moverse',
    es: {
      title: 'Moverte por la app',
      body: [
        'Abajo tienes la barra con Proyectos (el inicio), Herramientas, el botón central Capturar, Referencia y Ajustes. En el ordenador, la misma barra está a la izquierda.',
        'Para volver atrás desde una herramienta, usa la flecha de arriba a la izquierda o el botón Atrás del teléfono.',
        'Los proyectos y la captura en planta llegan más adelante. Mientras tanto, las herramientas se pueden usar sin guardar.',
      ],
    },
    en: {
      title: 'Getting around',
      body: [
        'At the bottom you have the bar with Projects (the home screen), Tools, the central Capture button, Reference and Settings. On a computer, the same bar is on the left.',
        'To go back from a tool, use the arrow at the top left or the phone’s Back button.',
        'Projects and shop-floor capture arrive later. Meanwhile, the tools can be used without saving.',
      ],
    },
  },
  {
    id: 'herramienta',
    es: {
      title: 'Cómo es cada herramienta',
      body: [
        'Todas tienen los mismos cuatro bloques, siempre en este orden: Datos (lo que metes), Resultado (el número o gráfico principal), Cómo leerlo (la conclusión en una frase, los avisos y el error típico) y Acciones (guardar, exportar y ver la fórmula).',
        'Si no sabes por dónde empezar, pulsa «Cargar ejemplo»: verás un caso resuelto y publicado, con el resultado que se espera.',
        'En el ordenador, los datos quedan a la izquierda y el resultado a la derecha.',
      ],
    },
    en: {
      title: 'How every tool works',
      body: [
        'They all have the same four blocks, always in this order: Data (what you enter), Result (the main number or chart), How to read it (the conclusion in one sentence, the warnings and the typical mistake) and Actions (save, export and see the formula).',
        'If you do not know where to start, tap “Load example”: you will see a solved, published case with the expected result.',
        'On a computer, the data sit on the left and the result on the right.',
      ],
    },
  },
  {
    id: 'datos',
    es: {
      title: 'Meter datos',
      body: [
        'Puedes teclear los valores o pegar una columna de Excel o de Google Sheets: copia la columna, toca el campo y pega. Un valor por línea.',
        'Sirven la coma y el punto decimal. Antes de calcular verás cuántos valores se han leído y qué líneas se han ignorado y por qué.',
        'Si pegas algo como «1.234», la app avisa: puede ser mil doscientos treinta y cuatro o uno con doscientos treinta y cuatro. Revísalo.',
        'Importar archivos .xlsx y .csv llega con las calculadoras rápidas.',
      ],
    },
    en: {
      title: 'Entering data',
      body: [
        'You can type the values or paste a column from Excel or Google Sheets: copy the column, tap the field and paste. One value per line.',
        'Both decimal comma and decimal point work. Before calculating you will see how many values were read and which lines were ignored, and why.',
        'If you paste something like “1.234”, the app warns you: it could be one thousand two hundred thirty-four or one point two three four. Check it.',
        'Importing .xlsx and .csv files arrives with the quick calculators.',
      ],
    },
  },
  {
    id: 'siglas',
    es: {
      title: 'Siglas y términos',
      body: [
        'Las siglas subrayadas se pueden tocar: se abre su definición sin salir de la pantalla.',
        'Todos los términos están en el glosario, aquí debajo, con buscador. Busca por la sigla, por el nombre o por una palabra de la definición.',
      ],
    },
    en: {
      title: 'Acronyms and terms',
      body: [
        'Underlined acronyms can be tapped: their definition opens without leaving the screen.',
        'Every term is in the glossary, just below, with a search box. Search by acronym, by name or by a word in the definition.',
      ],
    },
  },
  {
    id: 'sin-conexion',
    es: {
      title: 'Sin conexión y versiones nuevas',
      body: [
        'Una vez instalada en la pantalla de inicio, la app funciona entera en modo avión.',
        'Cuando hay una versión nueva, aparece un aviso con el botón «Actualizar». La app no se actualiza sola, para no cambiarte nada a mitad de un trabajo. La versión que tienes se ve en Ajustes.',
      ],
    },
    en: {
      title: 'Offline and new versions',
      body: [
        'Once installed on the home screen, the app works fully in airplane mode.',
        'When there is a new version, a notice appears with an “Update” button. The app does not update by itself, so nothing changes in the middle of your work. Your version is shown in Settings.',
      ],
    },
  },
  {
    id: 'tus-datos',
    es: {
      title: 'Dónde están tus datos',
      body: [
        'En tu teléfono, y en ningún otro sitio. La app no tiene servidor y no envía nada a nadie.',
        'Conectar tu cuenta de Google será opcional y solo usará tu propio Drive, para tener lo mismo en el móvil y en el ordenador.',
        'Hasta que llegue la copia de seguridad, si desinstalas la app o borras los datos de Chrome, lo guardado se pierde.',
      ],
    },
    en: {
      title: 'Where your data lives',
      body: [
        'On your phone, and nowhere else. The app has no server and sends nothing to anyone.',
        'Connecting your Google account will be optional and will only use your own Drive, to have the same data on your phone and your computer.',
        'Until backup arrives, if you uninstall the app or clear Chrome’s data, what you saved is lost.',
      ],
    },
  },
  {
    id: 'aspecto',
    es: {
      title: 'Idioma, colores y modo oscuro',
      body: [
        'En Ajustes eliges el idioma (o que siga al del teléfono), el tema de color y el modo claro, oscuro o automático.',
        'En planta con mucha luz se lee mejor el modo claro; de noche o en zonas oscuras, el oscuro.',
      ],
    },
    en: {
      title: 'Language, colors and dark mode',
      body: [
        'In Settings you choose the language (or follow the phone’s), the color theme and light, dark or automatic mode.',
        'On a bright shop floor light mode reads better; at night or in dark areas, dark mode.',
      ],
    },
  },
];

export function guideFor(lang: Language): { id: string; text: GuideText }[] {
  return GUIDE.map((g) => ({ id: g.id, text: g[lang] }));
}
