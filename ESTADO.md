# Estado del proyecto Gemba Kit

Última actualización: 2026-11-13 (fin de la primera sesión de trabajo).

Este archivo es la memoria del proyecto. Quien abra una sesión nueva debe
poder seguir trabajando solo con leerlo. Mantenlo al día al terminar cada
paso.

---

## 1. Cómo retomar

1. Lee **CLAUDE.md** (el encargo del dueño, con las reglas que no se
   negocian), después **este archivo** y después **PLAN.md** (el plan de
   ejecución detallado). Si se contradicen: CLAUDE.md manda en las reglas,
   PLAN.md en el orden y el diseño, y las decisiones de la sección 6 de este
   archivo son las más recientes.
2. Háblale al dueño siempre en español, sin jerga, y dile qué debe comprobar
   en su Android. Él no lee código.
3. Antes de enseñarle cualquier pantalla, revísala a 320 y 360 px de ancho,
   en claro y en oscuro (sección 3). El dueño no tolera textos cortados,
   elementos montados unos sobre otros ni pantallas amontonadas.
4. Una confirmación en Git por paso, con mensaje claro en español, y
   `git push` para publicar. Solo se publica si pasan todas las pruebas.

### Direcciones

| Qué | Dónde |
|---|---|
| App publicada | https://pasqualebf.github.io/gemba-kit/ |
| Código (público) | https://github.com/pasqualebf/gemba-kit |
| Maqueta visual aprobada (privada, del dueño) | https://claude.ai/artifact/WE7dYB8wSRRKpsRY7Lwghg |
| Carpeta local | `C:\Users\pasqu\Proyectos\gemba-kit` (fuera de OneDrive a propósito: OneDrive bloquea los miles de archivos pequeños) |

---

## 2. Dónde estamos

**En curso: prueba de viabilidad de Google** (sección 4, Fase 0). El dueño
ya creó el proyecto en Google Cloud y la pantalla provisional está publicada;
falta que haga la prueba en su Android y en el ordenador y pegue el registro.

**La Fase 0 está terminada salvo la prueba de Google.** La app está
publicada, se instala en el Android del dueño, funciona en modo avión y el
almacenamiento protegido está concedido (comprobado por el dueño el
2026-11-13). Tiene la estructura completa (navegación, temas, idiomas,
plantilla de herramienta, base de datos local) pero todavía ninguna
herramienta real: solo una de muestra.

### Siguiente paso (el dueño elige)

- **Opción A, recomendada: prueba de viabilidad de Google** (paradas 3 y 4 de
  PLAN.md, sección 5, Fase 0, punto 4). Necesita al dueño unos 15 minutos en
  el ordenador para crear un proyecto en Google Cloud con su cuenta, guiado
  paso a paso. Después se comprueba desde su Android que la app inicia
  sesión, crea una hoja en su Drive, escribe, lee, y cada cuánto pide volver
  a confirmar el permiso. Todo el diseño de la hoja depende de que esto
  funcione bien; si sale mal, parar y proponerle alternativas.
- **Opción B: empezar la Fase 1** (sección 4). Su primer paso es redactar las
  fichas de las calculadoras para que el dueño las apruebe (parada 5).

Si el dueño no puede sentarse al ordenador, avanzar con la opción B.

---

## 3. Cómo se trabaja en este proyecto (comandos)

| Comando | Para qué |
|---|---|
| `npm install` | Instalar dependencias (la primera vez). |
| `npm run dev` | App en modo desarrollo en el ordenador. |
| `npm test` | Todas las pruebas. Usa `scripts/vitest.mjs` (ver nota 1). |
| `npm run typecheck` | Comprobar tipos de TypeScript. |
| `npm run build` | Compilar la app (incluye el modo sin conexión). |
| `npm run screens -- <carpeta> 360` | Tras `npm run build`: capturas de todas las pantallas en claro y oscuro con el Chrome del equipo, y aviso automático si la página es más ancha que la pantalla o si un texto sale recortado. Repetir con 320 y 1280. |
| `npm run check:live` | Comprueba la app publicada: carga, instalación y apertura sin red. |
| `npm run icons` | Regenera el icono provisional. |

Notas técnicas que costó descubrir:

1. **Vitest en Windows:** si la terminal entrega la ruta con la unidad en
   minúscula (`c:\…`), Vitest carga dos veces el mismo módulo y todas las
   pruebas fallan con "failed to find the current suite". Por eso
   `npm test` pasa por `scripts/vitest.mjs`, que la pone en mayúscula. Las
   pruebas importan `test` y `expect` de `vitest` (sin globales).
2. **package-lock.json:** si `npm ci` falla en GitHub por paquetes que
   "faltan en el lock file", borrar `node_modules` y `package-lock.json` y
   ejecutar `npm install` de nuevo (npm a veces no anota las dependencias de
   paquetes opcionales de otras plataformas).
3. **Git Bash cambia las rutas:** `BASE_PATH=/gemba-kit/` se convierte en una
   ruta de Windows. Para probar la compilación de GitHub Pages en local, usar
   `MSYS_NO_PATHCONV=1 BASE_PATH=/gemba-kit/ npx vite build`.
4. **Chrome sin ventana** no baja de unos 500 px de ancho; por eso las
   capturas se hacen con `puppeteer-core` (scripts/screens.mjs), que sí
   simula un móvil de 320-360 px.
5. **Correo privado:** en este repositorio Git firma con
   `236227593+pasqualebf@users.noreply.github.com` (configurado solo aquí)
   para no publicar el correo del dueño. No cambiarlo.
6. Versiones nuevas en uso: React 19, TypeScript 7, Vite 8, Tailwind 4,
   Vitest 5, vite-plugin-pwa 2, Dexie 4, lucide-react 1. Ante dudas sobre su
   uso, mirar la documentación que trae cada paquete en `node_modules`.

---

## 4. Lo que falta, por fase

Cada fase se cierra cuando: pasan las pruebas, el dueño la probó en su
Android con una mano y en modo avión, los textos están en los dos idiomas y
cada herramienta nueva tiene su ejemplo cargable. Detalle completo en
PLAN.md, sección 5.

### Fase 0 — Cimientos: falta solo la prueba de Google

- [x] Propuestas visuales y elección del dueño.
- [x] Git, esqueleto, idiomas, temas, piezas comunes, navegación, registro
      de herramientas, plantilla única, base local, modo sin conexión,
      publicación y comprobación del dueño en su Android.
- [ ] **Prueba de viabilidad de Google** (opción A de arriba, elegida por el
      dueño el 2026-11-13). Resultados que hay que anotar aquí: permisos
      mínimos que funcionan, pantalla de aviso que ve el usuario, cada cuánto
      pide reconfirmar, comportamiento en la app instalada en Android y en el
      ordenador.
  - [x] Proyecto "Gemba Kit" creado por el dueño en Google Cloud con su
        cuenta (2026-11-13): API de Drive y de Sheets activadas, pantalla de
        permiso "External" en modo pruebas con el dueño como usuario de
        prueba, permisos `drive.file` y `drive.appdata`, cliente web con
        orígenes `https://pasqualebf.github.io` y `http://localhost:5173`.
        El identificador de cliente está en `src/google/config.ts`.
  - [x] Google exigió una cuenta de facturación para crear el proyecto. El
        dueño vinculó la suya y decidió dejarla vinculada (tiene un
        presupuesto de 10 $; se le explicó que un presupuesto solo avisa, no
        corta el gasto). Drive y Sheets no cobran.
  - [x] Pantalla provisional: Ajustes → "Prueba de conexión con Google"
        (`#/prueba-google`). Cinco pasos (conectar, crear hoja, escribir y
        leer con una fórmula en una hoja con región es_ES, carpeta oculta,
        buscar la hoja desde otro aparato) y un registro que el dueño copia y
        pega en el chat.
  - [x] Primera ronda del dueño (2026-11-13, registros pegados en el chat):
    - Pantallas que ve el usuario la primera vez en Android: "Google no ha
      verificado esta aplicación" (botón «Continuar») y después la lista de
      los dos permisos, ya marcados, con el aviso de que pasqualebf.github.io
      no tiene enlaces a política de privacidad ni condiciones.
    - Con solo `drive.file` la API de Sheets crea, escribe y lee la hoja. La
      carpeta oculta (`drive.appdata`) guarda y lee. El ordenador encuentra
      la hoja creada en el móvil (mismo cliente, otro aparato).
    - Fórmulas: se escriben por la API en inglés (`=SUM(A3:A4)`) con
      `USER_ENTERED`; en una hoja con región es_ES funcionan y el dueño las ve
      en español. La API las devuelve en inglés. Los decimales se envían como
      números JSON, no como texto.
    - Permiso: dura 60 min. En el ordenador (Chrome, página) renovar es
      invisible: la ventana se abre y se cierra sola en 0,5-1,2 s. En el
      Android (app instalada) renovar enseñaba la lista de cuentas: el dueño
      tiene que elegir cuenta cada vez. Arreglo en prueba: guardar el correo
      de la cuenta (leído de Drive `about`) en el aparato y pasarlo como
      `login_hint`, que según Google se salta la lista.
    - Renovar exige un toque del usuario (la ventana de Google la bloquea el
      navegador si no). En la app real la renovación irá dentro de un toque
      que el usuario ya hace (Sincronizar, Guardar, abrir la hoja).
  - [ ] Segunda ronda: comprobar en el Android si con `login_hint` la
        renovación ya no pide elegir cuenta, y qué pasa al día siguiente.
  - [ ] Al terminar, retirar la pantalla: `src/app/screens/GoogleTestScreen.tsx`,
        su ruta en `AppShell.tsx`, el enlace de Ajustes, los textos
        `googleTest` y `settings.googleTest*`, su prueba en `App.test.tsx` y
        su captura en `scripts/screens.mjs`. Se quedan `src/google/gis.ts` y
        `src/google/api.ts` como base del "almacén remoto" (PLAN.md, 4.3).

### Fase 1 — Entrada de datos y calculadoras rápidas

- [ ] Redactar las fichas y que el dueño las apruebe (parada 5). Cada
      ficha: para qué sirve, datos, fórmulas, frases de interpretación,
      avisos y casos de referencia con su fuente pública (PLAN.md, sección 7).
- [ ] Confirmar con el dueño qué entra en "calculadoras rápidas". Propuesta:
      DPMO y nivel sigma, FPY y RTY, takt y cuello de botella, OEE, kanban,
      ahorro, ROI y payback (las que no necesitan gráficos ni cartas).
- [ ] Entrada de datos común: teclear, pegar una columna (ya existe la
      lectura con vista previa en `src/ui/number.ts`), importar .xlsx y .csv
      con vista previa y elección de hoja y columnas (ExcelJS, cargado solo
      al importar).
- [ ] Definición única de la hoja de cada herramienta y salida a .xlsx con
      fórmulas vivas, más el módulo de estilo (PLAN.md, 4.2 y 6.2). Prueba
      que compara las fórmulas con el cálculo.
- [ ] Una herramienta cada vez: pruebas → cálculo → pantalla → textos →
      ejemplo → exportación.
- [ ] Borrar la herramienta de muestra (`src/tools/muestra`,
      `src/calc/muestra.ts` y sus textos `tools.muestra`).
- [ ] Añadir al glosario los términos de cada herramienta nueva.

### Fase 2 — Gráficos

- [ ] Estadística descriptiva con histograma, Pareto, gráfico de corrida.
      Gráficos en SVG propio e interactivos: tocar una barra o un punto
      muestra su valor (y, desde la Fase 6, la celda de la hoja de donde
      sale). Diseño de referencia: maqueta aprobada.

### Fase 3 — Capacidad y cartas de control

- [ ] Cp, Cpk, Pp, Ppk; cartas I-MR y X-barra R con señales de causa
      especial. Antes de usar las constantes de las cartas (A2, D3, D4, d2),
      enseñar la tabla con su fuente al dueño para que la valide.

### Fase 4 — Captura en planta, copia de seguridad y sincronización

- [ ] Cronómetro de ciclos (hora real de inicio y fin), hoja de conteo,
      recorrido de desperdicios con fotos (reducidas al guardar), auditoría
      5S.
- [ ] Copia de seguridad en archivo (exportar y restaurar), primero.
- [ ] Sincronización entre dispositivos por el Drive del usuario (PLAN.md,
      4.4).

### Fase 5 — Causa y acción

- [ ] 5 porqués, espina de pescado, lista de acciones (quién, qué, cuándo),
      informe A3, plantilla de evento Kaizen, plan de control sencillo.

### Fase 6 — Proyectos, exportaciones y hoja de Google

- [ ] Proyectos: lista en Inicio, crear proyecto, los cinco tipos (DMAIC,
      Kaizen rápido, A3 · PDCA, Implantación 5S, Seguimiento de proceso) con
      sus fases, herramientas de cada fase y lo que falta para cerrarla.
- [ ] Plantillas propias: nombre, fases y herramientas del catálogo.
- [ ] Botón Capturar y "Guardar" que piden el proyecto (el último ya
      elegido, opción de crear uno).
- [ ] Exportación a PNG, PDF y Excel.
- [ ] Hoja de Google por proyecto (PLAN.md, 4.5 y 4.6): antes, enseñar una
      hoja de muestra al dueño (parada 6). Pestaña «Entrada» editable desde
      la app a pantalla completa, por filas, con editor grande debajo y zoom
      (− / +). Botón único Sincronizar.
- [ ] Pestaña «Contexto» para IA y botón «Copiar contexto para IA»
      (decisión en la sección 6).

---

## 5. Hecho (Fase 0, en detalle)

Pruebas: 88, todas pasan. Compilación y publicación correctas.

| Paso | Dónde está |
|---|---|
| Esqueleto React + TypeScript + Vite + Tailwind + Vitest | raíz del proyecto |
| Idiomas es/en, detección del idioma del teléfono, selector en Ajustes | `src/i18n` (prueba de que es y en tienen las mismas claves y ningún texto vacío) |
| Cinco temas × claro/oscuro, prueba de contraste WCAG (texto ≥ 7; secundario, acento y estados ≥ 4,5) | `src/ui/theme` |
| Piezas comunes: botones de 48 px (54 el principal) con efecto al tocar, botón fijo al pie, campo numérico con coma o punto, lectura de columnas pegadas con vista previa y aviso de "1.234" ambiguo, sigla tocable, hoja inferior, aviso con "Deshacer" | `src/ui` |
| Barra inferior flotante en el móvil y menú lateral en pantallas ≥ 768 px; rutas con almohadilla | `src/app` |
| Registro central de herramientas y plantilla única (Datos → Resultado → Cómo leerlo → Acciones, dos columnas en pantallas anchas) | `src/tools/registry.ts`, `src/ui/ToolTemplate.tsx` |
| Herramienta de muestra "Media de una columna" (se borra en la Fase 1) | `src/tools/muestra`, `src/calc/muestra.ts` |
| Forma común de los cálculos: resultado, pasos y avisos (códigos; el texto va en los idiomas) | `src/calc/types.ts` |
| Base local Dexie con todas las tablas y los campos de sincronización (id, createdAt, updatedAt que nunca se repite, deleted 0/1, origin app/hoja); toda escritura pasa por `repo.ts` | `src/data` |
| Ajustes guardados en el teléfono: idioma, tema, modo, favoritas; almacenamiento protegido pedido y visible en Ajustes | `src/data/settings.ts`, `src/app/screens/SettingsScreen.tsx` |
| Glosario plegable con buscador (3 términos de momento: DMAIC, OEE, Cpk) | `src/reference/glossary.ts`, `src/app/screens/ReferenceScreen.tsx` |
| Modo sin conexión e instalación (aviso de versión nueva con botón Actualizar, solo fuentes latinas precargadas), icono provisional, versión visible | `vite.config.ts`, `src/app/UpdatePrompt.tsx`, `public/icons` |
| Publicación automática en GitHub Pages solo si pasan tipos y pruebas | `.github/workflows/publicar.yml` |

Desviaciones respecto a la maqueta o al plan, con su motivo:

- Algunos tonos claros son un poco más oscuros que en la maqueta (acento de
  Lino #9A6B3F → #8F6239, textos secundarios, verde/ámbar/rojo de estado)
  para cumplir el contraste mínimo.
- "Ver fórmula" se llama "Fórmula": el texto largo partía el botón en dos
  líneas a 360 px.
- El glosario salió de los textos de idioma a su propio archivo para poder
  crecer sin límite.

---

## 6. Decisiones tomadas con el dueño

Todas del 2026-11-13. No reabrirlas sin él.

**Producto**

| Tema | Decisión |
|---|---|
| Uso | App personal. Quizá una empresa la adapte en el futuro; no se construye nada para eso. |
| Teléfono de pruebas | Android del dueño. Compatible con iPhone, pero no se prueba allí. |
| Todo dentro de un proyecto | No hay bandeja "Sin proyecto". Todo lo que se guarda pertenece a un proyecto. Calcular sin guardar sí se puede sin proyecto; para guardar, la app pide el proyecto. |
| Tipos de proyecto | DMAIC (Definir, Medir, Analizar, Mejorar, Controlar), Kaizen rápido (Preparar, Evento, Seguimiento), A3 · PDCA (Planificar, Hacer, Verificar, Actuar), Implantación 5S (Clasificar, Ordenar, Limpiar, Estandarizar, Sostener) y Seguimiento de proceso (sin fases). Más plantillas propias del usuario (nombre, fases y herramientas del catálogo; solo herramientas que existan). |
| Navegación | Barra inferior: Proyectos (es Inicio) · Herramientas · botón central Capturar · Referencia · Ajustes. Dentro de cada proyecto: Fases, Hoja, Acciones, Informe. |
| Ordenador | La misma app en el navegador, a dos columnas, con los mismos datos. Es un uso principal. |
| Copia de seguridad | En archivo, en la Fase 4 (adelantada desde la 6). |
| Convenciones de cálculo | Las de Minitab por defecto, visibles, cambiables en Ajustes y anotadas en la exportación. El dueño no tiene Minitab: los casos de referencia salen de fuentes públicas (NIST, libros de texto, documentación de Minitab) con su fuente citada. |
| Fichas | Las redacta el agente al empezar cada fase; el dueño las aprueba antes de construir. |
| Glosario | El dueño tiene un glosario en PDF, redactado por él con ayuda de Claude: su texto se puede usar, adaptándolo y traduciéndolo al inglés, y el dueño valida el resultado. Ampliarlo además con los términos de cada herramienta. |

**Diseño**

| Tema | Decisión |
|---|---|
| Dirección visual | Propuesta A (tarjetas y botones separados, con relieve y sombras) más la organización DMAIC de la propuesta B. Referencia: la maqueta aprobada. Primera ronda rechazada por parecida y básica. |
| Temas de color | Lino (crema y marrón claro, por defecto), Salvia, Pizarra, Grafito y Ciruela; cada uno claro y oscuro. La hoja de Google y los PDF usan la versión clara del tema elegido. |
| Tipografía | Inter (texto) e Inter Tight (títulos y cifras), incluidas en la app para funcionar sin conexión. |
| Espacio | Nada cortado, nada encima de otra cosa, nada amontonado a 320-360 px. |
| Referencia | Glosario plegable por término, con buscador. |

**Datos, Google y Excel**

| Tema | Decisión |
|---|---|
| Dónde viven los datos | En el teléfono (IndexedDB de Chrome, almacenamiento protegido). Sincronización opcional entre dispositivos a través del Drive del propio usuario. Sin servidor propio. |
| Google Sheets | Una hoja por proyecto, creada por la app con un toque. Pestañas de la app (las escribe la app; en Google, protegidas y comentables), pestaña «Entrada» y pestañas libres del usuario. |
| Quién edita qué | Lo que nace en la app se edita en la app. «Entrada» se edita en la app y en Google; si la misma celda cambió en los dos sitios, la app enseña los dos valores y el usuario elige. Las pestañas del usuario se ven en la app como tabla, solo lectura. |
| Hoja dentro de la app | A pantalla completa, columnas que caben sin desplazarse a los lados, edición por filas con un editor grande debajo (nunca encima), flechas a la fila siguiente y zoom (− / +). Colores del tema elegido. |
| App y hoja | Mismos datos y mismos números, cada una con su presentación. Los gráficos de la app son interactivos (tocar muestra el valor y la celda de la hoja, con la marca "coincide"). Los gráficos que el usuario dibuje en Sheets no se copian a la app. |
| Sincronizar | Un botón que envía y trae; además se ejecuta solo. Resumen corto al terminar. |
| IA | La app no llama a ninguna IA. Fase 6: pestaña «Contexto» en cada hoja (objetivo, tipo y fase, indicador con base/objetivo/actual, cada análisis con su conclusión, acciones con responsable y fecha) para que Claude (conector de Google Drive de la suscripción del dueño) o Gemini en Sheets respondan sobre el proyecto, y botón «Copiar contexto para IA». No está comprobado que el conector de Claude pueda escribir celdas. |
| Microsoft | Sin conexión directa; para Excel, archivo exportado. |
| Archivos Excel | ExcelJS. Se guarda el valor calculado junto a cada fórmula para que las vistas previas del móvil no salgan vacías. |

**Técnicas (las toma el agente, se anotan)**

| Tema | Decisión |
|---|---|
| Código | Público en GitHub (lo exige GitHub Pages gratis). Sin licencia de uso. |
| Rutas | Con almohadilla (#) por la subcarpeta de GitHub Pages. |
| Cronómetro | Hora real de inicio y fin, no contar segundos. |
| Versiones nuevas | La app no se actualiza sola: avisa y el usuario pulsa "Actualizar". |

---

## 7. Pendiente de decidir con el dueño

1. Opción A o B como siguiente paso (sección 2).
2. Qué entra en "calculadoras rápidas" de la Fase 1 (sección 4).
3. Estructura final de pestañas de la hoja, sobre una hoja de muestra
   (parada 6, antes de construir la hoja de Google en la Fase 6).
4. El dueño ofreció enviar el PDF de su glosario: pedírselo cuando toque
   ampliar Referencia.

## 8. Por comprobar (PLAN.md, sección 9)

Nada de la sección 9 del plan está comprobado todavía. Lo más urgente es lo
de Google, que se resuelve con la prueba de viabilidad. Licencias revisadas
(leídas de cada package.json el 2026-11-13): React, React DOM, Vite,
Tailwind, vite-plugin-pwa y workbox-window (MIT), Dexie (Apache-2.0),
lucide-react (ISC), fuentes Inter e Inter Tight (OFL-1.1, permite incluirlas
en la app). Ninguna obliga a publicar el código bajo sus condiciones. Revisar
cada dependencia nueva antes de añadirla.

## 9. Riesgos que hay que vigilar

- La app sin conexión puede quedarse en una versión antigua: hay aviso de
  versión nueva y la versión se ve en Ajustes.
- Los datos viven solo en el teléfono hasta la Fase 4: si el dueño desinstala
  la app o borra los datos de Chrome, se pierden. Todavía no se guarda nada
  real.
- Las fotos ocupan mucho: reducirlas al guardar.
- "1.234" es ambiguo al pegar: ya se avisa en la vista previa.
- Las pruebas de Excel usan un simulador: en cada herramienta, el dueño abre
  el archivo una vez en Excel y en Google Sheets.
- Constantes de cartas de control: tabla con fuente validada por el dueño.
- La conexión con Google sin servidor no está probada (prueba de la opción A).
- Una sincronización mal hecha pierde datos: copia de seguridad antes que
  sincronización, y pruebas de combinación en cualquier orden.
- El dueño puede editar las pestañas protegidas de la app (es el propietario
  del archivo): la app las reescribe y no confía en ellas.
- GitHub avisa de que actions/checkout@v4 y setup-node@v4 usan Node 20 (ya
  se ejecutan con Node 24). Funciona; actualizarlas cuando salga versión.

## 10. Historial

- 2026-11-13: encargo, plan de ejecución, tres rondas de maqueta visual,
  todas las decisiones de la sección 6, Fase 0 construida y publicada,
  comprobada por el dueño en su Android. Glosario plegable a petición suya.
