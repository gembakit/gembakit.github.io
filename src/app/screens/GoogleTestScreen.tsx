import { forwardRef, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  Copy,
  ExternalLink,
  FilePlus2,
  FolderLock,
  Link2,
  Loader2,
  LogIn,
  LogOut,
  PencilLine,
  Search,
  Trash2,
  WifiOff,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { Button } from '../../ui/Button';
import { Card, DetailHeader, Label, Screen } from '../../ui/Layout';
import { useToast } from '../../ui/Toast';
import { APP_VERSION } from '../../version';
import { navigate } from '../router';
import { gisReady, GoogleAuthError, loadGis, requestToken, revokeToken, type GoogleToken } from '../../google/gis';
import {
  createSpreadsheet,
  getAccountEmail,
  GoogleApiError,
  listAppSpreadsheets,
  loadAppData,
  readTestCells,
  saveAppData,
  writeTestCells,
  type DriveFile,
  type SheetRef,
  type TestRead,
} from '../../google/api';

// PANTALLA PROVISIONAL de la prueba de viabilidad de Google (PLAN.md, Fase 0,
// punto 4). Se retira al terminar la prueba, con su enlace en Ajustes, sus
// textos `googleTest` y su ruta. Guarda su estado en localStorage a propósito:
// no son datos del usuario y no deben mezclarse con la base de la app.

const KEY_TOKEN = 'gk.googleTest.token';
const KEY_SHEET = 'gk.googleTest.sheet';
const KEY_LOG = 'gk.googleTest.log';
const KEY_HINT = 'gk.googleTest.account';

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function store(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento: la prueba sigue, solo que no recuerda nada al cerrar.
  }
}

interface LogEntry {
  at: number;
  ok: boolean;
  text: string;
}

type Busy = null | 'connect' | 'create' | 'write' | 'appdata' | 'find';

function deviceName(): string {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad/i.test(ua)) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return '?';
}

function isInstalled(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
}

const Spinner = forwardRef<SVGSVGElement, LucideProps>(({ className = '', ...rest }, ref) => (
  <Loader2 ref={ref} {...rest} className={`${className} animate-spin`} />
)) as LucideIcon;

function Step({ n, title, body, label, children }: { n: number; title: string; body: string; label: string; children: ReactNode }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-soft font-display text-[15px] font-bold text-accent-ink">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[18px] leading-tight font-bold tracking-tight">
            <span className="sr-only">{label}: </span>
            {title}
          </h2>
          <p className="mt-1 text-[14.5px] leading-relaxed text-muted">{body}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

function StatusLine({ icon: Icon, tone, children }: { icon: LucideIcon; tone: 'ok' | 'warn' | 'bad' | 'muted'; children: ReactNode }) {
  const color = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', muted: 'text-muted' }[tone];
  return (
    <p className="flex items-start gap-2.5 text-[15px] leading-relaxed">
      <Icon aria-hidden size={20} className={`mt-0.5 shrink-0 ${color}`} />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

export function GoogleTestScreen() {
  const { t, lang } = useI18n();
  const g = t.googleTest;
  const toast = useToast();
  const locale = lang === 'es' ? 'es-ES' : 'en-GB';

  const [gis, setGis] = useState<'loading' | 'ready' | 'failed'>(gisReady() ? 'ready' : 'loading');
  const [online, setOnline] = useState(navigator.onLine);
  const [token, setToken] = useState<GoogleToken | null>(() => load(KEY_TOKEN));
  const [sheet, setSheet] = useState<SheetRef | null>(() => load(KEY_SHEET));
  const [log, setLog] = useState<LogEntry[]>(() => load(KEY_LOG) ?? []);
  // Correo de la cuenta ya usada: solo se guarda en este aparato y no se escribe en el registro.
  const [hint, setHint] = useState<string | null>(() => load(KEY_HINT));
  const [busy, setBusy] = useState<Busy>(null);
  const [read, setRead] = useState<{ r: TestRead; match: boolean } | null>(null);
  const [found, setFound] = useState<DriveFile[] | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const add = useCallback((ok: boolean, text: string) => {
    setLog((l) => [...l, { at: Date.now(), ok, text }].slice(-200));
  }, []);

  // Al abrir: dónde se está usando la app (instalada o en el navegador) y en qué aparato.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    add(true, g.ev.opened(isInstalled() ? g.ev.installed : g.ev.browser, deviceName()));
  }, [add, g]);

  useEffect(() => {
    let alive = true;
    if (gis !== 'ready') {
      loadGis().then(
        () => alive && setGis('ready'),
        () => alive && setGis('failed'),
      );
    }
    return () => {
      alive = false;
    };
  }, [gis]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const tick = setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      clearInterval(tick);
    };
  }, []);

  useEffect(() => store(KEY_TOKEN, token), [token]);
  useEffect(() => store(KEY_SHEET, sheet), [sheet]);
  useEffect(() => store(KEY_LOG, log), [log]);
  useEffect(() => store(KEY_HINT, hint), [hint]);

  const valid = !!token && token.expiresAt - now > 0;
  const minutesLeft = token ? Math.max(0, Math.round((token.expiresAt - now) / 60_000)) : 0;
  const canAct = online && gis === 'ready' && busy === null;

  /** Pide permiso. Se llama de forma síncrona desde el toque, antes de cualquier espera. */
  const askToken = (renew: boolean): Promise<GoogleToken> => {
    const started = performance.now();
    const pending = requestToken('', hint ?? undefined);
    add(true, g.ev.tokenAsk(renew, !!hint));
    return pending.then(
      (tk) => {
        const secs = ((performance.now() - started) / 1000).toLocaleString(locale, { maximumFractionDigits: 1 });
        setToken(tk);
        setNow(Date.now());
        add(tk.allScopes, g.ev.tokenOk(secs, Math.round((tk.expiresAt - Date.now()) / 60_000), tk.allScopes));
        if (!hint) {
          getAccountEmail(tk.accessToken).then(
            (email) => {
              if (email) setHint(email);
              add(!!email, email ? g.ev.hintSaved : g.ev.hintFailed);
            },
            () => add(false, g.ev.hintFailed),
          );
        }
        return tk;
      },
      (e: unknown) => {
        add(false, g.ev.tokenFail(e instanceof GoogleAuthError ? e.code : String(e)));
        throw e;
      },
    );
  };

  /** Usa el permiso guardado si le queda más de un minuto; si no, lo renueva. */
  const ensureToken = (): Promise<GoogleToken> => {
    if (token && token.expiresAt - Date.now() > 60_000) return Promise.resolve(token);
    return askToken(!!token);
  };

  const run = (kind: Exclude<Busy, null>, job: (tk: GoogleToken) => Promise<void>) => {
    if (busy) return;
    const pending = ensureToken();
    setBusy(kind);
    pending
      .then(job)
      .catch((e: unknown) => {
        if (e instanceof GoogleAuthError) return; // ya anotado en el registro
        if (e instanceof GoogleApiError && e.status === 401) {
          setToken(null);
          add(false, g.ev.expiredDuring);
        } else if (e instanceof GoogleApiError) {
          add(false, g.ev.apiFail(e.status, e.message));
        } else {
          add(false, String(e));
        }
      })
      .finally(() => setBusy(null));
  };

  const connect = () => {
    if (busy) return;
    const pending = askToken(!!token);
    setBusy('connect');
    pending.catch(() => undefined).finally(() => setBusy(null));
  };

  const disconnect = () => {
    if (!token || busy) return;
    void revokeToken(token.accessToken).then(() => {
      setToken(null);
      setHint(null);
      add(true, g.ev.revoked);
    });
  };

  const create = () =>
    run('create', async (tk) => {
      const sheetLocale = lang === 'es' ? 'es_ES' : 'en_US';
      const ref = await createSpreadsheet(tk.accessToken, g.sheetTitle, sheetLocale);
      setSheet(ref);
      setRead(null);
      add(true, g.ev.created(sheetLocale));
    });

  const writeRead = () => {
    if (!sheet) {
      toast(g.needSheet);
      return;
    }
    run('write', async (tk) => {
      const stamp = `Gemba Kit ${new Date().toLocaleString(locale)}`;
      await writeTestCells(tk.accessToken, sheet.id, stamp);
      add(true, g.ev.written);
      const r = await readTestCells(tk.accessToken, sheet.id);
      const match = r.text === stamp && r.value === 6;
      setRead({ r, match });
      add(match, g.ev.read(r.text, r.shown, r.formula, match));
    });
  };

  const appData = () =>
    run('appdata', async (tk) => {
      const content = JSON.stringify({ escrito: new Date().toISOString(), aparato: deviceName() });
      await saveAppData(tk.accessToken, content);
      const back = await loadAppData(tk.accessToken);
      add(back === content, g.ev.appData(back === content));
    });

  const find = () =>
    run('find', async (tk) => {
      const files = await listAppSpreadsheets(tk.accessToken);
      setFound(files);
      add(true, g.ev.found(files.length));
    });

  const time = (ms: number, seconds = false) =>
    new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}) });

  const copyLog = () => {
    const lines = [`Gemba Kit ${APP_VERSION} · ${new Date().toLocaleDateString(locale)}`, ...log.map((e) => `${time(e.at, true)} ${e.ok ? '✓' : '✗'} ${e.text}`)];
    navigator.clipboard?.writeText(lines.join('\n')).then(
      () => toast(g.copied, { tone: 'ok' }),
      () => toast(g.copyFailed),
    ) ?? toast(g.copyFailed);
  };

  const clearLog = () => {
    const before = log;
    setLog([]);
    toast(t.common.cleared, { action: { label: t.common.undo, onAction: () => setLog(before) } });
  };

  const icon = (kind: Busy, normal: LucideIcon) => (busy === kind ? Spinner : normal);

  return (
    <Screen>
      <DetailHeader title={g.title} subtitle={g.subtitle} onBack={() => navigate('/ajustes')} backLabel={t.common.back} />

      <Card>
        <p className="text-[15px] leading-relaxed">{g.intro}</p>
        <div className="flex flex-col gap-2 border-t border-line pt-3.5">
          {!online && <StatusLine icon={WifiOff} tone="warn">{g.offline}</StatusLine>}
          {gis === 'loading' && <StatusLine icon={Spinner} tone="muted">{g.loading}</StatusLine>}
          {gis === 'failed' && <StatusLine icon={CircleX} tone="bad">{g.loadFailed}</StatusLine>}
          {valid && token ? (
            <StatusLine icon={CircleCheck} tone="ok">{g.connected(time(token.expiresAt), minutesLeft)}</StatusLine>
          ) : token ? (
            <StatusLine icon={Clock} tone="warn">{g.expired}</StatusLine>
          ) : (
            <StatusLine icon={CircleDashed} tone="muted">{g.disconnected}</StatusLine>
          )}
        </div>
      </Card>

      <Step n={1} label={g.stepLabel(1)} title={g.step1} body={g.step1Body}>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Button variant="primary" icon={icon('connect', LogIn)} onClick={connect} disabled={!canAct} className="w-full sm:w-auto">
            {g.connect}
          </Button>
          {token && (
            <Button icon={LogOut} onClick={disconnect} disabled={!canAct} className="w-full sm:w-auto">
              {g.disconnect}
            </Button>
          )}
        </div>
      </Step>

      <Step n={2} label={g.stepLabel(2)} title={g.step2} body={g.step2Body}>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Button icon={icon('create', FilePlus2)} onClick={create} disabled={!canAct} className="w-full sm:w-auto">
            {sheet ? g.createAgain : g.create}
          </Button>
          {sheet && (
            <a
              href={sheet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="press raised-sm inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[15px] px-4 text-[15px] font-semibold text-accent-ink sm:w-auto"
            >
              <ExternalLink aria-hidden size={20} strokeWidth={1.9} className="shrink-0" />
              <span>{g.openSheet}</span>
            </a>
          )}
        </div>
      </Step>

      <Step n={3} label={g.stepLabel(3)} title={g.step3} body={g.step3Body}>
        <Button icon={icon('write', PencilLine)} onClick={writeRead} disabled={!canAct} className="w-full sm:w-auto sm:self-start">
          {g.writeRead}
        </Button>
        {read && (
          <div className="flex flex-col gap-2.5 rounded-[14px] bg-surface-2 p-3.5">
            <dl className="flex flex-col gap-2 text-[14.5px]">
              {[
                [g.readText, read.r.text],
                [g.readShown, read.r.shown],
                [g.readFormula, read.r.formula],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col">
                  <dt className="text-[13px] text-muted">{k}</dt>
                  <dd className="font-medium wrap-anywhere">{v || '—'}</dd>
                </div>
              ))}
            </dl>
            <StatusLine icon={read.match ? CircleCheck : CircleX} tone={read.match ? 'ok' : 'bad'}>
              {read.match ? g.match : g.mismatch}
            </StatusLine>
          </div>
        )}
      </Step>

      <Step n={4} label={g.stepLabel(4)} title={g.step4} body={g.step4Body}>
        <Button icon={icon('appdata', FolderLock)} onClick={appData} disabled={!canAct} className="w-full sm:w-auto sm:self-start">
          {g.appData}
        </Button>
      </Step>

      <Step n={5} label={g.stepLabel(5)} title={g.step5} body={g.step5Body}>
        <Button icon={icon('find', Search)} onClick={find} disabled={!canAct} className="w-full sm:w-auto sm:self-start">
          {g.find}
        </Button>
        {found && found.length === 0 && <p className="text-[14.5px] text-muted">{g.none}</p>}
        {found && found.length > 0 && (
          <ul className="flex flex-col gap-2">
            {found.map((f) => (
              <li key={f.id} className="flex flex-col gap-2 rounded-[14px] bg-surface-2 p-3">
                <span className="text-[15px] font-medium wrap-anywhere">{f.name}</span>
                {f.createdTime && <span className="text-[13px] text-muted">{new Date(f.createdTime).toLocaleString(locale)}</span>}
                {f.id !== sheet?.id ? (
                  <Button icon={Link2} onClick={() => setSheet({ id: f.id, url: `https://docs.google.com/spreadsheets/d/${f.id}/edit` })} className="w-full sm:w-auto sm:self-start">
                    {g.useFound}
                  </Button>
                ) : (
                  <StatusLine icon={CircleCheck} tone="ok">{g.inUse}</StatusLine>
                )}
              </li>
            ))}
          </ul>
        )}
      </Step>

      <section className="flex flex-col gap-2.5">
        <Label>{g.log}</Label>
        <Card>
          {log.length === 0 ? (
            <p className="text-[14.5px] text-muted">{g.logEmpty}</p>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {[...log].reverse().map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex items-start gap-2.5 text-[14px] leading-snug">
                  {e.ok ? <CircleCheck aria-hidden size={18} className="mt-px shrink-0 text-ok" /> : <CircleX aria-hidden size={18} className="mt-px shrink-0 text-bad" />}
                  <span className="min-w-0 flex-1 wrap-anywhere">
                    <span className="mr-1.5 text-muted tabular-nums">{time(e.at, true)}</span>
                    {e.text}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button icon={Copy} onClick={copyLog} disabled={log.length === 0} className="w-full sm:w-auto">
              {g.copyLog}
            </Button>
            <Button variant="ghost" icon={Trash2} onClick={clearLog} disabled={log.length === 0} className="w-full sm:w-auto">
              {g.clearLog}
            </Button>
          </div>
        </Card>
      </section>
    </Screen>
  );
}
