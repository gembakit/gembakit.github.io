import type { Language } from '../i18n/types';
import { OWNER_TERMS } from './glossary-owner';

// Glosario de la sección Referencia y de las siglas tocables.
// Cada término lleva su texto en los dos idiomas (una prueba lo comprueba).
// Las definiciones se redactan con palabras propias: el código es público.

export const GLOSSARY_CATEGORIES = ['metodo', 'lean', 'indicador', 'estadistica', 'finanzas', 'proyecto', 'simbolo'] as const;
export type GlossaryCategory = (typeof GLOSSARY_CATEGORIES)[number];

export interface GlossaryText {
  /** Como se escribe en la app (sigla o nombre corto). */
  term: string;
  /** Nombre completo o desarrollo de la sigla. */
  name: string;
  def: string;
}

export interface GlossaryEntry {
  id: string;
  category: GlossaryCategory;
  es: GlossaryText;
  en: GlossaryText;
}

/** Términos redactados para la app (los de cada herramienta). */
const APP_TERMS: readonly GlossaryEntry[] = [
  {
    id: 'dmaic',
    category: 'metodo',
    es: {
      term: 'DMAIC',
      name: 'Definir, Medir, Analizar, Mejorar, Controlar',
      def: 'Método de Six Sigma para resolver, fase a fase, problemas cuya causa todavía no se conoce. Cada fase se cierra cuando se cumple lo que pide antes de pasar a la siguiente.',
    },
    en: {
      term: 'DMAIC',
      name: 'Define, Measure, Analyze, Improve, Control',
      def: 'Six Sigma method for solving, phase by phase, problems whose cause is not yet known. Each phase closes when its requirements are met, before moving on to the next.',
    },
  },
  {
    id: 'oee',
    category: 'indicador',
    es: {
      term: 'OEE',
      name: 'Eficiencia general de los equipos (Overall Equipment Effectiveness)',
      def: 'Disponibilidad × rendimiento × calidad: la parte del tiempo planificado que se convierte en piezas buenas a la velocidad estándar.',
    },
    en: {
      term: 'OEE',
      name: 'Overall Equipment Effectiveness',
      def: 'Availability × performance × quality: the share of planned time that becomes good parts at standard speed.',
    },
  },
  {
    id: 'cpk',
    category: 'estadistica',
    es: {
      term: 'Cpk',
      name: 'Índice de capacidad del proceso, con centrado',
      def: 'Compara la distancia de la media al límite de especificación más cercano con tres desviaciones típicas del proceso. Cuanto mayor, menos piezas fuera de tolerancia.',
    },
    en: {
      term: 'Cpk',
      name: 'Process capability index, accounting for centering',
      def: 'Compares the distance from the mean to the nearest specification limit with three process standard deviations. The higher, the fewer parts out of tolerance.',
    },
  },

  // Método y lugar
  {
    id: 'seis-sigma',
    category: 'metodo',
    es: {
      term: 'Seis Sigma',
      name: 'Six Sigma',
      def: 'Método de mejora que reduce la variación y los defectos apoyándose en datos y estadística. Su meta de referencia es 3,4 defectos por millón de oportunidades.',
    },
    en: {
      term: 'Six Sigma',
      name: 'Six Sigma',
      def: 'Improvement method that reduces variation and defects using data and statistics. Its reference goal is 3.4 defects per million opportunities.',
    },
  },
  {
    id: 'kaizen',
    category: 'metodo',
    es: {
      term: 'Kaizen',
      name: 'Mejora continua',
      def: 'Mejorar poco a poco y de forma constante, con la gente que hace el trabajo. Un evento Kaizen concentra esa mejora en unos pocos días sobre un problema concreto.',
    },
    en: {
      term: 'Kaizen',
      name: 'Continuous improvement',
      def: 'Improving little by little and constantly, with the people who do the work. A Kaizen event concentrates that improvement into a few days on one specific problem.',
    },
  },
  {
    id: 'gemba',
    category: 'lean',
    es: {
      term: 'Gemba',
      name: 'El lugar real',
      def: 'Donde se crea el valor: la planta, la línea, el puesto de trabajo. Ir al gemba es ver el problema allí, con los propios ojos, en lugar de en una sala de reuniones.',
    },
    en: {
      term: 'Gemba',
      name: 'The real place',
      def: 'Where value is created: the shop floor, the line, the workstation. Going to the gemba means seeing the problem there, with your own eyes, instead of in a meeting room.',
    },
  },

  // Defectos y nivel sigma
  {
    id: 'dpmo',
    category: 'indicador',
    es: {
      term: 'DPMO',
      name: 'Defectos por millón de oportunidades',
      def: 'Defectos encontrados ÷ (unidades × oportunidades de defecto por unidad) × 1.000.000. Sirve para comparar procesos de distinta complejidad.',
    },
    en: {
      term: 'DPMO',
      name: 'Defects per million opportunities',
      def: 'Defects found ÷ (units × defect opportunities per unit) × 1,000,000. Lets you compare processes of different complexity.',
    },
  },
  {
    id: 'dpu',
    category: 'indicador',
    es: {
      term: 'DPU',
      name: 'Defectos por unidad',
      def: 'Defectos encontrados ÷ unidades revisadas. Como una unidad puede tener varios defectos, puede ser mayor que 1.',
    },
    en: {
      term: 'DPU',
      name: 'Defects per unit',
      def: 'Defects found ÷ units inspected. Since one unit can have several defects, it can be greater than 1.',
    },
  },
  {
    id: 'dpo',
    category: 'indicador',
    es: {
      term: 'DPO',
      name: 'Defectos por oportunidad',
      def: 'Defectos ÷ (unidades × oportunidades por unidad). Es el DPMO dividido entre un millón.',
    },
    en: {
      term: 'DPO',
      name: 'Defects per opportunity',
      def: 'Defects ÷ (units × opportunities per unit). It is the DPMO divided by one million.',
    },
  },
  {
    id: 'oportunidad',
    category: 'indicador',
    es: {
      term: 'Oportunidad de defecto',
      name: 'Punto donde puede fallar una unidad',
      def: 'Cada característica de una unidad que puede salir mal, que importa al cliente y que se puede comprobar. Hay que definirlas igual en todas las mediciones para poder compararlas.',
    },
    en: {
      term: 'Defect opportunity',
      name: 'A point where a unit can fail',
      def: 'Each characteristic of a unit that can go wrong, matters to the customer and can be checked. They must be defined the same way in every measurement for results to be comparable.',
    },
  },
  {
    id: 'defecto',
    category: 'indicador',
    es: {
      term: 'Defecto y defectuoso',
      name: 'No son lo mismo',
      def: 'Un defecto es cada fallo concreto; una unidad defectuosa es la que tiene uno o más. Una pieza con tres arañazos es una unidad defectuosa con tres defectos.',
    },
    en: {
      term: 'Defect and defective',
      name: 'Not the same thing',
      def: 'A defect is each specific failure; a defective unit is one that has one or more. A part with three scratches is one defective unit with three defects.',
    },
  },
  {
    id: 'nivel-sigma',
    category: 'indicador',
    es: {
      term: 'Nivel sigma',
      name: 'DPMO en la escala de Seis Sigma',
      def: 'Forma de expresar los defectos en la escala de Seis Sigma. Por convención incluye un desplazamiento de 1,5: 6 sigma equivale a 3,4 DPMO y 3 sigma a 66.807 DPMO.',
    },
    en: {
      term: 'Sigma level',
      name: 'DPMO on the Six Sigma scale',
      def: 'A way of expressing defects on the Six Sigma scale. By convention it includes a 1.5 shift: 6 sigma equals 3.4 DPMO and 3 sigma equals 66,807 DPMO.',
    },
  },
  {
    id: 'z-proceso',
    category: 'estadistica',
    es: {
      term: 'Z del proceso',
      name: 'Nivel sigma a largo plazo',
      def: 'Punto de la normal estándar que deja a su derecha la proporción de defectos. Es el nivel sigma sin el desplazamiento de 1,5, tal como lo da Minitab.',
    },
    en: {
      term: 'Process Z',
      name: 'Long-term sigma level',
      def: 'Point on the standard normal distribution with the defect proportion to its right. It is the sigma level without the 1.5 shift, as Minitab reports it.',
    },
  },
  {
    id: 'desplazamiento',
    category: 'estadistica',
    es: {
      term: 'Desplazamiento de 1,5 sigma',
      name: '1,5 sigma shift',
      def: 'Convención de Seis Sigma: se supone que a largo plazo la media del proceso se aleja 1,5 desviaciones típicas de donde estaba en un estudio corto. Nivel sigma = Z a largo plazo + 1,5. Es una convención, no una ley.',
    },
    en: {
      term: '1.5 sigma shift',
      name: '1.5 sigma shift',
      def: 'Six Sigma convention: in the long run the process mean is assumed to drift 1.5 standard deviations from where it was in a short study. Sigma level = long-term Z + 1.5. It is a convention, not a law.',
    },
  },

  // Rendimientos
  {
    id: 'fpy',
    category: 'indicador',
    es: {
      term: 'FPY',
      name: 'Rendimiento a la primera (First Pass Yield; también FTY)',
      def: 'Unidades buenas a la primera ÷ unidades que entran en un paso. Las unidades retrabajadas no cuentan como buenas.',
    },
    en: {
      term: 'FPY',
      name: 'First Pass Yield (also FTY, First Time Yield)',
      def: 'Units good the first time ÷ units entering a step. Reworked units do not count as good.',
    },
  },
  {
    id: 'rty',
    category: 'indicador',
    es: {
      term: 'RTY',
      name: 'Rendimiento acumulado (Rolled Throughput Yield)',
      def: 'Producto de los FPY de todos los pasos: la parte de las unidades que atraviesa todo el proceso sin ningún retrabajo ni desecho.',
    },
    en: {
      term: 'RTY',
      name: 'Rolled Throughput Yield',
      def: 'Product of the FPY of every step: the share of units that go through the whole process without any rework or scrap.',
    },
  },
  {
    id: 'fabrica-oculta',
    category: 'lean',
    es: {
      term: 'Fábrica oculta',
      name: 'Retrabajo que no se ve',
      def: 'Todo el trabajo de retrabajos, reparaciones y reinspecciones que no aparece en el rendimiento final. Se mide con 1 − RTY.',
    },
    en: {
      term: 'Hidden factory',
      name: 'Rework nobody sees',
      def: 'All the rework, repairs and re-inspections that do not show up in the final yield. Measured as 1 − RTY.',
    },
  },

  // Ritmo y flujo
  {
    id: 'takt',
    category: 'lean',
    es: {
      term: 'Takt',
      name: 'Ritmo del cliente (takt time)',
      def: 'Tiempo disponible ÷ demanda del cliente en ese tiempo. Dice cada cuánto hay que terminar una unidad para cumplir la demanda, ni más rápido ni más lento.',
    },
    en: {
      term: 'Takt',
      name: 'Customer pace (takt time)',
      def: 'Available time ÷ customer demand in that time. It says how often one unit must be finished to meet demand, no faster and no slower.',
    },
  },
  {
    id: 'tiempo-ciclo',
    category: 'lean',
    es: {
      term: 'Tiempo de ciclo',
      name: 'Lo que tarda una estación',
      def: 'Tiempo que necesita una estación, o una persona, para completar su trabajo sobre una unidad. Se compara con el takt.',
    },
    en: {
      term: 'Cycle time',
      name: 'How long a station takes',
      def: 'Time a station, or a person, needs to complete its work on one unit. It is compared with takt.',
    },
  },
  {
    id: 'cuello',
    category: 'lean',
    es: {
      term: 'Cuello de botella',
      name: 'La estación más lenta',
      def: 'La estación con el tiempo de ciclo más largo. Marca lo máximo que puede producir toda la línea.',
    },
    en: {
      term: 'Bottleneck',
      name: 'The slowest station',
      def: 'The station with the longest cycle time. It sets the most the whole line can produce.',
    },
  },
  {
    id: 'balanceo',
    category: 'lean',
    es: {
      term: 'Balanceo de línea',
      name: 'Repartir el trabajo',
      def: 'Repartir el trabajo entre estaciones para que ninguna pase del takt y haya poco tiempo muerto. Eficiencia = suma de tiempos de ciclo ÷ (estaciones × takt).',
    },
    en: {
      term: 'Line balancing',
      name: 'Sharing out the work',
      def: 'Sharing the work among stations so that none exceeds takt and there is little idle time. Efficiency = sum of cycle times ÷ (stations × takt).',
    },
  },
  {
    id: 'yamazumi',
    category: 'lean',
    es: {
      term: 'Yamazumi',
      name: 'Gráfico de carga por estación',
      def: 'Gráfico de barras, una por estación, con su tiempo de ciclo y una línea horizontal en el takt. Muestra de un vistazo qué estación se pasa y cuál tiene holgura.',
    },
    en: {
      term: 'Yamazumi',
      name: 'Workload chart by station',
      def: 'Bar chart, one bar per station, showing its cycle time with a horizontal line at takt. It shows at a glance which station runs over and which has slack.',
    },
  },
  {
    id: 'kanban',
    category: 'lean',
    es: {
      term: 'Kanban',
      name: 'Tarjeta de reposición',
      def: 'Tarjeta o señal que autoriza a producir o reponer un contenedor de piezas. Con un número fijo de tarjetas se limita el inventario en circulación.',
    },
    en: {
      term: 'Kanban',
      name: 'Replenishment card',
      def: 'Card or signal that authorizes producing or replenishing a container of parts. A fixed number of cards caps the inventory in circulation.',
    },
  },
  {
    id: 'reposicion',
    category: 'lean',
    es: {
      term: 'Tiempo de reposición',
      name: 'Del vacío al lleno',
      def: 'Desde que un contenedor se vacía hasta que vuelve lleno: espera, proceso y transporte. Es el dato que más pesa al calcular las tarjetas kanban.',
    },
    en: {
      term: 'Replenishment time',
      name: 'From empty to full',
      def: 'From the moment a container empties until it comes back full: waiting, processing and transport. It is the input that weighs most when sizing kanban cards.',
    },
  },

  // OEE por partes
  {
    id: 'disponibilidad',
    category: 'indicador',
    es: {
      term: 'Disponibilidad',
      name: 'Primer factor del OEE',
      def: 'Tiempo en marcha ÷ tiempo planificado. Lo que resta son las paradas no planificadas: averías, cambios de formato, esperas de material.',
    },
    en: {
      term: 'Availability',
      name: 'First OEE factor',
      def: 'Run time ÷ planned time. What it loses are unplanned stops: breakdowns, changeovers, waiting for material.',
    },
  },
  {
    id: 'rendimiento',
    category: 'indicador',
    es: {
      term: 'Rendimiento (OEE)',
      name: 'Segundo factor del OEE',
      def: '(Ciclo estándar × piezas producidas) ÷ tiempo en marcha. Lo que resta son las microparadas y trabajar por debajo de la velocidad estándar.',
    },
    en: {
      term: 'Performance (OEE)',
      name: 'Second OEE factor',
      def: '(Standard cycle × parts produced) ÷ run time. What it loses are minor stops and running below standard speed.',
    },
  },
  {
    id: 'calidad-oee',
    category: 'indicador',
    es: {
      term: 'Calidad',
      name: 'Tercer factor del OEE',
      def: 'Piezas buenas ÷ piezas producidas. Las rechazadas (desechadas o retrabajadas) van dentro de las producidas: buenas = producidas − rechazadas.',
    },
    en: {
      term: 'Quality',
      name: 'Third OEE factor',
      def: 'Good parts ÷ parts produced. Rejected parts (scrapped or reworked) are included in the parts produced: good = produced − rejected.',
    },
  },
  {
    id: 'ciclo-ideal',
    category: 'indicador',
    es: {
      term: 'Velocidad estándar',
      name: 'Capacidad instalada',
      def: 'La velocidad de diseño del equipo: lo más que puede hacer en condiciones óptimas (también se llama velocidad o ciclo ideal). Se puede dar como tiempo por pieza o como piezas por tiempo. Si se usa la velocidad habitual en su lugar, el OEE sale inflado.',
    },
    en: {
      term: 'Standard speed',
      name: 'Installed capacity',
      def: 'The design speed of the equipment: the most it can do under optimal conditions (also called ideal speed or ideal cycle time). It can be given as time per part or as parts per time. Using the usual speed instead inflates OEE.',
    },
  },
  {
    id: 'teep',
    category: 'indicador',
    es: {
      term: 'TEEP',
      name: 'Rendimiento efectivo total del equipo (Total Effective Equipment Performance)',
      def: 'OEE × utilización del calendario, donde la utilización es el tiempo planificado ÷ todo el tiempo (24 h × 7 días). Cuenta también las horas en que no se planificó producir: dice cuánta capacidad queda sin usar. Ejemplo de Vorne (oee.com): OEE 65 % con 80 h planificadas de las 168 de la semana → 65 % × 47,62 % = 30,95 %.',
    },
    en: {
      term: 'TEEP',
      name: 'Total Effective Equipment Performance',
      def: 'OEE × calendar utilization, where utilization is planned time ÷ all time (24 h × 7 days). It also counts the hours when no production was planned: it tells how much capacity is left unused. Vorne example (oee.com): 65 % OEE with 80 planned hours out of the 168 in a week → 65 % × 47.62 % = 30.95 %.',
    },
  },
  {
    id: 'utilizacion-linea',
    category: 'indicador',
    es: {
      term: 'Utilización de la línea',
      name: 'LU (Line Utilization), la torta del OEE',
      def: 'Tiempo útil ÷ (turno − lo desmarcado en la torta). Con todo marcado cuenta todo lo que le pasó al turno, también lo planificado: es como un TEEP medido sobre el turno en vez de sobre las 24 h. Desmarcando porciones (un cambio de tamaño, la pérdida por velocidad…) se ve la línea desde otro punto de vista; con las paradas planificadas desmarcadas es el OEE oficial. Algunas empresas lo llaman LU. No confundir con la «utilización» de Vorne, que es solo tiempo planificado ÷ todo el tiempo.',
    },
    en: {
      term: 'Line utilization',
      name: 'LU, the OEE pie',
      def: 'Useful time ÷ (shift − what is unticked in the pie). With everything ticked it counts everything that happened in the shift, planned time included: like a TEEP measured over the shift instead of 24 h. Unticking slices (a size change, the speed loss…) shows the line from another angle; with the planned stops unticked it is the official OEE. Some companies call it LU. Not to be confused with Vorne’s “utilization”, which is only planned time ÷ all time.',
    },
  },

  // Estadística descriptiva y gráficos (fase 2)
  {
    id: 'mediana',
    category: 'estadistica',
    es: { term: 'Mediana', name: 'El dato del medio', def: 'Con los datos ordenados, el que queda en el centro: la mitad está por debajo y la otra mitad por encima (con un número par de datos, la media de los dos centrales). A diferencia de la media, los datos extremos no la mueven.' },
    en: { term: 'Median', name: 'The middle value', def: 'With the data sorted, the one in the centre: half are below and half above (with an even number of values, the mean of the two central ones). Unlike the mean, extreme values do not move it.' },
  },
  {
    id: 'cuartiles',
    category: 'estadistica',
    es: { term: 'Cuartiles', name: 'Q1 y Q3', def: 'Q1 deja por debajo la cuarta parte de los datos y Q3, las tres cuartas partes; entre los dos está la mitad central. La app los calcula como Minitab (posición (n + 1) × 0,25 interpolando), igual que QUARTILE.EXC en Excel y Sheets.' },
    en: { term: 'Quartiles', name: 'Q1 and Q3', def: 'Q1 leaves a quarter of the data below it and Q3, three quarters; the middle half lies between them. The app computes them as Minitab does (position (n + 1) × 0.25, interpolating), the same as QUARTILE.EXC in Excel and Sheets.' },
  },
  {
    id: 'asimetria',
    category: 'estadistica',
    es: { term: 'Asimetría', name: 'Sesgo de la distribución', def: 'Cuánto se inclina la distribución hacia un lado. Cerca de 0, simétrica; positiva, con la cola larga hacia los valores altos; negativa, hacia los bajos. Se calcula como SKEW en Excel.' },
    en: { term: 'Skewness', name: 'Lean of the distribution', def: 'How much the distribution leans to one side. Near 0, symmetric; positive, with the long tail towards high values; negative, towards low ones. Computed like SKEW in Excel.' },
  },
  {
    id: 'curtosis',
    category: 'estadistica',
    es: { term: 'Curtosis', name: 'Peso de las colas', def: 'Compara las colas y el pico de la distribución con los de una normal (que da 0). Positiva: más datos en las colas y un pico más agudo; negativa: más plana. Se calcula como KURT en Excel.' },
    en: { term: 'Kurtosis', name: 'Weight of the tails', def: 'Compares the tails and peak of the distribution with those of a normal one (which gives 0). Positive: more data in the tails and a sharper peak; negative: flatter. Computed like KURT in Excel.' },
  },
  {
    id: 'histograma',
    category: 'estadistica',
    es: { term: 'Histograma', name: 'Forma de los datos', def: 'Barras con cuántos datos caen en cada tramo. Enseña el centro, la dispersión y la forma: una campana, una cola larga, dos jorobas (dos fuentes mezcladas) o un corte brusco (datos filtrados).' },
    en: { term: 'Histogram', name: 'Shape of the data', def: 'Bars with how many values fall in each interval. It shows the centre, the spread and the shape: a bell, a long tail, two humps (two mixed sources) or a sharp cut (filtered data).' },
  },
  {
    id: 'grafico-corrida',
    category: 'estadistica',
    es: { term: 'Gráfico de corrida', name: 'Run chart', def: 'Los datos en el orden en que pasaron, con la línea de la mediana. Sus reglas (desplazamiento, tendencia y número de corridas) separan un cambio real del azar sin necesidad de límites de control.' },
    en: { term: 'Run chart', name: 'Run chart', def: 'The data in the order they happened, with the median line. Its rules (shift, trend and number of runs) tell a real change apart from chance without needing control limits.' },
  },
  {
    id: 'corrida',
    category: 'estadistica',
    es: { term: 'Corrida', name: 'Racha del mismo lado', def: 'Uno o más puntos seguidos del mismo lado de la mediana (los que caen en ella no cuentan). Demasiadas o muy pocas corridas indican que el orden no es al azar.' },
    en: { term: 'Run', name: 'Streak on the same side', def: 'One or more consecutive points on the same side of the median (points on it do not count). Too many or too few runs mean the order is not random.' },
  },
  {
    id: 'tendencia',
    category: 'estadistica',
    es: { term: 'Tendencia', name: 'Puntos seguidos subiendo o bajando', def: 'En un gráfico de corrida, 5 o más puntos seguidos subiendo, o bajando (los repetidos cuentan como uno). Es una señal de cambio, no azar.' },
    en: { term: 'Trend', name: 'Points rising or falling in a row', def: 'In a run chart, 5 or more points in a row rising, or falling (repeated values count as one). It is a sign of change, not chance.' },
  },

  // Finanzas
  {
    id: 'roi',
    category: 'finanzas',
    es: {
      term: 'ROI',
      name: 'Retorno de la inversión',
      def: '(Ahorro acumulado en el periodo − inversión) ÷ inversión. Un ROI del 50 % a un año quiere decir que cada euro invertido devuelve 1,50 € en ese año.',
    },
    en: {
      term: 'ROI',
      name: 'Return on investment',
      def: '(Savings accumulated over the period − investment) ÷ investment. A 50% one-year ROI means each euro invested returns 1.50 in that year.',
    },
  },
  {
    id: 'payback',
    category: 'finanzas',
    es: {
      term: 'Payback',
      name: 'Periodo de recuperación',
      def: 'Tiempo que tarda el ahorro acumulado en igualar la inversión. En su forma simple no descuenta el valor del dinero en el tiempo.',
    },
    en: {
      term: 'Payback',
      name: 'Payback period',
      def: 'Time it takes accumulated savings to equal the investment. In its simple form it does not discount the time value of money.',
    },
  },
  {
    id: 'ahorro-duro',
    category: 'finanzas',
    es: {
      term: 'Ahorro duro',
      name: 'Baja un coste real',
      def: 'Ahorro que se ve en la cuenta de resultados: menos material, menos horas extra, menos desecho. Es el que entra en el ROI y en el payback.',
    },
    en: {
      term: 'Hard savings',
      name: 'Lowers a real cost',
      def: 'Savings that show up in the profit and loss account: less material, less overtime, less scrap. These are the ones used for ROI and payback.',
    },
  },
  {
    id: 'ahorro-blando',
    category: 'finanzas',
    es: {
      term: 'Ahorro blando',
      name: 'Beneficio sin coste que baje',
      def: 'Tiempo liberado (por ejemplo, horas de alguien que sigue en plantilla), costes evitados o capacidad extra que no bajan ningún gasto directo. Es real, pero no entra en el ROI hasta que se convierte en ahorro duro.',
    },
    en: {
      term: 'Soft savings',
      name: 'Benefit with no cost going down',
      def: 'Freed-up time (for example, hours of someone who stays on the payroll), avoided costs or extra capacity that do not lower any direct expense. It is real, but it does not count toward ROI until it turns into hard savings.',
    },
  },
];

/** Todos los términos: los de la app y los del glosario del dueño. */
export const GLOSSARY: readonly GlossaryEntry[] = [...APP_TERMS, ...OWNER_TERMS];

export function findTerm(id: string): GlossaryEntry | undefined {
  return GLOSSARY.find((g) => g.id === id);
}

/** Sin tildes ni mayúsculas, para comparar lo que escribe el usuario. */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/**
 * Busca en término, nombre y definición, sin distinguir tildes ni mayúsculas.
 * Primero lo que coincide con el término (exacto, empieza por, contiene),
 * después con el nombre y al final con la definición; dentro de cada grupo,
 * por orden alfabético. Sin búsqueda, todo en orden alfabético.
 */
export function searchGlossary(query: string, lang: Language, category?: GlossaryCategory): GlossaryEntry[] {
  const q = normalize(query.trim());
  const pool = category ? GLOSSARY.filter((g) => g.category === category) : GLOSSARY;
  const rank = (g: GlossaryEntry): number => {
    if (!q) return 0;
    const term = normalize(g[lang].term);
    if (term === q) return 0;
    if (term.startsWith(q)) return 1;
    if (term.includes(q)) return 2;
    if (normalize(g[lang].name).includes(q)) return 3;
    if (normalize(g[lang].def).includes(q)) return 4;
    return -1;
  };
  return pool
    .map((g) => ({ g, r: rank(g) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.g[lang].term.localeCompare(b.g[lang].term, lang, { sensitivity: 'base' }))
    .map((x) => x.g);
}
