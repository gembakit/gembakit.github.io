import { useEffect, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight, ChevronLeft, CircleCheck, FolderPlus, LogIn, ShieldCheck, Smartphone, WifiOff, type LucideIcon } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Button } from '../../ui/Button';
import { useTheme } from '../../ui/theme/ThemeProvider';
import { cssVariables } from '../../ui/theme/themes';
import { markWelcomeDone } from '../../google/account';
import { FolderTree, OpenFolderLink, useGoogleConnection } from '../GoogleAccount';

// La bienvenida va siempre con la paleta neutra «Pizarra» en oscuro, sobre
// fotos de planta (pedido del dueño, 2026-11-20: más profesional, con efecto
// «wow», y con formato de ordenador en el ordenador y de teléfono en el teléfono).
const WELCOME_THEME = 'pizarra' as const;

// Fotos de Unsplash con licencia libre (https://unsplash.com/license; no exige
// citar al autor): línea de montaje de TruckRun (XBWF6_TEsFM) y dos líneas de
// Homa Appliances (0V9Ua2YsXfE, pWUyHVJgLhg). Cada una en dos tamaños: apaisada
// para pantallas anchas y recortada en vertical (más ligera) para el teléfono.
// No van en la copia sin conexión: si no cargan, queda el fondo azul oscuro.
const PHOTOS = ['linea', 'carrusel', 'automatica'] as const;
const PHOTO_MS = 7000;
const photoUrl = (name: string) => `${import.meta.env.BASE_URL}welcome/${name}.webp`;

const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** El logotipo animado: las barras (el desperdicio) bajan y la línea (el resultado) sube. */
function HeroMark({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden className="shrink-0">
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

/** Qué foto se ve: cambia cada 7 s (se queda en la primera si el teléfono pide menos movimiento). */
function usePhotoIndex() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reducedMotion()) return;
    const id = setInterval(() => setI((n) => (n + 1) % PHOTOS.length), PHOTO_MS);
    return () => clearInterval(id);
  }, []);
  return i;
}

/** Fotos a pantalla completa, fundiéndose una en otra, con un velo oscuro para que el texto se lea. */
function Backdrop({ index }: { index: number }) {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-[radial-gradient(120%_80%_at_70%_20%,#1d3550,#0a1019_65%)]">
      {PHOTOS.map((name, n) => (
        <picture key={name} className={`wk-slide absolute inset-0 ${n === index ? 'wk-slide-on opacity-100' : 'opacity-0'}`}>
          <source media="(max-width: 767px)" srcSet={photoUrl(`${name}-movil`)} />
          <img
            src={photoUrl(name)}
            alt=""
            decoding="async"
            fetchPriority={n === 0 ? 'high' : 'low'}
            className="size-full object-cover"
          />
        </picture>
      ))}
      {/* Teléfono y tableta: el texto va abajo, así que se oscurece de arriba abajo. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(8_12_20/0.55)_0%,rgb(8_12_20/0.1)_26%,rgb(8_12_20/0.72)_52%,rgb(8_12_20/0.96)_78%)] lg:hidden" />
      {/* Ordenador: el texto va a la izquierda, así que se oscurece de izquierda a derecha. */}
      <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgb(8_12_20/0.94)_0%,rgb(8_12_20/0.78)_34%,rgb(8_12_20/0.25)_68%,rgb(8_12_20/0.35)_100%)] lg:block" />
      <div className="absolute inset-0 hidden bg-[linear-gradient(0deg,rgb(8_12_20/0.7),transparent_35%)] lg:block" />
    </div>
  );
}

/** Rayas de las fotos: la de la foto que se ve se va llenando. */
function PhotoDots({ index }: { index: number }) {
  return (
    <div aria-hidden className="flex items-center gap-1.5">
      {PHOTOS.map((name, n) => (
        <span key={name} className="h-[3px] w-7 overflow-hidden rounded-full bg-white/25">
          {n === index && (
            <span key={index} className="wk-fill block h-full w-full bg-white/90" style={{ animationDuration: `${PHOTO_MS}ms` }} />
          )}
        </span>
      ))}
    </div>
  );
}

/** «Lean y Seis Sigma para medir / calcular / …»: el verbo va cambiando (fijo si el teléfono pide menos movimiento). */
function RotatingVerb() {
  const { t } = useI18n();
  const a = t.account;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reducedMotion()) return;
    const id = setInterval(() => setI((n) => (n + 1) % a.verbs.length), 2200);
    return () => clearInterval(id);
  }, [a.verbs.length]);
  return (
    <p className="text-[16.5px] whitespace-nowrap text-white/75 sm:text-[19px] lg:text-[22px]">
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

/** Botones sobre la foto: el principal, blanco; el otro, de cristal. */
function HeroButton({
  tone,
  icon: Icon,
  children,
  className = '',
  ...rest
}: { tone: 'solid' | 'glass'; icon?: LucideIcon; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const look =
    tone === 'solid'
      ? 'bg-white text-[#0B1A27] shadow-[0_18px_40px_-16px_rgb(128_177_222/0.75)]'
      : 'border border-white/30 bg-white/10 text-white backdrop-blur-md';
  return (
    <button
      type="button"
      className={`press inline-flex min-h-[54px] items-center justify-center gap-2 rounded-[15px] px-6 text-[16px] font-semibold ${look} ${className}`}
      {...rest}
    >
      {Icon && <Icon aria-hidden size={20} strokeWidth={1.9} className="shrink-0" />}
      <span>{children}</span>
    </button>
  );
}

/** Tarjeta de cristal oscuro para conectar la cuenta y para «Todo listo». */
function Panel({ children }: { children: ReactNode }) {
  return (
    <aside className="wk-in flex w-full max-w-140 flex-col gap-5 rounded-[26px] border border-white/10 bg-surface/90 p-5 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] backdrop-blur-xl sm:p-7 lg:max-w-none">
      {children}
    </aside>
  );
}

/**
 * Bienvenida: sale la primera vez que se abre la app sin cuenta conectada
 * (y en `#/bienvenida`). Conectar Google es opcional: la app funciona entera
 * sin cuenta (CLAUDE.md, restricción 1). Las carpetas de Drive solo se
 * explican al pulsar «Conectar con Google».
 *
 * Teléfono: foto de fondo y el texto abajo, como portada. Ordenador: foto a lo
 * ancho, texto grande a la izquierda y la tarjeta de conectar a la derecha.
 */
export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const a = t.account;
  const { setPaintAs } = useTheme();
  const g = useGoogleConnection();
  const photo = usePhotoIndex();
  const [step, setStep] = useState<'intro' | 'connect'>('intro');
  const finish = () => {
    markWelcomeDone();
    onDone();
  };

  // Mientras se ve la bienvenida, toda la app (avisos y barra del navegador incluidos) va en «Pizarra» oscuro.
  useEffect(() => {
    setPaintAs(WELCOME_THEME, 'dark');
    return () => setPaintAs(null);
  }, [setPaintAs]);

  const view = g.account ? 'done' : step;
  const withPanel = view !== 'intro';

  return (
    <div style={cssVariables(WELCOME_THEME, 'dark') as CSSProperties} className="relative isolate min-h-dvh text-text">
      <Backdrop index={photo} />
      <div className="mx-auto flex min-h-dvh w-full max-w-320 flex-col px-[max(16px,env(safe-area-inset-left))] pt-[max(20px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))] sm:px-8 lg:px-14 lg:pb-10">
        <header className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2.5 font-display text-[18px] font-bold tracking-tight text-white">
            <HeroMark size={38} />
            <span>{t.app.name}</span>
          </p>
          <PhotoDots index={photo} />
        </header>

        <div className="flex flex-1 flex-col justify-end gap-8 pt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-center lg:gap-16 lg:pt-6">
          <section key="intro" className={`max-w-140 flex-col gap-7 lg:max-w-none ${withPanel ? 'hidden lg:flex' : 'flex'}`}>
            <div className="wk-in flex flex-col gap-4" style={{ animationDelay: '0.15s' }}>
              <p className="flex items-center gap-3 text-[13px] font-bold tracking-[0.18em] text-accent-ink uppercase lg:text-[14px]">
                <span aria-hidden className="h-px w-8 bg-accent-ink" />
                {a.eyebrow}
              </p>
              <h1 className="font-display text-[clamp(36px,10.5vw,46px)] leading-[1.04] font-bold tracking-tight text-balance text-white sm:text-[56px] lg:text-[clamp(58px,5.4vw,78px)] lg:leading-[1.02]">
                {a.slogan}
              </h1>
              <RotatingVerb />
            </div>
            <ul className="wk-in flex flex-wrap gap-2" style={{ animationDelay: '0.35s' }}>
              {[
                { icon: WifiOff, text: a.perks[0] },
                { icon: Smartphone, text: a.perks[1] },
              ].map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[13.5px] font-medium text-white/85 backdrop-blur-md"
                >
                  <Icon aria-hidden size={16} className="shrink-0 text-accent-ink" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            {view === 'intro' && (
              <div className="wk-in flex flex-col gap-2.5 pt-1" style={{ animationDelay: '0.5s' }}>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <HeroButton tone="solid" icon={LogIn} onClick={() => setStep('connect')} className="w-full sm:w-auto">
                    {a.connect}
                  </HeroButton>
                  <HeroButton tone="glass" onClick={finish} className="w-full sm:w-auto">
                    {a.skip}
                  </HeroButton>
                </div>
                <p className="pt-1 text-center text-[13px] leading-relaxed text-white/65 sm:text-left">{a.optionalHint}</p>
              </div>
            )}
          </section>

          {view === 'connect' && (
            <Panel key="connect">
              <header className="-ml-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setStep('intro')}
                  aria-label={t.common.back}
                  className="press grid size-12 shrink-0 place-items-center rounded-full text-text"
                >
                  <ChevronLeft aria-hidden size={24} />
                </button>
                <h2 className="font-display text-[22px] leading-tight font-bold tracking-tight">{a.connect}</h2>
              </header>
              <p className="text-[15.5px] leading-relaxed">{a.why}</p>
              <p className="text-[15.5px] leading-relaxed">{a.foldersIntro}</p>
              <FolderTree />
              <p className="flex items-start gap-2.5 text-[14px] leading-relaxed text-muted">
                <ShieldCheck aria-hidden size={19} className="mt-0.5 shrink-0 text-ok" />
                <span>{a.privacy}</span>
              </p>
              {g.connection}
              {g.opStatus}
              <Button variant="primary" icon={LogIn} disabled={!g.ready} onClick={g.connect} className="w-full">
                {a.continueGoogle}
              </Button>
            </Panel>
          )}

          {view === 'done' && (
            <Panel key="done">
              <CircleCheck aria-hidden size={48} strokeWidth={1.6} className="text-ok" />
              <div className="flex flex-col gap-2">
                <h2 className="font-display text-[28px] leading-[1.1] font-bold tracking-tight">{a.doneTitle}</h2>
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
              <Button variant="primary" icon={ArrowRight} onClick={finish} className="w-full">
                {a.start}
              </Button>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
