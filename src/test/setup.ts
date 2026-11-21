import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach, beforeEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

// Con toda la batería a la vez el equipo va más lento: las búsquedas que esperan tienen más margen.
configure({ asyncUtilTimeout: 4000 });

// La bienvenida sale solo la primera vez: en las pruebas, por defecto ya se vio.
beforeEach(() => {
  localStorage.setItem('gk.welcome', 'done');
});

afterEach(() => {
  cleanup();
});
