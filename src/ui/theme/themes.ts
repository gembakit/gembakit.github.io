// Temas de color aprobados por el dueño (maqueta del 2026-11-13).
// Cada tema tiene versión clara y oscura con las mismas claves.
// Los colores de estado (ok, aviso, error) son comunes a todos los temas.

export const THEME_IDS = ['lino', 'salvia', 'pizarra', 'grafito', 'ciruela'] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export type Mode = 'light' | 'dark';
export const DEFAULT_THEME: ThemeId = 'lino';

export interface Palette {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  text: string;
  muted: string;
  faint: string;
  accent: string;
  accentInk: string;
  onAccent: string;
  soft: string;
  band: string;
  bandText: string;
}

export interface StatusPalette {
  ok: string;
  okSoft: string;
  warn: string;
  warnSoft: string;
  bad: string;
  badSoft: string;
}

export const THEMES: Record<ThemeId, Record<Mode, Palette>> = {
  lino: {
    light: { bg: '#F4EEE4', surface: '#FBF8F2', surface2: '#EEE5D7', line: '#E3D8C6', text: '#2B2119', muted: '#6E5E4B', faint: '#A8987F', accent: '#8F6239', accentInk: '#7A512E', onAccent: '#FFF9F1', soft: '#EBDDC8', band: '#2B2119', bandText: '#F4EEE4' },
    dark: { bg: '#19140F', surface: '#221B15', surface2: '#2B231B', line: '#3A3026', text: '#F2E9DC', muted: '#B5A38B', faint: '#7E6F5D', accent: '#D6A774', accentInk: '#E2B988', onAccent: '#23170B', soft: '#3A2C1E', band: '#0F0C09', bandText: '#F2E9DC' },
  },
  salvia: {
    light: { bg: '#EFF1EA', surface: '#FAFBF7', surface2: '#E4E8DC', line: '#D6DCCB', text: '#1F261D', muted: '#5A6555', faint: '#98A190', accent: '#4E6B47', accentInk: '#405A3A', onAccent: '#F6FAF3', soft: '#DCE5D3', band: '#1F261D', bandText: '#EFF1EA' },
    dark: { bg: '#121510', surface: '#1A1F17', surface2: '#222920', line: '#2E372A', text: '#E8ECE2', muted: '#A3AE9B', faint: '#6E7868', accent: '#9CBF8D', accentInk: '#B2D1A4', onAccent: '#142012', soft: '#263122', band: '#0B0D0A', bandText: '#E8ECE2' },
  },
  pizarra: {
    light: { bg: '#EDF0F3', surface: '#FAFBFC', surface2: '#E2E7EC', line: '#D5DCE3', text: '#19212B', muted: '#56636F', faint: '#94A0AC', accent: '#2E5C85', accentInk: '#234C70', onAccent: '#F5F9FC', soft: '#D9E4EF', band: '#19212B', bandText: '#EDF0F3' },
    dark: { bg: '#0F141A', surface: '#161D25', surface2: '#1D2630', line: '#29343F', text: '#E5EBF1', muted: '#9AA8B6', faint: '#66737F', accent: '#80B1DE', accentInk: '#9CC3E8', onAccent: '#0B1A27', soft: '#1B2D3E', band: '#090C10', bandText: '#E5EBF1' },
  },
  grafito: {
    light: { bg: '#F1F1EF', surface: '#FFFFFF', surface2: '#E8E8E5', line: '#DCDCD8', text: '#1A1A19', muted: '#5A5A56', faint: '#9A9A95', accent: '#D99A2B', accentInk: '#7F5400', onAccent: '#1A1300', soft: '#F6E6C4', band: '#1A1A19', bandText: '#F1F1EF' },
    dark: { bg: '#111111', surface: '#1A1A1A', surface2: '#232323', line: '#303030', text: '#EDEDEA', muted: '#A5A5A0', faint: '#6E6E6A', accent: '#F0B44A', accentInk: '#F5C46A', onAccent: '#1A1300', soft: '#33280F', band: '#000000', bandText: '#EDEDEA' },
  },
  ciruela: {
    light: { bg: '#F3EEF1', surface: '#FCFAFB', surface2: '#EAE1E7', line: '#E0D5DC', text: '#2A1D26', muted: '#6C5A66', faint: '#A897A2', accent: '#7B3F66', accentInk: '#6A3357', onAccent: '#FFF7FC', soft: '#EEDCE8', band: '#2A1D26', bandText: '#F3EEF1' },
    dark: { bg: '#171115', surface: '#20181D', surface2: '#291F26', line: '#372A32', text: '#F1E7ED', muted: '#B5A0AD', faint: '#7A6872', accent: '#D69BC1', accentInk: '#E3B2D1', onAccent: '#2A0F20', soft: '#3A2333', band: '#0C080A', bandText: '#F1E7ED' },
  },
};

export const STATUS: Record<Mode, StatusPalette> = {
  light: { ok: '#2B6E3F', okSoft: '#E1F0E4', warn: '#8A5200', warnSoft: '#F8EBD3', bad: '#A8352A', badSoft: '#F7E1DD' },
  dark: { ok: '#74C98E', okSoft: '#17301F', warn: '#F0B860', warnSoft: '#3A2A12', bad: '#FF9488', badSoft: '#3B1A17' },
};

/**
 * Colores de los gráficos (una serie por color, en este orden fijo), comunes a todos los temas para que
 * las partes de un gráfico no se confundan con el acento del tema. Paleta categórica validada (separación
 * para daltonismo y a simple vista) contra las superficies claras y oscuras de los cinco temas; en oscuro,
 * los mismos tonos ajustados al fondo.
 */
export const CHART: Record<Mode, Record<`series${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`, string>> = {
  light: { series1: '#2A78D6', series2: '#EB6834', series3: '#1BAF7A', series4: '#EDA100', series5: '#E87BA4', series6: '#008300', series7: '#6250D6', series8: '#E34948' },
  dark: { series1: '#3987E5', series2: '#D95926', series3: '#199E70', series4: '#C98500', series5: '#D55181', series6: '#008300', series7: '#9085E9', series8: '#E66767' },
};

/** Variables CSS para un tema y modo: --bg, --surface, --accent-ink, --series-1, … */
export function cssVariables(theme: ThemeId, mode: Mode): Record<string, string> {
  const all = { ...THEMES[theme][mode], ...STATUS[mode], ...CHART[mode] };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(all)) {
    out[`--${k.replace(/[A-Z0-9]/g, (c) => `-${c.toLowerCase()}`)}`] = v;
  }
  return out;
}

// ---- contraste (WCAG 2.x) ----
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
/** Relación de contraste entre dos colores #RRGGBB (de 1 a 21). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
