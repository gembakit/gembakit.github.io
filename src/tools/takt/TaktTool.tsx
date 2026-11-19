import { useCallback, useId, useState, type ReactNode } from 'react';
import { CircleAlert, Eraser, TriangleAlert, Factory, FileUp, Package, Plus, Trash2 } from 'lucide-react';
import type { ImportedRow, ImportField } from '../../import/mapping';
import { ImportDialog } from '../../ui/ImportDialog';
import { useI18n } from '../../i18n';
import { SECONDS, stationStats, takt, TIME_UNITS, toCycle, type Basis, type LineKind, type Measure, type TimeUnit } from '../../calc/takt';
import { parseDecimal, toFieldText } from '../../ui/number';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { NumberField } from '../../ui/NumberField';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { BigValue, ExampleOption, Fold, Group, Hint, isBad, MeasureBox, NameInput, Segmented, Stat, StatLine, SubTitle, Tag, UnitSelect, TimeField } from '../form';
import { Button, IconButton } from '../../ui/Button';
import { Sheet } from '../../ui/Sheet';
import { Dotted, Explained } from '../../ui/Explained';
import { useToast } from '../../ui/Toast';
import { APP_VERSION } from '../../version';
import { smartDecimals, subtractionUnit, taktExplain, taktFormat } from './explain';
import { taktSheet } from './sheet';
import { BOTTLING, PACKS } from './examples';
import { deductionNames, readTaktSaved, stationNames, taktConclusion, taktReadingLines, taktView, taktWarnings, toTaktInput, type TaktSaved } from './reading';

interface DedRow {
  id: number;
  name: string;
  value: string;
  unit: TimeUnit;
}
interface StRow {
  id: number;
  name: string;
  theo: string;
  actual: { id: number; v: string }[];
}
interface State {
  shift: string;
  shiftUnit: TimeUnit;
  deductions: DedRow[];
  shifts: string;
  demand: string;
  unitName: string;
  measure: Measure;
  measureUnit: TimeUnit;
  resultUnit: TimeUnit;
  kind: LineKind;
  basis: Basis;
  stations: StRow[];
  oee: string;
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
  measure: 'time',
  measureUnit: 's',
  resultUnit: 'min',
  kind: 'assembly',
  basis: 'mean',
  stations: [],
  oee: '',
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
    measure: s.measure,
    measureUnit: s.measureUnit,
    resultUnit: s.resultUnit,
    kind: s.kind,
    basis: s.basis,
    stations: s.stations.map((st) => ({
      id: nextId(),
      name: st.name,
      theo: st.theoretical === null ? '' : txt(st.theoretical),
      actual: st.actual.map((v) => ({ id: nextId(), v: txt(v) })),
    })),
    oee: s.oee === null ? '' : txt(Number((s.oee * 100).toPrecision(10))),
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
    const theoretical = num(s.theo, where);
    const actual = s.actual.map((a) => num(a.v, where)).filter((v): v is number => v !== null);
    if (s.name.trim() || theoretical !== null || actual.length) {
      index.push(stations.length);
      stations.push({ name: s.name.trim(), theoretical, actual });
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
      v: 2,
      shift,
      shiftUnit: st.shiftUnit,
      deductions,
      shifts,
      demand,
      unitName: st.unitName.trim(),
      measure: st.measure,
      measureUnit: st.measureUnit,
      resultUnit: st.resultUnit,
      kind: st.kind,
      basis: st.basis,
      stations,
      oee: oeePct === null ? null : oeePct / 100,
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
  const kindId = useId();
  const set = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch }));
  const dedName = (i: number) => state.deductions[i]!.name.trim() || d.deductionName(i + 1);
  const stName = (i: number) => state.stations[i]!.name.trim() || d.stationName(i + 1, state.kind);

  const { saved, bad, index } = toSaved(state, { deduction: dedName, station: stName });
  const out = saved ? takt(toTaktInput(saved)) : null;
  const r = out?.result ?? null;
  const view = saved ? taktView(saved, t) : { measure: state.measure, measureUnit: state.measureUnit, resultUnit: state.resultUnit, unitName: state.unitName.trim() || d.defaultUnit, kind: state.kind };
  const f = taktFormat(lang, t, view);
  const warnings = saved && out ? taktWarnings(out.warnings, saved, t, lang) : [];
  const names = saved ? stationNames(saved, t) : [];
  const line = r?.line ?? null;
  const enteredUnit = state.measure === 'time' ? d.units[state.measureUnit]! : d.perUnit(d.units[state.measureUnit]!);
  const anyText =
    state.shift.trim() !== '' || state.demand.trim() !== '' || state.deductions.length > 0 || state.stations.some((s) => s.name.trim() || s.theo.trim() || s.actual.some((a) => a.v.trim()));

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
  const addSt = () => {
    const id = nextId();
    setState((s) => ({ ...s, stations: [...s.stations, { id, name: '', theo: '', actual: [{ id: nextId(), v: '' }] }] }));
    setOpen((o) => new Set([...o, `st${id}`]));
  };
  const addMeasure = (id: number) => updateSt(id, (x) => ({ ...x, actual: [...x.actual, { id: nextId(), v: '' }] }));

  const clear = () => {
    const previous = state;
    setState({ ...EMPTY, shiftUnit: state.shiftUnit, measure: state.measure, measureUnit: state.measureUnit, resultUnit: state.resultUnit, kind: state.kind });
    setOpen(new Set(['time', 'demand']));
    toast(t.common.cleared, { action: { label: t.common.undo, onAction: () => setState(previous) } });
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
    { key: 'theoretical', label: d.theoretical, type: 'number', required: false, hints: ['teorico', 'theoretical', 'placa', 'nameplate', 'diseno', 'design', 'estandar', 'standard'] },
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
        row = { id: nextId(), name, theo: '', actual: [] };
        list.push(row);
        if (name) groups.set(name.toLowerCase(), row);
      }
      if (typeof x.actual === 'number' && row.actual.length < MAX_MEASURES) row.actual.push({ id: nextId(), v: toFieldText(x.actual, lang) });
      if (typeof x.theoretical === 'number' && !row.theo) row.theo = toFieldText(x.theoretical, lang);
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
    if (u !== state.resultUnit && left > 0) text += ` (${f.time(left * shifts * SECONDS[u], state.resultUnit)})`;
    return text;
  })();

  // ── Resúmenes de los bloques plegados ──
  const timeBad = isBad(state.shift) || isBad(state.shifts) || state.deductions.some((x) => isBad(x.value));
  const demandValue = parseDecimal(state.demand);
  const stationBad = (row: StRow) => isBad(row.theo) || row.actual.some((a) => isBad(a.v));
  const stationsBad = state.stations.some(stationBad);
  const stationsSummary =
    state.stations.length === 0 ? d.groupEmpty.stations! : [d.stationsCount(state.stations.length, state.kind), ...(line ? [d.bottleneckIs(names[line.bottleneck]!)] : [])].join(' · ');

  const repeatableLabel = d.stat.repeatable[state.measure]!;
  const data = (
    <>
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
          summary={d.lineSummary(d.measures[state.measure]!, enteredUnit, d.units[state.resultUnit]!, d.kindsShort[state.kind]!)}
          bad={false}
          open={open.has('line')}
          onToggle={() => toggle('line')}
        >
          <Segmented
            label={d.measureLabel}
            value={state.measure}
            options={(['time', 'rate'] as const).map((m) => ({ value: m, label: d.measures[m]! }))}
            onChange={(m) => set(state.stations.length === 0 ? { measure: m, measureUnit: m === 'time' ? 's' : 'h', resultUnit: m === 'time' ? 'min' : 'h' } : { measure: m })}
          />
          <Hint>{d.measureHints[state.measure]}</Hint>
          <Segmented
            label={d.measureUnitLabel}
            value={state.measureUnit}
            options={TIME_UNITS.map((u) => ({ value: u, label: state.measure === 'time' ? d.units[u]! : d.perUnit(d.units[u]!), aria: state.measure === 'time' ? d.unitNames[u] : d.perUnitName(u) }))}
            onChange={(u) => set({ measureUnit: u })}
          />
          <Segmented
            label={d.resultUnitLabel}
            value={state.resultUnit}
            options={TIME_UNITS.map((u) => ({ value: u, label: d.units[u]!, aria: d.unitNames[u] }))}
            onChange={(u) => set({ resultUnit: u })}
          />
          <div role="radiogroup" aria-labelledby={`${kindId}l`} className="flex flex-col gap-2">
            <span id={`${kindId}l`} className="text-[13px] font-semibold text-muted">
              {d.kindLabel}
            </span>
            {(['assembly', 'machines'] as const).map((k) => (
              <label key={k} className="grid cursor-pointer grid-cols-[22px_minmax(0,1fr)] items-start gap-3 rounded-[14px] bg-surface-2 p-3 has-checked:outline-2 has-checked:outline-accent">
                <input type="radio" name={kindId} className="mt-1 size-[18px] accent-accent" checked={state.kind === k} onChange={() => set({ kind: k })} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{d.kinds[k]}</span>
                  <span className="text-[13px] leading-relaxed text-muted">{d.kindHints[k]}</span>
                </span>
              </label>
            ))}
          </div>
        </Group>

        <Group
          title={d.stations[state.kind]!}
          summary={stationsBad ? d.groupBad : stationsSummary}
          bad={stationsBad}
          open={open.has('stations')}
          onToggle={() => toggle('stations')}
        >
          <Hint>{d.stationsHint}</Hint>
          {state.stations.length > 0 && (
            <ol className="flex flex-col gap-2">
              {state.stations.map((row, i) => {
                const name = stName(i);
                const values = row.actual.map((a) => parseDecimal(a.v)).filter((v): v is number => v !== null && v > 0);
                const stats = stationStats(values, state.measure);
                const theo = parseDecimal(row.theo);
                const ofTheo = stats && theo !== null && theo > 0 ? toCycle(theo, state.measure, state.measureUnit) / toCycle(stats.mean, state.measure, state.measureUnit) : null;
                const k = index[i];
                const worst = line !== null && k !== null && k === line.bottleneck;
                const rowBad = stationBad(row);
                const summary = rowBad
                  ? d.groupBad
                  : [
                      ...(stats ? [d.measuresCount(stats.n), stats.n > 1 ? d.meanIs(f.entered(stats.mean)) : f.entered(stats.mean)] : []),
                      ...(theo !== null && theo > 0 ? [d.theoIs(f.entered(theo))] : []),
                    ].join(' · ') || d.noData;
                return (
                  <Fold key={row.id} name={name} tag={worst ? <Tag>{d.bottleneckTag}</Tag> : undefined} summary={summary} bad={rowBad} open={open.has(`st${row.id}`)} onToggle={() => toggle(`st${row.id}`)}>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-semibold text-muted">{d.nameField}</span>
                      <div className="flex items-start gap-2">
                        <NameInput value={row.name} placeholder={d.stationName(i + 1, state.kind)} label={d.nameLabel(d.stationName(i + 1, state.kind))} onChange={(v) => updateSt(row.id, (x) => ({ ...x, name: v }))} />
                        <IconButton icon={Trash2} label={d.removeStation(name)} onClick={() => removeWithUndo(name, (s) => ({ ...s, stations: s.stations.filter((x) => x.id !== row.id) }))} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <NumberField compact label={d.theoretical} unit={enteredUnit} value={row.theo} invalidText={d.invalidNumber} onChange={(v) => updateSt(row.id, (x) => ({ ...x, theo: v }))} />
                      <Hint>{d.theoreticalHint}</Hint>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-semibold text-muted">{d.measuresIn(enteredUnit)}</span>
                      <div className="grid grid-cols-2 gap-2">
                        {row.actual.map((a, j) => (
                          <MeasureBox
                            key={a.id}
                            label={d.measureN(name, j + 1)}
                            value={a.v}
                            onChange={(v) => updateSt(row.id, (x) => ({ ...x, actual: x.actual.map((m) => (m.id === a.id ? { ...m, v } : m)) }))}
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
                          <StatLine label={d.stat.mean} value={f.entered(stats.mean)} />
                          <StatLine label={repeatableLabel} value={f.entered(stats.repeatable!)} />
                          <StatLine label={d.stat.min} value={f.entered(stats.min)} />
                          <StatLine label={d.stat.max} value={f.entered(stats.max)} />
                          <StatLine label={d.stat.spread} value={f.pct(stats.spread!)} />
                          {ofTheo !== null && <StatLine label={d.stat.ofTheoretical} value={f.pct(ofTheo)} />}
                        </dl>
                        <p className="text-[12.5px] leading-relaxed text-muted">{d.stat.repeatableHint[state.measure]}</p>
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
                {d.addStation[state.kind]}
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
    const isTime = saved.measure === 'time';
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
          <span className="text-[15px] font-semibold text-muted tabular-nums">{d.equals(isTime ? f.alt(r.takt) : d.oneEvery(f.alt(r.takt)))}</span>
        </Explained>
        <Stat label={d.availableStat} value={f.time(r.available)} calc={ex.available} />

        {line && (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <SubTitle>{d.stations[saved.kind]}</SubTitle>
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
              <span className="text-[13px] font-semibold text-muted">{d.byStation[saved.measure]}</span>
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
    const ru = saved.resultUnit;
    const sec = { s: 1, min: 60, h: 3600 }[ru];
    const value = saved.measure === 'time' ? r.takt / sec : sec / r.takt;
    return {
      input: saved,
      headline: { key: 'takt', value, kind: 'number', decimals: smartDecimals(value), unit: saved.measure === 'time' ? d.units[ru] : d.rateOf(view.unitName, d.units[ru]!) },
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
