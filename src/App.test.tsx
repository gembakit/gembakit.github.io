import { beforeEach, expect, test } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

beforeEach(() => {
  window.location.hash = '';
});

test('arranca en Proyectos con la barra de navegación', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { level: 1, name: /Proyectos|Projects/ })).toBeInTheDocument();
  expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
});

test('DPMO: carga el ejemplo publicado y muestra resultado, lectura y guía', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/herramientas/dpmo';
  render(<App />);
  const load = await screen.findByRole('button', { name: /Cargar ejemplo|Load example/ });
  await user.click(load);
  // Ejemplo de Learn Lean Sigma: 1.000 × 5 oportunidades, 50 defectos → DPMO 10.000.
  expect(await screen.findAllByText(/10[.,]000/)).not.toHaveLength(0);
  expect(screen.getByText(/defectos por millón de oportunidades: nivel sigma|defects per million opportunities: sigma level/)).toBeInTheDocument();
  // La guía está plegada y se abre al tocar.
  const howTo = screen.getByRole('button', { name: /Cómo usarla|How to use it/ });
  expect(howTo).toHaveAttribute('aria-expanded', 'false');
  await user.click(howTo);
  expect(howTo).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(4);
});

test('Referencia: guía y glosario cerrados; el término buscado se abre solo y se puede volver a plegar', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/referencia';
  render(<App />);
  const glossary = await screen.findByRole('button', { name: /^(Glosario|Glossary)/ });
  expect(glossary).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByRole('button', { name: /^(Guía de uso|User guide)/ })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  await user.click(glossary);
  await user.type(screen.getByRole('searchbox'), 'OEE');
  // Fallo visto por el dueño (2026-11-15): abierto solo, no se podía cerrar.
  const term = screen.getByRole('button', { name: /^OEE/ });
  expect(term).toHaveAttribute('aria-expanded', 'true');
  await user.click(term);
  expect(term).toHaveAttribute('aria-expanded', 'false');
  await user.click(term);
  expect(term).toHaveAttribute('aria-expanded', 'true');
});

test('Takt: «Cargar ejemplo» deja elegir; la embotelladora da 40.000 botellas/h y la resta del turno', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/herramientas/takt';
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Cargar ejemplo|Load example/ }));
  await user.click(await screen.findByRole('button', { name: /^(Embotelladora|Bottling plant)/ }));
  expect(
    await screen.findByText(/^(Hay que sacar 40\.000 botellas\/h \(una cada 0,09 s\)|The line must turn out 40,000 bottles\/h \(one every 0\.09 s\))/),
  ).toBeInTheDocument();
  expect(screen.getByText(/480 − 10 − 20 = 450 min × 3 = 1[.,]?350 min \(22[,.]5 h\)/)).toBeInTheDocument();
  expect(screen.getAllByText(/(Llenadora|Filler)/).length).toBeGreaterThan(0);
});

test('Takt: con datos, los bloques salen plegados con su resumen; «Calcular con» está en el resultado', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/herramientas/takt';
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Cargar ejemplo|Load example/ }));
  await user.click(await screen.findByRole('button', { name: /^(Embotelladora|Bottling plant)/ }));
  // El bloque de las estaciones, plegado, dice cuántas hay y cuál es el cuello de botella.
  const machines = await screen.findByRole('button', { name: /^(Estaciones|Stations)\s*4/ });
  expect(machines).toHaveAttribute('aria-expanded', 'false');
  expect(machines).toHaveTextContent(/(cuello de botella|bottleneck): (Llenadora|Filler)/);
  await user.click(machines);
  const filler = screen.getByRole('button', { name: /^(Llenadora|Filler)/ });
  expect(filler).toHaveTextContent(/4 (medidas|measurements)/);
  await user.click(filler);
  expect(filler).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText(/^(Mayor repetible: la segunda|Highest repeatable: the second-highest)/)).toBeInTheDocument();
  // «Estándar» en el resultado: la llenadora pasa a su velocidad estándar.
  await user.click(screen.getByRole('button', { name: /^(Estándar|Standard)$/ }));
  expect(screen.getAllByText(/^48[.,]000 (botellas|bottles)\/h$/).length).toBeGreaterThan(0);
  expect(screen.getByLabelText(/^(OEE habitual de la línea|Usual OEE of the line)$/)).toHaveValue('75');
});

test('Takt: un OEE mayor que 100 avisa sin quitar la casilla, y se puede corregir', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/herramientas/takt';
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Cargar ejemplo|Load example/ }));
  await user.click(await screen.findByRole('button', { name: /^(Embotelladora|Bottling plant)/ }));
  const oee = await screen.findByLabelText(/^(OEE habitual de la línea|Usual OEE of the line)$/);
  await user.clear(oee);
  await user.type(oee, '150');
  expect(screen.getAllByText(/(tiene que estar entre 0 y 100|must be between 0 and 100)/).length).toBeGreaterThan(0);
  // El resto del resultado sigue y la casilla también.
  expect(screen.getByLabelText(/^(OEE habitual de la línea|Usual OEE of the line)$/)).toBe(oee);
  await user.clear(oee);
  await user.type(oee, '75');
  expect(screen.queryByText(/(tiene que estar entre 0 y 100|must be between 0 and 100)/)).toBeNull();
  // Capacidad instalada requerida con el 75 %: 40.000 ÷ 0,75.
  expect(screen.getByRole('button', { name: /^(Capacidad instalada requerida \(afectada por el OEE\)|Installed capacity required \(with your OEE\))\s*53[.,]333/ })).toBeInTheDocument();
});

test('Takt: cambiar la unidad de las estaciones convierte sus valores y el resultado no se mueve', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/herramientas/takt';
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Cargar ejemplo|Load example/ }));
  await user.click(await screen.findByRole('button', { name: /^(Embotelladora|Bottling plant)/ }));
  const capacity = /^(Capacidad en el periodo|Capacity in the period)\s*1[.,]001[.,]250/;
  expect(await screen.findByRole('button', { name: capacity })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /^(Unidades y balanceo|Units and line balancing)/ }));
  // De botellas/h a min/botella: 48.000 botellas/h son 0,00125 min/botella, no 48.000 min/botella.
  await user.selectOptions(screen.getByRole('combobox', { name: /^(Unidad de las estaciones|Unit of the stations)$/ }), 'time-min');
  expect(screen.getByRole('button', { name: capacity })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /^(Estaciones|Stations)\s*4/ }));
  await user.click(screen.getByRole('button', { name: /^(Llenadora|Filler)/ }));
  expect(screen.getByRole('textbox', { name: /^(Velocidad estándar \(opcional\)|Standard speed \(optional\)): (Llenadora|Filler)$/ })).toHaveProperty('value', expect.stringMatching(/^0[.,]00125$/));
  // La encajonadora sigue contando cajas: 42 cajas/min pasan a 1/42 min/caja.
  await user.click(screen.getByRole('button', { name: /^(Encajonadora|Case packer)/ }));
  expect(screen.getByRole('textbox', { name: /^(Velocidad estándar \(opcional\)|Standard speed \(optional\)): (Encajonadora|Case packer)$/ })).toHaveProperty('value', expect.stringMatching(/^0[.,]0238095$/));
});

test('DPMO: «Exportar» abre el panel con la hoja de Google y Excel como próximamente', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/herramientas/dpmo';
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Cargar ejemplo|Load example/ }));
  await user.click(screen.getByRole('button', { name: /^(Exportar|Export)$/ }));
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText(/Hoja de Google|Google Sheet/)).toBeInTheDocument();
  expect(within(dialog).getByText(/Próximamente|Coming soon/)).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: /Crear hoja|Create sheet/ })).toBeInTheDocument();
});

test('DPMO: más defectos que oportunidades da un aviso y ningún número', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/herramientas/dpmo';
  render(<App />);
  const [units, opps, defects] = await screen.findAllByRole('textbox');
  await user.type(units!, '10');
  await user.type(opps!, '2');
  await user.type(defects!, '25');
  expect(await screen.findByText(/más defectos que oportunidades|more defects than opportunities/)).toBeInTheDocument();
});

test('FPY y RTY: carga el ejemplo publicado (RTY 83 %) y marca el paso que más resta', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/herramientas/fpy';
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Cargar ejemplo|Load example/ }));
  // Fabrico: 97 % × 94 % × 91 % → RTY 83 % (82,97 %, que se enseña como 83).
  expect(await screen.findByText(/^83 %$/)).toBeInTheDocument();
  expect(screen.getByText(/^(el que más resta|costs the most)$/)).toBeInTheDocument();
  expect(screen.getByText(/De cada 100 unidades, 83 pasan|Out of every 100 units, 83 go/)).toBeInTheDocument();
});

test('FPY y RTY: contando unidades, más buenas que entradas da un aviso', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/herramientas/fpy';
  render(<App />);
  await screen.findByRole('button', { name: /Añadir paso|Add step/ });
  await user.type(screen.getAllByRole('textbox', { name: /^(Entran|In)$/ })[0]!, '10');
  await user.type(screen.getAllByRole('textbox', { name: /^(Buenas a la 1\.ª|Good first time)$/ })[0]!, '12');
  expect(await screen.findByText(/hay más buenas que unidades que entran|more good units than units in/)).toBeInTheDocument();
});

test('FPY y RTY: añadir y quitar pasos, con deshacer', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/herramientas/fpy';
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Añadir paso|Add step/ }));
  expect(screen.getAllByRole('textbox', { name: /^(Nombre del paso|Name of step) \d/ })).toHaveLength(4);
  await user.click(screen.getByRole('button', { name: /^(Quitar|Remove) (Paso|Step) 2$/ }));
  expect(screen.getAllByRole('textbox', { name: /^(Nombre del paso|Name of step) \d/ })).toHaveLength(3);
  await user.click(await screen.findByRole('button', { name: /^(Deshacer|Undo)$/ }));
  expect(screen.getAllByRole('textbox', { name: /^(Nombre del paso|Name of step) \d/ })).toHaveLength(4);
});

test('FPY y RTY: importar filas pegadas desde Sheets, con vista previa', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/herramientas/fpy';
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /^(Importar|Import)$/ }));
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('textbox'));
  await user.paste('Corte\t200\t186\nMontaje\t186\t180\n');
  await user.click(within(dialog).getByRole('button', { name: /Leer lo pegado|Read pasted rows/ }));
  expect(within(dialog).getByText(/2 filas listas|2 rows ready/)).toBeInTheDocument();
  expect(within(dialog).getByRole('cell', { name: 'Montaje' })).toBeInTheDocument();
  await user.click(within(dialog).getByRole('button', { name: /Usar 2 filas|Use 2 rows/ }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getAllByRole('textbox', { name: /^(Nombre del paso|Name of step) \d/ }).map((e) => (e as HTMLInputElement).value)).toEqual(['Corte', 'Montaje']);
  // 186/200 × 180/186 = 180/200 = 90 %.
  expect(await screen.findByText(/^90 %$/)).toBeInTheDocument();
});

test('FPY y RTY: importar un .csv de Excel en español (punto y coma, tildes de Windows)', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/herramientas/fpy';
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /^(Importar|Import)$/ }));
  const dialog = await screen.findByRole('dialog');
  // «Operación;Unidades que entran;Buenas» con la «ó» en windows-1252 (0xF3).
  const text = 'Operación;Unidades que entran;Buenas\r\nSoldadura;1.200;1.150\r\nPintura;1.150;1.100\r\nTotal;;\r\n';
  const bytes = Uint8Array.from(text, (ch) => ch.charCodeAt(0));
  const input = dialog.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, new File([bytes], 'pasos.csv', { type: 'text/csv' }));
  expect(await within(dialog).findByText(/2 filas listas|2 rows ready/)).toBeInTheDocument();
  expect(within(dialog).getByText(/La fila 1 son títulos|Row 1 has the titles/)).toBeInTheDocument();
  expect(within(dialog).getByRole('option', { name: 'A · Operación', selected: true })).toBeInTheDocument();
  expect(within(dialog).getByRole('cell', { name: /^1[.,]?200$/ })).toBeInTheDocument();
  expect(within(dialog).getByText(/Fila 4: falta|Row 4: /)).toBeInTheDocument();
});

test('proyecto: crearlo, guardar una medición de DPMO, abrirla, guardar la versión 2 y congelarla', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/proyectos/nuevo';
  render(<App />);
  await user.type(await screen.findByRole('textbox', { name: /^(Nombre|Name)$/ }), 'Rechazo línea 3');
  await user.click(screen.getByRole('radio', { name: /Seguimiento de proceso|Process monitoring/ }));
  await user.click(screen.getByRole('button', { name: /Crear proyecto|Create project/ }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Rechazo línea 3' })).toBeInTheDocument();
  expect(screen.getByText(/Todavía no hay mediciones|No measurements yet/)).toBeInTheDocument();

  // Guardar desde DPMO: el proyecto (el único) ya viene elegido.
  window.location.hash = '#/herramientas/dpmo';
  await user.click(await screen.findByRole('button', { name: /Cargar ejemplo|Load example/ }));
  await user.click(screen.getByRole('button', { name: /Guardar en un proyecto|Save to a project/ }));
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByRole('option', { name: 'Rechazo línea 3', selected: true });
  await user.type(within(dialog).getByRole('textbox', { name: /^(Equipo|Crew)$/ }), 'Day shift 1');
  await user.click(within(dialog).getByRole('button', { name: /^(Guardar|Save)$/ }));
  expect(await screen.findByText(/Guardado en «Rechazo línea 3»|Saved to “Rechazo línea 3”/)).toBeInTheDocument();

  // En el proyecto aparece con su resultado y su contexto.
  await user.click(screen.getByRole('button', { name: /^(Ver|View)$/ }));
  const item = await screen.findByRole('button', { name: /DPMO y nivel sigma|DPMO and sigma level/ });
  expect(within(item).getByText(/3[,.]83/)).toBeInTheDocument();
  expect(within(item).getByText('Day shift 1')).toBeInTheDocument();

  // Abrirla: arranca con sus datos; cambiar uno ofrece guardar la versión 2.
  await user.click(item);
  expect(await screen.findByText(/Medición guardada|Saved measurement/)).toBeInTheDocument();
  const units = screen.getByRole('textbox', { name: /Unidades revisadas|Units inspected/ });
  expect(units).toHaveValue('1000');
  await user.clear(units);
  await user.type(units, '2000');
  await user.click(await screen.findByRole('button', { name: /Guardar como versión 2|Save as version 2/ }));
  expect(await screen.findByText(/Guardada la versión 2|Version 2 saved/)).toBeInTheDocument();
  expect(await screen.findByText(/Versión 2 de 2|Version 2 of 2/)).toBeInTheDocument();

  // Congelada: ya no ofrece guardar cambios.
  await user.click(screen.getByRole('button', { name: /^(Congelar|Freeze)$/ }));
  expect(await screen.findByRole('button', { name: /^(Descongelar|Unfreeze)$/ })).toBeInTheDocument();
  await user.clear(units);
  await user.type(units, '3000');
  expect(screen.queryByRole('button', { name: /Guardar como versión 3|Save as version 3/ })).toBeNull();
  expect(screen.getByRole('button', { name: /Volver al proyecto|Back to the project/ })).toBeInTheDocument();
});

test('Ajustes lleva a la prueba provisional de Google, con sus siete pasos', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/ajustes';
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Prueba de conexión con Google|Google connection test/ }));
  expect(await screen.findByRole('heading', { level: 1, name: /Prueba de Google|Google test/ })).toBeInTheDocument();
  expect(screen.getAllByRole('heading', { level: 2, name: /^(Paso|Step) \d/ })).toHaveLength(7);
  // Al abrir anota en el registro dónde se está usando.
  expect(screen.getByText(/Pantalla abierta como|Screen opened as/)).toBeInTheDocument();
});

test('el botón central abre la hoja de Capturar y se cierra', async () => {
  const user = userEvent.setup();
  render(<App />);
  const nav = (await screen.findAllByRole('navigation'))[0]!;
  const captureButtons = within(document.body).getAllByRole('button', { name: /Capturar|Capture/ });
  await user.click(captureButtons[0]!);
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toBeInTheDocument();
  await act(async () => {
    await user.keyboard('{Escape}');
  });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(nav).toBeInTheDocument();
});

test('OEE: cada parte del tiempo planificado lleva sus minutos y su porcentaje', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/herramientas/oee';
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Cargar ejemplo|Load example/ }));
  await user.click(await screen.findByRole('button', { name: /^(Caso publicado de Vorne|Vorne published case)/ }));
  // Vorne: 420 min planificados; 47 min de paradas = 11,2 %.
  // La primera vez sale en el reparto del tiempo; después, en el Pareto.
  const downtime = (await screen.findAllByText(/^47(,0|\.0)? min$/))[0]!;
  expect(downtime.nextElementSibling).toHaveTextContent(/^11[,.]2\s%$/);
  expect(screen.getByText(/^74[,.]8\s%$/)).toBeInTheDocument();
});

test('OEE: la embotelladora enseña el oficial, la otra vista con su nombre y el Pareto', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/herramientas/oee';
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Cargar ejemplo|Load example/ }));
  await user.click(await screen.findByRole('button', { name: /^(Embotelladora|Bottling plant)/ }));
  // Oficial 70,74 %; marcado el tiempo estándar: «OEE sin el tiempo estándar de las paradas» 75,57 %.
  expect(await screen.findByText(/^70[,.]74\s%$/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^(OEE sin el tiempo estándar de las paradas|OEE without the standard time of the stops)\s*75[,.]57\s%/ })).toBeInTheDocument();
  // Marcar «Cambios de formato»: ya incluye su estándar → «OEE sin cambios de formato» 77,33 %.
  await user.click(screen.getByRole('checkbox', { name: /^(Cambios de formato|Changeovers)/ }));
  expect(screen.getByRole('button', { name: /^(OEE sin cambios de formato|OEE without changeovers)\s*77[,.]33\s%/ })).toBeInTheDocument();
  // El oficial no cambia.
  expect(screen.getByText(/^70[,.]74\s%$/)).toBeInTheDocument();
  // Pareto: cada fila dice qué parte de las paradas es, sin acumulado.
  expect(screen.getByText(/^42[,.]1\s% (de las paradas|of the stops)$/)).toBeInTheDocument();
  // Las paradas, plegadas, dicen cuántas son y cuántos minutos suman.
  expect(screen.getByRole('button', { name: /^(Paradas no planificadas|Unplanned stops)\s*4 (paradas|stops) · 95 min/ })).toBeInTheDocument();
});

test('OEE: cambiar la unidad de la velocidad estándar convierte el número y el OEE no cambia', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/herramientas/oee';
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Cargar ejemplo|Load example/ }));
  await user.click(await screen.findByRole('button', { name: /^(Caso publicado de Vorne|Vorne published case)/ }));
  expect(await screen.findByText(/^74[,.]79\s%$/)).toBeInTheDocument();
  // Calidad con dos decimales, como los otros dos factores.
  expect(screen.getByText(/^97[,.]80\s%$/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /^(Producción|Production)/ }));
  // 1 s/pieza son 60 piezas/min.
  await user.selectOptions(screen.getByRole('combobox', { name: /^(Unidad de la velocidad estándar|Unit of the standard speed)$/ }), 'rate-min');
  expect(screen.getByRole('textbox', { name: /^(Velocidad estándar|Standard speed)$/ })).toHaveValue('60');
  expect(screen.getByText(/^74[,.]79\s%$/)).toBeInTheDocument();
});
