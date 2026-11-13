# Estado del proyecto

Última actualización: 2026-11-13

## Dónde estamos

Antes de la Fase 0. Todavía no hay código ni Git iniciado. El plan de
ejecución está escrito en PLAN.md y pendiente de que un agente lo ejecute. El
siguiente paso es la parada 1 del plan: propuestas visuales para el dueño.

## Hecho

- Encargo leído y resumido; dudas de producto respondidas.
- Carpeta del proyecto creada en `C:\Users\pasqu\Proyectos\gemba-kit`, fuera
  de OneDrive (OneDrive bloquea los miles de archivos pequeños del proyecto).
- Comprobado que el ordenador tiene Node 24, npm 11, Git y GitHub CLI.
- 2026-11-13: acordado con el dueño el flujo móvil + ordenador + Google
  Sheets. CLAUDE.md actualizado y PLAN.md escrito.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Teléfono de pruebas | Android del dueño. Se mantiene compatible con iPhone, pero no se prueba allí por ahora. |
| Público | App personal. Puede que en el futuro una empresa quiera adaptarla; no se construye nada para eso todavía. |
| Código | Público en GitHub (lo exige GitHub Pages gratis). Sin licencia de uso por ahora, para no regalar derechos. |
| Todo dentro de un proyecto | Cambiado por el dueño (2026-11-13): no hay bandeja "Sin proyecto". Todo lo que se guarda (capturas, análisis, acciones) pertenece a un proyecto. Inicio es la lista de proyectos. Capturar o guardar pide el proyecto, con el último usado ya elegido y la opción de crear uno en el momento. Calcular sin guardar sí se puede sin proyecto (recomendación, pendiente de confirmar). |
| Dirección visual | Elegida (2026-11-13): base de la propuesta A (tarjetas y botones separados, con relieve y sombras que "salen de la pantalla") más la estructura DMAIC de la propuesta B: cada proyecto se organiza por fases y cada fase muestra sus herramientas y lo que falta para cerrarla. |
| Archivos Excel | ExcelJS. Se guarda también el valor calculado junto a cada fórmula, para que las vistas previas del móvil no salgan vacías. |
| Rutas de la app | Con almohadilla (#), para que funcionen en la subcarpeta de GitHub Pages. |
| Cronómetro | Mide con la hora real de inicio y fin, no contando segundos. |
| Dónde viven los datos | En el dispositivo. Sincronización opcional entre dispositivos a través del Drive del propio usuario. Sin servidor. |
| Ordenador | La misma app en el navegador, a dos columnas, con los mismos datos. Es un uso principal. |
| Google Sheets | Una hoja por proyecto. Pestañas de la app (solo escribe la app, comentables), pestaña "Entrada" (solo escribe el usuario, la app la lee) y pestañas libres del usuario. |
| Dueño de cada dato | Uno solo: lo que nace en la app se corrige en la app; lo que nace en "Entrada", en la hoja. Sin edición en los dos sentidos. |
| Sincronizar | Un botón que envía y trae, y que además se ejecuta solo. Resumen al terminar, sin vista previa. |
| Aspecto | Profesional en las dos direcciones: datos de la hoja como tarjetas con gráfico en la app; formato presentable en la hoja y en el .xlsx. |
| Microsoft | Sin conexión directa. Para Excel, archivo exportado. |
| Convenciones de cálculo | Las de Minitab por defecto, visibles, cambiables y anotadas en la exportación. El dueño no tiene Minitab: casos de referencia de fuentes públicas (NIST, libros de texto, documentación de Minitab). |
| Fichas | El borrador lo redacta el agente al empezar cada fase; el dueño lo aprueba. |
| Dirección visual | La Fase 0 empieza con 2 o 3 propuestas para que el dueño elija. |

| Copia de seguridad | Confirmado por el dueño (2026-11-13): se adelanta a la Fase 4. |
| App y hoja | Mismos datos y mismos números; cada una con su propia presentación. Los gráficos de la app son interactivos (tocar una barra o un punto muestra su valor y la celda de la hoja de donde sale). No se copian a la app los gráficos que el usuario dibuje en Sheets. |
| Temas de color | Varios temas a elegir en Ajustes, cada uno con versión clara y oscura y un solo color de acento. Por defecto, crema y marrón claro. La hoja de Google y los PDF usan la versión clara del tema elegido. |
| Editar la hoja desde la app | Aprobado (2026-11-13). La pestaña «Entrada» se edita en la app y en Google; si la misma celda cambia en los dos sitios antes de sincronizar, la app enseña los dos valores y el usuario elige. Las capturas de la app se editan en la app (en Google, protegidas y comentables). Las pestañas propias del usuario se ven en la app como tabla, solo lectura. En el móvil la hoja ocupa toda la pantalla, se edita por filas con un editor grande debajo (no encima) y tiene botones de zoom (− / +). |
| Tipos de proyecto | Aprobados los cinco (2026-11-13): DMAIC (Definir, Medir, Analizar, Mejorar, Controlar), Kaizen rápido (Preparar, Evento, Seguimiento), A3 · PDCA (Planificar, Hacer, Verificar, Actuar), Implantación 5S (Clasificar, Ordenar, Limpiar, Estandarizar, Sostener) y Seguimiento de proceso (sin fases). Más plantillas propias. |
| Calculadoras sin proyecto | Aprobado (2026-11-13): se puede calcular sin proyecto; para guardar, la app pide el proyecto. |
| Barra inferior | Proyectos (Inicio) · Herramientas · botón central Capturar · Referencia · Ajustes. Capturar siempre pregunta el proyecto, con el último usado ya elegido. |
| Tipografía | Inter (texto) e Inter Tight (títulos y cifras), incluidas en la app para que funcionen sin conexión. Sustituye a "tipografía del sistema" del encargo. |
| IA conectada | Pendiente del dueño. Recomendación: la app no llama a ninguna IA; la hoja de Google lleva una pestaña «Contexto» pensada para que Claude (con el conector de Google Drive de su suscripción) o Gemini en Sheets respondan sobre el proyecto, y un botón «Copiar contexto para IA». Ver conversación del 2026-11-13. |
| Plantillas personalizadas | Pedido por el dueño (2026-11-13): el usuario crea sus propios tipos de proyecto eligiendo nombre, fases y, en cada fase, herramientas del catálogo de la app. Solo herramientas que existan en la app. Entra en la Fase 6 junto con Proyectos. |
| Primera ronda visual | Rechazada (2026-11-13): las tres propuestas se parecían y se veían básicas. Segunda ronda con tres estructuras distintas, temas de color y tipografía incluida en la app. |

## Pendiente de confirmar con el dueño

1. Cómo conectar una IA (ver "IA conectada" arriba).
2. Estructura final de pestañas de la hoja, sobre una hoja de muestra
   (parada 6 del plan).

## Maqueta visual aprobada

La parada 1 del plan está cerrada (2026-11-13). La maqueta aprobada está
publicada en https://claude.ai/artifact/WE7dYB8wSRRKpsRY7Lwghg (privada, del
dueño). Es la referencia visual para construir: relieve en tarjetas y
botones, temas Lino (por defecto), Salvia, Pizarra, Grafito y Ciruela, cada
uno claro y oscuro; proyectos con fases; hoja a pantalla completa editable
por filas con zoom. Comprobar cada pantalla a 320-360 px de ancho, en claro
y oscuro: nada cortado, nada encima de otra cosa.

## Plan de la Fase 0

Ver PLAN.md, sección 5, que añade las propuestas visuales al principio, la
capa de datos preparada para sincronizar y la prueba de viabilidad de Google
al final. Los pasos de construcción son:

1. Iniciar Git en esta carpeta.
2. Esqueleto (React, TypeScript, Vite, Tailwind) y pruebas con un ejemplo.
3. Idiomas es y en, detección automática, cambio manual, prueba de textos
   sin traducir.
4. Temas claro y oscuro con un color de acento.
5. Piezas comunes: botón de 48 px, botón fijo al pie, campo numérico (coma o
   punto), sigla tocable.
6. Barra inferior con las 5 pestañas y pantallas provisionales.
7. Registro central de herramientas y plantilla única, con una herramienta
   de muestra que se borra en la Fase 1.
8. Base de datos local: idioma, tema, favoritas; pedir almacenamiento
   protegido.
9. Instalación, modo sin conexión, icono provisional, aviso de versión nueva.
10. Publicación automática en GitHub Pages (solo si pasan las pruebas).
11. Comprobación del dueño en su Android.

## Riesgos que hay que vigilar

- La app sin conexión puede quedarse en una versión antigua: aviso de
  actualización y número de versión visible.
- Las fotos ocupan mucho: reducirlas al guardar.
- "1.234" es ambiguo al pegar: vista previa siempre antes de aceptar.
- Las pruebas de Excel usan un simulador: en cada herramienta, el dueño abre
  el archivo una vez en Excel y en Google Sheets.
- Constantes de cartas de control (A2, D3, D4, d2): enseñar la tabla con su
  fuente para que el dueño la valide antes de usarla.
- La conexión con Google sin servidor no está probada: cada cuánto pide
  reconfirmar el permiso y cómo se comporta en la app instalada en Android.
  Se comprueba al final de la Fase 0, antes de construir nada encima.
- Una sincronización mal hecha pierde datos: copia de seguridad antes que
  sincronización, y pruebas de combinación en cualquier orden.
- El usuario puede editar las pestañas de la app aunque estén protegidas (es
  el propietario del archivo): la app las reescribe y no confía en ellas.

## Registro por fase

(Se rellena al cerrar cada fase; ver PLAN.md, sección 10.)
