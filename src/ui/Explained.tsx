import { Fragment, useCallback, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { findTerm } from '../reference/glossary';
import { Sheet } from './Sheet';
import { hasFrac, needsParen, toText, type Expr } from './expr';

/** Dibuja una fórmula como en un libro: división apilada con su raya, paréntesis altos si rodean una fracción. */
export function Formula({ e }: { e: Expr }): ReactNode {
  if (typeof e === 'string') return <span className="whitespace-nowrap">{e}</span>;
  if ('frac' in e) {
    return (
      <span className="mx-0.5 inline-flex flex-col items-center align-middle text-[0.9em] leading-[1.15]">
        <span className="px-1 pb-[3px] whitespace-nowrap">
          <Formula e={e.frac[0]} />
        </span>
        <span aria-hidden className="h-[1.5px] w-full rounded-full bg-current" />
        <span className="px-1 pt-[3px] whitespace-nowrap">
          <Formula e={e.frac[1]} />
        </span>
      </span>
    );
  }
  if ('op' in e) {
    return (
      <>
        {e.args.map((a, i) => (
          <Fragment key={i}>
            {/* Espacio fijo antes del signo y normal después: si no cabe, la línea se parte tras el signo. */}
            {i > 0 && ` ${e.op} `}
            {needsParen(e.op, a, i) ? <Paren inner={a} /> : <Formula e={a} />}
          </Fragment>
        ))}
      </>
    );
  }
  if ('paren' in e) return <Paren inner={e.paren} />;
  return (
    <span className="whitespace-nowrap">
      {e.fn}
      <Paren inner={e.arg} />
    </span>
  );
}

function Paren({ inner }: { inner: Expr }) {
  const tall = hasFrac(inner);
  const p = tall ? 'inline-block align-middle text-[1.9em] leading-none font-light' : '';
  return (
    <>
      <span className={p}>(</span>
      <Formula e={inner} />
      <span className={p}>)</span>
    </>
  );
}

/**
 * De dónde sale un valor calculado, con los números del usuario:
 *
 *   DPU = D ÷ U
 *       = 360 ÷ 2.500
 *       = 0,144
 *
 *   Donde  D = Defectos encontrados   360
 *          U = Unidades revisadas   2.500
 */
export interface Derivation {
  /** Término del glosario: da el título, el nombre completo y «Qué significa». */
  term?: string;
  /** Título de la ventana; si falta, el del término del glosario. */
  title?: string;
  /** Significado si no hay término del glosario. */
  meaning?: string;
  /** Lado izquierdo de la fórmula («DPU»). */
  lhs: string;
  /** Cada paso tras el «=»: la fórmula con letras, con números y el resultado (el último). */
  steps: Expr[];
  /** Qué es cada letra y cuánto vale aquí. */
  where: { sym: string; label: string; value?: string }[];
  /** Aclaraciones cortas debajo (por ejemplo, la función de Excel). */
  notes?: string[];
}

/** El contenido de la ventana: fórmula con números, «Donde» y «Qué significa». */
export function DerivationView({ calc }: { calc: Derivation }) {
  const { t, lang } = useI18n();
  const e = calc.term ? findTerm(calc.term)?.[lang] : undefined;
  const meaning = e?.def ?? calc.meaning;
  const last = calc.steps.length - 1;
  // Un nombre largo («Fábrica oculta») va en su propia línea y los «=» debajo,
  // para no estrujar la fórmula en un teléfono estrecho.
  const stacked = calc.lhs.length > 5;
  return (
    <>
      {e && <p className="-mt-2 font-semibold text-muted">{e.name}</p>}
      <div className="rounded-[16px] bg-surface-2 p-4">
        <div className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-3 font-display text-[19px] leading-snug tabular-nums">
          {stacked && <span className="col-span-3 font-bold">{calc.lhs}</span>}
          {calc.steps.map((s, i) => (
            <div key={i} className="contents">
              <span className={i === 0 ? 'font-bold' : ''}>{i === 0 && !stacked ? calc.lhs : ''}</span>
              <span className="text-muted">=</span>
              <span className={i === last ? 'font-bold text-accent-ink' : i === 0 ? 'font-semibold' : ''}>
                <span className="sr-only">{toText(s)}</span>
                <span aria-hidden>
                  <Formula e={s} />
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
      {calc.where.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold text-muted">{t.explain.where}</h3>
          <dl className="flex flex-col gap-1.5">
            {calc.where.map((w) => (
              <div key={w.sym} className="grid grid-cols-[minmax(2.75rem,auto)_minmax(0,1fr)_auto] items-baseline gap-x-3 rounded-[12px] bg-surface-2 px-3 py-2.5">
                <dt className="font-display text-[17px] font-bold">{w.sym}</dt>
                <dd className="text-[15px] leading-snug">{w.label}</dd>
                <dd className="text-right font-display text-[16px] font-bold tabular-nums">{w.value ?? ''}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {calc.notes?.map((n) => (
        <p key={n} className="text-[14px] leading-relaxed text-muted">
          {n}
        </p>
      ))}
      {meaning && (
        <div className="flex flex-col gap-1">
          <h3 className="text-[13px] font-semibold text-muted">{t.explain.meaning}</h3>
          <p className="text-[15px] leading-relaxed">{meaning}</p>
        </div>
      )}
    </>
  );
}

function useExplained(calc: Derivation) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const title = calc.title ?? (calc.term ? findTerm(calc.term)?.[lang].term : undefined) ?? calc.lhs;
  const sheet = (
    <Sheet open={open} onClose={close} title={title}>
      <DerivationView calc={calc} />
    </Sheet>
  );
  return { open: () => setOpen(true), sheet, title };
}

/**
 * Cualquier valor calculado, tocable: abre de dónde sale. Envuelve lo que
 * se ve (una cifra, una tarjeta entera). Dentro no puede haber otro botón.
 */
export function Explained({ calc, children, className = '' }: { calc: Derivation; children: ReactNode; className?: string }) {
  const { t } = useI18n();
  const x = useExplained(calc);
  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={x.open} className={`press cursor-pointer text-left ${className}`}>
        {children}
        <span className="sr-only"> · {t.explain.open(x.title)}</span>
      </button>
      {x.sheet}
    </>
  );
}

/** Nombre del valor con subrayado de puntos (la pista de que se puede tocar), sin ser un botón. */
export function Dotted({ children }: { children: ReactNode }) {
  return <span className="underline decoration-dotted decoration-[1.5px] underline-offset-[3px]">{children}</span>;
}

/** Subíndices para FPY₁, FPY₂… */
export function subscript(n: number): string {
  return String(n).replace(/\d/g, (c) => '₀₁₂₃₄₅₆₇₈₉'[Number(c)]!);
}
