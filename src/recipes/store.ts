import { db as defaultDb, type GembaDB, type Recipe } from '../data/db';
import { newRecord, now, type SyncedRecord } from '../data/record';

// Recetas de las líneas (docs/fichas/recetas.md). Viven fuera de los proyectos:
// se ordenan Planta → Línea → Receta y se cargan desde cualquier herramienta
// que las use. Siguen las reglas de todo lo guardado (identificador, fecha de
// cambio, borrado con marca para «Deshacer»).

export type RecipeContent = Omit<Recipe, keyof SyncedRecord | 'plant' | 'line' | 'name'>;
export interface RecipeNames {
  plant: string;
  line: string;
  name: string;
}

const key = (s: string) => s.trim().toLocaleLowerCase();
const sameNames = (r: RecipeNames, n: RecipeNames) => key(r.plant) === key(n.plant) && key(r.line) === key(n.line) && key(r.name) === key(n.name);
const clean = (n: RecipeNames): RecipeNames => ({ plant: n.plant.trim(), line: n.line.trim(), name: n.name.trim() });

/** Recetas vivas, ordenadas por planta, línea y nombre. */
export async function listRecipes(database: GembaDB = defaultDb): Promise<Recipe[]> {
  const all = await database.recipes.where('deleted').equals(0).toArray();
  const c = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
  return all.sort((a, b) => c(a.plant, b.plant) || c(a.line, b.line) || c(a.name, b.name));
}

export async function getRecipe(id: string, database: GembaDB = defaultDb): Promise<Recipe | null> {
  const r = await database.recipes.get(id);
  return r && !r.deleted ? r : null;
}

/** La receta viva con esos nombres (sin distinguir mayúsculas), si la hay. */
export async function findRecipe(names: RecipeNames, database: GembaDB = defaultDb): Promise<Recipe | null> {
  return (await listRecipes(database)).find((r) => sameNames(r, names)) ?? null;
}

/**
 * Guarda una receta. Si ya hay una con los mismos nombres, la reemplaza (mismo
 * identificador) y devuelve cómo estaba, para poder deshacerlo.
 */
export async function saveRecipe(names: RecipeNames, content: RecipeContent, database: GembaDB = defaultDb): Promise<{ recipe: Recipe; previous: Recipe | null }> {
  const n = clean(names);
  const previous = await findRecipe(n, database);
  if (previous) {
    const recipe: Recipe = { ...previous, ...n, ...content, updatedAt: now() };
    await database.recipes.put(recipe);
    return { recipe, previous };
  }
  const recipe = newRecord({ ...n, ...content }) as Recipe;
  await database.recipes.add(recipe);
  return { recipe, previous: null };
}

/** Deshace un guardado: vuelve a como estaba, o borra la receta si era nueva. */
export async function undoSave(saved: { recipe: Recipe; previous: Recipe | null }, database: GembaDB = defaultDb): Promise<void> {
  if (saved.previous) await database.recipes.put({ ...saved.previous, updatedAt: now() });
  else await deleteRecipe(saved.recipe.id, database);
}

export class RecipeExistsError extends Error {
  constructor() {
    super('recipe-exists');
  }
}

/** Cambia la planta, la línea o el nombre. No deja dos recetas con los mismos nombres. */
export async function renameRecipe(id: string, names: RecipeNames, database: GembaDB = defaultDb): Promise<void> {
  const n = clean(names);
  const other = await findRecipe(n, database);
  if (other && other.id !== id) throw new RecipeExistsError();
  await database.recipes.update(id, { ...n, updatedAt: now() });
}

/** Copia una receta con otro nombre en la misma línea («12 oz» → «12 oz (copia)»). */
export async function duplicateRecipe(id: string, name: string, database: GembaDB = defaultDb): Promise<Recipe> {
  const r = await getRecipe(id, database);
  if (!r) throw new Error('recipe-missing');
  const n = clean({ plant: r.plant, line: r.line, name });
  if (await findRecipe(n, database)) throw new RecipeExistsError();
  const { id: _id, createdAt: _c, updatedAt: _u, deleted: _d, origin: _o, ...rest } = r;
  void [_id, _c, _u, _d, _o];
  const copy = newRecord({ ...rest, ...n }) as Recipe;
  await database.recipes.add(copy);
  return copy;
}

/** Un nombre libre para la copia: «12 oz (copia)», «12 oz (copia 2)»… */
export async function copyName(r: Recipe, label: (n: number) => string, database: GembaDB = defaultDb): Promise<string> {
  for (let n = 1; ; n++) {
    const name = `${r.name} ${label(n)}`;
    if (!(await findRecipe({ plant: r.plant, line: r.line, name }, database))) return name;
  }
}

export async function deleteRecipe(id: string, database: GembaDB = defaultDb): Promise<void> {
  await database.recipes.update(id, { deleted: 1, updatedAt: now() });
}

export async function restoreRecipe(id: string, database: GembaDB = defaultDb): Promise<void> {
  await database.recipes.update(id, { deleted: 0, updatedAt: now() });
}

/** «Planta Norte · Línea 3 · 12 oz». */
export const recipeLabel = (r: RecipeNames) => [r.plant, r.line, r.name].filter((x) => x.trim()).join(' · ');

/** Recetas agrupadas: planta → línea → recetas, en el orden de la lista. */
export function groupRecipes(list: Recipe[]): { plant: string; lines: { line: string; recipes: Recipe[] }[] }[] {
  const plants: { plant: string; lines: { line: string; recipes: Recipe[] }[] }[] = [];
  for (const r of list) {
    let p = plants.find((x) => key(x.plant) === key(r.plant));
    if (!p) plants.push((p = { plant: r.plant, lines: [] }));
    let l = p.lines.find((x) => key(x.line) === key(r.line));
    if (!l) p.lines.push((l = { line: r.line, recipes: [] }));
    l.recipes.push(r);
  }
  return plants;
}
