import { useCallback, useId, useMemo, useState, type ReactNode } from 'react';
import { Eraser, Plus, Trash2, type LucideIcon } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Button, IconButton } from '../../ui/Button';
import { Sheet } from '../../ui/Sheet';
import { useToast } from '../../ui/Toast';
import { APP_VERSION } from '../../version';
import { ExampleOption, Group, Hint } from '../form';
import { docSections, docSheet } from './sheet';
import { emptyDoc, filledRows, readDoc, type DocColumn, type DocData, type DocField, type DocSchema, type DocTexts } from './types';

export interface DocAnalysis {
  /** Hay bastante escrito para enseñar el documento. */
  ready: boolean;
  /** Título corto del documento (el problema, el evento…), para el archivo. */
  title: string;
  conclusion: string;
  warnings: string[];
}

const inputCls = 'w-full min-w-0 rounded-[14px] border-[1.5px] border-line bg-surface px-3.5 text-[16px] outline-none placeholder:text-muted focus:border-accent';

/** Un campo de texto corto, largo o de fecha. */
function FieldInput({ kind, label, value, placeholder, onChange, aria }: { kind: DocField['kind'] | 'select'; label: string; value: string; placeholder?: string; onChange: (v: string) => void; aria?: string }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-muted">
        {label}
      </label>
      {kind === 'long' ? (
        <textarea
          id={id}
          aria-label={aria}
          value={value}
          placeholder={placeholder}
          rows={2}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} field-sizing-content min-h-[76px] resize-none py-2.5 leading-snug`}
        />
      ) : (
        <input
          id={id}
          aria-label={aria}
          type={kind === 'date' ? 'date' : 'text'}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} h-12`}
        />
      )}
    </div>
  );
}

function SelectInput({ label, value, options, onChange, aria }: { label: string; value: string; options: Record<string, string>; onChange: (v: string) => void; aria?: string }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-muted">
        {label}
      </label>
      <select id={id} aria-label={aria} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} h-12 font-semibold`}>
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Vista del documento: cada sección con lo escrito. */
export function DocPreview({ schema, texts, data }: { schema: DocSchema; texts: DocTexts; data: DocData }) {
  const { lang } = useI18n();
  const sections = docSections(schema, texts, data, lang);
  return (
    <div className="flex flex-col gap-4">
      {sections.map((s) => (
        <section key={s.title} className="flex flex-col gap-1.5">
          <h3 className="font-display text-[16.5px] font-bold">{s.title}</h3>
          <dl className="flex flex-col gap-1.5">
            {s.rows.map((r, i) => (
              <div key={`${r.label}${i}`} className="rounded-[12px] bg-surface-2 px-3 py-2">
                <dt className="text-[12.5px] font-semibold text-muted">{r.label}</dt>
                <dd className="text-[15px] leading-snug whitespace-pre-wrap wrap-break-word">{r.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

export function DocTool({
  toolId,
  schema,
  texts,
  exampleIcon,
  example,
  analyze,
  Visual,
}: {
  toolId: string;
  schema: DocSchema;
  texts: DocTexts;
  exampleIcon: LucideIcon;
  example: () => DocData;
  analyze: (d: DocData) => DocAnalysis;
  Visual?: (p: { data: DocData }) => ReactNode;
}) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const savedInput = useSavedInput<unknown>();
  const [data, setData] = useState<DocData>(() => (savedInput ? readDoc(savedInput) : null) ?? emptyDoc(schema));
  const [open, setOpen] = useState<Set<string>>(() => new Set(savedInput ? [] : [schema.sections[0]!.key]));
  const [examplesOpen, setExamplesOpen] = useState(false);
  const closeExamples = useCallback(() => setExamplesOpen(false), []);
  const toggle = (k: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const setField = (key: string, v: string) => setData((d) => ({ ...d, fields: { ...d.fields, [key]: v } }));
  const setCell = (list: string, i: number, col: string, v: string) =>
    setData((d) => ({ ...d, lists: { ...d.lists, [list]: (d.lists[list] ?? []).map((r, k) => (k === i ? { ...r, [col]: v } : r)) } }));
  const addRow = (list: string, cols: readonly DocColumn[]) =>
    setData((d) => ({
      ...d,
      lists: { ...d.lists, [list]: [...(d.lists[list] ?? []), Object.fromEntries(cols.filter((c) => c.kind === 'select').map((c) => [c.key, c.options![0]!]))] },
    }));
  const removeRow = (list: string, i: number, name: string) => {
    const previous = data;
    setData((d) => ({ ...d, lists: { ...d.lists, [list]: (d.lists[list] ?? []).filter((_, k) => k !== i) } }));
    toast(t.common.removed(name), { action: { label: t.common.undo, onAction: () => setData(previous) } });
  };
  const clear = () => {
    const previous = data;
    setData(emptyDoc(schema));
    toast(t.common.cleared, { action: { label: t.common.undo, onAction: () => setData(previous) } });
  };
  const anyText = Object.values(data.fields).some((v) => v.trim()) || Object.keys(data.lists).some((k) => filledRows(data, k).length > 0);
  const a = useMemo(() => analyze(data), [analyze, data]);

  const summaryOf = (sec: DocSchema['sections'][number]) => {
    const filled = (sec.fields ?? []).filter((f) => (data.fields[f.key] ?? '').trim()).length + (sec.list ? filledRows(data, sec.list.key).length : 0);
    const first = (sec.fields ?? []).map((f) => (data.fields[f.key] ?? '').trim()).find(Boolean);
    return first ? first.slice(0, 80) : sec.list ? t.common.items(filledRows(data, sec.list.key).length) : filled ? t.common.items(filled) : texts.sections[sec.key]?.hint ?? '';
  };

  const form = (
    <>
      <div className="flex flex-col border-b border-line">
        {schema.sections.map((sec) => (
          <Group key={sec.key} title={texts.sections[sec.key]?.title ?? sec.key} summary={summaryOf(sec)} bad={false} open={open.has(sec.key)} onToggle={() => toggle(sec.key)}>
            {texts.sections[sec.key]?.hint && <Hint>{texts.sections[sec.key]!.hint}</Hint>}
            {(sec.fields ?? []).map((f) => {
              const ft = texts.fields[f.key] ?? { label: f.key };
              return (
                <div key={f.key} className="flex flex-col gap-1">
                  <FieldInput kind={f.kind} label={ft.label} value={data.fields[f.key] ?? ''} placeholder={ft.ph} onChange={(v) => setField(f.key, v)} />
                  {ft.hint && <Hint>{ft.hint}</Hint>}
                </div>
              );
            })}
            {sec.list &&
              (() => {
                const L = texts.lists[sec.list.key]!;
                const rows = data.lists[sec.list.key] ?? [];
                return (
                  <>
                    <ol className="flex flex-col gap-2.5">
                      {rows.map((row, i) => {
                        const name = L.item(i + 1);
                        return (
                          <li key={i} className="flex flex-col gap-2.5 rounded-[16px] bg-surface-2 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[14px] font-bold text-accent-ink">{name}</span>
                              <IconButton icon={Trash2} label={t.common.removeItem(name)} onClick={() => removeRow(sec.list!.key, i, name)} />
                            </div>
                            {sec.list!.columns.map((c) => {
                              const ct = L.columns[c.key] ?? { label: c.key };
                              return c.kind === 'select' ? (
                                <SelectInput key={c.key} label={ct.label} aria={`${ct.label}: ${name}`} value={row[c.key] ?? c.options![0]!} options={ct.options ?? {}} onChange={(v) => setCell(sec.list!.key, i, c.key, v)} />
                              ) : (
                                <FieldInput key={c.key} kind={c.kind} label={ct.label} aria={`${ct.label}: ${name}`} value={row[c.key] ?? ''} placeholder={ct.ph} onChange={(v) => setCell(sec.list!.key, i, c.key, v)} />
                              );
                            })}
                          </li>
                        );
                      })}
                    </ol>
                    {rows.length < sec.list.max && (
                      <Button icon={Plus} className="self-start" onClick={() => addRow(sec.list!.key, sec.list!.columns)}>
                        {L.add}
                      </Button>
                    )}
                  </>
                );
              })()}
          </Group>
        ))}
      </div>
      {anyText && (
        <Button variant="ghost" icon={Eraser} className="self-start" onClick={clear}>
          {t.common.clear}
        </Button>
      )}
      <Sheet open={examplesOpen} onClose={closeExamples} title={texts.examples.title}>
        <ExampleOption
          icon={exampleIcon}
          title={texts.examples.one}
          hint={texts.examples.oneHint}
          onPick={() => {
            setData(example());
            setOpen(new Set());
            setExamplesOpen(false);
          }}
        />
      </Sheet>
    </>
  );

  const visual = a.ready ? (Visual ? <Visual data={data} /> : <DocPreview schema={schema} texts={texts} data={data} />) : null;
  const result = a.ready ? visual : <p className="text-[15px] text-muted">{texts.empty}</p>;
  const reading = a.ready ? { conclusion: a.conclusion, warnings: a.warnings, typicalError: texts.typicalError } : null;
  const readingLines = () => [
    { tone: 'conclusion' as const, text: a.conclusion },
    ...a.warnings.map((w) => ({ tone: 'warning' as const, text: w })),
    { tone: 'tip' as const, text: texts.typicalError },
  ];
  const sheet = () =>
    a.ready ? docSheet(schema, texts, data, t, lang, { title: a.title, reading: readingLines(), version: APP_VERSION, date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB') }) : null;
  const save = (): SavePayload | null => (a.ready ? { input: data, headline: null } : null);
  const method = (
    <ol className="flex list-decimal flex-col gap-1 pl-5">
      {texts.method.map((m) => (
        <li key={m}>{m}</li>
      ))}
    </ol>
  );

  return (
    <ToolTemplate
      name={texts.name}
      subtitle={texts.summary}
      guide={texts.guide}
      data={form}
      hasData={a.ready}
      onLoadExample={() => setExamplesOpen(true)}
      result={result}
      reading={reading}
      formula={method}
      sheet={sheet}
      toolId={toolId}
      save={save}
      figure={Visual && a.ready ? <Visual data={data} /> : undefined}
    />
  );
}
