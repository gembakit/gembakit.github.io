import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, ExternalLink, Folder, FolderPlus, Loader2, LogIn, LogOut, ShieldCheck, WifiOff, type LucideIcon } from 'lucide-react';
import { useI18n } from '../i18n';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useLive } from '../projects/live';
import { GoogleApiError } from '../google/api';
import { GoogleAuthError } from '../google/gis';
import { folderUrl } from '../google/driveFolders';
import { folderMemory } from '../google/folderMemory';
import { adoptAccount, disconnectGoogle, ensureAppFolders, rootFolderId } from '../google/account';
import { currentAccount, ensureToken, forgetToken, signIn, subscribeAccount } from '../google/session';
import { useGoogleReady } from '../google/useGoogleReady';

type Op = { k: 'idle' } | { k: 'busy'; text: string } | { k: 'done'; text: string } | { k: 'error'; text: string };

/** La cuenta de Google conectada en este aparato (se actualiza sola). */
export function useGoogleAccount(): string | null {
  return useSyncExternalStore(subscribeAccount, currentAccount);
}

export function Status({ icon: Icon, tone, text, spin }: { icon: LucideIcon; tone: 'ok' | 'warn' | 'bad' | 'muted'; text: string; spin?: boolean }) {
  const color = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', muted: 'text-muted' }[tone];
  return (
    <p role="status" className="flex items-start gap-2.5 text-[14.5px] leading-snug">
      <Icon aria-hidden size={19} className={`mt-px shrink-0 ${color} ${spin ? 'animate-spin' : ''}`} />
      <span className="min-w-0 wrap-break-word">{text}</span>
    </p>
  );
}

/** Las carpetas que la app crea en Drive, dibujadas como un árbol. `ready`: ya creadas (con su marca). */
export function FolderTree({ ready = false }: { ready?: boolean }) {
  const { t } = useI18n();
  const d = t.data;
  const Mark = ({ size }: { size: number }) =>
    ready ? <CircleCheck aria-hidden size={size} className="shrink-0 text-ok" /> : <Folder aria-hidden size={size} className="shrink-0 text-muted" />;
  return (
    <div className="rounded-[14px] bg-surface-2 px-3.5 py-3 text-[14.5px]">
      <p className="flex items-center gap-2 font-semibold">
        {ready ? <Mark size={18} /> : <Folder aria-hidden size={18} className="shrink-0 text-accent-ink" />}
        <span className="min-w-0">{d.folderRoot}</span>
      </p>
      <ul className="mt-1.5 ml-2 flex flex-col gap-1.5 border-l-2 border-line pl-3.5">
        {[d.folderProjects, d.folderLoose, d.folderBackups].map((n) => (
          <li key={n} className="flex items-center gap-2">
            <Mark size={16} />
            <span className="min-w-0">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Conectar, crear las carpetas y desconectar la cuenta de Google. Lo usan la
 * bienvenida y Ajustes. Al conectar se crea en el Drive de esa cuenta la
 * carpeta Gemba Kit con sus tres carpetas.
 */
export function useGoogleConnection() {
  const { t } = useI18n();
  const a = t.account;
  const toast = useToast();
  const account = useGoogleAccount();
  const root = useLive(rootFolderId, [account]);
  const { online, gis } = useGoogleReady();
  const [op, setOp] = useState<Op>({ k: 'idle' });
  const busy = op.k === 'busy';
  const ready = online && gis === 'ready' && !busy;
  const names = { root: t.data.folderRoot, projects: t.data.folderProjects, loose: t.data.folderLoose, backups: t.data.folderBackups };

  const fail = (err: unknown) => {
    if (err instanceof GoogleAuthError) return setOp({ k: 'error', text: a.noPermission });
    if (err instanceof GoogleApiError && err.status === 401) forgetToken();
    setOp({ k: 'error', text: a.failed(err instanceof Error ? err.message : String(err)) });
  };

  const connect = () => {
    if (!ready) return;
    // La ventana de Google se abre aquí mismo, dentro del toque.
    const pending = signIn();
    setOp({ k: 'busy', text: a.connecting });
    pending
      .then(async ({ token, email }) => {
        if (!email) throw new Error(a.noEmail);
        await adoptAccount(email);
        setOp({ k: 'busy', text: a.creatingFolders });
        await ensureAppFolders(token.accessToken, names, folderMemory);
        setOp({ k: 'done', text: a.foldersReady });
      })
      .catch(fail);
  };

  const createFolders = () => {
    if (!ready) return;
    const pending = ensureToken();
    setOp({ k: 'busy', text: a.creatingFolders });
    pending
      .then(async (tk) => {
        await ensureAppFolders(tk.accessToken, names, folderMemory);
        setOp({ k: 'done', text: a.foldersReady });
      })
      .catch(fail);
  };

  const disconnect = () => {
    setOp({ k: 'idle' });
    void disconnectGoogle().then(() => toast(a.disconnected));
  };

  /** Por qué no se puede conectar ahora (sin red, cargando Google…), o null. */
  const connection: ReactNode = !online ? (
    <Status icon={WifiOff} tone="warn" text={a.offline} />
  ) : gis === 'loading' ? (
    <Status icon={Loader2} spin tone="muted" text={a.loadingGoogle} />
  ) : gis === 'failed' ? (
    <Status icon={CircleAlert} tone="bad" text={a.googleFailed} />
  ) : null;

  /** Cómo fue lo último que se pidió. */
  const opStatus: ReactNode =
    op.k === 'busy' ? (
      <Status icon={Loader2} spin tone="muted" text={op.text} />
    ) : op.k === 'error' ? (
      <Status icon={CircleAlert} tone="bad" text={op.text} />
    ) : op.k === 'done' ? (
      <Status icon={CircleCheck} tone="ok" text={op.text} />
    ) : null;

  return { account, root, ready, busy, op, connect, createFolders, disconnect, connection, opStatus };
}

/** Enlace «Abrir la carpeta en Drive». */
export function OpenFolderLink({ id, className = '' }: { id: string; className?: string }) {
  const { t } = useI18n();
  return (
    <a
      href={folderUrl(id)}
      target="_blank"
      rel="noopener noreferrer"
      className={`press raised-sm inline-flex min-h-12 items-center justify-center gap-2 rounded-[15px] px-4 text-[15px] font-semibold ${className}`}
    >
      <ExternalLink aria-hidden size={20} strokeWidth={1.9} className="shrink-0" />
      <span>{t.account.openFolder}</span>
    </a>
  );
}

/** Ajustes › Cuenta de Google: conectar, ver la cuenta, abrir su carpeta y desconectar. */
export function GoogleAccountPanel() {
  const { t } = useI18n();
  const a = t.account;
  const g = useGoogleConnection();

  if (!g.account) {
    return (
      <div className="flex flex-col gap-3.5">
        <p className="text-[15px] leading-relaxed">{a.notConnected}</p>
        <p className="text-[15px] leading-relaxed">{a.foldersIntro}</p>
        <FolderTree />
        <p className="flex items-start gap-2.5 text-[14px] leading-relaxed text-muted">
          <ShieldCheck aria-hidden size={19} className="mt-0.5 shrink-0 text-ok" />
          <span>{a.privacy}</span>
        </p>
        {g.connection}
        {g.opStatus}
        <Button icon={LogIn} disabled={!g.ready} onClick={g.connect} className="self-start">
          {a.connect}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Status icon={CircleCheck} tone="ok" text={a.connected(g.account)} />
      {g.root ? (
        <OpenFolderLink id={g.root} className="self-start" />
      ) : (
        g.root === null && (
          <>
            <p className="text-[15px] leading-relaxed">{a.noFolders}</p>
            {g.connection}
            <Button icon={FolderPlus} disabled={!g.ready} onClick={g.createFolders} className="self-start">
              {a.createFolders}
            </Button>
          </>
        )
      )}
      {g.opStatus}
      <div className="flex flex-col gap-1.5 border-t border-line pt-3">
        <Button variant="ghost" icon={LogOut} onClick={g.disconnect} disabled={g.busy} className="self-start px-0">
          {a.disconnect}
        </Button>
        <p className="text-[13.5px] leading-relaxed text-muted">{a.disconnectHint}</p>
      </div>
    </div>
  );
}
