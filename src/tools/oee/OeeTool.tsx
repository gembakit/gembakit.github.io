import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check as CheckMark, CircleAlert, Eraser, Factory, Gauge, Plus, Trash2 } from 'lucide-react';
import { useI18n, type Messages } from '../../i18n';
import { furthestFactor, oee, pareto, plannedKeys, utilization, WORLD_CLASS, type OeeResult, type OeeSliceKind } from '../../calc/oee';
import type { Measure, TimeUnit } from '../../calc/takt';
import { formatNumber, parseDecimal, toFieldText } from '../../ui/number';
import { useSavedInput } from '../../projects/live';
import { lastUsed, latest, listMeasurements } from '../../projects/store';
import type { SavePayload } from '../../projects/SaveSheet';
import { NumberField } from '../../ui/NumberField';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Button, IconButton } from '../../ui/Button';
import { Sheet } from '../../ui/Sheet';
import { Dotted, Explained, type Derivation } from '../../ui/Explained';
import { useToast } from '../../ui/Toast';
import { APP_VERSION } from '../../version';
import { Check, convertText, ExampleOption, Fold, Group, Hint, isBad, MeasureBox, NameInput, PaceField, Segmented, SubTitle, Tag, TimeField, UnitSelect } from '../form';
import { oeeExplain, oeeFormat, oeeLook } from './explain';
import { oeeSheet } from './sheet';
import { oeeConclusion, oeeReadingLines, oeeWarnings } from './reading';
import type { Recipe } from '../../data/db';
import { lineSpeedOf, recipeLabel, type RecipeContent, type RecipeNames } from '../../recipes/store';
import { RecipeBar } from '../../recipes/RecipeUI';
import { BOTTLING, categoryName, isOfficial, machineMinutes, readOeeSaved, sliceName, stopName, toOeeInput, utilizationLabel, VORNE, type OeeSaved } from './model';

interface PlanRow {
  id: number;
  name: string;
  value: string;
  unit: TimeUnit;
  note: string;
}
interface StopRow {
  id: number;
  name: string;
  minutes: string;
  /** id de su categoría. */
  cat: number;
  standard: string;
  note: string;
  /** Máquina que causó la parada (vacío: sin indicar). */
  machine: string;
}
interface CatRow {
  id: number;
  name: string;
}
interface State {
  shift: string;
  shiftUnit: TimeUnit;
  planned: PlanRow[];
  cats: CatRow[];
  stops: StopRow[];
  measure: Measure;
  measureUnit: TimeUnit;
  ideal: string;
  /** Valor exacto de la velocidad estándar tras cambiar de unidad (mientras no se toque el texto). */
  idealExact?: number;
  total: string;
  rejects: string;
  unitName: string;
  /** Porciones desmarcadas en la torta, por id: «p:3» (parada planificada), «c:5» y «s:5» (categoría y su estándar), «speed», «quality». */
  off: string[];
  paretoBy: 'category' | 'stop' | 'machine';
  paretoLosses: boolean;
  /** Receta cargada o guardada. */
  recipe: RecipeNames | null;
  /** Máquinas de la línea (de la receta). */
  machines: string[];
  /** Cambios de la receta con su tiempo estándar, para añadirlos como parada. */
  changeovers: { name: string; minutes: number }[];
  /** Velocidad de la estación más lenta de la receta cargada: si no se cambia, la receta no guarda una escrita. */
  slowest: { value: number; measure: Measure; unit: TimeUnit } | null;
}

const MAX_ROWS = 40;
let ids = 1;
const nextId = () => ids++;

function emptyState(t: Messages, keep?: Pick<State, 'shiftUnit' | 'measure' | 'measureUnit' | 'cats'>): State {
  return {
    shift: '',
    shiftUnit: keep?.shiftUnit ?? 'min',
    planned: [],
    cats: keep?.cats ?? t.tools.oee.defaultCategories.map((name) => ({ id: nextId(), name })),
    stops: [],
    measure: keep?.measure ?? 'time',
    measureUnit: keep?.measureUnit ?? 's',
    ideal: '',
    total: '',
    rejects: '',
    unitName: '',
    off: [],
    paretoBy: 'category',
    paretoLosses: false,
    recipe: null,
    machines: [],
    changeovers: [],
    slowest: null,
  };
}

/** Claves de la torta: de posiciones (lo guardado, «p0», «c1») a ids de la pantalla («p:3», «c:5») y al revés. */
function offToIds(off: string[], planned: { id: number }[], cats: { id: number }[]): string[] {
  return off.flatMap((k) => {
    const m = /^([pcs])(\d+)$/.exec(k);
    if (!m) return k === 'speed' || k === 'quality' ? [k] : [];
    const row = (m[1] === 'p' ? planned : cats)[Number(m[2])];
    return row ? [`${m[1]}:${row.id}`] : [];
  });
}
function offToPositions(off: string[], planned: { id: number }[], cats: { id: number }[]): string[] {
  return off.flatMap((k) => {
    const m = /^([pcs]):(\d+)$/.exec(k);
    if (!m) return k === 'speed' || k === 'quality' ? [k] : [];
    const i = (m[1] === 'p' ? planned : cats).findIndex((x) => x.id === Number(m[2]));
    return i >= 0 ? [`${m[1]}${i}`] : [];
  });
}

/** De lo guardado (o de un ejemplo) a los campos de la pantalla. */
function fromSaved(s: OeeSaved, lang: 'es' | 'en'): State {
  const txt = (v: number) => toFieldText(v, lang);
  const cats = s.categories.map((name) => ({ id: nextId(), name }));
  const planned = s.planned.map((p) => ({ id: nextId(), name: p.name, value: txt(p.value), unit: p.unit, note: p.note }));
  return {
    shift: txt(s.shift),
    shiftUnit: s.shiftUnit,
    planned,
    cats,
    stops: s.stops.map((x) => ({ id: nextId(), name: x.name, minutes: txt(x.minutes), cat: cats[x.category]!.id, standard: x.standard === null ? '' : txt(x.standard), note: x.note, machine: x.machine })),
    measure: s.measure,
    measureUnit: s.measureUnit,
    ideal: txt(s.ideal),
    total: txt(s.total),
    rejects: txt(s.rejects),
    unitName: s.unitName,
    off: offToIds(s.off, planned, cats),
    paretoBy: s.pareto.by,
    paretoLosses: s.pareto.losses,
    recipe: s.recipe ?? null,
    machines: s.machines ?? [],
    changeovers: s.changeovers ?? [],
    slowest: null,
  };
}

/** De los campos a los datos: null si falta lo imprescindible; `bad`, el primer sitio con un número mal escrito. */
function toSaved(st: State, t: Messages): { saved: OeeSaved | null; bad: string | null } {
  const d = t.tools.oee;
  let bad: string | null = null;
  const num = (text: string, where: string) => {
    if (text.trim() === '') return null;
    const v = parseDecimal(text);
    if (v === null) bad ??= where;
    return v;
  };
  const planned: OeeSaved['planned'] = [];
  // Las filas que cuentan (con número), para que las claves de la torta apunten a la parada buena.
  const plannedRows: PlanRow[] = [];
  st.planned.forEach((p, i) => {
    const where = p.name.trim() || d.plannedName(i + 1);
    const v = num(p.value, where);
    if (v !== null) {
      planned.push({ name: p.name.trim(), value: v, unit: p.unit, note: p.note.trim() });
      plannedRows.push(p);
    } else if (p.name.trim() && p.value.trim() === '') bad ??= where;
  });
  const catIndex = new Map(st.cats.map((c, i) => [c.id, i]));
  const stops: OeeSaved['stops'] = [];
  st.stops.forEach((x, i) => {
    const where = x.name.trim() || d.stopName(i + 1);
    const minutes = num(x.minutes, where);
    const standard = num(x.standard, where);
    if (minutes !== null) stops.push({ name: x.name.trim(), minutes, category: catIndex.get(x.cat) ?? st.cats.length - 1, standard, note: x.note.trim(), machine: x.machine.trim() });
    else if (x.name.trim() || x.standard.trim()) bad ??= where;
  });
  const shift = num(st.shift, d.shift);
  const ideal = st.idealExact ?? num(st.ideal, d.ideal);
  const total = num(st.total, d.total);
  const rejects = num(st.rejects, d.rejects) ?? 0;
  if (bad || shift === null || ideal === null || total === null) return { saved: null, bad };
  return {
    saved: {
      v: 3,
      shift,
      shiftUnit: st.shiftUnit,
      planned,
      categories: st.cats.map((c) => c.name.trim()),
      stops,
      measure: st.measure,
      measureUnit: st.measureUnit,
      ideal,
      total,
      rejects,
      unitName: st.unitName.trim(),
      off: offToPositions(st.off, plannedRows, st.cats),
      pareto: { by: st.paretoBy, losses: st.paretoLosses },
      ...(st.recipe ? { recipe: st.recipe } : {}),
      ...(st.machines.length ? { machines: st.machines } : {}),
      ...(st.changeovers.length ? { changeovers: st.changeovers } : {}),
    },
    bad: null,
  };
}

// Colores de la torta (y del Pareto), comunes a todos los temas. Fijos: útil azul,
// velocidad verde y calidad ámbar. Cada parada planificada y cada categoría lleva el
// suyo, en este orden (comprobado con el validador de paletas: los vecinos se distinguen,
// también con daltonismo). La parte estándar de una categoría va en su mismo color,
// más claro. Desde la sexta, el color se repite con puntos. Cada porción lleva además
// su nombre en la lista: nada depende solo del color.
const POOL = ['var(--series-2)', 'var(--series-7)', 'var(--series-5)', 'var(--series-6)', 'var(--series-8)'];
interface Paint {
  color: string;
  /** Parte estándar: el color de su categoría, más claro. */
  tint: boolean;
  /** Color repetido: lleva puntos. */
  dots: boolean;
}
const FIXED: Partial<Record<OeeSliceKind, string>> = { useful: 'var(--series-1)', speed: 'var(--series-3)', quality: 'var(--series-4)' };

/** Color de cada porción por su clave; las categorías también por «cat3». */
function paints(r: OeeResult): Map<string, Paint> {
  const m = new Map<string, Paint>();
  let j = 0;
  const next = () => {
    const p = { color: POOL[j % POOL.length]!, tint: false, dots: j >= POOL.length };
    j++;
    return p;
  };
  for (const x of r.slices) {
    const fixed = FIXED[x.kind];
    if (fixed) m.set(x.key, { color: fixed, tint: false, dots: false });
    else if (x.kind === 'planned') m.set(x.key, next());
    else {
      const base = m.get(`cat${x.index}`) ?? next();
      m.set(`cat${x.index}`, base);
      m.set(x.key, { ...base, tint: x.kind === 'standard' });
    }
  }
  return m;
}

/** El color de relleno de una pintura (la parte estándar, mezclada con el fondo). */
const fillOf = (p: Paint) => (p.tint ? `color-mix(in srgb, ${p.color} 50%, var(--surface))` : p.color);
/** Fondo CSS de una pintura: color, y puntos si se repite. */
const backgroundOf = (p: Paint) =>
  p.dots ? `radial-gradient(var(--surface) 1.3px, transparent 1.7px) 0 0 / 5px 5px, ${fillOf(p)}` : fillOf(p);

/** Clave de la torta con ids de pantalla («c1» → «c:5»). */
function screenKey(key: string, st: State): string {
  return offToIds([key], st.planned.filter((p) => parseDecimal(p.value) !== null), st.cats)[0] ?? key;
}

/** Torta con hueco: una porción por clave, las desmarcadas en gris rayado. */
function Donut({ slices, children }: { slices: { key: string; minutes: number; paint: Paint; off: boolean }[]; children: ReactNode }) {
  const hatch = useId();
  const dots = useId();
  const total = slices.reduce((a, x) => a + x.minutes, 0);
  const R = 96;
  const r = 62;
  const point = (rad: number, a: number) => `${(100 + rad * Math.sin(a)).toFixed(3)} ${(100 - rad * Math.cos(a)).toFixed(3)}`;
  let acc = 0;
  const paths = slices.map((x) => {
    const a0 = (acc / total) * 2 * Math.PI;
    acc += x.minutes;
    // Una porción que es toda la torta se parte en dos para que el arco se pueda dibujar.
    const a1 = Math.min((acc / total) * 2 * Math.PI, a0 + 2 * Math.PI - 1e-4);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = `M ${point(R, a0)} A ${R} ${R} 0 ${large} 1 ${point(R, a1)} L ${point(r, a1)} A ${r} ${r} 0 ${large} 0 ${point(r, a0)} Z`;
    return { ...x, d };
  });
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[260px]">
      <svg viewBox="0 0 200 200" aria-hidden className="block size-full">
        <defs>
          <pattern id={hatch} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" fill="var(--surface-2)" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="var(--line)" strokeWidth="3" />
          </pattern>
          {paths
            .filter((x) => x.paint.dots && !x.off)
            .map((x) => (
              <pattern key={x.key} id={`${dots}${x.key}`} width="5" height="5" patternUnits="userSpaceOnUse">
                <rect width="5" height="5" style={{ fill: fillOf(x.paint) }} />
                <circle cx="2.5" cy="2.5" r="1.2" fill="var(--surface)" />
              </pattern>
            ))}
        </defs>
        {paths.map((x) => (
          <path
            key={x.key}
            d={x.d}
            style={{ fill: x.off ? `url("#${hatch}")` : x.paint.dots ? `url("#${dots}${x.key}")` : fillOf(x.paint) }}
            stroke="var(--surface)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/** Motivo o comentario de una parada (opcional, hasta 200 caracteres). */
function NoteInput({ value, label, placeholder, onChange }: { value: string; label: string; placeholder: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <textarea
        rows={1}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        maxLength={200}
        onChange={(e) => onChange(e.target.value.replace(/\s*\n\s*/g, ' '))}
        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        className="field-sizing-content min-h-12 w-full resize-none rounded-[12px] border-[1.5px] border-line bg-surface px-3 py-2.5 text-[16px] leading-snug outline-none placeholder:text-muted focus:border-accent"
      />
    </label>
  );
}

export default function OeeTool() {
  const { t, lang } = useI18n();
  const d = t.tools.oee;
  const toast = useToast();
  const savedInput = useSavedInput<unknown>();
  const [state, setState] = useState<State>(() => {
    const s = savedInput ? readOeeSaved(savedInput, t) : null;
    return s ? fromSaved(s, lang) : emptyState(t);
  });
  // Bloques abiertos: «planned», «stops», «production», «cats» y cada parada por su id («st12»).
  const [open, setOpen] = useState<Set<string>>(() => new Set(savedInput && readOeeSaved(savedInput, t) ? [] : ['planned', 'production']));
  const toggle = (k: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const [examplesOpen, setExamplesOpen] = useState(false);
  const closeExamples = useCallback(() => setExamplesOpen(false), []);
  const set = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch }));

  // Una medición nueva empieza con las categorías de la última medición de OEE del último proyecto usado.
  const touched = useRef(false);
  useEffect(() => {
    if (savedInput) return;
    let alive = true;
    void (async () => {
      const { projectId } = await lastUsed();
      if (!projectId) return;
      const last = (await listMeasurements(projectId)).find((a) => a.toolId === 'oee');
      const cats = last ? readOeeSaved(latest(last).input, t)?.categories : undefined;
      if (!alive || !cats?.length || touched.current) return;
      setState((s) => (s.stops.length ? s : { ...s, cats: cats.map((name) => ({ id: nextId(), name })), off: s.off.filter((k) => !/^[cs]:/.test(k)) }));
    })();
    return () => {
      alive = false;
    };
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const change = (fn: (s: State) => State) => {
    touched.current = true;
    setState(fn);
  };

  const { saved, bad } = toSaved(state, t);
  const input = saved ? toOeeInput(saved) : null;
  const out = input ? oee(input) : null;
  const r = out?.result ?? null;
  const look = oeeLook(saved ?? state, t);
  const f = oeeFormat(lang, look);
  const warnings = saved && out ? oeeWarnings(out.warnings, saved, t) : [];
  const anyText = state.shift.trim() !== '' || state.ideal.trim() !== '' || state.total.trim() !== '' || state.planned.length > 0 || state.stops.length > 0;
  const catName = (id: number) => {
    const i = state.cats.findIndex((c) => c.id === id);
    return state.cats[i]?.name.trim() || d.categoryName(i + 1);
  };
  const removeWithUndo = (name: string, fn: (s: State) => State) => {
    const previous = state;
    change(fn);
    toast(d.removed(name), { action: { label: t.common.undo, onAction: () => setState(previous) } });
  };

  // ── Paradas planificadas ──
  const updatePlan = (id: number, patch: Partial<PlanRow>) => setState((s) => ({ ...s, planned: s.planned.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const addPlan = () => setState((s) => ({ ...s, planned: [...s.planned, { id: nextId(), name: '', value: '', unit: 'min', note: '' }] }));

  // ── Paradas no planificadas ──
  const updateStop = (id: number, patch: Partial<StopRow>) => change((s) => ({ ...s, stops: s.stops.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const addStop = () => {
    const id = nextId();
    change((s) => ({ ...s, stops: [...s.stops, { id, name: '', minutes: '', cat: s.cats[0]?.id ?? 0, standard: '', note: '', machine: '' }] }));
    setOpen((o) => new Set([...o, `st${id}`]));
  };

  // ── Categorías ──
  const updateCat = (id: number, name: string) => change((s) => ({ ...s, cats: s.cats.map((c) => (c.id === id ? { ...c, name } : c)) }));
  const addCat = () => change((s) => ({ ...s, cats: [...s.cats, { id: nextId(), name: '' }] }));

  const clear = () => {
    const previous = state;
    setState(emptyState(t, state));
    setOpen(new Set(['planned', 'production']));
    toast(t.common.cleared, { action: { label: t.common.undo, onAction: () => setState(previous) } });
  };
  // ── Recetas ──
  const loadRecipe = (rec: Recipe) => {
    const previous = state;
    const speed = lineSpeedOf(rec);
    const slowest = lineSpeedOf({ stations: rec.stations, lineSpeed: null });
    change((s) => ({
      ...s,
      unitName: rec.unitName || s.unitName,
      ...(speed ? { measure: speed.measure, measureUnit: speed.unit, ideal: toFieldText(speed.value, lang), idealExact: speed.value } : {}),
      recipe: { plant: rec.plant, line: rec.line, name: rec.name },
      machines: rec.stations.map((x) => x.name.trim()).filter(Boolean),
      changeovers: rec.changeovers,
      slowest,
    }));
    if (rec.changeovers.length) setOpen((o) => new Set([...o, 'stops']));
    toast(t.recipes.loadedToast(recipeLabel(rec)), { action: { label: t.common.undo, onAction: () => setState(previous) } });
  };
  const recipeContent = (): Partial<RecipeContent> | string => {
    const value = state.idealExact ?? parseDecimal(state.ideal);
    if (value === null || !(value > 0)) return t.recipes.needSpeed;
    const sl = state.slowest;
    // Si sigue siendo la de la estación más lenta, la receta no guarda una escrita: se recalcula con sus estaciones.
    const same = sl && sl.measure === state.measure && sl.unit === state.measureUnit && Math.abs(sl.value - value) <= 1e-9 * Math.max(1, Math.abs(value));
    const changeovers = new Map(state.changeovers.map((c) => [c.name.trim().toLocaleLowerCase(), c]));
    state.stops.forEach((x, i) => {
      const std = parseDecimal(x.standard);
      if (std !== null && std > 0) {
        const name = x.name.trim() || d.stopName(i + 1);
        changeovers.set(name.toLocaleLowerCase(), { name, minutes: std });
      }
    });
    return {
      unitName: state.unitName.trim(),
      lineSpeed: same ? null : { value, measure: state.measure, unit: state.measureUnit },
      changeovers: [...changeovers.values()],
    };
  };
  const addChangeover = (c: { name: string; minutes: number }) => {
    const id = nextId();
    // A la categoría de los cambios (la segunda de las de siempre), si sigue existiendo.
    const changeCat = state.cats.find((x) => x.name.trim().toLocaleLowerCase() === d.defaultCategories[1]!.toLocaleLowerCase()) ?? state.cats[0];
    change((s) => ({
      ...s,
      stops: [...s.stops, { id, name: c.name, minutes: '', cat: changeCat?.id ?? 0, standard: toFieldText(c.minutes, lang), note: '', machine: '' }],
    }));
    setOpen((o) => new Set([...o, 'stops', `st${id}`]));
  };
  // Máquinas para elegir: las de la receta y las ya escritas en esta medición.
  const machineOptions = [...new Set([...state.machines, ...state.stops.map((x) => x.machine.trim()).filter(Boolean)])];
  const machineList = useId();

  const loadExample = (which: 'vorne' | 'bottling') => {
    touched.current = true;
    setState(fromSaved(which === 'vorne' ? VORNE(t) : BOTTLING(t), lang));
    setOpen(new Set());
    setExamplesOpen(false);
  };

  // Resta del tiempo planificado, en minutos: «480 − 10 = 470 min».
  const subtraction = (() => {
    const shift = parseDecimal(state.shift);
    if (shift === null) return null;
    const toMin = (v: number, u: TimeUnit) => (v * { s: 1, min: 60, h: 3600 }[u]) / 60;
    const parts = [toMin(shift, state.shiftUnit)];
    for (const p of state.planned) {
      const v = parseDecimal(p.value);
      if (v !== null) parts.push(toMin(v, p.unit));
    }
    const left = parts.slice(1).reduce((a, b) => a - b, parts[0]!);
    const one = (x: number) => formatNumber(x, lang, 1);
    return parts.length > 1 ? `${parts.map(one).join(' − ')} = ${one(left)} min` : `${one(left)} min`;
  })();

  const plannedBad = isBad(state.shift) || state.planned.some((p) => isBad(p.value));
  const stopBad = (x: StopRow) => isBad(x.minutes) || isBad(x.standard);
  const stopsBad = state.stops.some(stopBad);
  const productionBad = isBad(state.ideal) || isBad(state.total) || isBad(state.rejects);
  const stopsMinutes = state.stops.reduce((a, x) => a + (parseDecimal(x.minutes) ?? 0), 0);
  const idealParsed = parseDecimal(state.ideal);
  const totalParsed = parseDecimal(state.total);
  const usedCats = new Set(state.stops.map((x) => x.cat));

  const data = (
    <>
      <RecipeBar
        current={state.recipe}
        onLoad={loadRecipe}
        build={recipeContent}
        saveHint={t.recipes.saveHintOee}
        onSaved={(n) => set({ recipe: { plant: n.plant, line: n.line, name: n.name } })}
      />
      <datalist id={machineList}>
        {machineOptions.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <div className="flex flex-col border-b border-line">
        <Group
          title={d.groups.planned!}
          summary={plannedBad ? d.groupBad : subtraction ? d.plannedSummary(subtraction) : d.groupEmpty.planned!}
          bad={plannedBad}
          open={open.has('planned')}
          onToggle={() => toggle('planned')}
        >
          <TimeField label={d.shift} value={state.shift} unit={state.shiftUnit} onValue={(v) => set({ shift: v })} onUnit={(u) => set({ shiftUnit: u })} />
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">{d.plannedStops}</span>
            <Hint>{d.plannedHint}</Hint>
          </div>
          {state.planned.length > 0 && (
            <ol className="flex flex-col gap-2">
              {state.planned.map((row, i) => {
                const name = row.name.trim() || d.plannedName(i + 1);
                return (
                  <li key={row.id} className="flex flex-col gap-2 rounded-[16px] bg-surface-2 p-2.5">
                    <div className="flex items-start gap-2">
                      <NameInput value={row.name} placeholder={d.plannedName(i + 1)} label={d.plannedNameLabel(i + 1)} onChange={(v) => updatePlan(row.id, { name: v })} />
                      <IconButton icon={Trash2} label={d.removeItem(name)} onClick={() => removeWithUndo(name, (s) => ({ ...s, planned: s.planned.filter((x) => x.id !== row.id) }))} />
                    </div>
                    <div className="flex gap-2">
                      <MeasureBox className="flex-1" label={d.timeOf(name)} value={row.value} onChange={(v) => updatePlan(row.id, { value: v })} />
                      <UnitSelect value={row.unit} onChange={(u) => updatePlan(row.id, { unit: u })} label={t.common.unitOf(d.timeOf(name))} />
                    </div>
                    <NoteInput value={row.note} label={d.note} placeholder={d.notePlaceholder} onChange={(v) => updatePlan(row.id, { note: v })} />
                  </li>
                );
              })}
            </ol>
          )}
          {state.planned.length < MAX_ROWS && (
            <Button icon={Plus} className="self-start" onClick={addPlan}>
              {d.addPlanned}
            </Button>
          )}
          {subtraction && (
            <p className="rounded-[14px] bg-soft p-3 text-[15px] leading-relaxed font-semibold tabular-nums wrap-anywhere">
              <span className="block text-[13px] font-semibold text-muted">{d.groups.planned}</span>
              {subtraction}
            </p>
          )}
        </Group>

        <Group
          title={d.groups.stops!}
          summary={stopsBad ? d.groupBad : state.stops.length ? d.stopsCount(state.stops.length, f.min(stopsMinutes)) : d.groupEmpty.stops!}
          bad={stopsBad}
          open={open.has('stops')}
          onToggle={() => toggle('stops')}
        >
          <Hint>{d.stopsHint}</Hint>
          {state.stops.length > 0 && (
            <ol className="flex flex-col gap-2">
              {state.stops.map((row, i) => {
                const name = row.name.trim() || d.stopName(i + 1);
                const minutes = parseDecimal(row.minutes);
                const standard = parseDecimal(row.standard);
                const rowBad = stopBad(row);
                const summary = rowBad
                  ? d.groupBad
                  : [
                      minutes !== null ? f.min(minutes) : null,
                      catName(row.cat),
                      row.machine.trim() || null,
                      minutes !== null && standard !== null && standard > 0 ? d.standardPart(f.min(Math.min(standard, minutes)), f.min(Math.max(0, minutes - standard))) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ');
                return (
                  <Fold key={row.id} name={name} summary={summary} bad={rowBad} open={open.has(`st${row.id}`)} onToggle={() => toggle(`st${row.id}`)}>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-semibold text-muted">{d.nameField}</span>
                      <div className="flex items-start gap-2">
                        <NameInput value={row.name} placeholder={d.stopName(i + 1)} label={d.nameLabel(d.stopName(i + 1))} onChange={(v) => updateStop(row.id, { name: v })} />
                        <IconButton icon={Trash2} label={d.removeItem(name)} onClick={() => removeWithUndo(name, (s) => ({ ...s, stops: s.stops.filter((x) => x.id !== row.id) }))} />
                      </div>
                    </div>
                    <NumberField compact label={d.stopMinutes} unit="min" value={row.minutes} invalidText={d.invalidNumber} onChange={(v) => updateStop(row.id, { minutes: v })} />
                    <CategorySelect label={d.category} aria={d.categoryOf(name)} value={row.cat} cats={state.cats} nameOf={catName} onChange={(cat) => updateStop(row.id, { cat })} />
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-semibold text-muted">{d.machine}</span>
                      <input
                        type="text"
                        value={row.machine}
                        list={machineList}
                        placeholder={d.machinePlaceholder}
                        aria-label={d.machineOf(name)}
                        autoComplete="off"
                        maxLength={40}
                        onChange={(e) => updateStop(row.id, { machine: e.target.value })}
                        className="h-12 w-full rounded-[15px] border-[1.5px] border-line bg-surface px-4 text-[16px] outline-none placeholder:text-muted focus:border-accent"
                      />
                      <Hint>{d.machineHint}</Hint>
                    </label>
                    <div className="flex flex-col gap-1.5">
                      <NumberField compact label={d.standard} unit="min" value={row.standard} invalidText={d.invalidNumber} onChange={(v) => updateStop(row.id, { standard: v })} />
                      <Hint>{d.standardHint}</Hint>
                    </div>
                    <NoteInput value={row.note} label={d.note} placeholder={d.notePlaceholder} onChange={(v) => updateStop(row.id, { note: v })} />
                    {minutes !== null && standard !== null && standard > 0 && minutes > standard && !row.note.trim() && (
                      <p className="flex items-start gap-2.5 rounded-[14px] bg-warn-soft p-3 text-[14.5px]">
                        <CircleAlert aria-hidden size={18} className="mt-0.5 shrink-0 text-warn" />
                        <span>{d.excessAsk(f.min(minutes - standard))}</span>
                      </p>
                    )}
                  </Fold>
                );
              })}
            </ol>
          )}
          {state.stops.length < MAX_ROWS && (
            <Button icon={Plus} className="self-start" onClick={addStop}>
              {d.addStop}
            </Button>
          )}
          {state.changeovers.length > 0 && state.stops.length < MAX_ROWS && (
            <div className="flex flex-col gap-2">
              <Hint>{d.changeoversHint}</Hint>
              {state.changeovers.map((c) => (
                <Button key={c.name} icon={Plus} className="self-start text-left" onClick={() => addChangeover(c)}>
                  {d.addChangeover(c.name, f.min(c.minutes))}
                </Button>
              ))}
            </div>
          )}
          <ul className="flex flex-col">
            <Fold name={d.categories} summary={d.categoriesCount(state.cats.length)} bad={false} open={open.has('cats')} onToggle={() => toggle('cats')}>
              <Hint>{d.categoriesHint}</Hint>
              <ol className="flex flex-col gap-2">
                {state.cats.map((c, i) => {
                  const inUse = usedCats.has(c.id);
                  const name = c.name.trim() || d.categoryName(i + 1);
                  return (
                    <li key={c.id} className="flex items-start gap-2">
                      <NameInput value={c.name} placeholder={d.categoryName(i + 1)} label={d.categoryNameLabel(i + 1)} onChange={(v) => updateCat(c.id, v)} />
                      <IconButton
                        icon={Trash2}
                        label={d.removeItem(name)}
                        disabled={inUse || state.cats.length <= 1}
                        onClick={() => removeWithUndo(name, (s) => ({ ...s, cats: s.cats.filter((x) => x.id !== c.id), off: s.off.filter((k) => k !== `c:${c.id}` && k !== `s:${c.id}`) }))}
                      />
                    </li>
                  );
                })}
              </ol>
              {usedCats.size > 0 && <Hint>{d.categoryInUse}</Hint>}
              {state.cats.length < MAX_ROWS && (
                <Button icon={Plus} className="self-start" onClick={addCat}>
                  {d.addCategory}
                </Button>
              )}
            </Fold>
          </ul>
        </Group>

        <Group
          title={d.groups.production!}
          summary={
            productionBad
              ? d.groupBad
              : idealParsed !== null && idealParsed > 0 && totalParsed !== null && input
                ? d.productionSummary(f.ideal(input.idealCycle), f.count(totalParsed), f.count(parseDecimal(state.rejects) ?? 0))
                : d.groupEmpty.production!
          }
          bad={productionBad}
          open={open.has('production')}
          onToggle={() => toggle('production')}
        >
          <div className="flex flex-col gap-1.5">
            <PaceField
              label={d.ideal}
              unitLabel={d.idealUnitOf}
              value={state.ideal}
              pace={{ measure: state.measure, unit: state.measureUnit }}
              item={look.unitName}
              onValue={(v) => set({ ideal: v, idealExact: undefined })}
              onPace={(p) => {
                // Cambiar la unidad convierte el número: 48.000 botellas/h pasan a 800 botellas/min, no se reinterpretan.
                const n = convertText({ text: state.ideal, exact: state.idealExact }, { measure: state.measure, unit: state.measureUnit }, p, lang);
                set({ measure: p.measure, measureUnit: p.unit, ideal: n.text, idealExact: n.exact });
              }}
            />
            <Hint>{d.idealHint}</Hint>
          </div>
          <div className="flex flex-col gap-1.5">
            <NumberField compact label={d.total} value={state.total} invalidText={d.invalidNumber} onChange={(v) => set({ total: v })} />
            <Hint>{d.totalHint}</Hint>
          </div>
          <div className="flex flex-col gap-1.5">
            <NumberField compact label={d.rejects} value={state.rejects} invalidText={d.invalidNumber} onChange={(v) => set({ rejects: v })} />
            <Hint>{d.rejectsHint}</Hint>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-muted">{d.unitName}</span>
              <input
                type="text"
                value={state.unitName}
                placeholder={d.defaultUnit}
                autoComplete="off"
                maxLength={30}
                onChange={(e) => set({ unitName: e.target.value })}
                className="h-12 rounded-[15px] border-[1.5px] border-line bg-surface px-4 text-[16px] outline-none placeholder:text-muted focus:border-accent"
              />
            </label>
            <Hint>{d.unitNameHint}</Hint>
          </div>
        </Group>
      </div>

      {anyText && (
        <Button variant="ghost" icon={Eraser} className="self-start" onClick={clear}>
          {t.common.clear}
        </Button>
      )}
      <Sheet open={examplesOpen} onClose={closeExamples} title={d.examples.title}>
        <div className="flex flex-col gap-2.5">
          <ExampleOption icon={Gauge} title={d.examples.vorne} hint={d.examples.vorneHint} onPick={() => loadExample('vorne')} />
          <ExampleOption icon={Factory} title={d.examples.bottling} hint={d.examples.bottlingHint} onPick={() => loadExample('bottling')} />
        </div>
      </Sheet>
    </>
  );

  let result: ReactNode;
  if (!r || !saved || !input) {
    const problems = bad ? [t.tools.takt.incomplete(bad)] : warnings;
    result = problems.length ? (
      <div className="flex flex-col gap-2">
        {problems.map((w) => (
          <p key={w} className="flex items-start gap-2.5 rounded-[14px] bg-bad-soft p-3 text-[14.5px]">
            <CircleAlert aria-hidden size={18} className="mt-0.5 shrink-0 text-bad" />
            <span>{w}</span>
          </p>
        ))}
      </div>
    ) : (
      <p className="text-[15px] text-muted">{d.empty}</p>
    );
  } else {
    const ex = oeeExplain(saved, input.idealCycle, r, t, lang);
    const explainOf: Partial<Record<OeeSliceKind, Derivation>> = { useful: ex.useful, speed: ex.speed, quality: ex.qualityLoss };
    const furthest = furthestFactor(r);
    const u = utilization(r, saved.off);
    const uLabel = utilizationLabel(saved, r, t);
    // La torta, en un orden fijo (el color sigue a cada parada, no a su tamaño): útil, planificadas,
    // cada categoría con su estándar al lado, velocidad y calidad. El tamaño lo ordena el Pareto.
    const slices = r.slices;
    const paint = paints(r);
    const isOff = (key: string) => saved.off.includes(key);
    const toggleSlice = (key: string) => {
      const k = screenKey(key, state);
      change((s) => ({ ...s, off: s.off.includes(k) ? s.off.filter((x) => x !== k) : [...s.off, k] }));
    };
    const sliceHints = (x: OeeResult['slices'][number]): string[] => {
      const notes = (list: { name: string; note: string }[]) => list.filter((y) => y.note.trim()).map((y) => `${y.name}: ${y.note.trim()}`);
      switch (x.kind) {
        case 'planned':
          return saved.planned[x.index]?.note.trim() ? [saved.planned[x.index]!.note.trim()] : [];
        case 'standard':
          return [d.slice.standardHint];
        case 'stops':
          return [
            ...(x.excess > 0 && x.excess < x.minutes - 1e-9 ? [d.slice.excessHint(f.min(x.excess))] : []),
            ...notes(saved.stops.flatMap((y, k) => (y.category === x.index ? [{ name: stopName(saved, k, t), note: y.note }] : []))),
          ];
        default:
          return [];
      }
    };
    // Pareto: por categoría o por parada; con la casilla, también la pérdida por velocidad y la de calidad.
    type Item = { key: string; name: string; minutes: number; color: string };
    const byMachine = saved.pareto.by === 'machine';
    const machines = byMachine ? machineMinutes(saved.stops) : [];
    const items: Item[] =
      saved.pareto.by === 'category'
        ? r.byCategory.map((m, c) => ({ key: `c${c}`, name: categoryName(saved, c, t), minutes: m, color: backgroundOf(paint.get(`cat${c}`) ?? { color: POOL[0]!, tint: false, dots: false }) }))
        : byMachine
          ? machines.map((x, k) => ({
              key: `m${k}`,
              name: x.name || d.noMachine,
              minutes: x.minutes,
              // Cada máquina con su color, en el orden en que aparecen; sin indicar, en gris.
              color: x.name ? backgroundOf({ color: POOL[k % POOL.length]!, tint: false, dots: k >= POOL.length }) : 'var(--faint)',
            }))
          : saved.stops.map((x, k) => ({
              key: `s${k}`,
              name: stopName(saved, k, t),
              minutes: x.minutes,
              color: backgroundOf(paint.get(`cat${x.category}`) ?? { color: POOL[0]!, tint: false, dots: false }),
            }));
    if (saved.pareto.losses)
      items.push(
        { key: 'speed', name: byMachine ? d.lineWide(d.losses.speed!) : d.losses.speed!, minutes: Math.max(0, r.minutes.speed), color: FIXED.speed! },
        { key: 'quality', name: byMachine ? d.lineWide(d.losses.quality!) : d.losses.quality!, minutes: r.minutes.quality, color: FIXED.quality! },
      );
    const byKey = new Map(items.map((x) => [x.key, x]));
    const rows = pareto(items.map((x) => ({ key: x.key, minutes: x.minutes })));
    const maxMinutes = rows[0]?.minutes ?? 1;
    const cut = rows.findIndex((x) => x.cumulative >= 0.8 - 1e-9);
    const factorRef = (k: keyof typeof WORLD_CLASS) => `${formatNumber(WORLD_CLASS[k] * 100, lang, 0)}\u00a0%`;

    result = (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Explained calc={ex.oee} className="flex flex-col items-start gap-1 self-start rounded-[14px]">
            <span className="text-[13px] font-semibold text-muted">
              <Dotted>OEE</Dotted>
            </span>
            <span className="font-display text-[56px] leading-[0.95] font-bold tracking-[-0.035em] tabular-nums">{f.pct(r.oee)}</span>
          </Explained>
          <span className="text-[13px] text-muted">{d.official}</span>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
          {(['availability', 'performance', 'quality'] as const).map((k) => (
            <Explained key={k} calc={ex[k]} className="flex w-full min-w-0 flex-col gap-0.5 rounded-[14px] bg-surface-2 p-3">
              <span className="text-[13px] font-semibold text-muted">
                <Dotted>{d[k]}</Dotted>
              </span>
              <span className="font-display text-[19px] font-bold tabular-nums wrap-anywhere">{f.pct(r[k])}</span>
              <span className="flex flex-wrap items-center gap-y-1 text-[12.5px] text-muted">
                {d.refOf(factorRef(k))}
                {k === furthest && <Tag>{d.furthestTag}</Tag>}
              </span>
            </Explained>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <SubTitle>{d.pieTitle}</SubTitle>
          <Hint>{d.pieHint}</Hint>
          <Donut slices={slices.map((x) => ({ key: x.key, minutes: x.minutes, paint: paint.get(x.key)!, off: isOff(x.key) }))}>
            <Explained calc={ex.utilization} className="flex size-[58%] flex-col items-center justify-center gap-0.5 rounded-full text-center">
              <span className="sr-only">{uLabel} </span>
              <span className="font-display text-[clamp(22px,8vw,32px)] leading-none font-bold tracking-tight tabular-nums">{f.pct(u.value)}</span>
              <span aria-hidden className="px-1 text-[12px] leading-tight font-semibold text-muted">
                <Dotted>{d.utilization}</Dotted>
              </span>
            </Explained>
          </Donut>
          <p className="text-center text-[14.5px] leading-snug font-semibold text-balance wrap-break-word">
            {uLabel}
            {isOfficial(saved, r) && <span className="block text-[13px] font-normal text-muted">{d.pieIsOfficial}</span>}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => change((s) => ({ ...s, off: [] }))} disabled={saved.off.length === 0}>
              {d.pieAll}
            </Button>
            <Button
              onClick={() => change((s) => ({ ...s, off: plannedKeys(r).map((k) => screenKey(k, s)) }))}
              disabled={isOfficial(saved, r) && plannedKeys(r).length > 0}
            >
              {d.pieOfficial}
            </Button>
          </div>
          <ul className="flex flex-col">
            {slices.map((x) => {
              const off = isOff(x.key);
              const name = sliceName(saved, x.key, r, t);
              const hints = sliceHints(x);
              const label = (
                <span className="flex min-w-0 flex-col">
                  <span className={`text-[15px] leading-snug font-semibold wrap-break-word ${off ? 'text-muted' : ''}`}>{name}</span>
                  <span className="text-[13px] text-muted tabular-nums">
                    {d.pieShare(f.share(x.minutes / r.shift))}
                    {off ? ` · ${d.pieOff}` : ''}
                  </span>
                  {hints.map((h) => (
                    <span key={h} className="text-[13px] leading-snug text-muted wrap-break-word">
                      {h}
                    </span>
                  ))}
                </span>
              );
              const swatch = (
                <span
                  aria-hidden
                  className="mt-1 size-3.5 shrink-0 rounded-full border border-line"
                  style={{ background: off ? 'repeating-linear-gradient(45deg, var(--line) 0 2px, var(--surface-2) 2px 5px)' : backgroundOf(paint.get(x.key)!) }}
                />
              );
              const minutes = <span className={`font-semibold tabular-nums ${off ? 'text-muted line-through' : ''}`}>{f.min(x.minutes)}</span>;
              return (
                <li key={x.key} className="flex items-start gap-2 border-b border-line py-1 last:border-b-0">
                  {x.kind === 'useful' ? (
                    <div className="flex min-h-12 min-w-0 flex-1 items-start gap-3 py-2 pl-[34px]">
                      {swatch}
                      {label}
                    </div>
                  ) : (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={!off}
                      onClick={() => toggleSlice(x.key)}
                      className="press flex min-h-12 min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-[12px] py-2 text-left"
                    >
                      <span
                        aria-hidden
                        className={`grid size-[22px] shrink-0 place-items-center rounded-[6px] border-2 ${off ? 'border-line bg-surface' : 'border-accent bg-accent text-surface'}`}
                      >
                        {!off && <CheckMark size={15} strokeWidth={3} />}
                      </span>
                      {swatch}
                      {label}
                    </button>
                  )}
                  {explainOf[x.kind] ? (
                    <Explained calc={explainOf[x.kind]!} className="flex min-h-12 shrink-0 items-start rounded-[10px] py-2 pl-1">
                      <Dotted>{minutes}</Dotted>
                    </Explained>
                  ) : (
                    <span className="flex min-h-12 shrink-0 items-start py-2 pl-1">{minutes}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {rows.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <SubTitle>{d.paretoTitle}</SubTitle>
            <Segmented
              label={d.paretoBy}
              value={state.paretoBy}
              options={(['category', 'stop', 'machine'] as const).map((b) => ({ value: b, label: d.paretoBys[b]! }))}
              onChange={(b) => set({ paretoBy: b })}
            />
            <Check label={d.paretoLosses} checked={state.paretoLosses} onChange={(on) => set({ paretoLosses: on })} />
            <ol className="flex flex-col gap-3">
              {rows.map((row, k) => {
                const item = byKey.get(row.key)!;
                return (
                  <li key={row.key} className="flex flex-col gap-1.5">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <span className="min-w-0 text-[15px] font-semibold wrap-break-word">{item.name}</span>
                      <span className="shrink-0 font-display text-[16px] font-bold tabular-nums">{f.min(row.minutes)}</span>
                    </span>
                    <span aria-hidden className="block h-3 rounded-full bg-surface-2">
                      <span className="block h-full rounded-full" style={{ width: `${(row.minutes / maxMinutes) * 100}%`, background: item.color }} />
                    </span>
                    <span className="text-[13px] text-muted tabular-nums">{d.paretoRow(f.share(row.share), saved.pareto.losses)}</span>
                    {k === cut && k < rows.length - 1 && (
                      <span className="mt-1 flex items-center gap-2 text-[12.5px] font-semibold text-muted">
                        <span aria-hidden className="h-0 flex-1 border-t-2 border-dashed border-line" />
                        {d.pareto80}
                        <span aria-hidden className="h-0 flex-1 border-t-2 border-dashed border-line" />
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <p className="text-[13px] leading-relaxed text-muted">
          {d.reference} {d.referenceSource}
        </p>
      </div>
    );
  }

  const conclusion = r && saved ? oeeConclusion(r, saved, t, lang) : '';
  const reading = r ? { conclusion, warnings, typicalError: d.typicalError } : null;
  const sheet = () =>
    saved && r
      ? oeeSheet(saved, r, t, lang, {
          reading: oeeReadingLines(conclusion, warnings, t),
          version: APP_VERSION,
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB'),
        })
      : null;
  const save = (): SavePayload | null => (saved && r ? { input: saved, headline: { key: 'oee', value: r.oee, kind: 'percent', decimals: 1 } } : null);

  const formula = (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1 font-semibold">
        {d.formula.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      {out && out.steps.length > 0 && (
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 tabular-nums">
          {out.steps.map((s) => (
            <div key={s.key} className="contents">
              <dt className="text-muted">{d.steps[s.key as keyof typeof d.steps]}</dt>
              <dd className="text-right font-semibold">{s.key === 'planned' || s.key === 'run' ? f.min(s.value) : f.pct(s.value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );

  return (
    <ToolTemplate
      name={d.name}
      subtitle={d.summary}
      guide={d.guide}
      data={data}
      hasData={r !== null}
      onLoadExample={() => setExamplesOpen(true)}
      result={result}
      reading={reading}
      formula={formula}
      sheet={sheet}
      toolId="oee"
      save={save}
    />
  );
}

/** Desplegable de categoría de una parada. */
function CategorySelect({ label, aria, value, cats, nameOf, onChange }: { label: string; aria: string; value: number; cats: CatRow[]; nameOf: (id: number) => string; onChange: (id: number) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-muted">
        {label}
      </label>
      <select
        id={id}
        aria-label={aria}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-12 w-full rounded-[15px] border-[1.5px] border-line bg-surface px-3 text-[16px] font-semibold text-text outline-none focus:border-accent"
      >
        {cats.map((c) => (
          <option key={c.id} value={c.id}>
            {nameOf(c.id)}
          </option>
        ))}
      </select>
    </div>
  );
}
