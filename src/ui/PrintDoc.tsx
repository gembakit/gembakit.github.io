import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import { evaluateGrid, type Value } from '../sheet/evaluate';
import { layoutSheet } from '../sheet/layout';
import type { NumFormat, SheetDef } from '../sheet/types';
import { decimalsFor, exactDecimals } from '../google/sheetsOutput';
import { EXPORT_PALETTE, EXPORT_SERIES } from '../google/exportStyle';
import { formatNumber } from './number';

// Documento para imprimir o guardar como PDF (el botón del navegador). Sale
// de la misma definición que la hoja de Google, con los colores estándar de
// lo exportado (no los del tema): banda azul marino, resumen, gráfico, «Cómo
// leerlo», datos, resultados y notas. Funciona sin conexión.

const MAX_ROWS = 200;

/** Variables de color para el documento: los gráficos SVG las usan igual que en pantalla. */
const PRINT_VARS = {
  '--text': EXPORT_PALETTE.text,
  '--muted': EXPORT_PALETTE.muted,
  '--faint': EXPORT_PALETTE.faint,
  '--line': EXPORT_PALETTE.line,
  '--surface': '#FFFFFF',
  '--surface-2': EXPORT_PALETTE.bg,
  '--bad': '#C62828',
  '--ok': '#2E7D32',
  '--warn': '#B26A00',
  ...Object.fromEntries(EXPORT_SERIES.map((c, i) => [`--series-${i + 1}`, c])),
} as CSSProperties;

function fmt(v: Value | undefined, format: NumFormat | undefined, lang: 'es' | 'en', entered = false): string {
  if (typeof v !== 'number') return v === undefined || v === null ? '' : String(v);
  const f = format ?? 'auto';
  if (f === 'text') return String(v);
  // Un dato escrito por el usuario se enseña tal cual.
  const d = entered && f === 'auto' ? exactDecimals(v) : decimalsFor(v, f);
  return f === 'percent' ? `${formatNumber(v * 100, lang, Math.max(0, d - 2), Math.max(0, d - 2))} %` : formatNumber(v, lang, d, d);
}

export function PrintDoc({ def, figure }: { def: SheetDef; figure?: ReactNode }) {
  const { lang } = useI18n();
  const grid = layoutSheet(def);
  let values: Record<string, Value> = {};
  try {
    values = evaluateGrid(grid);
  } catch {
    // Una fórmula que el evaluador no conoce: el documento sale sin ese valor.
  }
  const val = (key: string, format?: NumFormat) => fmt(values[grid.address[key] ?? ''] ?? def.inputs.find((i) => i.key === key)?.value, format, lang);
  const summary = [...def.results.filter((r) => r.main), ...def.results.filter((r) => r.summary && !r.main)];
  const T = def.texts;
  const table = def.table;
  const tableRows = table ? table.rows.slice(0, MAX_ROWS) : [];
  const cell = (row: number, colKey: string, format: NumFormat) => {
    const col = table!.columns.findIndex((c) => c.key === colKey);
    const addr = `${'CDE'[col]}${Number(grid.address['label[]']!.split(':')[0]!.slice(1)) + row}`;
    const c = table!.columns[col]!;
    return c.formula ? fmt(values[addr], format, lang) : fmt(tableRows[row]!.values[colKey], format, lang, true);
  };
  const th = 'border-b-2 px-2 py-1.5 text-left text-[9.5pt] font-semibold';
  const td = 'border-b px-2 py-1 align-top text-[10pt]';
  const section = (title: string, children: ReactNode) => (
    <section className="print-avoid mt-5">
      <h2 className="mb-2 border-b-2 pb-1 text-[12.5pt] font-bold" style={{ color: EXPORT_PALETTE.accent, borderColor: EXPORT_PALETTE.accent }}>
        {title}
      </h2>
      {children}
    </section>
  );

  return createPortal(
    <div className="print-root" style={{ ...PRINT_VARS, color: EXPORT_PALETTE.text, fontFamily: 'Inter, Arial, sans-serif', background: '#fff' }}>
      <header className="px-5 py-4" style={{ background: EXPORT_PALETTE.band, color: EXPORT_PALETTE.bandText }}>
        <h1 className="text-[18pt] leading-tight font-bold">{def.heading}</h1>
        <p className="mt-1 text-[9.5pt] opacity-85">{def.subheading}</p>
      </header>
      <div className="px-1">
        {def.info &&
          section(
            def.info.title,
            <dl className="grid grid-cols-[minmax(0,32%)_minmax(0,1fr)] text-[10pt]">
              {def.info.rows.map((r) => (
                <div key={r.label} className="contents">
                  <dt className="border-b px-2 py-1 font-semibold" style={{ color: EXPORT_PALETTE.muted, borderColor: EXPORT_PALETTE.line }}>
                    {r.label}
                  </dt>
                  <dd className="border-b px-2 py-1" style={{ borderColor: EXPORT_PALETTE.line }}>
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>,
          )}
        {(def.textSections ?? []).map((sec) =>
          section(
            sec.title,
            <dl className="grid grid-cols-[minmax(0,32%)_minmax(0,1fr)] text-[10pt]" key={sec.title}>
              {sec.rows.map((r, i) => (
                <div key={`${r.label}${i}`} className="contents">
                  <dt className="border-b px-2 py-1.5 font-semibold" style={{ color: EXPORT_PALETTE.muted, borderColor: EXPORT_PALETTE.line }}>
                    {r.label}
                  </dt>
                  <dd className="border-b px-2 py-1.5 whitespace-pre-wrap" style={{ borderColor: EXPORT_PALETTE.line }}>
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>,
          ),
        )}
        {summary.length > 0 &&
          section(
            T.summary,
            <div className="grid grid-cols-3 gap-2">
              {summary.map((r) => (
                <div key={r.key} className="rounded-md px-3 py-2" style={{ background: EXPORT_PALETTE.surface2 }}>
                  <div className="text-[9pt] font-semibold" style={{ color: EXPORT_PALETTE.muted }}>
                    {r.label}
                  </div>
                  <div className={`${r.main ? 'text-[18pt]' : 'text-[13pt]'} font-bold`} style={{ color: EXPORT_PALETTE.accentInk }}>
                    {val(r.key, r.format)}
                  </div>
                </div>
              ))}
            </div>,
          )}
        {figure && <section className="print-avoid mx-auto mt-5 w-full max-w-[520px]">{figure}</section>}
        {def.reading.length > 0 &&
          section(
            T.reading,
            <div className="flex flex-col gap-1.5 text-[10.5pt] leading-snug">
              {def.reading.map((line, i) => (
                <p key={i} className="rounded px-2.5 py-1.5" style={{ background: line.tone === 'warning' ? '#FFF4E5' : line.tone === 'tip' ? EXPORT_PALETTE.bg : 'transparent' }}>
                  {line.tone !== 'tip' && <strong>{T.prefixes[line.tone]}</strong>}
                  {line.text}
                </p>
              ))}
            </div>,
          )}
        {(def.inputs.length > 0 || table) &&
          section(
            T.inputs,
            <>
              {def.inputs.length > 0 && (
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ borderColor: EXPORT_PALETTE.line }}>
                      {T.inputHeads.map((h, i) => (
                        <th key={i} className={`${th} ${i === 1 ? 'text-right' : ''}`} style={{ borderColor: EXPORT_PALETTE.line, color: EXPORT_PALETTE.muted }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {def.inputs.map((x) => (
                      <tr key={x.key}>
                        <td className={td} style={{ borderColor: EXPORT_PALETTE.line }}>
                          {x.label}
                        </td>
                        <td className={`${td} text-right font-semibold`} style={{ borderColor: EXPORT_PALETTE.line, background: EXPORT_PALETTE.soft }}>
                          {fmt(x.value, x.format, lang, true)}
                        </td>
                        <td className={td} style={{ borderColor: EXPORT_PALETTE.line, color: EXPORT_PALETTE.muted }}>
                          {x.note}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {table && (
                <table className="mt-3 w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={th} style={{ borderColor: EXPORT_PALETTE.line, color: EXPORT_PALETTE.muted }}>
                        {table.labelHead}
                      </th>
                      {table.columns.map((c) => (
                        <th key={c.key} className={`${th} text-right`} style={{ borderColor: EXPORT_PALETTE.line, color: EXPORT_PALETTE.muted }}>
                          {c.head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((r, i) => (
                      <tr key={i} style={{ background: i % 2 ? EXPORT_PALETTE.bg : 'transparent' }}>
                        <td className={td} style={{ borderColor: EXPORT_PALETTE.line }}>
                          {r.label}
                        </td>
                        {table.columns.map((c) => (
                          <td key={c.key} className={`${td} text-right tabular-nums`} style={{ borderColor: EXPORT_PALETTE.line }}>
                            {cell(i, c.key, c.format)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {table && table.rows.length > MAX_ROWS && (
                <p className="mt-1 text-[9pt]" style={{ color: EXPORT_PALETTE.muted }}>
                  … +{table.rows.length - MAX_ROWS}
                </p>
              )}
            </>,
          )}
        {def.results.length > 0 &&
          section(
            T.results,
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {T.resultHeads.map((h, i) => (
                    <th key={i} className={`${th} ${i === 1 ? 'text-right' : ''}`} style={{ borderColor: EXPORT_PALETTE.line, color: EXPORT_PALETTE.muted }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {def.results.map((r) => (
                  <tr key={r.key} style={{ background: r.main ? EXPORT_PALETTE.surface2 : 'transparent' }}>
                    <td className={`${td} ${r.main ? 'font-bold' : ''}`} style={{ borderColor: EXPORT_PALETTE.line }}>
                      {r.label}
                    </td>
                    <td className={`${td} text-right font-semibold tabular-nums`} style={{ borderColor: EXPORT_PALETTE.line }}>
                      {val(r.key, r.format)}
                    </td>
                    <td className={td} style={{ borderColor: EXPORT_PALETTE.line, color: EXPORT_PALETTE.muted }}>
                      {r.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>,
          )}
        {def.notes.length > 0 &&
          section(
            T.notes,
            <ul className="flex list-disc flex-col gap-1 pl-5 text-[9.5pt]" style={{ color: EXPORT_PALETTE.muted }}>
              {def.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>,
          )}
      </div>
    </div>,
    document.body,
  );
}

/** Pinta el documento y abre el diálogo de imprimir (o guardar como PDF); al cerrarlo, avisa. */
export function PrintNow({ def, figure, onDone }: { def: SheetDef; figure?: ReactNode; onDone: () => void }) {
  useEffect(() => {
    const done = () => onDone();
    window.addEventListener('afterprint', done);
    // Un momento para que el navegador pinte el documento antes de imprimir.
    const id = window.setTimeout(() => {
      try {
        window.print();
      } catch {
        onDone();
      }
    }, 150);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('afterprint', done);
    };
  }, [onDone]);
  return <PrintDoc def={def} figure={figure} />;
}
