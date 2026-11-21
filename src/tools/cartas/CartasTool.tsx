import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Droplets, Gauge, TriangleAlert } from 'lucide-react';
import { useI18n } from '../../i18n';
import { ALL_TESTS, DEFAULT_TESTS, type SpcTest } from '../../calc/spc';
import { parseDecimal } from '../../ui/number';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { NumberField } from '../../ui/NumberField';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Sheet } from '../../ui/Sheet';
import { LegendItem, SeriesChart } from '../../ui/charts';
import { APP_VERSION } from '../../version';
import { Check, ExampleOption, Hint, Segmented, Stat, SubTitle } from '../form';
import { columnText, DataColumn, TextField, useColumn } from '../DataColumn';
import { measuredName } from '../descriptiva/model';
import { cartasExplain } from './explain';
import { cartasConclusion, cartasFormat, cartasReadingLines, cartasWarnings, flaggedCount, runCharts, signalLines } from './reading';
import { cartasSheet } from './sheet';
import { FILL, FLOW, readCartasSaved, type CartasSaved, type ChartKind } from './model';

export default function CartasTool() {
  const { t, lang } = useI18n();
  const d = t.tools.cartas;
  const savedInput = useSavedInput<unknown>();
  const initial = savedInput ? readCartasSaved(savedInput) : null;
  const [kind, setKind] = useState<ChartKind>(initial?.kind ?? 'imr');
  const [text, setText] = useState(() => (initial ? columnText(initial.values, lang) : ''));
  const [name, setName] = useState(initial?.name ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? '');
  const [subgroup, setSubgroup] = useState(String(initial?.subgroup ?? 5));
  const [limitPoints, setLimitPoints] = useState(initial?.limitPoints ? String(initial.limitPoints) : '');
  const [tests, setTests] = useState<SpcTest[]>(initial?.tests ?? DEFAULT_TESTS);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const closeExamples = useCallback(() => setExamplesOpen(false), []);
  const parsed = useColumn(text);
  const saved: CartasSaved = useMemo(() => {
    const sg = parseDecimal(subgroup);
    const lp = parseDecimal(limitPoints);
    return {
      v: 1,
      kind,
      values: parsed.values,
      name: name.trim(),
      unit: unit.trim(),
      subgroup: sg !== null ? Math.round(sg) : 5,
      limitPoints: lp !== null && lp >= 2 ? Math.round(lp) : null,
      tests: [...tests].sort((a, b) => a - b),
    };
  }, [kind, parsed.values, name, unit, subgroup, limitPoints, tests]);
  const c = useMemo(() => runCharts(saved), [saved]);
  const f = cartasFormat(lang, saved);
  const warnings = cartasWarnings(c.out.warnings, t);
  const label = measuredName(saved.name, d.defaultName);
  const u = saved.unit ? ` ${saved.unit}` : '';

  const data = (
    <>
      <div className="flex flex-col gap-1.5">
        <Segmented label={d.kind} value={kind} options={(['imr', 'xbarr'] as const).map((k) => ({ value: k, label: d.kinds[k]! }))} onChange={setKind} />
        <Hint>{d.kindHint}</Hint>
      </div>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-[minmax(0,1fr)_8rem]">
        <TextField label={d.measured} value={name} placeholder={d.measuredPh} onChange={setName} />
        <TextField label={d.unit} value={unit} placeholder={d.unitPh} onChange={setUnit} maxLength={15} />
      </div>
      {kind === 'xbarr' && (
        <div className="flex flex-col gap-1.5">
          <NumberField compact label={d.subgroup} value={subgroup} invalidText={t.tools.pareto.invalidNumber} onChange={(v) => setSubgroup(v)} />
          <Hint>{d.subgroupHint}</Hint>
        </div>
      )}
      <DataColumn text={text} onChange={setText} hint={`${t.dataColumn.hint} ${t.tools.corrida.orderHint}`} />
      <div className="flex flex-col gap-1.5">
        <NumberField compact label={d.limitPoints} value={limitPoints} invalidText={t.tools.pareto.invalidNumber} onChange={(v) => setLimitPoints(v)} />
        <Hint>{d.limitPointsHint}</Hint>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-muted">{d.tests}</span>
        <Hint>{d.testsHint}</Hint>
        {ALL_TESTS.map((n) => (
          <Check key={n} label={d.testNames[String(n)]!} checked={tests.includes(n)} onChange={(on) => setTests((ts) => (on ? [...ts, n] : ts.filter((x) => x !== n)))} />
        ))}
      </div>
      <Sheet open={examplesOpen} onClose={closeExamples} title={d.examples.title}>
        <div className="flex flex-col gap-2.5">
          <ExampleOption
            icon={Gauge}
            title={d.examples.flow}
            hint={d.examples.flowHint}
            onPick={() => {
              setKind('imr');
              setText(columnText(FLOW, lang));
              setName(d.exampleData.flowName);
              setUnit('');
              setLimitPoints('');
              setExamplesOpen(false);
            }}
          />
          <ExampleOption
            icon={Droplets}
            title={d.examples.fill}
            hint={d.examples.fillHint}
            onPick={() => {
              setKind('xbarr');
              setSubgroup('5');
              setText(columnText(FILL, lang));
              setName(d.exampleData.fillName);
              setUnit(d.exampleData.fillUnit);
              setLimitPoints('19');
              setExamplesOpen(false);
            }}
          />
        </div>
      </Sheet>
    </>
  );

  const ok = c.out.result !== null;
  const signals = ok ? signalLines(c, t, lang) : [];
  const ex = ok ? cartasExplain(c, saved, t, lang) : null;
  let result: ReactNode;
  if (!ok || !ex) {
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
    const n = flaggedCount(c);
    const main =
      c.kind === 'imr'
        ? { values: c.out.result!.values as (number | null)[], lim: c.out.result!.individuals, sig: c.out.result!.signalsI, title: d.titleI, aria: d.chartI(label), text: d.pointText }
        : { values: c.out.result!.means as (number | null)[], lim: c.out.result!.xbar, sig: c.out.result!.signalsX, title: d.titleX, aria: d.chartX(label), text: d.groupText };
    const sec =
      c.kind === 'imr'
        ? { values: c.out.result!.mr, lim: c.out.result!.movingRange, sig: c.out.result!.signalsMR, title: d.titleMR, aria: d.chartMR, text: d.pointText }
        : { values: c.out.result!.ranges as (number | null)[], lim: c.out.result!.range, sig: c.out.result!.signalsR, title: d.titleR, aria: d.chartR, text: d.groupText };
    const legend = (
      <>
        <LegendItem kind="point" label={d.legendPoint} />
        {n > 0 && <LegendItem kind="flag" label={d.legendFlag} />}
        <LegendItem kind="center" label={d.legendCenter} />
        <LegendItem kind="limit" label={d.legendLimit} />
      </>
    );
    result = (
      <div className="flex flex-col gap-4">
        <p className={`flex items-start gap-2.5 rounded-[14px] p-3 ${n ? 'bg-warn-soft' : 'bg-ok-soft'}`}>
          {n ? <TriangleAlert aria-hidden size={19} className="mt-0.5 shrink-0 text-warn" /> : <CircleCheck aria-hidden size={19} className="mt-0.5 shrink-0 text-ok" />}
          <span className="text-[15.5px] font-semibold">{n ? d.unstable(n) : d.stable}</span>
        </p>
        <div className="grid grid-cols-1 gap-2 min-[440px]:grid-cols-3">
          <Stat label={d.ucl} value={f.val(main.lim.ucl)} calc={ex.ucl} />
          <Stat label={d.center} value={f.val(main.lim.center)} calc={ex.center} />
          <Stat label={d.lcl} value={f.val(main.lim.lcl)} calc={ex.lcl} />
        </div>
        <div className="flex flex-col gap-1.5">
          <SubTitle>{main.title}</SubTitle>
          <SeriesChart
            values={main.values}
            lang={lang}
            label={main.aria}
            lines={[
              { value: main.lim.center, label: d.center, kind: 'center' },
              { value: main.lim.ucl, label: d.ucl, kind: 'limit' },
              { value: main.lim.lcl, label: d.lcl, kind: 'limit' },
            ]}
            flags={new Set(main.sig.flatMap((s) => s.points))}
            pointLabel={(i, v) => main.text(i + 1, `${f.val(v)}${u}`)}
            legend={legend}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <SubTitle>{sec.title}</SubTitle>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={c.kind === 'imr' ? d.mrBar : d.rBar} value={f.val(sec.lim.center)} calc={ex.bar} />
            <Stat label={d.ucl} value={f.val(sec.lim.ucl)} calc={ex.secUcl} />
          </div>
          <SeriesChart
            values={sec.values}
            lang={lang}
            height={150}
            label={sec.aria}
            lines={[
              { value: sec.lim.center, label: d.center, kind: 'center' },
              { value: sec.lim.ucl, label: d.ucl, kind: 'limit' },
              ...(sec.lim.lcl > 0 ? [{ value: sec.lim.lcl, label: d.lcl, kind: 'limit' as const }] : []),
            ]}
            flags={new Set(sec.sig.flatMap((s) => s.points))}
            pointLabel={(i, v) => sec.text(i + 1, `${f.val(v)}${u}`)}
          />
        </div>
        {signals.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <SubTitle>{d.signals}</SubTitle>
            {signals.map((s) => (
              <p key={s} className="flex items-start gap-2.5 rounded-[14px] bg-warn-soft p-3 text-[14.5px]">
                <TriangleAlert aria-hidden size={18} className="mt-0.5 shrink-0 text-warn" />
                <span>{s}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  const conclusion = ok ? cartasConclusion(c, saved, t, lang) : '';
  const reading = ok ? { conclusion, warnings: [...signals, ...warnings], typicalError: d.typicalError } : null;
  const sheet = () =>
    ok
      ? cartasSheet(saved, c, t, {
          reading: cartasReadingLines(conclusion, signals, warnings, t),
          version: APP_VERSION,
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB'),
        })
      : null;
  const save = (): SavePayload | null => (ok ? { input: saved, headline: { key: 'signals', value: flaggedCount(c), kind: 'number', decimals: 0 } } : null);
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
      hasData={ok}
      onLoadExample={() => setExamplesOpen(true)}
      result={result}
      reading={reading}
      formula={formula}
      sheet={sheet}
      toolId="cartas"
      save={save}
    />
  );
}
