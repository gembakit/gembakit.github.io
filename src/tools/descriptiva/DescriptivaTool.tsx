import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, FlaskConical, TriangleAlert } from 'lucide-react';
import { useI18n } from '../../i18n';
import { descriptive, normalPdf } from '../../calc/descriptive';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Sheet } from '../../ui/Sheet';
import { Dotted, Explained } from '../../ui/Explained';
import { Histogram, LegendItem } from '../../ui/charts';
import { APP_VERSION } from '../../version';
import { ExampleOption, Stat, SubTitle } from '../form';
import { columnText, DataColumn, TextField, useColumn } from '../DataColumn';
import { descriptivaExplain, descriptivaFormat } from './explain';
import { descriptivaConclusion, descriptivaReadingLines, descriptivaWarnings } from './reading';
import { descriptivaSheet } from './sheet';
import { descriptivaName, readDescriptivaSaved, unitSuffix, type DescriptivaSaved } from './model';
import { MICHELSO } from './examples';

export default function DescriptivaTool() {
  const { t, lang } = useI18n();
  const d = t.tools.descriptiva;
  const savedInput = useSavedInput<unknown>();
  const initial = savedInput ? readDescriptivaSaved(savedInput) : null;
  const [text, setText] = useState(() => (initial ? columnText(initial.values, lang) : ''));
  const [name, setName] = useState(initial?.name ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? '');
  const [examplesOpen, setExamplesOpen] = useState(false);
  const closeExamples = useCallback(() => setExamplesOpen(false), []);
  const parsed = useColumn(text);
  const saved: DescriptivaSaved = useMemo(() => ({ v: 1, values: parsed.values, name: name.trim(), unit: unit.trim() }), [parsed.values, name, unit]);
  const out = useMemo(() => descriptive(saved.values), [saved.values]);
  const r = out.result;
  const f = descriptivaFormat(lang, saved.values, saved.unit);
  const warnings = descriptivaWarnings(out.warnings, saved, t, lang);
  const u = unitSuffix(saved.unit);

  const data = (
    <>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-[minmax(0,1fr)_8rem]">
        <TextField label={d.measured} value={name} placeholder={d.measuredPh} onChange={setName} />
        <TextField label={d.unit} value={unit} placeholder={d.unitPh} onChange={setUnit} maxLength={15} />
      </div>
      <DataColumn text={text} onChange={setText} />
      <Sheet open={examplesOpen} onClose={closeExamples} title={d.examples.title}>
        <ExampleOption
          icon={FlaskConical}
          title={d.examples.nist}
          hint={d.examples.nistHint}
          onPick={() => {
            setText(columnText(MICHELSO, lang));
            setName(d.exampleName);
            setUnit(d.exampleUnit);
            setExamplesOpen(false);
          }}
        />
      </Sheet>
    </>
  );

  let result: ReactNode;
  let figure: ReactNode = null;
  if (!r) {
    const problems = parsed.values.length ? warnings : [];
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
    const ex = descriptivaExplain(saved.values, r, saved.unit, t, lang);
    const normal = r.normality ? r.normality.p >= 0.05 : null;
    const width = r.bins.length ? r.bins[0]!.to - r.bins[0]!.from : 1;
    const label = descriptivaName(t, saved);
    figure = (
      <Histogram
        bins={r.bins}
        lang={lang}
        label={d.histLabel(label)}
        curve={r.sd > 0 ? (x) => r.n * width * normalPdf(x, r.mean, r.sd) : undefined}
        lines={[{ value: r.mean, label: d.legendMean, kind: 'mean' }]}
        binLabel={(b) => d.binText(f.raw(b.from), f.raw(b.to), b.count)}
        legend={
          <>
            <LegendItem kind="bar" label={d.legendBars} />
            {r.sd > 0 && <LegendItem kind="curve" label={d.legendCurve} />}
            <LegendItem kind="mean" label={d.legendMean} />
          </>
        }
      />
    );
    result = (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
          <Explained calc={ex.mean!} className="flex min-w-0 flex-col items-start gap-1 rounded-[14px]">
            <span className="text-[13px] font-semibold text-muted">
              <Dotted>{d.mean}</Dotted>
            </span>
            <span className="font-display text-[40px] leading-[0.95] font-bold tracking-[-0.03em] tabular-nums wrap-anywhere">{f.val(r.mean)}</span>
            {u && <span className="text-[13px] text-muted">{saved.unit}</span>}
          </Explained>
          <Explained calc={ex.sd!} className="flex min-w-0 flex-col items-start gap-1 rounded-[14px]">
            <span className="text-[13px] font-semibold text-muted">
              <Dotted>{d.sd}</Dotted>
            </span>
            <span className="font-display text-[40px] leading-[0.95] font-bold tracking-[-0.03em] tabular-nums wrap-anywhere">{f.val(r.sd)}</span>
            {u && <span className="text-[13px] text-muted">{saved.unit}</span>}
          </Explained>
        </div>
        {r.normality && ex.ad && (
          <Explained calc={ex.ad} className={`flex w-full items-start gap-2.5 rounded-[14px] p-3 text-left ${normal ? 'bg-ok-soft' : 'bg-warn-soft'}`}>
            {normal ? <CircleCheck aria-hidden size={19} className="mt-0.5 shrink-0 text-ok" /> : <TriangleAlert aria-hidden size={19} className="mt-0.5 shrink-0 text-warn" />}
            <span className="flex min-w-0 flex-col">
              <span className="text-[13px] font-semibold text-muted">
                <Dotted>{d.normality}</Dotted>
              </span>
              <span className="text-[15.5px] font-semibold">
                {normal ? d.normalYes : d.normalNo} · {d.pValue(f.p(r.normality.p))}
              </span>
            </span>
          </Explained>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Stat label={d.n} value={f.count(r.n)} calc={null} />
          <Stat label={d.median} value={f.val(r.median)} calc={ex.median} />
          {r.q1 !== null && <Stat label={d.q1} value={f.val(r.q1)} calc={ex.q1} />}
          {r.q3 !== null && <Stat label={d.q3} value={f.val(r.q3)} calc={ex.q3} />}
          <Stat label={d.min} value={f.raw(r.min)} calc={null} />
          <Stat label={d.max} value={f.raw(r.max)} calc={null} />
          <Stat label={d.range} value={f.val(r.range)} calc={null} />
          {r.iqr !== null && <Stat label={d.iqr} value={f.val(r.iqr)} calc={null} />}
          <Stat label={d.se} value={f.val(r.se)} calc={ex.se} />
          {r.skewness !== null && <Stat label={d.skewness} value={f.stat(r.skewness)} calc={null} />}
          {r.kurtosis !== null && <Stat label={d.kurtosis} value={f.stat(r.kurtosis)} calc={null} />}
        </div>
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <SubTitle>{d.histTitle}</SubTitle>
          {figure}
        </div>
      </div>
    );
  }

  const conclusion = r ? descriptivaConclusion(r, saved, t, lang) : '';
  const reading = r ? { conclusion, warnings, typicalError: d.typicalError } : null;
  const sheet = () =>
    r
      ? descriptivaSheet(saved, r, t, lang, {
          reading: descriptivaReadingLines(conclusion, warnings, t),
          version: APP_VERSION,
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB'),
        })
      : null;
  const save = (): SavePayload | null => (r ? { input: saved, headline: { key: 'mean', value: r.mean, kind: 'number', decimals: f.d, ...(saved.unit ? { unit: saved.unit } : {}) } } : null);
  const formula = (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1 font-semibold">
        {d.formula.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      {out.steps.length > 0 && (
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 tabular-nums">
          {out.steps.map((s) => (
            <div key={s.key} className="contents">
              <dt className="text-muted">{d.steps[s.key] ?? s.key}</dt>
              <dd className="text-right font-semibold">{s.key === 'n' ? f.count(s.value) : f.val(s.value)}</dd>
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
      figure={figure}
      toolId="descriptiva"
      save={save}
    />
  );
}
