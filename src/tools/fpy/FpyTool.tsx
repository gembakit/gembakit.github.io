import { useCallback, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, Eraser, FileUp, Plus, Trash2 } from 'lucide-react';
import type { ImportedRow, ImportField } from '../../import/mapping';
import { ImportDialog } from '../../ui/ImportDialog';
import { useI18n } from '../../i18n';
import { fpyRty, type FpyStep } from '../../calc/fpy';
import { fpyConclusion, fpyReadingLines, fpyWarnings, type FpySaved } from './reading';
import { formatPercent, parseDecimal, toFieldText } from '../../ui/number';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { NumberField } from '../../ui/NumberField';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Button, IconButton } from '../../ui/Button';
import { Dotted, Explained } from '../../ui/Explained';
import { fpyExplain } from './explain';
import { useToast } from '../../ui/Toast';
import { APP_VERSION } from '../../version';
import { fpySheet, type NamedStep } from './sheet';

type Mode = FpySaved['mode'];
export type { FpySaved };
interface Row {
  id: number;
  name: string;
  entering: string;
  good: string;
  fpy: string;
}
interface State {
  mode: Mode;
  rows: Row[];
}

const MAX_STEPS = 20;
const blank = (id: number): Row => ({ id, name: '', entering: '', good: '', fpy: '' });
const EMPTY: State = { mode: 'counts', rows: [blank(1), blank(2), blank(3)] };
// Ejemplo: el caso publicado de Fabrico (ficha 2): tres pasos con FPY 97 %,
// 94 % y 91 % → RTY 83 %.
const EXAMPLE: State = {
  mode: 'direct',
  rows: ['97', '94', '91'].map((fpy, i) => ({ ...blank(i + 1), fpy })),
};

const percent = formatPercent;

export default function FpyTool() {
  const { t, lang } = useI18n();
  const d = t.tools.fpy;
  const toast = useToast();
  // Medición guardada: arranca con sus pasos.
  const savedInput = useSavedInput<FpySaved>();
  const [state, setState] = useState<State>(() =>
    savedInput
      ? {
          mode: savedInput.mode,
          rows: savedInput.steps.map((s, i) => ({
            id: i + 1,
            name: s.name,
            entering: s.entering === undefined ? '' : toFieldText(s.entering, lang),
            good: s.good === undefined ? '' : toFieldText(s.good, lang),
            fpy: s.fpy === undefined ? '' : toFieldText(s.fpy * 100, lang),
          })),
        }
      : EMPTY,
  );
  const nextId = useRef(100);
  const { mode, rows } = state;

  const nameOf = (i: number) => rows[i]!.name.trim() || d.stepName(i + 1);
  const used = (r: Row) => (mode === 'counts' ? r.entering.trim() !== '' || r.good.trim() !== '' : r.fpy.trim() !== '');

  // Pasos con datos, en orden. Si alguno está a medias, no hay cálculo.
  const parsed = (() => {
    const steps: NamedStep[] = [];
    // Lo que se guarda en el proyecto: el nombre tal como se escribió (vacío = «Paso n»).
    const own: FpySaved['steps'] = [];
    let incomplete: string | null = null;
    rows.forEach((r, i) => {
      if (!used(r)) return;
      const name = r.name.trim() || d.stepName(i + 1);
      if (mode === 'counts') {
        const entering = parseDecimal(r.entering);
        const good = parseDecimal(r.good);
        if (entering === null || good === null) incomplete ??= name;
        else {
          steps.push({ name, step: { entering, good } });
          own.push({ name: r.name.trim(), entering, good });
        }
      } else {
        const v = parseDecimal(r.fpy);
        if (v === null) incomplete ??= name;
        else {
          steps.push({ name, step: { fpy: v / 100 } });
          own.push({ name: r.name.trim(), fpy: v / 100 });
        }
      }
    });
    return { steps, own, incomplete };
  })();

  const out = parsed.steps.length && !parsed.incomplete ? fpyRty(parsed.steps.map((s): FpyStep => s.step)) : null;
  const r = out?.result ?? null;
  const stepName = (i: number) => parsed.steps[i]?.name ?? d.stepName(i + 1);
  const anyText = rows.some((x) => used(x) || x.name.trim() !== '');

  const warnings = fpyWarnings(out?.warnings ?? [], stepName, t);

  const update = (id: number, patch: Partial<Row>) => setState((s) => ({ ...s, rows: s.rows.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const setMode = (m: Mode) => setState((s) => ({ ...s, mode: m }));
  const add = () => setState((s) => ({ ...s, rows: [...s.rows, blank(nextId.current++)] }));
  const remove = (i: number) => {
    const previous = state;
    const name = nameOf(i);
    setState((s) => ({ ...s, rows: s.rows.filter((_, j) => j !== i) }));
    toast(d.removed(name), { action: { label: t.common.undo, onAction: () => setState(previous) } });
  };
  // Importar: los datos que pide el modo elegido. Las palabras ayudan a
  // reconocer cada columna por su título.
  const importFields: ImportField[] = [
    { key: 'name', label: d.sheet.stepHead, type: 'text', required: false, hints: ['paso', 'step', 'nombre', 'name', 'operacion', 'operation', 'proceso', 'process', 'estacion', 'station'] },
    ...(mode === 'counts'
      ? ([
          { key: 'entering', label: d.entering, type: 'number', required: true, integer: true, hints: ['entran', 'entrada', 'in', 'input', 'unidades', 'units', 'total'] },
          { key: 'good', label: d.good, type: 'number', required: true, integer: true, hints: ['buenas', 'good', 'ok', 'conformes', 'primera', 'first'] },
        ] as const)
      : ([{ key: 'fpy', label: d.fpyField, type: 'number', required: true, hints: ['fpy', 'fty', 'rendimiento', 'yield', '%'] }] as const)),
  ];
  const [importOpen, setImportOpen] = useState(false);
  const closeImport = useCallback(() => setImportOpen(false), []);
  const asField = (v: number) => toFieldText(v, lang);
  const onImport = (imported: ImportedRow[]) => {
    const previous = state;
    // FPY: si todos vienen como fracción (0,97, o «97 %» leído así), se pasan a porcentaje.
    const fractions = mode === 'direct' && imported.every((r) => typeof r.fpy === 'number' && r.fpy <= 1);
    const num = (v: string | number | undefined, scale = 1) => (typeof v === 'number' ? asField(v * scale) : '');
    setState({
      mode,
      rows: imported.map((r) => ({
        id: nextId.current++,
        name: typeof r.name === 'string' ? r.name : '',
        entering: num(r.entering),
        good: num(r.good),
        fpy: num(r.fpy, fractions ? 100 : 1),
      })),
    });
    toast(t.importing.imported(imported.length), { action: { label: t.common.undo, onAction: () => setState(previous) } });
  };

  const clear = () => {
    const previous = state;
    setState({ ...EMPTY, mode });
    toast(t.common.cleared, { action: { label: t.common.undo, onAction: () => setState(previous) } });
  };

  const modeButton = (m: Mode, label: string) => (
    <button
      type="button"
      aria-pressed={mode === m}
      onClick={() => setMode(m)}
      className={`press min-h-12 rounded-[13px] px-2 py-1.5 text-center text-[14.5px] leading-tight font-semibold ${mode === m ? 'raised-sm text-accent-ink' : 'text-muted'}`}
    >
      {label}
    </button>
  );

  const data = (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted">{d.mode}</span>
        <div role="group" aria-label={d.mode} className="grid grid-cols-2 gap-1 rounded-[16px] bg-surface-2 p-1">
          {modeButton('counts', d.modeCounts)}
          {modeButton('direct', d.modeDirect)}
        </div>
        <p className="text-[13px] text-muted">{mode === 'counts' ? d.countsHint : d.directHint}</p>
      </div>
      <ol className="flex flex-col gap-2.5">
        {rows.map((row, i) => (
          <li key={row.id} className="flex flex-col gap-2.5 rounded-[16px] bg-surface-2 p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={row.name}
                placeholder={d.stepName(i + 1)}
                aria-label={d.nameLabel(i + 1)}
                autoComplete="off"
                onChange={(e) => update(row.id, { name: e.target.value })}
                className="h-12 w-0 min-w-0 flex-1 rounded-[12px] border-[1.5px] border-line bg-surface px-3 text-[16px] font-semibold outline-none placeholder:font-normal placeholder:text-muted focus:border-accent"
              />
              {rows.length > 1 && <IconButton icon={Trash2} label={d.removeStep(nameOf(i))} onClick={() => remove(i)} />}
            </div>
            {mode === 'counts' ? (
              <div className="grid grid-cols-2 gap-2">
                <NumberField label={d.entering} value={row.entering} invalidText={d.invalidNumber} onChange={(v) => update(row.id, { entering: v })} />
                <NumberField label={d.good} value={row.good} invalidText={d.invalidNumber} onChange={(v) => update(row.id, { good: v })} />
              </div>
            ) : (
              <NumberField label={d.fpyField} unit="%" value={row.fpy} invalidText={d.invalidNumber} onChange={(v) => update(row.id, { fpy: v })} />
            )}
          </li>
        ))}
      </ol>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.length < MAX_STEPS && (
          <Button icon={Plus} onClick={add}>
            {d.addStep}
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
      <ImportDialog open={importOpen} onClose={closeImport} fields={importFields} max={MAX_STEPS} onImport={onImport} />
    </>
  );

  let result: ReactNode;
  if (!r) {
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
    const several = r.fpy.length > 1;
    // Cada valor se toca y enseña de dónde sale, con estos números.
    const ex = fpyExplain(parsed.steps, r, t, lang);
    result = (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-start gap-1">
          <Explained calc={ex.rty} className="flex flex-col gap-1 rounded-[14px]">
            <span className="text-[13px] font-semibold text-muted">
              <Dotted>RTY</Dotted>
            </span>
            <span className="font-display text-[56px] leading-[0.95] font-bold tracking-[-0.035em] tabular-nums">{percent(r.rty, lang)} %</span>
          </Explained>
          <Explained calc={ex.hidden} className="rounded-[10px] text-[16px] tabular-nums">
            <span className="font-display text-[22px] font-bold">{percent(r.hiddenFactory, lang)} %</span> <Dotted>{d.steps.hiddenFactory}</Dotted>
          </Explained>
        </div>
        <div className="flex flex-col gap-2.5">
          <h3 className="text-[13px] font-semibold text-muted">{d.byStep}</h3>
          <ul className="flex flex-col gap-3">
            {r.fpy.map((f, i) => {
              const worst = several && i === r.worst;
              return (
                <li key={i}>
                  <Explained calc={ex.step[i]!} className="flex w-full flex-col gap-1.5 rounded-[12px]">
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0 text-[15px] font-semibold wrap-anywhere">
                        {stepName(i)}
                        {worst && <span className="ml-2 inline-block rounded-full bg-warn-soft px-2 py-0.5 align-middle text-[12px] font-semibold whitespace-nowrap">{d.worstTag}</span>}
                      </span>
                      <span className="shrink-0 font-display text-[17px] font-bold tabular-nums">
                        <Dotted>{percent(f, lang)} %</Dotted>
                      </span>
                    </span>
                    <span aria-hidden className="block h-2.5 overflow-hidden rounded-full bg-surface-2">
                      <span className={`block h-full rounded-full ${worst ? 'bg-warn' : 'bg-accent/40'}`} style={{ width: `${Math.max(0, Math.min(1, f)) * 100}%` }} />
                    </span>
                  </Explained>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  const conclusion = r ? fpyConclusion(r, stepName, t, lang) : '';
  const reading = r ? { conclusion, warnings, typicalError: d.typicalError } : null;

  // La hoja lleva la misma lectura que la pantalla.
  const sheet = () =>
    r
      ? fpySheet(parsed.steps, t, {
          reading: fpyReadingLines(conclusion, warnings, t),
          version: APP_VERSION,
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB'),
        })
      : null;

  const formula = (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1 font-semibold">
        {d.formula.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      {r && (
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 tabular-nums">
          {r.fpy.map((f, i) => (
            <div key={i} className="contents">
              <dt className="text-muted wrap-anywhere">{d.steps.fpy(stepName(i))}</dt>
              <dd className="text-right font-semibold">{percent(f, lang)} %</dd>
            </div>
          ))}
          <dt className="text-muted">{d.steps.rty}</dt>
          <dd className="text-right font-semibold">{percent(r.rty, lang)} %</dd>
          <dt className="text-muted">{d.steps.hiddenFactory}</dt>
          <dd className="text-right font-semibold">{percent(r.hiddenFactory, lang)} %</dd>
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
      toolId="fpy"
      save={(): SavePayload | null => (r ? { input: { mode, steps: parsed.own } satisfies FpySaved, headline: { key: 'rty', value: r.rty, kind: 'percent', decimals: 1 } } : null)}
    />
  );
}
