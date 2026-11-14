import type { DBCore, DBCoreTable, Middleware } from 'dexie';
import type { GembaDB } from './db';
import { APP_VERSION } from '../version';

// Diagnóstico del almacenamiento del teléfono (IndexedDB). Si la base tarda
// o falla, la app lo dice en lugar de quedarse en blanco, y guarda un
// registro técnico que el dueño puede copiar y pegar en el chat.
// Solo datos técnicos: tiempos, operación, tabla y nombre del error.
// Nunca contenido (nombres de proyectos, notas, correo).

export interface HealthEntry {
  at: number;
  text: string;
  bad?: boolean;
}

/** Una operación que tarda más que esto se considera atascada. */
export const STUCK_MS = 4000;
const SLOW_MS = 1000;
const MAX = 200;
const STORE_KEY = 'gemba:health';

// Registro común a todas las ventanas de la app (mismo almacenamiento local):
// cada línea se añade a lo guardado y lleva la marca de su ventana.
const WINDOW_ID = Math.random().toString(36).slice(2, 6);
const memory: HealthEntry[] = [];
const listeners = new Set<() => void>();
let pendingSeq = 0;
const pending = new Map<number, { what: string; since: number; reported?: boolean }>();
let problem: string | null = null;

function load(): HealthEntry[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const list = raw ? (JSON.parse(raw) as HealthEntry[]) : [];
    return Array.isArray(list) ? list.slice(-MAX) : [];
  } catch {
    return [];
  }
}

function append(entry: HealthEntry) {
  memory.push(entry);
  if (memory.length > MAX) memory.splice(0, memory.length - MAX);
  try {
    const list = load();
    list.push(entry);
    localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    // Sin almacenamiento local: el registro vive solo en memoria.
  }
}

/** Lo guardado de todas las ventanas; si no hay almacenamiento local, lo de esta. */
function allEntries(): HealthEntry[] {
  const stored = load();
  return stored.length ? stored : memory;
}

function notify() {
  for (const l of listeners) l();
}

export function record(text: string, bad = false) {
  append({ at: Date.now(), text: `[${WINDOW_ID}] ${text}`, bad });
  if (bad) console.warn(`[Gemba Kit] ${text}`);
  notify();
}

/** Marca que algo va mal (lo enseña el aviso de AppShell). */
export function reportProblem(text: string) {
  record(text, true);
  if (!problem) {
    problem = text;
    notify();
  }
}

/** Todo vuelve a responder: se quita el aviso (el registro se queda). */
export function clearProblem() {
  if (!problem) return;
  problem = null;
  record('vuelve a responder');
}

export function pendingCount(): number {
  return pending.size;
}

export function currentProblem(): string | null {
  return problem;
}

export function subscribeHealth(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const errText = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));

/** Cuenta una operación pendiente; el vigilante avisa si se queda atascada. */
function track<T>(what: string, run: () => Promise<T>): Promise<T> {
  const id = ++pendingSeq;
  const since = performance.now();
  pending.set(id, { what, since });
  const done = () => {
    pending.delete(id);
    const ms = Math.round(performance.now() - since);
    if (ms >= SLOW_MS) record(`${what}: ${ms} ms`, ms >= STUCK_MS);
  };
  return run().then(
    (r) => {
      done();
      return r;
    },
    (e: unknown) => {
      done();
      reportProblem(`${what} falló · ${errText(e)}`);
      throw e;
    },
  );
}

/** Capa de Dexie que mide cada lectura y escritura. */
const middleware: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'gemba-health',
  create: (down) => ({
    ...down,
    table: (name: string): DBCoreTable => {
      const t = down.table(name);
      return {
        ...t,
        get: (req) => track(`leer ${name}`, () => t.get(req)),
        getMany: (req) => track(`leer ${name}`, () => t.getMany(req)),
        query: (req) => track(`consultar ${name}`, () => t.query(req)),
        count: (req) => track(`contar ${name}`, () => t.count(req)),
        mutate: (req) => track(`${req.type === 'delete' || req.type === 'deleteRange' ? 'borrar' : 'guardar'} ${name}`, () => t.mutate(req)),
      };
    },
  }),
};

let installed = false;

/** Conecta el diagnóstico a la base: eventos, medición de operaciones, otras ventanas y ciclo de vida. */
export function installHealth(db: GembaDB) {
  if (installed) return;
  installed = true;
  const startedAt = performance.now();
  record(`inicio · versión ${APP_VERSION} · ${navigator.userAgent.match(/(Android [\d.]+|Windows NT [\d.]+|Mac OS X [\d_]+|iPhone OS [\d_]+)/)?.[0] ?? 'sistema ?'} · ${navigator.userAgent.match(/Chrome\/[\d]+/)?.[0] ?? 'navegador ?'} · ${matchMedia('(display-mode: standalone)').matches ? 'app instalada' : 'pestaña del navegador'}`);
  db.use(middleware);
  // «true»: avisar en cada apertura, también cuando se reabre sola.
  db.on(
    'ready',
    () => {
      record(`base abierta a los ${Math.round(performance.now() - startedAt)} ms del inicio · versión interna ${db.verno}`);
    },
    true,
  );
  db.on('blocked', () => reportProblem('la base espera: otra ventana de Gemba Kit la tiene abierta con una versión anterior'));
  db.on('versionchange', (ev: IDBVersionChangeEvent) => record(`otra ventana pide actualizar la base (${ev.oldVersion} → ${ev.newVersion ?? 'borrar'}); se cierra aquí y se reabre sola`, true));
  db.on('close', () => record('el sistema cerró la conexión con la base; se reabre sola', true));

  // Otras ventanas o pestañas de Gemba Kit abiertas a la vez.
  try {
    const me = WINDOW_ID;
    const bc = new BroadcastChannel('gemba-health');
    bc.onmessage = (e: MessageEvent<{ kind: string; id: string; version: string; mode: string }>) => {
      const m = e.data;
      if (!m || m.id === me) return;
      record(`otra ventana de Gemba Kit abierta · versión ${m.version} · ${m.mode}`);
      if (m.kind === 'hola') bc.postMessage({ kind: 'aquí', id: me, version: APP_VERSION, mode: modeText() });
    };
    bc.postMessage({ kind: 'hola', id: me, version: APP_VERSION, mode: modeText() });
  } catch {
    // Sin BroadcastChannel: no se puede saber.
  }

  // Ciclo de vida: Android congela y descongela la app en segundo plano.
  for (const ev of ['freeze', 'resume', 'pagehide', 'pageshow'] as const) {
    addEventListener(ev, (e) => record(`${ev}${e instanceof PageTransitionEvent && e.persisted ? ' (caché de ida y vuelta)' : ''}`), { capture: true });
  }
  document.addEventListener('visibilitychange', () => record(document.visibilityState === 'visible' ? 'vuelve a primer plano' : 'pasa a segundo plano'));

  // Vigilante: una operación pendiente demasiado tiempo es un atasco.
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const now = performance.now();
    for (const p of pending.values()) {
      if (!p.reported && now - p.since > STUCK_MS) {
        p.reported = true;
        reportProblem(`${p.what} lleva más de ${STUCK_MS / 1000} s sin responder`);
      }
    }
  }, 1000);
}

function modeText() {
  return matchMedia('(display-mode: standalone)').matches ? 'app instalada' : 'pestaña del navegador';
}

/** Texto para copiar y pegar en el chat. */
export async function healthReport(): Promise<string> {
  const lines = [`Gemba Kit ${APP_VERSION} · diagnóstico del almacenamiento`];
  try {
    const est = await navigator.storage?.estimate?.();
    const persisted = await navigator.storage?.persisted?.();
    if (est) lines.push(`espacio: usa ${Math.round((est.usage ?? 0) / 1024)} KB de ${Math.round((est.quota ?? 0) / 1048576)} MB · protegido: ${persisted ? 'sí' : 'no'}`);
  } catch {
    lines.push('espacio: no disponible');
  }
  const now = performance.now();
  for (const p of pending.values()) lines.push(`pendiente ahora: ${p.what} desde hace ${Math.round((now - p.since) / 1000)} s`);
  lines.push(`esta ventana: [${WINDOW_ID}]`);
  for (const e of allEntries()) {
    const d = new Date(e.at);
    const hh = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${d.toLocaleTimeString('es-ES')}`;
    lines.push(`${hh} ${e.bad ? '✗' : '·'} ${e.text}`);
  }
  return lines.join('\n');
}
