import { useEffect, type ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { IconButton } from './Button';

/** Contenedor de pantalla: margen lateral de 16 px como mínimo y ancho cómodo de lectura. */
export function Screen({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div
      className={`mx-auto flex w-full flex-col gap-4 px-[max(16px,env(safe-area-inset-left))] pt-[max(8px,env(safe-area-inset-top))] pb-6 ${wide ? 'max-w-275' : 'max-w-160'}`}
    >
      {children}
    </div>
  );
}

/** Cabecera de pantalla principal: título grande y, a la derecha, acciones. */
export function BigHeader({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 pt-3 pb-1">
      <div className="min-w-0">
        <h1 className="font-display text-[32px] leading-[1.08] font-bold tracking-tight">{title}</h1>
        {subtitle && <div className="mt-1.5 text-[13px] text-muted">{subtitle}</div>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}

/** Cabecera de pantalla interior: botón de volver, título y subtítulo que nunca se cortan a medias. */
export function DetailHeader({ title, subtitle, onBack, backLabel, right }: { title: string; subtitle?: string; onBack: () => void; backLabel: string; right?: ReactNode }) {
  return (
    <header className="flex items-center gap-3 pt-2 pb-1">
      <IconButton icon={ChevronLeft} label={backLabel} onClick={onBack} />
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[21px] leading-tight font-bold tracking-tight wrap-anywhere">{title}</h1>
        {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`raised flex min-w-0 flex-col gap-3.5 rounded-[20px] p-4 ${className}`}>{children}</section>;
}

export function Label({ children }: { children: ReactNode }) {
  return <h2 className="text-[13px] font-semibold text-muted">{children}</h2>;
}

/** Botón principal fijo al pie, encima de la barra de navegación, al alcance del pulgar. */
export function BottomAction({ children }: { children: ReactNode }) {
  // Avisa al resto de la pantalla (avisos, márgenes) de que hay un botón fijo al pie.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--cta-h', '84px');
    return () => {
      root.style.removeProperty('--cta-h');
    };
  }, []);
  return (
    <>
      <div aria-hidden className="h-21" />
      <div className="fixed inset-x-0 bottom-(--nav-h) z-30 bg-linear-to-t from-bg via-bg to-transparent px-[max(16px,env(safe-area-inset-left))] pt-4 pb-3 md:left-(--side-w)">
        <div className="mx-auto max-w-160">{children}</div>
      </div>
    </>
  );
}
