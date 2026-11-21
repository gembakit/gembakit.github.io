import { useCallback, useId, useMemo, useState } from 'react';
import { CircleAlert, Eraser, FileUp, TriangleAlert } from 'lucide-react';
import { useI18n } from '../i18n';
import type { ImportedRow } from '../import/mapping';
import { ImportDialog } from '../ui/ImportDialog';
import { Button } from '../ui/Button';
import { parseColumn, toFieldText } from '../ui/number';
import { useToast } from '../ui/Toast';

// Columna de datos común (CLAUDE.md, plantilla: teclear, pegar una columna de
// Excel o importar .xlsx o .csv): un cuadro grande con un valor por línea,
// cuántos valores se leen y qué líneas no son números.

export const MAX_VALUES = 2000;

/** Lee el texto del cuadro: los números en orden y lo que no se pudo leer. */
export function useColumn(text: string) {
  return useMemo(() => parseColumn(text), [text]);
}

/** Valores como texto del cuadro, uno por línea, con la coma o el punto del idioma. */
export const columnText = (values: readonly number[], lang: 'es' | 'en') => values.map((v) => toFieldText(v, lang)).join('\n');

export function DataColumn({ text, onChange, label, hint }: { text: string; onChange: (text: string) => void; label?: string; hint?: string }) {
  const { t, lang } = useI18n();
  const c = t.dataColumn;
  const toast = useToast();
  const id = useId();
  const parsed = useColumn(text);
  const [importOpen, setImportOpen] = useState(false);
  const closeImport = useCallback(() => setImportOpen(false), []);
  const onImport = (rows: ImportedRow[]) => {
    const previous = text;
    const values = rows.map((r) => r.value).filter((v): v is number => typeof v === 'number');
    onChange(columnText(values.slice(0, MAX_VALUES), lang));
    toast(t.importing.imported(values.length), { action: { label: t.common.undo, onAction: () => onChange(previous) } });
  };
  const clear = () => {
    const previous = text;
    onChange('');
    toast(t.common.cleared, { action: { label: t.common.undo, onAction: () => onChange(previous) } });
  };
  const lines = text.split(/\r\n|\r|\n/).length;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-semibold text-muted">
          {label ?? c.label}
        </label>
        <span className="text-[13px] font-semibold tabular-nums">{c.count(parsed.values.length)}</span>
      </div>
      <textarea
        id={id}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={c.placeholder}
        inputMode="decimal"
        spellCheck={false}
        autoComplete="off"
        rows={Math.min(10, Math.max(5, lines + 1))}
        className="w-full resize-y rounded-[15px] border-[1.5px] border-line bg-surface px-4 py-3 font-mono text-[16px] leading-[1.55] tabular-nums outline-none placeholder:font-sans placeholder:text-muted focus:border-accent"
      />
      <p className="text-[13px] leading-relaxed text-muted">{hint ?? c.hint}</p>
      {parsed.invalid.slice(0, 3).map((x) => (
        <p key={x.line} className="flex items-start gap-2 rounded-[12px] bg-bad-soft p-2.5 text-[14px]">
          <CircleAlert aria-hidden size={17} className="mt-0.5 shrink-0 text-bad" />
          <span className="min-w-0 wrap-anywhere">{c.invalid(x.line, x.raw)}</span>
        </p>
      ))}
      {parsed.invalid.length > 3 && <p className="text-[13px] text-bad">{c.moreInvalid(parsed.invalid.length - 3)}</p>}
      {parsed.ambiguous.slice(0, 1).map((x) => (
        <p key={x.line} className="flex items-start gap-2 rounded-[12px] bg-warn-soft p-2.5 text-[14px]">
          <TriangleAlert aria-hidden size={17} className="mt-0.5 shrink-0 text-warn" />
          <span className="min-w-0 wrap-anywhere">{c.ambiguous(x.raw)}</span>
        </p>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button icon={FileUp} onClick={() => setImportOpen(true)}>
          {t.importing.button}
        </Button>
        {text.trim() && (
          <Button variant="ghost" icon={Eraser} onClick={clear}>
            {c.clear}
          </Button>
        )}
      </div>
      <ImportDialog
        open={importOpen}
        onClose={closeImport}
        max={MAX_VALUES}
        fields={[{ key: 'value', label: c.importField, type: 'number', required: true, hints: ['valor', 'value', 'dato', 'data', 'medida', 'measure', 'x', 'y', 'resultado', 'result'] }]}
        onImport={onImport}
      />
    </div>
  );
}

/** Campo de texto corto (qué se mide, unidad). */
export function TextField({ label, value, placeholder, onChange, maxLength = 40 }: { label: string; value: string; placeholder: string; onChange: (v: string) => void; maxLength?: number }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full min-w-0 rounded-[15px] border-[1.5px] border-line bg-surface px-4 text-[16px] outline-none placeholder:text-muted focus:border-accent"
      />
    </label>
  );
}
