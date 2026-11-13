import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CircleCheck, Info } from 'lucide-react';

interface ToastData {
  id: number;
  text: string;
  tone: 'info' | 'ok';
  action?: { label: string; onAction: () => void };
}

type Show = (text: string, opts?: { tone?: ToastData['tone']; action?: ToastData['action'] }) => void;

const ToastContext = createContext<Show | null>(null);

/** Aviso breve encima de la barra inferior. Admite una acción, por ejemplo "Deshacer". */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);

  const show = useCallback<Show>((text, opts) => {
    setToast({ id: Date.now(), text, tone: opts?.tone ?? 'info', action: opts?.action });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const h = setTimeout(() => setToast(null), toast.action ? 7000 : 4000);
    return () => clearTimeout(h);
  }, [toast]);

  const value = useMemo(() => show, [show]);
  const Icon = toast?.tone === 'ok' ? CircleCheck : Info;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--cta-h)+8px)] z-40 flex justify-center px-[max(16px,env(safe-area-inset-left))]"
      >
        {toast && (
          <div
            key={toast.id}
            role="status"
            className="toast-in pointer-events-auto flex w-full max-w-[520px] items-center gap-3 rounded-[16px] bg-band py-2 pr-2 pl-4 text-band-text shadow-lg"
          >
            <Icon aria-hidden size={18} className="shrink-0" />
            <span className="min-w-0 flex-1 py-2 text-[14.5px] leading-snug">{toast.text}</span>
            {toast.action && (
              <button
                type="button"
                className="min-h-12 shrink-0 rounded-[12px] px-3 font-semibold text-[var(--accent)]"
                style={{ filter: 'brightness(1.25)' }}
                onClick={() => {
                  toast.action!.onAction();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Show {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
