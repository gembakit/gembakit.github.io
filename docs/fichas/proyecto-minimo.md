# Ficha — Proyecto mínimo

Redactada el 2026-11-14 para que el dueño la apruebe antes de construir.
Aplica el flujo de proyectos acordado ese día (ESTADO.md, sección 6,
«Flujo de proyectos»). Se construye **antes** de las calculadoras 3 a 6, para
que todo lo que venga después nazca ya dentro de un proyecto.

## Para qué sirve

Que todo lo que calcules o captures en planta quede guardado en un proyecto,
con su contexto (cuándo, qué equipo, qué puesto…), y llegue solo al archivo
de Google del proyecto, sin crear archivos nuevos.

## Dos ideas que conviene distinguir

- **Medición:** cada vez que mides de nuevo (otro día, otro turno, otro
  equipo) es una medición nueva: «FPY · línea 3 · Day shift 1 · 14 nov».
  Son los puntos que más adelante se verán en «Evolución».
- **Versión:** si cambian los datos de una medición ya guardada (corriges un
  número o se actualiza su origen), esa misma medición pasa a la versión 2.
  La versión 1 no se borra: queda en su historial.

## Lo que entra

### 1. Lista de proyectos (pantalla «Proyectos», la de inicio)

Cada proyecto en una tarjeta: nombre, tipo, fase en la que está, número de
mediciones y estado con Google («al día», «2 cambios por enviar», «sin
conexión»). Botón «Nuevo proyecto».

### 2. Crear un proyecto

| Dato | Cómo |
|---|---|
| Nombre | Obligatorio. |
| Tipo | DMAIC, Kaizen rápido, A3 · PDCA, Implantación 5S o Seguimiento de proceso. Da las fases. |
| Objetivo | Opcional, una frase («Bajar el rechazo de la línea 3 del 8 % al 4 %»). |
| Campos de contexto | Vienen propuestos y se pueden quitar, renombrar o añadir otros: **Equipo** (Day shift 1, Day shift 2…), **Puesto** (llenadora, etiquetadora…), **Línea**, **Producto**, **Supervisor**, **Operario**. |

### 3. Guardar en el proyecto (desde cualquier herramienta)

El botón «Guardar en un proyecto» abre una hoja inferior:

- **Proyecto:** el último usado ya elegido; se puede cambiar o crear uno nuevo
  ahí mismo.
- **Fase:** la actual del proyecto ya elegida.
- **Nombre de la medición:** propuesto («FPY · 14 nov»), se puede cambiar.
- **Contexto:** fecha y hora automáticas (se pueden corregir) y los campos del
  proyecto, **todos opcionales**. Cada campo ofrece los valores ya usados en
  el proyecto para elegir con un toque: así «Day shift 1» se escribe siempre
  igual y luego se puede comparar. La app recuerda lo último que pusiste.
- **Nota:** opcional.

Funciona sin conexión: se guarda en el teléfono y se envía a Google cuando
haya red.

### 4. Pantalla del proyecto

- Cabecera: nombre, tipo, objetivo y **fase actual** (se cambia con un toque).
- **Mediciones**, agrupadas por fase, con su resultado principal y su
  contexto en una línea («RTY 83 % · Day shift 1 · llenadora · 14 nov»).
  Con una lista larga:
  - **Filtrar** por herramienta, fase y cualquier campo de contexto (Equipo,
    Puesto, Supervisor…), combinables («FPY · Day shift 1 · llenadora»).
  - **Ordenar** por fecha o por resultado, de mayor a menor o al revés. Por
    resultado solo cuando el filtro deja una sola herramienta: no tiene
    sentido ordenar juntos un RTY y un DPMO.
  - Comparar mediciones nuevas con antiguas en un gráfico llega con
    «Evolución»; aquí ya se pueden ver una al lado de otra en la lista.
- **Hitos:** lo que hiciste y cuándo («3 dic · implantación 5S»), con una nota.
  En esta etapa solo se apuntan; se verán en los gráficos de «Evolución».
- **Google:** «Abrir la hoja», «Abrir la carpeta», estado y botón
  «Sincronizar».

### 5. Abrir una medición guardada

Se abre la herramienta con sus datos, su contexto y su nota. Si cambias un
dato y guardas, se crea la **versión 2** (la 1 queda en el historial, con su
fecha). Botón **«Congelar»**: la medición deja de poder cambiar (para la línea
base de Medir). Borrar va a la papelera, con deshacer.

### 6. Google: carpeta, archivo y pestañas

- Carpetas ordenadas desde el principio:

  ```
  Mi unidad
  └─ Gemba Kit/
     ├─ Proyectos/
     │   └─ Rechazo línea 3/
     │       ├─ Rechazo línea 3     ← la hoja del proyecto
     │       ├─ Presentaciones/     ← solo cuando haga falta
     │       └─ Informes/           ← solo cuando haga falta
     ├─ Sueltas/                    ← «Exportar» sin proyecto
     └─ Copias de seguridad/        ← las 10 últimas
  ```

  Si mueves o renombras una carpeta en Drive, la app la sigue encontrando.
- La primera vez que un proyecto se sincroniza, la app crea su carpeta y
  dentro **un único archivo de Sheets** con el nombre del proyecto.
- Pestaña **«Resumen»**: datos del proyecto, fase, objetivo y una tabla con
  todas las mediciones (fecha, herramienta, resultado, contexto, nota) e
  hitos. Es también la que leerán Claude o Gemini.
- **Una pestaña por medición**, con el diseño de hoja que ya aprobaste,
  más su contexto y su versión. Si la medición cambia, se reescribe su
  pestaña; si se borra, se borra su pestaña.
- Las pestañas de la app llevan **aviso para todos** al editarlas (decidido
  por el dueño el 2026-11-14). Si alguien las cambia en Sheets, la app lo
  detecta al sincronizar y pregunta antes de reescribir, ofreciendo guardar
  esa versión como pestaña tuya. El mensaje dice qué pestaña cambió y, si
  Google lo da, **quién modificó el archivo por última vez y cuándo** (ver
  «Por comprobar»).
- Tus pestañas: la app no las toca.
- **Sincronizar:** sola al guardar si hay red, y con el botón. Al terminar,
  un resumen corto («2 pestañas actualizadas»).

### 7. «Exportar» suelto

El de ahora (sin proyecto) sigue, pero los archivos van a
**Gemba Kit / Sueltas** en lugar de la raíz de tu Drive.

### 8. Copia de seguridad y espacio en el teléfono

Ajustes → «Datos y copia de seguridad»:

- **Dónde está todo:** en el almacenamiento de Chrome del teléfono
  (protegido: el sistema no lo borra solo). La pantalla enseña cuánto ocupa
  la app y cuánto queda libre.
- **Copia de seguridad:** un archivo con todos tus proyectos, que puedes
  **descargar** al teléfono o **guardar en tu Drive** (Gemba Kit / Copias),
  y **restaurar**. El archivo de Google del proyecto es un reflejo, no sirve
  para restaurar.
- **Cuánto ocupa de verdad:** los números y textos ocupan muy poco (miles de
  mediciones caben en unos pocos MB). Lo que llenará el teléfono serán las
  **fotos** de la fase 4.
- **Liberar espacio sin riesgo (cuando lleguen las fotos o haya muchos
  proyectos):** **«Archivar proyecto»** guarda el proyecto completo en tu
  Drive, comprueba que la copia se lee bien y **solo entonces** lo quita del
  teléfono, dejando una tarjeta «Archivado». **«Recuperar»** lo vuelve a
  bajar. Esto va con las fotos, no en el proyecto mínimo.

Hasta ahora no se guardaba nada real; con los proyectos sí.

## Lo que se queda para después (en este orden propuesto)

1. Calculadoras 3 a 6 (takt con balanceo, OEE, kanban, ahorro con ROI), ya
   guardando en proyectos.
2. **Evolución:** gráfico de una métrica en el tiempo, elegir mediciones o
   versiones, comparar por equipo, puesto, turno… con los hitos marcados, y
   antes/después con la prueba de si la mejora es real (cartas de control o
   pruebas de hipótesis, con fuentes citadas).
3. Importar desde pestañas del proyecto y la sección «Datos» (agrupada por
   archivo, aviso de cambios, conservar o volver a crear lo borrado).
4. Visor de la hoja dentro de la app.
5. Sincronización entre aparatos (teléfono ↔ ordenador). **Hasta entonces, los
   proyectos viven en el aparato donde los creas**: en el ordenador verás el
   archivo de Google, pero no podrás seguir el proyecto en la app del
   ordenador.
6. Acciones, informe, A3, presentación de Google y PDF (fase 6).
7. Plantillas propias de proyecto.

## Avisos que comprobará la app

- Guardar sin proyectos: ofrece crear uno ahí mismo.
- Medición congelada: no deja cambiar sus datos (se puede descongelar, con
  aviso).
- Pestaña de la app cambiada en Sheets: pregunta antes de reescribir.
- Archivo o carpeta del proyecto borrados en Drive: pregunta si volver a
  crearlos.
- Sin conexión: guarda igual y lo dice («se enviará al tener red»).

## Por comprobar

- **Protección de las pestañas.** Según la documentación de la API de Google
  Sheets (`ProtectedRange.warningOnly`), una pestaña protegida puede ser de
  dos maneras, **no las dos a la vez**:
  1. **Con aviso para todos:** cualquiera que pueda editar el archivo
     (tú incluido) ve el aviso y puede seguir.
  2. **Bloqueada para los demás:** solo tú puedes editarla, **sin aviso**;
     los demás no pueden.
  La detección al sincronizar protege tus cambios en los dos casos.
- Si el aviso aparece en la app de Sheets del Android (paso 6 de la prueba).
- **Quién lo editó.** Google da la última persona que modificó **el archivo**
  y la hora (dato del archivo en Drive), pero no qué celda ni qué pestaña
  cambió cada persona: eso solo se ve en el historial de versiones de
  Sheets. La app sabrá **qué pestaña** cambió comparando con lo que escribió
  ella. El mensaje sería: «La pestaña FPY · 14 nov cambió. Última
  modificación del archivo: Ana Pérez, hoy 10:32». Si varias personas
  tocaron el archivo, el nombre es solo el de la última. Comprobar que
  Google lo da con el permiso actual.

## ❓ Decides tú

- **A. Protección:** decidido: **aviso para todos**.
- **B. Copia de seguridad dentro del proyecto mínimo:** decidido: **sí**. El
  dueño pide además poder liberar espacio sin arriesgar datos y saber dónde
  se guarda todo (sección 8). Preguntó por Firebase: ver ESTADO.md, sección 6.
- **C. Campos de contexto:** decidido: **los propuestos** (Equipo, Puesto,
  Línea, Producto, Supervisor, Operario), todos opcionales, y se pueden
  añadir más.
- **D. Orden de lo que viene después:** decidido: **calculadoras 3 a 6** y
  después «Evolución».
- **E. Cuenta de Google:** ¿la de siempre o una cuenta nueva solo para
  Gemba Kit? Decidirlo antes de crear proyectos reales: las carpetas viven
  en el Drive de la cuenta conectada.
