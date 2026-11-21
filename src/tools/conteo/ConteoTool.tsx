import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ClipboardList, Minus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { paretoAnalysis } from '../../calc/pareto';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Button, IconButton } from '../../ui/Button';
import { Sheet } from '../../ui/Sheet';
import { LegendItem, ParetoChart } from '../../ui/charts';
import { useToast } from '../../ui/Toast';
import { formatNumber } from '../../ui/number';
import { APP_VERSION } from '../../version';
import { ExampleOption, Hint, NameInput } from '../form';
import { TextField } from '../DataColumn';
import { paretoSheet } from '../pareto/sheet';
import { paretoFormat } from '../pareto/reading';
import { asPareto, conteoReading, readConteoSaved, TALLY_COUNTS, type ConteoSaved } from './model';

// El conteo en curso se guarda en el teléfono a cada toque (si la app se cierra, sigue donde estaba).
const LIVE = 'gk.conteo';
let ids = 1;
interface Row {
  id: number;
  name: string;
  count: number;
}
interface Live {
  title: string;
  rows: Row[];
  startedAt: number | null;
}
function loadLive(): Live | null {
  try {
    const x = JSON.parse(localStorage.getItem(LIVE) ?? 'null') as Live | null;
    if (!x || !Array.isArray(x.rows)) return null;
    for (const r of x.rows) ids = Math.max(ids, r.id + 1);
    return x;
  } catch {
    return null;
  }
}

export default function ConteoTool() {
  const { t, lang } = useI18n();
  const d = t.tools.conteo;
  const toast = useToast();
  const savedInput = useSavedInput<unknown>();
  const [live, setLive] = useState<Live>(() => {
    const s = savedInput ? readConteoSaved(savedInput) : null;
    if (s) return { title: s.title, startedAt: s.startedAt, rows: s.items.map((x) => ({ id: ids++, name: x.name, count: x.count })) };
    return loadLive() ?? { title: '', startedAt: null, rows: d.defaultItems.map((name) => ({ id: ids++, name, count: 0 })) };
  });
  const [examplesOpen, setExamplesOpen] = useState(false);
  const closeExamples = useCallback(() => setExamplesOpen(false), []);
  const update = (fn: (l: Live) => Live) =>
    setLive((l) => {
      const n = fn(l);
      if (!savedInput)
        try {
          localStorage.setItem(LIVE, JSON.stringify(n));
        } catch {
          // Sin almacenamiento, sigue contando mientras la app esté abierta.
        }
      return n;
    });
  const bump = (id: number, by: 1 | -1) => {
    update((l) => ({ ...l, startedAt: l.startedAt ?? Date.now(), rows: l.rows.map((r) => (r.id === id ? { ...r, count: Math.max(0, r.count + by) } : r)) }));
    if (by > 0) navigator.vibrate?.(20);
  };
  const remove = (row: Row, name: string) => {
    const previous = live;
    update((l) => ({ ...l, rows: l.rows.filter((r) => r.id !== row.id) }));
    toast(d.removed(name), { action: { label: t.common.undo, onAction: () => update(() => previous) } });
  };
  const reset = () => {
    const previous = live;
    update((l) => ({ ...l, startedAt: null, rows: l.rows.map((r) => ({ ...r, count: 0 })) }));
    toast(d.resetDone, { action: { label: t.common.undo, onAction: () => update(() => previous) } });
  };

  const saved: ConteoSaved = useMemo(() => ({ v: 1, title: live.title.trim(), startedAt: live.startedAt, items: live.rows.map((r) => ({ name: r.name.trim(), count: r.count })) }), [live]);
  const total = saved.items.reduce((a, x) => a + x.count, 0);
  const a = useMemo(() => (total > 0 ? conteoReading(saved, t, lang) : null), [saved, total, t, lang]);
  const p = asPareto(saved, t);
  const r = total > 0 ? paretoAnalysis({ items: p.items, othersLast: t.tools.pareto.othersName }).result : null;
  const f = paretoFormat(lang);

  const data = (
    <>
      <TextField label={d.title} value={live.title} placeholder={d.titlePh} onChange={(v) => update((l) => ({ ...l, title: v }))} />
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-muted">{d.items}</span>
        <span className="font-display text-[18px] font-bold tabular-nums">
          {d.total}: {formatNumber(total, lang, 0)}
        </span>
      </div>
      {live.startedAt && <Hint>{d.started(new Date(live.startedAt).toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-GB', { hour: '2-digit', minute: '2-digit' }))}</Hint>}
      <ol className="flex flex-col gap-2">
        {live.rows.map((row, i) => {
          const name = row.name.trim() || d.itemName(i + 1);
          return (
            <li key={row.id} className="flex flex-col gap-2 rounded-[16px] bg-surface-2 p-2.5">
              <div className="flex items-start gap-2">
                <NameInput value={row.name} placeholder={d.itemName(i + 1)} label={d.itemNameLabel(i + 1)} onChange={(v) => update((l) => ({ ...l, rows: l.rows.map((r2) => (r2.id === row.id ? { ...r2, name: v } : r2)) }))} />
                <IconButton icon={Trash2} label={d.removeItem(name)} onClick={() => remove(row, name)} />
              </div>
              <div className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-2">
                <button type="button" aria-label={d.minus(name)} onClick={() => bump(row.id, -1)} disabled={row.count === 0} className="press raised-sm grid h-14 place-items-center rounded-[14px] disabled:opacity-40">
                  <Minus aria-hidden size={22} />
                </button>
                <span className="text-center font-display text-[30px] font-bold tabular-nums" aria-live="polite">
                  {row.count}
                </span>
                <button type="button" aria-label={d.plus(name)} onClick={() => bump(row.id, 1)} className="press btn-primary grid h-14 place-items-center rounded-[14px] text-on-accent">
                  <Plus aria-hidden size={28} strokeWidth={2.6} />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button icon={Plus} onClick={() => update((l) => ({ ...l, rows: [...l.rows, { id: ids++, name: '', count: 0 }] }))}>
          {d.add}
        </Button>
        {total > 0 && (
          <Button variant="ghost" icon={RotateCcw} onClick={reset}>
            {d.reset}
          </Button>
        )}
      </div>
      <Sheet open={examplesOpen} onClose={closeExamples} title={d.examples.title}>
        <ExampleOption
          icon={ClipboardList}
          title={d.examples.one}
          hint={d.examples.oneHint}
          onPick={() => {
            update(() => ({ title: d.exampleData.title, startedAt: new Date(2026, 10, 21, 6, 0).getTime(), rows: d.exampleData.items.map((name, k) => ({ id: ids++, name, count: TALLY_COUNTS[k]! })) }));
            setExamplesOpen(false);
          }}
        />
      </Sheet>
    </>
  );

  let figure: ReactNode = null;
  if (r)
    figure = (
      <ParetoChart
        rows={r.rows}
        lang={lang}
        label={t.tools.pareto.chartLabel}
        rowLabel={(i) => t.tools.pareto.rowText(r.rows[i]!.name, f.value(r.rows[i]!.value), f.pct(r.rows[i]!.share), f.pct(r.rows[i]!.cumulative))}
        colors={r.rows.map((x) => (x.vital ? 'var(--series-1)' : 'var(--faint)'))}
        legend={<LegendItem kind="bar" label={t.tools.pareto.legendBars} />}
      />
    );
  const result: ReactNode = r ? (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-muted">{d.total}</span>
        <span className="font-display text-[48px] leading-none font-bold tabular-nums">{formatNumber(total, lang, 0)}</span>
      </div>
      {figure}
    </div>
  ) : (
    <p className="text-[15px] text-muted">{d.empty}</p>
  );
  const reading = a ? { conclusion: a.conclusion, warnings: a.warnings, typicalError: d.typicalError } : null;
  const sheet = () => (a && r ? { ...paretoSheet(p, r, t, { reading: a.lines, version: APP_VERSION, date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB') }), heading: live.title.trim() ? `${d.name} · ${live.title.trim()}` : d.name } : null);
  const save = (): SavePayload | null => (r ? { input: saved, headline: { key: 'total', value: total, kind: 'number', decimals: 0 } } : null);
  const formula = (
    <ul className="flex flex-col gap-1 font-semibold">
      {t.tools.pareto.formula.map((x) => (
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
      toolId="conteo"
      save={save}
      figure={figure}
    />
  );
}
