import { expect, test } from 'vitest';
import { act, render } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeProvider';
import { THEMES } from './themes';

function Probe({ onReady }: { onReady: (v: ReturnType<typeof useTheme>) => void }) {
  onReady(useTheme());
  return null;
}

test('aplica las variables del tema y cambia al elegir otro', () => {
  let api!: ReturnType<typeof useTheme>;
  render(
    <ThemeProvider initialTheme="lino" initialMode="light">
      <Probe onReady={(v) => (api = v)} />
    </ThemeProvider>,
  );
  const root = document.documentElement;
  expect(root.style.getPropertyValue('--accent')).toBe(THEMES.lino.light.accent);
  expect(root.dataset.mode).toBe('light');

  act(() => {
    api.setTheme('pizarra');
    api.setModeChoice('dark');
  });
  expect(root.style.getPropertyValue('--accent')).toBe(THEMES.pizarra.dark.accent);
  expect(root.dataset.theme).toBe('pizarra');
  expect(root.dataset.mode).toBe('dark');
});
