import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { GembaDB } from '../data/db';
import { makeBackup, readBackup, restoreBackup } from '../data/backup';
import {
  copyName,
  deleteRecipe,
  duplicateRecipe,
  findRecipe,
  groupRecipes,
  listRecipes,
  recipeLabel,
  RecipeExistsError,
  renameRecipe,
  restoreRecipe,
  saveRecipe,
  undoSave,
  type RecipeContent,
} from './store';

let db: GembaDB;
beforeEach(() => {
  db = new GembaDB(`r-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await db.delete();
});

const content = (standard: number): RecipeContent => ({
  unitName: 'botellas',
  stations: [
    { name: 'Llenadora', measure: 'rate', unit: 'h', item: '', per: 1, standard },
    { name: 'Encajonadora', measure: 'rate', unit: 'min', item: 'cajas', per: 24, standard: 42 },
  ],
  lineSpeed: null,
  changeovers: [],
});
const L3 = (name: string) => ({ plant: 'Planta Norte', line: 'Línea 3', name });

describe('recetas', () => {
  test('se ordenan planta → línea → receta y se agrupan', async () => {
    await saveRecipe(L3('20 oz'), content(40_000), db);
    await saveRecipe(L3('12 oz'), content(48_000), db);
    await saveRecipe({ plant: 'Planta Norte', line: 'Línea 1', name: 'Lata' }, content(60_000), db);
    await saveRecipe({ plant: 'Planta Sur', line: 'Línea 3', name: '12 oz' }, content(30_000), db);
    const list = await listRecipes(db);
    expect(list.map(recipeLabel)).toEqual(['Planta Norte · Línea 1 · Lata', 'Planta Norte · Línea 3 · 12 oz', 'Planta Norte · Línea 3 · 20 oz', 'Planta Sur · Línea 3 · 12 oz']);
    const groups = groupRecipes(list);
    expect(groups.map((g) => [g.plant, g.lines.map((l) => [l.line, l.recipes.length])])).toEqual([
      ['Planta Norte', [['Línea 1', 1], ['Línea 3', 2]]],
      ['Planta Sur', [['Línea 3', 1]]],
    ]);
  });

  test('guardar con los mismos nombres reemplaza la receta, y «Deshacer» la deja como estaba', async () => {
    const first = await saveRecipe(L3('12 oz'), content(48_000), db);
    const again = await saveRecipe({ plant: ' planta norte ', line: 'LÍNEA 3', name: '12 OZ' }, content(50_000), db);
    expect(again.recipe.id).toBe(first.recipe.id);
    expect(again.previous!.stations[0]!.standard).toBe(48_000);
    expect((await listRecipes(db)).length).toBe(1);
    await undoSave(again, db);
    expect((await findRecipe(L3('12 oz'), db))!.stations[0]!.standard).toBe(48_000);
    // Deshacer una receta nueva la borra.
    const fresh = await saveRecipe(L3('20 oz'), content(40_000), db);
    await undoSave(fresh, db);
    expect(await findRecipe(L3('20 oz'), db)).toBeNull();
  });

  test('cambiar de nombre, duplicar y borrar con «Deshacer»', async () => {
    const { recipe } = await saveRecipe(L3('12 oz'), content(48_000), db);
    await saveRecipe(L3('20 oz'), content(40_000), db);
    await expect(renameRecipe(recipe.id, L3('20 oz'), db)).rejects.toBeInstanceOf(RecipeExistsError);
    await renameRecipe(recipe.id, L3('12 oz Coca-Cola'), db);
    const name = await copyName((await findRecipe(L3('12 oz Coca-Cola'), db))!, (n) => (n === 1 ? '(copia)' : `(copia ${n})`), db);
    expect(name).toBe('12 oz Coca-Cola (copia)');
    const copy = await duplicateRecipe(recipe.id, name, db);
    expect(copy.id).not.toBe(recipe.id);
    expect(copy.stations).toEqual(recipe.stations);
    expect(await copyName(copy, (n) => (n === 1 ? '(copia)' : `(copia ${n})`), db)).toBe('12 oz Coca-Cola (copia) (copia)');
    await deleteRecipe(copy.id, db);
    expect((await listRecipes(db)).length).toBe(2);
    await restoreRecipe(copy.id, db);
    expect((await listRecipes(db)).length).toBe(3);
  });

  test('van en la copia de seguridad, y al restaurar se queda la más reciente', async () => {
    const other = new GembaDB(`r2-${crypto.randomUUID()}`);
    try {
      const { recipe } = await saveRecipe(L3('12 oz'), content(48_000), db);
      const copy = readBackup(JSON.stringify(await makeBackup(db, '0.1.0')));
      expect(copy.recipes.map(recipeLabel)).toEqual(['Planta Norte · Línea 3 · 12 oz']);
      // Un teléfono nuevo la recibe.
      await restoreBackup(other, copy);
      expect((await listRecipes(other)).map((r) => r.id)).toEqual([recipe.id]);
      // Si en el teléfono es más reciente, la copia no la pisa.
      await saveRecipe(L3('12 oz'), content(50_000), other);
      await restoreBackup(other, copy);
      expect((await findRecipe(L3('12 oz'), other))!.stations[0]!.standard).toBe(50_000);
      // Una copia antigua, sin recetas, se lee igual.
      const old = JSON.parse(JSON.stringify(copy));
      delete old.recipes;
      expect(readBackup(JSON.stringify(old)).recipes).toEqual([]);
    } finally {
      await other.delete();
    }
  });
});
