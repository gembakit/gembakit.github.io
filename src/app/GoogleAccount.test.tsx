import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { db } from '../data/db';
import { FOLDER_KEYS } from '../google/driveFolders';
import { FakeGoogle } from '../google/testing/fakeGoogle';

// Google de mentira: la ventana de permiso responde al momento con la cuenta elegida.
let email = 'ana@example.com';
let revoked: string[] = [];
let google: FakeGoogle;

beforeEach(async () => {
  window.location.hash = '';
  localStorage.clear();
  await db.settings.clear();
  revoked = [];
  google = new FakeGoogle();
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: (c) => ({ requestAccessToken: () => c.callback({ access_token: `T-${email}`, expires_in: 3600, scope: c.scope }) }),
        hasGrantedAllScopes: () => true,
        revoke: (token, done) => {
          revoked.push(token);
          done?.();
        },
      },
    },
  };
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes('/drive/v3/about')) return new Response(JSON.stringify({ user: { emailAddress: email } }), { status: 200 });
    return google.fetch(input, init);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.google;
});

const folders = () => [...google.files.values()].filter((f) => f.mimeType === 'application/vnd.google-apps.folder' && !f.trashed);

test('bienvenida la primera vez: «Seguir sin cuenta» lleva a Proyectos y no vuelve a salir', async () => {
  const user = userEvent.setup();
  const { unmount } = render(<App />);
  expect(await screen.findByRole('heading', { level: 1, name: /La mejora continua, en tu bolsillo|Continuous improvement, in your pocket/ })).toBeInTheDocument();
  expect(screen.queryByRole('navigation')).toBeNull();
  // Las carpetas de Drive solo se explican al pulsar «Conectar con Google».
  expect(screen.queryByText(/Copias de seguridad|Backups/)).toBeNull();
  await user.click(screen.getByRole('button', { name: /Seguir sin cuenta|Continue without an account/ }));
  expect(await screen.findByRole('heading', { level: 1, name: /Proyectos|Projects/ })).toBeInTheDocument();
  unmount();
  render(<App />);
  expect(await screen.findByRole('heading', { level: 1, name: /Proyectos|Projects/ })).toBeInTheDocument();
});

test('conectar en la bienvenida crea Gemba Kit con sus tres carpetas en el Drive de esa cuenta', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Conectar con Google|Connect with Google/ }));
  // Primero explica qué carpetas se crean; Google se abre con «Continuar con Google».
  expect(screen.getByText(/^(Copias de seguridad|Backups)$/)).toBeInTheDocument();
  expect(folders()).toHaveLength(0);
  await user.click(screen.getByRole('button', { name: /Continuar con Google|Continue with Google/ }));
  expect(await screen.findByText(/Carpetas listas en tu Drive|Folders ready in your Drive/, {}, { timeout: 4000 })).toBeInTheDocument();
  expect(screen.getByText(/ana@example\.com/)).toBeInTheDocument();
  const all = folders();
  const root = all.find((f) => f.name === 'Gemba Kit')!;
  expect(all.filter((f) => f.parents.includes(root.id)).map((f) => f.name).sort()).toEqual(expect.arrayContaining([expect.stringMatching(/^(Copias de seguridad|Backups)$/), expect.stringMatching(/^(Proyectos|Projects)$/), expect.stringMatching(/^(Sueltas|Loose)$/)]));
  expect(screen.getByRole('link', { name: /Abrir la carpeta en Drive|Open the folder in Drive/ })).toHaveAttribute('href', expect.stringContaining(root.id));
  await user.click(screen.getByRole('button', { name: /^(Empezar|Start)$/ }));
  expect(await screen.findByRole('heading', { level: 1, name: /Proyectos|Projects/ })).toBeInTheDocument();
});

test('Ajustes: desconectar retira el permiso y otra cuenta tiene sus propias carpetas', async () => {
  const user = userEvent.setup();
  localStorage.setItem('gk.welcome', 'done');
  window.location.hash = '#/ajustes';
  render(<App />);
  await user.click(await screen.findByRole('button', { name: /Conectar con Google|Connect with Google/ }));
  await screen.findByText(/Carpetas listas|Folders ready/);
  const first = (await db.settings.get(FOLDER_KEYS.root))!.value;

  await user.click(screen.getByRole('button', { name: /^(Desconectar|Disconnect)$/ }));
  expect(await screen.findByText(/Sin conectar|Not connected/)).toBeInTheDocument();
  // «Sin conectar» sale en cuanto se olvida la cuenta; las carpetas y el permiso se retiran justo después.
  await waitFor(() => expect(revoked).toEqual(['T-ana@example.com']));
  expect(await db.settings.get(FOLDER_KEYS.root)).toBeUndefined();

  // Otra cuenta en el mismo teléfono: Drive distinto, carpetas nuevas.
  email = 'luis@example.com';
  google = new FakeGoogle();
  await user.click(screen.getByRole('button', { name: /Conectar con Google|Connect with Google/ }));
  await screen.findByText(/Carpetas listas|Folders ready/);
  expect(screen.getByText(/luis@example\.com/)).toBeInTheDocument();
  expect(folders()).toHaveLength(4);
  expect((await db.settings.get('drive.owner'))!.value).toBe('luis@example.com');
  expect(first).toBeTruthy();
  email = 'ana@example.com';
});
