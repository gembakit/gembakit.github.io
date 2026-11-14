import { useMemo, useState, type ReactNode } from 'react';
import { CircleAlert, Eraser } from 'lucide-react';
import { useI18n } from '../../i18n';
import { dpmo, type DpmoInput } from '../../calc/dpmo';
import type { CalcWarning } from '../../calc/types';
import { parseDecimal, toFieldText } from '../../ui/number';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { NumberField } from '../../ui/NumberField';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Button } from '../../ui/Button';
import { Dotted, Explained, type Derivation } from '../../ui/Explained';
import { findTerm } from '../../reference/glossary';
import { useToast } from '../../ui/Toast';
import { APP_VERSION } from '../../version';
import { dpmoSheet } from './sheet';
import { dpmoExplain, dpmoFormat } from './explain';

// Ejemplo: el caso publicado de Learn Lean Sigma (ficha 1): 1.000 unidades,
// 5 oportunidades, 50 defectos → DPMO 10.000.
const EXAMPLE = { units: '1000', opportunities: '5', defects: '50' };
const EMPTY = { units: '', opportunities: '', defects: '' };
type Field = keyof DpmoInput;
const FIELDS: Field[] = ['units', 'opportunities', 'defects'];

/** Tarjeta de un valor: entera tocable si hay de dónde sale. */
function Stat({ label, value, calc }: { label: ReactNode; value: string; calc: Derivation | null }) {
  const body = (
    <>
      <span className="text-[13px] font-semibold text-muted">{calc ? <Dotted>{label}</Dotted> : label}</span>
      <span className="font-display text-[19px] font-bold tabular-nums wrap-anywhere">{value}</span>
    </>
  );
  const cls = 'flex min-w-0 flex-col gap-0.5 rounded-[14px] bg-surface-2 p-3';
  return calc ? <Explained calc={calc} className={`${cls} w-full`}>{body}</Explained> : <div className={cls}>{body}</div>;
}

const termOf = (id: string, lang: 'es' | 'en') => findTerm(id)?.[lang].term ?? id;

export default function DpmoTool() {
  const { t, lang } = useI18n();
  const d = t.tools.dpmo;
  const toast = useToast();
  // Medición guardada: arranca con sus datos.
  const savedInput = useSavedInput<DpmoInput>();
  const [raw, setRaw] = useState(() =>
    savedInput
      ? { units: toFieldText(savedInput.units, lang), opportunities: toFieldText(savedInput.opportunities, lang), defects: toFieldText(savedInput.defects, lang) }
      : EMPTY,
  );

  const parsed = useMemo(() => {
    const p = FIELDS.map((f) => parseDecimal(raw[f]));
    return p.every((x) => x !== null) ? { units: p[0]!, opportunities: p[1]!, defects: p[2]! } : null;
  }, [raw]);
  const out = useMemo(() => (parsed ? dpmo(parsed) : null), [parsed]);
  const r = out?.result ?? null;
  const anyText = FIELDS.some((f) => raw[f].trim() !== '');

  // Los mismos formatos que la ventana de «de dónde sale»: nunca enseñan cifras distintas.
  const fmt = dpmoFormat(lang);
  const num = fmt.num;
  const sig = fmt.dpu;
  const fmtDpmo = fmt.dpmo;
  const fieldName = (f: string) => (f in d ? (d[f as Field] as string) : f);

  const warningText = (w: CalcWarning): string | null => {
    switch (w.code) {
      case 'not-whole':
        return d.warn.notWhole(fieldName(w.field));
      case 'not-positive':
        return d.warn.notPositive(fieldName(w.field));
      case 'negative':
        return d.warn.negative(fieldName(w.field));
      case 'defects-exceed-opportunities':
        return d.warn.exceed;
      case 'zero-defects':
        return d.warn.zeroDefects;
      case 'all-defects':
        return d.warn.allDefects;
      default:
        return null;
    }
  };
  const warnings = (out?.warnings ?? []).map(warningText).filter((x): x is string => x !== null);

  const clear = () => {
    const previous = raw;
    setRaw(EMPTY);
    toast(t.common.cleared, { action: { label: t.common.undo, onAction: () => setRaw(previous) } });
  };

  const data = (
    <>
      <NumberField label={d.units} value={raw.units} invalidText={d.invalidNumber} onChange={(v) => setRaw((s) => ({ ...s, units: v }))} />
      <NumberField
        label={d.opportunities}
        value={raw.opportunities}
        invalidText={d.invalidNumber}
        onChange={(v) => setRaw((s) => ({ ...s, opportunities: v }))}
      />
      <div className="flex flex-col gap-1.5">
        <NumberField label={d.defects} value={raw.defects} invalidText={d.invalidNumber} onChange={(v) => setRaw((s) => ({ ...s, defects: v }))} />
        <p className="text-[13px] text-muted">{d.defectsHint}</p>
      </div>
      {anyText && (
        <Button variant="ghost" icon={Eraser} className="self-start" onClick={clear}>
          {t.common.clear}
        </Button>
      )}
    </>
  );

  let result: ReactNode;
  if (!r) {
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
    // Cada valor se toca y enseña de dónde sale, con estos números.
    const ex = dpmoExplain(parsed!, r, t, lang);
    result = (
      <div className="flex flex-col gap-3.5">
        {r.sigmaLevel !== null && ex.sigma ? (
          <div className="flex flex-col items-start gap-1">
            <Explained calc={ex.sigma} className="flex flex-col gap-1 rounded-[14px]">
              <span className="text-[13px] font-semibold text-muted">
                <Dotted>{termOf('nivel-sigma', lang)}</Dotted>
              </span>
              <span className="font-display text-[56px] leading-[0.95] font-bold tracking-[-0.035em] tabular-nums">{num(r.sigmaLevel, 2)}</span>
            </Explained>
            <Explained calc={ex.dpmo!} className="rounded-[10px] text-[16px] tabular-nums">
              <span className="font-display text-[22px] font-bold">{fmtDpmo(r.dpmo)}</span> <Dotted>DPMO</Dotted>
            </Explained>
          </div>
        ) : (
          <Explained calc={ex.dpmo!} className="flex flex-col items-start gap-1 self-start rounded-[14px]">
            <span className="text-[13px] font-semibold text-muted">
              <Dotted>DPMO</Dotted>
            </span>
            <span className="font-display text-[56px] leading-[0.95] font-bold tracking-[-0.035em] tabular-nums">{fmtDpmo(r.dpmo)}</span>
          </Explained>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Stat label="DPU" value={sig(r.dpu)} calc={ex.dpu} />
          <Stat label="DPO" value={sig(r.dpo)} calc={ex.dpo} />
          <Stat label={d.yieldLabel} value={`${num(r.yield * 100, 4)} %`} calc={ex.yield} />
          <Stat label={termOf('z-proceso', lang)} value={r.zLongTerm === null ? '—' : num(r.zLongTerm, 4)} calc={ex.z} />
        </div>
      </div>
    );
  }

  const conclusion = r
    ? r.sigmaLevel !== null
      ? `${d.conclusion(fmtDpmo(r.dpmo), num(r.sigmaLevel, 2))} ${d.shiftNote(num(r.zLongTerm!, 4))}`
      : d.conclusionNoSigma(fmtDpmo(r.dpmo))
    : '';
  const reading = r ? { conclusion, warnings, typicalError: d.typicalError } : null;

  // La hoja lleva la misma lectura que la pantalla.
  const sheet = () =>
    parsed && r
      ? dpmoSheet(parsed, t, {
          reading: [
            { tone: 'conclusion', text: conclusion },
            ...warnings.map((w) => ({ tone: 'warning' as const, text: w })),
            { tone: 'tip', text: d.typicalError },
          ],
          version: APP_VERSION,
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB'),
        })
      : null;

  // Para guardar en un proyecto: los datos y el número principal (el nivel sigma o, sin él, el DPMO).
  const save = (): SavePayload | null =>
    parsed && r
      ? {
          input: parsed,
          headline:
            r.sigmaLevel !== null
              ? { key: 'sigmaLevel', value: r.sigmaLevel, kind: 'number', decimals: 2 }
              : { key: 'dpmo', value: r.dpmo, kind: 'number', decimals: r.dpmo >= 100 ? 0 : 2 },
        }
      : null;

  const stepLabel = (key: string) => (key in d.steps ? d.steps[key as keyof typeof d.steps] : key);
  const stepValue = (key: string, v: number) =>
    key === 'opportunitiesTotal' ? num(v, 0) : key === 'dpmo' ? fmtDpmo(v) : key === 'dpu' || key === 'dpo' ? sig(v) : num(v, 4);
  const formula = (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1 font-semibold">
        {d.formula.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      {out && out.steps.length > 0 && (
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 tabular-nums">
          {out.steps.map((s) => (
            <div key={s.key} className="contents">
              <dt className="text-muted">{stepLabel(s.key)}</dt>
              <dd className="text-right font-semibold">{stepValue(s.key, s.value)}</dd>
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
      toolId="dpmo"
      save={save}
    />
  );
}
