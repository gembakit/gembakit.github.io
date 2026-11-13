# Gemba Kit — plan de ejecución

Fecha: 2026-11-13

Este plan lo ejecuta un agente de programación distinto del que lo escribió.
Cuando termines, el autor del plan revisará todo el trabajo contra este
documento, así que deja rastro de lo que haces (sección 10).

## 1. Cómo leer este plan

Lee primero CLAUDE.md entero (quién es el dueño, cómo hablarle, las reglas que
no se negocian, la lista de herramientas) y después ESTADO.md. Este plan añade
lo que se decidió después del encargo original y ordena el trabajo.

Si dos documentos se contradicen, manda CLAUDE.md en las reglas y este plan en
el orden y el diseño. Si encuentras una contradicción, anótala en ESTADO.md y
díselo al dueño; no la resuelvas en silencio.

Hay tres tipos de frase en este plan y conviene distinguirlas:

- **Decidido**: lo acordó el dueño. No lo reabras ni lo cambies sin él.
- **Recomendado**: es el diseño propuesto por el autor del plan. Puedes
  cambiarlo si encuentras algo mejor o si no funciona, pero anota en ESTADO.md
  qué cambiaste y por qué.
- **Por comprobar**: el autor no lo verificó. Compruébalo en la documentación
  actual o con una prueba antes de construir encima (sección 9).

El dueño no es programador. Las paradas de la sección 8 son los únicos
momentos en que necesitas su respuesta; entre parada y parada trabaja sin
pedirle permiso para decisiones técnicas.

## 2. Qué cambió respecto al encargo original

El encargo describía una app que vive solo en el móvil y exporta archivos. El
dueño quiere además un flujo continuo entre el piso de planta y el escritorio.
El producto pasa a tener tres superficies que comparten los mismos datos:

| Superficie | Para qué |
|---|---|
| App en el móvil | Capturar y calcular de pie en planta, con o sin cobertura. |
| La misma app en el ordenador | Continuar el mismo trabajo con pantalla grande y teclado. |
| Una hoja de Google Sheets por proyecto | Ver los datos y resultados de la app con formato profesional, construir encima (gráficos, tablas dinámicas, fórmulas propias) y devolver datos a la app. |

La app sigue funcionando entera sin cuenta y sin conexión. Conectar Google es
opcional y se activa por decisión del usuario.

## 3. Decisiones tomadas

Todas son **decididas** salvo que se indique.

1. Los datos viven en el dispositivo. La sincronización es opcional y usa solo
   el Google Drive del propio usuario. No hay servidor propio. Si algo no se
   puede hacer sin servidor, no se hace: se le explica al dueño y se le
   proponen alternativas.
2. Conexión directa solo con Google. Para Excel de Microsoft, el archivo .xlsx
   exportado del encargo original.
3. Una hoja de Google Sheets por proyecto, creada por la app con un toque. El
   usuario nunca busca ni elige archivos. Todo lo que se guarda pertenece a
   un proyecto (el dueño descartó la bandeja "Sin proyecto" el 2026-11-13).
4. En la hoja hay tres tipos de pestaña:
   - Pestañas de la app: solo escribe la app. El usuario puede comentarlas y
     referenciarlas desde otras pestañas, pero no editarlas.
   - Pestaña "Entrada": solo escribe el usuario. La app la lee.
   - Pestañas del usuario: la app no las lee ni las toca nunca.
5. Quién edita qué (cambiado por el dueño el 2026-11-13). Lo que nace en la
   app (capturas, análisis) se edita en la app; en la hoja está protegido.
   La pestaña "Entrada" se edita en la app y en la hoja: la sincronización
   combina por celda (gana el último cambio) y, si la misma celda cambió en
   los dos sitios desde la última sincronización, la app enseña los dos
   valores y el usuario elige. Nunca se pierde un valor sin que el usuario lo
   vea. Las pestañas propias del usuario se leen y se muestran como tabla,
   pero la app no las escribe nunca.
6. Un solo botón "Sincronizar" hace todo: envía lo pendiente y trae lo de
   "Entrada". Además se ejecuta solo al abrir la app y al recuperar conexión.
   Al terminar muestra un resumen corto de lo enviado, lo recibido y lo
   ignorado. No hay vista previa antes de aceptar: el dueño pidió que fuera
   fluido, y como la app no modifica "Entrada", un error se corrige en la hoja
   y se vuelve a sincronizar.
7. Las dos direcciones tienen que verse profesionales (sección 6). El dueño
   lo dijo así: nada de números sueltos y feos en la app, y lo que llega a la
   hoja tiene que poder presentarse tal cual.
8. Convenciones de cálculo: por defecto las de Minitab, visibles junto al
   resultado, cambiables en Ajustes y anotadas en cada exportación. El dueño
   no tiene Minitab (sección 7).
9. La copia de seguridad en archivo se adelanta de la Fase 6 a la Fase 4
   (confirmado por el dueño el 2026-11-13).
10. La Fase 0 empieza con propuestas visuales para que el dueño elija.

## 4. Diseño que condiciona el trabajo desde la Fase 0

Estas piezas no se usan hasta fases posteriores, pero si la base no las
contempla habrá que rehacer herramientas. Constrúyelas o déjalas previstas
desde el principio.

### 4.1 Registros preparados para sincronizar

Todo lo que se guarda en la base local (proyectos, análisis, capturas,
columnas de datos, acciones, fotos) lleva desde la Fase 0:

- un identificador único generado en el dispositivo;
- la fecha del último cambio;
- una marca de borrado en lugar de eliminar la fila (sirve a la vez para el
  "deshacer", para la papelera y para que un borrado se propague);
- el origen del dato: `app` u `hoja`.

Las herramientas no hablan con Dexie directamente: pasan por una capa de datos
que aplica estas reglas. Así la sincronización se añade en la Fase 4 sin tocar
las herramientas.

### 4.2 Una sola definición de hoja por herramienta, con dos salidas

El encargo pide un .xlsx con fórmulas vivas. La hoja de Google necesita lo
mismo. Para no escribirlo dos veces ni que diverjan:

- Cada herramienta declara una vez qué lleva su hoja: la tabla de datos, las
  celdas de resultado con su fórmula, el gráfico y el bloque "Cómo leerlo".
- Dos módulos comunes convierten esa definición en un archivo .xlsx (ExcelJS)
  y en peticiones a la API de Google Sheets.
- La prueba que compara las fórmulas con el módulo de cálculo se escribe
  contra la definición, así vale para las dos salidas.
- El estilo (sección 6.2) vive en un único módulo y lo usan las dos salidas.

Esto se construye en la Fase 1 con la salida .xlsx. La salida a Google Sheets
se añade en la Fase 6 sin tocar las herramientas.

Diferencia entre las dos salidas: en el .xlsx el gráfico va como imagen y se
guarda el valor calculado junto a cada fórmula (decisión ya recogida en
ESTADO.md). En Google Sheets el gráfico debe ser un gráfico nativo de Sheets
siempre que el tipo exista, porque queda vivo y el usuario puede editarlo; si
no existe, imagen o tabla, y se anota.

### 4.3 Conexión con Google (**recomendado**)

- Inicio de sesión desde el navegador con Google Identity Services, sin
  secreto de cliente y sin servidor.
- Pide solo los permisos mínimos: el que da acceso únicamente a los archivos
  que crea la propia app y, si usas la carpeta oculta de datos de la app, el
  suyo. No pidas acceso a todo el Drive.
- El identificador de cliente de Google es público y puede estar en el
  repositorio. Nunca guardes un secreto en el repositorio: es público.
- El dueño tiene que crear el proyecto en Google Cloud con su cuenta. Tú no
  puedes hacerlo por él: guíale paso a paso (parada 3).
- Aísla todo lo de Google detrás de una interfaz ("almacén remoto") con una
  versión falsa en memoria para las pruebas. Las pruebas automáticas no llaman
  a Google.

### 4.4 Sincronización entre dispositivos (**recomendado**)

Objetivo: lo que se hace en el móvil aparece en el ordenador y al revés, sin
perder nunca un dato.

- La app guarda en Drive una copia de sus datos por proyecto y las fotos como
  archivos aparte.
- Al sincronizar: se descarga la copia remota, se combina con la local
  registro a registro (gana el cambio más reciente; un borrado es un cambio
  más) y se sube el resultado.
- Requisito que no se negocia: combinar tiene que dar el mismo resultado sin
  importar el orden ni cuántas veces se repita. Con eso, si dos dispositivos
  suben a la vez y uno pisa al otro, el pisado conserva sus datos en local y
  se repara solo en su siguiente sincronización. Escribe pruebas que lo
  demuestren con órdenes y repeticiones aleatorias.
- Se sincroniza al abrir, al volver a primer plano, al recuperar conexión,
  poco después de cada cambio y cada cierto tiempo mientras la app está
  visible. Al dueño se le prometió "segundos o un minuto", no tiempo real
  letra a letra.
- Una sincronización interrumpida a medias no puede dejar la base local a
  medio combinar.
- Lo borrado va a una papelera recuperable.

### 4.5 La hoja del proyecto (**recomendado**)

- Vive en una carpeta visible "Gemba Kit" del Drive del usuario.
- Pestañas de la app: una de resumen (nombre del proyecto, última
  sincronización, índice de análisis) y las de datos y resultados. Decide si
  es una pestaña por análisis o tablas agrupadas y enséñale al dueño una hoja
  de muestra antes de fijarlo (parada 6). Al dueño se le habló de "Datos" y
  "Resultados"; si la estructura final es otra, explícaselo.
- Estabilidad de las referencias: el usuario construirá fórmulas y gráficos
  que apuntan a las pestañas de la app. Por eso la app actualiza en su sitio y
  nunca borra y recrea una pestaña ni mueve una tabla de posición. Publica
  además cada columna de datos como rango con nombre, para que el usuario
  tenga una referencia que no se rompe cuando la tabla crece.
- Identifica las pestañas de la app por su identificador interno, no por el
  nombre, para que sigan funcionando si el usuario las renombra.
- Protege las pestañas de la app. Ojo: el propietario de un archivo puede
  editar siempre sus rangos protegidos, así que la protección será un aviso,
  no un bloqueo. Por eso la app reescribe sus pestañas en cada sincronización
  y no confía en lo que haya en ellas.
- Después de escribir, lee los valores que Sheets calculó con las fórmulas y
  compáralos con el módulo de cálculo. Si no coinciden dentro de la
  tolerancia, avisa al usuario. Es la versión en vivo de la prueba de
  fórmulas del encargo.
- Casos que hay que resolver sin perder datos: el usuario borra la hoja, borra
  una pestaña de la app, la mueve de carpeta o quita el permiso. La app lo
  detecta, lo explica y ofrece recrear.
- Idioma: el de la app en el momento de crear la hoja. Las fórmulas tienen que
  dar lo mismo en hojas en español y en inglés.

### 4.6 La pestaña "Entrada"

- Fila 1: título de cada columna. Debajo, los valores. Las celdas pueden ser
  fórmulas que apunten a otras pestañas; la app lee el valor resultante.
- Lee los valores sin formato, como números reales, para que el separador
  decimal del idioma de la hoja no importe.
- Cada columna aparece en la app como una columna de datos con ese nombre,
  marcada como "viene de la hoja". Se puede editar desde la app según la
  regla 5 de la sección 3.
- En el paso "Datos" de cualquier herramienta se puede elegir una o varias
  columnas de "Entrada" (un Pareto necesita categoría y cantidad; una carta
  X-barra R, varios subgrupos). La elección se recuerda: en las siguientes
  sincronizaciones el análisis se recalcula solo y la app indica qué análisis
  cambiaron.
- Celdas vacías se ignoran. Celdas que no encajan con el tipo de la columna se
  ignoran y se cuentan en el resumen. Un título renombrado es una columna
  nueva; la antigua queda marcada como "ya no está en la hoja", no se borra.
- La pestaña se crea con una fila de ejemplo y una nota breve de cómo usarla.

## 5. Fases

Se mantiene el método del encargo: una herramienta cada vez, pruebas antes
del cálculo, confirmación en Git al terminar cada una. Cada fase termina con
los criterios del encargo (pruebas pasan, el dueño la probó en su Android con
una mano y en modo avión, textos en los dos idiomas, ejemplo cargable) más
los que se indican aquí.

### Fase 0 — Cimientos

1. Propuestas visuales (parada 1). Dos o tres direcciones, cada una con estas
   pantallas en claro y oscuro, a 360 px y en ancho de ordenador: Inicio, una
   herramienta con la plantilla de cuatro pasos, la lista de columnas de datos
   con las que vienen de la hoja (sección 6.1), el estado y el resumen de
   sincronización, y una imagen de cómo se vería la hoja de Google
   (sección 6.2). Tiene que poder abrirlas en su Android.
2. Iniciar Git. Crear el repositorio público en GitHub (parada 2).
3. Los pasos 2 a 10 del plan de la Fase 0 que ya está en ESTADO.md, con la
   capa de datos de la sección 4.1 y la disposición a dos columnas en
   pantallas anchas probada de verdad, porque el ordenador es ahora un uso
   principal y no un extra.
4. Prueba de viabilidad de Google (paradas 3 y 4), en cuanto la app esté
   publicada. Una pantalla provisional que, desde la app instalada en el
   Android del dueño y desde su ordenador: inicie sesión, cree una hoja,
   escriba una celda, la lea y siga funcionando pasado el tiempo de caducidad
   del permiso. Mide cuántas veces y cómo pide reconfirmar. Todo el diseño de
   las secciones 4.3 a 4.6 depende de esto; si el resultado es malo, para y
   cuéntaselo al dueño con alternativas antes de seguir. La pantalla
   provisional se retira al acabar.

### Fase 1 — Entrada de datos y calculadoras rápidas

Lo del encargo, más la definición de hoja única y la salida .xlsx de la
sección 4.2, y el módulo de estilo de la sección 6.2.

### Fase 2 — Gráficos, y Fase 3 — Capacidad y cartas de control

Como en el encargo. En la Fase 3, enseña al dueño la tabla de constantes de
las cartas con su fuente antes de usarla.

### Fase 4 — Captura en planta, copia de seguridad y sincronización

Lo del encargo, más la copia de seguridad en archivo (exportar y restaurar) y
la sincronización entre dispositivos de la sección 4.4. Haz primero la copia
de seguridad: es la red de seguridad mientras se prueba la sincronización.
Cierre adicional: el dueño captura en el móvil sin cobertura, recupera
conexión, lo ve en el ordenador, lo continúa allí y lo ve de vuelta en el
móvil; y restaura una copia de seguridad en un dispositivo limpio.

### Fase 5 — Causa y acción

Como en el encargo.

### Fase 6 — Proyectos, asistente, exportaciones y hoja de Google

Lo del encargo, más la hoja del proyecto (4.5), la pestaña "Entrada" (4.6) y
el botón único de sincronizar. Cierre adicional: el dueño conecta un proyecto,
ve la hoja con el formato acordado, añade un gráfico propio en otra pestaña
que sigue vivo tras dos sincronizaciones con datos nuevos, y trae una columna
desde "Entrada" a una herramienta.

## 6. Listón visual

El encargo ya fija el diseño móvil. Esto es lo que se añade.

### 6.1 Lo que llega de la hoja, dentro de la app

Una columna que llega de "Entrada" no se enseña como una lista de números. Se
enseña como una tarjeta con: nombre, cuántos valores tiene, un gráfico pequeño
elegido según el tipo de dato (distribución para números, barras para
categorías), dos o tres cifras de resumen, la marca "viene de la hoja" con
icono y texto, y cuándo se actualizó. Al tocarla: gráfico grande, tabla y
accesos a las herramientas que tienen sentido para ese dato.

El estado de la sincronización siempre es visible y nunca depende solo del
color: sincronizado, pendiente (con cuántos cambios), sin conexión, hace falta
reconfirmar el permiso, error. El resumen tras sincronizar es una hoja breve y
cuidada, no un aviso técnico.

**Resuelto con el dueño (2026-11-13):** la app y la hoja hablan el mismo
lenguaje (los mismos datos y los mismos números), cada una con su propia
presentación. Los gráficos de la app son interactivos: tocar una barra o un
punto muestra su valor y la celda de la hoja de donde sale, con la marca
"coincide con la hoja" cuando la comprobación de 4.5 pasa. Los gráficos que
el usuario dibuje en Sheets no se copian a la app.

**Temas de color (decidido):** varios temas a elegir en Ajustes, cada uno con
versión clara y oscura y un solo acento. Por defecto, crema y marrón claro.
La hoja de Google y los PDF usan la versión clara del tema elegido, aplicada
por el mismo módulo de estilo de 6.2.

### 6.2 Lo que la app escribe en la hoja y en el .xlsx

Un único módulo de estilo, con la misma identidad que la app (color de acento,
jerarquía de títulos). Como mínimo: cabeceras diferenciadas y fila de cabecera
fija, anchos de columna ajustados al contenido, formato numérico con los
decimales y la unidad que corresponden a cada magnitud, filas alternas en
tablas largas, resultado principal destacado, estados con icono y texto además
de color, bloque "Cómo leerlo" legible, pestañas de la app con un color de
pestaña propio para distinguirlas de las del usuario, y gráficos con título,
ejes y unidades. Una hoja recién creada tiene que poder enseñarse en una
reunión sin retocar.

## 7. Cálculos y casos de referencia

El encargo dice que el dueño da una ficha y casos de referencia por
herramienta. Como no tiene Minitab, cambia así:

1. Al empezar cada fase, redacta tú el borrador de las fichas de sus
   herramientas (para qué sirve, datos, fórmulas, frases de interpretación,
   avisos, casos de referencia) y preséntaselas juntas (parada 5).
2. Los casos de referencia salen de fuentes públicas con resultado conocido:
   conjuntos de datos certificados del NIST, ejemplos resueltos de libros de
   texto reconocidos y documentación pública de Minitab para las convenciones.
   Cada caso lleva su fuente escrita en la ficha y en la prueba.
3. No uses como referencia un número calculado por ti o por otra IA. Si para
   una herramienta no encuentras ningún caso publicado, dilo en la ficha.
4. Si R está instalado en el ordenador puedes usarlo como segunda
   comprobación. No lo instales sin preguntar.
5. Sigue en pie lo del encargo: no inventes fórmulas ni constantes; si dudas,
   dilo.

## 8. Paradas obligatorias

En cada una, para y espera al dueño. Explícale en lenguaje sencillo qué
necesitas y qué debe mirar.

1. Elección de la dirección visual y respuesta a la pregunta abierta de 6.1.
2. Antes de crear el repositorio público en GitHub: confirma cuenta y nombre.
3. Creación del proyecto en Google Cloud, con tu guía paso a paso.
4. Resultado de la prueba de viabilidad de Google.
5. Aprobación de las fichas al empezar cada fase.
6. Hoja de muestra con el formato y la estructura de pestañas, antes de
   construir la salida a Google Sheets.
7. Cierre de cada fase: lista corta de lo que debe comprobar en su Android (y
   en el ordenador desde la Fase 4). No des una fase por cerrada sin su
   comprobación.
8. Siempre que algo choque con una regla de CLAUDE.md o con una decisión de la
   sección 3.

## 9. Por comprobar antes de construir encima

El autor del plan no verificó nada de esto. Consulta la documentación vigente
o haz una prueba, y anota el resultado en ESTADO.md.

- Cuánto dura el permiso de Google en una app sin servidor, si se puede
  renovar sin molestar al usuario, y cómo se comporta el inicio de sesión
  dentro de una app instalada en Android. La estimación que se le dio al dueño
  fue "un toque cada hora de uso, más o menos".
- Si con solo esos permisos mínimos Google exige verificar la app, qué pantalla
  de aviso ve el usuario y qué límites tiene el modo de pruebas.
- Si la API de Sheets funciona con el permiso limitado a archivos creados por
  la app, y si un segundo dispositivo del mismo usuario encuentra esos
  archivos.
- Qué tipos de gráfico nativo permite crear la API de Sheets (hacen falta
  barras con línea acumulada para el Pareto, histograma, líneas con límites
  para corrida y cartas de control).
- Cómo hay que escribir las fórmulas por la API para que funcionen igual en
  hojas en español y en inglés (nombres de función y separador de argumentos).
- Cómo evitar que dos dispositivos se pisen al subir a Drive, o confirmar que
  basta con la reparación descrita en 4.4.
- Licencia de cada dependencia. El código es público y sin licencia de uso
  porque el dueño no quiere ceder derechos: no incluyas en la app nada con
  licencia que obligue a publicar bajo sus mismas condiciones, y revisa
  también el simulador de fórmulas que uses en las pruebas.
- Límite de almacenamiento y permanencia de los datos locales en Android y en
  el navegador del ordenador.

## 10. Rastro para la revisión

Mantén ESTADO.md al día. Al cerrar cada fase añade:

- qué se construyó;
- resultado de las pruebas (cuántas, cuántas pasan; si alguna falla o está
  desactivada, cuál y por qué);
- qué comprobó el dueño y qué no;
- cada desviación de este plan, con el motivo;
- cada punto de la sección 9 resuelto, con lo que encontraste;
- lo que quedó sin verificar o a medias, dicho con claridad.

Una confirmación en Git por herramienta, con mensaje claro. No reescribas el
historial.
