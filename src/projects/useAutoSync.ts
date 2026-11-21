import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { currentToken } from '../google/session';
import { EXPORT_PALETTE } from '../google/exportStyle';
import { useLive } from './live';
import { getSyncState, projectsDue, syncNow } from './sheetSync';

/** Espera tras el último cambio antes de enviarlo (para juntar varios cambios seguidos). */
const DELAY_MS = 4000;

/**
 * Envía sola a la hoja de Google los cambios de los proyectos que tienen
 * hoja, si hay red y el permiso de Google sigue vigente (sin abrir ninguna
 * ventana). Si no, quedan «por enviar» hasta pulsar «Sincronizar». Lo que
 * necesita una decisión (cambios hechos en Sheets, archivo borrado) espera
 * al usuario.
 */
export function useAutoSync() {
  const { t, lang } = useI18n();
  const due = useLive(() => projectsDue(), []);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const key = due?.join(',') ?? '';
  useEffect(() => {
    if (!online || !key) return;
    const timer = setTimeout(() => {
      const token = currentToken();
      if (!token) return;
      for (const id of key.split(',')) {
        const state = getSyncState(id).k;
        if (state === 'conflict' || state === 'missing' || state === 'error' || state === 'syncing') continue;
        syncNow(id, token.accessToken, { t, lang, palette: EXPORT_PALETTE }).catch(() => undefined);
      }
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, [key, online, t, lang]);
}
