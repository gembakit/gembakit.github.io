# Ficha: takt y cuello de botella, versión 2

**Aprobada por el dueño el 2026-11-16 y construida ese día**, con estos
cambios sobre el borrador (manda esta lista sobre el texto de abajo):

- A. Cada tiempo (turno, cada descuento) lleva su propia unidad s/min/h, y
  hay un selector «Resultados en» s/min/h; la app convierte. La resta del
  turno se enseña en la unidad más pequeña escrita (480 − 10 − 20 min) y,
  si los resultados van en otra, también en esa.
- B. Menor repetible = **el segundo mejor valor** (en tiempos, el segundo
  menor; en velocidades, el segundo mayor, «mayor repetible»): el mejor
  alcanzado al menos dos veces. Sin margen del 5 %. Se enseña junto al
  mínimo y al máximo.
- C. Se calcula con la media por defecto; se puede elegir el repetible o el
  teórico.
- D. Tipo de línea: montaje con puestos (con balanceo) o máquinas en serie
  (sin balanceo). Aprobado tras explicarlo con ejemplos.
- E. OEE esperado opcional, con «OEE mínimo necesario» para cumplir la
  demanda. Aprobado tras explicarlo con la embotelladora.
- F. Ejemplos: embotelladora y armado manual de packs promocionales (tres
  puestos: formar la caja, meter botellas y regalo, cerrar y etiquetar).
- Hoja de Google: la tabla solo admite tres columnas de números, así que
  lleva teórico, el valor real con el que se calcula (la media o el
  repetible, que escribe la app) y el ciclo o la velocidad en la unidad de
  los resultados (fórmula); las medidas una a una van en las notas. En las
  líneas medidas en velocidad con montaje, el balanceo solo se ve en la app.

---

Borrador para aprobar (2026-11-15). Sustituye a la ficha 3 de
`docs/fichas/fase-1.md` en lo que cambia; lo demás (fórmulas del takt, casos
publicados) se mantiene.

Pedido del dueño: ver la resta del tiempo disponible; ciclo teórico frente a
real con varias medidas (media y menor tiempo); medir en tiempo de ciclo o en
velocidad de línea (líneas rápidas, «48.000 cph»), con la unidad a su gusto
pero sin que la app confunda ciclos con velocidades.

---

## 1. Tiempo disponible: la resta a la vista

| Dato | Ejemplo |
|---|---|
| Duración del turno (min u h) | 8 h |
| Descuentos, cada uno con nombre y minutos (los que hagan falta; puede no haber ninguno) | Reunión de arranque 10 · Limpieza programada 20 |
| Turnos en el periodo (1 por defecto) | 3 |

La app enseña la cuenta entera:

> 480 − 10 − 20 = **450 min por turno** × 3 turnos = **1.350 min disponibles**

- Los descuentos van siempre en minutos (es como se apuntan descansos y
  limpiezas); el turno, en minutos u horas.
- Solo se descuenta lo **planificado**: descansos si la línea para, comidas,
  reuniones, limpiezas o mantenimiento programados. Las averías **no**: el
  takt es el ritmo que pide el cliente, y las averías no cambian lo que pide.
  Se ven aparte (apartado 5).
- Si en la planta se rotan los puestos y la línea no para en los descansos,
  no se pone ningún descuento por ellos.

## 2. Demanda y su unidad

| Dato | Ejemplo |
|---|---|
| Demanda en el periodo | 900.000 |
| Nombre de la unidad (libre) | botellas |

El nombre es libre (piezas, botellas, latas, cajas, envases…) y sale en todos
los resultados. Es solo un nombre: no cambia ninguna cuenta.

## 3. Ciclo o velocidad

Una sola pregunta para toda la calculadora: **¿cómo mides la línea?**

- **Tiempo por unidad** (tiempo de ciclo): s, min u h por unidad. Lo normal
  en montaje con personas.
- **Unidades por tiempo** (velocidad): unidades por minuto o por hora. Lo
  normal en líneas rápidas (48.000 botellas/h).

El **tipo** se elige de una lista fija, así la app sabe siempre qué es cada
número y pasa de uno a otro por dentro (48.000 /h = 3.600 s ÷ 48.000 =
0,075 s por unidad). El takt y los resultados salen **en las dos formas**:
«takt 0,09 s por botella = 40.000 botellas/h».

## 4. Estaciones o máquinas (opcional)

Cada una con:

| Dato | Ejemplo (llenadora) |
|---|---|
| Nombre | Llenadora |
| Teórico (opcional): el de diseño o de placa | 48.000 /h |
| Real: una o varias medidas tomadas en planta | 44.000 · 45.500 · 43.800 · 44.700 /h |

Con dos o más medidas reales, la app calcula y enseña:

- **Media**: lo que de verdad sale de la línea.
- **Menor repetible**: el mejor tiempo que el puesto consigue **más de una
  vez** (lo usa la escuela Lean para diseñar el trabajo; un mínimo que sale
  una sola vez suele ser un error de medida). Regla propuesta: el menor valor
  que se repite al menos dos veces con un margen del 5 %. Si ninguno se
  repite, sale «—».
- **Mínimo y máximo**, y la **variación** (cuánto se separan): mucha
  variación indica un puesto inestable.
- **Real frente a teórico**: «la llenadora va al 93 % de su velocidad de
  placa».

Con velocidades, la media se hace de las velocidades; con tiempos, de los
tiempos.

**Con qué valor calcula** (una opción para toda la calculadora): **media**
(por defecto), menor repetible o teórico. Una estación sin medidas reales usa
su teórico, y se dice.

**Qué enseña:** barras de cada estación con su valor real, una marca en el
teórico y la línea del takt; el cuello de botella resaltado.

## 5. Tipo de línea y lo que se calcula

Hoy la calculadora da siempre el mínimo de estaciones y la eficiencia del
balanceo. Eso solo tiene sentido si el trabajo **se puede repartir** entre
puestos (montaje con personas). En una línea de máquinas (llenadora,
etiquetadora…) no se puede pasar trabajo de una máquina a otra. Propuesta:

- **Montaje con puestos**: takt, cuello de botella, capacidad, mínimo de
  estaciones, eficiencia del balanceo y tiempo muerto (como hoy).
- **Máquinas en serie**: takt, cuello de botella y capacidad; sin mínimo de
  estaciones ni balanceo.

**Comparación con el OEE (opcional).** Un campo «OEE esperado de la línea».
Como el OEE ya incluye la pérdida de velocidad, se aplica a la velocidad
**teórica** del cuello de botella (aplicarlo a la real contaría dos veces esa
pérdida):

- Producción esperada = teórico del cuello × OEE.
- **OEE mínimo necesario** = takt ÷ teórico del cuello: «para cumplir la
  demanda, la línea necesita un OEE de al menos el 83,3 %».

## 6. Cómo leerlo (frases nuevas)

- «Hay que sacar una botella cada 0,09 s (40.000 botellas/h) para cumplir la
  demanda.»
- «La llenadora es el cuello de botella: 44.500 botellas/h de media, el 93 %
  de su velocidad de placa.»
- «Con un OEE del 75 %, la línea saca 36.000 botellas/h, por debajo de las
  40.000 que pide el takt. Necesita al menos un 83,3 %.»
- «La etiquetadora varía mucho entre medidas (de 49.500 a 54.000 /h):
  conviene estabilizarla antes de balancear.»
- Error típico (se mantiene): calcular con el tiempo total del turno, sin
  quitar lo planificado. Nuevo: restar también las averías.

## 7. Ejemplos cargables

Dos, a elegir al pulsar «Cargar ejemplo»:

1. **Embotelladora** (velocidad): turno de 8 h, 10 + 20 min de descuentos, 3
   turnos, 900.000 botellas; despaletizadora, llenadora, etiquetadora y
   encajonadora con su velocidad de placa y medidas reales; OEE esperado
   75 %. Cuenta propia: takt 0,09 s = 40.000 /h; OEE mínimo 83,3 %.
2. **Montaje** (tiempo de ciclo): turno de 480 min, dos descansos de 10 y
   comida de 30 → 430 min; 215 piezas → takt 2 min; tres puestos con medidas.
   Cuenta propia sobre el caso del Lean Lexicon (takt 2 min).

Los tres casos publicados de la ficha original se siguen comprobando en las
pruebas.

## 8. Hoja de Google y mediciones guardadas

- La hoja lleva la tabla del tiempo disponible (turno, cada descuento, turnos
  y total con fórmulas), la de estaciones (teórico, media, menor repetible,
  mínimo, máximo, real frente a teórico) y debajo la de todas las medidas,
  con fórmulas vivas donde se pueda.
- Las mediciones de takt ya guardadas se abren sin perder nada: su tiempo
  disponible pasa a «turno» sin descuentos y el ciclo de cada estación, a una
  medida real.

---

## Preguntas para el dueño

A. **Descuentos siempre en minutos** (el turno en min u h). ¿De acuerdo?
B. **Menor repetible**: el menor valor que se repite al menos dos veces con
   un margen del 5 %. ¿Te sirve esa regla?
C. **Calcular con la media por defecto**, con opción de usar el menor
   repetible o el teórico. ¿De acuerdo?
D. **Tipo de línea** (montaje / máquinas en serie), y el mínimo de estaciones
   y el balanceo solo en montaje. ¿De acuerdo?
E. **OEE esperado** opcional, aplicado a la velocidad teórica, con el «OEE
   mínimo necesario». ¿Lo quieres?
F. **Dos ejemplos** (embotelladora y montaje). ¿De acuerdo?
