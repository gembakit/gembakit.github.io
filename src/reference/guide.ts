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
        'Las herramientas se pueden usar sin guardar. Para guardar un resultado, va dentro de un proyecto (ver «Proyectos y mediciones»).',
        'El botón central «+» es para capturar en planta: eliges el proyecto (sale el último que usaste) y qué capturas: cronómetro de ciclos, hoja de conteo, recorrido de desperdicios con fotos o auditoría 5S. Lo que estás capturando se guarda a cada toque: si la app se cierra, sigue donde estaba.',
      ],
    },
    en: {
      title: 'Getting around',
      body: [
        'At the bottom you have the bar with Projects (the home screen), Tools, the central Capture button, Reference and Settings. On a computer, the same bar is on the left.',
        'To go back from a tool, use the arrow at the top left or the phone’s Back button.',
        'The tools can be used without saving. To save a result, it goes inside a project (see “Projects and measurements”).',
        'The central “+” button is for capturing on the shop floor: you choose the project (the last one you used comes up) and what you capture: cycle stopwatch, tally sheet, waste walk with photos or 5S audit. What you are capturing is saved with every tap: if the app closes, it carries on where it was.',
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
        'El proyecto tiene cuatro pestañas arriba: Fases, Hoja (su hoja de Google), Acciones e Informe.',
        'En Fases, el recorrido de fases enseña cuáles están completadas (✓), cuál es la actual y cuáles faltan. Toca una para hacerla la actual: las anteriores quedan completadas y las mediciones nuevas se guardan en ella. Debajo están las mediciones agrupadas por fase y los hitos.',
        'Al final de Fases, «Sugerencias» viene plegado. Al abrirlo enseña, solo para la fase actual, «Qué hacer en esta fase» (con ✓ lo hecho) y «Herramientas que puedes usar»: toca una y lo que guardes irá a este proyecto. Es una guía: puedes cambiar de fase aunque falte algo. Para ver qué herramienta sirve para cada situación, en todo el proyecto, mira Referencia → «¿Qué herramienta uso?». Borrar un proyecto o una medición se puede deshacer al momento.',
        'En Informe, «Crear PDF del proyecto» junta el objetivo, la fase, cada medición con su resultado y su conclusión, las acciones y los hitos. «Copiar contexto para IA» copia ese mismo resumen en texto, para pegarlo en Claude, Gemini u otra IA y preguntarle; la app no envía nada a ninguna IA.',
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
        'The project has four tabs at the top: Phases, Sheet (its Google sheet), Actions and Report.',
        'In Phases, the phase track shows which phases are completed (✓), which is current and which are left. Tap one to make it current: the earlier ones show as completed and new measurements are saved to it. Below are the measurements grouped by phase and the milestones.',
        'At the end of Phases, “Suggestions” comes folded. Open it to see, for the current phase only, “What to do in this phase” (with ✓ for what is done) and “Tools you can use”: tap one and what you save will go to this project. It is a guide: you can change phase even if something is missing. To see which tool fits each situation across the whole project, see Reference → “Which tool do I use?”. Deleting a project or a measurement can be undone straight away.',
        'In Report, “Create project PDF” brings together the goal, the phase, each measurement with its result and conclusion, the actions and the milestones. “Copy context for AI” copies the same summary as text, to paste into Claude, Gemini or another AI and ask it; the app sends nothing to any AI.',
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
    id: 'cuenta',
    es: {
      title: 'Cuenta de Google',
      body: [
        'Es opcional: la app funciona entera sin cuenta. Conectarla sirve para guardar en tu Drive las copias de seguridad, la hoja de cada proyecto y lo que exportes.',
        'La primera vez que abres la app sale la bienvenida, con «Conectar con Google» y «Seguir sin cuenta». Después, todo está en Ajustes › Cuenta de Google.',
        'En la bienvenida, «Conectar con Google» enseña antes qué carpetas se crearán; después, «Continuar con Google» abre la ventana de Google, donde eliges la cuenta y aceptas. La app crea en ese Drive la carpeta Gemba Kit, con Proyectos, Sueltas y Copias de seguridad dentro. Solo ve los archivos que crea ella, nunca el resto de tu Drive.',
        'En Ajustes › Cuenta de Google ves la cuenta conectada, «Abrir la carpeta en Drive» y «Desconectar». Desconectar retira el permiso en este teléfono; lo que ya está en tu Drive se queda allí. Para usar otra cuenta, desconecta y conecta la otra: sus carpetas se crean en su Drive.',
      ],
    },
    en: {
      title: 'Google account',
      body: [
        'It is optional: the whole app works without an account. Connecting it lets you keep backups, each project’s sheet and your exports in your Drive.',
        'The first time you open the app you see the welcome screen, with “Connect with Google” and “Continue without an account”. After that, everything is in Settings › Google account.',
        'On the welcome screen, “Connect with Google” first shows which folders will be created; then “Continue with Google” opens the Google window, where you choose the account and accept. The app creates the Gemba Kit folder in that Drive, with Projects, Loose and Backups inside. It only sees the files it creates, never the rest of your Drive.',
        'In Settings › Google account you see the connected account, “Open the folder in Drive” and “Disconnect”. Disconnecting removes the permission on this phone; what is already in your Drive stays there. To use another account, disconnect and connect the other one: its folders are created in its Drive.',
      ],
    },
  },
  {
    id: 'aparatos',
    es: {
      title: 'Tus aparatos sincronizados',
      body: [
        'Con la cuenta de Google conectada, lo que haces en el móvil aparece en el ordenador (y al revés) en un minuto o dos: proyectos, mediciones, acciones, hitos y recetas.',
        'Se sincroniza solo al abrir la app, al volver a ella, al recuperar la conexión, unos segundos después de cada cambio y cada minuto y medio. En Ajustes › Cuenta de Google, «Tus aparatos» dice cuándo fue la última vez y tiene «Sincronizar ahora».',
        'Si cambias lo mismo en dos aparatos, se queda el cambio más reciente; lo que borras se borra también en los demás. Los datos van a una carpeta oculta de tu Drive que solo ve la app; nada pasa por otro servidor.',
      ],
    },
    en: {
      title: 'Your devices in sync',
      body: [
        'With the Google account connected, what you do on the phone appears on the computer (and vice versa) within a minute or two: projects, measurements, actions, milestones and recipes.',
        'It syncs by itself when you open the app, when you come back to it, when the connection returns, a few seconds after each change and every minute and a half. In Settings › Google account, “Your devices” shows when it last synced and has “Sync now”.',
        'If you change the same thing on two devices, the most recent change is kept; what you delete is deleted on the others too. The data go to a hidden folder in your Drive that only the app can see; nothing goes through any other server.',
      ],
    },
  },
  {
    id: 'hoja',
    es: {
      title: 'Hoja de Google del proyecto',
      body: [
        'En el proyecto, pestaña «Hoja», pulsa «Crear la hoja en mi Drive». Se crea la carpeta Gemba Kit › Proyectos › (nombre del proyecto) y dentro un único archivo con el nombre del proyecto.',
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
        'In the project, “Sheet” tab, tap “Create the sheet in my Drive”. The folder Gemba Kit › Projects › (project name) is created, with a single file named after the project inside.',
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
    id: 'causa-accion',
    es: {
      title: 'Causa y acción',
      body: [
        'En Herramientas, «Buscar la causa» tiene los 5 porqués y la espina de pescado; «Actuar y documentar», el informe A3, el evento Kaizen, el plan de control y la lista de acciones. Son documentos: se rellenan por apartados, con «Cargar ejemplo» para ver uno hecho.',
        'Cada documento se guarda en un proyecto como una medición más y se exporta a la hoja de Google o a PDF desde «Exportar».',
        'Las acciones viven en cada proyecto, en la pestaña «Acciones»: qué, quién, para cuándo y su estado. Las vencidas salen en rojo, con icono y texto, en el proyecto y en la lista de proyectos.',
      ],
    },
    en: {
      title: 'Cause and action',
      body: [
        'Under Tools, “Find the cause” has the 5 whys and the fishbone; “Act and document”, the A3 report, the Kaizen event, the control plan and the action list. They are documents: you fill them in section by section, with “Load example” to see a finished one.',
        'Each document is saved to a project like any other measurement and exported to a Google Sheet or a PDF from “Export”.',
        'Actions live in each project, in the “Actions” tab: what, who, by when and their status. Overdue ones appear in red, with an icon and text, in the project and in the project list.',
      ],
    },
  },
  {
    id: 'recetas',
    es: {
      title: 'Líneas y recetas',
      body: [
        'Una receta guarda la configuración de una línea para un producto: sus estaciones, cada una con su unidad, lo que cuenta (cajas de 24 botellas, por ejemplo) y su velocidad estándar. Así no las vuelves a escribir en cada proyecto.',
        'En el OEE, «Cargar receta» pone la velocidad estándar de la línea (la de la estación más lenta, o la que guardaste), sus máquinas para apuntar cuál causó cada parada y sus cambios con su tiempo estándar. «Guardar como receta» desde el OEE guarda la velocidad de la línea y los cambios, sin tocar las estaciones.',
        'Se crean desde el takt: escribe las estaciones y pulsa «Guardar como receta». Elige la planta o compañía, la línea y el nombre de la receta (12 oz, 20 oz…). Si ya hay una con ese nombre en esa línea, se reemplaza (con «Deshacer»).',
        'Se cargan con «Cargar receta», que las enseña por planta y línea. Después de cargarla puedes cambiar lo que quieras: la receta no cambia hasta que la guardes otra vez. Para hacer una receta a partir de otra, cárgala, cambia lo que haga falta y guárdala con otro nombre.',
        'Todas están en Ajustes › Mis líneas, ordenadas por planta y línea. Toca una para ver sus estaciones y para cambiarle el nombre, duplicarla o borrarla (con «Deshacer»). Van en la copia de seguridad.',
      ],
    },
    en: {
      title: 'Lines and recipes',
      body: [
        'A recipe keeps the set-up of a line for one product: its stations, each with its unit, what it counts (cases of 24 bottles, for example) and its standard speed. That way you do not enter them again in every project.',
        'In the OEE tool, “Load recipe” fills in the standard speed of the line (that of the slowest station, or the one you saved), its machines to note which one caused each stop and its changeovers with their standard time. “Save as recipe” from the OEE tool saves the line speed and the changeovers, without touching the stations.',
        'You create them from the takt tool: enter the stations and tap “Save as recipe”. Choose the plant or company, the line and the recipe name (12 oz, 20 oz…). If there is already one with that name on that line, it is replaced (with “Undo”).',
        'You load them with “Load recipe”, which shows them by plant and line. After loading one you can change anything: the recipe does not change until you save it again. To make a recipe from another one, load it, change what you need and save it with another name.',
        'They are all in Settings › My lines, sorted by plant and line. Tap one to see its stations and to rename, duplicate or delete it (with “Undo”). They go into the backup.',
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
        'Las herramientas están en Herramientas, ordenadas por para qué sirven: encontrar el problema (Pareto, gráfico de corrida, estadística descriptiva con histograma), medir (DPMO y nivel sigma, FPY y RTY, takt, OEE, capacidad), vigilar (cartas de control), buscar la causa, actuar y cálculos rápidos (kanban, ahorro con ROI y payback). El buscador de arriba encuentra cualquiera por su nombre.',
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
        'The tools are under Tools, grouped by what they are for: finding the problem (Pareto, run chart, descriptive statistics with histogram), measuring (DPMO and sigma level, FPY and RTY, takt, OEE, capability), monitoring (control charts), finding the cause, acting and quick calculations (kanban, savings with ROI and payback). The search box at the top finds any of them by name.',
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
        'En Referencia también están «¿Qué herramienta uso?» (eliges lo que quieres conseguir y te enseña las herramientas para eso) y «Fórmulas» (las fórmulas de cada herramienta de cálculo, con un botón para abrirla).',
      ],
    },
    en: {
      title: 'Acronyms and terms',
      body: [
        'Underlined acronyms can be tapped: their definition opens without leaving the screen. In results, you also see where each value comes from, with your numbers.',
        'Every term is in the glossary, on this same Reference screen: tap “Glossary” to open it. It has a search box: search by acronym, by name or by a word in the definition. The guide and the glossary start closed so the screen is not crowded; they stay as you leave them while the app is open.',
        'Reference also has “Which tool do I use?” (you choose what you want to achieve and it shows the tools for it) and “Formulas” (the formulas of each calculation tool, with a button to open it).',
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
        'Conectar tu cuenta de Google es opcional y solo usa tu propio Drive: la app solo ve los archivos que ella misma crea, todos dentro de la carpeta Gemba Kit. Sirve para exportar hojas sueltas, para la hoja de Google de cada proyecto para guardar copias de seguridad y para tener lo mismo en el móvil y en el ordenador.',
        'Si desinstalas la app o borras los datos de Chrome, lo guardado en el teléfono se pierde. Por eso conviene hacer copias de seguridad (ver «Copia de seguridad»): la hoja de Google del proyecto es un reflejo para consultar, no sirve para recuperar.',
      ],
    },
    en: {
      title: 'Where your data lives',
      body: [
        'On your phone. The app has no server and sends nothing to anyone.',
        'Connecting your Google account is optional and only uses your own Drive: the app only sees the files it creates itself, all inside the Gemba Kit folder. It is used to export loose sheets, for each project’s Google sheet to save backups and to have the same data on your phone and your computer.',
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
