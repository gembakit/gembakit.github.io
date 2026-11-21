import { useEffect, useSyncExternalStore } from 'react';
import { liveQuery } from 'dexie';
import { db } from '../data/db';
import { SYNC_TABLES } from '../data/merge';
import { currentAccount, currentToken, ensureToken } from './session';
import { syncDevices, lastDeviceSync } from './deviceSync';

// Cuándo se sincroniza entre aparatos (PLAN.md, 4.4): al abrir, al volver a
// primer plano, al recuperar la conexión, unos segundos después de cada
// cambio y cada minuto y medio mientras la app está a la vista. Solo con la
// cuenta de Google conectada y el permiso vigente (sin abrir ventanas); el
// botón «Sincronizar ahora» sí puede pedir permiso.

const AFTER_CHANGE_MS = 5000;
const EVERY_MS = 90_000;

export type DeviceSyncStatus = { k: 'idle' | 'syncing' | 'error'; last: number | null; error?: string };

let status: DeviceSyncStatus = { k: 'idle', last: null };
const listeners = new Set<() => void>();
const set = (s: DeviceSyncStatus) => {
  status = s;
  for (const l of listeners) l();
};
void lastDeviceSync().then((last) => last && status.k === 'idle' && !status.last && set({ ...status, last }));

export function useDeviceSyncStatus(): DeviceSyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );
}

/** Sincroniza ya. Con `ask`, pide permiso a Google si hace falta (solo tras un toque del usuario). */
export async function syncDevicesNow(ask = false): Promise<void> {
  if (status.k === 'syncing' || !currentAccount()) return;
  const token = currentToken() ?? (ask ? await ensureToken() : null);
  if (!token) return;
  set({ ...status, k: 'syncing' });
  try {
    const r = await syncDevices(token.accessToken);
    set({ k: 'idle', last: r.at });
  } catch (e) {
    set({ ...status, k: 'error', error: e instanceof Error ? e.message : String(e) });
  }
}

/** La fecha del último cambio en cualquier tabla que viaja. */
async function lastChange(): Promise<number> {
  let max = 0;
  for (const t of SYNC_TABLES) {
    const r = (await db.table(t).orderBy('updatedAt').last()) as { updatedAt?: number } | undefined;
    max = Math.max(max, r?.updatedAt ?? 0);
  }
  return max;
}

export function useDeviceSync() {
  useEffect(() => {
    const run = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void syncDevicesNow();
    };
    run();
    const onVisible = () => document.visibilityState === 'visible' && run();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', run);
    const every = window.setInterval(run, EVERY_MS);
    let timer: number | undefined;
    let first = true;
    const sub = liveQuery(lastChange).subscribe({
      next: () => {
        if (first) {
          first = false;
          return;
        }
        window.clearTimeout(timer);
        timer = window.setTimeout(run, AFTER_CHANGE_MS);
      },
      error: () => undefined,
    });
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', run);
      window.clearInterval(every);
      window.clearTimeout(timer);
      sub.unsubscribe();
    };
  }, []);
}
