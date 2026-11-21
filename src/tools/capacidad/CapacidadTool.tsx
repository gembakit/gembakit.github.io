import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, CircleX, Gauge, TriangleAlert } from 'lucide-react';
import { useI18n } from '../../i18n';
import { capability } from '../../calc/capability';
import { normalPdf, histogramBins } from '../../calc/descriptive';
import { parseDecimal, toFieldText } from '../../ui/number';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { NumberField } from '../../ui/NumberField';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Sheet } from '../../ui/Sheet';
import { Dotted, Explained } from '../../ui/Explained';
import { Histogram, LegendItem, type RefLine } from '../../ui/charts';
import { APP_VERSION } from '../../version';
import { ExampleOption, Hint, Stat, SubTitle } from '../form';
import { columnText, DataColumn, TextField, useColumn } from '../DataColumn';
import { measuredName } from '../descriptiva/model';
import { capacidadExplain, capacidadFormat } from './explain';
import { capacidadConclusion, capacidadReadingLines, capacidadWarnings } from './reading';
import { capacidadSheet } from './sheet';
import { FLOW_EXAMPLE, readCapacidadSaved, toCapabilityInput, verdict, type CapacidadSaved } from './model';

export default function CapacidadTool() {
  const { t, lang } = useI18n();
  const d = t.tools.capacidad;
  const savedInput = useSavedInput<unknown>();
  const initial = savedInput ? readCapacidadSaved(savedInput) : null;
  const txt = (v: number | null | undefined) => (v === null || v === undefined ? '' : toFieldText(v, lang));
  const [text, setText] = useState(() => (initial ? columnText(initial.values, lang) : ''));
  const [name, setName] = useState(initial?.name ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? '');
  const [lsl, setLsl] = useState(txt(initial?.lsl));
  const [usl, setUsl] = useState(txt(initial?.usl));
  const [target, setTarget] = useState(txt(initial?.target));
  const [subgroup, setSubgroup] = useState(initial ? String(initial.subgroup) : '1');
  const [examplesOpen, setExamplesOpen] = useState(false);
  const closeExamples = useCallback(() => setExamplesOpen(false), []);
  const parsed = useColumn(text);
  const saved: CapacidadSaved = useMemo(() => {
    const sg = parseDecimal(subgroup);
    return {
      v: 1,
      values: parsed.values,
      name: name.trim(),
      unit: unit.trim(),
      lsl: parseDecimal(lsl),
      usl: parseDecimal(usl),
      target: parseDecimal(target),
      subgroup: sg !== null && sg >= 1 ? Math.round(sg) : 1,
    };
  }, [parsed.values, name, unit, lsl, usl, target, subgroup]);
  const out = useMemo(() => capability(toCapabilityInput(saved)), [saved]);
  const r = out.result;
  const f = capacidadFormat(lang, saved);
  const warnings = capacidadWarnings(out.warnings, saved, t, lang);

  const data = (
    <>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-[minmax(0,1fr)_8rem]">
        <TextField label={d.measured} value={name} placeholder={d.measuredPh} onChange={setName} />
        <TextField label={d.unit} value={unit} placeholder={d.unitPh} onChange={setUnit} maxLength={15} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted">{d.specs}</span>
        <Hint>{d.specsHint}</Hint>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField compact label={d.lsl} value={lsl} invalidText={t.tools.pareto.invalidNumber} onChange={(v) => setLsl(v)} />
        <NumberField compact label={d.usl} value={usl} invalidText={t.tools.pareto.invalidNumber} onChange={(v) => setUsl(v)} />
      </div>
      <NumberField compact label={d.target} value={target} invalidText={t.tools.pareto.invalidNumber} onChange={(v) => setTarget(v)} />
      <div className="flex flex-col gap-1.5">
        <NumberField compact label={d.subgroup} value={subgroup} invalidText={t.tools.pareto.invalidNumber} onChange={(v) => setSubgroup(v)} />
        <Hint>{d.subgroupHint}</Hint>
      </div>
      <DataColumn text={text} onChange={setText} />
      <Sheet open={examplesOpen} onClose={closeExamples} title={d.examples.title}>
        <ExampleOption
          icon={Gauge}
          title={d.examples.flow}
          hint={d.examples.flowHint}
          onPick={() => {
            setText(columnText(FLOW_EXAMPLE.values, lang));
            setName(d.exampleName);
            setUnit('');
            setLsl(txt(FLOW_EXAMPLE.lsl));
            setUsl(txt(FLOW_EXAMPLE.usl));
            setTarget(txt(FLOW_EXAMPLE.target));
            setSubgroup('1');
            setExamplesOpen(false);
          }}
        />
      </Sheet>
    </>
  );

  let result: ReactNode;
  if (!r) {
    const show = parsed.values.length > 0 || lsl.trim() || usl.trim();
    result =
      show && warnings.length ? (
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
    const ex = capacidadExplain(saved, r, t, lang);
    const v = verdict(r.within.cpk);
    const bins = histogramBins(saved.values);
    const width = bins.length ? bins[0]!.to - bins[0]!.from : 1;
    const lines: RefLine[] = [
      ...(saved.lsl !== null ? [{ value: saved.lsl, label: d.lsl, kind: 'spec' as const }] : []),
      ...(saved.usl !== null ? [{ value: saved.usl, label: d.usl, kind: 'spec' as const }] : []),
      ...(saved.target !== null ? [{ value: saved.target, label: d.target, kind: 'target' as const }] : []),
    ];
    const tone = v === 'good' ? 'bg-ok-soft' : v === 'marginal' ? 'bg-warn-soft' : 'bg-bad-soft';
    const Icon = v === 'good' ? CircleCheck : v === 'marginal' ? TriangleAlert : CircleX;
    const iconTone = v === 'good' ? 'text-ok' : v === 'marginal' ? 'text-warn' : 'text-bad';
    result = (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Explained calc={ex.cpk!} className="flex min-w-0 flex-col items-start gap-1 rounded-[14px]">
            <span className="text-[13px] font-semibold text-muted">
              <Dotted>Cpk</Dotted>
            </span>
            <span className="font-display text-[44px] leading-[0.95] font-bold tracking-[-0.03em] tabular-nums">{f.idx(r.within.cpk)}</span>
            <span className="text-[12.5px] text-muted">{d.shortTerm}</span>
          </Explained>
          <Explained calc={ex.ppk!} className="flex min-w-0 flex-col items-start gap-1 rounded-[14px]">
            <span className="text-[13px] font-semibold text-muted">
              <Dotted>Ppk</Dotted>
            </span>
            <span className="font-display text-[44px] leading-[0.95] font-bold tracking-[-0.03em] tabular-nums">{f.idx(r.overall.cpk)}</span>
            <span className="text-[12.5px] text-muted">{d.longTerm}</span>
          </Explained>
        </div>
        <p className={`flex items-start gap-2.5 rounded-[14px] p-3 ${tone}`}>
          <Icon aria-hidden size={19} className={`mt-0.5 shrink-0 ${iconTone}`} />
          <span className="flex flex-col">
            <span className="text-[15.5px] font-semibold">{v === 'good' ? d.verdictGood : v === 'marginal' ? d.verdictMarginal : d.verdictBad}</span>
            <span className="text-[13.5px] text-muted">{d.verdictHint(f.idx(r.within.cpk))}</span>
          </span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {r.within.cp !== null && <Stat label="Cp" value={f.idx(r.within.cp)} calc={ex.cp} />}
          {r.overall.cp !== null && <Stat label="Pp" value={f.idx(r.overall.cp)} calc={ex.pp} />}
          {r.cpm !== null && <Stat label="Cpm" value={f.idx(r.cpm)} calc={ex.cpm} />}
          <Stat label={d.mean} value={f.val(r.mean)} calc={null} />
          <Stat label={d.sigmaWithin} value={f.val(r.sigmaWithin)} calc={ex.sigmaWithin} />
          <Stat label={d.sigmaOverall} value={f.val(r.sigmaOverall)} calc={ex.sigmaOverall} />
          <Stat label={d.ppmWithin} value={f.ppm(r.within.ppmTotal)} calc={null} />
          <Stat label={d.ppmOverall} value={f.ppm(r.overall.ppmTotal)} calc={ex.ppm} />
          <Stat label={d.ppmObserved} value={f.ppm(r.observedPpm)} calc={null} />
        </div>
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <SubTitle>{t.tools.descriptiva.histTitle}</SubTitle>
          <Histogram
            bins={bins}
            lang={lang}
            label={d.histLabel(measuredName(saved.name, d.defaultName))}
            curve={(x) => r.n * width * normalPdf(x, r.mean, r.sigmaOverall)}
            lines={lines}
            binLabel={(b) => t.tools.descriptiva.binText(f.raw(b.from), f.raw(b.to), b.count)}
            legend={
              <>
                <LegendItem kind="bar" label={t.tools.descriptiva.legendBars} />
                <LegendItem kind="curve" label={t.tools.descriptiva.legendCurve} />
                <LegendItem kind="spec" label={d.legendSpec} />
                {saved.target !== null && <LegendItem kind="target" label={d.legendTarget} />}
              </>
            }
          />
        </div>
      </div>
    );
  }

  const conclusion = r ? capacidadConclusion(r, saved, t, lang) : '';
  const reading = r ? { conclusion, warnings, typicalError: d.typicalError } : null;
  const sheet = () =>
    r
      ? capacidadSheet(saved, r, t, {
          reading: capacidadReadingLines(conclusion, warnings, t),
          version: APP_VERSION,
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB'),
        })
      : null;
  const save = (): SavePayload | null => (r ? { input: saved, headline: { key: 'cpk', value: r.within.cpk, kind: 'number', decimals: 2 } } : null);
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
      toolId="capacidad"
      save={save}
    />
  );
}
