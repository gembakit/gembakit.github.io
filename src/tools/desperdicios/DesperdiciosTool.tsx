import { useCallback, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Camera, Footprints, Plus, Trash2, X } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useSavedInput } from '../../projects/live';
import type { SavePayload } from '../../projects/SaveSheet';
import { ToolTemplate } from '../../ui/ToolTemplate';
import { Button } from '../../ui/Button';
import { Sheet } from '../../ui/Sheet';
import { LegendItem, ParetoChart } from '../../ui/charts';
import { useToast } from '../../ui/Toast';
import { compressPhoto } from '../../ui/photo';
import { APP_VERSION } from '../../version';
import { ExampleOption, Fold, Hint, SubTitle, Tag } from '../form';
import { TextField } from '../DataColumn';
import { byType, findingsOf, MAX_PHOTOS, readWasteSaved, SEVERITIES, WASTES, wasteExample, wasteReading, wasteSheet, type Finding, type WasteSaved } from './model';

const blank = (): Finding => ({ type: 'transport', where: '', what: '', idea: '', severity: 'medium', photos: [] });
const areaCls = 'w-full min-w-0 rounded-[14px] border-[1.5px] border-line bg-surface px-3.5 py-2.5 text-[16px] leading-snug outline-none placeholder:text-muted focus:border-accent field-sizing-content min-h-[76px] resize-none';
const selCls = 'h-12 w-full rounded-[14px] border-[1.5px] border-line bg-surface px-3 text-[16px] font-semibold outline-none focus:border-accent';

function FindingEditor({ f, n, onChange, onRemove }: { f: Finding; n: number; onChange: (f: Finding) => void; onRemove: () => void }) {
  const { t } = useI18n();
  const d = t.tools.desperdicios;
  const toast = useToast();
  const ids = useId();
  const file = useRef<HTMLInputElement>(null);
  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const room = MAX_PHOTOS - f.photos.length;
    const out: string[] = [];
    for (const x of [...files].slice(0, room)) {
      try {
        out.push(await compressPhoto(x));
      } catch {
        toast(d.photoFailed);
      }
    }
    if (out.length) onChange({ ...f, photos: [...f.photos, ...out] });
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${ids}t`} className="text-[13px] font-semibold text-muted">
          {d.type}
        </label>
        <select id={`${ids}t`} value={f.type} onChange={(e) => onChange({ ...f, type: e.target.value as Finding['type'] })} className={selCls}>
          {WASTES.map((w) => (
            <option key={w} value={w}>
              {d.types[w]}
            </option>
          ))}
        </select>
        <Hint>{d.typeHints[f.type]}</Hint>
      </div>
      <TextField label={d.where} value={f.where} placeholder={d.wherePh} onChange={(v) => onChange({ ...f, where: v })} maxLength={80} />
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted">{d.what}</span>
        <textarea rows={2} value={f.what} placeholder={d.whatPh} onChange={(e) => onChange({ ...f, what: e.target.value })} className={areaCls} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted">{d.idea}</span>
        <textarea rows={2} value={f.idea} placeholder={d.ideaPh} onChange={(e) => onChange({ ...f, idea: e.target.value })} className={areaCls} />
      </label>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${ids}s`} className="text-[13px] font-semibold text-muted">
          {d.severity}
        </label>
        <select id={`${ids}s`} value={f.severity} onChange={(e) => onChange({ ...f, severity: e.target.value as Finding['severity'] })} className={selCls}>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {d.severities[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted">{d.photos}</span>
        {f.photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {f.photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p} alt={d.photoAlt(n, i + 1)} className="aspect-square w-full rounded-[12px] object-cover" />
                <button
                  type="button"
                  aria-label={d.removePhoto(i + 1)}
                  onClick={() => onChange({ ...f, photos: f.photos.filter((_, k) => k !== i) })}
                  className="absolute top-1 right-1 grid size-9 place-items-center rounded-full bg-black/60 text-white"
                >
                  <X aria-hidden size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
        {f.photos.length < MAX_PHOTOS ? (
          <>
            <input ref={file} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => void addPhotos(e.target.files).then(() => (e.target.value = ''))} />
            <Button icon={Camera} className="self-start" onClick={() => file.current?.click()}>
              {d.addPhoto}
            </Button>
          </>
        ) : (
          <Hint>{d.maxPhotos(MAX_PHOTOS)}</Hint>
        )}
      </div>
      <Button variant="ghost" icon={Trash2} className="self-start" onClick={onRemove}>
        {d.removeItem(d.findingName(n))}
      </Button>
    </div>
  );
}

export default function DesperdiciosTool() {
  const { t, lang } = useI18n();
  const d = t.tools.desperdicios;
  const toast = useToast();
  const savedInput = useSavedInput<unknown>();
  const [s, setS] = useState<WasteSaved>(() => (savedInput ? readWasteSaved(savedInput) : null) ?? { v: 1, area: '', findings: [blank()] });
  const [open, setOpen] = useState<number | null>(savedInput ? null : 0);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const closeExamples = useCallback(() => setExamplesOpen(false), []);
  const setFinding = (i: number, f: Finding) => setS((x) => ({ ...x, findings: x.findings.map((y, k) => (k === i ? f : y)) }));
  const remove = (i: number) => {
    const previous = s;
    setS((x) => ({ ...x, findings: x.findings.filter((_, k) => k !== i) }));
    setOpen(null);
    toast(d.removed(d.findingName(i + 1)), { action: { label: t.common.undo, onAction: () => setS(previous) } });
  };
  const a = useMemo(() => wasteReading(s, t), [s, t]);
  const list = findingsOf(s);
  const rows = byType(s);

  const data = (
    <>
      <TextField label={d.area} value={s.area} placeholder={d.areaPh} onChange={(v) => setS((x) => ({ ...x, area: v }))} maxLength={80} />
      <span className="text-[13px] font-semibold text-muted">{d.findings}</span>
      <ul className="flex flex-col border-y border-line">
        {s.findings.map((f, i) => (
          <Fold
            key={i}
            name={d.findingName(i + 1)}
            tag={<Tag>{d.types[f.type]}</Tag>}
            summary={[f.what.trim().slice(0, 60), f.photos.length ? `${d.photos}: ${f.photos.length}` : ''].filter(Boolean).join(' · ') || d.typeHints[f.type]!}
            bad={false}
            open={open === i}
            onToggle={() => setOpen(open === i ? null : i)}
          >
            <FindingEditor f={f} n={i + 1} onChange={(x) => setFinding(i, x)} onRemove={() => remove(i)} />
          </Fold>
        ))}
      </ul>
      <Button
        icon={Plus}
        className="self-start"
        onClick={() => {
          setS((x) => ({ ...x, findings: [...x.findings, blank()] }));
          setOpen(s.findings.length);
        }}
      >
        {d.add}
      </Button>
      <Sheet open={examplesOpen} onClose={closeExamples} title={d.examples.title}>
        <ExampleOption
          icon={Footprints}
          title={d.examples.one}
          hint={d.examples.oneHint}
          onPick={() => {
            setS(wasteExample(t));
            setOpen(null);
            setExamplesOpen(false);
          }}
        />
      </Sheet>
    </>
  );

  let figure: ReactNode = null;
  let result: ReactNode = <p className="text-[15px] text-muted">{d.empty}</p>;
  if (a) {
    const chart = (
      <ParetoChart
        rows={rows.map((r) => ({ name: d.types[r.key]!, share: r.share, cumulative: r.cumulative }))}
        lang={lang}
        label={d.chartLabel}
        rowLabel={(i) => d.rowText(d.types[rows[i]!.key]!, rows[i]!.minutes)}
        legend={<LegendItem kind="bar" label={d.byType} />}
      />
    );
    const items = (
      <ol className="flex flex-col gap-2">
        {list.map((f, i) => (
          <li key={i} className="flex flex-col gap-1.5 rounded-[14px] bg-surface-2 p-3">
            <span className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold">
              {i + 1}. {d.types[f.type]} <Tag>{d.severities[f.severity]}</Tag>
            </span>
            {f.where && <span className="text-[13px] text-muted">{f.where}</span>}
            {f.what && <span className="text-[14.5px] leading-snug wrap-break-word">{f.what}</span>}
            {f.idea && (
              <span className="text-[13.5px] leading-snug wrap-break-word">
                <strong>{d.idea}:</strong> {f.idea}
              </span>
            )}
            {f.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {f.photos.map((p, k) => (
                  <img key={k} src={p} alt={d.photoAlt(i + 1, k + 1)} className="aspect-square w-full rounded-[10px] object-cover" />
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    );
    figure = (
      <div className="flex flex-col gap-3">
        {chart}
        {items}
      </div>
    );
    result = (
      <div className="flex flex-col gap-4">
        {chart}
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <SubTitle>{d.list}</SubTitle>
          {items}
        </div>
      </div>
    );
  }
  const reading = a ? { conclusion: a.conclusion, warnings: a.warnings, typicalError: d.typicalError } : null;
  const sheet = () =>
    a
      ? wasteSheet(s, t, {
          reading: [{ tone: 'conclusion', text: a.conclusion }, { tone: 'tip', text: d.typicalError }],
          version: APP_VERSION,
          date: new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB'),
        })
      : null;
  const save = (): SavePayload | null => (a ? { input: { ...s, findings: list }, headline: { key: 'waste', value: list.length, kind: 'number', decimals: 0 } } : null);
  const method = (
    <ul className="flex flex-col gap-1">
      {WASTES.map((w) => (
        <li key={w}>
          <strong>{d.types[w]}:</strong> {d.typeHints[w]}
        </li>
      ))}
    </ul>
  );
  return (
    <ToolTemplate
      name={d.name}
      subtitle={d.summary}
      guide={d.guide}
      data={data}
      hasData={a !== null}
      onLoadExample={() => setExamplesOpen(true)}
      result={result}
      reading={reading}
      formula={method}
      sheet={sheet}
      toolId="desperdicios"
      save={save}
      figure={figure}
    />
  );
}
