# Fichas de la fase 4: captura en planta y sincronización

Redactadas y construidas el 2026-11-21 dentro del encargo «terminar la app».

## Botón central «Capturar»
Hoja con el proyecto (el último usado, o ninguno) y las cuatro capturas. Al
elegir, la app recuerda el proyecto para que «Guardar» ya lo traiga.

## 1. Cronómetro de ciclos
- «Empezar», un botón grande «Ciclo» por cada ciclo (empieza el siguiente
  sin parar) y «Parar»/«Seguir». Cada ciclo guarda su hora real de inicio y
  de fin; se puede quitar uno con «Deshacer».
- Resultado: estadística descriptiva de las duraciones (media, desviación,
  más rápido, más lento) y gráfico de los ciclos con la media.
- Lectura: variación grande si la desviación pasa del 10 % de la media;
  aviso con menos de 10 ciclos y si hay ciclos atípicos.
- Lo que se está cronometrando se guarda en el teléfono a cada toque.

## 2. Hoja de conteo
- Categorías con botones grandes «+» y «−»; total y Pareto al momento.
- Mismo cálculo, gráfico y hoja que la herramienta Pareto.

## 3. Recorrido de desperdicios
- Los 8 desperdicios de Lean (transporte, inventario, movimiento, espera,
  sobreproceso, sobreproducción, defectos y talento no aprovechado), cada
  uno con su explicación; dónde, qué se ve, idea, impacto y hasta 3 fotos.
- Fotos reducidas en el teléfono (lado mayor 1280 px, JPEG): van dentro de
  la medición, en el PDF y en la sincronización; en la hoja, una nota.
- Resultado: desperdicios por tipo (Pareto) y la lista con fotos.

## 4. Auditoría 5S
- 5 S × 4 preguntas, cada una de 0 a 4, con nota opcional.
- Porcentaje por S y total sobre lo puntuado; niveles: excelente (≥ 85 %),
  bien (≥ 70 %), mejorable (≥ 50 %), deficiente. La S más floja se marca.
- La evolución se ve guardando cada auditoría en el proyecto de la zona.

## 5. Sincronización entre aparatos (PLAN.md, 4.4)
- Archivo `gemba-sync.json` en la carpeta oculta de la app en el Drive del
  usuario. Se combina registro a registro: gana el cambio más reciente, un
  borrado es un cambio más. Conmutativa, asociativa e idempotente (pruebas
  con 300 casos al azar y con dos aparatos que suben a la vez).
- Se sincroniza al abrir, al volver a primer plano, al recuperar la red, 5 s
  después de cada cambio y cada 90 s, solo con la cuenta conectada y el
  permiso vigente. «Sincronizar ahora» en Ajustes › Cuenta de Google.
- Lo borrado sigue con su marca (se puede deshacer y viaja a los demás).
