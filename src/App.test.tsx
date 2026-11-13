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

test('Ajustes lleva a la prueba provisional de Google, con sus cinco pasos', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/ajustes';
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Prueba de conexión con Google|Google connection test/ }));
  expect(await screen.findByRole('heading', { level: 1, name: /Prueba de Google|Google test/ })).toBeInTheDocument();
  expect(screen.getAllByRole('heading', { level: 2, name: /^(Paso|Step) \d/ })).toHaveLength(5);
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
