import { useId, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { parseDecimal } from './number';

/**
 * Campo numérico: abre el teclado numérico del móvil y acepta coma o punto.
 * Avisa si lo escrito no es un número (con icono y texto, no solo color).
 */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  invalidText,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (raw: string, parsed: number | null) => void;
  unit?: string;
  invalidText: string;
  /** Más bajo y con la cifra más pequeña, para listas con muchos campos. */
  compact?: boolean;
}) {
  const id = useId();
  const errId = useId();
  const [touched, setTouched] = useState(false);
  const invalid = touched && value.trim() !== '' && parseDecimal(value) === null;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-muted">
        {label}
      </label>
      <div
        className={`flex ${compact ? 'h-12' : 'h-14'} items-center rounded-[15px] border-[1.5px] bg-surface px-4 shadow-[inset_0_1px_2px_rgb(0_0_0/0.08)] ${invalid ? 'border-bad' : 'border-line focus-within:border-accent'}`}
      >
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          aria-invalid={invalid}
          aria-describedby={invalid ? errId : undefined}
          onBlur={() => setTouched(true)}
          onChange={(e) => onChange(e.target.value, parseDecimal(e.target.value))}
          className={`w-0 min-w-0 flex-1 bg-transparent font-display ${compact ? 'text-[18px]' : 'text-[22px]'} font-bold tabular-nums outline-none`}
        />
        {unit && <span className="font-semibold text-muted">{unit}</span>}
      </div>
      {invalid && (
        <p id={errId} className="flex items-center gap-1.5 text-[13px] text-bad">
          <CircleAlert aria-hidden size={15} />
          {invalidText}
        </p>
      )}
    </div>
  );
}
