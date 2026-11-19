import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// La bienvenida sale solo la primera vez: en las pruebas, por defecto ya se vio.
beforeEach(() => {
  localStorage.setItem('gk.welcome', 'done');
});

afterEach(() => {
  cleanup();
});
