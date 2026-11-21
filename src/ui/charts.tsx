import { useId, useState, type ReactNode } from 'react';
import { formatNumber } from './number';

// Motor de gráficos común (SVG propio, CLAUDE.md). Todos comparten:
// - ancho fluido (el SVG se escala al ancho de la tarjeta) y alto fijo;
// - colores del tema por variables CSS (claro y oscuro);
// - ejes y rejilla discretos, marcas finas;
// - tocar un punto o una barra enseña su valor encima del gráfico;
// - lo que señala algo (punto fuera de control, racha) lleva otra forma y
//   otro color, y además se nombra en el texto: nunca solo el color.

const W = 340;
const PAD = { left: 44, right: 12, top: 12, bottom: 26 };

/** Marcas «bonitas» entre min y max (1, 2, 2,5 o 5 por potencia de diez). */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) {
    const d = Math.abs(min) || 1;
    min -= d / 2;
    max += d / 2;
  }
  const raw = (max - min) / Math.max(1, count);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const out: number[] = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-9; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}

/** Decimales para escribir las marcas de un eje. */
function tickDecimals(ticks: number[]): number {
  if (ticks.length < 2) return 2;
  const step = Math.abs(ticks[1]! - ticks[0]!);
  return Math.max(0, Math.min(6, -Math.floor(Math.log10(step) + 1e-9) + (step / 10 ** Math.floor(Math.log10(step)) === 2.5 ? 1 : 0)));
}

/** Leyenda de una línea de referencia del gráfico. */
export interface RefLine {
  value: number;
  label: string;
  kind: 'center' | 'limit' | 'spec' | 'target' | 'mean';
}

const lineStyle: Record<RefLine['kind'], { stroke: string; dash?: string; width: number }> = {
  center: { stroke: 'var(--series-3)', width: 1.6 },
  mean: { stroke: 'var(--series-3)', width: 1.6 },
  limit: { stroke: 'var(--bad)', dash: '5 4', width: 1.4 },
  spec: { stroke: 'var(--series-7)', dash: '2 3', width: 1.8 },
  target: { stroke: 'var(--series-7)', dash: '8 3 2 3', width: 1.4 },
};

/** Caja del gráfico: título accesible, aviso del punto tocado y el SVG. */
function Frame({ label, height, caption, children, legend }: { label: string; height: number; caption: ReactNode; children: ReactNode; legend?: ReactNode }) {
  return (
    <figure className="flex flex-col gap-1.5">
      <div aria-live="polite" className="min-h-[22px] text-[13.5px] font-semibold tabular-nums">
        {caption}
      </div>
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label} className="block h-auto w-full overflow-visible">
        {children}
      </svg>
      {legend && <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">{legend}</figcaption>}
    </figure>
  );
}

/** Eje vertical con rejilla. */
function YAxis({ ticks, y, lang, height, format }: { ticks: number[]; y: (v: number) => number; lang: 'es' | 'en'; height: number; format?: (v: number) => string }) {
  const dec = tickDecimals(ticks);
  return (
    <g>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
          <text x={PAD.left - 6} y={y(v)} dy="0.32em" textAnchor="end" fontSize={10.5} fill="var(--muted)">
            {format ? format(v) : formatNumber(v, lang, dec, dec)}
          </text>
        </g>
      ))}
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={height - PAD.bottom} stroke="var(--line)" strokeWidth={1} />
    </g>
  );
}

/** Elemento de la leyenda: una muestra de línea o de punto y su texto. */
export function LegendItem({ kind, label }: { kind: RefLine['kind'] | 'point' | 'flag' | 'bar' | 'curve'; label: string }) {
  const sw =
    kind === 'point' ? (
      <circle cx={9} cy={6} r={3.5} fill="var(--series-1)" />
    ) : kind === 'flag' ? (
      <rect x={5} y={2} width={8} height={8} transform="rotate(45 9 6)" fill="var(--bad)" />
    ) : kind === 'bar' ? (
      <rect x={3} y={1} width={12} height={10} rx={2} fill="var(--series-1)" />
    ) : kind === 'curve' ? (
      <path d="M1 10 Q9 -4 17 10" fill="none" stroke="var(--series-2)" strokeWidth={2} />
    ) : (
      <line x1={1} x2={17} y1={6} y2={6} stroke={lineStyle[kind].stroke} strokeWidth={2} strokeDasharray={lineStyle[kind].dash} />
    );
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg aria-hidden width={18} height={12}>
        {sw}
      </svg>
      {label}
    </span>
  );
}

/**
 * Serie en el tiempo: gráfico de corrida y cartas de control. Puntos unidos,
 * línea central y límites; los puntos señalados, en rombo rojo.
 */
export function SeriesChart({
  values,
  lines = [],
  flags = new Set<number>(),
  label,
  lang,
  pointLabel,
  height = 210,
  legend,
}: {
  values: (number | null)[];
  lines?: RefLine[];
  flags?: Set<number>;
  label: string;
  lang: 'es' | 'en';
  /** Texto del punto tocado: «Punto 12: 3,45». */
  pointLabel: (i: number, v: number) => string;
  height?: number;
  legend?: ReactNode;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const nums = values.filter((v): v is number => v !== null);
  const all = [...nums, ...lines.map((l) => l.value)];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const ticks = niceTicks(lo, hi, 5);
  const yMin = Math.min(lo, ticks[0] ?? lo);
  const yMax = Math.max(hi, ticks[ticks.length - 1] ?? hi);
  const span = yMax - yMin || 1;
  const y = (v: number) => PAD.top + (1 - (v - yMin) / span) * (height - PAD.top - PAD.bottom);
  const n = values.length;
  const x = (i: number) => PAD.left + 8 + (n <= 1 ? 0 : (i / (n - 1)) * (W - PAD.left - PAD.right - 16));
  // Línea que se corta donde falta un valor (carta MR: el primero no tiene rango).
  const path = values
    .map((v, i) => (v === null ? null : `${i === 0 || values[i - 1] === null ? 'M' : 'L'}${x(i).toFixed(2)} ${y(v).toFixed(2)}`))
    .filter(Boolean)
    .join(' ');
  const xTicks = n <= 1 ? [0] : niceTicks(1, n, Math.min(6, n - 1)).filter((v) => Number.isInteger(v) && v >= 1 && v <= n);
  const hitW = n <= 1 ? 40 : Math.max(10, (W - PAD.left - PAD.right) / n);
  return (
    <Frame
      label={label}
      height={height}
      legend={legend}
      caption={sel !== null && values[sel] !== null && values[sel] !== undefined ? pointLabel(sel, values[sel]!) : null}
    >
      <YAxis ticks={ticks} y={y} lang={lang} height={height} />
      {xTicks.map((v) => (
        <text key={v} x={x(v - 1)} y={height - 8} textAnchor="middle" fontSize={10.5} fill="var(--muted)">
          {v}
        </text>
      ))}
      {lines.map((l) => (
        <line key={`${l.kind}${l.value}`} x1={PAD.left} x2={W - PAD.right} y1={y(l.value)} y2={y(l.value)} stroke={lineStyle[l.kind].stroke} strokeWidth={lineStyle[l.kind].width} strokeDasharray={lineStyle[l.kind].dash} />
      ))}
      <path d={path} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" />
      {values.map((v, i) =>
        v === null ? null : flags.has(i) ? (
          <rect key={i} x={x(i) - 4.5} y={y(v) - 4.5} width={9} height={9} transform={`rotate(45 ${x(i)} ${y(v)})`} fill="var(--bad)" stroke="var(--surface)" strokeWidth={1.5} />
        ) : (
          <circle key={i} cx={x(i)} cy={y(v)} r={n > 60 ? 2.2 : 3.3} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={1.2} />
        ),
      )}
      {sel !== null && values[sel] !== null && <circle cx={x(sel)} cy={y(values[sel]!)} r={7} fill="none" stroke="var(--text)" strokeWidth={1.5} />}
      {/* Zonas de toque más anchas que el punto. */}
      {values.map((v, i) =>
        v === null ? null : (
          <rect key={`h${i}`} x={x(i) - hitW / 2} y={PAD.top} width={hitW} height={height - PAD.top - PAD.bottom} fill="transparent" onClick={() => setSel(sel === i ? null : i)} className="cursor-pointer" />
        ),
      )}
    </Frame>
  );
}

/** Histograma con curva normal opcional y líneas de referencia (media, límites de especificación). */
export function Histogram({
  bins,
  curve,
  lines = [],
  label,
  lang,
  binLabel,
  height = 200,
  legend,
}: {
  bins: { from: number; to: number; count: number }[];
  /** Curva ya escalada a frecuencias: f(x) en «número de datos por barra». */
  curve?: (x: number) => number;
  lines?: RefLine[];
  label: string;
  lang: 'es' | 'en';
  binLabel: (b: { from: number; to: number; count: number }) => string;
  height?: number;
  legend?: ReactNode;
}) {
  const [sel, setSel] = useState<number | null>(null);
  if (!bins.length) return null;
  const xLo = Math.min(bins[0]!.from, ...lines.map((l) => l.value));
  const xHi = Math.max(bins[bins.length - 1]!.to, ...lines.map((l) => l.value));
  const pad = (xHi - xLo) * 0.04;
  const x0 = xLo - pad;
  const x1 = xHi + pad;
  const x = (v: number) => PAD.left + ((v - x0) / (x1 - x0)) * (W - PAD.left - PAD.right);
  const curvePts = curve ? Array.from({ length: 81 }, (_, i) => x0 + ((x1 - x0) * i) / 80) : [];
  const top = Math.max(...bins.map((b) => b.count), ...curvePts.map((v) => curve!(v)), 1);
  const ticks = niceTicks(0, top, 4).filter((v) => Number.isInteger(v));
  const yMax = Math.max(top, ticks[ticks.length - 1] ?? top);
  const y = (v: number) => PAD.top + (1 - v / yMax) * (height - PAD.top - PAD.bottom);
  const xt = niceTicks(x0, x1, 5).filter((v) => v >= x0 && v <= x1);
  const dec = tickDecimals(xt);
  return (
    <Frame label={label} height={height} legend={legend} caption={sel !== null ? binLabel(bins[sel]!) : null}>
      <YAxis ticks={ticks} y={y} lang={lang} height={height} format={(v) => formatNumber(v, lang, 0)} />
      {xt.map((v) => (
        <text key={v} x={x(v)} y={height - 8} textAnchor="middle" fontSize={10.5} fill="var(--muted)">
          {formatNumber(v, lang, dec, dec)}
        </text>
      ))}
      {bins.map((b, i) => (
        <rect
          key={i}
          x={x(b.from) + 1}
          y={y(b.count)}
          width={Math.max(1, x(b.to) - x(b.from) - 2)}
          height={Math.max(0, y(0) - y(b.count))}
          rx={2}
          fill="var(--series-1)"
          opacity={sel === null || sel === i ? 1 : 0.55}
        />
      ))}
      {curve && (
        <path
          d={curvePts.map((v, i) => `${i ? 'L' : 'M'}${x(v).toFixed(2)} ${y(curve(v)).toFixed(2)}`).join(' ')}
          fill="none"
          stroke="var(--series-2)"
          strokeWidth={2}
        />
      )}
      {lines.map((l) => (
        <line key={`${l.kind}${l.value}`} x1={x(l.value)} x2={x(l.value)} y1={PAD.top} y2={height - PAD.bottom} stroke={lineStyle[l.kind].stroke} strokeWidth={lineStyle[l.kind].width} strokeDasharray={lineStyle[l.kind].dash} />
      ))}
      {bins.map((b, i) => (
        <rect key={`h${i}`} x={x(b.from)} y={PAD.top} width={Math.max(8, x(b.to) - x(b.from))} height={height - PAD.top - PAD.bottom} fill="transparent" onClick={() => setSel(sel === i ? null : i)} className="cursor-pointer" />
      ))}
    </Frame>
  );
}

/**
 * Pareto: barras de mayor a menor con su parte del total y la línea del
 * acumulado, las dos en el mismo eje de 0 a 100 % (sin dos escalas).
 */
export function ParetoChart({
  rows,
  label,
  lang,
  rowLabel,
  height = 220,
  legend,
  colors,
}: {
  rows: { name: string; share: number; cumulative: number }[];
  label: string;
  lang: 'es' | 'en';
  rowLabel: (i: number) => string;
  height?: number;
  legend?: ReactNode;
  /** Color de cada barra (por defecto, el primero de la serie). */
  colors?: string[];
}) {
  const [sel, setSel] = useState<number | null>(null);
  const clip = useId();
  if (!rows.length) return null;
  const n = rows.length;
  const plotW = W - PAD.left - PAD.right;
  const bw = plotW / n;
  const x = (i: number) => PAD.left + i * bw;
  const y = (v: number) => PAD.top + (1 - v) * (height - PAD.top - PAD.bottom);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const line = rows.map((r, i) => `${i ? 'L' : 'M'}${(x(i) + bw / 2).toFixed(2)} ${y(r.cumulative).toFixed(2)}`).join(' ');
  return (
    <Frame label={label} height={height} legend={legend} caption={sel !== null ? rowLabel(sel) : null}>
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={W} height={height} />
        </clipPath>
      </defs>
      <YAxis ticks={ticks} y={y} lang={lang} height={height} format={(v) => `${formatNumber(v * 100, lang, 0)} %`} />
      <line x1={PAD.left} x2={W - PAD.right} y1={y(0.8)} y2={y(0.8)} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 4" />
      {rows.map((r, i) => (
        <rect
          key={i}
          x={x(i) + Math.min(3, bw * 0.12)}
          y={y(r.share)}
          width={Math.max(1, bw - 2 * Math.min(3, bw * 0.12))}
          height={Math.max(0, y(0) - y(r.share))}
          rx={2}
          fill={colors?.[i] ?? 'var(--series-1)'}
          opacity={sel === null || sel === i ? 1 : 0.55}
        />
      ))}
      <path d={line} fill="none" stroke="var(--text)" strokeWidth={1.8} clipPath={`url(#${clip})`} />
      {rows.map((r, i) => (
        <circle key={`c${i}`} cx={x(i) + bw / 2} cy={y(r.cumulative)} r={3} fill="var(--surface)" stroke="var(--text)" strokeWidth={1.6} />
      ))}
      {rows.map((_, i) =>
        n <= 12 ? (
          <text key={`t${i}`} x={x(i) + bw / 2} y={height - 8} textAnchor="middle" fontSize={10.5} fill="var(--muted)">
            {i + 1}
          </text>
        ) : null,
      )}
      {rows.map((_, i) => (
        <rect key={`h${i}`} x={x(i)} y={PAD.top} width={bw} height={height - PAD.top - PAD.bottom} fill="transparent" onClick={() => setSel(sel === i ? null : i)} className="cursor-pointer" />
      ))}
    </Frame>
  );
}
