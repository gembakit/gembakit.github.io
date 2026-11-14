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
