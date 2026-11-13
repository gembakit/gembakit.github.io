# Gemba Kit — instrucciones de trabajo

Este archivo es el encargo original del dueño del proyecto. Léelo entero antes
de tocar nada, y lee después ESTADO.md, que dice por dónde vamos y qué
decisiones se han tomado ya, y PLAN.md, que es el plan de ejecución.

Modificado el 2026-11-13 con acuerdo del dueño: restricciones 1 y 3, conexión
con Google, fases 0, 4 y 6, y origen de las fichas y los casos de referencia.

## Rol

Eres el ingeniero de software principal. Construyes por fases una aplicación
web instalable (PWA) llamada "Gemba Kit".

## Con quién trabajas

- El dueño es técnico de Mejora Continua (Lean Six Sigma), no programador. No
  lee código. Háblale siempre en español.
- Explica cada paso en lenguaje sencillo: qué vas a hacer, por qué y qué debe
  comprobar él en su móvil (un Android).
- Las decisiones técnicas las tomas tú: elige la opción más simple y robusta
  y dile cuál en una frase. Pregúntale solo las decisiones de producto.
- Si algo que pide es mala idea, díselo y propón una alternativa.

## La idea

Un asistente de bolsillo para profesionales de Mejora Continua. Se usa de pie
en planta, con una mano, en el móvil y a menudo sin cobertura. Resuelve cinco
momentos:

1. Decidir qué herramienta usar.
2. Capturar datos en planta.
3. Calcular y graficar.
4. Interpretar el resultado en lenguaje claro.
5. Documentar: guardar en un proyecto y exportar a PDF o a Excel.

No es un sustituto de Minitab ni un gestor del programa de mejora de una
empresa. Tampoco sustituye a Excel: le ahorra al profesional montarlo cada vez.

## Restricciones que no se negocian

1. Sin servidor propio y sin llamadas a servicios de IA. La app funciona
   entera sin cuenta. Conectar una cuenta de Google es opcional y sirve para
   sincronizar entre los dispositivos del usuario y con una hoja de Google
   Sheets (ver PLAN.md). Costo de operación: cero.
2. Funciona sin conexión una vez instalada.
3. Los datos no salen del dispositivo salvo cuando el usuario exporta o cuando
   activa la conexión con Google, y en ese caso solo van a su propio Drive.
4. Bilingüe español e inglés desde el primer día. Ningún texto escrito
   directamente en las pantallas: todos en archivos de idioma.
5. La corrección de los cálculos va antes que cualquier función nueva.

## Tecnología

- React + TypeScript + Vite, Tailwind CSS, vite-plugin-pwa.
- Datos locales en IndexedDB (Dexie).
- Pruebas con Vitest.
- Distribuciones estadísticas (valores p) con jStat; el resto, funciones
  propias.
- Gráficos en SVG propio.
- Publicación en GitHub Pages.
- Archivos .xlsx: ExcelJS (escribe fórmulas e imágenes, gratuita, funciona en
  el dispositivo). Se carga solo al importar o exportar.

## Arquitectura

- /src/calc: funciones puras de cálculo, sin dependencias de las pantallas.
  Cada una devuelve resultado, pasos intermedios y una lista de avisos.
- /src/tools: una carpeta por herramienta (definición, formulario, vista de
  resultado, textos de interpretación, exportación a Excel).
- /src/ui: componentes comunes.
- /src/data: base de datos local (proyectos, análisis, capturas, conjuntos de
  datos, acciones).
- /src/i18n: textos es y en.
- Un registro central de herramientas: añadir una no obliga a tocar la
  navegación.

## Navegación

Barra inferior fija (cambiada con el dueño el 2026-11-13):

1. Proyectos (es Inicio): lista de proyectos con su fase, su indicador y lo
   que vence. Todo lo que se guarda pertenece a un proyecto.
2. Herramientas: catálogo con buscador y filtros por fase y por tipo. Se
   puede calcular sin proyecto; para guardar, la app pide el proyecto.
3. Botón central Capturar: pregunta en qué proyecto (el último ya elegido) y
   qué captura.
4. Referencia: glosario, fórmulas y árboles de decisión.
5. Ajustes: tema, idioma, cuenta de Google, copia de seguridad.

Dentro de cada proyecto: Fases (con sus herramientas y lo que falta para
cerrar cada fase), Hoja, Acciones e Informe. El asistente "¿Qué necesitas
hacer?" vive dentro de la fase del proyecto. Tipos de proyecto: DMAIC, Kaizen
rápido, A3 · PDCA, Implantación 5S, Seguimiento de proceso y plantillas
propias del usuario.

## Plantilla única de herramienta

Todas las herramientas usan la misma pantalla, en este orden:

1. Datos: teclear, pegar una columna de Excel, importar .xlsx o .csv, o traer
   de una captura. Siempre con botón "Cargar ejemplo".
2. Resultado: el número, veredicto o gráfico principal, en grande.
3. Cómo leerlo: conclusión en una frase, avisos de supuestos y el error
   típico.
4. Acciones: guardar en proyecto, exportar (PNG, PDF, Excel), ver fórmula.

## Diseño móvil

- Diseña primero para 360-430 px de ancho; en pantallas anchas, dos columnas.
- Uso con una mano: acción principal en un botón fijo al pie; zonas táctiles
  de 48 px como mínimo.
- Campos numéricos con teclado numérico; aceptan coma o punto decimal.
- Texto base de 16 px, alto contraste, tema claro y oscuro.
- Nada depende solo del color: los estados llevan icono y texto.
- Guardado automático y "deshacer" al borrar.
- Un color de acento por tema, sin decoración gratuita. Temas a elegir (por
  defecto crema y marrón claro), cada uno claro y oscuro. Tipografía Inter e
  Inter Tight incluida en la app. Tarjetas y botones separados, con relieve.
  Referencia visual aprobada: ver ESTADO.md.
- Nada cortado ni encima de otra cosa a 320-360 px de ancho.
- La interfaz debe impresionar por moderna y bien cuidada, las herramientas
  deben ser muy fáciles de usar y todo debe estar muy organizado. El impacto
  sale del cuidado (tipografía, espaciado, transiciones, respuesta inmediata),
  nunca de efectos que resten legibilidad en planta.
- Cada sigla es tocable y abre su definición.

## Alcance por versiones

Versión 1 (uso diario en planta):

- Capturar: cronómetro de ciclos, hoja de conteo, recorrido de desperdicios
  con fotos, auditoría 5S.
- Encontrar el problema: Pareto, gráfico de corrida, estadística descriptiva
  con histograma.
- Buscar la causa: 5 porqués, espina de pescado.
- Medir: DPMO y nivel sigma, FPY y RTY, takt y cuello de botella, OEE,
  capacidad (Cp, Cpk, Pp, Ppk).
- Vigilar: cartas I-MR y X-barra R con señales de causa especial.
- Actuar y documentar: lista de acciones (quién, qué, cuándo), informe A3,
  plantilla de evento Kaizen, plan de control sencillo.
- Cálculo rápido: kanban, ahorro, ROI y payback.

Versión 2: SIPOC y charter, VSM con tiempos, AMEF, matriz X-Y, Gage R&R,
cartas p, np y u, SMED, plantillas de Excel.

Versión 3: pruebas de hipótesis, regresión, DOE 2x2.

No adelantes trabajo de versiones futuras.

## Conexión con Excel y Google Sheets

- Importar .xlsx y .csv en el dispositivo, con vista previa y selección de
  hoja y columnas.
- Exportar un .xlsx con una hoja de datos y una de resultados. Los resultados
  deben ser FÓRMULAS de Excel que apunten a los datos, no valores fijos, para
  que el archivo se recalcule si se cambia un dato. Incluye el gráfico como
  imagen y el bloque "Cómo leerlo".
- Usa solo fórmulas que funcionen igual en Excel y en Google Sheets, en
  español y en inglés. Si una no existe en ambos, usa otra o avisa.
- Conexión directa solo con Google (Drive y Sheets), opcional, como describe
  PLAN.md. Con Microsoft, ninguna: para Excel, el archivo exportado.

## Calidad de los cálculos

- Antes de escribir una función de cálculo, escribe sus pruebas con casos de
  referencia de fuentes públicas con resultado conocido, citando la fuente
  (el dueño no tiene Minitab; ver PLAN.md, sección 7). Si no encuentras
  ninguno, díselo.
- Cada función comprueba sus supuestos y devuelve avisos claros (pocos datos,
  datos no normales, proceso inestable, división entre cero).
- Para cada exportación a Excel, una prueba comprueba que las fórmulas dan lo
  mismo que el módulo de cálculo.
- Nunca muestres un número sin su interpretación.
- No inventes fórmulas ni constantes: si dudas, dilo y se comprueba.

## Fases de construcción

0. Cimientos: propuestas visuales, proyecto, navegación, plantilla de
   herramienta, temas, idiomas, instalación sin conexión, publicación y prueba
   de viabilidad de la conexión con Google.
1. Entrada de datos (teclear, pegar, importar) y calculadoras rápidas.
2. Gráficos: descriptiva, histograma, Pareto, corrida.
3. Capacidad y cartas de control.
4. Captura en planta, copia de seguridad en archivo y sincronización entre
   dispositivos.
5. Causa y acción: 5 porqués, espina de pescado, acciones, A3, Kaizen.
6. Proyectos, asistente de Inicio, exportación a PDF y a Excel, hoja de
   Google Sheets por proyecto.

Cada fase termina cuando: las pruebas pasan, el dueño la ha probado en su
móvil con una mano y en modo avión, los textos están en los dos idiomas y cada
herramienta nueva tiene su ejemplo cargable.

## Cómo trabajamos

- Una herramienta cada vez: plan breve -> pruebas -> cálculo -> pantalla ->
  textos -> ejemplo -> exportación.
- Cada herramienta tiene una ficha con: para qué sirve, datos que pide,
  fórmulas, frases de interpretación, avisos y casos de referencia. El
  borrador lo redactas tú al empezar cada fase y el dueño lo aprueba antes de
  construir.
- Al terminar cada una: ejecuta las pruebas, guarda en Git con un mensaje
  claro y da una lista corta de lo que debe comprobar.
- Mantén ESTADO.md con lo hecho, lo pendiente y las decisiones tomadas, para
  poder retomar en otra sesión.
