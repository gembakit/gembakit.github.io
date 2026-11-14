import { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, ExternalLink, FileSpreadsheet, Loader2, Sheet as SheetIcon, WifiOff } from 'lucide-react';
import { useI18n } from '../i18n';
import { gisReady, GoogleAuthError, loadGis } from '../google/gis';
import { GoogleApiError } from '../google/api';
import { ensureToken, forgetToken } from '../google/session';
import { exportToGoogleSheet } from '../google/exportSheet';
import { sheetLocale } from '../google/sheetsOutput';
import { looseFolder } from '../google/driveFolders';
import { folderMemory } from '../google/folderMemory';
import type { SheetDef } from '../sheet/types';
import { THEMES } from './theme/themes';
import { useTheme } from './theme/ThemeProvider';
import { Button } from './Button';
import { Sheet } from './Sheet';

type Phase = { k: 'idle' } | { k: 'creating' } | { k: 'done'; url: string } | { k: 'error'; text: string };

/** Hoja inferior «Exportar»: crea la hoja de Google de la herramienta; Excel, próximamente. */
export function ExportPanel({ open, onClose, build }: { open: boolean; onClose: () => void; build: () => SheetDef | null }) {
  const { t, lang } = useI18n();
  const e = t.exporting;
  const { theme } = useTheme();
  const [gis, setGis] = useState<'loading' | 'ready' | 'failed'>(gisReady() ? 'ready' : 'loading');
  const [online, setOnline] = useState(navigator.onLine);
  const [phase, setPhase] = useState<Phase>({ k: 'idle' });

  useEffect(() => {
    if (!open) return;
    setPhase({ k: 'idle' });
    setOnline(navigator.onLine);
    let alive = true;
    // La conexión con Google se prepara al abrir el panel, para que el toque
    // en «Crear hoja» pueda abrir la ventana de Google sin que el navegador la bloquee.
    if (!gisReady() && navigator.onLine) {
      setGis('loading');
      loadGis().then(
        () => alive && setGis('ready'),
        () => alive && setGis('failed'),
      );
    }
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      alive = false;
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [open]);

  const create = () => {
    const def = build();
    if (!def || phase.k === 'creating') return;
    const pending = ensureToken(); // primero, sin esperas: lo pide el navegador
    setPhase({ k: 'creating' });
    pending
      .then(async (tk) => {
        // Sin proyecto, el archivo va a Gemba Kit / Sueltas (no a la raíz del Drive).
        const folder = await looseFolder(tk.accessToken, { root: t.data.folderRoot, loose: t.data.folderLoose }, folderMemory);
        return exportToGoogleSheet(tk.accessToken, def, THEMES[theme].light, sheetLocale(lang), fetch, folder);
      })
      .then((ref) => setPhase({ k: 'done', url: ref.url }))
      .catch((err: unknown) => {
        if (err instanceof GoogleAuthError) return setPhase({ k: 'error', text: e.noPermission });
        if (err instanceof GoogleApiError && err.status === 401) forgetToken();
        setPhase({ k: 'error', text: e.failed(err instanceof Error ? err.message : String(err)) });
      });
  };

  const busy = phase.k === 'creating';
  const status = !online ? (
    <Status icon={WifiOff} tone="warn" text={e.offline} />
  ) : gis === 'loading' ? (
    <Status icon={Loader2} spin tone="muted" text={e.loading} />
  ) : gis === 'failed' ? (
    <Status icon={CircleAlert} tone="bad" text={e.loadFailed} />
  ) : phase.k === 'creating' ? (
    <Status icon={Loader2} spin tone="muted" text={e.creating} />
  ) : phase.k === 'done' ? (
    <Status icon={CircleCheck} tone="ok" text={e.done} />
  ) : phase.k === 'error' ? (
    <Status icon={CircleAlert} tone="bad" text={phase.text} />
  ) : null;

  return (
    <Sheet open={open} onClose={onClose} title={e.title}>
      <section className="flex flex-col gap-3 rounded-[18px] bg-surface p-4 shadow-[inset_0_0_0_1.5px_var(--line)]">
        <div className="grid grid-cols-[44px_minmax(0,1fr)] items-start gap-3">
          <span className="grid size-11 place-items-center rounded-[13px] bg-soft text-accent-ink">
            <SheetIcon aria-hidden size={22} />
          </span>
          <div className="min-w-0">
            <h3 className="text-[16px] font-semibold">{e.google}</h3>
            <p className="text-[14px] leading-snug text-muted">{e.googleDesc}</p>
          </div>
        </div>
        {status}
        {phase.k === 'done' ? (
          <a
            href={phase.url}
            target="_blank"
            rel="noopener noreferrer"
            className="press btn-primary inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[15px] px-4 text-[16px] font-semibold text-on-accent"
          >
            <ExternalLink aria-hidden size={20} strokeWidth={1.9} />
            <span>{e.open}</span>
          </a>
        ) : (
          <Button variant="primary" icon={SheetIcon} onClick={create} disabled={!online || gis !== 'ready' || busy} className="w-full">
            {e.create}
          </Button>
        )}
      </section>

      <section aria-disabled="true" className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3 rounded-[18px] p-4 opacity-70 shadow-[inset_0_0_0_1.5px_var(--line)]">
        <span className="grid size-11 place-items-center rounded-[13px] bg-surface-2 text-muted">
          <FileSpreadsheet aria-hidden size={22} />
        </span>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <h3 className="text-[16px] font-semibold">{e.excel}</h3>
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[12.5px] font-semibold text-muted">{e.soon}</span>
        </div>
      </section>
      <p className="text-[13.5px] text-muted">{e.later}</p>
    </Sheet>
  );
}

function Status({ icon: Icon, tone, text, spin }: { icon: typeof CircleCheck; tone: 'ok' | 'warn' | 'bad' | 'muted'; text: string; spin?: boolean }) {
  const color = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', muted: 'text-muted' }[tone];
  return (
    <p role="status" className="flex items-start gap-2.5 text-[14.5px] leading-snug">
      <Icon aria-hidden size={19} className={`mt-px shrink-0 ${color} ${spin ? 'animate-spin' : ''}`} />
      <span className="min-w-0">{text}</span>
    </p>
  );
}
