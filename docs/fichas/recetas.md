# Ficha: líneas y recetas

**Borrador para aprobar (2026-11-21).** El dueño ya aprobó el 2026-11-21
que vivan en **Referencia**, se carguen desde cada proyecto y se ordenen
así: **Planta o compañía → Línea de producción → Receta**.

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
| Línea | nombre; qué produce (unidad); tiempos estándar de sus cambios | Línea 3; botellas; cambio de sabor 30 min, cambio de tamaño 2 h |
| Receta | nombre; sus estaciones (nombre, qué cuenta y su equivalencia, unidad, velocidad estándar); velocidad estándar de la línea para el OEE | 12 oz; Llenadora 48.000 botellas/h, Encajonadora 42 cajas/min (1 caja = 24 botellas)… |

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
    añadir una parada se ofrecen los cambios de la línea con su estándar
    («Cambio de sabor · estándar 30 min»).
- En el takt, **«Guardar como receta»** guarda las estaciones que tienes
  escritas en una receta nueva o encima de una existente.
- La medición guarda una copia y el nombre de la receta («Línea 3 · 12 oz»).
  Si después se cambia la receta, las mediciones ya guardadas no cambian.

## 4. Copia y sincronización

Las recetas entran en la copia de seguridad y, con la cuenta de Google
conectada, se sincronizan entre tus aparatos como los proyectos.

## Preguntas al dueño

- **A. Velocidad estándar de la línea para el OEE.** Propuesta: por defecto,
  la de la estación más lenta de la receta (el cuello de botella),
  pasada a lo que produce la línea, y se puede cambiar a mano. ¿O en tu
  planta se usaba siempre la de la llenadora?
- **B. Orden.** Propuesta: primero la torta del OEE (`oee-v3.md`) y después
  las recetas, porque las recetas guardan los estándares de los cambios que
  usa la torta.
