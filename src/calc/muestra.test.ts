import { expect, test } from 'vitest';
import { sampleMean } from './muestra';

test('media de valores conocidos con sus pasos', () => {
  const r = sampleMean([2, 4, 4, 4, 5, 5, 7, 9]);
  expect(r.result).toBe(5);
  expect(r.steps).toEqual([
    { key: 'sum', value: 40 },
    { key: 'count', value: 8 },
  ]);
  expect(r.warnings).toEqual([]);
});

test('sin datos no hay resultado y avisa', () => {
  expect(sampleMean([])).toEqual({ result: null, steps: [], warnings: [{ code: 'no-data' }] });
});

test('con un solo valor avisa', () => {
  expect(sampleMean([6.02]).warnings).toEqual([{ code: 'single-value' }]);
});
