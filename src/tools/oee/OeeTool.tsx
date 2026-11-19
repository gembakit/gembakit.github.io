import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, Eraser, Factory, Gauge, Plus, Trash2 } from 'lucide-react';
import { useI18n, type Messages } from '../../i18n';
import { furthestFactor, oee, oeeView, pareto, WORLD_CLASS } from '../../calc/oee';
import { TIME_UNITS, type Measure, type TimeUnit } from '../../calc/takt';
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
import { ExampleOption, Fold, Group, Hint, isBad, MeasureBox, NameInput, Segmented, Stat, SubTitle, Tag, TimeField, UnitSelect } from '../form';
import { oeeExplain, oeeFormat, oeeLook } from './explain';
import { oeeSheet } from './sheet';
import { oeeConclusion, oeeReadingLines, oeeWarnings } from './reading';
import { BOTTLING, categoryName, readOeeSaved, stopName, toOeeInput, viewLabel, VORNE, type OeeSaved } from './model';

interface PlanRow {
  id: number;
  name: string;
  value: string;
  unit: TimeUnit;
}
interface StopRow {
  id: number;
  name: string;
  minutes: string;
  /** id de su categoría. */
  cat: number;
  standard: string;
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
  total: string;
  rejects: string;
  unitName: string;
  /** ids de las categorías marcadas en «Otras vistas». */
  excluded: number[];
  standard: boolean;
  paretoBy: 'category' | 'stop';
  paretoLosses: boolean;
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
    excluded: [],
    standard: false,
    paretoBy: 'category',
    paretoLosses: false,
  };
}

/** De lo guardado (o de un ejemplo) a los campos de la pantalla. */
function fromSaved(s: OeeSaved, lang: 'es' | 'en'): State {
  const txt = (v: number) => toFieldText(v, lang);
  const cats = s.categories.map((name) => ({ id: nextId(), name }));
  return {
    shift: txt(s.shift),
    shiftUnit: s.shiftUnit,
    planned: s.planned.map((p) => ({ id: nextId(), name: p.name, value: txt(p.value), unit: p.unit })),
    cats,
    stops: s.stops.map((x) => ({ id: nextId(), name: x.name, minutes: txt(x.minutes), cat: cats[x.category]!.id, standard: x.standard === null ? '' : txt(x.standard) })),
    measure: s.measure,
    measureUnit: s.measureUnit,
    ideal: txt(s.ideal),
    total: txt(s.total),
    rejects: txt(s.rejects),
    unitName: s.unitName,
    excluded: s.views.excluded.map((c) => cats[c]!.id),
    standard: s.views.standard,
    paretoBy: s.pareto.by,
    paretoLosses: s.pareto.losses,
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
  st.planned.forEach((p, i) => {
    const where = p.name.trim() || d.plannedName(i + 1);
    const v = num(p.value, where);
    if (v !== null) planned.push({ name: p.name.trim(), value: v, unit: p.unit });
    else if (p.name.trim() && p.value.trim() === '') bad ??= where;
  });
  const catIndex = new Map(st.cats.map((c, i) => [c.id, i]));
  const stops: OeeSaved['stops'] = [];
  st.stops.forEach((x, i) => {
    const where = x.name.trim() || d.stopName(i + 1);
    const minutes = num(x.minutes, where);
    const standard = num(x.standard, where);
    if (minutes !== null) stops.push({ name: x.name.trim(), minutes, category: catIndex.get(x.cat) ?? st.cats.length - 1, standard });
    else if (x.name.trim() || x.standard.trim()) bad ??= where;
  });
  const shift = num(st.shift, d.shift);
  const ideal = num(st.ideal, d.ideal[st.measure]!);
  const total = num(st.total, d.total);
  const rejects = num(st.rejects, d.rejects) ?? 0;
  if (bad || shift === null || ideal === null || total === null) return { saved: null, bad };
  return {
    saved: {
      v: 2,
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
      views: { excluded: st.excluded.flatMap((id) => (catIndex.has(id) ? [catIndex.get(id)!] : [])).sort((a, b) => a - b), standard: st.standard },
      pareto: { by: st.paretoBy, losses: st.paretoLosses },
    },
    bad: null,
  };
}

// Colores de gráfico, comunes a todos los temas y bien distintos entre sí (también con daltonismo).
const SEGMENTS = [
  { key: 'useful', color: 'bg-series-1' },
  { key: 'downtime', color: 'bg-series-2' },
  { key: 'speed', color: 'bg-series-3' },
  { key: 'quality', color: 'bg-series-4' },
] as const;

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
      setState((s) => (s.stops.length ? s : { ...s, cats: cats.map((name) => ({ id: nextId(), name })), excluded: [] }));
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
  const look = saved ? oeeLook(saved, t) : { measure: state.measure, measureUnit: state.measureUnit, unitName: state.unitName.trim() || d.defaultUnit };
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
  const addPlan = () => setState((s) => ({ ...s, planned: [...s.planned, { id: nextId(), name: '', value: '', unit: 'min' }] }));

  // ── Paradas no planificadas ──
  const updateStop = (id: number, patch: Partial<StopRow>) => change((s) => ({ ...s, stops: s.stops.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const addStop = () => {
    const id = nextId();
    change((s) => ({ ...s, stops: [...s.stops, { id, name: '', minutes: '', cat: s.cats[0]?.id ?? 0, standard: '' }] }));
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
  const enteredUnit = state.measure === 'time' ? state.measureUnit : `/${state.measureUnit}`;
  const usedCats = new Set(state.stops.map((x) => x.cat));

  const data = (
    <>
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
                    <div className="flex flex-col gap-1.5">
                      <NumberField compact label={d.standard} unit="min" value={row.standard} invalidText={d.invalidNumber} onChange={(v) => updateStop(row.id, { standard: v })} />
                      <Hint>{d.standardHint}</Hint>
                    </div>
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
                        onClick={() => removeWithUndo(name, (s) => ({ ...s, cats: s.cats.filter((x) => x.id !== c.id), excluded: s.excluded.filter((x) => x !== c.id) }))}
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
          <Segmented
            label={d.measureLabel}
            value={state.measure}
            options={(['time', 'rate'] as const).map((m) => ({ value: m, label: d.measures[m]! }))}
            onChange={(m) => set(state.ideal.trim() === '' ? { measure: m, measureUnit: m === 'time' ? 's' : 'h' } : { measure: m })}
          />
          <Segmented
            label={d.measureUnitLabel}
            value={state.measureUnit}
            options={TIME_UNITS.map((u) => ({ value: u, label: state.measure === 'time' ? u : `/${u}`, aria: state.measure === 'time' ? t.tools.takt.unitNames[u] : t.tools.takt.perUnitName(u) }))}
            onChange={(u) => set({ measureUnit: u })}
          />
          <div className="flex flex-col gap-1.5">
            <NumberField compact label={d.ideal[state.measure]!} unit={enteredUnit} value={state.ideal} invalidText={d.invalidNumber} onChange={(v) => set({ ideal: v })} />
            <Hint>{d.idealHint}</Hint>
          </div>
          <NumberField compact label={d.total} value={state.total} invalidText={d.invalidNumber} onChange={(v) => set({ total: v })} />
          <NumberField compact label={d.rejects} value={state.rejects} invalidText={d.invalidNumber} onChange={(v) => set({ rejects: v })} />
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
    const explainOf: Partial<Record<(typeof SEGMENTS)[number]['key'], Derivation>> = { useful: ex.useful, speed: ex.speed, quality: ex.qualityLoss };
    const furthest = furthestFactor(r);
    const label = viewLabel(saved, r.standardByCategory, t);
    const view = label ? oeeView(r, saved.views) : null;
    // Pareto: por categoría o por parada; las quitadas en «Otras vistas» siguen, en gris.
    const excludedIdx = new Set(saved.views.excluded);
    type Item = { key: string; name: string; minutes: number; color: string; excluded: boolean };
    const items: Item[] =
      saved.pareto.by === 'category'
        ? r.byCategory.map((m, c) => ({ key: `c${c}`, name: categoryName(saved, c, t), minutes: m, color: 'bg-series-2', excluded: excludedIdx.has(c) }))
        : saved.stops.map((x, k) => ({ key: `s${k}`, name: stopName(saved, k, t), minutes: x.minutes, color: 'bg-series-2', excluded: excludedIdx.has(x.category) }));
    if (saved.pareto.losses)
      items.push(
        { key: 'speed', name: d.losses.speed!, minutes: Math.max(0, r.minutes.speed), color: 'bg-series-3', excluded: false },
        { key: 'quality', name: d.losses.quality!, minutes: r.minutes.quality, color: 'bg-series-4', excluded: false },
      );
    const byKey = new Map(items.map((x) => [x.key, x]));
    const rows = pareto(items.map((x) => ({ key: x.key, minutes: x.minutes })));
    const maxMinutes = rows[0]?.minutes ?? 1;
    const cut = rows.findIndex((x) => x.cumulative >= 0.8 - 1e-9);
    const catsWithStops = r.byCategory.flatMap((m, c) => (m > 0 ? [c] : []));
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

        <div className="flex flex-col gap-2.5">
          <h3 className="text-[13px] font-semibold text-muted">{d.timeSplit}</h3>
          <span aria-hidden className="flex h-4 gap-0.5 overflow-hidden rounded-full">
            {SEGMENTS.filter((s) => r.minutes[s.key] > 0).map((s) => (
              <span key={s.key} className={`h-full min-w-1 ${s.color}`} style={{ flexGrow: r.minutes[s.key], flexBasis: 0 }} />
            ))}
          </span>
          <ul className="flex flex-col gap-1">
            {SEGMENTS.map((s) => {
              const body = (
                <>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span aria-hidden className={`size-3 shrink-0 rounded-full ${s.color}`} />
                    <span className="min-w-0 text-[14.5px]">{explainOf[s.key] ? <Dotted>{d.losses[s.key]}</Dotted> : d.losses[s.key]}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end leading-tight tabular-nums">
                    <span className="font-semibold">{f.min(r.minutes[s.key])}</span>
                    <span className="text-[13px] text-muted">{f.share(r.minutes[s.key] / r.planned)}</span>
                  </span>
                </>
              );
              const cls = 'flex w-full items-center justify-between gap-3 rounded-[10px] py-1.5';
              return (
                <li key={s.key}>
                  {explainOf[s.key] ? (
                    <Explained calc={explainOf[s.key]!} className={cls}>
                      {body}
                    </Explained>
                  ) : (
                    <div className={cls}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {catsWithStops.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <SubTitle>{d.viewsTitle}</SubTitle>
            <Hint>{d.viewsHint}</Hint>
            <div className="flex flex-col gap-1">
              {catsWithStops.map((c) => {
                const id = state.cats[c]!.id;
                return (
                  <Check
                    key={id}
                    label={categoryName(saved, c, t)}
                    hint={f.min(r.byCategory[c]!)}
                    checked={state.excluded.includes(id)}
                    onChange={(on) => set({ excluded: on ? [...state.excluded, id] : state.excluded.filter((x) => x !== id) })}
                  />
                );
              })}
              {r.standard > 0 && <Check label={d.standardToggle} hint={d.standardToggleHint(f.min(r.standard))} checked={state.standard} onChange={(on) => set({ standard: on })} />}
            </div>
            {label && view && ex.view && (
              <div className="rounded-[16px] bg-soft p-2">
                <Stat label={label} value={f.pct(view.oee)} calc={ex.view} />
              </div>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <SubTitle>{d.paretoTitle}</SubTitle>
            <Segmented
              label={d.paretoBy}
              value={state.paretoBy}
              options={(['category', 'stop'] as const).map((b) => ({ value: b, label: d.paretoBys[b]! }))}
              onChange={(b) => set({ paretoBy: b })}
            />
            <Check label={d.paretoLosses} checked={state.paretoLosses} onChange={(on) => set({ paretoLosses: on })} />
            <ol className="flex flex-col gap-3">
              {rows.map((row, k) => {
                const item = byKey.get(row.key)!;
                return (
                  <li key={row.key} className="flex flex-col gap-1.5">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <span className={`min-w-0 text-[15px] font-semibold wrap-break-word ${item.excluded ? 'text-muted' : ''}`}>{item.name}</span>
                      <span className="shrink-0 font-display text-[16px] font-bold tabular-nums">{f.min(row.minutes)}</span>
                    </span>
                    <span aria-hidden className="block h-3 rounded-full bg-surface-2">
                      <span className={`block h-full rounded-full ${item.excluded ? 'bg-faint' : item.color}`} style={{ width: `${(row.minutes / maxMinutes) * 100}%` }} />
                    </span>
                    <span className="text-[13px] text-muted tabular-nums">
                      {d.paretoRow(f.share(row.share), f.share(row.cumulative))}
                      {item.excluded && ` · ${d.paretoExcluded}`}
                    </span>
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

/** Casilla de marcar con su texto (y una aclaración debajo). */
function Check({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="grid min-h-11 cursor-pointer grid-cols-[22px_minmax(0,1fr)] items-start gap-3 rounded-[12px] py-2">
      <input type="checkbox" className="mt-0.5 size-[18px] accent-accent" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px] leading-snug font-semibold wrap-break-word">{label}</span>
        {hint && <span className="text-[13px] text-muted tabular-nums">{hint}</span>}
      </span>
    </label>
  );
}
