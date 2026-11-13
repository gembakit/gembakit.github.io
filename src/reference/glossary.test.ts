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
    expect(searchGlossary('CPK', 'es')[0]!.id).toBe('cpk');
    expect(searchGlossary('TOLERANCIA', 'es').map((g) => g.id)).toContain('cpk');
    expect(searchGlossary('indice', 'es').map((g) => g.id)).toContain('cpk');
    expect(searchGlossary('', 'es')).toHaveLength(GLOSSARY.length);
  });

  test('primero lo que coincide con el término; después nombre y definición', () => {
    // «OEE» aparece en varias definiciones, pero el término OEE va primero.
    const oee = searchGlossary('oee', 'es');
    expect(oee[0]!.id).toBe('oee');
    expect(oee.length).toBeGreaterThan(1);
    // «Takt» antes que los términos que solo lo citan en la definición.
    expect(searchGlossary('takt', 'es')[0]!.id).toBe('takt');
  });

  test('el filtro de categoría deja solo esa categoría', () => {
    const symbols = searchGlossary('', 'es', 'simbolo');
    expect(symbols.length).toBeGreaterThan(20);
    expect(symbols.every((g) => g.category === 'simbolo')).toBe(true);
  });

  test('sin términos repetidos: ningún término se escribe igual dos veces en un idioma', () => {
    for (const lang of ['es', 'en'] as const) {
      // Distingue mayúsculas a propósito: Σ (sumatorio) y σ (sigma) son símbolos distintos.
      const terms = GLOSSARY.map((g) => g[lang].term);
      expect(terms.filter((t, i) => terms.indexOf(t) !== i)).toEqual([]);
    }
  });

  test('las siglas que usan las herramientas existen en el glosario', () => {
    for (const id of ['dpmo', 'dpu', 'dpo', 'nivel-sigma', 'z-proceso', 'fpy', 'rty', 'takt', 'oee', 'kanban', 'roi', 'payback']) {
      expect(GLOSSARY.some((g) => g.id === id)).toBe(true);
    }
  });
});
