# Ficha: OEE, versión 2

**Aprobada por el dueño el 2026-11-19 y construida ese día**, con estas
respuestas (mandan sobre el texto de abajo):

- A. Categorías iniciales, sí, adaptables. Se guardan con cada medición; una
  medición nueva de OEE empieza con las de la última medición de OEE del
  último proyecto donde se guardó.
- B. «Quitar» = tratar como planificado; solo cambia la disponibilidad.
  Aprobado tras explicarlo con la embotelladora. Al construirlo: lo marcado
  da **un** porcentaje con nombre que lo dice todo («OEE sin averías ni
  cambios de formato»); quitar una categoría ya incluye su estándar.
- C. Tiempo estándar opcional en cualquier parada.
- D. Pareto con la opción de añadir la pérdida por velocidad y la de
  calidad.
- E. Velocidad o ciclo ideal con el selector del takt.
- F. Los dos ejemplos.

---

Borrador para aprobar (2026-11-18). Sustituye a la ficha 4 de
`docs/fichas/fase-1.md` en lo que cambia. Las fórmulas oficiales (Vorne,
oee.com) y el caso publicado (OEE 74,79 %) se mantienen y se siguen
comprobando en las pruebas.

Pedido del dueño:
- apuntar cada parada con su nombre, sus minutos y su categoría;
- que un cambio de formato que dura su tiempo estándar no se vea como
  pérdida, pero sin tocar el OEE oficial;
- ver el porcentaje con todas las paradas y otro quitando las categorías que
  elija;
- un Pareto de las causas;
- el 85 % con su desglose.

---

## 1. Tiempo planificado

| Dato | Ejemplo |
|---|---|
| Duración del turno (s, min u h) | 8 h |
| Paradas planificadas, cada una con nombre y tiempo (puede no haber ninguna) | Reunión de arranque 10 min |

Funciona igual que los descuentos del takt, con la resta a la vista:

> 480 − 10 = **470 min planificados**

- Los descansos y las comidas solo se ponen si la línea para. Si se rotan
  los puestos y la línea sigue en marcha, no se pone nada.
- Lo planificado no cuenta como pérdida: el OEE se mide sobre el tiempo en
  que se pensaba producir.

## 2. Paradas no planificadas, con categoría

Una lista. Cada parada tiene:

| Dato | Ejemplo |
|---|---|
| Nombre | Cambio de 330 ml a 500 ml |
| Minutos | 40 |
| Categoría (se elige de una lista) | Cambios de formato |
| Tiempo estándar (opcional) | 30 min |

**Categorías.** La lista empieza con estas:
- Averías
- Cambios de formato
- Falta de material
- Microparos
- Limpiezas no planificadas
- Calidad (paradas por producto malo)
- Otras

Puedes cambiarles el nombre, añadir las tuyas y borrar las que no uses.

**Tiempo estándar.** Si una parada tiene su tiempo estándar (lo normal en
los cambios de formato), la app separa lo que le toca durar de lo que se ha
pasado:

> Cambio de 330 ml a 500 ml: 40 min = **30 estándar + 10 de exceso**

Cada parada se pliega con todo lo suyo, como las máquinas del takt. Cerrada
enseña: «Cambio de 330 ml a 500 ml · 40 min · Cambios de formato».

**Microparos.** Las paradas cortas que no se apuntan acaban como pérdida de
velocidad, porque la línea saca menos de lo que debería. Si las apuntas
como parada, cuentan en la disponibilidad. Las dos formas son válidas; la
app lo explica al tocar «Pérdida por velocidad».

## 3. Producción

| Dato | Ejemplo |
|---|---|
| Cómo mides la línea | Unidades por tiempo |
| Velocidad ideal (o ciclo ideal) | 48.000 /h |
| Unidades producidas | 270.000 |
| Unidades rechazadas | 4.000 |
| Nombre de la unidad (libre) | botellas |

El selector «Cómo mides la línea» es el mismo que en el takt:
- **tiempo por unidad:** ciclo ideal en s, min u h;
- **unidades por tiempo:** velocidad de placa por minuto o por hora.

La app convierte por dentro, así una embotelladora escribe «48.000 /h» y no
«0,075 s».

## 4. Qué enseña

### El OEE oficial, siempre arriba y siempre igual

En grande, el OEE con **todas** las paradas no planificadas, como manda la
definición. Debajo, los tres factores. Con el ejemplo:

| | Valor | Cuenta |
|---|---|---|
| Disponibilidad | 79,79 % | (470 − 95) ÷ 470 |
| Rendimiento | 90,00 % | 270.000 ÷ (375 min × 800 /min) |
| Calidad | 98,52 % | 266.000 ÷ 270.000 |
| **OEE** | **70,74 %** | |

Ningún interruptor cambia este número.

### Otras vistas, con su nombre

Un recuadro aparte, titulado **«Otras vistas (no son el OEE oficial)»**,
con un interruptor por categoría y otro para el tiempo estándar de las
paradas que lo tengan. Cada interruptor encendido calcula **otro**
porcentaje, con un nombre que dice qué se ha quitado:

| Interruptor | Nombre que sale | Ejemplo |
|---|---|---|
| Quitar «Cambios de formato» | **OEE sin cambios de formato** | 77,33 % |
| Quitar solo el estándar de los cambios | **OEE sin el tiempo estándar de los cambios** | 75,57 % |

**Qué significa «quitar».** Esas paradas se tratan como si estuvieran
planificadas: salen del tiempo planificado y dejan de contar como pérdida.
Solo cambia la disponibilidad; el rendimiento y la calidad no se tocan.

- Sin cambios de formato: 332,5 min útiles ÷ (470 − 40) = 77,33 %.
- Sin el estándar: 332,5 ÷ (470 − 30) = 75,57 %. Los 10 min de exceso
  siguen contando como pérdida, que es lo que se quiere ver.

Cada porcentaje se toca para ver de dónde sale, igual que los demás.

### En qué se va el tiempo

La barra de colores de hoy (tiempo útil, pérdidas por paradas, por velocidad
y por calidad), con minutos y porcentaje. Con el ejemplo:
- tiempo útil: 332,5 min;
- paradas: 95 min;
- velocidad: 37,5 min;
- calidad: 5 min.

### Pareto de las paradas (primer gráfico de la Fase 2)

Barras horizontales, de la causa que más minutos se lleva a la que menos.
Cada barra lleva:
- sus minutos;
- su parte del total;
- el acumulado.

Una raya marca dónde se llega al 80 %. Con el ejemplo:

| Categoría | Minutos | Parte | Acumulado |
|---|---|---|---|
| Cambios de formato | 40 | 42,1 % | 42,1 % |
| Averías | 25 | 26,3 % | 68,4 % |
| Microparos | 18 | 18,9 % | 87,4 % |
| Falta de material | 12 | 12,6 % | 100 % |

- **Por categoría** (por defecto) **o por parada**, con un selector encima.
- Las categorías quitadas con los interruptores siguen en el gráfico, en
  gris y con la nota «no cuenta en el OEE sin…», para no perderlas de vista.
- **Por qué no lleva la curva del acumulado con su segundo eje**, como el
  Pareto clásico: en un teléfono, dos escalas en el mismo gráfico se leen
  mal. El acumulado va escrito en cada barra.

### El 85 % con su desglose

Debajo del resultado, sin colores de aprobado ni suspenso:

| Factor | Tu línea | Referencia |
|---|---|---|
| Disponibilidad | 79,8 % | 90 % ← **el más lejos** |
| Rendimiento | 90,0 % | 95 % |
| Calidad | 98,5 % | 99 % |
| OEE | 70,7 % | 85 % (90 × 95 × 99 = 84,65 %) |

«El más lejos» es el factor con menos porcentaje de su referencia (aquí,
79,8 ÷ 90 = 89 %). Va con la misma nota de hoy: Nakajima, industria del
automóvil japonesa de los años 70; lo útil es comparar tu línea consigo
misma.

## 5. Cómo leerlo (frases nuevas)

- «De cada hora planificada, 42,4 minutos se convierten en botellas buenas a
  velocidad ideal.»
- «Lo que más resta son las paradas: 95 min. La categoría que más pesa es
  Cambios de formato (40 min, el 42 % de las paradas).»
- «Los cambios de formato duraron 40 min frente a 30 de estándar: 10 min de
  exceso.»
- «Sin contar los cambios de formato, el OEE sería del 77,3 %. El oficial
  sigue siendo el 70,7 %.»
- Error típico (se mantiene): poner como ciclo ideal el habitual en vez del
  de placa. Nuevo: quitar categorías y enseñar ese porcentaje como si fuera
  el OEE.

## 6. Ejemplos cargables

Dos, a elegir al pulsar «Cargar ejemplo», como en el takt:

1. **El caso publicado de Vorne**, el de hoy (OEE 74,79 %), con sus 47 min
   en una sola parada «Paradas no planificadas».
2. **Embotelladora**, el de esta ficha (OEE 70,74 %): un turno de 8 h, con
   cuatro paradas, una de ellas un cambio con su estándar. Las cuentas son
   propias y se comprueban en las pruebas.

## 7. Hoja de Google y mediciones guardadas

- **La hoja.** Una tabla de hoja admite tres columnas de números, así que
  la tabla lleva una fila por categoría con sus minutos y su estándar,
  sumados con fórmulas vivas. Las paradas una a una van en las notas, como
  las medidas del takt. El OEE oficial y las vistas que estuvieran
  encendidas al exportar salen con su nombre.
- **Mediciones guardadas.** Las de OEE ya guardadas se abren sin perder
  nada:
  - sus paradas no planificadas pasan a una parada «Paradas no
    planificadas», categoría «Otras»;
  - las planificadas pasan a una parada planificada.

---

## Preguntas para el dueño

A. **Categorías iniciales** (averías, cambios de formato, falta de material,
   microparos, limpiezas no planificadas, calidad, otras), que puedes
   cambiar. ¿Te sirven, o usáis otras en la planta?
B. **«Quitar» una categoría** = tratarla como planificada: solo cambia la
   disponibilidad. ¿De acuerdo?
C. **Tiempo estándar por parada** (opcional en cualquiera, no solo en los
   cambios), con estándar y exceso. ¿De acuerdo?
D. **Pareto** por categoría o por parada, con el acumulado escrito en cada
   barra y sin segundo eje. ¿Quieres además poder meter en el Pareto la
   pérdida por velocidad y la de calidad (en minutos), para verlas junto a
   las paradas?
E. **Velocidad ideal o ciclo ideal**, con el mismo selector que el takt.
   ¿De acuerdo?
F. **Ejemplos**: el de Vorne y el de la embotelladora. ¿De acuerdo?

## Cambios del 2026-11-21 (comentarios del dueño)

- «Ciclo ideal» pasa a «velocidad estándar» (capacidad instalada), con su
  unidad completa en un desplegable; cambiar la unidad convierte el número.
- Calidad: las rechazadas (desechadas o retrabajadas) van dentro de las
  producidas; buenas = producidas − rechazadas (como en Vorne). Los tres
  factores se enseñan con dos decimales.
- Pareto: cada fila enseña sus minutos y su parte (de las paradas, o de todo
  lo perdido si se incluyen las pérdidas de velocidad y calidad).
