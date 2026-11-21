import { describe, expect, test } from 'vitest';
import { MESSAGES } from '../../i18n';
import { runChart } from '../../calc/runchart';
import { layoutSheet } from '../../sheet/layout';
import { evaluateGrid } from '../../sheet/evaluate';
import { corridaSheet } from './sheet';
import { corridaSavedSheet } from './reading';
import { CHANGEOVER_EXAMPLE, type CorridaSaved } from './model';

const t = MESSAGES.es;
const plain = (s: string) => s.replace(/ /g, ' ');
const EX: CorridaSaved = { v: 1, values: CHANGEOVER_EXAMPLE, name: 'Tiempo de cambio', unit: 'min' };

describe('hoja del gráfico de corrida', () => {
  test('mediana y lado de cada punto = cálculo', () => {
    const r = runChart(EX.values).result!;
    const grid = layoutSheet(corridaSheet(EX, t, { reading: [], version: '0', date: 'x' }));
    const values = evaluateGrid(grid);
    expect(values[grid.address.median!]).toBe(r.median);
    const first = Number(grid.address['side[]']!.split(':')[0]!.slice(1));
    EX.values.forEach((v, i) => expect(values[`D${first + i}`]).toBe(v > r.median ? 1 : v < r.median ? -1 : 0));
  });

  test('el ejemplo SMED: desplazamiento hacia abajo desde el punto 13 y pocas corridas', () => {
    const sheet = corridaSavedSheet(EX, t, 'es', { version: '0', date: 'x' })!;
    const lines = sheet.reading.map((x) => plain(x.text));
    expect(lines[0]).toContain('Tiempo de cambio: mediana 35 min, con 3 señales');
    expect(lines.some((x) => x.startsWith('Desplazamiento hacia abajo: 12 puntos seguidos por debajo de la mediana (del 13 al 24)'))).toBe(true);
    expect(lines.some((x) => x.startsWith('Desplazamiento hacia arriba: 12 puntos seguidos por encima de la mediana (del 1 al 12)'))).toBe(true);
    expect(lines.some((x) => x.startsWith('Pocas corridas'))).toBe(true);
  });
});
