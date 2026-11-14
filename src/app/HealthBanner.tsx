import { useEffect, useRef, useState } from 'react';
import { Copy, RotateCw, TriangleAlert, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { currentProblem, healthReport, subscribeHealth } from '../data/health';

/** Copia el diagnóstico para pegarlo en el chat. */
export function useCopyHealth() {
  const { t } = useI18n();
  const toast = useToast();
  return async () => {
    try {
      await navigator.clipboard.writeText(await healthReport());
      toast(t.health.copied, { tone: 'ok' });
    } catch {
      toast(t.health.copyFailed);
    }
  };
}

/** Aviso arriba de la pantalla cuando la base del teléfono tarda o falla: nunca una pantalla en blanco sin explicación. */
export function HealthBanner() {
  const { t } = useI18n();
  const toast = useToast();
  const copy = useCopyHealth();
  const [problem, setProblem] = useState(currentProblem);
  const [hidden, setHidden] = useState(false);
  const before = useRef(problem);
  useEffect(() => subscribeHealth(() => setProblem(currentProblem())), []);
  // Se recuperó sola: fuera el aviso, y un mensaje breve por si conviene copiar el registro.
  useEffect(() => {
    if (before.current && !problem) toast(t.health.recovered, { action: { label: t.health.copyShort, onAction: () => void copy() } });
    before.current = problem;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem]);
  if (!problem || hidden) return null;
  return (
    <div role="alert" className="mx-auto w-full max-w-160 px-[max(16px,env(safe-area-inset-left))] pt-[max(8px,env(safe-area-inset-top))]">
      <div className="flex flex-col gap-2.5 rounded-[18px] bg-bad-soft p-3.5">
        <div className="flex items-start gap-2.5">
          <TriangleAlert aria-hidden size={20} className="mt-0.5 shrink-0 text-bad" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-[15px] font-semibold">{t.health.title}</p>
            <p className="text-[14px] leading-relaxed">{t.health.body}</p>
          </div>
          <button type="button" aria-label={t.health.dismiss} onClick={() => setHidden(true)} className="-mt-1 -mr-1 grid size-12 shrink-0 place-items-center rounded-[12px]">
            <X aria-hidden size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <Button icon={RotateCw} onClick={() => location.reload()}>
            {t.health.reload}
          </Button>
          <Button icon={Copy} onClick={() => void copy()}>
            {t.health.copy}
          </Button>
        </div>
      </div>
    </div>
  );
}
