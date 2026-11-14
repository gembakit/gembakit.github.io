import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, CloudDownload, CloudUpload, Download, ExternalLink, FileUp, HardDrive, Loader2, RotateCcw, ShieldAlert, ShieldCheck, WifiOff } from 'lucide-react';
import { useI18n } from '../../i18n';
import { db } from '../../data/db';
import {
  BackupError,
  backupFileName,
  localCounts,
  makeBackup,
  planRestore,
  readBackup,
  restoreBackup,
  summarize,
  type Backup,
  type RestoreAction,
  type RestorePlanItem,
} from '../../data/backup';
import { gisReady, GoogleAuthError, loadGis } from '../../google/gis';
import { GoogleApiError, type DriveItem } from '../../google/api';
import { ensureToken, forgetToken } from '../../google/session';
import { backupFolder, folderUrl } from '../../google/driveFolders';
import { folderMemory } from '../../google/folderMemory';
import { listDriveBackups, loadDriveBackup, saveBackupToDrive } from '../../google/driveBackup';
import { Button } from '../../ui/Button';
import { Card, DetailHeader, Label, Screen } from '../../ui/Layout';
import { Sheet } from '../../ui/Sheet';
import { useToast } from '../../ui/Toast';
import { formatBytes } from '../../ui/number';
import { formatDateTime, useLive } from '../../projects/live';
import { APP_VERSION } from '../../version';
import { navigate } from '../router';

const LAST_BACKUP = 'lastBackup';

/** Dónde se enseña el estado: en la tarjeta de la copia o en la de restaurar. */
type Where = 'backup' | 'restore';
type Op =
  | { k: 'idle' }
  | { k: 'busy'; at: Where; text: string }
  | { k: 'done'; at: Where; text: string; folder?: string }
  | { k: 'error'; at: Where; text: string };

/** Ajustes → Datos y copia de seguridad: dónde está todo, hacer copia (Drive o archivo) y restaurar. */
export function DataScreen() {
  const { t, lang } = useI18n();
  const d = t.data;
  const toast = useToast();
  const counts = useLive(() => localCounts(db), []);
  const last = useLive(async () => (await db.settings.get(LAST_BACKUP))?.value as { at: number; drive: boolean } | undefined, []);
  const [storage, setStorage] = useState<{ used: number; free: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [gis, setGis] = useState<'loading' | 'ready' | 'failed'>(gisReady() ? 'ready' : 'loading');
  const [op, setOp] = useState<Op>({ k: 'idle' });
  const [list, setList] = useState<DriveItem[] | null>(null);
  const [pending, setPendingBackup] = useState<Backup | null>(null);
  const [plan, setPlan] = useState<RestorePlanItem[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const closeList = useCallback(() => setList(null), []);
  const closePending = useCallback(() => setPendingBackup(null), []);
  /** Abre la confirmación y calcula qué pasará con cada proyecto. */
  const setPending = (b: Backup) => {
    setPendingBackup(b);
    setPlan(null);
    planRestore(db, b).then(setPlan, (err: unknown) => {
      setPendingBackup(null);
      fail('restore')(err);
    });
  };

  useEffect(() => {
    void navigator.storage?.estimate?.().then((e) => setStorage({ used: e.usage ?? 0, free: Math.max(0, (e.quota ?? 0) - (e.usage ?? 0)) }));
    void navigator.storage?.persisted?.().then(setPersisted);
    let alive = true;
    // La conexión con Google se prepara al abrir la pantalla: así el toque puede abrir su ventana sin que el navegador la bloquee.
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

  const fail = (at: Where) => (err: unknown) => {
    if (err instanceof GoogleAuthError) return setOp({ k: 'error', at, text: d.noPermission });
    if (err instanceof BackupError) return setOp({ k: 'error', at, text: d.errors[err.code] });
    if (err instanceof GoogleApiError && err.status === 401) forgetToken();
    setOp({ k: 'error', at, text: d.failed(err instanceof Error ? err.message : String(err)) });
  };
  const busy = op.k === 'busy';
  const driveReady = online && gis === 'ready' && !busy;
  const folders = { root: d.folderRoot, backups: d.folderBackups };

  // Pedir el permiso de Google es lo primero del toque, sin esperas antes.
  const toDrive = () => {
    if (!driveReady) return;
    const token = ensureToken();
    setOp({ k: 'busy', at: 'backup', text: d.saving });
    token
      .then(async (tk) => {
        const folder = await backupFolder(tk.accessToken, folders, folderMemory);
        const b = await makeBackup(db, APP_VERSION);
        await saveBackupToDrive(tk.accessToken, folder, backupFileName(b.createdAt), JSON.stringify(b));
        await db.settings.put({ key: LAST_BACKUP, value: { at: b.createdAt, drive: true } });
        setOp({ k: 'done', at: 'backup', text: d.saved, folder });
      })
      .catch(fail('backup'));
  };

  const download = async () => {
    const b = await makeBackup(db, APP_VERSION);
    const url = URL.createObjectURL(new Blob([JSON.stringify(b)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName(b.createdAt);
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    await db.settings.put({ key: LAST_BACKUP, value: { at: b.createdAt, drive: false } });
    setOp({ k: 'done', at: 'backup', text: d.downloaded });
  };

  const openDriveList = () => {
    if (!driveReady) return;
    const token = ensureToken();
    setOp({ k: 'busy', at: 'restore', text: d.listing });
    token
      .then(async (tk) => {
        const folder = await backupFolder(tk.accessToken, folders, folderMemory);
        setList(await listDriveBackups(tk.accessToken, folder));
        setOp({ k: 'idle' });
      })
      .catch(fail('restore'));
  };

  const pickDrive = (item: DriveItem) => {
    const token = ensureToken();
    setList(null);
    setOp({ k: 'busy', at: 'restore', text: d.reading });
    token
      .then(async (tk) => {
        setPending(readBackup(await loadDriveBackup(tk.accessToken, item.id)));
        setOp({ k: 'idle' });
      })
      .catch(fail('restore'));
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPending(readBackup(await file.text()));
      setOp({ k: 'idle' });
    } catch (err) {
      fail('restore')(err);
    }
  };

  const restore = async () => {
    if (!pending) return;
    try {
      const r = await restoreBackup(db, pending);
      const count = (a: RestoreAction) => r.filter((x) => x.action === a).length;
      const text = d.restored({ add: count('add'), revive: count('revive'), update: count('update'), history: count('history') });
      setOp({ k: 'done', at: 'restore', text });
      toast(r.every((x) => x.action === 'same') ? text : d.restoredShort, { tone: 'ok' });
    } catch (err) {
      fail('restore')(err);
    } finally {
      setPendingBackup(null);
    }
  };

  /** Estado de la última operación, en la tarjeta donde se hizo. */
  const opStatus = (at: Where) =>
    op.k === 'idle' || op.at !== at ? null : (
      <div className="flex flex-col gap-2.5">
        {op.k === 'busy' && <Status icon={Loader2} spin tone="muted" text={op.text} />}
        {op.k === 'done' && <Status icon={CircleCheck} tone="ok" text={op.text} />}
        {op.k === 'error' && <Status icon={CircleAlert} tone="bad" text={op.text} />}
        {op.k === 'done' && op.folder && (
          <a
            href={folderUrl(op.folder)}
            target="_blank"
            rel="noopener noreferrer"
            className="press raised-sm inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-[15px] px-4 text-[15px] font-semibold"
          >
            <ExternalLink aria-hidden size={20} strokeWidth={1.9} />
            <span>{d.openFolder}</span>
          </a>
        )}
      </div>
    );

  const status = !online ? (
    <Status icon={WifiOff} tone="warn" text={d.offline} />
  ) : gis === 'loading' ? (
    <Status icon={Loader2} spin tone="muted" text={d.loadingGoogle} />
  ) : gis === 'failed' ? (
    <Status icon={CircleAlert} tone="bad" text={d.googleFailed} />
  ) : null;
  const summary = pending ? summarize(pending) : null;

  return (
    <Screen>
      <DetailHeader title={d.title} onBack={() => navigate('/ajustes')} backLabel={t.common.back} />

      <section className="flex flex-col gap-2.5">
        <Label>{d.where}</Label>
        <Card>
          <div className="flex items-start gap-3">
            <HardDrive aria-hidden size={22} className="mt-0.5 shrink-0 text-accent-ink" />
            <p className="text-[15px] leading-relaxed">{d.whereBody}</p>
          </div>
          {counts && <p className="text-[15px] font-semibold">{d.counts(counts.projects, counts.measurements, counts.milestones)}</p>}
          {storage && <p className="text-[14px] text-muted">{d.usage(formatBytes(storage.used, lang), formatBytes(storage.free, lang))}</p>}
          {persisted !== null && (
            <p className="flex items-start gap-2.5 text-[14px] leading-relaxed">
              {persisted ? (
                <ShieldCheck aria-hidden size={19} className="mt-0.5 shrink-0 text-ok" />
              ) : (
                <ShieldAlert aria-hidden size={19} className="mt-0.5 shrink-0 text-warn" />
              )}
              <span>{persisted ? d.protectedYes : d.protectedNo}</span>
            </p>
          )}
        </Card>
      </section>

      <section className="flex flex-col gap-2.5">
        <Label>{d.backup}</Label>
        <Card>
          <p className="text-[15px] leading-relaxed">{d.backupBody}</p>
          <p className="text-[14px] font-semibold">{last ? d.last(formatDateTime(last.at, lang), last.drive) : d.lastNone}</p>
          {status}
          <div className="flex flex-col gap-2">
            <Button variant="primary" icon={CloudUpload} className="w-full" disabled={!driveReady} onClick={toDrive}>
              {d.toDrive}
            </Button>
            <Button icon={Download} className="w-full" disabled={busy} onClick={() => void download()}>
              {d.download}
            </Button>
          </div>
          {opStatus('backup')}
          <p className="text-[13.5px] leading-relaxed text-muted">{d.driveHint}</p>
        </Card>
      </section>

      <section className="flex flex-col gap-2.5">
        <Label>{d.restore}</Label>
        <Card>
          <p className="text-[15px] leading-relaxed">{d.restoreBody}</p>
          {opStatus('restore')}
          <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
            <Button icon={CloudDownload} disabled={!driveReady} onClick={openDriveList}>
              {d.fromDrive}
            </Button>
            <Button icon={FileUp} disabled={busy} onClick={() => fileInput.current?.click()}>
              {d.fromFile}
            </Button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              void pickFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </Card>
      </section>

      <Sheet open={list !== null} onClose={closeList} title={d.listTitle}>
        {list && list.length === 0 && <p className="text-[15px] text-muted">{d.listEmpty}</p>}
        <ul className="flex flex-col gap-2">
          {(list ?? []).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => pickDrive(item)}
                className="press raised grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[16px] p-3.5 text-left"
              >
                <span className="text-[15.5px] font-semibold">{item.createdTime ? formatDateTime(Date.parse(item.createdTime), lang) : item.name}</span>
                {item.size && <span className="text-[13.5px] text-muted tabular-nums">{formatBytes(Number(item.size), lang)}</span>}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={pending !== null} onClose={closePending} title={d.confirmTitle}>
        {summary && (
          <div className="flex flex-col gap-1 rounded-[16px] bg-surface-2 p-4">
            <p className="text-[16px] font-semibold">{d.copyOf(formatDateTime(summary.createdAt, lang))}</p>
            <p className="text-[15px]">{d.counts(summary.projects, summary.measurements, summary.milestones)}</p>
          </div>
        )}
        {!plan && <Status icon={Loader2} spin tone="muted" text={d.planning} />}
        {plan && plan.length > 0 && (
          <>
            <p className="text-[15px] leading-relaxed">{d.confirmBody}</p>
            <ul className="flex flex-col gap-2">
              {plan.map((x) => (
                <li key={x.id} className="flex flex-col gap-0.5 rounded-[14px] border border-line p-3">
                  <span className="text-[15px] font-semibold wrap-anywhere">{x.name}</span>
                  <span className={`text-[14px] leading-snug ${x.action === 'same' ? 'text-muted' : ''}`}>{d.actions[x.action]}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <Button variant="primary" icon={RotateCcw} className="w-full" disabled={!plan} onClick={() => void restore()}>
          {d.restoreNow}
        </Button>
      </Sheet>
    </Screen>
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
