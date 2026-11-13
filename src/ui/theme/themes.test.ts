import { describe, expect, test } from 'vitest';
import { STATUS, THEMES, THEME_IDS, contrast, cssVariables, type Mode } from './themes';

const MODES: Mode[] = ['light', 'dark'];

describe('contraste', () => {
  test('la fórmula da los valores de referencia', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    // Ejemplo conocido: #777777 sobre blanco ≈ 4,48
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });
});

// Mínimos WCAG AA: 4,5 para texto normal. El texto principal pide 7 (AAA)
// porque la app se lee de pie, en planta y con luz difícil.
describe.each(THEME_IDS.flatMap((t) => MODES.map((m) => [t, m] as const)))('tema %s (%s)', (theme, mode) => {
  const p = THEMES[theme][mode];
  const s = STATUS[mode];

  test('texto principal muy legible sobre fondo y tarjetas (≥ 7)', () => {
    expect(contrast(p.text, p.bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(p.text, p.surface)).toBeGreaterThanOrEqual(7);
    expect(contrast(p.text, p.surface2)).toBeGreaterThanOrEqual(7);
  });

  test('texto secundario legible (≥ 4,5)', () => {
    expect(contrast(p.muted, p.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.muted, p.surface)).toBeGreaterThanOrEqual(4.5);
  });

  test('texto de acento y botones principales legibles (≥ 4,5)', () => {
    expect(contrast(p.accentInk, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.accentInk, p.soft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.bandText, p.band)).toBeGreaterThanOrEqual(7);
  });

  test('estados legibles sobre su fondo suave y sobre las tarjetas (≥ 4,5)', () => {
    for (const [fg, bg] of [[s.ok, s.okSoft], [s.warn, s.warnSoft], [s.bad, s.badSoft]] as const) {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(fg, p.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

test('las variables CSS usan nombres con guiones', () => {
  const v = cssVariables('lino', 'light');
  expect(v['--accent-ink']).toBe(THEMES.lino.light.accentInk);
  expect(v['--surface-2']).toBe(THEMES.lino.light.surface2);
  expect(v['--ok-soft']).toBe(STATUS.light.okSoft);
});
