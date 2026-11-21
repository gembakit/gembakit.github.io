import type { Palette } from '../ui/theme/themes';

// Estilo de todo lo que sale de la app (hojas de Google, gráficos exportados,
// informes PDF): colores estándar y profesionales, iguales para todos los
// temas (decisión del dueño, 2026-11-14 y 2026-11-21). No depende del tema de
// la app.
//
// - Azul marino de oficina para títulos y encabezados.
// - Datos que se pueden cambiar en amarillo claro, la convención de los
//   modelos de hoja de cálculo (celdas de entrada).
// - Resultados destacados en azul muy claro; filas alternas en gris muy claro.
// - Texto casi negro y notas en gris, con buen contraste al imprimir.

export const EXPORT_PALETTE: Palette = {
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  surface2: '#E8F0F8',
  line: '#D0D7DE',
  text: '#1F2328',
  muted: '#59636E',
  faint: '#8C959F',
  accent: '#1F4E79',
  accentInk: '#1F4E79',
  onAccent: '#FFFFFF',
  soft: '#FFF2CC',
  band: '#1F4E79',
  bandText: '#FFFFFF',
};

/**
 * Colores de las series en los gráficos exportados: una paleta categórica
 * estándar (la de Office/Tableau, en orden fijo), distinta del tema.
 */
export const EXPORT_SERIES = ['#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD', '#8C564B', '#E377C2', '#7F7F7F'] as const;
