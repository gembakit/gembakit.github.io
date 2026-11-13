import { useId, useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, Eraser } from 'lucide-react';
import { useI18n } from '../../i18n';
import { sampleMean } from '../../calc/muestra';
import { formatNumber, parseColumn } from '../../ui/number';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';

// Tiempos de ciclo de ejemplo (segundos).
const EXAMPLE = ['47,9', '49,2', '48,1', '50,3', '47,6', '48,8', '49,5', '48,0', '47,2', '49,9', '48,4', '48,7'].join('\n');

export default function MuestraTool() {
  const { t, lang } = useI18n();
  const m = t.tools.muestra;
  const toast = useToast();
  const inputId = useId();
  const hintId = useId();
  const [text, setText] = useState('');

  const parsed = useMemo(() => parseColumn(text), [text]);
  const calc = useMemo(() => sampleMean(parsed.values), [parsed]);
  const n = parsed.values.length;
  const hasData = n > 0;
  const fmt = (x: number) => formatNumber(x, lang, 2);

  const clear = () => {
    const previous = text;
    setText('');
    toast(t.common.cleared, { action: { label: t.common.undo, onAction: () => setText(previous) } });
  };

  const notes = [
    ...parsed.invalid.map((x) => m.invalidLine(x.line, x.raw)),
    ...parsed.ambiguous.map((x) => m.ambiguousLine(x.line, x.raw)),
  ];

  const data = (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-[15px] font-semibold">
          {m.inputLabel}
        </label>
        <p id={hintId} className="text-[13px] text-muted">
          {m.inputHint}
        </p>
        <textarea
          id={inputId}
          aria-describedby={hintId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          inputMode="decimal"
          spellCheck={false}
          className="min-h-[180px] w-full resize-y rounded-[15px] border-[1.5px] border-line bg-surface p-3.5 font-display text-[18px] tabular-nums shadow-[inset_0_1px_2px_rgb(0_0_0/0.08)] outline-none focus:border-accent"
        />
      </div>
      {text.trim() !== '' && (
        <div className="flex flex-col gap-2 text-[14px]">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5 font-semibold text-ok">
              <CircleCheck aria-hidden size={16} />
              {m.preview(n)}
            </span>
            {parsed.invalid.length > 0 && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-warn">
                <CircleAlert aria-hidden size={16} />
                {m.ignored(parsed.invalid.length)}
              </span>
            )}
          </p>
          {notes.map((note) => (
            <p key={note} className="rounded-[12px] bg-warn-soft p-2.5 text-text">
              {note}
            </p>
          ))}
          <Button variant="ghost" icon={Eraser} className="self-start" onClick={clear}>
            {t.common.clear}
          </Button>
        </div>
      )}
    </>
  );

  const result =
    calc.result === null ? (
      <p className="text-[15px] text-muted">{m.empty}</p>
    ) : (
      <div className="flex items-end gap-3">
        <span className="font-display text-[56px] leading-[0.95] font-bold tracking-[-0.035em] tabular-nums">{fmt(calc.result)}</span>
        <span className="pb-1.5 text-[15px] text-muted">
          {m.resultLabel} · {m.preview(n)}
        </span>
      </div>
    );

  const reading =
    calc.result === null
      ? null
      : {
          conclusion: n === 1 ? m.sentenceOne(fmt(calc.result)) : m.sentence(fmt(calc.result), n),
          warnings: [],
          typicalError: m.typicalError,
        };

  const formula = (
    <div className="flex flex-col gap-2">
      <p className="font-semibold">{m.formula}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 tabular-nums">
        {calc.steps.map((s) => (
          <div key={s.key} className="contents">
            <dt className="text-muted">{s.key === 'sum' ? m.stepSum : m.stepCount}</dt>
            <dd className="text-right font-semibold">{fmt(s.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  return (
    <ToolTemplate
      name={m.name}
      subtitle={m.summary}
      data={data}
      hasData={hasData}
      onLoadExample={() => setText(EXAMPLE)}
      result={result}
      reading={reading}
      formula={formula}
    />
  );
}
