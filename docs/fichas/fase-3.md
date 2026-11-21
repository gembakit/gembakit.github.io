# Fichas de la fase 3: capacidad y cartas de control

Redactadas y construidas el 2026-11-21 dentro del encargo «terminar la app».

## 1. Capacidad (Cp, Cpk, Pp, Ppk)

- **Datos:** columna de datos en orden, límites de especificación (al menos
  uno), objetivo opcional y tamaño de subgrupo (1 = datos sueltos).
- **Fórmulas (NIST/SEMATECH e-Handbook 6.1.6):** Cp = (LSE − LIE)/6σ;
  Cpk = mín[(LSE − x̄)/3σ, (x̄ − LIE)/3σ]; Cpm = (LSE − LIE)/6√(σ² + (x̄ − T)²).
  Con σ dentro salen Cp y Cpk; con σ global, Pp y Ppk.
- **Sigma dentro:** MR̄/1,128 con datos sueltos (NIST 6.3.2.2); R̄/d2 con
  subgrupos (NIST 6.3.2.1). Minitab usa por defecto la desviación combinada
  con subgrupos: puede dar algo distinto (pregunta en ESTADO.md).
- **Sigma global:** desviación de la muestra (n − 1), como NIST.
- **PPM:** esperadas con la normal (dentro y global) y observadas contando.
- **Veredicto:** capaz desde Cpk 1,33; justo entre 1 y 1,33; no capaz por
  debajo de 1. Con Cp ≥ 1,33 y Cpk bajo, la lectura dice que hay que centrar;
  si no, que hay que reducir la variación.
- **Avisos:** sin límites, límites al revés, subgrupo fuera de 2–10, sin
  variación, menos de 50 datos (NIST), no normal (Anderson-Darling),
  objetivo fuera, σ global mayor que 1,5 veces la de corto plazo
  (inestable), Cpk < 1.
- **Casos de referencia:** el ejemplo de NIST (LIE 8, LSE 20, media 16, s 2
  → Cp 1, Cpu 0,6667, Cpl 1,3333, Cpk 0,6667) y su tabla (6σ centrado →
  0,27 % fuera).
- **Hoja:** datos con su rango móvil como fórmula, límites editables, y Cp,
  Cpk, Pp, Ppk, PPM y Cpm como fórmulas (con subgrupos, la σ dentro va como
  dato calculado en la app).

## 2. Cartas de control I-MR y X-barra R

- **Datos:** tipo de carta, columna de datos en orden (en X-barra R, grupo
  tras grupo, tamaño 2 a 10), «Límites con los primeros» opcional para
  comparar el antes y el después, y qué pruebas de causa especial usar.
- **Fórmulas (NIST 6.3.2.1 y 6.3.2.2):** I: x̄ ± 3·MR̄/1,128; MR: LSC
  3,267·MR̄. X-barra: x̿ ± A2·R̄; R: D3·R̄ y D4·R̄.
- **Constantes:** A2, D3 y D4 de la tabla de NIST; d2 de ASTM STP 15D
  (Montgomery, apéndice VI). Una prueba comprueba que A2 = 3/(d2·√n) a tres
  decimales con los dos. ESTADO.md decía que la tabla la validaría el dueño:
  queda en la lista de preguntas.
- **Señales:** las 8 pruebas de Nelson (1984) con la numeración de Minitab;
  marcadas por defecto la 1, 2, 3, 5 y 6. En la carta de rangos, solo la 1.
- **Caso de referencia:** NIST 6.3.2.2, caudal de 10 lotes → x̄ 50,81, MR̄
  1,8778, LSC 55,8041, LIC 45,8159, ningún punto fuera.
- **Ejemplo X-barra R:** 25 subgrupos de 5 envases generados para la app
  (no publicado), con un desajuste de +4 g desde el subgrupo 20 y límites
  con los 19 primeros.
- **Hoja:** I-MR con los datos y el rango móvil como fórmula; X-barra R con
  la media y el rango de cada subgrupo y las constantes como datos; límites
  como fórmulas.
