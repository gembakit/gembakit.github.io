import { useMemo, useState, type ReactNode } from 'react';
import { CircleAlert, Eraser } from 'lucide-react';
import { useI18n } from '../../i18n';
import { oee, type OeeInput } from '../../calc/oee';
import { parseDecimal, toFieldText } from '../../ui/number';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { NumberField } from '../../ui/NumberField';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Button } from '../../ui/Button';
import { Dotted, Explained, type Derivation } from '../../ui/Explained';
import { useToast } from '../../ui/Toast';
import { APP_VERSION } from '../../version';
import { oeeExplain, oeeFormat } from './explain';
import { oeeSheet } from './sheet';
import { oeeConclusion, oeeReadingLines, oeeWarnings } from './reading';

type Field = keyof OeeInput;
const FIELDS: Field[] = ['shift', 'plannedStops', 'unplannedStops', 'idealCycle', 'total', 'rejects'];
type Raw = Record<Field, string>;
const EMPTY: Raw = { shift: '', plannedStops: '', unplannedStops: '', idealCycle: '', total: '', rejects: '' };
// Ejemplo: el caso publicado de Vorne (ficha 4) → OEE 74,79 %.
const EXAMPLE: Raw = { shift: '480', plannedStops: '60', unplannedStops: '47', idealCycle: '1', total: '19271', rejects: '423' };

function Stat({ label, value, calc }: { label: string; value: string; calc: Derivation }) {
  return (
    <Explained calc={calc} className="flex w-full min-w-0 flex-col gap-0.5 rounded-[14px] bg-surface-2 p-3">
      <span className="text-[13px] font-semibold text-muted">
        <Dotted>{label}</Dotted>
      </span>
      <span className="font-display text-[19px] font-bold tabular-nums wrap-anywhere">{value}</span>
    </Explained>
  );
}

const SEGMENTS = [
  { key: 'useful', color: 'bg-accent' },
  { key: 'downtime', color: 'bg-bad' },
  { key: 'speed', color: 'bg-warn' },
  { key: 'quality', color: 'bg-muted' },
] as const;

export default function OeeTool() {
  const { t, lang } = useI18n();
  const d = t.tools.oee;
  const toast = useToast();
  const saved = useSavedInput<OeeInput>();
  const [raw, setRaw] = useState<Raw>(() => (saved ? (Object.fromEntries(FIELDS.map((k) => [k, toFieldText(saved[k], lang)])) as Raw) : EMPTY));
  const parsed = useMemo(() => {
    const p = FIELDS.map((k) => parseDecimal(raw[k]));
    return p.every((x) => x !== null) ? (Object.fromEntries(FIELDS.map((k, i) => [k, p[i]!])) as unknown as OeeInput) : null;
  }, [raw]);
  const out = useMemo(() => (parsed ? oee(parsed) : null), [parsed]);
  const r = out?.result ?? null;
  const warnings = oeeWarnings(out?.warnings ?? [], t);
  const f = oeeFormat(lang);
  const anyText = FIELDS.some((k) => raw[k].trim() !== '');
  const field = (k: Field, unit: string, hint?: string) => (
    <div key={k} className="flex flex-col gap-1.5">
      <NumberField label={d[k]} unit={unit} value={raw[k]} invalidText={d.invalidNumber} onChange={(v) => setRaw((s) => ({ ...s, [k]: v }))} />
      {hint && <p className="text-[13px] text-muted">{hint}</p>}
    </div>
  );
  const clear = () => {
    const previous = raw;
    setRaw(EMPTY);
    toast(t.common.cleared, { action: { label: t.common.undo, onAction: () => setRaw(previous) } });
  };

  const data = (
    <>
      {field('shift', d.min)}
      {field('plannedStops', d.min, d.plannedHint)}
      {field('unplannedStops', d.min, d.unplannedHint)}
      {field('idealCycle', d.sPerPiece, d.idealHint)}
      {field('total', d.pieces)}
      {field('rejects', d.pieces)}
      {anyText && (
        <Button variant="ghost" icon={Eraser} className="self-start" onClick={clear}>
          {t.common.clear}
        </Button>
      )}
    </>
  );

  let result: ReactNode;
  if (!r || !parsed) {
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
    const ex = oeeExplain(parsed, r, t, lang);
    const share = (m: number) => `${Math.max(0, (m / r.planned) * 100)}%`;
    const explainOf: Partial<Record<(typeof SEGMENTS)[number]['key'], Derivation>> = { useful: ex.useful, speed: ex.speed, quality: ex.qualityLoss };
    result = (
      <div className="flex flex-col gap-4">
        <Explained calc={ex.oee} className="flex flex-col items-start gap-1 self-start rounded-[14px]">
          <span className="text-[13px] font-semibold text-muted">
            <Dotted>OEE</Dotted>
          </span>
          <span className="font-display text-[56px] leading-[0.95] font-bold tracking-[-0.035em] tabular-nums">{f.pct(r.oee)}</span>
        </Explained>
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
          <Stat label={d.availability} value={f.pct(r.availability)} calc={ex.availability} />
          <Stat label={d.performance} value={f.pct(r.performance)} calc={ex.performance} />
          <Stat label={d.quality} value={f.pct(r.quality)} calc={ex.quality} />
        </div>
        <div className="flex flex-col gap-2.5">
          <h3 className="text-[13px] font-semibold text-muted">{d.timeSplit}</h3>
          <span aria-hidden className="flex h-4 overflow-hidden rounded-full bg-surface-2">
            {SEGMENTS.map((s) => (
              <span key={s.key} className={`h-full ${s.color}`} style={{ width: share(r.minutes[s.key]) }} />
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
                  <span className="shrink-0 font-semibold tabular-nums">{f.min(r.minutes[s.key])}</span>
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
        <p className="text-[13px] leading-relaxed text-muted">
          {d.reference} {d.referenceSource}
        </p>
      </div>
    );
  }

  const conclusion = r ? oeeConclusion(r, t, lang) : '';
  const reading = r ? { conclusion, warnings, typicalError: d.typicalError } : null;
  const sheet = () =>
    parsed && r
      ? oeeSheet(parsed, t, {
          reading: oeeReadingLines(conclusion, warnings, t),
          version: APP_VERSION,
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB'),
        })
      : null;
  const save = (): SavePayload | null => (parsed && r ? { input: parsed, headline: { key: 'oee', value: r.oee, kind: 'percent', decimals: 1 } } : null);

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
      onLoadExample={() => setRaw(EXAMPLE)}
      result={result}
      reading={reading}
      formula={formula}
      sheet={sheet}
      toolId="oee"
      save={save}
    />
  );
}
