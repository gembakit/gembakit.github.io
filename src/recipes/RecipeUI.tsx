import { useCallback, useId, useState } from 'react';
import { BookMarked, ChevronDown, Copy, PencilLine, Save, Trash2 } from 'lucide-react';
import { useI18n, type Messages } from '../i18n';
import type { Recipe, RecipeStation } from '../data/db';
import { useLive } from '../projects/live';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { formatNumber } from '../ui/number';
import { paceLabel } from '../tools/takt/explain';
import {
  copyName,
  deleteRecipe,
  duplicateRecipe,
  groupRecipes,
  listRecipes,
  recipeLabel,
  RecipeExistsError,
  renameRecipe,
  restoreRecipe,
  saveRecipe,
  undoSave,
  type RecipeContent,
  type RecipeNames,
} from './store';

// Piezas de pantalla de las recetas (docs/fichas/recetas.md): la barra de las
// herramientas («Cargar receta» y «Guardar como receta»), sus dos ventanas y
// el bloque «Mis líneas» de Referencia.

/** «Llenadora · 48.000 botellas/h» o «Encajonadora · 42 cajas/min · 1 caja = 24 botellas». */
export function stationText(st: RecipeStation, unitName: string, t: Messages, lang: 'es' | 'en'): string {
  const d = t.tools.takt;
  const unit = unitName.trim() || d.defaultUnit;
  const item = st.item.trim() || unit;
  const parts = [st.name.trim() || t.recipes.noName];
  // Sin cortes dentro de «48.000 botellas/h» ni de «1 caja = 24 botellas».
  const keep = (x: string) => x.replace(/ /g, '\u00a0');
  parts.push(st.standard === null ? t.recipes.noStandard : keep(`${formatNumber(st.standard, lang, 6)} ${paceLabel(t, st, item)}`));
  if (st.item.trim()) parts.push(keep(d.perText(d.singular(st.item.trim()), formatNumber(st.per, lang, 6), unit)));
  return parts.join(' · ');
}

const inputCls =
  'h-12 w-full rounded-[15px] border-[1.5px] border-line bg-surface px-4 text-[16px] outline-none placeholder:text-muted focus:border-accent';

/** Ventana con la planta, la línea y el nombre: para guardar una receta o cambiarle el nombre. */
function NamesSheet({
  open,
  onClose,
  title,
  hint,
  initial,
  ignoreId,
  submit,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  hint: string;
  initial: RecipeNames;
  /** Al cambiar el nombre: la receta misma no cuenta como «ya existe». */
  ignoreId?: string;
  submit: { save: string; replace: string };
  onSubmit: (names: RecipeNames) => Promise<void>;
}) {
  const { t } = useI18n();
  const r = t.recipes;
  const [names, setNames] = useState(initial);
  const [lastOpen, setLastOpen] = useState(false);
  // Al abrir, empieza con los nombres que tocan.
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setNames(initial);
  }
  const all = useLive(() => listRecipes(), []) ?? [];
  const k = (s: string) => s.trim().toLocaleLowerCase();
  const plants = [...new Set(all.map((x) => x.plant))];
  const lines = [...new Set(all.filter((x) => k(x.plant) === k(names.plant)).map((x) => x.line))];
  const recipes = all.filter((x) => k(x.plant) === k(names.plant) && k(x.line) === k(names.line));
  const exists = recipes.find((x) => k(x.name) === k(names.name) && x.id !== ignoreId) ?? null;
  const ready = names.plant.trim() && names.line.trim() && names.name.trim();
  const ids = { plants: useId(), lines: useId(), names: useId() };
  const field = (key: keyof RecipeNames, label: string, placeholder: string, list: string, options: string[]) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <input
        type="text"
        value={names[key]}
        placeholder={placeholder}
        autoComplete="off"
        maxLength={60}
        list={list}
        onChange={(e) => setNames((n) => ({ ...n, [key]: e.target.value }))}
        className={inputCls}
      />
      <datalist id={list}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </label>
  );
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-3.5">
        <p className="text-[15px] leading-relaxed text-muted">{hint}</p>
        {field('plant', r.plant, r.plantPh, ids.plants, plants)}
        {field('line', r.line, r.linePh, ids.lines, lines)}
        {field('name', r.name, r.namePh, ids.names, recipes.map((x) => x.name))}
        {exists && !ignoreId && <p className="rounded-[14px] bg-warn-soft p-3 text-[14.5px]">{r.exists}</p>}
        {exists && ignoreId && <p className="rounded-[14px] bg-bad-soft p-3 text-[14.5px]">{r.existsError}</p>}
        <Button variant="primary" icon={Save} disabled={!ready || (!!exists && !!ignoreId)} onClick={() => void onSubmit(names)}>
          {exists && !ignoreId ? submit.replace : submit.save}
        </Button>
        {!ready && <p className="text-[13px] text-muted">{r.missingNames}</p>}
      </div>
    </Sheet>
  );
}

/** Ventana para elegir una receta: planta → línea → receta. */
function PickSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (r: Recipe) => void }) {
  const { t } = useI18n();
  const r = t.recipes;
  const all = useLive(() => listRecipes(), []);
  const groups = groupRecipes(all ?? []);
  return (
    <Sheet open={open} onClose={onClose} title={r.pickTitle}>
      {all && all.length === 0 ? (
        <p className="text-[15px] leading-relaxed text-muted">{r.none}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <section key={g.plant} className="flex flex-col gap-2.5">
              <h3 className="font-display text-[17px] font-bold">{g.plant}</h3>
              {g.lines.map((l) => (
                <div key={l.line} className="flex flex-col gap-2">
                  <h4 className="text-[13px] font-semibold text-muted">{l.line}</h4>
                  {l.recipes.map((x) => (
                    <button key={x.id} type="button" onClick={() => onPick(x)} className="press raised-sm flex min-h-14 flex-col items-start justify-center gap-0.5 rounded-[15px] px-4 py-2.5 text-left">
                      <span className="text-[16px] font-semibold wrap-break-word">{x.name}</span>
                      <span className="text-[13px] text-muted">{r.summary(x.stations.length, x.unitName.trim() || t.tools.takt.defaultUnit)}</span>
                    </button>
                  ))}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/**
 * «Cargar receta» y «Guardar como receta», en los datos de una herramienta.
 * `build` da lo que se guarda (o un texto con lo que falta); `current`, la receta cargada.
 */
export function RecipeBar({
  current,
  onLoad,
  build,
  onSaved,
  saveHint,
}: {
  current: RecipeNames | null;
  onLoad: (r: Recipe) => void;
  build: () => Partial<RecipeContent> | string;
  /** Qué guarda esta herramienta en la receta. */
  saveHint?: string;
  onSaved: (names: RecipeNames) => void;
}) {
  const { t } = useI18n();
  const r = t.recipes;
  const toast = useToast();
  const [pick, setPick] = useState(false);
  const [save, setSave] = useState(false);
  const closePick = useCallback(() => setPick(false), []);
  const closeSave = useCallback(() => setSave(false), []);
  const openSave = () => {
    const c = build();
    if (typeof c === 'string') toast(c);
    else setSave(true);
  };
  const doSave = async (names: RecipeNames) => {
    const c = build();
    if (typeof c === 'string') {
      toast(c);
      return;
    }
    const result = await saveRecipe(names, c);
    setSave(false);
    onSaved(result.recipe);
    toast(result.previous ? r.replaced(recipeLabel(result.recipe)) : r.saved(recipeLabel(result.recipe)), {
      tone: 'ok',
      action: { label: t.common.undo, onAction: () => void undoSave(result) },
    });
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        <Button icon={BookMarked} onClick={() => setPick(true)}>
          {r.load}
        </Button>
        <Button icon={Save} onClick={openSave}>
          {r.saveAs}
        </Button>
      </div>
      {current && (
        <p className="rounded-[14px] bg-soft p-3 text-[14px] leading-snug">
          <span className="block font-semibold wrap-break-word">{r.loaded(recipeLabel(current))}</span>
          <span className="block text-muted">{r.loadedHint}</span>
        </p>
      )}
      <PickSheet
        open={pick}
        onClose={closePick}
        onPick={(x) => {
          setPick(false);
          onLoad(x);
        }}
      />
      <NamesSheet
        open={save}
        onClose={closeSave}
        title={r.saveTitle}
        hint={saveHint ?? r.saveHint}
        initial={current ?? { plant: '', line: '', name: '' }}
        submit={{ save: r.save, replace: r.replace }}
        onSubmit={doSave}
      />
    </div>
  );
}

/** Bloque «Mis líneas» de Referencia: las recetas por planta y línea, con sus acciones. */
export function MyLines() {
  const { t, lang } = useI18n();
  const r = t.recipes;
  const toast = useToast();
  const all = useLive(() => listRecipes(), []);
  const [open, setOpen] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<Recipe | null>(null);
  const closeRename = useCallback(() => setRenaming(null), []);
  if (!all) return null;
  if (all.length === 0) return <p className="px-4 py-3 text-[15px] leading-relaxed text-muted">{r.none}</p>;

  const duplicate = async (x: Recipe) => {
    const copy = await duplicateRecipe(x.id, await copyName(x, r.copyLabel));
    setOpen(copy.id);
    toast(r.duplicated(recipeLabel(copy)), { tone: 'ok', action: { label: t.common.undo, onAction: () => void deleteRecipe(copy.id) } });
  };
  const remove = async (x: Recipe) => {
    await deleteRecipe(x.id);
    toast(r.deleted(recipeLabel(x)), { action: { label: t.common.undo, onAction: () => void restoreRecipe(x.id) } });
  };
  const rename = async (names: RecipeNames) => {
    if (!renaming) return;
    try {
      await renameRecipe(renaming.id, names);
      setRenaming(null);
    } catch (e) {
      if (e instanceof RecipeExistsError) toast(r.existsError);
      else throw e;
    }
  };

  return (
    <div className="flex flex-col">
      {groupRecipes(all).map((g) => (
        <section key={g.plant} className="flex flex-col border-b border-line px-4 py-3 last:border-b-0">
          <h3 className="font-display text-[18px] font-bold wrap-break-word">{g.plant}</h3>
          {g.lines.map((l) => (
            <div key={l.line} className="mt-2 flex flex-col gap-1.5">
              <h4 className="text-[13px] font-semibold text-muted">{l.line}</h4>
              {l.recipes.map((x) => {
                const isOpen = open === x.id;
                return (
                  <div key={x.id} className="rounded-[15px] bg-surface-2">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : x.id)}
                      className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_22px] items-center gap-3 px-3.5 py-2.5 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block text-[16px] font-semibold wrap-break-word">{x.name}</span>
                        <span className="block text-[13px] text-muted">{r.summary(x.stations.length, x.unitName.trim() || t.tools.takt.defaultUnit)}</span>
                      </span>
                      <ChevronDown aria-hidden size={20} className={`text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="flex flex-col gap-3 px-3.5 pb-3.5">
                        <ul className="flex flex-col gap-1 text-[14.5px] leading-snug">
                          {x.stations.map((st, i) => (
                            <li key={i} className="wrap-break-word">
                              {stationText(st, x.unitName, t, lang)}
                            </li>
                          ))}
                        </ul>
                        <p className="text-[13px] text-muted">{r.howToEdit}</p>
                        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                          <Button icon={PencilLine} onClick={() => setRenaming(x)}>
                            {r.rename}
                          </Button>
                          <Button icon={Copy} onClick={() => void duplicate(x)}>
                            {r.duplicate}
                          </Button>
                          <Button icon={Trash2} onClick={() => void remove(x)}>
                            {r.delete}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      ))}
      <NamesSheet
        open={renaming !== null}
        onClose={closeRename}
        title={r.renameTitle}
        hint={r.renameHint}
        initial={renaming ?? { plant: '', line: '', name: '' }}
        ignoreId={renaming?.id}
        submit={{ save: r.renameSave, replace: r.renameSave }}
        onSubmit={rename}
      />
    </div>
  );
}

/** Cuántas recetas hay (para el título del bloque). */
export function useRecipeCount(): number | undefined {
  return useLive(async () => (await listRecipes()).length, []);
}

