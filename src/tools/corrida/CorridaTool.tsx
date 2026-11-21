import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Timer, TriangleAlert } from 'lucide-react';
import { useI18n } from '../../i18n';
import { runChart, type RunChartResult } from '../../calc/runchart';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Sheet } from '../../ui/Sheet';
import type { Derivation } from '../../ui/Explained';
import { LegendItem, SeriesChart } from '../../ui/charts';
import { frac, plus, times } from '../../ui/expr';
import { formatNumber } from '../../ui/number';
import { APP_VERSION } from '../../version';
import { ExampleOption, Stat, SubTitle } from '../form';
import { columnText, DataColumn, TextField, useColumn } from '../DataColumn';
import { measuredName } from '../descriptiva/model';
import { corridaConclusion, corridaFormat, corridaReadingLines, corridaWarnings, signalTexts } from './reading';
import { corridaSheet } from './sheet';
import { CHANGEOVER_EXAMPLE, readCorridaSaved, type CorridaSaved } from './model';

/** De dónde salen las corridas esperadas por azar. */
function expectedExplain(r: RunChartResult, t: import('../../i18n').Messages, lang: 'es' | 'en'): Derivation | null {
  if (r.expectedRuns === null) return null;
  const d = t.tools.corrida;
  const x = d.explain;
  const n1 = formatNumber(r.above, lang, 0);
  const n2 = formatNumber(r.below, lang, 0);
  return {
    title: d.expected,
    meaning: x.expMeaning,
    lhs: 'E',
    steps: [plus('1', frac(times('2', x.n1Sym, x.n2Sym), plus(x.n1Sym, x.n2Sym))), plus('1', frac(times('2', n1, n2), plus(n1, n2))), formatNumber(r.expectedRuns, lang, 1)],
    where: [
      { sym: x.n1Sym, label: x.n1Label, value: n1 },
      { sym: x.n2Sym, label: x.n2Label, value: n2 },
    ],
    notes: [t.explain.rounded],
  };
}

export default function CorridaTool() {
  const { t, lang } = useI18n();
  const d = t.tools.corrida;
  const savedInput = useSavedInput<unknown>();
  const initial = savedInput ? readCorridaSaved(savedInput) : null;
  const [text, setText] = useState(() => (initial ? columnText(initial.values, lang) : ''));
  const [name, setName] = useState(initial?.name ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? '');
  const [examplesOpen, setExamplesOpen] = useState(false);
  const closeExamples = useCallback(() => setExamplesOpen(false), []);
  const parsed = useColumn(text);
  const saved: CorridaSaved = useMemo(() => ({ v: 1, values: parsed.values, name: name.trim(), unit: unit.trim() }), [parsed.values, name, unit]);
  const out = useMemo(() => runChart(saved.values), [saved.values]);
  const r = out.result;
  const f = corridaFormat(lang, saved);
  const warnings = corridaWarnings(out.warnings, t);

  const data = (
    <>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-[minmax(0,1fr)_8rem]">
        <TextField label={d.measured} value={name} placeholder={d.measuredPh} onChange={setName} />
        <TextField label={d.unit} value={unit} placeholder={d.unitPh} onChange={setUnit} maxLength={15} />
      </div>
      <DataColumn text={text} onChange={setText} hint={`${t.dataColumn.hint} ${d.orderHint}`} />
      <Sheet open={examplesOpen} onClose={closeExamples} title={d.examples.title}>
        <ExampleOption
          icon={Timer}
          title={d.examples.changeover}
          hint={d.examples.changeoverHint}
          onPick={() => {
            setText(columnText(CHANGEOVER_EXAMPLE, lang));
            setName(d.exampleData.name);
            setUnit(d.exampleData.unit);
            setExamplesOpen(false);
          }}
        />
      </Sheet>
    </>
  );

  const signals = r ? signalTexts(r, t, lang) : [];
  let result: ReactNode;
  let figure: ReactNode = null;
  if (!r) {
    result =
      warnings.length && parsed.values.length ? (
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
    const label = measuredName(saved.name, d.defaultName);
    const exp = expectedExplain(r, t, lang);
    figure = (
      <SeriesChart
        values={saved.values}
        lang={lang}
        label={d.chartLabel(label)}
        lines={[{ value: r.median, label: d.legendMedian, kind: 'center' }]}
        flags={new Set(r.flagged)}
        pointLabel={(i, v) => d.pointText(i + 1, `${f.raw(v)}${saved.unit ? ` ${saved.unit}` : ''}`)}
        legend={
          <>
            <LegendItem kind="point" label={d.legendPoint} />
            {r.flagged.length > 0 && <LegendItem kind="flag" label={d.legendFlag} />}
            <LegendItem kind="center" label={d.legendMedian} />
          </>
        }
      />
    );
    result = (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <Stat label={d.median} value={`${f.val(r.median)}${saved.unit ? ` ${saved.unit}` : ''}`} calc={null} />
          <Stat label={d.runs} value={f.count(r.runs)} calc={null} />
          <Stat label={d.useful} value={f.count(r.useful)} calc={null} />
          {r.expectedRuns !== null && <Stat label={d.expected} value={formatNumber(r.expectedRuns, lang, 1)} calc={exp} />}
        </div>
        {figure}
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <SubTitle>{d.signals}</SubTitle>
          {signals.length === 0 ? (
            <p className="flex items-start gap-2.5 rounded-[14px] bg-ok-soft p-3 text-[14.5px]">
              <CircleCheck aria-hidden size={18} className="mt-0.5 shrink-0 text-ok" />
              <span>{d.noSignals}</span>
            </p>
          ) : (
            signals.map((s) => (
              <p key={s} className="flex items-start gap-2.5 rounded-[14px] bg-warn-soft p-3 text-[14.5px]">
                <TriangleAlert aria-hidden size={18} className="mt-0.5 shrink-0 text-warn" />
                <span>{s}</span>
              </p>
            ))
          )}
        </div>
      </div>
    );
  }

  const conclusion = r ? corridaConclusion(r, saved, t, lang) : '';
  const reading = r ? { conclusion, warnings: [...signals, ...warnings], typicalError: d.typicalError } : null;
  const sheet = () =>
    r
      ? corridaSheet(saved, t, {
          reading: corridaReadingLines(conclusion, signals, warnings, t),
          version: APP_VERSION,
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB'),
        })
      : null;
  const save = (): SavePayload | null => (r ? { input: saved, headline: { key: 'median', value: r.median, kind: 'number', decimals: f.d, ...(saved.unit ? { unit: saved.unit } : {}) } } : null);
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
      figure={figure}
      toolId="corrida"
      save={save}
    />
  );
}
