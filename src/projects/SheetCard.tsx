import { useCallback, useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, CloudUpload, ExternalLink, FolderOpen, Loader2, RefreshCw, Sheet as SheetIcon, TriangleAlert, WifiOff } from 'lucide-react';
import { useI18n } from '../i18n';
import { gisReady, GoogleAuthError, loadGis } from '../google/gis';
import { GoogleApiError } from '../google/api';
import { ensureToken, forgetToken } from '../google/session';
import { folderUrl } from '../google/driveFolders';
import { THEMES } from '../ui/theme/themes';
import { useTheme } from '../ui/theme/ThemeProvider';
import { Button } from '../ui/Button';
import { Card, Label } from '../ui/Layout';
import { Sheet } from '../ui/Sheet';
import { formatDateTime, useLive } from './live';
import { sheetStatus, syncNow, useSyncState } from './sheetSync';

/** Tarjeta «Hoja de Google» del proyecto: crear la hoja, su estado, sincronizar y abrirla. */
export function SheetCard({ projectId }: { projectId: string }) {
  const { t, lang } = useI18n();
  const g = t.gsheet;
  const { theme } = useTheme();
  const status = useLive(() => sheetStatus(projectId), [projectId]);
  const run = useSyncState(projectId);
  const [online, setOnline] = useState(navigator.onLine);
  const [gis, setGis] = useState<'loading' | 'ready' | 'failed'>(gisReady() ? 'ready' : 'loading');
  const [conflictOpen, setConflictOpen] = useState(false);
  const closeConflict = useCallback(() => setConflictOpen(false), []);

  useEffect(() => {
    let alive = true;
    // La conexión con Google se prepara al abrir el proyecto: así el toque puede abrir su ventana sin que el navegador la bloquee.
    if (!gisReady() && navigator.onLine)
      loadGis().then(
        () => alive && setGis('ready'),
        () => alive && setGis('failed'),
      );
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      alive = false;
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!status) return null;
  const { link, pending } = status;
  const busy = run.k === 'syncing';
  const ready = online && gis === 'ready' && !busy;

  // Pedir el permiso de Google es lo primero del toque, sin esperas antes.
  const start = (opts: { resolve?: 'keep' | 'overwrite'; recreate?: boolean } = {}) => {
    if (!ready) return;
    const token = ensureToken();
    setConflictOpen(false);
    token
      .then((tk) => syncNow(projectId, tk.accessToken, { t, lang, palette: THEMES[theme].light }, opts))
      .then((r) => r?.k === 'conflict' && setConflictOpen(true))
      .catch((err: unknown) => {
        if (err instanceof GoogleApiError && err.status === 401) forgetToken();
      });
  };

  const errorText = (err: unknown) => (err instanceof GoogleAuthError ? g.noPermission : g.failed(err instanceof Error ? err.message : String(err)));

  let line: { icon: typeof CircleCheck; tone: 'ok' | 'warn' | 'bad' | 'muted'; text: string; spin?: boolean } | null = null;
  if (run.k === 'syncing') line = { icon: Loader2, tone: 'muted', text: run.creating ? g.creating : g.syncing, spin: true };
  else if (run.k === 'error') line = { icon: CircleAlert, tone: 'bad', text: errorText(run.error) };
  else if (run.k === 'conflict') line = { icon: TriangleAlert, tone: 'warn', text: g.conflictShort };
  else if (run.k === 'missing') line = { icon: TriangleAlert, tone: 'warn', text: g.missing };
  else if (run.k === 'done' && pending === 0) line = { icon: CircleCheck, tone: 'ok', text: run.created ? g.created : g.done(run.written, run.removed) };
  else if (link && pending > 0) line = { icon: CloudUpload, tone: 'muted', text: g.pending(pending) };
  else if (link) line = { icon: CircleCheck, tone: 'ok', text: g.upToDate(formatDateTime(link.syncedAt, lang)) };

  const connection = !online ? (
    <Status icon={WifiOff} tone="warn" text={g.offline} />
  ) : gis === 'loading' ? (
    <Status icon={Loader2} spin tone="muted" text={g.loadingGoogle} />
  ) : gis === 'failed' ? (
    <Status icon={CircleAlert} tone="bad" text={g.googleFailed} />
  ) : null;

  const when = run.k === 'conflict' && run.modifiedTime ? formatDateTime(Date.parse(run.modifiedTime), lang) : '';

  return (
    <section className="flex flex-col gap-3">
      <Label>{g.title}</Label>
      <Card>
        {!link ? (
          <>
            <div className="flex items-start gap-3">
              <SheetIcon aria-hidden size={22} className="mt-0.5 shrink-0 text-accent-ink" />
              <p className="text-[15px] leading-relaxed">{g.none}</p>
            </div>
            {connection}
            {line && <Status {...line} />}
            <Button variant="primary" icon={CloudUpload} className="w-full" disabled={!ready} onClick={() => start()}>
              {g.create}
            </Button>
          </>
        ) : (
          <>
            {line && <Status {...line} />}
            {connection}
            {run.k === 'conflict' && (
              <Button variant="primary" icon={TriangleAlert} className="w-full" onClick={() => setConflictOpen(true)}>
                {g.review}
              </Button>
            )}
            {run.k === 'missing' && (
              <Button variant="primary" icon={RefreshCw} className="w-full" disabled={!ready} onClick={() => start({ recreate: true })}>
                {g.recreate}
              </Button>
            )}
            {run.k !== 'conflict' && run.k !== 'missing' && (
              <Button variant={pending > 0 ? 'primary' : 'secondary'} icon={RefreshCw} className="w-full" disabled={!ready} onClick={() => start()}>
                {g.sync}
              </Button>
            )}
            <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
              <LinkButton href={link.url} icon={ExternalLink} text={g.openSheet} />
              <LinkButton href={folderUrl(link.folderId)} icon={FolderOpen} text={g.openFolder} />
            </div>
            <p className="text-[13.5px] leading-relaxed text-muted">{g.autoHint}</p>
          </>
        )}
      </Card>

      <Sheet open={conflictOpen && run.k === 'conflict'} onClose={closeConflict} title={g.conflictTitle}>
        {run.k === 'conflict' && (
          <>
            <p className="text-[15px] leading-relaxed">{g.conflictBody(run.tabs.map((x) => `«${x}»`).join(', '))}</p>
            {when && <p className="text-[14.5px] leading-relaxed text-muted">{run.me || !run.by ? g.conflictByMe(when) : g.conflictBy(run.by, when)}</p>}
            <div className="flex flex-col gap-2">
              <Button variant="primary" icon={SheetIcon} className="w-full" disabled={!ready} onClick={() => start({ resolve: 'keep' })}>
                {g.keep}
              </Button>
              <p className="text-[13.5px] leading-relaxed text-muted">{g.keepHint}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button icon={RefreshCw} className="w-full" disabled={!ready} onClick={() => start({ resolve: 'overwrite' })}>
                {g.overwrite}
              </Button>
              <p className="text-[13.5px] leading-relaxed text-muted">{g.overwriteHint}</p>
            </div>
          </>
        )}
      </Sheet>
    </section>
  );
}

function LinkButton({ href, icon: Icon, text }: { href: string; icon: typeof ExternalLink; text: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="press raised-sm inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] px-4 text-[15px] font-semibold"
    >
      <Icon aria-hidden size={20} strokeWidth={1.9} />
      <span>{text}</span>
    </a>
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
