import { useEffect, useId, useRef, useState } from 'react';
import { CircleAlert, ClipboardPaste, FileUp, TriangleAlert } from 'lucide-react';
import { useI18n } from '../i18n';
import { delimitedSheet, type RawSheet } from '../import/table';
import { columnNames, extractRows, guessHeader, guessMapping, type ImportField, type ImportedRow } from '../import/mapping';
import { formatNumber } from './number';
import { Button } from './Button';
import { Sheet } from './Sheet';

const MAX_BYTES = 10 * 1024 * 1024;
const PREVIEW_ROWS = 5;
const LIST_PROBLEMS = 3;

/** Texto de un .csv: UTF-8 si lo es; si no, la codificación de Excel en Windows. */
function decodeText(buf: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

interface Source {
  name: string;
  sheets: RawSheet[];
}

/**
 * Hoja inferior «Importar datos», común a las herramientas con lista: lee un
 * .xlsx, un .csv o filas pegadas, deja elegir la hoja, la fila de títulos y la
 * columna de cada dato, y enseña qué filas se usarán antes de usarlas.
 */
export function ImportDialog({
  open,
  onClose,
  fields,
  max,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  fields: ImportField[];
  max: number;
  onImport: (rows: ImportedRow[]) => void;
}) {
  const { t, lang } = useI18n();
  const m = t.importing;
  const fileRef = useRef<HTMLInputElement>(null);
  const pasteId = useId();
  const [source, setSource] = useState<Source | null>(null);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [guess, setGuess] = useState<number | null>(null);
  const [useHeader, setUseHeader] = useState(false);
  const [map, setMap] = useState<Record<string, number | null>>({});
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSource(null);
    setPaste('');
    setError(null);
    setBusy(false);
  }, [open]);

  const prepare = (src: Source, idx: number) => {
    const rows = src.sheets[idx]?.rows ?? [];
    const h = guessHeader(rows);
    setSource(src);
    setSheetIdx(idx);
    setGuess(h);
    setUseHeader(h !== null);
    setMap(guessMapping(rows, h, fields));
    setError(rows.length ? null : m.empty);
  };

  const load = (src: Source) => {
    // La primera hoja con datos.
    const idx = Math.max(0, src.sheets.findIndex((s) => s.rows.length > 0));
    prepare(src, idx);
  };

  const onFile = async (file: File) => {
    setError(null);
    if (file.size > MAX_BYTES) return setError(m.errorBig);
    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    setBusy(true);
    try {
      if (ext === 'xlsx' || ext === 'xlsm') {
        const buf = new Uint8Array(await file.arrayBuffer());
        // El lector de .xlsx solo se carga al importar uno.
        const { readXlsx } = await import('../import/xlsx');
        load({ name: file.name, sheets: readXlsx(buf) });
      } else if (['csv', 'txt', 'tsv'].includes(ext) || file.type.startsWith('text/')) {
        load({ name: file.name, sheets: [delimitedSheet(file.name, decodeText(await file.arrayBuffer()))] });
      } else setError(m.errorType);
    } catch {
      setError(m.errorRead);
    } finally {
      setBusy(false);
    }
  };

  const current = source?.sheets[sheetIdx];
  const rows = current?.rows ?? [];
  const header = useHeader ? (guess ?? 0) : null;
  const names = columnNames(rows, header);
  const missing = fields.filter((f) => f.required && (map[f.key] === null || map[f.key] === undefined));
  const ex = source && !missing.length ? extractRows(rows, header, map, fields, current?.decimal) : null;
  const ready = ex ? ex.rows.slice(0, max) : [];

  const toggleHeader = (on: boolean) => {
    const h = on ? (guess ?? 0) : null;
    setUseHeader(on);
    setMap(guessMapping(rows, h, fields));
  };

  const show = (v: string | number | undefined) => (v === undefined ? '—' : typeof v === 'number' ? formatNumber(v, lang, 4) : v);
  const selectClass = 'h-12 w-full min-w-0 rounded-[13px] border-[1.5px] border-line bg-surface px-3 text-[15.5px] outline-none focus:border-accent';

  return (
    <Sheet open={open} onClose={onClose} title={m.title}>
      {!source ? (
        <>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xlsm,.csv,.tsv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void onFile(f);
              }}
            />
            <Button variant="primary" icon={busy ? undefined : FileUp} disabled={busy} onClick={() => fileRef.current?.click()} className="w-full">
              {busy ? m.reading : m.file}
            </Button>
            <p className="text-[13.5px] text-muted">{m.fileHint}</p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={pasteId} className="text-[13px] font-semibold text-muted">
              {m.or}
            </label>
            <textarea
              id={pasteId}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={4}
              placeholder={m.paste}
              className="min-h-28 w-full rounded-[15px] border-[1.5px] border-line bg-surface p-3 text-[15px] outline-none placeholder:text-muted focus:border-accent"
            />
            <Button icon={ClipboardPaste} disabled={paste.trim() === ''} onClick={() => load({ name: m.pasted, sheets: [delimitedSheet(m.pasted, paste)] })}>
              {m.readPaste}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-[15px] font-semibold wrap-anywhere">{source.name}</p>
            <Button variant="ghost" className="shrink-0" onClick={() => setSource(null)}>
              {m.change}
            </Button>
          </div>
          {source.sheets.length > 1 && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-muted">{m.sheet}</span>
              <select className={selectClass} value={sheetIdx} onChange={(e) => prepare(source, Number(e.target.value))}>
                {source.sheets.map((s, i) => (
                  <option key={i} value={i}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {rows.length > 0 && (
            <>
              <label className="flex min-h-12 items-center gap-3 text-[15px]">
                <input type="checkbox" checked={useHeader} onChange={(e) => toggleHeader(e.target.checked)} className="size-5 shrink-0 accent-accent" />
                <span>{m.header((guess ?? 0) + 1)}</span>
              </label>
              {fields.map((f) => (
                <label key={f.key} className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-muted">{m.column(f.label)}</span>
                  <select
                    className={selectClass}
                    value={map[f.key] ?? ''}
                    onChange={(e) => setMap((s) => ({ ...s, [f.key]: e.target.value === '' ? null : Number(e.target.value) }))}
                  >
                    <option value="">{m.none}</option>
                    {names.map((n, i) => (
                      <option key={i} value={i}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </>
          )}
          {missing.length > 0 && rows.length > 0 && <Problem tone="bad" text={m.missing(missing[0]!.label)} />}
          {ex && (
            <section className="flex flex-col gap-2.5">
              <h3 className="text-[13px] font-semibold text-muted">
                {m.preview} · {m.found(ready.length)}
              </h3>
              {ready.length > 0 ? (
                <div className="overflow-hidden rounded-[14px] shadow-[inset_0_0_0_1.5px_var(--line)]">
                  <table className="w-full table-fixed border-collapse text-[14px]">
                    <thead>
                      <tr className="bg-surface-2">
                        {fields.map((f) => (
                          <th key={f.key} scope="col" className={`px-2.5 py-2 text-[12.5px] font-semibold text-muted wrap-anywhere ${f.type === 'number' ? 'text-right' : 'text-left'}`}>
                            {f.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ready.slice(0, PREVIEW_ROWS).map((r) => (
                        <tr key={r.line} className="border-t border-line">
                          {fields.map((f) => (
                            <td key={f.key} className={`px-2.5 py-2 wrap-anywhere ${f.type === 'number' ? 'text-right tabular-nums' : ''}`}>
                              {show(r.values[f.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ready.length > PREVIEW_ROWS && <p className="border-t border-line px-2.5 py-2 text-[13px] text-muted">{m.more(ready.length - PREVIEW_ROWS)}</p>}
                </div>
              ) : (
                <Problem tone="bad" text={m.nothing} />
              )}
              {ex.rows.length > max && <Problem tone="warn" text={m.tooMany(max)} />}
              {ex.skipped.slice(0, LIST_PROBLEMS).map((s) => (
                <Problem key={`s${s.line}`} tone="warn" text={m.skipped(s.line, s.field, s.raw)} />
              ))}
              {ex.skipped.length > LIST_PROBLEMS && <Problem tone="warn" text={m.skippedMore(ex.skipped.length - LIST_PROBLEMS)} />}
              {ex.ambiguous.slice(0, LIST_PROBLEMS).map((a) => (
                <Problem key={`a${a.line}${a.raw}`} tone="warn" text={m.ambiguous(a.line, a.raw)} />
              ))}
            </section>
          )}
          {error && <Problem tone="bad" text={error} />}
          {ready.length > 0 && (
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  onImport(ready.map((r) => r.values));
                  onClose();
                }}
              >
                {m.use(ready.length)}
              </Button>
              <p className="text-[13px] text-muted">{m.replaceNote}</p>
            </div>
          )}
        </>
      )}
      {!source && error && <Problem tone="bad" text={error} />}
    </Sheet>
  );
}

function Problem({ tone, text }: { tone: 'warn' | 'bad'; text: string }) {
  const Icon = tone === 'bad' ? CircleAlert : TriangleAlert;
  return (
    <p className={`flex items-start gap-2.5 rounded-[14px] p-3 text-[14px] ${tone === 'bad' ? 'bg-bad-soft' : 'bg-warn-soft'}`}>
      <Icon aria-hidden size={18} className={`mt-0.5 shrink-0 ${tone === 'bad' ? 'text-bad' : 'text-warn'}`} />
      <span className="min-w-0">{text}</span>
    </p>
  );
}
