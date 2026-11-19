# Estado del proyecto Gemba Kit

Última actualización: 2026-11-14, noche (fin de la segunda sesión: proyecto
mínimo completo y las seis calculadoras de la Fase 1).

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
5. **Para después de cada paso a un punto de control** y cuéntale al dueño
   lo hecho antes de seguir con el siguiente. El 2026-11-14 pidió
   expresamente no encadenar muchos pasos en una sola tanda.
6. **Al empezar la próxima sesión, recuérdale al dueño las pruebas
   pendientes de la sección 2** («Pruebas pendientes del dueño»). Lo pidió
   él: esa noche era tarde para hacerlas.

### Direcciones

| Qué | Dónde |
|---|---|
| App publicada | https://gembakit.github.io/ (desde el 2026-11-14; antes `pasqualebf.github.io/gemba-kit/`, ya no funciona) |
| Código (público) | https://github.com/gembakit/gembakit.github.io (organización gratuita `gembakit` de GitHub, del dueño; ver `docs/traspaso.md`) |
| Maqueta visual aprobada (privada, del dueño) | https://claude.ai/artifact/WE7dYB8wSRRKpsRY7Lwghg |
| Carpeta local | `C:\Users\pasqu\Proyectos\gemba-kit` (fuera de OneDrive a propósito: OneDrive bloquea los miles de archivos pequeños) |

---

## 2. Dónde estamos

**Hecho y publicado (2026-11-14, último commit `80705ea`, 458 pruebas):**

- **Fase 0** terminada, salvo la última comprobación del permiso de Google
  (el 2026-11-21, ver abajo).
- **Proyecto mínimo completo** (sección 4): proyectos y mediciones, hitos,
  filtros, historial de versiones de cada proyecto, copia de seguridad en
  Drive o descargada (restaurar proyecto por proyecto), diagnóstico del
  almacenamiento y **hoja de Google de cada proyecto** (parte 4).
- **Fase 1: las seis calculadoras** (DPMO, FPY y RTY, takt, OEE, kanban,
  ahorro con ROI y payback), cada una con «Cómo usarla», ejemplo,
  explicación tocable de cada valor (fórmulas apiladas), hoja de Google
  suelta y hoja del proyecto. Importar .xlsx/.csv/pegado en las listas.
- Nada de lo de la sesión del 2026-11-14 está probado todavía por el dueño
  en su teléfono (ver la lista siguiente).

**2026-11-15:** el dueño probó la hoja del proyecto: se crea bien, pero al
reescribir la pestaña de DPMO tras cambiar datos salió `#ERROR!` en Z y nivel
sigma (fórmulas leídas en es_ES). Arreglado (nota técnica 6 de la sección 3)
y **confirmado por el dueño en su Android** el mismo día.
Plan acordado ese día (un paso cada vez, parar tras cada uno):

1. [x] Guía de uso y glosario plegados en Referencia, cerrados por defecto
   (2026-11-15).
2. [x] Versiones (2026-11-15): puntos de control **con nombre** (`label`,
   razón `manual`); **10 automáticas (`KEEP_AUTO`) y 10 puntos de control
   (`MAX_CHECKPOINTS`) por separado**: la poda solo toca las automáticas; al
   llegar a 10 puntos de control, la app pregunta cuál borrar
   (`saveCheckpoint` devuelve `full`). Si el proyecto está igual que en una
   automática, esa pasa a punto de control. Cambiar nombre y borrar (con
   deshacer) en el detalle. Arreglado además: el término del glosario abierto
   solo al buscarlo no se podía volver a plegar.
3. [x] Takt versión 2 (2026-11-16; ficha `docs/fichas/takt-v2.md`,
   aprobada con las respuestas A a F al principio): turno − descuentos con
   nombre y unidad propia, turnos; demanda con nombre de unidad; tiempo por
   unidad o unidades por tiempo (`toCycle`/`fromCycle`, todo en segundos por
   dentro) y «Resultados en»; montaje (con balanceo) o máquinas en serie;
   por estación, teórico y medidas reales (media, repetible = segundo mejor,
   mín., máx., variación, frente al teórico); calcular con media, repetible
   o teórico; OEE esperado con producción esperada y OEE mínimo; dos
   ejemplos (embotelladora y packs, `tools/takt/examples.ts`); importar una
   fila por medida (las del mismo nombre se juntan). Mediciones guardadas:
   formato `v: 2`; las de la versión 1 se leen sin perder nada
   (`readTaktSaved`).
   Ordenado tras la primera prueba del dueño (2026-11-18, «no es user
   friendly»): los datos en cuatro bloques plegables con resumen («Tiempo
   disponible», «Demanda», «Cómo es la línea», puestos o máquinas); cada
   puesto o máquina plegable con todo lo suyo (cerrado: medidas, media,
   teórico y la etiqueta de cuello de botella); con datos o ejemplo, todo
   sale plegado. «Calcular con» y el OEE pasan al resultado, junto a lo que
   cambian, para verlo al momento. «OEE esperado» pasa a llamarse «OEE
   habitual de la línea» («un dato tuyo, no un cálculo»). Campos más bajos
   (`NumberField compact`).
   Después (2026-11-18): un OEE mayor que 100 o mal escrito ya no quita el
   resultado (la casilla del OEE vive ahí y no se podía corregir): se avisa
   junto a la casilla y no se usa. Nuevo «Ritmo objetivo con tu OEE»
   (`targetCycle` = takt × OEE; en velocidad, ritmo ÷ OEE), con su
   explicación, su frase en «Cómo leerlo» y su fila en la hoja. Las averías
   siguen sin restarse del takt: entran por el OEE. **Falta que el dueño lo
   pruebe en su Android.**
4. [x] OEE (con ficha antes; empieza la Fase 2 de gráficos): paradas con
   nombre, minutos y categoría (editable); OEE oficial siempre visible;
   interruptores por categoría que calculan **otro** porcentaje con nombre
   explícito («OEE sin cambios de formato»), nunca en lugar del oficial;
   cambio de formato con estándar → estándar frente a exceso; descansos
   opcionales (en la planta del dueño se rotan puestos y no se para); Pareto
   por causa; 85 % con el desglose 90 × 95 × 99 y el factor más alejado
   marcado.
   Antes de la ficha (2026-11-18, pedido del dueño): en la calculadora de OEE
   actual, la barra «En qué se va el tiempo planificado» usa los colores de
   gráfico nuevos (`CHART` en `ui/theme/themes.ts`, `bg-series-1…8`: paleta
   categórica validada para daltonismo, común a los cinco temas, con su
   versión oscura), con 2 px de separación entre partes, y cada parte lleva
   su porcentaje del tiempo planificado debajo de los minutos. Esos colores
   son los que usarán los gráficos de la Fase 2 (Pareto incluido).
   Ficha escrita el 2026-11-18 (`docs/fichas/oee-v2.md`), aprobada el
   2026-11-19 (respuestas A a F al principio) y construida ese día:
   `calc/oee.ts` nuevo (paradas con categoría y estándar, `oeeView`,
   `pareto`, `furthestFactor`, `WORLD_CLASS`); formato guardado `v: 2` en
   `tools/oee/model.ts` (las mediciones de la versión 1 se leen sin perder
   nada); pantalla con tres bloques plegables (tiempo planificado, paradas
   con su editor de categorías, producción con ciclo o velocidad ideal),
   resultado con el OEE oficial, los tres factores frente a 90/95/99 y «el
   más lejos», reparto del tiempo, «Otras vistas» (un porcentaje con nombre
   para todo lo marcado; nunca cambia el oficial) y Pareto por categoría o
   por parada (acumulado escrito, raya del 80 %, opción de añadir velocidad
   y calidad; lo quitado en gris). Ejemplos: Vorne y embotelladora. Hoja de
   Google: tabla por categoría (minutos y parte estándar), paradas en las
   notas, la vista marcada con fórmula INDEX/MATCH. Una medición nueva de
   OEE toma las categorías de la última del último proyecto usado. Piezas
   de formulario comunes del takt y el OEE en `tools/form.tsx`. Arreglado
   de paso: en las explicaciones («Donde»), una cifra larga pasa a la línea
   de abajo en vez de pisar el nombre. **Falta que el dueño lo pruebe en su
   Android.**
   Pedido intercalado (2026-11-19): **bienvenida e inicio de sesión con
   Google**. La primera vez que se abre la app sin cuenta conectada sale la
   bienvenida (`app/screens/WelcomeScreen.tsx`, también en `#/bienvenida`)
   con «Conectar con Google» y «Seguir sin cuenta» (la app sigue funcionando
   entera sin cuenta). Ajustes › Cuenta de Google (`app/GoogleAccount.tsx`):
   cuenta conectada, «Abrir la carpeta en Drive» (o «Crear las carpetas en
   mi Drive» si no se conocen) y «Desconectar» (retira el permiso en Google
   y olvida cuenta y carpetas en el aparato). Al conectar se crean en el
   Drive de esa cuenta Gemba Kit › Proyectos, Sueltas y Copias de seguridad
   (`google/account.ts`, `ensureAppFolders`). Las carpetas recordadas son de
   una cuenta (`drive.owner`): con otra cuenta se buscan o crean en su
   Drive. Límite conocido: la hoja de un proyecto creada con la cuenta A,
   vista con la cuenta B en el mismo teléfono, sale como «ya no está en tu
   Drive» (puede crearla de nuevo en el Drive de B). **Para que entren otras
   personas**, el dueño tiene que sacar la app del modo pruebas en Google
   Cloud o añadirlas como usuarios de prueba (sección 6, «Cuenta de Google y
   publicación»). **Falta que el dueño lo pruebe en su Android.**
5. [ ] Maqueta del proyecto con pestañas (el dueño decide después).
6. [ ] Propuestas de diseño común para lo exportado (hojas, Slides, PDF).
7. [ ] «Ver más» en cada término del glosario (definición amplia, ejemplo,
   fórmula, error típico, relacionados, fuente), por tandas empezando por
   los 31 de las calculadoras. Lo redacta el agente; el dueño valida.

Decidido: gráficos (Fase 2) antes que «Evolución»; cuenta de Google, al
terminar la app.

### Pruebas pendientes del dueño (recordárselas al empezar la sesión)

Todas en el Android, después de pulsar **Actualizar**:

1. **Hoja de Google del proyecto** (lo más importante: solo se ha probado
   con un Google simulado). En un proyecto, «Crear la hoja en mi Drive»;
   abrir la hoja y mirar la pestaña «Resumen» y la de cada medición.
   Cambiar algo en la app y ver que llega solo (o con «Sincronizar»).
   Cambiar una celda de una pestaña de la app en Sheets: debe salir el aviso
   al editar, y al sincronizar la app debe preguntar («Guardar sus cambios»
   o «Descartar sus cambios») y decir quién modificó el archivo. Cambiar el
   nombre del proyecto y ver que el archivo y la carpeta cambian. Si algo
   falla, pedirle el mensaje que sale: la API de Google puede rechazar
   alguna petición del lote (ver la parte 4 en la sección 4).
2. **Las cuatro calculadoras nuevas** (takt, OEE, kanban, ROI): «Cargar
   ejemplo», tocar los valores para ver de dónde salen, guardar una medición
   en un proyecto y exportar la hoja suelta (debe ir a Gemba Kit › Sueltas).
3. **Copia de seguridad** (Ajustes → «Datos y copia de seguridad»):
   «Guardar en mi Drive», abrir la carpeta en Drive, restaurar desde Drive y
   ver el plan por proyecto; «Descargar copia».
4. **Historial de versiones**: el reloj de un proyecto, «Guardar versión
   ahora», cambiar algo, «Volver a esta versión», «Deshacer» y «Abrir como
   copia».
5. **Importar un .xlsx real suyo** y un .csv descargado de Google Sheets en
   FPY o takt.
6. **El 2026-11-21**: paso 3 de la pantalla de prueba de Google (que el
   permiso sigue valiendo a los 8 días). Después se retira la pantalla de
   prueba (`GoogleTestScreen` y `projectTest.*`).
7. **Bienvenida y cuenta de Google** (2026-11-19): Ajustes › Cuenta de
   Google, ver su cuenta, «Abrir la carpeta en Drive», «Desconectar», y
   conectar de nuevo; la bienvenida se ve en el navegador abriendo
   `gembakit.github.io/#/bienvenida`. Otra persona solo puede entrar
   después de publicar la app o añadirla como usuaria de prueba.
8. Si el almacenamiento vuelve a quedarse pegado: Ajustes → Diagnóstico →
   copiar y pegarlo en el chat.

### Siguiente paso (el dueño elige, después de las pruebas)

- Arreglar lo que salga de las pruebas, antes de nada.
- **OEE:** el dueño confirmó el desglose de Nakajima (sección 6). Ofrecerle
  añadirlo a la referencia del 85 % o dejarla como está.
- **Fase 2, gráficos** (estadística descriptiva, histograma, Pareto, corrida),
  o **«Evolución»** (gráfico de una métrica en el tiempo con los hitos), que
  la ficha del proyecto mínimo pone justo después de las calculadoras.

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
   paquetes opcionales de otras plataformas). Pasa **cada vez que se añade
   un paquete** (volvió a pasar con jStat): regenerar el lock antes de
   publicar.
3. **Dirección en la raíz:** desde el 2026-11-14 la app se publica en la
   raíz (`BASE_PATH=/`), así que la compilación local y la de GitHub son
   iguales. (Antes, en una subcarpeta, Git Bash convertía `BASE_PATH` en una
   ruta de Windows y había que usar `MSYS_NO_PATHCONV=1`.)
4. **Chrome sin ventana** no baja de unos 500 px de ancho; por eso las
   capturas se hacen con `puppeteer-core` (scripts/screens.mjs), que sí
   simula un móvil de 320-360 px.
5. **Correo privado:** en este repositorio Git firma con
   `236227593+pasqualebf@users.noreply.github.com` (configurado solo aquí)
   para no publicar el correo del dueño. No cambiarlo.
6. **Región de la hoja y fórmulas (2026-11-15, Android del dueño):** Google
   lee las fórmulas de un `batchUpdate` con la región que tenía la hoja al
   **empezar** el lote, aunque el propio lote la cambie antes. Cambiar a
   en_US, escribir y volver a es_ES en un solo lote rompía las fórmulas con
   comas o decimales (`#ERROR!`, «Formula parse error») al reescribir una
   pestaña. Cada cambio de región va en su propio lote; el Google de pruebas
   (`fakeGoogle.ts`) ya se comporta así. `TAB_FORMAT` en `projectSync.ts`
   fuerza a reescribir todas las pestañas una vez.
7. Versiones nuevas en uso: React 19, TypeScript 7, Vite 8, Tailwind 4,
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
        orígenes `https://pasqualebf.github.io` y `http://localhost:5173`
        (el 2026-11-14 se añade `https://gembakit.github.io`, la dirección
        nueva).
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
  - [x] Segunda ronda (2026-11-13): con `login_hint` el Android ya no
        enseña la lista de cuentas. La ventana se abre y se cierra sola al
        instante, como en el ordenador. La primera conexión en cada aparato
        sí la enseña (todavía no conoce la cuenta). Conclusión: renovar es un
        parpadeo dentro de un toque que el usuario ya hace; no hace falta
        servidor.
  - [x] Al día siguiente (2026-11-14, 13:23, permiso caducado desde la
        víspera): renovado en 0,8 s indicando la cuenta. Sigue siendo un
        parpadeo.
  - [x] Pasos 6 y 7 (2026-11-14, Android, app instalada): carpeta, hoja
        dentro de la carpeta, presentación con gráfico vinculado y PDF
        (89 KB) funcionan con `drive.file` y la API de Slides activada. El
        aviso de pestaña protegida («You're trying to edit part of this
        sheet that shouldn't be changed accidentally. Edit anyway?») **sale
        en la app de Sheets de Android, en cada edición**. La presentación
        no se actualiza sola al cambiar la hoja (esperado: el gráfico
        vinculado se actualiza a mano en Slides web, y la tabla y el texto
        los escribe la app desde sus datos). Actualizar un gráfico por la API
        (`RefreshSheetsChartRequest`) exige `spreadsheets.readonly` o más
        (documentación de Slides): en su lugar, la app borrará el gráfico y
        lo creará de nuevo vinculado, que sí funciona con `drive.file`.
  - Opinión del dueño sobre la presentación de prueba: portada «muy
    básica», gráficos marrones «no me gustan». Pide colores estándar,
    profesionales y mucho más cuidados (ver sección 6).
  - [ ] A los 8 días: lo mismo. En modo pruebas Google puede retirar los
        permisos concedidos a los 7 días; si pasa, decidir con el dueño si
        se pasa la app a producción (con solo permisos no confidenciales no
        debería exigir revisión de Google; comprobarlo antes).
  - [ ] Al terminar, retirar la pantalla: `src/app/screens/GoogleTestScreen.tsx`,
        su ruta en `AppShell.tsx`, el enlace de Ajustes, los textos
        `googleTest` y `settings.googleTest*`, su prueba en `App.test.tsx` y
        su captura en `scripts/screens.mjs`. Se quedan `src/google/gis.ts` y
        `src/google/api.ts` como base del "almacén remoto" (PLAN.md, 4.3).

### Fase 1 — Entrada de datos y calculadoras rápidas

- [x] Redactar las fichas (2026-11-13): `docs/fichas/fase-1.md`, con casos
      de referencia de fuentes públicas citadas.
- [x] Aprobadas por el dueño el 2026-11-13, con sus respuestas a las
      preguntas A a E anotadas al principio del archivo. Seis calculadoras:
      DPMO y nivel sigma, FPY y RTY, takt y cuello de botella (con
      balanceo), OEE, kanban, y ahorro con ROI y payback en una sola.
- [ ] Entrada de datos común: teclear, pegar una columna (ya existe la
      lectura con vista previa en `src/ui/number.ts`), importar .xlsx y .csv
      con vista previa y elección de hoja y columnas (ExcelJS, cargado solo
      al importar).
- [ ] Definición única de la hoja de cada herramienta y salida a .xlsx con
      fórmulas vivas, más el módulo de estilo (PLAN.md, 4.2 y 6.2). Prueba
      que compara las fórmulas con el cálculo.
- [ ] Una herramienta cada vez: pruebas → cálculo → pantalla → textos →
      ejemplo → exportación.
- [x] Borrada la herramienta de muestra (2026-11-13).
- [x] **Calculadora 1, DPMO y nivel sigma** (2026-11-13): `src/calc/dpmo.ts`
      con los casos publicados de la ficha en `dpmo.test.ts`, pantalla en
      `src/tools/dpmo`, guía «Cómo usarla» plegable (nueva en la plantilla),
      siglas tocables, ejemplo cargable. Inversa de la normal con jStat
      1.9.6 (MIT) a través de `src/calc/stats.ts`. Falta su exportación a
      .xlsx, que llega con la pieza común de exportación.
- [x] **Exportar a hoja de Google** (2026-11-13), pieza común:
      definición única de hoja (`src/sheet/types.ts`, `layout.ts`), salida a
      Google con el estilo del tema en claro (`src/google/sheetsOutput.ts`),
      sesión de Google con la cuenta recordada (`src/google/session.ts`),
      panel «Exportar» en la plantilla (`src/ui/ExportPanel.tsx`) y
      evaluador de fórmulas para las pruebas (`src/sheet/evaluate.ts`).
      La hoja se crea con región en_US (fórmulas en inglés con comas) y
      después se pasa a es_ES: así no depende de cómo trate la API los
      separadores en cada región (dudoso según varias fuentes). Hecho para
      DPMO; su prueba compara las fórmulas de la hoja con el cálculo.
- [x] El dueño exportó la hoja de DPMO (2026-11-13): se recalcula al cambiar
      un dato y las fórmulas salen con punto y coma (región es_ES). Primer
      diseño «bastante básico»: rehecho (banda de título, resumen arriba,
      datos en color, tablas con encabezados, filas alternas). Aprobado:
      «me gusta más, podemos dejarlo así por ahora».
- [x] Tablas en la hoja (2026-11-14), pieza común para las calculadoras con
      lista (pasos, estaciones, años): `SheetDef.table`, cuadrícula de cinco
      columnas (A margen · B etiqueta · C valor · D+E nota, unidas; en las
      tablas C, D y E son números), fórmulas por fila `{.col}`, columnas como
      rango `{col[]}` y `{label[]}`, y resaltado del valor más bajo con
      formato condicional de la propia hoja. El evaluador de pruebas conoce
      PRODUCT, MIN, INDEX y MATCH exacto.
- [x] **Calculadora 2, FPY y RTY** (2026-11-14): `src/calc/fpy.ts` con los
      tres casos de la ficha, pantalla en `src/tools/fpy` (modo «Contar
      unidades» o «Escribir el FPY», pasos con nombre, añadir y quitar con
      deshacer, barras por paso con el que más resta marcado), guía, ejemplo
      de Fabrico (97, 94, 91 % → 83 %) y hoja de Google con tabla.
- [x] El dueño exportó la hoja de FPY (2026-11-14): funciona. El resaltado
      del FPY más bajo se veía flojo; ahora lleva texto ámbar en negrita.
- [x] **Importar** (2026-11-14), pieza común: panel «Importar datos»
      (`src/ui/ImportDialog.tsx`) con archivo .xlsx/.csv o filas pegadas,
      elección de hoja, fila de títulos y columna de cada dato, vista previa
      y filas descartadas con su motivo; deshacer en la herramienta. Lectura
      en `src/import`: `table.ts` (.csv con «;», «,» o tabulador; .csv de
      Excel en codificación de Windows; números con coma o punto, miles,
      porcentajes), `xlsx.ts` y `mapping.ts`. El separador decimal se deduce
      del archivo; un .csv con «;» indica coma decimal; en datos enteros
      «1.200» es mil doscientos. Usado en FPY; takt y ROI lo usarán igual.
  - Desviación del plan: los .xlsx se leen con **fflate 0.8.3** (MIT, sin
    dependencias, ~8 KB) y el lector de XML del navegador, no con ExcelJS
    (~1 MB y dependencias con avisos de seguridad). Se carga solo al
    importar un .xlsx. Si llega la salida .xlsx, decidir entonces si
    ExcelJS compensa para escribir.
  - Por comprobar con el dueño: un .xlsx real suyo y un .csv descargado
    de Google Sheets en su Android.
- [x] **Calculadora 3, takt y cuello de botella** (2026-11-14):
      `src/calc/takt.ts` con los tres casos de la ficha (LEI 2 min, Roser
      28 s, MS 800 50,4 s / 4 estaciones / 77 %), pantalla en
      `src/tools/takt` (unidad del tiempo disponible y del takt, s/min/h,
      con conversión; estaciones opcionales con importar; barras frente a la
      línea del takt), explicación de cada valor, hoja con el ciclo más alto
      resaltado (`SheetTable.highlightMax`) y hoja del proyecto
      (`savedSheet`). El evaluador de pruebas conoce MAX, SUM, COUNT,
      ROUNDUP e IFERROR. Los resultados guardados llevan unidad
      (`Headline.unit`). Del caso MS 800 no está publicado el reparto entre
      las cinco estaciones; la prueba usa uno cualquiera que suma 195 s.
- [x] **Calculadora 4, OEE** (2026-11-14): `src/calc/oee.ts` con el caso
      de Vorne (88,81 / 86,11 / 97,80 / 74,79 %), pantalla en
      `src/tools/oee` (los tres factores y una barra con el reparto del
      tiempo planificado: útil y pérdidas por paradas, velocidad y calidad,
      cada una tocable), hoja y hoja del proyecto. Referencia del 85 %
      **sin desglose**: las fuentes no coinciden en la calidad (99 % en
      Vorne, 99,9 % en otras) y el libro de Nakajima no está a mano; es lo
      que decía la ficha aprobada si no se aclaraba. Después el dueño lo
      investigó: el dato de Nakajima es 99 % (sección 6). Falta que decida
      si se añade el desglose.
- [x] **Calculadora 5, kanban** (2026-11-14): `src/calc/kanban.ts` con los
      tres casos de la ficha (Westerville 10 y 8 contenedores, Fabrico 9,6 →
      10), pantalla en `src/tools/kanban` (reposición por partes, espera +
      proceso, o total; margen en %), hoja y hoja del proyecto. Desviación
      de la ficha: no se convierte entre unidades; la demanda y los tiempos
      van en una sola unidad (min, h o días), porque pasar de días a horas
      exigiría suponer cuántas horas tiene la jornada.
- [x] **Calculadora 6, ahorro, ROI y payback** (2026-11-14):
      `src/calc/roi.ts` con los cuatro casos de la ficha (Lumen 5 años y
      3,67 años, CFI 100 % y 25 %), pantalla en `src/tools/roi` (moneda,
      líneas de ahorro duras o blandas, directas, por unidades o por horas;
      «distinto cada año»; costes nuevos y horizonte), gráfico del ahorro
      acumulado frente a la inversión, aviso fijo de cálculo sin descontar,
      hoja y hoja del proyecto. En la hoja, el payback con ahorro distinto
      cada año lo escribe la app como número (acumular e interpolar en
      fórmulas no merece la pena); lo demás son fórmulas vivas.
- [x] **Fase 1: las seis calculadoras hechas.**
- [ ] La salida .xlsx, cuando el dueño la pida, se añade sobre la misma
      definición de hoja sin tocar las herramientas.
- [x] Calculadoras 2 a 6: FPY y RTY, takt, OEE, kanban, ahorro con ROI y
      payback (2026-11-14).
- [x] Glosario ampliado con los términos de las seis calculadoras (31
      términos, categoría nueva «Finanzas») y guía de uso general en
      Referencia (`src/reference/guide.ts`), pedidos por el dueño el
      2026-11-13.
- [ ] Cada calculadora, al construirse, lleva su propia guía («Cómo usarla»)
      dentro de la herramienta y sus términos en el glosario.
- [x] Glosario en PDF del dueño incorporado (2026-11-13) en
      `src/reference/glossary-owner.ts`: 143 términos (siglas, símbolos y
      conceptos), adaptados (sin referencias al examen ni a módulos,
      repetidos fusionados, tres matices de precisión) y traducidos. Total:
      174 términos, con buscador por relevancia y filtro por categoría
      (categorías nuevas: Proyecto y Símbolo).
- [ ] El dueño valida la adaptación y la traducción del glosario.

### Proyecto mínimo (adelantado; ficha `docs/fichas/proyecto-minimo.md`)

- [x] **Parte 1** (2026-11-14): proyectos y mediciones en la base local
      (`src/projects/model.ts`, `store.ts`, con pruebas): tipos y fases,
      campos de contexto propuestos y editables, crear proyecto
      (`ProjectFormScreen`), lista (`ProjectsScreen`), pantalla del proyecto
      con fase actual y mediciones por fase (`ProjectScreen`), hoja
      «Guardar en un proyecto» (`SaveSheet`: último proyecto y su último
      contexto, valores ya usados como sugerencia, fecha y hora, nota,
      proyecto nuevo ahí mismo), medición abierta en su herramienta
      (`#/proyectos/{id}/m/{id}`, `MeasurementPanel`: versión, historial,
      congelar, borrar con deshacer), versión nueva al cambiar los datos.
      DPMO y FPY guardan datos y resultado principal (`save`, `useSavedInput`).
      Guía de uso: tema «Proyectos y mediciones».
- [x] Recorrido de fases como en la maqueta (`PhaseTrack`: completadas con ✓,
      actual resaltada, pendientes apagadas; tira pequeña en la lista) y
      explicación de «Congelar» en la medición.
- [x] **Parte 2** (2026-11-14): hitos (tabla `milestones`, versión 2 de la
      base; `MilestoneSheet`: qué, fecha y hora, nota; borrar con deshacer),
      filtrar y ordenar las mediciones (`src/projects/filter.ts`, con pruebas;
      `FilterSheet`: herramienta, fase y cada campo de contexto, por fecha o
      por resultado solo si queda una herramienta con el mismo resultado; el
      filtro se recuerda mientras la app está abierta), editar el proyecto
      (`#/proyectos/{id}/editar`, `ProjectFormScreen`; cambiar el tipo
      devuelve la fase a la primera si el tipo nuevo no la tiene) y la
      información de una medición sin crear versión (`MeasurementInfoSheet`,
      lápiz del panel). Los campos nuevos llevan identificador único para no
      heredar lo apuntado en uno quitado. Guía de uso al día.
- [x] Diagnóstico del almacenamiento (2026-11-14), tras un atasco en el
      Android del dueño (fases que no cambiaban, lista de proyectos vacía; no
      reproducido en el ordenador): `src/data/health.ts` mide cada operación
      de la base (capa de Dexie), registra apertura, bloqueos, cierres,
      otras ventanas abiertas y ciclo de vida (solo datos técnicos, nunca
      contenido); `useLive` ya no oculta errores y avisa si una pantalla
      espera más de 4 s; `HealthBanner` (Recargar / Copiar detalles) y
      Ajustes → Diagnóstico. **Pendiente:** leer el registro del dueño y
      arreglar la causa.
- [x] «De dónde sale» cada valor calculado (2026-11-14): `src/ui/Explained.tsx`
      y `src/ui/expr.ts` (fórmulas como en un libro, divisiones apiladas),
      `explain.ts` de DPMO y FPY con pruebas. Regla en CLAUDE.md.
- [x] **Parte 3** (2026-11-14): copia de seguridad. `src/data/backup.ts`
      (copia JSON de todas las tablas y los ajustes que no son del aparato;
      restaurar JUNTA: de cada registro gana el `updatedAt` más reciente,
      nunca se borra nada, todo en una transacción), `src/google/driveFolders.ts`
      (carpetas `Gemba Kit / Copias de seguridad` recordadas por su
      identificador en los ajustes `drive.folder.*`; si faltan, se buscan por
      nombre y si no, se crean), `src/google/driveBackup.ts` (sube, lista y
      deja las 10 últimas; las viejas a la papelera). Pantalla Ajustes →
      «Datos y copia de seguridad» (`DataScreen`): dónde están los datos,
      cuánto ocupan, protección, guardar en Drive o descargar, restaurar desde
      Drive o archivo con resumen antes de aplicar. Probado de punta a punta
      con descarga y restauración en otro navegador limpio. **Falta que el
      dueño pruebe la parte de Drive en su teléfono.**
- [x] Historial de versiones de cada proyecto (2026-11-14). El dueño vio que
      «juntar» no servía para volver a una versión antigua; se rehízo como en
      AutoCAD/Revit/Google Docs. `src/data/history.ts`: tabla
      `projectVersions` (versión 3 de la base); antes de cualquier cambio
      (`data/repo.ts`, en la misma transacción) se guarda cómo quedó el
      proyecto si su último cambio fue otro día; «Guardar versión ahora»;
      se quedan 30. «Volver a esta versión» reemplaza (lo de la versión vuelve
      con `updatedAt` nuevo, lo añadido después queda borrado con marca) y
      antes guarda cómo estaba, para deshacer. «Abrir como copia» crea un
      proyecto aparte con ids nuevos. Pantalla `#/proyectos/{id}/historial`
      (reloj en la cabecera del proyecto). La copia de seguridad pasa a la
      versión 2 (lleva el historial; lee las de la versión 1) y restaurar va
      proyecto por proyecto, con el plan a la vista antes: se añade el que
      falta, vuelve el borrado, el que existe no se pisa (la copia más antigua
      va a su historial; la más reciente pasa a ser la actual y la del
      teléfono va al historial). Probado de punta a punta en Chrome sin
      ventana: copia → cambios → restaurar → historial → volver → deshacer.
- [x] **Parte 4** (2026-11-14): hoja de Google de cada proyecto.
      `src/google/projectSync.ts` (motor, recibe el fetch: `Gemba Kit /
      Proyectos / <proyecto> / <proyecto>`, archivo marcado con
      `appProperties.gembaProject`; pestañas de la app recordadas por su
      `sheetId` con dos huellas: lo que se quería escribir y cómo quedó al
      leerlo; solo reescribe lo que cambió, quita las de mediciones
      borradas, nunca toca las del usuario, aviso para todos
      (`warningOnly`) en las suyas; si una pestaña suya cambió en Sheets
      devuelve `conflict` con quién modificó el archivo, y con «guardar» la
      duplica como pestaña del usuario sin aviso; archivo borrado →
      `missing` y se recrea al confirmar; renombra archivo y carpeta).
      Fórmulas escritas con la hoja en en_US y vuelta a es_ES en el mismo
      lote. `src/google/summaryTab.ts` (pestaña «Resumen», una columna por
      campo de contexto). Cada herramienta tiene `savedSheet` (carga
      perezosa; `tools/*/reading.ts`, la lectura sin pantalla compartida con
      la herramienta) y la pestaña lleva la sección «Medición»
      (`SheetDef.info`). `src/projects/sheetSync.ts` (enlace en el ajuste
      `gsheet:<proyecto>`, que viaja en la copia; cambios por enviar;
      estado en curso), `SheetCard` en el proyecto, estado en la lista y
      `useAutoSync` (envía solo si hay red y permiso vigente, 4 s después del
      último cambio). «Exportar» suelto va a `Gemba Kit / Sueltas`. Pruebas
      con un Google de mentira (`src/google/testing/fakeGoogle.ts`) y de
      punta a punta en Chrome sin ventana con ese mismo Google.
      **Por comprobar con el Google de verdad (el dueño):** que la API
      acepta todo el lote (vaciar con `updateCells` + `fields: '*'`,
      `autoResizeDimensions`, cambio de región dentro del lote), el aviso al
      editar en el Android y el nombre de quien modificó.

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
| Google Sheets | **Sustituido el 2026-11-14 por «Flujo de proyectos», abajo.** Antes: una hoja por proyecto con pestañas de la app, pestaña «Entrada» de doble edición y pestañas libres. |
| Quién edita qué | **Sustituido el 2026-11-14:** ya no hay pestaña «Entrada» de doble edición. Ver «Flujo de proyectos». |
| Hoja dentro de la app | A pantalla completa, columnas que caben sin desplazarse a los lados, edición por filas con un editor grande debajo (nunca encima), flechas a la fila siguiente y zoom (− / +). Colores del tema elegido. |
| App y hoja | Mismos datos y mismos números, cada una con su presentación. Los gráficos de la app son interactivos (tocar muestra el valor y la celda de la hoja, con la marca "coincide"). Los gráficos que el usuario dibuje en Sheets no se copian a la app. |
| Sincronizar | Un botón que envía y trae; además se ejecuta solo. Resumen corto al terminar. |
| IA | La app no llama a ninguna IA. Fase 6: pestaña «Contexto» en cada hoja (objetivo, tipo y fase, indicador con base/objetivo/actual, cada análisis con su conclusión, acciones con responsable y fecha) para que Claude (conector de Google Drive de la suscripción del dueño) o Gemini en Sheets respondan sobre el proyecto, y botón «Copiar contexto para IA». No está comprobado que el conector de Claude pueda escribir celdas. |
| Microsoft | Sin conexión directa; para Excel, archivo exportado. |
| Excel y exportar (2026-11-13) | Excel **en espera** por decisión del dueño (no tiene licencia): sale como «Próximamente». Se le explicó que un .xlsx también se abre gratis en Google Sheets. **«Exportar» crea una hoja de Google** en su Drive con datos, fórmulas vivas, resultado, «Cómo leerlo» y notas (elegido por el dueño). PDF e imagen, con los proyectos. |
| Archivos Excel | ExcelJS. Se guarda el valor calculado junto a cada fórmula para que las vistas previas del móvil no salgan vacías. |

**Flujo de proyectos (2026-11-14, diseñado con el dueño; manda sobre PLAN.md 4.5 y 4.6)**

| Tema | Decisión |
|---|---|
| Dónde vive cada cosa | La app es donde nacen y viven los datos (en el teléfono). Google es el escaparate y la mesa de trabajo del proyecto. |
| En Drive | Carpeta «Gemba Kit» → una carpeta por proyecto → **un único archivo de Sheets por proyecto**, creado una vez. Lo demás del proyecto (presentaciones, PDF) va en la misma carpeta. Los cálculos sin proyecto van a «Gemba Kit/Sueltas». |
| Alimentar la hoja | Guardar en el proyecto (sin red también) → al sincronizar, la app crea o reescribe la pestaña de cada análisis en el mismo archivo. Nunca archivos nuevos. |
| Un solo dueño por pestaña | Pestañas **de la app** (Resumen, cada análisis, tablas capturadas): se editan solo en la app (móvil u ordenador); en Sheets se ven, se comentan y sus fórmulas funcionan, con **aviso al editar** (protección «solo aviso»: Google no deja bloquear a su dueño). Pestañas **tuyas**: libres; la app nunca escribe en ellas, solo las lee. Se quita la pestaña «Entrada» de doble edición: era la fuente de conflictos. |
| Si edita una pestaña de la app en Sheets | No se rompe nada: la app no lee sus propias pestañas. Al sincronizar detecta el cambio y pregunta antes: ofrece guardar su versión como pestaña suya y después reescribe. Nunca se pierde nada sin avisar. |
| Visor en la app | Se mantiene: ver todas las pestañas del proyecto a pantalla completa con zoom; editar por filas las tablas de la app; las pestañas del usuario, solo lectura. |
| Pestañas del usuario | La app las ve y sugiere herramientas según sus columnas (categorías + cantidades → Pareto; mediciones → histograma/Cpk; fechas + valores → corrida/control; pasos con entradas y buenas → FPY; estaciones con tiempos → takt). |
| Importar | Por pestañas (no archivos enteros). Orígenes: pestaña del archivo del proyecto (recomendado), archivo .xlsx/.csv, filas pegadas. La app guarda una copia (foto) con su origen; el origen nunca se modifica. En el proyecto, sección «Datos» con las tablas **agrupadas por archivo de origen** (pueden ser varios archivos por proyecto). |
| Cambios en el origen | Para pestañas de Google que la app puede leer: al sincronizar detecta sola y avisa («cambió: 5 filas nuevas», «ya no existe», «ahora se llama…»; identifica las pestañas por su número interno). Se actualiza **con un toque del usuario**. Archivos del teléfono: no se vigilan; se reimporta. Coste: ninguno (API gratis, pocos KB). |
| Origen borrado | El usuario elige: aceptar la eliminación (se borra también en la app) o **conservar la copia** con un indicador «ya no existe en Google». Desde la copia, botón para **volver a crearla en Google**: pasa a ser pestaña de la app (la app es su dueña). |
| Versiones y congelar | Cada actualización de una tabla de datos crea una **versión** (v1, v2… con fecha); los análisis que la usan se recalculan como versión nueva, para comparar las métricas en el tiempo. Un análisis se puede **congelar** (por ejemplo, la línea base de Medir) y no cambia aunque llegue una versión nueva. |
| Presentación de Google | Sí, fase 6 (con Informe y A3): portada, problema y objetivo, indicador, una diapositiva por análisis con gráfico **vinculado a la hoja** (se actualiza en Slides) y conclusión, causas, acciones. Una vez creada es del usuario; regenerar crea otra versión. Permiso: `drive.file` basta (documentación de la API de Slides, comprobado 2026-11-14); hay que activar la API de Slides en Google Cloud. Prueba en la pantalla provisional (pasos 6 y 7). |
| PDF | Sí. Dos vías: desde la presentación o la hoja de Google (Drive la exporta a PDF; prueba en el paso 7) y, para usar sin conexión en planta, informe PDF generado en la propia app (fase 6). |
| Protección y contexto | Pestañas de la app con **aviso para todos** (Google no permite aviso para el dueño y bloqueo para los demás a la vez: `ProtectedRange.warningOnly` ignora los editores). Campos de contexto por defecto: Equipo, Puesto, Línea, Producto, Supervisor, Operario; todos opcionales; se pueden añadir. Lista de mediciones con filtros por contexto y orden por fecha o resultado. |
| Espacio y Firebase | **Aceptado** (2026-11-14): sin Firebase; la nube es el Drive del propio usuario. Copia de seguridad descargable o en Drive en el proyecto mínimo. «Archivar proyecto» en Drive, con comprobación antes de borrar del teléfono, cuando lleguen las fotos. |
| Calidad en el 85 % de Nakajima (OEE) | **Aclarado por el dueño** (2026-11-14, investigación suya): el desglose canónico de *Introduction to TPM* es disponibilidad > 90 %, rendimiento > 95 % y calidad > **99 %**; 0,90 × 0,95 × 0,99 = 84,65 %, que se redondea al 85 %. El 99,9 % viene de mezclar el TPM con Seis Sigma o de adaptaciones de industrias críticas. Desde el 2026-11-19 la app enseña el desglose (90 × 95 × 99 = 84,65 %) y marca el factor más lejos de su referencia (OEE versión 2). |
| Historial de versiones y restaurar | **Aceptado** (2026-11-14): como AutoCAD, Revit o Google Docs. Versiones por proyecto (solas, una por día de cambios, y a mano); volver a una versión reemplaza y se puede deshacer; restaurar una copia va proyecto por proyecto y nunca pierde nada. |
| Ritmo de trabajo | **Pedido por el dueño** (2026-11-14): parar en un punto de control después de cada paso y contárselo, en lugar de encadenar muchos pasos. |
| Carpetas en Drive | Ordenadas desde el principio (lo pide el dueño): `Gemba Kit/Proyectos/{proyecto}/` (hoja del proyecto; `Presentaciones/` e `Informes/` solo cuando haga falta), `Gemba Kit/Sueltas/`, `Gemba Kit/Copias de seguridad/` (se guardan las 10 últimas). La app encuentra sus carpetas por identificador: moverlas o renombrarlas en Drive no rompe nada. |
| Diseño de todo lo que se exporta | **Todo** lo que sale de la app (hojas de Google, gráficos, presentaciones, PDF) con colores **estándar y profesionales**, no los del tema de la app, y **una misma línea de diseño** coherente (decidido 2026-11-14). Sustituye a «la hoja de Google usa la versión clara del tema». Antes, ronda de propuestas visuales para que el dueño elija. El estilo vive en un solo módulo (`src/google/sheetsOutput.ts` hoy), así que cambiarlo no toca las herramientas. |
| Cuenta de Google y publicación | Durante la construcción, la cuenta de siempre. **Al terminar la app: sacarla del modo pruebas** (publicarla) y probarla con otra cuenta del dueño, que solo dé los permisos dentro de la app, sin tocar Google Cloud. Los permisos `drive.file` y `drive.appdata` son **no sensibles** (documentación de la API de Drive): publicar no exige la verificación de Google; para enseñar nombre y logo en la pantalla de permiso hace falta la «verificación de marca» (ligera: página de inicio, política de privacidad, dominio verificado). |
| Traspaso a otra cuenta | Preparado desde el principio (pedido por el dueño 2026-11-14): `docs/traspaso.md` con el inventario y los pasos. Reglas: traspasar el proyecto de Google Cloud, nunca crear otro (los archivos y la carpeta oculta van ligados al proyecto); dominio propio antes de publicar para otros (los datos del teléfono van ligados a la dirección). Segunda cuenta del dueño como propietaria del proyecto de Cloud. |
| Tope de gasto | Google no corta el gasto con un presupuesto (solo avisa). Tope real: **desvincular la facturación** del proyecto si las API siguen funcionando sin ella (prueba del dueño: desvincular y repetir los pasos 2 y 6). Si no se pudiera, bajar a mano las cuotas de cada API por debajo de los umbrales de cobro y mantener las alertas. |
| Costes con muchos usuarios | Uso normal de Drive, Sheets y Slides: gratis. Hay límites por proyecto (Sheets: 300 lecturas y 300 escrituras por minuto en total, 60 por usuario; Drive: umbral diario de 400 millones de unidades). Hoy, al pasarlos Google responde «demasiadas peticiones» y no cobra; Google anuncia que **más adelante en 2026** el uso por encima del umbral diario generará cargos en la cuenta de facturación, con 90 días de aviso. Como el proyecto tiene facturación vinculada: antes de publicar, comprobar si se puede desvincular sin que dejen de funcionar las API (así nunca habría cargos) o, si no, dejar alertas de presupuesto. Revisar los avisos de Google. |
| Orden después del proyecto mínimo | Calculadoras 3 a 6 y después «Evolución» (decidido 2026-11-14). |
| Orden | **Adelantar un proyecto mínimo** antes de las calculadoras 3 a 6: crear proyecto, guardar análisis, carpeta y archivo en Drive, sincronizar pestañas de la app, aviso de edición. Antes, ficha para que el dueño la apruebe. |

**Técnicas (las toma el agente, se anotan)**

| Tema | Decisión |
|---|---|
| Código | Público en GitHub (lo exige GitHub Pages gratis). Sin licencia de uso. |
| Rutas | Con almohadilla (#) por la subcarpeta de GitHub Pages. |
| Cronómetro | Hora real de inicio y fin, no contar segundos. |
| Versiones nuevas | La app no se actualiza sola: avisa y el usuario pulsa "Actualizar". |

---

## 7. Pendiente de decidir con el dueño

1. Qué sigue después de las pruebas: Fase 2 (gráficos) o «Evolución»
   (sección 2).
2. Si la referencia del OEE lleva el desglose de Nakajima (90 × 95 × 99) o
   solo el 85 % (sección 6).
3. La hoja de Google del proyecto se construyó sin enseñarle antes una hoja
   de muestra (el dueño pidió terminar sin parar). Al probarla, que diga si
   cambia algo de las pestañas o del diseño.
4. El dueño valida la adaptación y la traducción del glosario.
5. Cuenta de Google para los proyectos reales: la de siempre o una nueva
   solo para Gemba Kit (ficha del proyecto mínimo, pregunta E).
6. Abrir la app a otras personas (pedido el 2026-11-19 con la bienvenida):
   añadirlas como usuarias de prueba en Google Cloud (hasta 100; Google
   puede volver a pedir el permiso a los 7 días) o publicar la app (sin revisión de
   Google con estos permisos). Antes de publicar para otros, la decisión
   del dominio propio (sección 6, «Traspaso»): los datos de cada teléfono
   van ligados a la dirección de la app.

## 8. Por comprobar (PLAN.md, sección 9)

Nada de la sección 9 del plan está comprobado todavía. Lo más urgente es lo
de Google, que se resuelve con la prueba de viabilidad. Licencias revisadas
(leídas de cada package.json el 2026-11-13): React, React DOM, Vite,
Tailwind, vite-plugin-pwa y workbox-window (MIT), Dexie (Apache-2.0),
lucide-react (ISC), fuentes Inter e Inter Tight (OFL-1.1, permite incluirlas
en la app). Añadidas después: jStat 1.9.6 (MIT) y fflate 0.8.3 (MIT). Ninguna obliga a publicar el código bajo sus condiciones. Revisar
cada dependencia nueva antes de añadirla.

## 9. Riesgos que hay que vigilar

- La app sin conexión puede quedarse en una versión antigua: hay aviso de
  versión nueva y la versión se ve en Ajustes.
- Los datos viven en el teléfono: si el dueño desinstala la app o borra los
  datos de Chrome, se pierden salvo lo que tenga en una copia de seguridad
  (la hoja de Google del proyecto es un reflejo, no sirve para restaurar).
- Las fotos ocupan mucho: reducirlas al guardar.
- "1.234" es ambiguo al pegar: ya se avisa en la vista previa.
- Las pruebas de Excel usan un simulador: en cada herramienta, el dueño abre
  el archivo una vez en Excel y en Google Sheets.
- Constantes de cartas de control: tabla con fuente validada por el dueño.
- La sincronización de la hoja del proyecto solo está probada con un Google
  simulado: la API real puede rechazar alguna petición del lote.
- Una sincronización mal hecha pierde datos: copia de seguridad antes que
  sincronización, y pruebas de combinación en cualquier orden.
- El dueño puede editar las pestañas de la app (solo llevan aviso): la app lo
  detecta al sincronizar y pregunta antes de reescribirlas.
- Las capturas de pantalla (`scripts/screens.mjs`) bloquean las descargas de
  Chrome; los scripts de prueba sueltos que pulsen «Descargar copia» deben
  hacer lo mismo, o dejan archivos en la carpeta Descargas del dueño (pasó
  el 2026-11-14).
- `npm audit` avisa de fallos moderados en deepmerge, glob y minimatch, que
  llegan a través de vite-plugin-pwa → workbox-build. Son herramientas de
  compilación: no van dentro de la app. El arreglo que propone npm baja
  vite-plugin-pwa a una versión antigua; esperar a una versión nueva.
- GitHub avisa de que actions/checkout@v4 y setup-node@v4 usan Node 20 (ya
  se ejecutan con Node 24). Funciona; actualizarlas cuando salga versión.

## 10. Historial

- 2026-11-13: encargo, plan de ejecución, tres rondas de maqueta visual,
  todas las decisiones de la sección 6, Fase 0 construida y publicada,
  comprobada por el dueño en su Android. Glosario plegable a petición suya.
- 2026-11-14: prueba de Google, calculadoras DPMO y FPY con su hoja,
  importar, glosario del dueño, proyecto mínimo completo (partes 1 a 4,
  historial de versiones, diagnóstico), explicación tocable de cada valor
  con fórmulas apiladas, y las calculadoras de takt, OEE, kanban y ROI.
  El dueño deja las pruebas en el teléfono para la sesión siguiente.
