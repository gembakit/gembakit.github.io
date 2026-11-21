import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { CircleAlert, Eraser, FileUp, PaintBucket, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { paretoAnalysis } from '../../calc/pareto';
import type { ImportedRow } from '../../import/mapping';
import { parseDecimal, toFieldText } from '../../ui/number';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Button, IconButton } from '../../ui/Button';
import { Sheet } from '../../ui/Sheet';
import { ImportDialog } from '../../ui/ImportDialog';
import { Dotted, Explained } from '../../ui/Explained';
import { LegendItem, ParetoChart } from '../../ui/charts';
import { useToast } from '../../ui/Toast';
import { APP_VERSION } from '../../version';
import { Check, ExampleOption, Hint, isBad, MeasureBox, NameInput, SubTitle, Tag } from '../form';
import { TextField } from '../DataColumn';
import { paretoExplain } from './explain';
import { paretoConclusion, paretoFormat, paretoReadingLines, paretoWarnings } from './reading';
import { paretoSheet } from './sheet';
import { PAINT_COUNTS, readParetoSaved, tally, toParetoInput, type ParetoSaved } from './model';

interface Row {
  id: number;
  name: string;
  value: string;
}
let ids = 1;
const nextId = () => ids++;
const MAX_ROWS = 40;

export default function ParetoTool() {
  const { t, lang } = useI18n();
  const d = t.tools.pareto;
  const toast = useToast();
  const savedInput = useSavedInput<unknown>();
  const initial = savedInput ? readParetoSaved(savedInput) : null;
  const [what, setWhat] = useState(initial?.what ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? '');
  const [othersLast, setOthersLast] = useState(initial?.othersLast ?? true);
  const [rows, setRows] = useState<Row[]>(() =>
    initial ? initial.items.map((x) => ({ id: nextId(), name: x.name, value: toFieldText(x.value, lang) })) : [{ id: nextId(), name: '', value: '' }],
  );
  const [examplesOpen, setExamplesOpen] = useState(false);
  const closeExamples = useCallback(() => setExamplesOpen(false), []);
  const [importOpen, setImportOpen] = useState(false);
  const closeImport = useCallback(() => setImportOpen(false), []);

  const saved: ParetoSaved = useMemo(
    () => ({
      v: 1,
      what: what.trim(),
      unit: unit.trim(),
      othersLast,
      items: rows.flatMap((r) => {
        const v = parseDecimal(r.value);
        return v === null ? [] : [{ name: r.name.trim(), value: v }];
      }),
    }),
    [what, unit, othersLast, rows],
  );
  const out = useMemo(() => paretoAnalysis(toParetoInput(saved, t)), [saved, t]);
  const r = out.result;
  const f = paretoFormat(lang);
  const warnings = paretoWarnings(out.warnings, saved, t);
  const update = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const remove = (row: Row, name: string) => {
    const previous = rows;
    setRows((rs) => rs.filter((x) => x.id !== row.id));
    toast(d.removed(name), { action: { label: t.common.undo, onAction: () => setRows(previous) } });
  };
  const clear = () => {
    const previous = { rows, what, unit };
    setRows([{ id: nextId(), name: '', value: '' }]);
    setWhat('');
    setUnit('');
    toast(t.common.cleared, {
      action: {
        label: t.common.undo,
        onAction: () => {
          setRows(previous.rows);
          setWhat(previous.what);
          setUnit(previous.unit);
        },
      },
    });
  };
  const onImport = (imported: ImportedRow[]) => {
    const previous = rows;
    const withValue = imported.filter((x) => typeof x.value === 'number');
    // Sin columna de números: una fila por caso, se cuenta cuántas veces sale cada categoría.
    const list = withValue.length ? withValue.map((x) => ({ name: String(x.name ?? '').trim(), value: x.value as number })) : tally(imported.map((x) => String(x.name ?? '')));
    setRows(list.slice(0, MAX_ROWS).map((x) => ({ id: nextId(), name: x.name, value: toFieldText(x.value, lang) })));
    toast(t.importing.imported(imported.length), { action: { label: t.common.undo, onAction: () => setRows(previous) } });
  };
  const loadExample = () => {
    const x = d.exampleData;
    setWhat(x.what);
    setUnit(x.unit);
    setOthersLast(true);
    setRows(x.items.map((name, i) => ({ id: nextId(), name, value: toFieldText(PAINT_COUNTS[i]!, lang) })));
    setExamplesOpen(false);
  };
  const anyText = rows.some((x) => x.name.trim() || x.value.trim()) || what.trim() !== '';

  const data = (
    <>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-[minmax(0,1fr)_9rem]">
        <TextField label={d.what} value={what} placeholder={d.whatPh} onChange={setWhat} />
        <TextField label={d.measure} value={unit} placeholder={d.measurePh} onChange={setUnit} maxLength={20} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted">{d.items}</span>
        <Hint>{d.itemsHint}</Hint>
      </div>
      <ol className="flex flex-col gap-2">
        {rows.map((row, i) => {
          const name = row.name.trim() || d.itemName(i + 1);
          return (
            <li key={row.id} className="flex flex-col gap-2 rounded-[16px] bg-surface-2 p-2.5">
              <div className="flex items-start gap-2">
                <NameInput value={row.name} placeholder={d.itemName(i + 1)} label={d.itemNameLabel(i + 1)} onChange={(v) => update(row.id, { name: v })} />
                <IconButton icon={Trash2} label={d.removeItem(name)} disabled={rows.length <= 1} onClick={() => remove(row, name)} />
              </div>
              <MeasureBox label={d.itemValue(name)} unit={unit.trim() || undefined} value={row.value} onChange={(v) => update(row.id, { value: v })} />
              {isBad(row.value) && <p className="text-[13px] text-bad">{d.invalidNumber}</p>}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2">
        {rows.length < MAX_ROWS && (
          <Button icon={Plus} onClick={() => setRows((rs) => [...rs, { id: nextId(), name: '', value: '' }])}>
            {d.add}
          </Button>
        )}
        <Button icon={FileUp} onClick={() => setImportOpen(true)}>
          {t.importing.button}
        </Button>
      </div>
      <Check label={d.othersLast} hint={d.othersLastHint} checked={othersLast} onChange={setOthersLast} />
      {anyText && (
        <Button variant="ghost" icon={Eraser} className="self-start" onClick={clear}>
          {t.common.clear}
        </Button>
      )}
      <ImportDialog
        open={importOpen}
        onClose={closeImport}
        max={2000}
        fields={[
          { key: 'name', label: d.sheet.head, type: 'text', required: true, hints: ['categoria', 'category', 'causa', 'cause', 'defecto', 'defect', 'tipo', 'type', 'motivo', 'reason', 'nombre', 'name'] },
          { key: 'value', label: d.sheet.valueHead, type: 'number', required: false, hints: ['valor', 'value', 'cantidad', 'count', 'veces', 'frecuencia', 'frequency', 'minutos', 'minutes', 'coste', 'cost', 'total'] },
        ]}
        onImport={onImport}
      />
      <Sheet open={examplesOpen} onClose={closeExamples} title={d.examples.title}>
        <ExampleOption icon={PaintBucket} title={d.examples.paint} hint={d.examples.paintHint} onPick={loadExample} />
      </Sheet>
    </>
  );

  let result: ReactNode;
  let figure: ReactNode = null;
  if (!r) {
    result =
      warnings.length && saved.items.length ? (
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
    const ex = paretoExplain(r, t, lang);
    const vitalShare = r.rows[r.vital - 1]!.cumulative;
    figure = (
      <ParetoChart
        rows={r.rows}
        lang={lang}
        label={d.chartLabel}
        rowLabel={(i) => `${i + 1}. ${d.rowText(r.rows[i]!.name, f.value(r.rows[i]!.value), f.pct(r.rows[i]!.share), f.pct(r.rows[i]!.cumulative))}`}
        colors={r.rows.map((x) => (x.vital ? 'var(--series-1)' : 'var(--faint)'))}
        legend={
          <>
            <LegendItem kind="bar" label={d.legendBars} />
            <span className="inline-flex items-center gap-1.5">
              <svg aria-hidden width={18} height={12}>
                <line x1={1} x2={17} y1={6} y2={6} stroke="var(--text)" strokeWidth={2} />
                <circle cx={9} cy={6} r={3} fill="var(--surface)" stroke="var(--text)" strokeWidth={1.6} />
              </svg>
              {d.legendLine}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg aria-hidden width={18} height={12}>
                <line x1={1} x2={17} y1={6} y2={6} stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="3 3" />
              </svg>
              {d.legend80}
            </span>
          </>
        }
      />
    );
    result = (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[13px] font-semibold text-muted">{d.vitalLabel}</span>
            <span className="font-display text-[40px] leading-[0.95] font-bold tracking-[-0.03em] tabular-nums">{d.vitalCount(r.vital, r.rows.length)}</span>
          </div>
          <Explained calc={ex[r.vital - 1]!.cumulative} className="flex min-w-0 flex-col items-start gap-1 rounded-[14px]">
            <span className="text-[13px] font-semibold text-muted">
              <Dotted>{d.cumulative}</Dotted>
            </span>
            <span className="font-display text-[40px] leading-[0.95] font-bold tracking-[-0.03em] tabular-nums">{f.pct(vitalShare)}</span>
          </Explained>
        </div>
        {figure}
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <SubTitle>{t.tools.pareto.items}</SubTitle>
          <ol className="flex flex-col">
            {r.rows.map((row, i) => (
              <li key={`${row.index}`} className="flex flex-col gap-1 border-b border-line py-2.5 last:border-b-0">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="min-w-0 text-[15px] font-semibold wrap-break-word">
                    {i + 1}. {row.name} {row.vital && <Tag>{d.vitalTag}</Tag>}
                  </span>
                  <span className="shrink-0 font-display text-[16px] font-bold tabular-nums">
                    {f.value(row.value)}
                    {unit.trim() ? ` ${unit.trim()}` : ''}
                  </span>
                </span>
                <span className="flex flex-wrap gap-x-4 text-[13.5px] text-muted tabular-nums">
                  <Explained calc={ex[i]!.share} className="rounded-[8px]">
                    <Dotted>{d.share}</Dotted> {f.pct(row.share)}
                  </Explained>
                  <Explained calc={ex[i]!.cumulative} className="rounded-[8px]">
                    <Dotted>{d.cumulative}</Dotted> {f.pct(row.cumulative)}
                  </Explained>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  const conclusion = r ? paretoConclusion(r, t, lang) : '';
  const reading = r ? { conclusion, warnings, typicalError: d.typicalError } : null;
  const sheet = () =>
    r
      ? paretoSheet(saved, r, t, {
          reading: paretoReadingLines(conclusion, warnings, t),
          version: APP_VERSION,
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB'),
        })
      : null;
  const save = (): SavePayload | null => (r ? { input: saved, headline: { key: 'vital', value: r.rows[r.vital - 1]!.cumulative, kind: 'percent', decimals: 1 } } : null);
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
      toolId="pareto"
      save={save}
    />
  );
}
