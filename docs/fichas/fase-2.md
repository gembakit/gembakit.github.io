# Fichas de la fase 2: gráficos

Redactadas y construidas el 2026-11-21 dentro del encargo «terminar la app»
(el dueño revisa después). Motor de gráficos común en `src/ui/charts.tsx`:
SVG propio, colores del tema, tocar un punto o una barra enseña su valor, y
lo señalado va en rombo rojo y además con palabras.

## 1. Estadística descriptiva con histograma

- **Para qué:** centro, dispersión y forma de una serie; si se puede tratar
  como normal.
- **Datos:** una columna (teclear, pegar o importar), qué se mide y unidad.
- **Fórmulas (convenciones de Minitab = funciones de Excel/Sheets):** media;
  desviación de la muestra (n − 1, STDEV.S); cuartiles con posición
  (n + 1)·p interpolando (QUARTILE.EXC); asimetría y curtosis (SKEW, KURT);
  error estándar s/√n; atípicos fuera de Q1 − 1,5·RIC y Q3 + 1,5·RIC;
  Anderson-Darling A² (NIST e-Handbook 1.3.5.14), A²* = A²(1 + 0,75/n +
  2,25/n²) y valor p por tramos (D'Agostino y Stephens 1986, tabla de la
  ayuda de Minitab). Histograma: unas √n barras (5 a 15) de ancho redondo.
- **Avisos:** sin datos, un dato, todos iguales, menos de 20 datos, no
  normal (p < 0,05), atípicos.
- **Casos de referencia:** NIST StRD «Michelso» (media 299,8524; s
  0,0790105478190518) y «NumAcc1»; ejemplos de Microsoft de QUARTILE.EXC
  (15 y 43), SKEW (0,359543) y KURT (−0,151799637); el valor crítico del 5 %
  de NIST para A² (0,752) da p ≈ 0,05 con la tabla de Minitab.
- **Sin caso publicado:** no encontré un caso con el valor p de
  Anderson-Darling ya calculado; se comprueba A² a mano en un caso pequeño y
  la coherencia de la tabla (pregunta para el dueño en ESTADO.md).

## 2. Pareto

- Categorías con su valor (veces, minutos, euros); importar con o sin
  columna de números (sin ella, cuenta cuántas veces sale cada categoría).
- De mayor a menor; «Otros» al final si se marca; parte, acumulado y «pocos
  vitales» hasta el 80 % (incluido el que lo cruza).
- Gráfico con barras de la parte y la línea del acumulado en el **mismo eje
  de 0 a 100 %** (sin doble escala).
- Avisos: negativos, sin datos, menos de 3 o más de 12 categorías, sin
  pocos vitales (más del 60 % de las categorías para llegar al 80 %).
- Hoja: valores editables y parte y acumulado como fórmulas.

## 3. Gráfico de corrida

- Datos en orden; mediana; corridas (los puntos en la mediana no cuentan).
- Reglas de Perla, Provost y Murray (BMJ Qual Saf 2011): desplazamiento de 6
  o más del mismo lado; tendencia de 5 o más subiendo o bajando (repetidos
  como uno); demasiadas o muy pocas corridas con la distribución exacta de
  Swed y Eisenhart (1943), 5 % por cada lado, en lugar de la tabla
  aproximada (caso: 10 y 10 → P(R ≤ 6) = 3.422/184.756).
- Aviso con menos de 10 puntos útiles.
- Ejemplo: 24 tiempos de cambio con SMED desde el 13.
