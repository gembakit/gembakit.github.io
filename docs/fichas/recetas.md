# Ficha: líneas y recetas

**Aprobada por el dueño el 2026-11-21** (pendiente de construir, después de
la torta del OEE). Decisiones del dueño:

- Viven en **Referencia**, se cargan desde cada proyecto y se ordenan así:
  **Planta o compañía → Línea de producción → Receta**.
- **La línea es solo un título** para distinguirla de las otras. Toda la
  información va en la receta, que es el «archivo» que se abre: qué produce
  (12 oz, 20 oz…), sus estaciones y los estándares de sus cambios. Una línea
  produce una u otra según la programación.
- **Varias recetas por línea**, tantas como haga falta.
- A. Velocidad estándar de la línea para el OEE: la de la estación más lenta
  de la receta (en su planta coincidía con la llenadora porque era la más
  lenta), y si se cambia a mano, se queda la escrita.
- B. Primero la torta del OEE, después las recetas.
- (2026-11-21, después) Se crean con **«Guardar como receta» desde la
  herramienta** (el takt y el OEE), no con un editor aparte. Una receta
  nueva a partir de otra: se carga, se cambia y se guarda con otro nombre.
  Después de cargarla se puede cambiar todo; la receta no cambia hasta
  guardarla otra vez.
- (2026-11-21) **Máquina en cada parada del OEE** y Pareto por máquina, con
  la lista de máquinas sacada de la receta. Se apunta la máquina que
  **causó** la parada, no la afectada (en el LU de su planta: en rojo la que
  se paró por su culpa, en azul las paradas por consecuencia). La velocidad
  y la calidad no se reparten por máquina: van como «Toda la línea».

Construcción en dos pasos:
1. (2026-11-21, hecho) Tabla `recipes` (base local v4), copia de seguridad
   (de cada receta se queda la más reciente), takt con «Cargar receta» y
   «Guardar como receta», y Referencia › «Mis líneas» (planta → línea →
   receta; ver estaciones, cambiar nombre, duplicar, borrar con «Deshacer»).
   La medición del takt guarda de qué receta salió.
2. (2026-11-21, hecho) OEE: cargar y guardar receta (velocidad de la línea
   = la estación más lenta, o la escrita; cambios con su estándar), máquina
   que causó cada parada y Pareto por máquina. Cada herramienta guarda solo
   su parte de la receta: el takt, las estaciones; el OEE, la velocidad de
   la línea y los cambios.

## Para qué sirve

En una misma línea se hacen muchos proyectos. Cada producto (12 oz, 20 oz y
a veces cada sabor) hace correr cada estación a otra velocidad. Sin recetas,
hay que escribir las estaciones, sus unidades, sus equivalencias y sus
velocidades estándar en cada medición. Con ellas se escriben una vez y se
cargan de un toque.

## 1. Qué guarda cada nivel

| Nivel | Datos | Ejemplo |
|---|---|---|
| Planta o compañía | nombre | Planta Norte |
| Línea | solo su nombre | Línea 3 |
| Receta | nombre; qué produce (unidad); sus estaciones (nombre, qué cuenta y su equivalencia, unidad, velocidad estándar); velocidad estándar de la línea para el OEE (la más lenta, o la escrita); tiempos estándar de sus cambios | 12 oz Coca-Cola; botellas; Llenadora 48.000 botellas/h, Encajonadora 42 cajas/min (1 caja = 24 botellas)…; cambio de sabor 30 min |

## 2. Dónde se ven

Barra de abajo → **Referencia** → una sección nueva **«Mis líneas»**. Dentro
están las plantas; en cada planta, sus líneas; en cada línea, sus recetas.
Se pueden crear, cambiar de nombre, duplicar (para hacer la 20 oz a partir
de la 12 oz) y borrar con «Deshacer».

## 3. Cómo se usan

- En el **takt** y en el **OEE**, junto a «Cargar ejemplo», un botón
  **«Cargar receta»** abre Planta → Línea → Receta.
  - Takt: carga las estaciones con sus unidades, equivalencias y
    velocidades estándar. Las medidas reales las tomas tú.
  - OEE: carga la velocidad estándar de la línea y lo que produce. Al
    añadir una parada se ofrecen los cambios de la receta con su estándar
    («Cambio de sabor · estándar 30 min»).
- En el takt, **«Guardar como receta»** guarda las estaciones que tienes
  escritas en una receta nueva o encima de una existente.
- La medición guarda una copia y el nombre de la receta («Línea 3 · 12 oz»).
  Si después se cambia la receta, las mediciones ya guardadas no cambian.

## 4. Copia y sincronización

Las recetas entran en la copia de seguridad y, con la cuenta de Google
conectada, se sincronizan entre tus aparatos como los proyectos.
