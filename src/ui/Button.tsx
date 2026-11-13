import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'btn-primary min-h-[54px] text-[16px] text-on-accent',
  secondary: 'raised-sm min-h-12 text-[15px] text-text',
  ghost: 'min-h-12 text-[15px] text-accent-ink',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: LucideIcon;
  children: ReactNode;
}

/** Botón con zona táctil de 48 px como mínimo (54 px el principal). */
export function Button({ variant = 'secondary', icon: Icon, children, className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`press inline-flex items-center justify-center gap-2 rounded-[15px] px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {Icon && <Icon aria-hidden size={20} strokeWidth={1.9} className="shrink-0" />}
      <span>{children}</span>
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
}

/** Botón solo con icono: 48 × 48 px y nombre accesible. */
export function IconButton({ icon: Icon, label, className = '', type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`press raised-sm grid size-12 shrink-0 place-items-center rounded-[14px] text-text ${className}`}
      {...rest}
    >
      <Icon aria-hidden size={20} strokeWidth={1.9} />
    </button>
  );
}
