import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowRight, ChevronLeft, CircleCheck, FolderPlus, LogIn, ShieldCheck, Smartphone, WifiOff } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Button } from '../../ui/Button';
import { useTheme } from '../../ui/theme/ThemeProvider';
import { cssVariables } from '../../ui/theme/themes';
import { markWelcomeDone } from '../../google/account';
import { FolderTree, OpenFolderLink, useGoogleConnection } from '../GoogleAccount';

// La bienvenida va siempre con la paleta neutra «Pizarra» (pedido del dueño,
// 2026-11-20: más profesional y menos marrón), sea cual sea el tema elegido.
const WELCOME_THEME = 'pizarra' as const;

/** El logotipo animado: las barras (el desperdicio) bajan y la línea (el resultado) sube. */
function HeroMark() {
  return (
    <svg viewBox="0 0 96 96" width={88} height={88} aria-hidden className="shrink-0">
      <rect width="96" height="96" rx="24" fill="var(--soft)" />
      <rect className="wk-bar" style={{ animationDelay: '0.05s' }} x="20" y="44" width="15" height="36" rx="3" fill="var(--accent)" />
      <rect className="wk-bar" style={{ animationDelay: '0.2s' }} x="40.5" y="58" width="15" height="22" rx="3" fill="var(--accent)" opacity="0.7" />
      <rect className="wk-bar" style={{ animationDelay: '0.35s' }} x="61" y="68" width="15" height="12" rx="3" fill="var(--accent)" opacity="0.45" />
      <path className="wk-line" pathLength={1} d="M22 34 L47 26 L74 17" fill="none" stroke="var(--accent-ink)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="wk-dot" style={{ animationDelay: '1.5s' }} cx="22" cy="34" r="4.5" fill="var(--surface)" stroke="var(--accent-ink)" strokeWidth="3" />
      <circle className="wk-dot" style={{ animationDelay: '1.6s' }} cx="47" cy="26" r="4.5" fill="var(--surface)" stroke="var(--accent-ink)" strokeWidth="3" />
      <circle className="wk-pulse" cx="74" cy="17" r="4.5" fill="none" stroke="var(--accent-ink)" strokeWidth="2" />
      <circle className="wk-dot" style={{ animationDelay: '1.7s' }} cx="74" cy="17" r="4.5" fill="var(--accent-ink)" />
    </svg>
  );
}

/** «Lean y Seis Sigma para medir / calcular / …»: el verbo va cambiando (fijo si el teléfono pide menos movimiento). */
function RotatingVerb() {
  const { t } = useI18n();
  const a = t.account;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % a.verbs.length), 2200);
    return () => clearInterval(id);
  }, [a.verbs.length]);
  return (
    <p className="text-[16.5px] whitespace-nowrap text-muted">
      <span className="sr-only">{a.verbsAll}</span>
      <span aria-hidden>
        {a.verbsLead}{' '}
        <span key={i} className="wk-word font-semibold text-accent-ink">
          {a.verbs[i % a.verbs.length]}
        </span>
      </span>
    </p>
  );
}

/**
 * Bienvenida: sale la primera vez que se abre la app sin cuenta conectada
 * (y en `#/bienvenida`). Conectar Google es opcional: la app funciona entera
 * sin cuenta (CLAUDE.md, restricción 1). Las carpetas de Drive solo se
 * explican al pulsar «Conectar con Google».
 */
export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const a = t.account;
  const { mode, setPaintAs } = useTheme();
  const g = useGoogleConnection();
  const [step, setStep] = useState<'intro' | 'connect'>('intro');
  const finish = () => {
    markWelcomeDone();
    onDone();
  };

  // Mientras se ve la bienvenida, toda la app (avisos y barra del navegador incluidos) va con la paleta neutra.
  useEffect(() => {
    setPaintAs(WELCOME_THEME);
    return () => setPaintAs(null);
  }, [setPaintAs]);

  const view = g.account ? 'done' : step;

  return (
    <div
      style={cssVariables(WELCOME_THEME, mode) as CSSProperties}
      className="min-h-dvh bg-bg bg-[radial-gradient(130%_55%_at_50%_0%,var(--soft),transparent_70%)] text-text"
    >
      <main className="mx-auto flex min-h-dvh w-full max-w-110 flex-col px-[max(16px,env(safe-area-inset-left))] pt-[max(28px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
        {view === 'intro' && (
          <div key="intro" className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col justify-center gap-7 py-6">
              <HeroMark />
              <div className="wk-in flex flex-col gap-3" style={{ animationDelay: '0.25s' }}>
                <p className="text-[13px] font-bold tracking-[0.16em] text-accent-ink uppercase">{t.app.name}</p>
                <h1 className="font-display text-[34px] leading-[1.08] font-bold tracking-tight text-balance">{a.slogan}</h1>
                <RotatingVerb />
              </div>
              <ul className="wk-in flex flex-wrap gap-2" style={{ animationDelay: '0.45s' }}>
                {[
                  { icon: WifiOff, text: a.perks[0] },
                  { icon: Smartphone, text: a.perks[1] },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[13.5px] font-medium text-muted">
                    <Icon aria-hidden size={16} className="shrink-0 text-accent-ink" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="wk-in flex flex-col gap-2.5" style={{ animationDelay: '0.6s' }}>
              <Button variant="primary" icon={LogIn} onClick={() => setStep('connect')} className="w-full">
                {a.connect}
              </Button>
              <Button onClick={finish} className="w-full">
                {a.skip}
              </Button>
              <p className="pt-1 text-center text-[13px] leading-relaxed text-muted">{a.optionalHint}</p>
            </div>
          </div>
        )}

        {view === 'connect' && (
          <div key="connect" className="wk-in flex flex-1 flex-col gap-5">
            <header className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('intro')}
                aria-label={t.common.back}
                className="press grid size-12 shrink-0 place-items-center rounded-full text-text"
              >
                <ChevronLeft aria-hidden size={24} />
              </button>
              <h1 className="font-display text-[22px] leading-tight font-bold tracking-tight">{a.connect}</h1>
            </header>
            <div className="flex flex-1 flex-col gap-4">
              <p className="text-[15.5px] leading-relaxed">{a.why}</p>
              <p className="text-[15.5px] leading-relaxed">{a.foldersIntro}</p>
              <FolderTree />
              <p className="flex items-start gap-2.5 text-[14px] leading-relaxed text-muted">
                <ShieldCheck aria-hidden size={19} className="mt-0.5 shrink-0 text-ok" />
                <span>{a.privacy}</span>
              </p>
              {g.connection}
              {g.opStatus}
            </div>
            <Button variant="primary" icon={LogIn} disabled={!g.ready} onClick={g.connect} className="w-full">
              {a.continueGoogle}
            </Button>
          </div>
        )}

        {view === 'done' && (
          <div key="done" className="wk-in flex flex-1 flex-col gap-5">
            <div className="flex flex-1 flex-col justify-center gap-5 py-6">
              <CircleCheck aria-hidden size={52} strokeWidth={1.6} className="text-ok" />
              <div className="flex flex-col gap-2">
                <h1 className="font-display text-[30px] leading-[1.1] font-bold tracking-tight">{a.doneTitle}</h1>
                <p className="text-[15.5px] leading-relaxed wrap-break-word text-muted">{a.connected(g.account!)}</p>
              </div>
              <FolderTree ready={!!g.root} />
              {g.opStatus}
              {g.root && <OpenFolderLink id={g.root} className="self-start" />}
              {g.root === null && (
                <Button icon={FolderPlus} disabled={!g.ready} onClick={g.createFolders} className="self-start">
                  {a.createFolders}
                </Button>
              )}
            </div>
            <Button variant="primary" icon={ArrowRight} onClick={finish} className="w-full">
              {a.start}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
