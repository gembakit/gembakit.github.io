import { useRef, useState, type ReactNode } from 'react';
import { CircleAlert, Eraser, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { roi } from '../../calc/roi';
import { parseDecimal, toFieldText } from '../../ui/number';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { NumberField } from '../../ui/NumberField';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Button, IconButton } from '../../ui/Button';
import { Dotted, Explained, type Derivation } from '../../ui/Explained';
import { useToast } from '../../ui/Toast';
import { APP_VERSION } from '../../version';
import { lineExplain, roiExplain, roiFormat } from './explain';
import { calcInput, lineValue, type How, type RoiLine, type RoiSaved } from './model';
import { roiSheet } from './sheet';
import { roiConclusion, roiReadingLines, roiWarnings } from './reading';

interface LineRow {
  id: number;
  name: string;
  kind: RoiLine['kind'];
  how: How;
  amount: string;
  before: string;
  after: string;
  units: string;
  hours: string;
  rate: string;
}
interface YearRow {
  id: number;
  value: string;
}
interface State {
  currency: string;
  investment: string;
  mode: RoiSaved['mode'];
  lines: LineRow[];
  years: YearRow[];
  newCosts: string;
  horizon: string;
}

const MAX_ROWS = 20;
const blankLine = (id: number): LineRow => ({ id, name: '', kind: 'hard', how: 'direct', amount: '', before: '', after: '', units: '', hours: '', rate: '' });
const EMPTY: State = { currency: '€', investment: '', mode: 'same', lines: [blankLine(1)], years: [{ id: 2, value: '' }], newCosts: '0', horizon: '1' };
// Ejemplo: el caso de Lumen Learning (ficha 6): 120.000 de inversión y 24.000 al año → payback 5 años.
const EXAMPLE: State = { ...EMPTY, investment: '120000', lines: [{ ...blankLine(1), amount: '24000' }], horizon: '5' };

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  stacked = false,
  inCard = true,
}: {
  label: string;
  options: { id: T; text: string }[];
  value: T;
  onChange: (v: T) => void;
  /** Una opción debajo de otra (textos largos). */
  stacked?: boolean;
  /** Dentro de una tarjeta de color (fondo claro) o suelta (fondo de tarjeta). */
  inCard?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <div
        role="group"
        aria-label={label}
        className={`grid gap-1 rounded-[16px] p-1 ${inCard ? 'bg-surface' : 'bg-surface-2'}`}
        style={{ gridTemplateColumns: stacked ? '1fr' : `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={`press min-h-11 rounded-[13px] px-1 py-1.5 text-center leading-tight font-semibold ${options.length > 2 ? 'text-[13.5px]' : 'text-[14px]'} ${value === o.id ? 'raised-sm text-accent-ink' : 'text-muted'}`}
          >
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}

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

export default function RoiTool() {
  const { t, lang } = useI18n();
  const d = t.tools.roi;
  const toast = useToast();
  const saved = useSavedInput<RoiSaved>();
  const txt = (v: number | undefined) => (v === undefined ? '' : toFieldText(v, lang));
  const [state, setState] = useState<State>(() =>
    saved
      ? {
          currency: saved.currency,
          investment: txt(saved.investment),
          mode: saved.mode,
          lines: saved.lines.length
            ? saved.lines.map((l, i) => ({
                id: i + 1,
                name: l.name,
                kind: l.kind,
                how: l.how,
                amount: txt(l.amount),
                before: txt(l.before),
                after: txt(l.after),
                units: txt(l.units),
                hours: txt(l.hours),
                rate: txt(l.rate),
              }))
            : [blankLine(1)],
          years: saved.years.length ? saved.years.map((v, i) => ({ id: 100 + i, value: txt(v) })) : [{ id: 100, value: '' }],
          newCosts: txt(saved.newCosts),
          horizon: txt(saved.horizon),
        }
      : EMPTY,
  );
  const nextId = useRef(1000);
  const set = (patch: Partial<State>) => setState((s) => ({ ...s, ...patch }));
  const setLine = (id: number, patch: Partial<LineRow>) => setState((s) => ({ ...s, lines: s.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  const setYear = (id: number, value: string) => setState((s) => ({ ...s, years: s.years.map((y) => (y.id === id ? { ...y, value } : y)) }));
  const lineName = (i: number) => state.lines[i]!.name.trim() || d.lineName(i + 1);
  const f = roiFormat(lang, t, state.currency);

  // Lo escrito, pasado a números. Una línea a medias deja el cálculo pendiente.
  const parsed = (() => {
    const investment = parseDecimal(state.investment);
    const newCosts = parseDecimal(state.newCosts);
    const horizon = parseDecimal(state.horizon);
    let incomplete: string | null = null;
    const lines: RoiLine[] = [];
    const byRow = new Map<number, RoiLine>();
    state.lines.forEach((l, i) => {
      const fields = l.how === 'direct' ? (['amount'] as const) : l.how === 'unit' ? (['before', 'after', 'units'] as const) : (['hours', 'rate'] as const);
      const empty = fields.every((k) => l[k].trim() === '');
      if (empty && !l.name.trim()) return;
      const nums = fields.map((k) => parseDecimal(l[k]));
      if (nums.some((n) => n === null)) {
        incomplete ??= lineName(i);
        return;
      }
      const line: RoiLine = { name: l.name.trim(), kind: l.kind, how: l.how };
      fields.forEach((k, j) => (line[k] = nums[j]!));
      lines.push(line);
      byRow.set(l.id, line);
    });
    const years: number[] = [];
    if (state.mode === 'yearly') {
      for (const [i, y] of state.years.entries()) {
        if (y.value.trim() === '') continue;
        const v = parseDecimal(y.value);
        if (v === null) incomplete ??= d.year(i + 1);
        else years.push(v);
      }
    }
    // Sin ningún ahorro escrito todavía no hay nada que avisar: se enseña la indicación de siempre.
    const anySaving = state.mode === 'yearly' ? years.length > 0 : lines.length > 0;
    const ok = investment !== null && newCosts !== null && (state.mode === 'yearly' || horizon !== null) && !incomplete && anySaving;
    const s: RoiSaved | null = ok ? { currency: state.currency.trim(), investment: investment!, mode: state.mode, lines, years, newCosts: newCosts!, horizon: horizon ?? 1 } : null;
    return { s, incomplete, byRow };
  })();
  const s = parsed.s;
  const out = s ? roi(calcInput(s)) : null;
  const r = out?.result ?? null;
  const warnings = roiWarnings(out?.warnings ?? [], t);
  const anyText = state.investment.trim() !== '' || state.lines.some((l) => l.name || l.amount || l.before || l.after || l.units || l.hours || l.rate) || state.years.some((y) => y.value);

  const clear = () => {
    const previous = state;
    setState({ ...EMPTY, currency: state.currency, mode: state.mode });
    toast(t.common.cleared, { action: { label: t.common.undo, onAction: () => setState(previous) } });
  };
  const removeLine = (i: number) => {
    const previous = state;
    const name = lineName(i);
    setState((st) => ({ ...st, lines: st.lines.filter((_, j) => j !== i) }));
    toast(d.removed(name), { action: { label: t.common.undo, onAction: () => setState(previous) } });
  };

  const money = state.currency.trim();
  const perYear = d.perYear(money);
  const lineFields = (l: LineRow) => {
    const field = (k: 'amount' | 'before' | 'after' | 'units' | 'hours' | 'rate', unit: string) => (
      <NumberField key={k} label={d[k]} unit={unit} value={l[k]} invalidText={d.invalidNumber} onChange={(v) => setLine(l.id, { [k]: v })} />
    );
    if (l.how === 'direct') return field('amount', perYear);
    if (l.how === 'unit') return [field('before', money), field('after', money), field('units', '')];
    return [field('hours', 'h'), field('rate', `${money}/h`)];
  };

  const data = (
    <>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted">{d.currency}</span>
        <input
          type="text"
          value={state.currency}
          maxLength={6}
          autoComplete="off"
          onChange={(e) => set({ currency: e.target.value })}
          className="h-12 w-28 rounded-[12px] border-[1.5px] border-line bg-surface px-3 text-[16px] font-semibold outline-none focus:border-accent"
        />
      </label>
      <NumberField label={d.investment} unit={money} value={state.investment} invalidText={d.invalidNumber} onChange={(v) => set({ investment: v })} />
      <Segmented
        label={d.mode}
        value={state.mode}
        onChange={(v) => set({ mode: v })}
        stacked
        inCard={false}
        options={[
          { id: 'same', text: d.modeSame },
          { id: 'yearly', text: d.modeYearly },
        ]}
      />
      {state.mode === 'same' ? (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">{d.lines}</span>
            <p className="text-[13px] text-muted">{d.linesHint}</p>
          </div>
          <ol className="flex flex-col gap-2.5">
            {state.lines.map((l, i) => {
              const parsedLine = parsed.byRow.get(l.id);
              const ex = parsedLine ? lineExplain(parsedLine, lineName(i), t, lang, money) : null;
              return (
                <li key={l.id} className="flex flex-col gap-2.5 rounded-[16px] bg-surface-2 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={l.name}
                      placeholder={d.lineName(i + 1)}
                      aria-label={d.lineNameLabel(i + 1)}
                      autoComplete="off"
                      onChange={(e) => setLine(l.id, { name: e.target.value })}
                      className="h-12 w-0 min-w-0 flex-1 rounded-[12px] border-[1.5px] border-line bg-surface px-3 text-[16px] font-semibold outline-none placeholder:font-normal placeholder:text-muted focus:border-accent"
                    />
                    {state.lines.length > 1 && <IconButton icon={Trash2} label={d.removeLine(lineName(i))} onClick={() => removeLine(i)} />}
                  </div>
                  <Segmented
                    label={d.kind}
                    value={l.kind}
                    onChange={(v) => setLine(l.id, { kind: v })}
                    options={[
                      { id: 'hard', text: d.hard },
                      { id: 'soft', text: d.soft },
                    ]}
                  />
                  <Segmented
                    label={d.how}
                    value={l.how}
                    onChange={(v) => setLine(l.id, { how: v })}
                    options={[
                      { id: 'direct', text: d.howDirect },
                      { id: 'unit', text: d.howUnit },
                      { id: 'time', text: d.howTime },
                    ]}
                  />
                  {lineFields(l)}
                  {parsedLine && ex && (
                    <Explained calc={ex} className="self-start rounded-[10px] text-[15px] font-semibold tabular-nums">
                      <Dotted>{d.lineValue(f.money(lineValue(parsedLine)))}</Dotted>
                    </Explained>
                  )}
                </li>
              );
            })}
          </ol>
          {state.lines.length < MAX_ROWS && (
            <Button icon={Plus} className="self-start" onClick={() => set({ lines: [...state.lines, blankLine(nextId.current++)] })}>
              {d.addLine}
            </Button>
          )}
        </>
      ) : (
        <>
          <ol className="flex flex-col gap-2">
            {state.years.map((y, i) => (
              <li key={y.id} className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <NumberField label={d.yearLabel(i + 1)} unit={money} value={y.value} invalidText={d.invalidNumber} onChange={(v) => setYear(y.id, v)} />
                </div>
                {state.years.length > 1 && (
                  <IconButton icon={Trash2} label={d.removeYear(i + 1)} onClick={() => setState((st) => ({ ...st, years: st.years.filter((x) => x.id !== y.id) }))} />
                )}
              </li>
            ))}
          </ol>
          {state.years.length < MAX_ROWS && (
            <Button icon={Plus} className="self-start" onClick={() => set({ years: [...state.years, { id: nextId.current++, value: '' }] })}>
              {d.addYear}
            </Button>
          )}
        </>
      )}
      <div className="flex flex-col gap-1.5">
        <NumberField label={d.newCosts} unit={perYear} value={state.newCosts} invalidText={d.invalidNumber} onChange={(v) => set({ newCosts: v })} />
        <p className="text-[13px] text-muted">{d.newCostsHint}</p>
      </div>
      {state.mode === 'same' && <NumberField label={d.horizon} unit={d.yearsUnit} value={state.horizon} invalidText={d.invalidNumber} onChange={(v) => set({ horizon: v })} />}
      {anyText && (
        <Button variant="ghost" icon={Eraser} className="self-start" onClick={clear}>
          {t.common.clear}
        </Button>
      )}
    </>
  );

  let result: ReactNode;
  if (!r || !s) {
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
    const ex = roiExplain(s, r, t, lang);
    // Ahorro acumulado año a año (hasta que se recupera o el horizonte, como mucho 10 años).
    const years = Math.min(10, Math.max(Math.ceil(r.horizon), r.payback === null ? 0 : Math.ceil(r.payback)));
    const yearNet = (k: number) => (s.mode === 'yearly' ? (r.net[k] ?? 0) : (r.net[0] ?? 0));
    const cum: number[] = [];
    for (let k = 0; k < years; k++) cum.push((cum[k - 1] ?? 0) + yearNet(k));
    const scale = Math.max(s.investment, ...cum, 1) * 1.08;
    const pos = (v: number) => `${Math.max(0, Math.min(100, (v / scale) * 100))}%`;
    result = (
      <div className="flex flex-col gap-4">
        {ex.payback ? (
          <Explained calc={ex.payback} className="flex flex-col items-start gap-1 self-start rounded-[14px]">
            <span className="text-[13px] font-semibold text-muted">
              <Dotted>{d.payback}</Dotted>
            </span>
            <span className="font-display text-[44px] leading-[1] font-bold tracking-[-0.03em] wrap-anywhere">{f.span(r.payback!)}</span>
          </Explained>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-semibold text-muted">{d.payback}</span>
            <span className="font-display text-[34px] leading-[1.05] font-bold tracking-[-0.02em]">{d.never}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {ex.net && <Stat label={d.netAnnual} value={f.money(r.net[0] ?? 0)} calc={ex.net} />}
          <Stat label={d.total(f.years(r.horizon))} value={f.money(r.total)} calc={ex.total} />
          <Stat label="ROI" value={f.pct(r.roi)} calc={ex.roi} />
        </div>
        {cum.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <h3 className="text-[13px] font-semibold text-muted">{d.chart}</h3>
            <ul className="flex flex-col gap-2">
              {cum.map((v, k) => (
                <li key={k} className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2.5">
                  <span className="text-[13px] font-semibold text-muted">{d.year(k + 1)}</span>
                  <span aria-hidden className="relative block h-3 rounded-full bg-surface-2">
                    <span className={`block h-full rounded-full ${v >= s.investment ? 'bg-ok' : 'bg-accent/40'}`} style={{ width: pos(v) }} />
                    <span className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-text" style={{ left: pos(s.investment) }} />
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-muted">
              <span aria-hidden className="mr-1.5 inline-block h-3 w-0.5 translate-y-0.5 rounded-full bg-text" />
              {d.investmentMark(f.money(s.investment))}
            </p>
          </div>
        )}
      </div>
    );
  }

  const conclusion = r && s ? roiConclusion(s, r, t, lang) : '';
  const allWarnings = r ? [...warnings, d.undiscounted] : warnings;
  const reading = r ? { conclusion, warnings: allWarnings, typicalError: d.typicalError } : null;
  const sheet = () =>
    s && r ? roiSheet(s, r, t, { reading: roiReadingLines(conclusion, warnings, t), version: APP_VERSION, date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB') }) : null;
  const save = (): SavePayload | null =>
    s && r
      ? {
          input: s,
          headline:
            r.payback !== null ? { key: 'payback', value: r.payback, kind: 'number', decimals: 2, unit: d.yearsUnit } : { key: 'roi', value: r.roi, kind: 'percent', decimals: 1 },
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
          {out.steps.map((st) => (
            <div key={st.key} className="contents">
              <dt className="text-muted">{d.steps[st.key as keyof typeof d.steps]}</dt>
              <dd className="text-right font-semibold">{st.key === 'roi' ? f.pct(st.value) : st.key === 'payback' ? f.num(st.value, 2) : f.money(st.value)}</dd>
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
      toolId="roi"
      save={save}
    />
  );
}
