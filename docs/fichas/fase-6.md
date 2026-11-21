# Fase 6 · Proyecto completo, asistente e informe

Borrador redactado el 2026-11-21 durante el encargo «terminar la app». Se
construyó sin esperar aprobación (ver ESTADO.md); el dueño lo revisa después.

## 1. Pestañas del proyecto

- Para qué: que el proyecto no sea una lista larga. Cuatro pestañas arriba:
  **Fases**, **Hoja**, **Acciones**, **Informe**. Icono con su nombre debajo,
  para que quepan a 320 px.
- Enlace directo: `#/proyectos/<id>/<pestaña>` (la Lista de acciones del
  catálogo abre la pestaña Acciones del proyecto elegido).

## 2. Fases: «Para cerrar la fase» y herramientas de la fase

- Cada tipo de proyecto y fase tiene una lista de herramientas habituales y de
  comprobaciones (`src/projects/phaseGuide.ts`). Tocar una herramienta deja el
  proyecto elegido para guardar.
- Comprobaciones, calculadas con lo que ya tiene el proyecto:

| Comprobación | Se cumple cuando |
|---|---|
| Objetivo escrito | el proyecto tiene objetivo |
| Medición de datos en esta fase | hay una medición de una herramienta de datos guardada en esa fase |
| Causa raíz documentada | hay un 5 porqués o una espina de pescado |
| Informe A3 empezado | hay un A3 |
| Acciones apuntadas | hay al menos una acción |
| Todas las acciones hechas | hay acciones y todas están hechas |
| Plan de control o carta | hay un plan de control o una carta de control |
| Auditoría 5S guardada | hay una auditoría (en Sostener, una de esa fase) |
| Evento Kaizen documentado | hay un evento Kaizen |

- Cada comprobación lleva icono y texto («Hecho» / «Pendiente»), no solo color.
- Es una guía, no un candado: se puede pasar de fase aunque falte algo.

## 3. Asistente «¿Qué necesitas hacer?»

Trece necesidades en lenguaje de planta, cada una con sus herramientas
(ver `NEEDS`). Por ejemplo «Saber si el proceso es estable o si cambió» →
Gráfico de corrida, Cartas de control.

## 4. Informe del proyecto

- «Crear PDF del proyecto»: tipo, fase, objetivo; cada medición con su fase,
  herramienta, fecha, resultado y la conclusión de «Cómo leerlo»; acciones con
  responsable, fecha y estado; hitos. Mismo estilo que el resto de PDF
  (azul marino, colores estándar, no los del tema).
- «Copiar contexto para IA»: el mismo contenido en texto con marcas sencillas
  para pegarlo en cualquier IA. La app no llama a ninguna IA (restricción 1).

## Casos de prueba

- `src/projects/phase6.test.ts`: cada fase de cada tipo tiene guía con
  herramientas que existen y textos en los dos idiomas; las comprobaciones
  responden a lo guardado; el informe junta objetivo, conclusión del 5 porqués
  de ejemplo y acciones.

## Pendiente o fuera

- Plantillas de proyecto propias del usuario: no hechas (pregunta al dueño en
  ESTADO.md).
- No hay cálculo nuevo en esta fase: no aplica la regla de casos de referencia.
