# Fichas de la Fase 1 — Calculadoras rápidas

Redactado el 2026-11-13 y **aprobado por el dueño el mismo día** (parada 5
de PLAN.md), con estas respuestas:

| Pregunta | Respuesta |
|---|---|
| A. Seis calculadoras, con Ahorro, ROI y payback en una | Sí |
| B. Número en grande en DPMO | Nivel sigma con el desplazamiento de 1,5; la Z de Minitab debajo |
| C. Referencia del 85 % en OEE | Sí, con su fuente y sus matices (ficha 4) |
| D. Horizonte del ROI por defecto | 1 año |
| E. Separar ahorro duro y blando | Sí; el ROI y el payback, solo con el duro |

Cómo leer cada ficha:

- **Para qué sirve**, **Datos que pide**, **Fórmulas**, **Qué enseña** y
  **Cómo leerlo** (las frases que verá el usuario).
- **Avisos**: lo que la app comprueba y avisa.
- **Casos de referencia**: ejemplos publicados con su resultado. Las pruebas
  automáticas comprueban que la app da exactamente esos números. Ninguno
  está calculado por mí.
- **❓ Decides tú**: lo que necesito que elijas.

Todas las calculadoras comparten:

- Teclear o pegar; las que piden una lista (pasos, estaciones, años) también
  importan .xlsx o .csv.
- Coma o punto decimal. Resultados con coma en español.
- Botón «Cargar ejemplo» con uno de los casos de referencia.
- Exportación a .xlsx con fórmulas vivas (Fase 1) y, más adelante, a la hoja
  de Google.

---

## Lista propuesta

| # | Calculadora | Cambio respecto al encargo |
|---|---|---|
| 1 | DPMO y nivel sigma | — |
| 2 | FPY y RTY | — |
| 3 | Takt y cuello de botella | Incluye el balanceo de la línea |
| 4 | OEE | — |
| 5 | Kanban (número de tarjetas) | — |
| 6 | Ahorro, ROI y payback | **Una sola** en lugar de dos: el ahorro es el dato de entrada del ROI y del payback |

❓ **Decides tú (A):** ¿Estas seis? ¿Juntamos «Ahorro» con «ROI y payback»?

---

## 1. DPMO y nivel sigma

**Para qué sirve.** Medir cuántos defectos tiene un proceso de forma
comparable entre procesos distintos, y traducirlo a nivel sigma.

**Datos que pide.**

| Dato | Ejemplo |
|---|---|
| Unidades revisadas | 1.000 |
| Oportunidades de defecto por unidad | 5 |
| Defectos encontrados (defectos, no unidades defectuosas) | 50 |

**Fórmulas.**

- DPU (defectos por unidad) = defectos ÷ unidades
- DPO (defectos por oportunidad) = defectos ÷ (unidades × oportunidades)
- DPMO = DPO × 1.000.000
- Rendimiento por oportunidad = 1 − DPO
- Z a largo plazo = Φ⁻¹(1 − DPO), donde Φ⁻¹ es la inversa de la normal
  estándar. Es lo que Minitab llama «Z del proceso».
- Nivel sigma (con desplazamiento de 1,5) = Z a largo plazo + 1,5. Es el de
  las tablas habituales de Seis Sigma (6σ = 3,4 DPMO).

**Qué enseña.** En grande, el DPMO y el nivel sigma. Debajo, DPU, DPO,
rendimiento y Z a largo plazo.

**Cómo leerlo (frases).**

- «Hay {DPMO} defectos por millón de oportunidades: nivel sigma {σ}.»
- «El nivel sigma incluye el desplazamiento convencional de 1,5. Sin él
  (Z del proceso, como lo da Minitab) sería {Z}.»
- Error típico: «Contar unidades defectuosas en lugar de defectos, o cambiar
  la definición de oportunidad entre dos mediciones. Así no se pueden
  comparar.»

**Avisos.**

- Más defectos que oportunidades: imposible; revisa los datos.
- Cero defectos: el DPMO es 0, pero el nivel sigma no se puede calcular.
  Hace falta una muestra más grande.
- Recordatorio fijo: contar defectos, no unidades defectuosas.

**Casos de referencia.**

| Datos | Resultado publicado | Fuente |
|---|---|---|
| 66.807 DPMO | nivel sigma 3 | Tabla de Seis Sigma (Gygi, DeCarlo y Williams, *Six Sigma for Dummies*, Wiley, 2005), recogida en Wikipedia «Six Sigma» |
| 6.210 / 233 / 3,4 DPMO | nivel sigma 4 / 5 / 6 | Misma tabla |
| Proporción defectuosa 0,2264 | Z del proceso 0,7507 | Ayuda de Minitab, «What is Process Z?» |
| 1.000 unidades × 5 oportunidades, 50 defectos | DPMO 10.000 | Learn Lean Sigma, guía de DPMO |
| 2.000 rodamientos × 4 oportunidades, 7 defectos | DPMO 875 | World Class Manufacturing, «Determine Process Sigma and DPMO» |
| 10 unidades × 15 oportunidades, 2 defectos | DPMO 13.333, unos 3,7 sigma | Quality Gurus, «Defects per million opportunities» |

Las tablas publicadas redondean. La prueba admite la diferencia de
redondeo que tenga cada fuente, y nada más.

❓ **Decides tú (B):** ¿Qué número va en grande?
1. **Nivel sigma con el 1,5** (el de las tablas y el que se usa al hablar
   de «6 sigma»), con la Z de Minitab debajo. **Recomendado.**
2. La Z del proceso de Minitab, sin el 1,5, con el nivel sigma debajo.

---

## 2. FPY y RTY

**Para qué sirve.** Saber qué parte sale bien a la primera en cada paso y
en todo el proceso: la «fábrica oculta» de retrabajos.

**Datos que pide.** Una fila por paso del proceso:

| Paso | Unidades que entran | Buenas a la primera (sin retrabajo ni desecho) |
|---|---|---|
| Soldadura | 200 | 186 |

También se puede escribir directamente el FPY (%) de cada paso.

**Fórmulas.**

- FPY del paso = buenas a la primera ÷ unidades que entran
- RTY = FPY₁ × FPY₂ × … × FPYₙ
- Fábrica oculta = 1 − RTY (unidades que en algún paso necesitaron
  retrabajo o se desecharon)

**Qué enseña.** En grande, el RTY. Una barra por paso con su FPY, marcando
el paso más bajo.

**Cómo leerlo (frases).**

- «De cada 100 unidades, {RTY×100} pasan todo el proceso sin ningún
  retrabajo.»
- «El paso que más resta es {paso} (FPY {x} %). Mejorarlo es lo que más sube
  el RTY.»
- Error típico: «Contar como buenas las unidades retrabajadas. Eso es el
  rendimiento final, no el FPY, y esconde la fábrica oculta.»

**Avisos.**

- Más buenas que entradas en un paso.
- Un paso sin unidades de entrada.
- El RTY siempre es menor o igual que el peor paso. Si no lo es, algo está
  mal en los datos.

**Casos de referencia.**

| Datos | Resultado publicado | Fuente |
|---|---|---|
| 4 pasos con FPY 85 % cada uno | RTY 52,2 % | iSixSigma, diccionario «Rolled Throughput Yield» |
| 3 pasos: 97 %, 94 %, 91 % | RTY 83 % | Fabrico, «First pass yield vs rolled throughput yield» |
| 200 placas, 14 fallan en la inspección | FPY 93 % | Fabrico, mismo artículo |

---

## 3. Takt y cuello de botella

**Para qué sirve.** Saber a qué ritmo hay que producir para cumplir la
demanda, qué estación no llega y cuántas personas o estaciones harían falta
como mínimo.

**Datos que pide.**

| Dato | Ejemplo |
|---|---|
| Tiempo disponible del periodo (turno menos paradas planificadas) | 480 min |
| Demanda del cliente en ese periodo | 240 piezas |
| Opcional: tiempo de ciclo de cada estación | 1,8 · 2,3 · 1,5 min |

**Fórmulas.**

- Takt = tiempo disponible ÷ demanda
- Cuello de botella = estación con el mayor tiempo de ciclo
- Capacidad de la línea = tiempo disponible ÷ tiempo de ciclo del cuello
- Mínimo teórico de estaciones o personas = suma de tiempos de ciclo ÷ takt,
  redondeado hacia arriba
- Eficiencia del balanceo = suma de tiempos de ciclo ÷ (número de estaciones
  × takt). Es la forma de los libros de texto: mide el trabajo frente al
  tiempo que la demanda da a la línea. Tiempo muerto = 1 − eficiencia.
  Si pasa del 100 %, la línea no llega a la demanda y se avisa.

**Qué enseña.** En grande, el takt. Si hay estaciones, un gráfico de barras
con el tiempo de ciclo de cada una y una línea horizontal en el takt
(el «yamazumi» sencillo).

**Cómo leerlo (frases).**

- «Hay que terminar una pieza cada {takt} para cumplir la demanda.»
- «{estación} tarda {TC}, por encima del takt: es el cuello de botella y la
  línea solo llega a {capacidad} piezas, frente a {demanda} pedidas.»
- «Con este trabajo bastarían {mínimo} estaciones; ahora hay {n}.»
- Error típico: «Calcular el takt con el tiempo total del turno, sin quitar
  descansos y paradas planificadas.»

**Avisos.**

- Demanda cero.
- Unidades de tiempo distintas entre el tiempo disponible y los ciclos (la
  app pide la unidad y convierte).

**Casos de referencia.**

| Datos | Resultado publicado | Fuente |
|---|---|---|
| 480 min/día, 240 piezas/día | takt 2 min | Lean Enterprise Institute, Lean Lexicon, «Takt time» |
| 280 h (1.008.000 s), 36.000 piezas | takt 28 s | Christoph Roser, AllAboutLean, «The Kanban Formula, Part 1» |
| 500 coches/día en 420 min; trabajo total 195 s; 5 estaciones | takt 50,4 s; mínimo teórico 3,87 → 4 estaciones; eficiencia 77 % (tiempo muerto 23 %) | Apuntes de la Universidad CSJM (Kanpur), «Line Balancing», ejemplo «MS 800». Es el ejemplo clásico del libro de Chase, Jacobs y Aquilano; las 5 estaciones salen de su figura, que no se puede leer como texto, y cuadran con el 77 % publicado. |

---

## 4. OEE

**Para qué sirve.** Medir qué parte del tiempo planificado se convierte en
piezas buenas a la velocidad ideal, y en qué se pierde el resto.

**Datos que pide.**

| Dato | Ejemplo |
|---|---|
| Duración del turno | 480 min |
| Paradas planificadas (descansos, comidas) | 60 min |
| Paradas no planificadas (averías, cambios…) | 47 min |
| Tiempo de ciclo ideal | 1,0 s por pieza |
| Piezas totales producidas | 19.271 |
| Piezas rechazadas | 423 |

**Fórmulas** (las de oee.com, de Vorne).

- Tiempo planificado = turno − paradas planificadas
- Tiempo en marcha = tiempo planificado − paradas no planificadas
- Disponibilidad = tiempo en marcha ÷ tiempo planificado
- Rendimiento = (tiempo de ciclo ideal × piezas totales) ÷ tiempo en marcha
- Calidad = piezas buenas ÷ piezas totales
- OEE = disponibilidad × rendimiento × calidad
- Pérdidas en minutos: por paradas, por velocidad y por calidad.

**Qué enseña.** En grande, el OEE. Debajo, los tres factores y una barra
que reparte el tiempo planificado entre tiempo útil y las tres pérdidas.

**Cómo leerlo (frases).**

- «De cada hora planificada, {OEE×60} minutos se convierten en piezas buenas
  a velocidad ideal.»
- «Lo que más resta es {pérdida}: {minutos} min del turno.»
- Error típico: «Usar como tiempo de ciclo ideal el habitual en lugar del
  mejor posible. El rendimiento sale alto y esconde la pérdida de
  velocidad.»

**Avisos.**

- Rendimiento por encima del 100 %: el tiempo de ciclo ideal está mal (es
  más lento que lo que de verdad se consigue).
- Paradas mayores que el tiempo disponible; más rechazos que piezas.

**Casos de referencia.**

| Datos | Resultado publicado | Fuente |
|---|---|---|
| Los del ejemplo de arriba | Disponibilidad 88,81 %, rendimiento 86,11 %, calidad 97,80 %, OEE 74,79 % | Vorne, oee.com, «Calculating OEE» |

**Referencia de comparación (decisión C).** Debajo del resultado, en
pequeño y sin colores de aprobado o suspenso:

«Se suele citar un 85 % como OEE de clase mundial (90 % disponibilidad,
95 % rendimiento, 99 % calidad), según Seiichi Nakajima, *Introduction to
TPM* (1984; en inglés, Productivity Press, 1988). Es una referencia de la
industria del automóvil japonesa de los años 70 para fabricación
discreta. Muchas plantas están cerca del 60 %: lo útil es comparar tu
línea consigo misma a lo largo del tiempo.»

Fuente consultada: Vorne, oee.com, «World-Class OEE». Esa página dice
«99 %» de calidad; otras citas de Nakajima dicen 99,9 %. Antes de
publicar el texto lo compruebo; si no lo aclaro, pongo solo el 85 % sin
desglose.

---

## 5. Kanban (número de tarjetas)

**Para qué sirve.** Calcular cuántos contenedores o tarjetas hacen falta en
un circuito kanban.

**Datos que pide.**

| Dato | Ejemplo |
|---|---|
| Demanda media | 2.000 piezas/día |
| Tiempo medio de espera del contenedor | 0,08 días |
| Tiempo medio de proceso del contenedor | 0,02 días |
| Margen de seguridad | 10 % |
| Piezas por contenedor | 22 |

Se puede dar el tiempo de reposición total en lugar de espera + proceso.

**Fórmula** (la de Toyota, en la forma de Krajewski, Ritzman y Malhotra).

- Contenedores = demanda × (espera + proceso) × (1 + margen) ÷ piezas por
  contenedor, **redondeado hacia arriba**

**Qué enseña.** En grande, el número de tarjetas. Debajo, el resultado sin
redondear y cuántas piezas hay en el circuito.

**Cómo leerlo (frases).**

- «Hacen falta {k} tarjetas: {k × piezas} piezas en circulación como
  máximo.»
- «Sin redondear salen {x}. Se redondea hacia arriba porque no hay medio
  contenedor.»
- Error típico: «Usar el tiempo de proceso y olvidar la espera, que suele
  ser la mayor parte del tiempo de reposición.»

**Avisos.**

- Unidades distintas entre la demanda y los tiempos (la app pide la unidad y
  convierte).
- Margen de seguridad 0: se avisa de que cualquier variación deja la línea
  sin material.

**Casos de referencia.**

| Datos | Resultado publicado | Fuente |
|---|---|---|
| 2.000/día, espera 0,08 d, proceso 0,02 d, 10 %, 22 por contenedor | 10 contenedores | Krajewski, Ritzman y Malhotra, *Operations Management*, ejemplo «Westerville Auto Parts» |
| Igual, con espera 0,06 d | 8 contenedores | Mismo ejemplo |
| 400/h, 2 h, 20 %, 100 por contenedor | 9,6 → 10 tarjetas | Fabrico, «Kanban manufacturing» |

---

## 6. Ahorro, ROI y payback

**Para qué sirve.** Justificar una mejora: cuánto ahorra al año, cuánto
tarda en recuperarse la inversión y qué rentabilidad da.

**Datos que pide.**

| Dato | Ejemplo |
|---|---|
| Inversión inicial | 120.000 € |
| Ahorro anual, de una de estas tres formas: | |
| · directamente | 24.000 €/año |
| · por unidad: (coste antes − coste después) × unidades al año | |
| · por tiempo: horas ahorradas al año × coste por hora | |
| Costes nuevos que añade la mejora cada año (opcional) | 0 € |
| Horizonte para el ROI | 1 año |
| Opcional: ahorro distinto cada año (una fila por año) | |

**Fórmulas.**

- Ahorro anual neto = ahorro anual − costes nuevos anuales
- Payback (años) = inversión ÷ ahorro anual neto. Si el ahorro cambia cada
  año, se acumula año a año y se interpola dentro del año en que se
  recupera.
- ROI = (ahorro neto acumulado en el horizonte − inversión) ÷ inversión

Sin descontar: no se aplica tasa de interés. Se avisa.

**Qué enseña.** En grande, el payback en años y meses. Debajo, el ahorro
anual y el ROI, y un gráfico del ahorro acumulado frente a la inversión.

**Cómo leerlo (frases).**

- «La inversión se recupera en {años} años y {meses} meses.»
- «En {horizonte} años el ROI es {ROI} %: cada euro invertido devuelve
  {1 + ROI} euros.»
- Error típico: «Contar como ahorro el tiempo liberado que nadie usa en otra
  cosa. Si no baja ningún coste, el ahorro es solo sobre el papel.»

**Avisos.**

- Ahorro neto cero o negativo: la inversión no se recupera nunca.
- Payback mayor que la vida útil o que el horizonte.
- Recordatorio fijo: cálculo sin descontar; para inversiones grandes o
  largas, que lo revise Finanzas.

**Casos de referencia.**

| Datos | Resultado publicado | Fuente |
|---|---|---|
| Inversión 120.000, ahorro 24.000/año | payback 5 años | Lumen Learning, *Managerial Accounting* (J. Cooke), «Simple Payback», CC BY 4.0 |
| Inversión 56.000, ahorros 18.000 / 16.000 / 14.000 / 12.000… | payback 3,67 años | Mismo texto (opción «refurbish») |
| Inversión 500.000, valor final 1.000.000 | ROI 100 % | Corporate Finance Institute, «Return on Investment» |
| Inversión 1.000, valor final 1.250 | ROI 25 % | Mismo artículo |

El mismo texto de Lumen tiene un segundo caso con cifras que no cuadran
entre sí (4,46 frente a 4,40 años). No lo uso.

**Decisiones D y E.** Horizonte del ROI por defecto: 1 año, cambiable en
cada cálculo. Cada línea de ahorro se marca como «duro» (baja un coste
real) o «blando» (tiempo liberado, coste evitado). El ROI y el payback se
calculan solo con el ahorro duro; el blando se enseña aparte, con la frase
«Además, {blando} €/año de ahorro blando, que no entra en el ROI».

---

## Sin resolver todavía

- **OEE (calculadora 4):** confirmar si Nakajima da 99 % o 99,9 % de
  calidad en el desglose del 85 %.
- **Inversa de la normal (calculadora 1):** se calcula con jStat, como fija
  el encargo. Antes de usarla compruebo su licencia (MIT según su
  repositorio) y la contrasto con los casos de Minitab y de la tabla.
