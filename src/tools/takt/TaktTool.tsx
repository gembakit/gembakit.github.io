import { useCallback, useState, type ReactNode } from 'react';
import { CircleAlert, Eraser, TriangleAlert, Factory, FileUp, Package, Plus, Trash2 } from 'lucide-react';
import type { ImportedRow, ImportField } from '../../import/mapping';
import { ImportDialog } from '../../ui/ImportDialog';
import { useI18n } from '../../i18n';
import { SECONDS, stationStats, takt, toCycle, type Basis, type Pace, type TimeUnit } from '../../calc/takt';
import { parseDecimal, toFieldText } from '../../ui/number';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { NumberField } from '../../ui/NumberField';
import { ToolTemplate } from '../../ui/ToolTemplate';
import {
  BigValue,
  Check,
  convertText,
  ExampleOption,
  Fold,
  Group,
  Hint,
  InfoButton,
  isBad,
  MeasureBox,
  NameInput,
  PaceChoice,
  Segmented,
  Stat,
  StatLine,
  SubTitle,
  Tag,
  UnitSelect,
  TimeField,
  type NumText,
} from '../form';
import { Button, IconButton } from '../../ui/Button';
import { Sheet } from '../../ui/Sheet';
import { Dotted, Explained } from '../../ui/Explained';
import { useToast } from '../../ui/Toast';
import { APP_VERSION } from '../../version';
import type { Recipe, RecipeStation } from '../../data/db';
import { recipeLabel, type RecipeContent, type RecipeNames } from '../../recipes/store';
import { RecipeBar } from '../../recipes/RecipeUI';
import { paceLabel, smartDecimals, subtractionUnit, taktExplain, taktFormat, type TaktView } from './explain';
import { taktSheet } from './sheet';
import { BOTTLING, PACKS } from './examples';
import { deductionNames, readTaktSaved, stationNames, stationsMeasure, taktConclusion, taktReadingLines, taktView, taktWarnings, toTaktInput, type TaktSaved } from './reading';

interface DedRow {
  id: number;
  name: string;
  value: string;
  unit: TimeUnit;
}
interface StRow extends Pace {
  id: number;
  name: string;
  /** Lo que cuenta, si no es la unidad de la demanda («cajas»). */
  item: string;
  /** Unidades de la demanda en una de las suyas. */
  per: string;
  theo: NumText;
  actual: (NumText & { id: number })[];
  /** Forma en que se tomaron las medidas: la media se saca en esa aunque se cambie la unidad. */
  origin: Pace['measure'];
}
interface State {
  shift: string;
  shiftUnit: TimeUnit;
  deductions: DedRow[];
  shifts: string;
  demand: string;
  unitName: string;
  stationUnit: Pace;
  result: Pace;
  balance: boolean;
  basis: Basis;
  stations: StRow[];
  oee: string;
  /** Receta cargada o guardada (planta, línea y nombre). */
  recipe: RecipeNames | null;
}

const MAX_STATIONS = 30;
const MAX_MEASURES = 30;
const MAX_DEDUCTIONS = 15;
const EMPTY: State = {
  shift: '',
  shiftUnit: 'min',
  deductions: [],
  shifts: '',
  demand: '',
  unitName: '',
  stationUnit: { measure: 'time', unit: 's' },
  result: { measure: 'time', unit: 'min' },
  balance: false,
  basis: 'mean',
  stations: [],
  oee: '',
  recipe: null,
};

let ids = 1;
const nextId = () => ids++;

/** De lo guardado (o de un ejemplo) a los campos de la pantalla. */
function fromSaved(s: TaktSaved, lang: 'es' | 'en'): State {
  const txt = (v: number) => toFieldText(v, lang);
  return {
    shift: txt(s.shift),
    shiftUnit: s.shiftUnit,
    deductions: s.deductions.map((d) => ({ id: nextId(), name: d.name, value: txt(d.value), unit: d.unit })),
    shifts: s.shifts === 1 ? '' : txt(s.shifts),
    demand: txt(s.demand),
    unitName: s.unitName,
    stationUnit: s.stationUnit,
    result: s.result,
    balance: s.balance,
    basis: s.basis,
    stations: s.stations.map((st) => ({
      id: nextId(),
      name: st.name,
      measure: st.measure,
      unit: st.unit,
      item: st.item,
      per: st.item.trim() ? txt(st.per) : '',
      theo: { text: st.theoretical === null ? '' : txt(st.theoretical) },
      actual: st.actual.map((v) => ({ id: nextId(), text: txt(v) })),
      origin: st.origin ?? st.measure,
    })),
    oee: s.oee === null ? '' : txt(Number((s.oee * 100).toPrecision(10))),
    recipe: s.recipe ?? null,
  };
}

/** Pasa los valores de una estación a otra unidad: cambia cómo se escriben, no lo que valen. */
function convertRow(row: StRow, to: Pace, lang: 'es' | 'en'): StRow {
  return {
    ...row,
    measure: to.measure,
    unit: to.unit,
    theo: convertText(row.theo, row, to, lang),
    actual: row.actual.map((a) => ({ ...a, ...convertText(a, row, to, lang) })),
  };
}

/** De los campos a los datos: null si falta lo imprescindible; `bad`, el primer sitio con un número mal escrito. */
function toSaved(
  st: State,
  names: { deduction: (i: number) => string; station: (i: number) => string },
): { saved: TaktSaved | null; bad: string | null; index: (number | null)[] } {
  let bad: string | null = null;
  const num = (text: string, where: string) => {
    if (text.trim() === '') return null;
    const v = parseDecimal(text);
    if (v === null) bad ??= where;
    return v;
  };
  // Un número que puede venir de una conversión: el valor exacto mientras no se toque el texto.
  const exact = (n: NumText, where: string) => (n.text.trim() !== '' && n.exact !== undefined ? n.exact : num(n.text, where));
  const deductions: TaktSaved['deductions'] = [];
  st.deductions.forEach((d, i) => {
    const v = num(d.value, names.deduction(i));
    if (v !== null) deductions.push({ name: d.name.trim(), value: v, unit: d.unit });
    else if (d.name.trim() && d.value.trim() === '') bad ??= names.deduction(i);
  });
  const stations: TaktSaved['stations'] = [];
  // Qué estación guardada es cada fila de la pantalla (las filas vacías no cuentan).
  const index: (number | null)[] = [];
  st.stations.forEach((s, i) => {
    const where = names.station(i);
    const theoretical = exact(s.theo, where);
    const actual = s.actual.map((a) => exact(a, where)).filter((v): v is number => v !== null);
    // Sin equivalencia escrita cuenta 0: el cálculo avisa de que falta.
    const per = s.item.trim() ? (num(s.per, where) ?? 0) : 1;
    if (s.name.trim() || theoretical !== null || actual.length) {
      index.push(stations.length);
      stations.push({
        name: s.name.trim(),
        measure: s.measure,
        unit: s.unit,
        item: s.item.trim(),
        per,
        theoretical,
        actual,
        ...(actual.length && s.origin !== s.measure ? { origin: s.origin } : {}),
      });
    } else index.push(null);
  });
  // El OEE mal escrito no bloquea el cálculo: su casilla está en el resultado y tiene que seguir a la vista para corregirlo.
  const oeePct = parseDecimal(st.oee);
  const shift = num(st.shift, '');
  const demand = num(st.demand, '');
  const shifts = num(st.shifts, '') ?? 1;
  if (bad || shift === null || demand === null) return { saved: null, bad, index };
  return {
    saved: {
      v: 3,
      shift,
      shiftUnit: st.shiftUnit,
      deductions,
      shifts,
      demand,
      unitName: st.unitName.trim(),
      stationUnit: st.stationUnit,
      result: st.result,
      balance: st.balance,
      basis: st.basis,
      stations,
      oee: oeePct === null ? null : oeePct / 100,
      ...(st.recipe ? { recipe: st.recipe } : {}),
    },
    bad: null,
    index,
  };
}

export default function TaktTool() {
  const { t, lang } = useI18n();
  const d = t.tools.takt;
  const toast = useToast();
  const savedInput = useSavedInput<unknown>();
  const [state, setState] = useState<State>(() => {
    const s = savedInput ? readTaktSaved(savedInput) : null;
    return s ? fromSaved(s, lang) : EMPTY;
  });
  // Bloques abiertos: «time», «demand», «line», «stations» y cada estación por su id («st12»).
  // Sin datos, se abren los dos primeros para empezar; con datos, todo plegado y con su resumen.
  const [open, setOpen] = useState<Set<string>>(() => new Set(savedInput && readTaktSaved(savedInput) ? [] : ['time', 'demand']));
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
  const dedName = (i: number) => state.deductions[i]!.name.trim() || d.deductionName(i + 1);
  const stName = (i: number) => state.stations[i]!.name.trim() || d.stationName(i + 1);

  const { saved, bad, index } = toSaved(state, { deduction: dedName, station: stName });
  const out = saved ? takt(toTaktInput(saved)) : null;
  const r = out?.result ?? null;
  const unitName = state.unitName.trim() || d.defaultUnit;
  const view: TaktView = saved ? taktView(saved, t) : { result: state.result, unitName, balance: state.balance };
  const f = taktFormat(lang, t, view);
  const warnings = saved && out ? taktWarnings(out.warnings, saved, t, lang) : [];
  const names = saved ? stationNames(saved, t) : [];
  const line = r?.line ?? null;
  const anyText =
    state.shift.trim() !== '' ||
    state.demand.trim() !== '' ||
    state.deductions.length > 0 ||
    state.stations.some((s) => s.name.trim() || s.theo.text.trim() || s.actual.some((a) => a.text.trim()));

  // ── Descuentos ──
  const updateDed = (id: number, patch: Partial<DedRow>) => setState((s) => ({ ...s, deductions: s.deductions.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const addDed = () => setState((s) => ({ ...s, deductions: [...s.deductions, { id: nextId(), name: '', value: '', unit: 'min' }] }));
  const removeWithUndo = (name: string, change: (s: State) => State) => {
    const previous = state;
    setState(change);
    toast(d.removed(name), { action: { label: t.common.undo, onAction: () => setState(previous) } });
  };

  // ── Estaciones ──
  const updateSt = (id: number, change: (x: StRow) => StRow) => setState((s) => ({ ...s, stations: s.stations.map((x) => (x.id === id ? change(x) : x)) }));
  const newStation = (s: State, name = ''): StRow => ({ id: nextId(), name, ...s.stationUnit, item: '', per: '', theo: { text: '' }, actual: [], origin: s.stationUnit.measure });
  const addSt = () => {
    const id = nextId();
    setState((s) => ({ ...s, stations: [...s.stations, { ...newStation(s), id, actual: [{ id: nextId(), text: '' }] }] }));
    setOpen((o) => new Set([...o, `st${id}`]));
  };
  const addMeasure = (id: number) => updateSt(id, (x) => ({ ...x, actual: [...x.actual, { id: nextId(), text: '' }] }));
  // La unidad de arriba pasa todas las estaciones a esa unidad, convirtiendo sus valores.
  const setStationUnit = (p: Pace) => setState((s) => ({ ...s, stationUnit: p, stations: s.stations.map((x) => convertRow(x, p, lang)) }));

  const clear = () => {
    const previous = state;
    setState({ ...EMPTY, shiftUnit: state.shiftUnit, stationUnit: state.stationUnit, result: state.result, balance: state.balance });
    setOpen(new Set(['time', 'demand']));
    toast(t.common.cleared, { action: { label: t.common.undo, onAction: () => setState(previous) } });
  };

  // ── Recetas: las estaciones (sin medidas) se cargan de una receta y se guardan en una ──
  const loadRecipe = (rec: Recipe) => {
    const previous = state;
    const txt = (v: number) => toFieldText(v, lang);
    setState((s) => ({
      ...s,
      unitName: rec.unitName,
      recipe: { plant: rec.plant, line: rec.line, name: rec.name },
      stations: rec.stations.map((st) => ({
        id: nextId(),
        name: st.name,
        measure: st.measure,
        unit: st.unit,
        item: st.item,
        per: st.item.trim() ? txt(st.per) : '',
        theo: { text: st.standard === null ? '' : txt(st.standard) },
        actual: [{ id: nextId(), text: '' }],
        origin: st.measure,
      })),
    }));
    setOpen((o) => new Set([...o, 'stations']));
    toast(t.recipes.loadedToast(recipeLabel(rec)), { action: { label: t.common.undo, onAction: () => setState(previous) } });
  };
  const recipeContent = (): Partial<RecipeContent> | string => {
    const list: RecipeStation[] = [];
    for (const s of state.stations) {
      if (!s.name.trim() && !s.theo.text.trim()) continue;
      const standard = s.theo.text.trim() === '' ? null : (s.theo.exact ?? parseDecimal(s.theo.text));
      const per = s.item.trim() ? parseDecimal(s.per) : 1;
      if ((s.theo.text.trim() !== '' && standard === null) || per === null) return t.recipes.badNumber;
      list.push({ name: s.name.trim(), measure: s.measure, unit: s.unit, item: s.item.trim(), per, standard });
    }
    if (!list.length) return t.recipes.nothing;
    return { unitName: state.unitName.trim(), stations: list };
  };

  const loadExample = (which: 'bottling' | 'packs') => {
    setState(fromSaved(which === 'bottling' ? BOTTLING(t) : PACKS(t), lang));
    setOpen(new Set());
    setExamplesOpen(false);
  };

  // ── Importar: una fila por medida; las filas con el mismo nombre se juntan en una estación ──
  const importFields: ImportField[] = [
    { key: 'name', label: d.sheet.stationHead, type: 'text', required: false, hints: ['estacion', 'station', 'puesto', 'maquina', 'machine', 'operacion', 'operation', 'paso', 'step', 'nombre', 'name'] },
    { key: 'actual', label: d.actual, type: 'number', required: true, hints: ['medida', 'real', 'actual', 'ciclo', 'cycle', 'tiempo', 'time', 'velocidad', 'speed', 'tc', 'ct'] },
    { key: 'theoretical', label: d.theoretical, type: 'number', required: false, hints: ['estandar', 'standard', 'teorico', 'theoretical', 'placa', 'nameplate', 'diseno', 'design'] },
  ];
  const [importOpen, setImportOpen] = useState(false);
  const closeImport = useCallback(() => setImportOpen(false), []);
  const onImport = (imported: ImportedRow[]) => {
    const previous = state;
    const groups = new Map<string, StRow>();
    const list: StRow[] = [];
    for (const x of imported) {
      const name = typeof x.name === 'string' ? x.name.trim() : '';
      let row = name ? groups.get(name.toLowerCase()) : undefined;
      if (!row) {
        if (list.length >= MAX_STATIONS) continue;
        row = newStation(state, name);
        list.push(row);
        if (name) groups.set(name.toLowerCase(), row);
      }
      if (typeof x.actual === 'number' && row.actual.length < MAX_MEASURES) row.actual.push({ id: nextId(), text: toFieldText(x.actual, lang) });
      if (typeof x.theoretical === 'number' && !row.theo.text) row.theo = { text: toFieldText(x.theoretical, lang) };
    }
    setState((s) => ({ ...s, stations: list }));
    setOpen((o) => new Set([...o, 'stations']));
    toast(t.importing.imported(imported.length), { action: { label: t.common.undo, onAction: () => setState(previous) } });
  };

  // Resta del tiempo disponible, a la vista mientras se escribe: en la unidad más pequeña escrita
  // (480 − 10 − 20 min) y, si los resultados van en otra, también en esa.
  const subtraction = (() => {
    const shift = parseDecimal(state.shift);
    if (shift === null) return null;
    const used = state.deductions.flatMap((x) => (parseDecimal(x.value) !== null ? [x] : []));
    const u = subtractionUnit({ shiftUnit: state.shiftUnit, deductions: used });
    const conv = (v: number, from: TimeUnit) => (v * SECONDS[from]) / SECONDS[u];
    const parts = [f.num(conv(shift, state.shiftUnit))];
    let left = conv(shift, state.shiftUnit);
    for (const x of used) {
      const v = conv(parseDecimal(x.value)!, x.unit);
      parts.push(f.num(v));
      left -= v;
    }
    const shifts = parseDecimal(state.shifts) ?? 1;
    const ul = d.units[u];
    let text = parts.length > 1 ? `${parts.join(' − ')} = ${f.num(left)} ${ul}` : `${f.num(left)} ${ul}`;
    if (shifts !== 1) text += ` × ${f.num(shifts)} = ${f.num(left * shifts)} ${ul}`;
    if (u !== state.result.unit && left > 0) text += ` (${f.time(left * shifts * SECONDS[u], state.result.unit)})`;
    return text;
  })();

  // ── Resúmenes de los bloques plegados ──
  const timeBad = isBad(state.shift) || isBad(state.shifts) || state.deductions.some((x) => isBad(x.value));
  const demandValue = parseDecimal(state.demand);
  const stationBad = (row: StRow) => isBad(row.theo.text) || isBad(row.per) || row.actual.some((a) => isBad(a.text));
  const stationsBad = state.stations.some(stationBad);
  const stationsSummary = state.stations.length === 0 ? d.groupEmpty.stations! : [d.stationsCount(state.stations.length), ...(line ? [d.bottleneckIs(names[line.bottleneck]!)] : [])].join(' · ');
  const repeatableLabel = saved ? (stationsMeasure(saved) ? d.stat.repeatable[stationsMeasure(saved)!]! : d.bases.repeatable!) : d.bases.repeatable!;

  const data = (
    <>
      <RecipeBar current={state.recipe} onLoad={loadRecipe} build={recipeContent} onSaved={(n) => set({ recipe: { plant: n.plant, line: n.line, name: n.name } })} />
      <div className="flex flex-col border-b border-line">
        <Group title={d.timeTitle} summary={timeBad ? d.groupBad : (subtraction ?? d.groupEmpty.time!)} bad={timeBad} open={open.has('time')} onToggle={() => toggle('time')}>
          <TimeField label={d.shift} value={state.shift} unit={state.shiftUnit} onValue={(v) => set({ shift: v })} onUnit={(u) => set({ shiftUnit: u })} />
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">{d.deductions}</span>
            <Hint>{d.deductionsHint}</Hint>
          </div>
          {state.deductions.length > 0 && (
            <ol className="flex flex-col gap-2">
              {state.deductions.map((row, i) => (
                <li key={row.id} className="flex flex-col gap-2 rounded-[16px] bg-surface-2 p-2.5">
                  <div className="flex items-start gap-2">
                    <NameInput value={row.name} placeholder={d.deductionName(i + 1)} label={d.deductionNameLabel(i + 1)} onChange={(v) => updateDed(row.id, { name: v })} />
                    <IconButton
                      icon={Trash2}
                      label={d.removeStation(dedName(i))}
                      onClick={() => removeWithUndo(dedName(i), (s) => ({ ...s, deductions: s.deductions.filter((x) => x.id !== row.id) }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <MeasureBox className="flex-1" label={d.deductionTimeOf(dedName(i))} value={row.value} onChange={(v) => updateDed(row.id, { value: v })} />
                    <UnitSelect value={row.unit} onChange={(u) => updateDed(row.id, { unit: u })} label={d.unitOf(d.deductionTimeOf(dedName(i)))} />
                  </div>
                </li>
              ))}
            </ol>
          )}
          {state.deductions.length < MAX_DEDUCTIONS && (
            <Button icon={Plus} className="self-start" onClick={addDed}>
              {d.addDeduction}
            </Button>
          )}
          <div className="flex flex-col gap-1.5">
            <NumberField compact label={d.shifts} value={state.shifts} invalidText={d.invalidNumber} onChange={(v) => set({ shifts: v })} />
            <Hint>{d.shiftsHint}</Hint>
          </div>
          {subtraction && (
            <p className="rounded-[14px] bg-soft p-3 text-[15px] leading-relaxed font-semibold tabular-nums wrap-anywhere">
              <span className="block text-[13px] font-semibold text-muted">{d.availableStat}</span>
              {subtraction}
            </p>
          )}
        </Group>

        <Group
          title={d.groups.demand!}
          summary={isBad(state.demand) ? d.groupBad : demandValue !== null ? f.units(demandValue) : d.groupEmpty.demand!}
          bad={isBad(state.demand)}
          open={open.has('demand')}
          onToggle={() => toggle('demand')}
        >
          <NumberField compact label={d.demand} value={state.demand} invalidText={d.invalidNumber} onChange={(v) => set({ demand: v })} />
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

        <Group
          title={d.groups.line!}
          summary={d.lineSummary(paceLabel(t, state.stationUnit, unitName), paceLabel(t, state.result, unitName), state.balance)}
          bad={false}
          open={open.has('line')}
          onToggle={() => toggle('line')}
        >
          <div className="flex flex-col gap-1.5">
            <PaceChoice label={d.stationUnitLabel} value={state.stationUnit} item={unitName} onChange={setStationUnit} />
            <Hint>{d.stationUnitHint}</Hint>
          </div>
          <div className="flex flex-col gap-1.5">
            <PaceChoice label={d.resultUnitLabel} value={state.result} item={unitName} onChange={(p) => set({ result: p })} />
            <Hint>{d.resultUnitHint}</Hint>
          </div>
          <Check
            label={d.balanceCheck}
            hint={d.balanceCheckHint}
            checked={state.balance}
            onChange={(on) => set({ balance: on })}
            aside={<InfoButton title={d.balanceInfo} paragraphs={d.balanceInfoText} />}
          />
        </Group>

        <Group title={d.stations} summary={stationsBad ? d.groupBad : stationsSummary} bad={stationsBad} open={open.has('stations')} onToggle={() => toggle('stations')}>
          <Hint>{d.stationsHint}</Hint>
          {state.stations.length > 0 && (
            <ol className="flex flex-col gap-2">
              {state.stations.map((row, i) => {
                const name = stName(i);
                const item = row.item.trim();
                const own = paceLabel(t, row, item || unitName);
                const shown = (x: number) => f.station(x, row);
                const values = row.actual.map((a) => (a.text.trim() !== '' && a.exact !== undefined ? a.exact : parseDecimal(a.text))).filter((v): v is number => v !== null && v > 0);
                const stats = stationStats(values, row.measure, row.origin);
                const theo = row.theo.text.trim() !== '' && row.theo.exact !== undefined ? row.theo.exact : parseDecimal(row.theo.text);
                const ofTheo = stats && theo !== null && theo > 0 ? toCycle(theo, row.measure, row.unit) / toCycle(stats.mean, row.measure, row.unit) : null;
                const per = parseDecimal(row.per);
                const k = index[i];
                const worst = line !== null && k !== null && k === line.bottleneck;
                const rowBad = stationBad(row);
                const summary = rowBad
                  ? d.groupBad
                  : [
                      ...(stats ? [d.measuresCount(stats.n), stats.n > 1 ? d.meanIs(shown(stats.mean)) : shown(stats.mean)] : []),
                      ...(theo !== null && theo > 0 ? [d.theoIs(shown(theo))] : []),
                      ...(item && per !== null && per > 0 ? [d.perText(d.singular(item), f.num(per), unitName)] : []),
                    ].join(' · ') || d.noData;
                return (
                  <Fold key={row.id} name={name} tag={worst ? <Tag>{d.bottleneckTag}</Tag> : undefined} summary={summary} bad={rowBad} open={open.has(`st${row.id}`)} onToggle={() => toggle(`st${row.id}`)}>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-semibold text-muted">{d.nameField}</span>
                      <div className="flex items-start gap-2">
                        <NameInput value={row.name} placeholder={d.stationName(i + 1)} label={d.nameLabel(d.stationName(i + 1))} onChange={(v) => updateSt(row.id, (x) => ({ ...x, name: v }))} />
                        <IconButton icon={Trash2} label={d.removeStation(name)} onClick={() => removeWithUndo(name, (s) => ({ ...s, stations: s.stations.filter((x) => x.id !== row.id) }))} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-[13px] font-semibold text-muted">{d.itemLabel}</span>
                        <input
                          type="text"
                          value={row.item}
                          placeholder={unitName}
                          aria-label={d.itemOf(name)}
                          autoComplete="off"
                          maxLength={30}
                          onChange={(e) => updateSt(row.id, (x) => ({ ...x, item: e.target.value }))}
                          className="h-12 rounded-[15px] border-[1.5px] border-line bg-surface px-4 text-[16px] outline-none placeholder:text-muted focus:border-accent"
                        />
                      </label>
                      {item && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[15px] font-semibold">
                          <span>{d.perOne(d.singular(item))}</span>
                          <MeasureBox className="w-20" label={d.perOf(d.singular(item), unitName)} value={row.per} onChange={(v) => updateSt(row.id, (x) => ({ ...x, per: v }))} />
                          <span>{unitName}</span>
                        </div>
                      )}
                      <Hint>{d.itemHint(unitName)}</Hint>
                    </div>
                    <PaceChoice label={d.stationUnit} value={row} item={item || unitName} onChange={(p) => updateSt(row.id, (x) => convertRow(x, p, lang))} />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-semibold text-muted">{d.theoretical}</span>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <MeasureBox className="w-36" label={`${d.theoretical}: ${name}`} value={row.theo.text} onChange={(v) => updateSt(row.id, (x) => ({ ...x, theo: { text: v } }))} />
                        <span className="text-[15px] font-semibold text-muted">{own}</span>
                      </div>
                      <Hint>{d.theoreticalHint}</Hint>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-semibold text-muted">{d.measuresIn(own)}</span>
                      <div className="grid grid-cols-2 gap-2">
                        {row.actual.map((a, j) => (
                          <MeasureBox
                            key={a.id}
                            label={d.measureN(name, j + 1)}
                            value={a.text}
                            // Una medida escrita a mano en esta forma: desde ahora la media se saca en esta forma.
                            onChange={(v) => updateSt(row.id, (x) => ({ ...x, origin: x.measure, actual: x.actual.map((m) => (m.id === a.id ? { id: m.id, text: v } : m)) }))}
                          />
                        ))}
                      </div>
                      {row.actual.length < MAX_MEASURES && (
                        <Button icon={Plus} className="self-start" onClick={() => addMeasure(row.id)}>
                          {d.addMeasure}
                        </Button>
                      )}
                      <Hint>{d.actualHint}</Hint>
                    </div>
                    {stats && stats.n >= 2 && (
                      <div className="flex flex-col gap-2 rounded-[12px] bg-surface p-3">
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[14px]">
                          <StatLine label={d.stat.mean} value={shown(stats.mean)} />
                          <StatLine label={d.stat.repeatable[row.measure]!} value={shown(stats.repeatable!)} />
                          <StatLine label={d.stat.min} value={shown(stats.min)} />
                          <StatLine label={d.stat.max} value={shown(stats.max)} />
                          <StatLine label={d.stat.spread} value={f.pct(stats.spread!)} />
                          {ofTheo !== null && <StatLine label={d.stat.ofTheoretical} value={f.pct(ofTheo)} />}
                        </dl>
                        <p className="text-[12.5px] leading-relaxed text-muted">{d.stat.repeatableHint[row.measure]}</p>
                      </div>
                    )}
                  </Fold>
                );
              })}
            </ol>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {state.stations.length < MAX_STATIONS && (
              <Button icon={Plus} onClick={addSt}>
                {d.addStation}
              </Button>
            )}
            <Button icon={FileUp} onClick={() => setImportOpen(true)}>
              {t.importing.button}
            </Button>
          </div>
        </Group>
      </div>

      {anyText && (
        <Button variant="ghost" icon={Eraser} className="self-start" onClick={clear}>
          {t.common.clear}
        </Button>
      )}
      <ImportDialog open={importOpen} onClose={closeImport} fields={importFields} max={MAX_STATIONS * 10} onImport={onImport} />
      <Sheet open={examplesOpen} onClose={closeExamples} title={d.exampleTitle}>
        <div className="flex flex-col gap-2.5">
          <ExampleOption icon={Factory} title={d.examples.bottling} hint={d.examples.bottlingHint} onPick={() => loadExample('bottling')} />
          <ExampleOption icon={Package} title={d.examples.assembly} hint={d.examples.assemblyHint} onPick={() => loadExample('packs')} />
        </div>
      </Sheet>
    </>
  );

  let result: ReactNode;
  if (!r || !saved) {
    const problems = bad ? [d.incomplete(bad)] : warnings;
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
    const ex = taktExplain(toTaktInput(saved), names, deductionNames(saved, t), r, view, t, lang);
    // Avisos del OEE junto a su casilla (también salen en «Cómo leerlo»).
    const oeeProblems = out!.warnings.flatMap((w) => (w.code === 'oee-range' ? [d.warn.oeeRange] : w.code === 'oee-no-theoretical' ? [d.warn.oeeNoTheoretical] : []));
    const isTime = saved.result.measure === 'time';
    // Barras: en tiempos, el ciclo (más largo = más lento); en velocidades, la velocidad (más corta = más lenta).
    const shownValue = (cycle: number) => (isTime ? cycle : 1 / cycle);
    const all = [r.takt, ...r.stations.flatMap((s) => [s.cycle, ...(s.theoreticalCycle !== null ? [s.theoreticalCycle] : [])])].map(shownValue);
    const scale = Math.max(...all) * 1.08;
    const pos = (cycle: number) => `${Math.min(100, (shownValue(cycle) / scale) * 100)}%`;
    result = (
      <div className="flex flex-col gap-4">
        <Explained calc={ex.takt!} className="flex flex-col items-start gap-1 self-start rounded-[14px]">
          <span className="text-[13px] font-semibold text-muted">
            <Dotted>{isTime ? d.taktTitle : d.rateTitle}</Dotted>
          </span>
          <BigValue text={f.main(r.takt)} />
          <span className="text-[15px] font-semibold text-muted tabular-nums">{d.equals(isTime ? f.alt(r.takt) : d.oneEvery(f.every(r.takt)))}</span>
        </Explained>
        <Stat label={d.availableStat} value={f.time(r.available)} calc={ex.available} />

        {line && (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <SubTitle>{d.stations}</SubTitle>
            <Segmented
              label={d.basisLabel}
              value={state.basis}
              options={[
                { value: 'mean' as const, label: d.bases.mean! },
                { value: 'repeatable' as const, label: repeatableLabel },
                { value: 'theoretical' as const, label: d.bases.theoretical! },
              ]}
              onChange={(b) => set({ basis: b })}
            />
            <Hint>{d.basisHint}</Hint>
            <div className="grid grid-cols-2 gap-2">
              <Stat label={d.bottleneck} value={names[line.bottleneck]!} calc={null} />
              <Stat label={d.capacity} value={f.units(line.capacity)} calc={ex.capacity} />
              {line.balance && (
                <>
                  <Stat label={d.minStations} value={String(line.balance.minStations)} calc={ex.minStations} />
                  <Stat label={d.efficiency} value={f.pct(line.balance.efficiency)} calc={ex.efficiency} />
                  <Stat label={d.idle} value={f.pct(line.balance.idle)} calc={ex.idle} />
                </>
              )}
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-[13px] font-semibold text-muted">{d.byStation[saved.result.measure]}</span>
              <ul className="flex flex-col gap-3">
                {r.stations.map((st, i) => {
                  const over = line.over.includes(i);
                  const worst = i === line.bottleneck;
                  return (
                    <li key={i} className="flex flex-col gap-1.5">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <span className="min-w-0 text-[15px] font-semibold wrap-break-word">
                          {names[i]}
                          {worst && <Tag>{d.bottleneckTag}</Tag>}
                        </span>
                        <span className="shrink-0 text-right font-display text-[16px] font-bold tabular-nums">{f.main(st.cycle)}</span>
                      </span>
                      <span aria-hidden className="relative block h-3 rounded-full bg-surface-2">
                        <span className={`block h-full rounded-full ${over ? 'bg-warn' : 'bg-accent/40'}`} style={{ width: pos(st.cycle) }} />
                        {st.theoreticalCycle !== null && (
                          <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-[1.5px] border-text bg-surface" style={{ left: pos(st.theoreticalCycle) }} />
                        )}
                        <span className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-text" style={{ left: pos(r.takt) }} />
                      </span>
                      {st.source === 'theoretical' && saved.basis !== 'theoretical' && <span className="text-[12.5px] text-muted">{d.usesTheoretical}</span>}
                    </li>
                  );
                })}
              </ul>
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
                <span>
                  <span aria-hidden className="mr-1.5 inline-block h-3 w-0.5 translate-y-0.5 rounded-full bg-text" />
                  {d.taktMark(f.main(r.takt))}
                </span>
                {r.stations.some((s) => s.theoreticalCycle !== null) && (
                  <span>
                    <span aria-hidden className="mr-1.5 inline-block size-2.5 rotate-45 border-[1.5px] border-text" />
                    {d.theoMark}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {line && (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <SubTitle>{d.oeeTitle}</SubTitle>
            <div className="flex flex-col gap-1.5">
              <NumberField compact label={d.oee} unit="%" value={state.oee} invalidText={d.invalidNumber} onChange={(v) => set({ oee: v })} />
              <Hint>{d.oeeHint}</Hint>
            </div>
            {oeeProblems.map((w) => (
              <p key={w} className="flex items-start gap-2.5 rounded-[14px] bg-warn-soft p-3 text-[14px]">
                <TriangleAlert aria-hidden size={18} className="mt-0.5 shrink-0 text-warn" />
                <span>{w}</span>
              </p>
            ))}
            {r.oee && (
              <div className={`grid grid-cols-2 gap-2 rounded-[16px] p-2 ${r.oee.meets ? 'bg-ok-soft' : 'bg-warn-soft'}`}>
                <Stat label={d.expected} value={f.units(r.oee.expected)} calc={ex.expected} />
                <Stat label={d.minOee} value={f.pct(r.oee.minOee)} calc={ex.minOee} />
                <div className="col-span-2">
                  <Stat label={d.target} value={f.main(r.oee.targetCycle)} calc={ex.target} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const conclusion = r && saved ? taktConclusion(r, saved, t, lang) : '';
  const reading = r ? { conclusion, warnings, typicalError: d.typicalError } : null;

  const sheet = () =>
    r && saved
      ? taktSheet(saved, r, t, lang, {
          reading: taktReadingLines(conclusion, warnings, t),
          version: APP_VERSION,
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB'),
        })
      : null;

  const save = (): SavePayload | null => {
    if (!r || !saved) return null;
    const ru = saved.result;
    const sec = SECONDS[ru.unit];
    const value = ru.measure === 'time' ? r.takt / sec : sec / r.takt;
    return {
      input: saved,
      headline: { key: 'takt', value, kind: 'number', decimals: smartDecimals(value), unit: paceLabel(t, ru, view.unitName) },
    };
  };

  const formula = (
    <ul className="flex flex-col gap-1 font-semibold">
      {d.formula.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
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
      toolId="takt"
      save={save}
    />
  );
}
