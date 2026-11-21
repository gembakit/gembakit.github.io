# Fichas de la fase 5: causa y acción

Redactadas y construidas el 2026-11-21 dentro del encargo «terminar la app».
Son documentos, no cálculos: no hay casos de referencia numéricos. Un motor
común (`src/tools/doc/`) pone los campos, la vista, la hoja de Google (con
apartados de texto) y el PDF; cada herramienta describe su esquema, su
análisis («Cómo leerlo») y su ejemplo.

## 1. 5 porqués
- Problema (qué, dónde y cuándo), porqués en cadena (de 1 a 9), causa raíz,
  contramedida y cómo comprobarla.
- Vista: la cadena problema → porqués → causa raíz → contramedida.
- Avisos: menos de 3 porqués; causa sin contramedida; contramedida sin
  comprobación. Error típico: parar en una persona.

## 2. Espina de pescado (Ishikawa)
- Efecto y causas con su categoría de las 6M (mano de obra, método,
  máquina, material, medición, medio ambiente) y su estado (por comprobar,
  confirmada, descartada), con una nota de la comprobación.
- Vista: diagrama de espina con el número de causas de cada categoría (en
  verde si alguna está confirmada) y la lista por categorías, con icono y
  texto del estado.
- Avisos: categorías sin causas (con 3 o más causas), falta el efecto.

## 3. Lista de acciones
- Vive en cada proyecto (sección «Acciones»): qué, quién, para cuándo,
  estado (pendiente, en curso, hecha) y nota; se borra con «Deshacer».
- Vencidas (pendientes con fecha pasada) y las que vencen en 7 días, en el
  proyecto y en la lista de proyectos («lo que vence»).
- En el catálogo, «Lista de acciones» lleva a elegir el proyecto.

## 4. Informe A3
- Cabecera (título, responsable, fecha), antecedentes, situación actual,
  objetivo, análisis, contramedidas (qué, quién, cuándo) y seguimiento.
- Cómo leerlo: cuántas secciones están escritas y cuáles faltan; aviso si
  alguna contramedida no tiene responsable o fecha.

## 5. Evento Kaizen
- Evento (título, alcance, inicio y fin), equipo, objetivos (indicador,
  partida, meta, resultado), diario, resultados y acciones pendientes.
- Un objetivo se cumple si el resultado llega a la meta en la dirección de
  la mejora (bajar si la meta es menor que la partida; subir si es mayor).

## 6. Plan de control
- Proceso, responsable, fecha y revisión; una fila por característica con
  paso, característica, especificación, cómo se mide, muestra y frecuencia,
  quién, cómo se controla y plan de reacción.
- Avisos: controles sin plan de reacción o sin responsable.
