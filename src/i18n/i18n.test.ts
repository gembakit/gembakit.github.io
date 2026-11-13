import { describe, expect, test } from 'vitest';
import { MESSAGES, detectLanguage } from './index';

type Tree = { [k: string]: unknown };

function leaves(obj: Tree, prefix = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') for (const [p, x] of leaves(v as Tree, path)) out.set(p, x);
    else out.set(path, v);
  }
  return out;
}

describe('textos', () => {
  const es = leaves(MESSAGES.es as unknown as Tree);
  const en = leaves(MESSAGES.en as unknown as Tree);

  test('español e inglés tienen exactamente las mismas claves', () => {
    expect([...en.keys()].sort()).toEqual([...es.keys()].sort());
  });

  test('ningún texto está vacío', () => {
    for (const [lang, map] of [['es', es], ['en', en]] as const) {
      for (const [key, v] of map) {
        const text = typeof v === 'function' ? (v as (...a: unknown[]) => string)('1') : v;
        expect(typeof text, `${lang}:${key}`).toBe('string');
        expect((text as string).trim(), `${lang}:${key}`).not.toBe('');
      }
    }
  });
});

describe('detección de idioma', () => {
  test('elige español si el dispositivo lo prefiere', () => {
    expect(detectLanguage(['es-ES', 'en-US'])).toBe('es');
    expect(detectLanguage(['es-419'])).toBe('es');
  });
  test('elige el primero de los dos que aparezca', () => {
    expect(detectLanguage(['en-GB', 'es-ES'])).toBe('en');
    expect(detectLanguage(['fr-FR', 'es-MX'])).toBe('es');
  });
  test('sin español ni inglés, usa inglés', () => {
    expect(detectLanguage(['fr-FR', 'de-DE'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });
});
