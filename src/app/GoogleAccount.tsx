import { useState, useSyncExternalStore } from 'react';
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

/** Las carpetas que la app crea en Drive, dibujadas como un árbol. */
function FolderTree() {
  const { t } = useI18n();
  const d = t.data;
  return (
    <div className="rounded-[14px] bg-surface-2 px-3.5 py-3 text-[14.5px]">
      <p className="flex items-center gap-2 font-semibold">
        <Folder aria-hidden size={18} className="shrink-0 text-accent-ink" />
        <span className="min-w-0">{d.folderRoot}</span>
      </p>
      <ul className="mt-1.5 ml-2 flex flex-col gap-1.5 border-l-2 border-line pl-3.5">
        {[d.folderProjects, d.folderLoose, d.folderBackups].map((n) => (
          <li key={n} className="flex items-center gap-2">
            <Folder aria-hidden size={16} className="shrink-0 text-muted" />
            <span className="min-w-0">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Conectar, ver y desconectar la cuenta de Google. Al conectar, crea en el
 * Drive de esa cuenta la carpeta Gemba Kit con sus tres carpetas.
 * `onboarding`: dentro de la bienvenida (sin «Desconectar»).
 */
export function GoogleAccountPanel({ onboarding = false }: { onboarding?: boolean }) {
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

  const connection = !online ? (
    <Status icon={WifiOff} tone="warn" text={a.offline} />
  ) : gis === 'loading' ? (
    <Status icon={Loader2} spin tone="muted" text={a.loadingGoogle} />
  ) : gis === 'failed' ? (
    <Status icon={CircleAlert} tone="bad" text={a.googleFailed} />
  ) : null;

  const opStatus =
    op.k === 'busy' ? (
      <Status icon={Loader2} spin tone="muted" text={op.text} />
    ) : op.k === 'done' ? (
      <Status icon={CircleCheck} tone="ok" text={op.text} />
    ) : op.k === 'error' ? (
      <Status icon={CircleAlert} tone="bad" text={op.text} />
    ) : null;

  if (!account) {
    return (
      <div className="flex flex-col gap-3.5">
        {!onboarding && <p className="text-[15px] leading-relaxed">{a.notConnected}</p>}
        <p className="text-[15px] leading-relaxed">{a.foldersIntro}</p>
        <FolderTree />
        <p className="flex items-start gap-2.5 text-[14px] leading-relaxed text-muted">
          <ShieldCheck aria-hidden size={19} className="mt-0.5 shrink-0 text-ok" />
          <span>{a.privacy}</span>
        </p>
        {connection}
        {opStatus}
        <Button variant={onboarding ? 'primary' : 'secondary'} icon={LogIn} disabled={!ready} onClick={connect} className={onboarding ? 'w-full' : 'self-start'}>
          {a.connect}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Status icon={CircleCheck} tone="ok" text={a.connected(account)} />
      {root ? (
        <a
          href={folderUrl(root)}
          target="_blank"
          rel="noopener noreferrer"
          className="press raised-sm inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-[15px] px-4 text-[15px] font-semibold"
        >
          <ExternalLink aria-hidden size={20} strokeWidth={1.9} className="shrink-0" />
          <span>{a.openFolder}</span>
        </a>
      ) : (
        root === null && (
          <>
            <p className="text-[15px] leading-relaxed">{a.noFolders}</p>
            {connection}
            <Button icon={FolderPlus} disabled={!ready} onClick={createFolders} className="self-start">
              {a.createFolders}
            </Button>
          </>
        )
      )}
      {opStatus}
      {!onboarding && (
        <div className="flex flex-col gap-1.5 border-t border-line pt-3">
          <Button variant="ghost" icon={LogOut} onClick={disconnect} disabled={busy} className="self-start px-0">
            {a.disconnect}
          </Button>
          <p className="text-[13.5px] leading-relaxed text-muted">{a.disconnectHint}</p>
        </div>
      )}
    </div>
  );
}
