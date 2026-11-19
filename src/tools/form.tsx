import { useId, type ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { useI18n } from '../i18n';
import { TIME_UNITS, type TimeUnit } from '../calc/takt';
import { parseDecimal } from '../ui/number';
import { NumberField } from '../ui/NumberField';
import { Dotted, Explained, type Derivation } from '../ui/Explained';

// Piezas de formulario y de resultado comunes a las calculadoras con listas
// (takt, OEE): bloques plegables con resumen, selectores, casillas compactas.

/** ¿Hay algo escrito que no es un número? */
export const isBad = (text: string) => text.trim() !== '' && parseDecimal(text) === null;

/** Tarjeta de un valor: entera tocable con su explicación. */
export function Stat({ label, value, calc }: { label: string; value: string; calc: Derivation | null }) {
  const body = (
    <>
      <span className="text-[13px] font-semibold text-muted">{calc ? <Dotted>{label}</Dotted> : label}</span>
      <span className="font-display text-[19px] font-bold tabular-nums wrap-anywhere">{value}</span>
    </>
  );
  const cls = 'flex min-w-0 flex-col gap-0.5 rounded-[14px] bg-surface-2 p-3';
  return calc ? (
    <Explained calc={calc} className={`${cls} w-full`}>
      {body}
    </Explained>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Botones de una sola elección (las etiquetas largas pasan a dos líneas). */
export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string; aria?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <div role="group" aria-label={label} className="grid gap-1 rounded-[16px] bg-surface-2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            aria-label={o.aria}
            onClick={() => onChange(o.value)}
            className={`press min-h-11 rounded-[13px] px-2 py-1.5 text-[14.5px] leading-tight font-semibold ${value === o.value ? 'raised-sm text-accent-ink' : 'text-muted'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Desplegable pequeño de unidad (s, min, h) junto a un campo. */
export function UnitSelect({ value, onChange, label }: { value: TimeUnit; onChange: (u: TimeUnit) => void; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as TimeUnit)}
      className="h-12 w-[80px] shrink-0 rounded-[15px] border-[1.5px] border-line bg-surface px-3 text-[16px] font-semibold text-text outline-none focus:border-accent"
    >
      {TIME_UNITS.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  );
}

/** Campo de tiempo con su unidad al lado. */
export function TimeField({ label, value, unit, onValue, onUnit }: { label: string; value: string; unit: TimeUnit; onValue: (v: string) => void; onUnit: (u: TimeUnit) => void }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
      <NumberField compact label={label} value={value} invalidText={t.common.invalidNumber} onChange={onValue} />
      <UnitSelect value={unit} onChange={onUnit} label={t.common.unitOf(label)} />
    </div>
  );
}

/** Texto de ayuda bajo un campo. */
export const Hint = ({ children }: { children: ReactNode }) => <p className="text-[13px] leading-relaxed text-muted">{children}</p>;

/** Bloque plegable de los datos: título siempre a la vista y, cerrado, un resumen de lo que tiene. */
export function Group({ title, summary, bad, open, onToggle, children }: { title: string; summary: string; bad: boolean; open: boolean; onToggle: () => void; children: ReactNode }) {
  const panelId = useId();
  return (
    <section className="border-t border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_22px] items-center gap-3 py-2.5 text-left"
      >
        <span className="min-w-0">
          <span className="block font-display text-[16.5px] leading-tight font-bold">{title}</span>
          {(!open || bad) && <span className={`mt-0.5 block text-[13.5px] leading-snug tabular-nums wrap-anywhere ${bad ? 'font-semibold text-bad' : 'text-muted'}`}>{summary}</span>}
        </span>
        <ChevronDown aria-hidden size={21} className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-3 pb-4">
          {children}
        </div>
      )}
    </section>
  );
}

/** Subtítulo de un apartado del resultado. */
export const SubTitle = ({ children }: { children: ReactNode }) => <h3 className="font-display text-[16.5px] leading-tight font-bold">{children}</h3>;


/** Etiqueta pequeña junto a un nombre («cuello de botella»). */
export function Tag({ children }: { children: ReactNode }) {
  return <span className="ml-2 inline-block rounded-full bg-warn-soft px-2 py-0.5 align-middle text-[12px] font-semibold whitespace-nowrap">{children}</span>;
}

/** Un elemento de una lista, plegable (un puesto, una parada): cerrado, su nombre y un resumen; abierto, todo lo suyo. */
export function Fold({ name, tag, summary, bad, open, onToggle, children }: { name: string; tag?: ReactNode; summary: string; bad: boolean; open: boolean; onToggle: () => void; children: ReactNode }) {
  const panelId = useId();
  return (
    <li className="rounded-[16px] bg-surface-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_20px] items-center gap-2 px-3 py-2.5 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[15.5px] leading-snug font-semibold wrap-break-word">
            {name}
            {tag}
          </span>
          {(!open || bad) && <span className={`mt-0.5 block text-[13px] leading-snug tabular-nums wrap-anywhere ${bad ? 'font-semibold text-bad' : 'text-muted'}`}>{summary}</span>}
        </span>
        <ChevronDown aria-hidden size={20} className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-3 px-3 pb-3">
          {children}
        </div>
      )}
    </li>
  );
}

/** El resultado grande: la cifra en grande y su unidad («botellas/h») más pequeña al lado. */
export function BigValue({ text }: { text: string }) {
  const cut = text.indexOf(' ');
  const [n, unit] = cut < 0 ? [text, ''] : [text.slice(0, cut), text.slice(cut + 1)];
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-display text-[52px] leading-[1] font-bold tracking-[-0.035em] tabular-nums">{n}</span>
      {unit && <span className="font-display text-[22px] font-bold wrap-break-word">{unit}</span>}
    </span>
  );
}

export function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-[12.5px] text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums wrap-anywhere">{value}</dd>
    </div>
  );
}

/** Casilla compacta de un número (una medida real, el tiempo de un descuento): caben dos por fila. */
export function MeasureBox({ label, unit, value, onChange, className = '' }: { label: string; unit?: string; value: string; onChange: (v: string) => void; className?: string }) {
  const invalid = value.trim() !== '' && parseDecimal(value) === null;
  return (
    <div className={`flex h-12 min-w-0 items-center rounded-[13px] border-[1.5px] bg-surface px-3 ${invalid ? 'border-bad' : 'border-line focus-within:border-accent'} ${className}`}>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={label}
        aria-invalid={invalid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-0 min-w-0 flex-1 bg-transparent text-[16px] font-semibold tabular-nums outline-none"
      />
      {unit && <span className="ml-1.5 shrink-0 text-[13px] font-semibold text-muted">{unit}</span>}
    </div>
  );
}

export function ExampleOption({ icon: Icon, title, hint, onPick }: { icon: LucideIcon; title: string; hint: string; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} className="press raised grid w-full grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-[18px] p-3.5 text-left">
      <span className="grid size-10 place-items-center rounded-[12px] bg-soft text-accent-ink">
        <Icon aria-hidden size={20} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15.5px] font-semibold">{title}</span>
        <span className="text-[13.5px] leading-snug text-muted">{hint}</span>
      </span>
    </button>
  );
}

/** Nombre de un descuento o de una estación: crece a dos o más líneas en lugar de cortar el texto. */
export function NameInput({ value, placeholder, label, onChange }: { value: string; placeholder: string; label: string; onChange: (v: string) => void }) {
  return (
    <textarea
      rows={1}
      value={value}
      placeholder={placeholder}
      aria-label={label}
      autoComplete="off"
      maxLength={60}
      onChange={(e) => onChange(e.target.value.replace(/\s*\n\s*/g, ' '))}
      onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
      className="field-sizing-content min-h-12 w-0 min-w-0 flex-1 resize-none rounded-[12px] border-[1.5px] border-line bg-surface px-3 py-2.5 text-[16px] leading-snug font-semibold outline-none placeholder:font-normal placeholder:text-muted focus:border-accent"
    />
  );
}
