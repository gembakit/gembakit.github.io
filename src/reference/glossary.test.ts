import { describe, expect, test } from 'vitest';
import { GLOSSARY, GLOSSARY_CATEGORIES, searchGlossary } from './glossary';

describe('glosario', () => {
  test('cada término tiene identificador único', () => {
    const ids = GLOSSARY.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test.each(GLOSSARY.map((g) => [g.id, g] as const))('«%s» está completo en español e inglés', (_id, g) => {
    expect(GLOSSARY_CATEGORIES).toContain(g.category);
    for (const lang of ['es', 'en'] as const) {
      expect(g[lang].term.trim()).not.toBe('');
      expect(g[lang].name.trim()).not.toBe('');
      expect(g[lang].def.trim().length).toBeGreaterThan(20);
    }
  });

  test('la búsqueda ignora tildes y mayúsculas y mira la definición', () => {
    expect(searchGlossary('cpk', 'es').map((g) => g.id)).toEqual(['cpk']);
    expect(searchGlossary('TOLERANCIA', 'es').map((g) => g.id)).toEqual(['cpk']);
    expect(searchGlossary('indice', 'es').map((g) => g.id)).toContain('cpk');
    expect(searchGlossary('', 'es')).toHaveLength(GLOSSARY.length);
  });
});
