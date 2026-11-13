import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

test('muestra el nombre de la app', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Gemba Kit' })).toBeInTheDocument();
});
