import { describe, expect, test } from 'vitest';
import { formatNumber, isAmbiguousThousands, parseColumn, parseDecimal } from './number';

describe('parseDecimal', () => {
  test.each([
    ['6,02', 6.02],
    ['6.02', 6.02],
    ['  48 ', 48],
    ['-0,5', -0.5],
    ['+3', 3],
    [',5', 0.5],
    ['.5', 0.5],
    ['−2,5', -2.5], // signo menos tipográfico
  ])('"%s" → %s', (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });

  test.each(['', 'abc', 'n/a', '6,0,2', '1.234,5', '6 02', '5e3', '6,', '--1'])('"%s" no es un número', (input) => {
    expect(parseDecimal(input)).toBeNull();
  });
});

describe('separador de miles ambiguo', () => {
  test('marca 1.234 y 1,234', () => {
    expect(isAmbiguousThousands('1.234')).toBe(true);
    expect(isAmbiguousThousands('12,345')).toBe(true);
  });
  test('no marca números claros', () => {
    expect(isAmbiguousThousands('6,02')).toBe(false);
    expect(isAmbiguousThousands('1234')).toBe(false);
    expect(isAmbiguousThousands('1,2345')).toBe(false);
  });
});

describe('parseColumn', () => {
  test('lee una columna pegada de Excel con líneas vacías y texto', () => {
    const r = parseColumn('6,04\r\n5.98\r\n\r\nn/a\r\n6,11\t extra\r\n');
    expect(r.values).toEqual([6.04, 5.98, 6.11]);
    expect(r.invalid).toEqual([{ line: 4, raw: 'n/a' }]);
    expect(r.empty).toBe(1);
  });
  test('avisa de valores con posible separador de miles', () => {
    const r = parseColumn('1.234\n2');
    expect(r.values).toEqual([1.234, 2]);
    expect(r.ambiguous).toEqual([{ line: 1, raw: '1.234' }]);
  });
});

test('formatNumber usa coma en español y punto en inglés', () => {
  expect(formatNumber(48.567, 'es', 1)).toBe('48,6');
  expect(formatNumber(48.567, 'en', 1)).toBe('48.6');
});
