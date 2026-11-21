import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Flag, Pause, Play, Timer, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { descriptive } from '../../calc/descriptive';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Button, IconButton } from '../../ui/Button';
import { Sheet } from '../../ui/Sheet';
import { LegendItem, SeriesChart } from '../../ui/charts';
import { useToast } from '../../ui/Toast';
import { APP_VERSION } from '../../version';
import { ExampleOption, Hint, Stat, SubTitle } from '../form';
import { TextField } from '../DataColumn';
import { descriptivaExplain } from '../descriptiva/explain';
import { clock, cronoExample, cronoReading, cronoSheet, durations, readCronoSaved, seconds, type CronoSaved, type Lap } from './model';

// Lo que se está cronometrando se guarda en el teléfono a cada toque: si la
// app se cierra sin querer, al volver sigue donde estaba.
const LIVE = 'gk.crono';
interface Live {
  name: string;
  laps: Lap[];
  /** Inicio del ciclo en marcha, o null si está parado. */
  current: number | null;
}
function loadLive(): Live | null {
  try {
    const x = JSON.parse(localStorage.getItem(LIVE) ?? 'null') as Live | null;
    return x && Array.isArray(x.laps) ? x : null;
  } catch {
    return null;
  }
}
function saveLive(l: Live) {
  try {
    localStorage.setItem(LIVE, JSON.stringify(l));
  } catch {
    // Sin almacenamiento, el cronómetro sigue funcionando mientras la app esté abierta.
  }
}

export default function CronometroTool() {
  const { t, lang } = useI18n();
  const d = t.tools.cronometro;
  const toast = useToast();
  const savedInput = useSavedInput<unknown>();
  const [live, setLive] = useState<Live>(() => {
    const s = savedInput ? readCronoSaved(savedInput) : null;
    if (s) return { name: s.name, laps: s.laps, current: null };
    return loadLive() ?? { name: '', laps: [], current: null };
  });
  const [now, setNow] = useState(Date.now());
  const [examplesOpen, setExamplesOpen] = useState(false);
  const closeExamples = useCallback(() => setExamplesOpen(false), []);
  const update = (fn: (l: Live) => Live) =>
    setLive((l) => {
      const n = fn(l);
      if (!savedInput) saveLive(n);
      return n;
    });
  useEffect(() => {
    if (live.current === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [live.current]);

  const start = () => update((l) => ({ ...l, current: Date.now() }));
  const lap = () => {
    const at = Date.now();
    update((l) => (l.current === null ? l : { ...l, laps: [...l.laps, { start: l.current, end: at }], current: at }));
    navigator.vibrate?.(30);
  };
  const stop = () => {
    const at = Date.now();
    update((l) => (l.current === null ? l : { ...l, laps: [...l.laps, { start: l.current, end: at }], current: null }));
  };
  const remove = (i: number) => {
    const previous = live;
    update((l) => ({ ...l, laps: l.laps.filter((_, k) => k !== i) }));
    toast(d.removed(i + 1), { action: { label: t.common.undo, onAction: () => update(() => previous) } });
  };
  const clear = () => {
    const previous = live;
    update(() => ({ name: live.name, laps: [], current: null }));
    toast(t.common.cleared, { action: { label: t.common.undo, onAction: () => update(() => previous) } });
  };

  const saved: CronoSaved = useMemo(() => ({ v: 1, name: live.name.trim(), laps: live.laps }), [live.name, live.laps]);
  const dur = useMemo(() => durations(live.laps), [live.laps]);
  const out = useMemo(() => descriptive(dur), [dur]);
  const r = out.result;
  const running = live.current !== null;
  const elapsed = running ? (now - live.current!) / 1000 : 0;

  const data = (
    <>
      <TextField label={d.what} value={live.name} placeholder={d.whatPh} onChange={(v) => update((l) => ({ ...l, name: v }))} />
      <div className={`flex flex-col items-center gap-1 rounded-[18px] p-4 ${running ? 'bg-soft' : 'bg-surface-2'}`} aria-live="off">
        <span className="text-[13px] font-semibold text-muted">{running ? d.current : d.cycles(live.laps.length)}</span>
        <span className="font-display text-[48px] leading-none font-bold tabular-nums">{running ? seconds(elapsed, lang) : live.laps.length ? seconds(dur[dur.length - 1]!, lang) : seconds(0, lang)}</span>
        {running && <span className="text-[13px] text-muted">{d.cycles(live.laps.length)}</span>}
      </div>
      {running ? (
        <div className="flex flex-col gap-2.5">
          <Button variant="primary" icon={Flag} onClick={lap} className="min-h-24 w-full text-[22px]">
            {d.lap}
          </Button>
          <Button icon={Pause} onClick={stop} className="w-full">
            {d.stop}
          </Button>
        </div>
      ) : (
        <Button variant="primary" icon={Play} onClick={start} className="min-h-20 w-full text-[20px]">
          {live.laps.length ? d.resume : d.start}
        </Button>
      )}
      <Hint>{d.lapHint}</Hint>
      {live.laps.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <SubTitle>{d.list}</SubTitle>
          <ol className="flex flex-col">
            {live.laps
              .map((l, i) => ({ l, i }))
              .reverse()
              .map(({ l, i }) => (
                <li key={`${l.start}-${i}`} className="flex items-center justify-between gap-2 border-b border-line py-1 last:border-b-0">
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[15px] font-semibold tabular-nums">
                      {d.cycleName(i + 1)} · {seconds(dur[i]!, lang)}
                    </span>
                    <span className="text-[12.5px] text-muted tabular-nums">{d.startedAt(clock(l.start, lang))}</span>
                  </span>
                  <IconButton icon={Trash2} label={d.removeCycle(i + 1)} onClick={() => remove(i)} />
                </li>
              ))}
          </ol>
          <Button variant="ghost" className="self-start" onClick={clear}>
            {t.common.clear}
          </Button>
        </div>
      )}
      <Sheet open={examplesOpen} onClose={closeExamples} title={d.examples.title}>
        <ExampleOption
          icon={Timer}
          title={d.examples.one}
          hint={d.examples.oneHint}
          onPick={() => {
            const ex = cronoExample(d.exampleName);
            update(() => ({ name: ex.name, laps: ex.laps, current: null }));
            setExamplesOpen(false);
          }}
        />
      </Sheet>
    </>
  );

  let result: ReactNode;
  let figure: ReactNode = null;
  if (!r) result = <p className="text-[15px] text-muted">{d.empty}</p>;
  else {
    const ex = descriptivaExplain(dur, r, 's', t, lang);
    figure = (
      <SeriesChart
        values={dur}
        lang={lang}
        label={d.chartLabel}
        lines={[{ value: r.mean, label: d.legendMean, kind: 'mean' }]}
        pointLabel={(i, v) => d.pointText(i + 1, seconds(v, lang))}
        legend={
          <>
            <LegendItem kind="point" label={d.legendPoint} />
            <LegendItem kind="mean" label={d.legendMean} />
          </>
        }
      />
    );
    result = (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <Stat label={d.mean} value={seconds(r.mean, lang)} calc={ex.mean} />
          <Stat label={d.sd} value={seconds(r.sd, lang)} calc={ex.sd} />
          <Stat label={d.min} value={seconds(r.min, lang)} calc={null} />
          <Stat label={d.max} value={seconds(r.max, lang)} calc={null} />
        </div>
        {figure}
      </div>
    );
  }
  const a = r ? cronoReading(saved, r, t, lang) : null;
  const reading = a ? { conclusion: a.conclusion, warnings: a.warnings, typicalError: d.typicalError } : null;
  const sheet = () =>
    r && a
      ? cronoSheet(saved, t, lang, {
          reading: [{ tone: 'conclusion', text: a.conclusion }, ...a.warnings.map((w) => ({ tone: 'warning' as const, text: w })), { tone: 'tip', text: d.typicalError }],
          version: APP_VERSION,
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB'),
        })
      : null;
  const save = (): SavePayload | null => (r ? { input: saved, headline: { key: 'cycle', value: r.mean, kind: 'number', decimals: 1, unit: 's' } } : null);
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
      toolId="cronometro"
      save={save}
      figure={figure}
    />
  );
}
