# Ficha: OEE, versión 3 — la torta del turno

**Aprobada por el dueño el 2026-11-21 y construida ese día**, con estas
respuestas (mandan sobre el texto de abajo):

- A. «Utilización», sí, y TEEP explicado en el glosario. Al construirlo se
  llamó **«Utilización de la línea»**: Vorne llama «utilization» a otra cosa
  (tiempo planificado ÷ todo el tiempo) y así no se confunden; es además lo
  que significa LU (Line Utilization).
- B. La torta empieza con todo marcado.
- C. Los cambios de tamaño siguen siendo paradas **no planificadas** (con su
  estándar), como manda el estándar del sector: así se ven como algo que se
  puede mejorar, y la torta permite mirarlos desde otra perspectiva.

Construcción: cada categoría da hasta dos porciones, «Categoría · estándar» y
el resto de la categoría (que se llama «Categoría · exceso sobre el
estándar» si todo lo que queda es exceso). En la hoja de Google, la
utilización es una fórmula viva con lo desmarcado. Las mediciones v2 se leen
con lo marcado en «Otras vistas» desmarcado en la torta junto con las
paradas planificadas, y dan el mismo número que antes.

---

Sustituye la sección «Otras vistas
(no son el OEE oficial)» de la versión 2 (`oee-v2.md`, punto B). El resto de
la herramienta no cambia: datos, OEE oficial con sus tres factores, Pareto y
explicaciones.

## Lo que pide el dueño

Lo describe a partir de cómo trabajaba con LU (Line Utilization) en una
embotelladora:
- todo lo que le pasa al turno se ve como una **torta**: cada porción es una
  afectación (parada, cambio, velocidad, calidad) y lo que queda es el
  tiempo útil;
- el porcentaje grande es **útil ÷ turno** con todo dentro;
- se pueden **desmarcar porciones** para ver el porcentaje sin ellas. Un
  gerente desmarca «cambio de tamaño» y ve que, mientras la línea produjo,
  corrió al 70 %;
- un cambio con su **tiempo estándar** (cambio de sabor de 30 min) cuenta
  ese estándar aparte; lo que se pasa de él es otra porción y lleva su
  explicación;
- más adelante, una **línea del tiempo** del turno (ver punto 6).

Su ejemplo, que pasa a ser un caso de prueba:

> En 4 h hubo 2 h de cambio de tamaño planificado y 2 h de producción al 70 %.
> Útil = 2 h × 70 % = 84 min. Con todo: 84 ÷ 240 = **35 %**.
> Sin el cambio de tamaño: 84 ÷ 120 = **70 %**.

## 1. Las porciones

Cada minuto del turno va a **una sola** porción, así que suman el turno:

| Porción | De dónde sale | Ejemplo embotelladora (480 min) |
|---|---|---|
| Tiempo útil | piezas buenas a la velocidad estándar | 332,5 min |
| Cada parada planificada | la lista de planificadas | Reunión 10 min |
| Cada categoría de paradas no planificadas | suma de sus paradas | Averías 25, Falta de material 12, Microparos 18 |
| Parada con estándar: parte estándar | lo que le tocaba durar | Cambio de formato, estándar 30 min |
| Parada con estándar: exceso | lo que se pasó del estándar | Cambio de formato, exceso 10 min |
| Pérdida por velocidad | marcha − tiempo de lo producido a velocidad estándar | 37,5 min |
| Pérdida por calidad | rechazadas a velocidad estándar | 5 min |

Comprobación: 332,5 + 10 + 25 + 30 + 10 + 12 + 18 + 37,5 + 5 = 480.

El tiempo útil no se puede desmarcar.

## 2. El número

> **Utilización = Tiempo útil ÷ (Turno − porciones desmarcadas)**

- Con todo marcado es útil ÷ turno: 332,5 ÷ 480 = **69,27 %**. Es lo que en
  OEE se llama TEEP cuando el turno es todo el tiempo disponible
  (Vorne, oee.com: TEEP = OEE × utilización; utilización = tiempo
  planificado ÷ tiempo total): 70,74 % × 470 ÷ 480 = 69,27 %.
- Si se desmarcan solo las paradas planificadas, sale **el OEE oficial**
  (332,5 ÷ 470 = 70,74 %). Un botón «Ver el OEE oficial» lo hace de un
  toque.
- Cualquier otra combinación da otro porcentaje, con un nombre que dice lo
  quitado («Utilización sin cambio de formato ni falta de material»).

Al tocarlo se abre de dónde sale, como hoy: la fórmula apilada, los minutos
quitados uno a uno y la frase «El OEE oficial sigue siendo el 70,74 %».

## 3. La pantalla

1. **La torta**, con el porcentaje en el centro. Las porciones desmarcadas
   se ven grises y rayadas. Cada familia tiene su color (útil, planificadas,
   paradas, exceso sobre estándar, velocidad, calidad), y cada porción
   lleva además su nombre en la lista, así que no depende solo del color.
2. **La lista de porciones**, de mayor a menor. Cada fila lleva una casilla,
   el nombre, los minutos y su parte del turno. Tocar la fila marca o
   desmarca la porción.
3. Botones: «Marcar todo» y «Ver el OEE oficial».

## 4. Comentarios en las paradas

Cada parada (planificada o no) tiene un campo opcional **«Motivo o
comentario»**. Si una parada se pasa de su estándar, la app lo recuerda:
«Se pasó 10 min del estándar: explica por qué». El comentario sale en la
lista de porciones y en la hoja de Google.

## 5. Lo que se guarda

- Las mediciones de la versión 2 se leen sin perder nada. Las categorías que
  estaban quitadas salen desmarcadas, igual que la parte estándar si estaba
  marcada.
- Lo desmarcado se guarda con la medición, así el informe enseña la misma
  vista.

## 6. Para más adelante (no entra ahora)

- **Línea del tiempo del turno**: ir anotando cada parada con su hora en
  planta. Se pone en marcha un «modo» (cambio de sabor) con su estándar a la
  vista y el aviso cuando se pasa. Encaja en la fase 4 (captura en planta),
  y lo capturado llenaría esta misma torta.
- Los estándares de los cambios de cada línea (cambio de sabor 30 min,
  cambio de tamaño 2 h) se guardarán en las **recetas** (ficha aparte), y
  así no hay que escribirlos cada vez.

## 7. Pruebas

- La embotelladora: las porciones del punto 1 suman 480. Con todo marcado
  da 69,27 %, y con las planificadas desmarcadas, 70,74 % (= el OEE oficial).
- El caso de Vorne: con las planificadas desmarcadas da el OEE publicado,
  74,79 %.
- El caso del dueño: 35 %, y sin el cambio de tamaño, 70 %.
- Desmarcar una parada con estándar entera quita su estándar y su exceso
  una sola vez.

## Preguntas al dueño

- **A. Nombre del número.** Propuesta: «Utilización», con la nota en el
  glosario de que en algunas empresas se llama LU (Line Utilization) y
  que con todo marcado coincide con el TEEP.
- **B. Cómo empieza.** Propuesta: con todo marcado (como el LU), y el OEE
  oficial a un toque.
- **C. El cambio de tamaño planificado.** ¿Va en «paradas planificadas»
  (entonces el OEE oficial no lo cuenta como pérdida) o en las no
  planificadas con su estándar (el OEE oficial lo cuenta)? La app deja
  hacer las dos cosas; la pregunta es cuál ponemos en el ejemplo.
