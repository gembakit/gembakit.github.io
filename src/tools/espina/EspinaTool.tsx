import { useCallback } from 'react';
import { CircleCheck, CircleDashed, CircleX, Fish } from 'lucide-react';
import { useI18n } from '../../i18n';
import { DocTool } from '../doc/DocTool';
import { field, type DocData } from '../doc/types';
import { causes, ESPINA, espinaAnalyze, espinaExample, SIX_M } from './model';

const W = 340;
const H = 256;

/** Espina de pescado: tres espinas arriba, tres abajo, la cabeza con el efecto; y la lista por categorías. */
function Fishbone({ data }: { data: DocData }) {
  const { t } = useI18n();
  const e = t.tools.espina;
  const list = causes(data);
  const effect = field(data, 'effect');
  const spineY = H / 2;
  const headX = W - 78;
  const bones = SIX_M.map((m, i) => {
    const top = i < 3;
    const x = 40 + (i % 3) * ((headX - 70) / 3) + 40;
    const items = list.filter((c) => c.category === m);
    return { m, top, x, n: items.length, confirmed: items.filter((c) => c.status === 'confirmed').length };
  });
  const statusIcon = (s: string) =>
    s === 'confirmed' ? <CircleCheck aria-hidden size={16} className="mt-0.5 shrink-0 text-ok" /> : s === 'ruledOut' ? <CircleX aria-hidden size={16} className="mt-0.5 shrink-0 text-muted" /> : <CircleDashed aria-hidden size={16} className="mt-0.5 shrink-0 text-warn" />;
  return (
    <div className="flex flex-col gap-4">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={e.diagramLabel(effect)} className="block h-auto w-full">
        <line x1={14} x2={headX} y1={spineY} y2={spineY} stroke="var(--text)" strokeWidth={2.5} />
        <path d={`M${headX} ${spineY - 34} L${W - 4} ${spineY - 34} L${W - 4} ${spineY + 34} L${headX} ${spineY + 34} Z`} fill="var(--soft)" stroke="var(--accent)" strokeWidth={1.5} />
        <foreignObject x={headX + 3} y={spineY - 32} width={W - headX - 9} height={64}>
          <div className="flex h-full items-center text-[9.5px] leading-tight font-semibold text-text" style={{ overflowWrap: 'anywhere' }}>
            {effect.length > 70 ? `${effect.slice(0, 67)}…` : effect}
          </div>
        </foreignObject>
        {bones.map((b) => {
          const y2 = b.top ? 42 : H - 42;
          return (
            <g key={b.m}>
              <line x1={b.x - 36} y1={y2} x2={b.x} y2={spineY} stroke="var(--muted)" strokeWidth={1.8} />
              {/* Las etiquetas largas («Medio ambiente») van en dos líneas para no pisarse. */}
              {(() => {
                const words = e.sixM[b.m].length > 9 ? e.sixM[b.m].split(' ') : [e.sixM[b.m]];
                const lines = words.length > 1 ? [words[0]!, words.slice(1).join(' ')] : words;
                const y0 = b.top ? y2 - 10 - (lines.length - 1) * 11 : y2 + 18;
                return (
                  <text x={b.x - 36} y={y0} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--text)">
                    {lines.map((l, k) => (
                      <tspan key={k} x={b.x - 36} dy={k ? 11 : 0}>
                        {l}
                      </tspan>
                    ))}
                  </text>
                );
              })()}
              <g>
                <circle cx={b.x - 18} cy={(y2 + spineY) / 2} r={11} fill={b.n ? (b.confirmed ? 'var(--ok)' : 'var(--series-1)') : 'var(--surface-2)'} stroke="var(--surface)" strokeWidth={1.5} />
                <text x={b.x - 18} y={(y2 + spineY) / 2} dy="0.35em" textAnchor="middle" fontSize={10.5} fontWeight={700} fill={b.n ? '#fff' : 'var(--muted)'}>
                  {b.n}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-col gap-3">
        <h3 className="font-display text-[16.5px] font-bold">{e.byCategory}</h3>
        {SIX_M.map((m) => {
          const items = list.filter((c) => c.category === m);
          return (
            <section key={m} className="flex flex-col gap-1.5">
              <h4 className="text-[13.5px] font-bold text-accent-ink">
                {e.sixM[m]} · {items.length}
              </h4>
              {items.length === 0 ? (
                <p className="text-[14px] text-muted">{e.none}</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {items.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-[12px] bg-surface-2 px-3 py-2 text-[14.5px]">
                      {statusIcon(c.status)}
                      <span className="min-w-0">
                        <span className={`block wrap-break-word ${c.status === 'ruledOut' ? 'text-muted line-through' : 'font-semibold'}`}>{c.cause}</span>
                        <span className="block text-[12.5px] text-muted">
                          {e.status[c.status]}
                          {c.note ? ` · ${c.note}` : ''}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function EspinaTool() {
  const { t, lang } = useI18n();
  const analyze = useCallback((d: DocData) => espinaAnalyze(d, t, lang), [t, lang]);
  return <DocTool toolId="espina" schema={ESPINA} texts={t.tools.espina} exampleIcon={Fish} example={() => espinaExample(t)} analyze={analyze} Visual={Fishbone} />;
}
