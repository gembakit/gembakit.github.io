import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useI18n } from '../i18n';

/** Hoja inferior modal: se abre desde abajo, se cierra con la X, tocando fuera o con Escape. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { t } = useI18n();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div className="absolute inset-0 bg-[rgb(20_14_8/0.45)]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sheet-panel relative flex max-h-[88dvh] w-full max-w-[560px] flex-col gap-4 overflow-y-auto rounded-t-[28px] px-[max(18px,env(safe-area-inset-left))] pt-3 pb-[max(20px,env(safe-area-inset-bottom))] md:rounded-[28px] outline-none"
      >
        <div className="mx-auto h-[5px] w-[42px] shrink-0 rounded-full bg-line md:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-[22px] font-bold leading-tight tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="press raised-sm -mt-1 grid size-12 shrink-0 place-items-center rounded-[14px]"
          >
            <X aria-hidden size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
