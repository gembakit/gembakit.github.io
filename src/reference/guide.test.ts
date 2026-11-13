import { expect, test } from 'vitest';
import { GUIDE, guideFor } from './guide';

test('cada tema de la guía tiene identificador único', () => {
  const ids = GUIDE.map((g) => g.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test.each(GUIDE.map((g) => [g.id, g] as const))('«%s» está completo y con los mismos párrafos en español e inglés', (_id, g) => {
  expect(g.es.body.length).toBeGreaterThan(0);
  expect(g.en.body).toHaveLength(g.es.body.length);
  for (const lang of ['es', 'en'] as const) {
    expect(g[lang].title.trim()).not.toBe('');
    for (const p of g[lang].body) expect(p.trim().length).toBeGreaterThan(20);
  }
});

test('la guía sale en el idioma pedido y en el mismo orden', () => {
  expect(guideFor('en').map((g) => g.id)).toEqual(GUIDE.map((g) => g.id));
  expect(guideFor('en')[0]!.text.title).toBe(GUIDE[0]!.en.title);
});
