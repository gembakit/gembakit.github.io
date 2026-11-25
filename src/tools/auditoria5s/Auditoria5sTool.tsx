import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { CircleCheck, ClipboardCheck, TriangleAlert } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Sheet } from '../../ui/Sheet';
import { APP_VERSION } from '../../version';
import { ExampleOption, Group, Hint, Tag } from '../form';
import { TextField } from '../DataColumn';
import { audit, AUDIT_EXAMPLE_SCORES, auditReading, auditSheet, emptyAudit, MAX_SCORE, pctText, Q_COUNT, readAuditSaved, type Audit5sSaved, type AuditResult } from './model';

/** Barras del porcentaje de cada S, con su número y su nombre (no solo el color). */
function Bars({ r }: { r: AuditResult }) {
  const { t, lang } = useI18n();
  const d = t.tools.auditoria5s;
  return (
    <ul className="flex flex-col gap-2.5" aria-label={d.chartLabel}>
      {r.perS.map((x, i) => (
        <li key={i} className="flex flex-col gap-1">
          <span className="flex items-baseline justify-between gap-2 text-[14.5px]">
            <span className="font-semibold">
              {i + 1}S · {d.sNames[i]} {i === r.weakest && <Tag>{d.weakest}</Tag>}
            </span>
            <span className="font-display font-bold tabular-nums">{x.pct === null ? '—' : pctText(x.pct, lang)}</span>
          </span>
          <span aria-hidden className="block h-3 rounded-full bg-surface-2">
            <span className="block h-full rounded-full" style={{ width: `${(x.pct ?? 0) * 100}%`, background: i === r.weakest ? 'var(--series-2)' : 'var(--series-1)' }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Auditoria5sTool() {
  const { t, lang } = useI18n();
  const d = t.tools.auditoria5s;
  const savedInput = useSavedInput<unknown>();
  const [s, setS] = useState<Audit5sSaved>(() => (savedInput ? readAuditSaved(savedInput) : null) ?? emptyAudit());
  const [open, setOpen] = useState<number | null>(savedInput ? null : 0);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const closeExamples = useCallback(() => setExamplesOpen(false), []);
  const setScore = (si: number, q: number, v: number) => setS((x) => ({ ...x, scores: x.scores.map((row, k) => (k === si ? row.map((y, j) => (j === q ? (y === v ? -1 : v) : y)) : row)) }));
  const setNote = (si: number, q: number, v: string) => setS((x) => ({ ...x, notes: x.notes.map((row, k) => (k === si ? row.map((y, j) => (j === q ? v : y)) : row)) }));
  const r = useMemo(() => audit(s), [s]);

  const data = (
    <>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <TextField label={d.area} value={s.area} placeholder={d.areaPh} onChange={(v) => setS((x) => ({ ...x, area: v }))} maxLength={60} />
        <TextField label={d.auditor} value={s.auditor} placeholder={d.auditorPh} onChange={(v) => setS((x) => ({ ...x, auditor: v }))} maxLength={60} />
      </div>
      <Hint>{d.scaleHint}</Hint>
      <div className="flex flex-col border-b border-line">
        {d.sNames.map((name, si) => {
          const sr = r?.perS[si];
          const done = s.scores[si]!.filter((v) => v >= 0).length;
          return (
            <Group
              key={si}
              title={`${si + 1}S · ${name}`}
              summary={`${d.sJapanese[si]} · ${done ? `${d.ofMax(sr!.points, sr!.max)}` : d.answered(0, Q_COUNT)}`}
              bad={false}
              open={open === si}
              onToggle={() => setOpen(open === si ? null : si)}
            >
              {d.questions[si]!.map((q, qi) => (
                <div key={qi} className="flex flex-col gap-2 rounded-[14px] bg-surface-2 p-3">
                  <p className="text-[15px] leading-snug">
                    <strong>{qi + 1}.</strong> {q}
                  </p>
                  <div role="radiogroup" aria-label={`${name} ${qi + 1}`} className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: MAX_SCORE + 1 }, (_, v) => {
                      const on = s.scores[si]![qi] === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-label={d.scoreLabel(String(v))}
                          onClick={() => setScore(si, qi, v)}
                          className={`press grid h-12 place-items-center rounded-[12px] font-display text-[18px] font-bold ${on ? 'btn-primary text-on-accent' : 'raised-sm'}`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={s.notes[si]![qi]}
                    placeholder={d.notePh}
                    aria-label={d.noteLabel(name, qi + 1)}
                    onChange={(e) => setNote(si, qi, e.target.value)}
                    className="h-11 w-full rounded-[12px] border-[1.5px] border-line bg-surface px-3 text-[15px] outline-none placeholder:text-muted focus:border-accent"
                  />
                </div>
              ))}
            </Group>
          );
        })}
      </div>
      <Sheet open={examplesOpen} onClose={closeExamples} title={d.examples.title}>
        <ExampleOption
          icon={ClipboardCheck}
          title={d.examples.one}
          hint={d.examples.oneHint}
          onPick={() => {
            setS({ ...emptyAudit(), area: d.examples.one, auditor: d.examples.auditor, scores: AUDIT_EXAMPLE_SCORES.map((row) => [...row]) });
            setOpen(null);
            setExamplesOpen(false);
          }}
        />
      </Sheet>
    </>
  );

  let figure: ReactNode = null;
  let result: ReactNode = <p className="text-[15px] text-muted">{d.empty}</p>;
  if (r) {
    figure = <Bars r={r} />;
    const good = r.level === 'great' || r.level === 'good';
    result = (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold text-muted">{d.total}</span>
          <span className="font-display text-[48px] leading-none font-bold tabular-nums">{pctText(r.pct, lang)}</span>
          <span className="text-[13px] text-muted">
            {d.ofMax(r.points, r.max)} · {d.answered(r.answered, 20)}
          </span>
        </div>
        <p className={`flex items-center gap-2.5 rounded-[14px] p-3 ${good ? 'bg-ok-soft' : 'bg-warn-soft'}`}>
          {good ? <CircleCheck aria-hidden size={19} className="shrink-0 text-ok" /> : <TriangleAlert aria-hidden size={19} className="shrink-0 text-warn" />}
          <span className="text-[15.5px] font-semibold">{d.levels[r.level]}</span>
        </p>
        {figure}
      </div>
    );
  }
  const a = r ? auditReading(s, r, t, lang) : null;
  const reading = a ? { conclusion: a.conclusion, warnings: a.warnings, typicalError: d.typicalError } : null;
  const sheet = () =>
    r && a
      ? auditSheet(s, r, t, {
          reading: [{ tone: 'conclusion', text: a.conclusion }, ...a.warnings.map((w) => ({ tone: 'warning' as const, text: w })), { tone: 'tip', text: d.typicalError }],
          version: APP_VERSION,
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB'),
        })
      : null;
  const save = (): SavePayload | null => (r ? { input: s, headline: { key: 'score5s', value: r.pct, kind: 'percent', decimals: 0 } } : null);
  const method = (
    <ol className="flex flex-col gap-1">
      {d.sNames.map((n, i) => (
        <li key={n}>
          <strong>
            {i + 1}S · {n}
          </strong>{' '}
          ({d.sJapanese[i]})
        </li>
      ))}
    </ol>
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
      formula={method}
      sheet={sheet}
      toolId="auditoria5s"
      save={save}
      figure={figure}
    />
  );
}
