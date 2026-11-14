import { useCallback, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, Eraser, FileUp, Plus, Trash2 } from 'lucide-react';
import type { ImportedRow, ImportField } from '../../import/mapping';
import { ImportDialog } from '../../ui/ImportDialog';
import { useI18n } from '../../i18n';
import { takt, type TimeUnit } from '../../calc/takt';
import { parseDecimal, toFieldText } from '../../ui/number';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { NumberField } from '../../ui/NumberField';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Button, IconButton } from '../../ui/Button';
import { Dotted, Explained, type Derivation } from '../../ui/Explained';
import { useToast } from '../../ui/Toast';
import { APP_VERSION } from '../../version';
import { taktExplain, taktFormat, type NamedStation } from './explain';
import { taktSheet } from './sheet';
import { taktConclusion, taktReadingLines, taktWarnings, type TaktSaved } from './reading';

interface Row {
  id: number;
  name: string;
  cycle: string;
}
interface State {
  available: string;
  availableUnit: TimeUnit;
  demand: string;
  unit: TimeUnit;
  rows: Row[];
}

const UNITS: TimeUnit[] = ['s', 'min', 'h'];
const MAX_STATIONS = 30;
const blank = (id: number): Row => ({ id, name: '', cycle: '' });
const EMPTY: State = { available: '', availableUnit: 'min', demand: '', unit: 'min', rows: [] };
// Ejemplo de la ficha 3: 480 min, 240 piezas (takt 2 min, Lean Lexicon) y tres
// estaciones de 1,8 · 2,3 · 1,5 min: la segunda pasa del takt.
const EXAMPLE: State = {
  available: '480',
  availableUnit: 'min',
  demand: '240',
  unit: 'min',
  rows: [
    { id: 1, name: '', cycle: '1,8' },
    { id: 2, name: '', cycle: '2,3' },
    { id: 3, name: '', cycle: '1,5' },
  ],
};

/** Tarjeta de un valor: entera tocable con su explicación. */
function Stat({ label, value, calc }: { label: string; value: string; calc: Derivation | null }) {
  const body = (
    <>
      <span className="text-[13px] font-semibold text-muted">{calc ? <Dotted>{label}</Dotted> : label}</span>
      <span className="font-display text-[19px] font-bold tabular-nums wrap-anywhere">{value}</span>
    </>
  );
  const cls = 'flex min-w-0 flex-col gap-0.5 rounded-[14px] bg-surface-2 p-3';
  return calc ? <Explained calc={calc} className={`${cls} w-full`}>{body}</Explained> : <div className={cls}>{body}</div>;
}

/** Elegir s, min u h. */
function UnitPicker({ label, value, onChange }: { label: string; value: TimeUnit; onChange: (u: TimeUnit) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <div role="group" aria-label={label} className="grid grid-cols-3 gap-1 rounded-[16px] bg-surface-2 p-1">
        {UNITS.map((u) => (
          <button
            key={u}
            type="button"
            aria-pressed={value === u}
            aria-label={t.tools.takt.unitNames[u]}
            onClick={() => onChange(u)}
            className={`press min-h-11 rounded-[13px] px-2 text-[15px] font-semibold ${value === u ? 'raised-sm text-accent-ink' : 'text-muted'}`}
          >
            {t.tools.takt.units[u]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TaktTool() {
  const { t, lang } = useI18n();
  const d = t.tools.takt;
  const toast = useToast();
  const saved = useSavedInput<TaktSaved>();
  const [state, setState] = useState<State>(() =>
    saved
      ? {
          available: toFieldText(saved.available, lang),
          availableUnit: saved.availableUnit,
          demand: toFieldText(saved.demand, lang),
          unit: saved.unit,
          rows: saved.stations.map((s, i) => ({ id: i + 1, name: s.name, cycle: toFieldText(s.cycle, lang) })),
        }
      : EMPTY,
  );
  const nextId = useRef(100);
  const { rows } = state;
  const set = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch }));
  const nameOf = (i: number) => rows[i]!.name.trim() || d.stationName(i + 1);

  const available = parseDecimal(state.available);
  const demand = parseDecimal(state.demand);
  // Estaciones con tiempo, en orden; si alguna tiene nombre pero no tiempo, falta completarla.
  const parsed = (() => {
    const stations: NamedStation[] = [];
    const own: TaktSaved['stations'] = [];
    let incomplete: string | null = null;
    rows.forEach((r, i) => {
      if (r.cycle.trim() === '') {
        if (r.name.trim()) incomplete ??= nameOf(i);
        return;
      }
      const c = parseDecimal(r.cycle);
      if (c === null) incomplete ??= nameOf(i);
      else {
        stations.push({ name: nameOf(i), cycle: c });
        own.push({ name: r.name.trim(), cycle: c });
      }
    });
    return { stations, own, incomplete };
  })();
  const input =
    available !== null && demand !== null && !parsed.incomplete
      ? { available, availableUnit: state.availableUnit, demand, unit: state.unit, cycles: parsed.stations.map((s) => s.cycle) }
      : null;
  const out = input ? takt(input) : null;
  const r = out?.result ?? null;
  const stationName = (i: number) => parsed.stations[i]?.name ?? d.stationName(i + 1);
  const warnings = taktWarnings(out?.warnings ?? [], stationName, t);
  const f = taktFormat(lang, t, state.unit);
  const anyText = state.available.trim() !== '' || state.demand.trim() !== '' || rows.some((x) => x.cycle.trim() || x.name.trim());

  const update = (id: number, patch: Partial<Row>) => setState((s) => ({ ...s, rows: s.rows.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const add = () => setState((s) => ({ ...s, rows: [...s.rows, blank(nextId.current++)] }));
  const remove = (i: number) => {
    const previous = state;
    const name = nameOf(i);
    setState((s) => ({ ...s, rows: s.rows.filter((_, j) => j !== i) }));
    toast(d.removed(name), { action: { label: t.common.undo, onAction: () => setState(previous) } });
  };
  const clear = () => {
    const previous = state;
    setState({ ...EMPTY, availableUnit: state.availableUnit, unit: state.unit });
    toast(t.common.cleared, { action: { label: t.common.undo, onAction: () => setState(previous) } });
  };

  const importFields: ImportField[] = [
    { key: 'name', label: d.sheet.stationHead, type: 'text', required: false, hints: ['estacion', 'station', 'puesto', 'operacion', 'operation', 'paso', 'step', 'nombre', 'name'] },
    { key: 'cycle', label: d.cycle, type: 'number', required: true, hints: ['ciclo', 'cycle', 'tiempo', 'time', 'tc', 'ct', 'segundos', 'seconds', 'min'] },
  ];
  const [importOpen, setImportOpen] = useState(false);
  const closeImport = useCallback(() => setImportOpen(false), []);
  const onImport = (imported: ImportedRow[]) => {
    const previous = state;
    setState((s) => ({
      ...s,
      rows: imported.map((x) => ({
        id: nextId.current++,
        name: typeof x.name === 'string' ? x.name : '',
        cycle: typeof x.cycle === 'number' ? toFieldText(x.cycle, lang) : '',
      })),
    }));
    toast(t.importing.imported(imported.length), { action: { label: t.common.undo, onAction: () => setState(previous) } });
  };

  const data = (
    <>
      <div className="flex flex-col gap-1.5">
        <NumberField label={d.available} unit={d.units[state.availableUnit]} value={state.available} invalidText={d.invalidNumber} onChange={(v) => set({ available: v })} />
        <p className="text-[13px] text-muted">{d.availableHint}</p>
      </div>
      <UnitPicker label={d.availableUnitLabel} value={state.availableUnit} onChange={(u) => set({ availableUnit: u })} />
      <NumberField label={d.demand} unit={d.pieces} value={state.demand} invalidText={d.invalidNumber} onChange={(v) => set({ demand: v })} />
      <UnitPicker label={d.unitLabel} value={state.unit} onChange={(u) => set({ unit: u })} />
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted">{d.stations}</span>
        <p className="text-[13px] text-muted">{d.stationsHint}</p>
      </div>
      {rows.length > 0 && (
        <ol className="flex flex-col gap-2.5">
          {rows.map((row, i) => (
            <li key={row.id} className="flex flex-col gap-2.5 rounded-[16px] bg-surface-2 p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={row.name}
                  placeholder={d.stationName(i + 1)}
                  aria-label={d.nameLabel(i + 1)}
                  autoComplete="off"
                  onChange={(e) => update(row.id, { name: e.target.value })}
                  className="h-12 w-0 min-w-0 flex-1 rounded-[12px] border-[1.5px] border-line bg-surface px-3 text-[16px] font-semibold outline-none placeholder:font-normal placeholder:text-muted focus:border-accent"
                />
                <IconButton icon={Trash2} label={d.removeStation(nameOf(i))} onClick={() => remove(i)} />
              </div>
              <NumberField label={d.cycle} unit={d.units[state.unit]} value={row.cycle} invalidText={d.invalidNumber} onChange={(v) => update(row.id, { cycle: v })} />
            </li>
          ))}
        </ol>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.length < MAX_STATIONS && (
          <Button icon={Plus} onClick={add}>
            {d.addStation}
          </Button>
        )}
        <Button icon={FileUp} onClick={() => setImportOpen(true)}>
          {t.importing.button}
        </Button>
      </div>
      {anyText && (
        <Button variant="ghost" icon={Eraser} className="self-start" onClick={clear}>
          {t.common.clear}
        </Button>
      )}
      <ImportDialog open={importOpen} onClose={closeImport} fields={importFields} max={MAX_STATIONS} onImport={onImport} />
    </>
  );

  let result: ReactNode;
  if (!r || !input) {
    const problems = warnings.length ? warnings : parsed.incomplete ? [d.incomplete(parsed.incomplete)] : [];
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
    const ex = taktExplain(input, parsed.stations, r, t, lang);
    const line = r.line;
    // Escala de las barras: la estación más lenta o el takt, lo que sea mayor, con un poco de aire.
    const scale = Math.max(r.takt, line?.bottleneckCycle ?? 0) * 1.08;
    const pos = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;
    result = (
      <div className="flex flex-col gap-4">
        <Explained calc={ex.takt!} className="flex flex-col items-start gap-1 self-start rounded-[14px]">
          <span className="text-[13px] font-semibold text-muted">
            <Dotted>Takt</Dotted>
          </span>
          <span className="font-display text-[56px] leading-[0.95] font-bold tracking-[-0.035em] tabular-nums">{f.time(r.takt)}</span>
        </Explained>
        {line && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Stat label={d.capacityPieces} value={f.pieces(line.capacity)} calc={ex.capacity} />
              <Stat label={d.minStations} value={String(line.minStations)} calc={ex.minStations} />
              <Stat label={d.efficiency} value={f.pct(line.efficiency)} calc={ex.efficiency} />
              <Stat label={d.idle} value={f.pct(line.idle)} calc={ex.idle} />
            </div>
            <div className="flex flex-col gap-2.5">
              <h3 className="text-[13px] font-semibold text-muted">{d.byStation}</h3>
              <ul className="flex flex-col gap-3">
                {parsed.stations.map((st, i) => {
                  const over = st.cycle > r.takt;
                  const worst = i === line.bottleneck;
                  return (
                    <li key={i} className="flex flex-col gap-1.5">
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0 text-[15px] font-semibold wrap-anywhere">
                          {st.name}
                          {worst && <span className="ml-2 inline-block rounded-full bg-warn-soft px-2 py-0.5 align-middle text-[12px] font-semibold whitespace-nowrap">{d.bottleneckTag}</span>}
                        </span>
                        <span className="shrink-0 font-display text-[17px] font-bold tabular-nums">{f.time(st.cycle)}</span>
                      </span>
                      <span aria-hidden className="relative block h-3 rounded-full bg-surface-2">
                        <span className={`block h-full rounded-full ${over ? 'bg-warn' : 'bg-accent/40'}`} style={{ width: pos(st.cycle) }} />
                        <span className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-text" style={{ left: pos(r.takt) }} />
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[13px] text-muted">
                <span aria-hidden className="mr-1.5 inline-block h-3 w-0.5 translate-y-0.5 rounded-full bg-text" />
                {d.taktMark(f.time(r.takt))}
              </p>
            </div>
          </>
        )}
      </div>
    );
  }

  const conclusion = r && input ? taktConclusion(r, input, parsed.stations, t, lang) : '';
  const reading = r ? { conclusion, warnings, typicalError: d.typicalError } : null;

  const sheet = () =>
    r && input
      ? taktSheet(input, parsed.stations, t, {
          reading: taktReadingLines(conclusion, warnings, t),
          version: APP_VERSION,
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB'),
        })
      : null;

  const save = (): SavePayload | null =>
    r && input
      ? {
          input: { available: input.available, availableUnit: input.availableUnit, demand: input.demand, unit: input.unit, stations: parsed.own } satisfies TaktSaved,
          headline: { key: 'takt', value: r.takt, kind: 'number', decimals: 2, unit: d.units[input.unit] },
        }
      : null;

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
              <dd className="text-right font-semibold">
                {s.key === 'takt' || s.key === 'work'
                  ? f.time(s.value)
                  : s.key === 'capacity'
                    ? `${f.pieces(s.value)} ${d.pieces}`
                    : s.key === 'minStations'
                      ? String(s.value)
                      : f.pct(s.value)}
              </dd>
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
      onLoadExample={() => setState(EXAMPLE)}
      result={result}
      reading={reading}
      formula={formula}
      sheet={sheet}
      toolId="takt"
      save={save}
    />
  );
}
