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
        'Las herramientas se pueden usar sin guardar. Para guardar un resultado, va dentro de un proyecto (ver «Proyectos y mediciones»). La captura en planta llega más adelante.',
      ],
    },
    en: {
      title: 'Getting around',
      body: [
        'At the bottom you have the bar with Projects (the home screen), Tools, the central Capture button, Reference and Settings. On a computer, the same bar is on the left.',
        'To go back from a tool, use the arrow at the top left or the phone’s Back button.',
        'The tools can be used without saving. To save a result, it goes inside a project (see “Projects and measurements”). Shop-floor capture arrives later.',
      ],
    },
  },
  {
    id: 'proyectos',
    es: {
      title: 'Proyectos y mediciones',
      body: [
        'Crea un proyecto desde Proyectos: nombre, tipo (DMAIC, Kaizen rápido, A3 · PDCA, 5S o Seguimiento de proceso, que da las fases) y, si quieres, el objetivo. También eliges los datos de contexto que apuntarás en cada medición: Equipo, Puesto, Línea… Puedes renombrarlos, quitarlos o añadir otros.',
        'Con un resultado en pantalla, pulsa «Guardar en un proyecto». El último proyecto usado ya viene elegido, con su fase actual. Pon el nombre, la fecha y hora y el contexto (todo opcional; la app te ofrece los valores que ya usaste, para escribirlos siempre igual) y una nota.',
        'Cada vez que mides de nuevo es una medición nueva. Si cambias los datos de una medición ya guardada, se guarda como versión 2, 3…; las anteriores quedan en su historial.',
        '«Congelar» deja una medición fija, por ejemplo la línea base de la fase Medir: sus datos ya no cambian hasta que la descongeles.',
        'En el proyecto, el recorrido de fases enseña cuáles están completadas (✓), cuál es la actual y cuáles faltan. Toca una para hacerla la actual: las anteriores quedan completadas y las mediciones nuevas se guardan en ella. Debajo, las mediciones agrupadas por fase. Borrar un proyecto o una medición se puede deshacer al momento.',
        'Con dos mediciones o más aparece «Filtrar y ordenar»: por herramienta, fase y cualquier dato de contexto (Equipo, Puesto…), combinables, y por fecha o por resultado. Por resultado solo cuando queda una sola herramienta, porque no tiene sentido ordenar juntos un RTY y un DPMO. El filtro se mantiene al entrar en una medición y volver.',
        'En «Hitos» apunta lo que hiciste y cuándo, por ejemplo «implantación 5S en la llenadora», con una nota. Más adelante se verán marcados en los gráficos de Evolución, para comparar el antes y el después.',
        'El lápiz de arriba edita el proyecto: nombre, objetivo, tipo y campos de contexto. En una medición guardada, el lápiz corrige su nombre, fase, fecha, contexto y nota sin crear una versión nueva, también si está congelada.',
        'Por ahora todo se guarda solo en este aparato. La copia de seguridad y la hoja de Google del proyecto llegan en los próximos pasos.',
        'Si el almacenamiento del teléfono tarda o no responde, aparece un aviso arriba con «Recargar» y «Copiar detalles»; tus datos no se pierden. El mismo registro técnico está en Ajustes → Diagnóstico: cópialo y pégalo en el chat si algo va lento.',
      ],
    },
    en: {
      title: 'Projects and measurements',
      body: [
        'Create a project from Projects: name, type (DMAIC, Quick Kaizen, A3 · PDCA, 5S or Process monitoring, which sets the phases) and, if you like, the goal. You also choose the context details you will note with each measurement: Crew, Station, Line… You can rename them, remove them or add others.',
        'With a result on screen, tap “Save to a project”. The last project used is already selected, with its current phase. Enter the name, date and time and the context (all optional; the app offers the values you already used, so they are always written the same way) and a note.',
        'Every time you measure again it is a new measurement. If you change the data of a saved measurement, it is saved as version 2, 3…; the earlier ones stay in its history.',
        '“Freeze” fixes a measurement, for example the Measure-phase baseline: its data no longer change until you unfreeze it.',
        'In the project, the phase track shows which phases are completed (✓), which is current and which are left. Tap one to make it current: the earlier ones show as completed and new measurements are saved to it. Below, the measurements grouped by phase. Deleting a project or a measurement can be undone straight away.',
        'With two or more measurements, “Filter and sort” appears: by tool, phase and any context detail (Crew, Station…), combined, and by date or by result. By result only when a single tool is left, because sorting an RTY and a DPMO together makes no sense. The filter is kept when you open a measurement and come back.',
        'Under “Milestones”, note what you did and when, for example “5S rollout on the filler”, with a note. Later they will be marked on the Evolution charts, to compare before and after.',
        'The pencil at the top edits the project: name, goal, type and context fields. In a saved measurement, the pencil corrects its name, phase, date, context and note without creating a new version, even when it is frozen.',
        'For now everything is saved only on this device. Backup and the project’s Google sheet come in the next steps.',
        'If the phone storage is slow or stops responding, a notice appears at the top with “Reload” and “Copy details”; your data is not lost. The same technical log is in Settings → Diagnostics: copy it and paste it in the chat if something is slow.',
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
        'Arriba de cada herramienta, «Cómo usarla» se despliega con los pasos para usarla bien.',
        'Cada valor calculado del resultado se puede tocar (el nombre lleva un subrayado de puntos): se abre de dónde sale, con la fórmula escrita con letras, después con tus números y el resultado, por ejemplo «DPU = D ÷ U = 50 ÷ 1.000 = 0,05», y debajo qué es cada letra.',
        'En el ordenador, los datos quedan a la izquierda y el resultado a la derecha.',
      ],
    },
    en: {
      title: 'How every tool works',
      body: [
        'They all have the same four blocks, always in this order: Data (what you enter), Result (the main number or chart), How to read it (the conclusion in one sentence, the warnings and the typical mistake) and Actions (save, export and see the formula).',
        'If you do not know where to start, tap “Load example”: you will see a solved, published case with the expected result.',
        'At the top of every tool, “How to use it” opens with the steps to use it well.',
        'Every calculated value in the result can be tapped (its name has a dotted underline): it opens where it comes from, with the formula in letters, then with your numbers and the result, for example “DPU = D ÷ U = 50 ÷ 1,000 = 0.05”, and below what each letter is.',
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
        'Si pegas algo como «1.234», la app avisa: puede ser mil doscientos treinta y cuatro o uno con doscientos treinta y cuatro. Revísalo. En datos que solo pueden ser enteros (unidades), «1.200» se lee como mil doscientos.',
        'Las herramientas que piden una lista (por ejemplo, los pasos de FPY y RTY) tienen el botón «Importar»: eliges un Excel (.xlsx) o un .csv del teléfono o de Drive, o pegas las filas copiadas de Excel o Sheets.',
        'Al importar, la app busca la fila de títulos y qué columna es cada dato; si se equivoca, lo cambias en los desplegables. Antes de aceptar ves una vista previa y las filas que no se usarán, con el motivo. Lo importado sustituye los datos que había, y se puede deshacer.',
      ],
    },
    en: {
      title: 'Entering data',
      body: [
        'You can type the values or paste a column from Excel or Google Sheets: copy the column, tap the field and paste. One value per line.',
        'Both decimal comma and decimal point work. Before calculating you will see how many values were read and which lines were ignored, and why.',
        'If you paste something like “1.234”, the app warns you: it could be one thousand two hundred thirty-four or one point two three four. Check it. In data that can only be whole numbers (units), “1.200” is read as one thousand two hundred.',
        'Tools that take a list (for example, the steps in FPY and RTY) have an “Import” button: choose an Excel (.xlsx) or .csv file from the phone or Drive, or paste rows copied from Excel or Sheets.',
        'When importing, the app finds the title row and which column is each piece of data; if it gets it wrong, change it in the drop-downs. Before accepting you see a preview and the rows that will not be used, with the reason. Imported data replace what was there, and you can undo it.',
      ],
    },
  },
  {
    id: 'exportar',
    es: {
      title: 'Exportar a Google Sheets',
      body: [
        'Con un resultado en pantalla, pulsa «Exportar» y después «Crear hoja». La primera vez Google te pide permiso; después, como mucho verás una ventana que se abre y se cierra sola.',
        'La hoja se crea en tu Drive con un resumen arriba, los datos en celdas de color, los resultados con sus fórmulas, «Cómo leerlo» y notas. Si cambias un dato de color, los resultados se recalculan solos.',
        '«Cómo leerlo» describe los datos tal como se exportaron: no cambia si editas la hoja.',
        'Por ahora cada exportación crea un archivo nuevo. Con los proyectos, cada proyecto tendrá un único archivo que la app irá actualizando. Excel llegará más adelante.',
      ],
    },
    en: {
      title: 'Exporting to Google Sheets',
      body: [
        'With a result on screen, tap “Export” and then “Create sheet”. The first time Google asks for permission; after that, at most you will see a window that opens and closes by itself.',
        'The sheet is created in your Drive with a summary at the top, the data in colored cells, the results with their formulas, “How to read it” and notes. If you change a colored cell, the results recalculate by themselves.',
        '“How to read it” describes the data as exported: it does not change if you edit the sheet.',
        'For now every export creates a new file. With projects, each project will have a single file that the app keeps up to date. Excel will come later.',
      ],
    },
  },
  {
    id: 'siglas',
    es: {
      title: 'Siglas y términos',
      body: [
        'Las siglas subrayadas se pueden tocar: se abre su definición sin salir de la pantalla. En los resultados, además, se ve de dónde sale cada valor con tus números.',
        'Todos los términos están en el glosario, aquí debajo, con buscador. Busca por la sigla, por el nombre o por una palabra de la definición.',
      ],
    },
    en: {
      title: 'Acronyms and terms',
      body: [
        'Underlined acronyms can be tapped: their definition opens without leaving the screen. In results, you also see where each value comes from, with your numbers.',
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
        'Conectar tu cuenta de Google es opcional y solo usa tu propio Drive: la app solo ve los archivos que ella misma crea. Ahora sirve para exportar a Google Sheets; más adelante, también para tener lo mismo en el móvil y en el ordenador.',
        'Hasta que llegue la copia de seguridad, si desinstalas la app o borras los datos de Chrome, lo guardado se pierde.',
      ],
    },
    en: {
      title: 'Where your data lives',
      body: [
        'On your phone, and nowhere else. The app has no server and sends nothing to anyone.',
        'Connecting your Google account is optional and only uses your own Drive: the app only sees the files it creates itself. For now it is used to export to Google Sheets; later, also to have the same data on your phone and your computer.',
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
