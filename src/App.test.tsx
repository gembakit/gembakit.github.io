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

test('abre la herramienta de muestra, carga el ejemplo y muestra resultado y lectura', async () => {
  const user = userEvent.setup();
  window.location.hash = '#/herramientas/muestra';
  render(<App />);
  const load = await screen.findByRole('button', { name: /Cargar ejemplo|Load example/ });
  await user.click(load);
  // Media de los 12 tiempos de ejemplo = 48,633… → 48,63
  expect(await screen.findAllByText(/48[,.]63/)).not.toHaveLength(0);
  expect(screen.getAllByText(/12 valores leídos|12 values read/).length).toBeGreaterThan(0);
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
