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
        'El reloj de arriba abre el historial de versiones del proyecto (ver «Historial de versiones»).',
        'Todo se guarda en este aparato. Cada proyecto puede tener su hoja de Google, que la app mantiene al día (ver «Hoja de Google del proyecto»). Haz copias de seguridad (ver «Copia de seguridad»).',
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
        'The clock at the top opens the project’s version history (see “Version history”).',
        'Everything is saved on this device. Each project can have its Google sheet, which the app keeps up to date (see “Project Google Sheet”). Make backups (see “Backup”).',
        'If the phone storage is slow or stops responding, a notice appears at the top with “Reload” and “Copy details”; your data is not lost. The same technical log is in Settings → Diagnostics: copy it and paste it in the chat if something is slow.',
      ],
    },
  },
  {
    id: 'hoja',
    es: {
      title: 'Hoja de Google del proyecto',
      body: [
        'En el proyecto, tarjeta «Hoja de Google», pulsa «Crear la hoja en mi Drive». Se crea la carpeta Gemba Kit › Proyectos › (nombre del proyecto) y dentro un único archivo con el nombre del proyecto.',
        'La pestaña «Resumen» tiene los datos del proyecto, todas las mediciones (fecha, herramienta, fase, resultado, una columna por cada dato de contexto para poder filtrar, nota y versión) y los hitos. Cada medición tiene además su pestaña, con el diseño de su herramienta, las fórmulas vivas y una sección «Medición» con su fecha, contexto, nota y versión.',
        'Después la app la mantiene al día: los cambios se envían solos mientras la conexión con Google esté activa (hasta una hora después de aceptar en la ventana de Google). Si no, la tarjeta dice cuántos cambios hay por enviar: pulsa «Sincronizar». En la lista de proyectos verás «Hoja al día» o los cambios pendientes. Sin red, se guarda igual y se envía después.',
        'Las pestañas de la app avisan al editarlas en Sheets. Si alguien las cambia, la app no las pisa sin preguntar y te dice quién modificó el archivo por última vez: «Guardar sus cambios» los copia en una pestaña tuya («… · editada») y actualiza la original; «Descartar sus cambios» la deja como en la app (lo cambiado sigue en el historial de versiones de Sheets).',
        'Tus propias pestañas no se tocan nunca: añade las que quieras para tus cálculos. Si cambias el nombre del proyecto, el archivo y su carpeta también cambian. Si borras el archivo en Drive, la app avisa y puede crearlo de nuevo.',
        '«Abrir la hoja» y «Abrir la carpeta» la abren en Google Sheets y en Drive.',
      ],
    },
    en: {
      title: 'Project Google Sheet',
      body: [
        'In the project, “Google Sheet” card, tap “Create the sheet in my Drive”. The folder Gemba Kit › Projects › (project name) is created, with a single file named after the project inside.',
        'The “Summary” tab has the project details, all the measurements (date, tool, phase, result, one column per context detail so you can filter, note and version) and the milestones. Each measurement also has its own tab, with its tool’s layout, live formulas and a “Measurement” section with its date, context, note and version.',
        'After that the app keeps it up to date: changes are sent on their own while the Google connection is active (up to an hour after accepting in the Google window). Otherwise, the card says how many changes are waiting: tap “Sync”. In the project list you will see “Sheet up to date” or the pending changes. Offline, everything is saved anyway and sent later.',
        'The app’s tabs warn when you edit them in Sheets. If someone changes them, the app does not overwrite them without asking and tells you who last changed the file: “Keep their changes” copies them into a tab of yours (“… · edited”) and updates the original; “Discard their changes” puts it back as in the app (what was changed is still in Sheets’ version history).',
        'Your own tabs are never touched: add as many as you like for your calculations. If you rename the project, the file and its folder are renamed too. If you delete the file in Drive, the app tells you and can create it again.',
        '“Open the sheet” and “Open the folder” open it in Google Sheets and in Drive.',
      ],
    },
  },
  {
    id: 'historial',
    es: {
      title: 'Historial de versiones',
      body: [
        'Cada proyecto tiene su historial, como las copias .bak de AutoCAD o el historial de versiones de Google Docs. Ábrelo con el reloj de arriba, junto al lápiz.',
        'La app guarda sola cómo quedó el proyecto cada día que lo cambias: el primer cambio de un día nuevo guarda antes cómo estaba. Los cambios del mismo día no crean versión. De estas automáticas se quedan las 10 más recientes.',
        'Además puedes guardar puntos de control: cuando el avance te convenza, o antes de un cambio grande, pulsa «Guardar punto de control» y ponle un nombre (por ejemplo, «Fin de Medir»). Van en su propia lista, hasta 10, y la app no los borra nunca sola: si ya tienes 10, te pregunta cuál borrar para dejar sitio. Dentro de cada uno puedes cambiarle el nombre o borrarlo (con deshacer).',
        'Toca una versión para ver qué tenía (fase, objetivo, mediciones e hitos) y elige: «Volver a esta versión» deja el proyecto como estaba entonces (vuelve lo que se borró después y se quita lo que se añadió); cómo estaba justo antes se guarda en el historial, así que se puede deshacer. «Abrir como copia» crea un proyecto aparte con esa versión, para mirarlo o compararlo sin tocar el tuyo.',
      ],
    },
    en: {
      title: 'Version history',
      body: [
        'Each project has its history, like AutoCAD’s .bak files or Google Docs’ version history. Open it with the clock at the top, next to the pencil.',
        'The app saves on its own how the project ended up each day you change it: the first change on a new day first saves how it was. Changes on the same day do not create a version. The 10 most recent of these automatic versions are kept.',
        'You can also save checkpoints: when you are happy with the progress, or before a big change, tap “Save checkpoint” and give it a name (for example, “End of Measure”). They have their own list, up to 10, and the app never deletes them on its own: if you already have 10, it asks which one to delete to make room. Inside each one you can rename it or delete it (with undo).',
        'Tap a version to see what it held (phase, goal, measurements and milestones) and choose: “Go back to this version” leaves the project as it was then (what was deleted later comes back and what was added is removed); how it was just before is saved in the history, so it can be undone. “Open as a copy” creates a separate project with that version, to look at it or compare without touching yours.',
      ],
    },
  },
  {
    id: 'copia',
    es: {
      title: 'Copia de seguridad',
      body: [
        'Está en Ajustes → «Datos y copia de seguridad». Ahí ves dónde están tus datos (en el almacenamiento de Chrome de este teléfono), cuántos proyectos, mediciones e hitos hay y cuánto ocupan.',
        '«Guardar en mi Drive» guarda un archivo con todo, también el historial de cada proyecto, en tu Drive, en Gemba Kit › Copias de seguridad. Se quedan las 10 últimas; las anteriores van a la papelera de Drive. «Descargar copia» deja el archivo en la carpeta Descargas del teléfono.',
        'Para recuperar, en «Restaurar» elige una copia de tu Drive o un archivo. Antes de aplicarla ves qué pasará con cada proyecto: el que no tienes se añade; el que borraste vuelve como estaba en la copia; el que ya tienes no se pisa, la versión de la copia queda en su historial (si la copia es más reciente, pasa a ser la actual y la tuya queda en el historial). No se pierde nada.',
        'Para volver a una versión de una copia, restaura la copia y después, en el proyecto, abre el historial y elige «Volver a esta versión» o «Abrir como copia».',
        'En un teléfono nuevo: instala la app, conecta la misma cuenta de Google y restaura desde tu Drive.',
      ],
    },
    en: {
      title: 'Backup',
      body: [
        'It is in Settings → “Data and backup”. There you see where your data is (in Chrome’s storage on this phone), how many projects, measurements and milestones there are and how much space they take.',
        '“Save to my Drive” saves a file with everything, including each project’s history, to your Drive, in Gemba Kit › Backups. The last 10 are kept; older ones go to the Drive trash. “Download backup” puts the file in the phone’s Downloads folder.',
        'To recover, under “Restore” choose a backup from your Drive or a file. Before applying it you see what will happen with each project: one you do not have is added; one you deleted comes back as it was in the backup; one you already have is not overwritten, the backup’s version goes into its history (if the backup is newer, it becomes the current one and yours stays in the history). Nothing is lost.',
        'To go back to a version from a backup, restore the backup and then, in the project, open the history and choose “Go back to this version” or “Open as a copy”.',
        'On a new phone: install the app, connect the same Google account and restore from your Drive.',
      ],
    },
  },
  {
    id: 'herramienta',
    es: {
      title: 'Cómo es cada herramienta',
      body: [
        'Ahora hay seis calculadoras, en Herramientas: DPMO y nivel sigma, FPY y RTY, takt y cuello de botella, OEE, kanban, y ahorro con ROI y payback. Las demás herramientas del catálogo llegan en las fases siguientes.',
        'Todas tienen los mismos cuatro bloques, siempre en este orden: Datos (lo que metes), Resultado (el número o gráfico principal), Cómo leerlo (la conclusión en una frase, los avisos y el error típico) y Acciones (guardar, exportar y ver la fórmula).',
        'Si no sabes por dónde empezar, pulsa «Cargar ejemplo»: verás un caso resuelto y publicado, con el resultado que se espera.',
        'Arriba de cada herramienta, «Cómo usarla» se despliega con los pasos para usarla bien.',
        'Cada valor calculado del resultado se puede tocar (el nombre lleva un subrayado de puntos): se abre de dónde sale, con la fórmula escrita como en un libro (las divisiones, con el numerador encima de la raya): primero con letras, después con tus números y al final el resultado, por ejemplo DPU = D entre U = 50 entre 1.000 = 0,05. Debajo, qué es cada letra.',
        'En el ordenador, los datos quedan a la izquierda y el resultado a la derecha.',
      ],
    },
    en: {
      title: 'How every tool works',
      body: [
        'There are six calculators now, under Tools: DPMO and sigma level, FPY and RTY, takt and bottleneck, OEE, kanban, and savings with ROI and payback. The other tools in the catalogue arrive in the next phases.',
        'They all have the same four blocks, always in this order: Data (what you enter), Result (the main number or chart), How to read it (the conclusion in one sentence, the warnings and the typical mistake) and Actions (save, export and see the formula).',
        'If you do not know where to start, tap “Load example”: you will see a solved, published case with the expected result.',
        'At the top of every tool, “How to use it” opens with the steps to use it well.',
        'Every calculated value in the result can be tapped (its name has a dotted underline): it opens where it comes from, with the formula written as in a textbook (divisions with the numerator above the bar): first in letters, then with your numbers and finally the result, for example DPU = D over U = 50 over 1,000 = 0.05. Below, what each letter is.',
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
        'Las herramientas que piden una lista (los pasos de FPY y RTY, las estaciones del takt) tienen el botón «Importar»: eliges un Excel (.xlsx) o un .csv del teléfono o de Drive, o pegas las filas copiadas de Excel o Sheets.',
        'Al importar, la app busca la fila de títulos y qué columna es cada dato; si se equivoca, lo cambias en los desplegables. Antes de aceptar ves una vista previa y las filas que no se usarán, con el motivo. Lo importado sustituye los datos que había, y se puede deshacer.',
      ],
    },
    en: {
      title: 'Entering data',
      body: [
        'You can type the values or paste a column from Excel or Google Sheets: copy the column, tap the field and paste. One value per line.',
        'Both decimal comma and decimal point work. Before calculating you will see how many values were read and which lines were ignored, and why.',
        'If you paste something like “1.234”, the app warns you: it could be one thousand two hundred thirty-four or one point two three four. Check it. In data that can only be whole numbers (units), “1.200” is read as one thousand two hundred.',
        'Tools that take a list (the steps in FPY and RTY, the takt stations) have an “Import” button: choose an Excel (.xlsx) or .csv file from the phone or Drive, or paste rows copied from Excel or Sheets.',
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
        'La hoja se crea en tu Drive, en Gemba Kit › Sueltas, con un resumen arriba, los datos en celdas de color, los resultados con sus fórmulas, «Cómo leerlo» y notas. Si cambias un dato de color, los resultados se recalculan solos.',
        '«Cómo leerlo» describe los datos tal como se exportaron: no cambia si editas la hoja.',
        'Cada «Exportar» crea un archivo suelto nuevo. Lo que guardas en un proyecto va además a la hoja del proyecto, un único archivo que la app mantiene al día (ver «Hoja de Google del proyecto»). Excel llegará más adelante.',
      ],
    },
    en: {
      title: 'Exporting to Google Sheets',
      body: [
        'With a result on screen, tap “Export” and then “Create sheet”. The first time Google asks for permission; after that, at most you will see a window that opens and closes by itself.',
        'The sheet is created in your Drive, in Gemba Kit › Loose, with a summary at the top, the data in colored cells, the results with their formulas, “How to read it” and notes. If you change a colored cell, the results recalculate by themselves.',
        '“How to read it” describes the data as exported: it does not change if you edit the sheet.',
        'Every “Export” creates a new loose file. What you save in a project also goes to the project’s sheet, a single file the app keeps up to date (see “Project Google Sheet”). Excel will come later.',
      ],
    },
  },
  {
    id: 'siglas',
    es: {
      title: 'Siglas y términos',
      body: [
        'Las siglas subrayadas se pueden tocar: se abre su definición sin salir de la pantalla. En los resultados, además, se ve de dónde sale cada valor con tus números.',
        'Todos los términos están en el glosario, en esta misma pantalla de Referencia: toca «Glosario» para abrirlo. Tiene buscador: busca por la sigla, por el nombre o por una palabra de la definición. La guía y el glosario empiezan cerrados para no llenar la pantalla; se quedan como los dejes mientras la app esté abierta.',
      ],
    },
    en: {
      title: 'Acronyms and terms',
      body: [
        'Underlined acronyms can be tapped: their definition opens without leaving the screen. In results, you also see where each value comes from, with your numbers.',
        'Every term is in the glossary, on this same Reference screen: tap “Glossary” to open it. It has a search box: search by acronym, by name or by a word in the definition. The guide and the glossary start closed so the screen is not crowded; they stay as you leave them while the app is open.',
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
        'En tu teléfono. La app no tiene servidor y no envía nada a nadie.',
        'Conectar tu cuenta de Google es opcional y solo usa tu propio Drive: la app solo ve los archivos que ella misma crea, todos dentro de la carpeta Gemba Kit. Sirve para exportar hojas sueltas, para la hoja de Google de cada proyecto y para guardar copias de seguridad; más adelante, también para tener lo mismo en el móvil y en el ordenador.',
        'Si desinstalas la app o borras los datos de Chrome, lo guardado en el teléfono se pierde. Por eso conviene hacer copias de seguridad (ver «Copia de seguridad»): la hoja de Google del proyecto es un reflejo para consultar, no sirve para recuperar.',
      ],
    },
    en: {
      title: 'Where your data lives',
      body: [
        'On your phone. The app has no server and sends nothing to anyone.',
        'Connecting your Google account is optional and only uses your own Drive: the app only sees the files it creates itself, all inside the Gemba Kit folder. It is used to export loose sheets, for each project’s Google sheet and to save backups; later, also to have the same data on your phone and your computer.',
        'If you uninstall the app or clear Chrome’s data, what is saved on the phone is lost. That is why backups are worth making (see “Backup”): the project’s Google sheet is a mirror to look at, not a way to recover.',
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
