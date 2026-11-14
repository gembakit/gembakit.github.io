import { useState, type ReactNode } from 'react';
import { CircleAlert, Eraser } from 'lucide-react';
import { useI18n } from '../../i18n';
import { kanban } from '../../calc/kanban';
import { parseDecimal, toFieldText } from '../../ui/number';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { NumberField } from '../../ui/NumberField';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Button } from '../../ui/Button';
import { Dotted, Explained, type Derivation } from '../../ui/Explained';
import { useToast } from '../../ui/Toast';
import { APP_VERSION } from '../../version';
import { kanbanExplain, kanbanFormat, type KanbanSaved } from './explain';
import { kanbanSheet } from './sheet';
import { calcInput, kanbanConclusion, kanbanReadingLines, kanbanWarnings } from './reading';

type Unit = KanbanSaved['unit'];
type Mode = KanbanSaved['mode'];
interface Raw {
  unit: Unit;
  mode: Mode;
  demand: string;
  wait: string;
  process: string;
  lead: string;
  safety: string;
  size: string;
}
const EMPTY: Raw = { unit: 'day', mode: 'split', demand: '', wait: '', process: '', lead: '', safety: '', size: '' };
// Ejemplo: «Westerville Auto Parts» de Krajewski, Ritzman y Malhotra (ficha 5) → 10 contenedores.
const EXAMPLE: Raw = { unit: 'day', mode: 'split', demand: '2000', wait: '0,08', process: '0,02', lead: '', safety: '10', size: '22' };
const UNITS: Unit[] = ['min', 'h', 'day'];

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { id: T; text: string; aria?: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <div role="group" aria-label={label} className="grid gap-1 rounded-[16px] bg-surface-2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            aria-label={o.aria}
            onClick={() => onChange(o.id)}
            className={`press min-h-11 rounded-[13px] px-2 py-1.5 text-center text-[14.5px] leading-tight font-semibold ${value === o.id ? 'raised-sm text-accent-ink' : 'text-muted'}`}
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

export default function KanbanTool() {
  const { t, lang } = useI18n();
  const d = t.tools.kanban;
  const toast = useToast();
  const saved = useSavedInput<KanbanSaved>();
  const txt = (v: number | undefined) => (v === undefined ? '' : toFieldText(v, lang));
  const [raw, setRaw] = useState<Raw>(() =>
    saved
      ? { unit: saved.unit, mode: saved.mode, demand: txt(saved.demand), wait: txt(saved.wait), process: txt(saved.process), lead: txt(saved.lead), safety: txt(saved.safetyPct), size: txt(saved.size) }
      : EMPTY,
  );
  const set = (patch: Partial<Raw>) => setRaw((s) => ({ ...s, ...patch }));

  const num = (k: keyof Raw) => parseDecimal(raw[k]);
  const s: KanbanSaved | null = (() => {
    const demand = num('demand');
    const safetyPct = num('safety');
    const size = num('size');
    if (demand === null || safetyPct === null || size === null) return null;
    if (raw.mode === 'split') {
      const wait = num('wait');
      const process = num('process');
      return wait === null || process === null ? null : { unit: raw.unit, mode: 'split', demand, wait, process, safetyPct, size };
    }
    const lead = num('lead');
    return lead === null ? null : { unit: raw.unit, mode: 'total', demand, lead, safetyPct, size };
  })();
  const out = s ? kanban(calcInput(s)) : null;
  const r = out?.result ?? null;
  const warnings = kanbanWarnings(out?.warnings ?? [], t);
  const f = kanbanFormat(lang, t, raw.unit);
  const u = d.units[raw.unit]!;
  const anyText = (['demand', 'wait', 'process', 'lead', 'safety', 'size'] as const).some((k) => raw[k].trim() !== '');
  const clear = () => {
    const previous = raw;
    setRaw({ ...EMPTY, unit: raw.unit, mode: raw.mode });
    toast(t.common.cleared, { action: { label: t.common.undo, onAction: () => setRaw(previous) } });
  };
  const field = (k: 'demand' | 'wait' | 'process' | 'lead' | 'safety' | 'size', unit: string, hint?: string) => (
    <div className="flex flex-col gap-1.5">
      <NumberField label={d[k]} unit={unit} value={raw[k]} invalidText={d.invalidNumber} onChange={(v) => set({ [k]: v })} />
      {hint && <p className="text-[13px] text-muted">{hint}</p>}
    </div>
  );

  const data = (
    <>
      <Segmented label={d.unitLabel} value={raw.unit} onChange={(v) => set({ unit: v })} options={UNITS.map((id) => ({ id, text: d.units[id]!, aria: d.unitNames[id] }))} />
      {field('demand', d.perUnit[raw.unit]!)}
      <Segmented
        label={d.mode}
        value={raw.mode}
        onChange={(v) => set({ mode: v })}
        options={[
          { id: 'split', text: d.modeSplit },
          { id: 'total', text: d.modeTotal },
        ]}
      />
      {raw.mode === 'split' ? (
        <>
          {field('wait', u, d.waitHint)}
          {field('process', u)}
        </>
      ) : (
        field('lead', u)
      )}
      {field('safety', '%', d.safetyHint)}
      {field('size', d.pieces)}
      {anyText && (
        <Button variant="ghost" icon={Eraser} className="self-start" onClick={clear}>
          {t.common.clear}
        </Button>
      )}
    </>
  );

  let result: ReactNode;
  if (!r || !s) {
    result =
      out && warnings.length > 0 ? (
        <div className="flex flex-col gap-2">
          {warnings.map((w) => (
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
    const ex = kanbanExplain(s, r, t, lang);
    result = (
      <div className="flex flex-col gap-4">
        <Explained calc={ex.cards!} className="flex flex-col items-start gap-1 self-start rounded-[14px]">
          <span className="text-[13px] font-semibold text-muted">
            <Dotted>{d.cardsLabel}</Dotted>
          </span>
          <span className="font-display text-[56px] leading-[0.95] font-bold tracking-[-0.035em] tabular-nums">{r.cards}</span>
        </Explained>
        <div className="grid grid-cols-2 gap-2">
          <Stat label={d.raw} value={f.raw(r.raw)} calc={ex.cards} />
          <Stat label={d.inCirculation} value={f.num(r.pieces)} calc={ex.pieces} />
          {ex.lead && <Stat label={d.leadLabel} value={f.time(calcInput(s).lead)} calc={ex.lead} />}
        </div>
      </div>
    );
  }

  const conclusion = r ? kanbanConclusion(r, t, lang) : '';
  const reading = r ? { conclusion, warnings, typicalError: d.typicalError } : null;
  const sheet = () =>
    s && r
      ? kanbanSheet(s, t, { reading: kanbanReadingLines(conclusion, warnings, t), version: APP_VERSION, date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB') })
      : null;
  const save = (): SavePayload | null => (s && r ? { input: s, headline: { key: 'kanban', value: r.cards, kind: 'number', decimals: 0, unit: d.cardsUnit } } : null);

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
              <dd className="text-right font-semibold">{st.key === 'raw' ? f.raw(st.value) : f.num(st.value)}</dd>
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
      onLoadExample={() => setRaw(EXAMPLE)}
      result={result}
      reading={reading}
      formula={formula}
      sheet={sheet}
      toolId="kanban"
      save={save}
    />
  );
}
