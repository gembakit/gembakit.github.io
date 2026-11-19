import { useEffect, useState } from 'react';
import { gisReady, loadGis } from './gis';

/**
 * Conexión a internet y acceso de Google listos. El acceso se prepara al
 * abrir la pantalla: así el toque puede abrir la ventana de Google sin que el
 * navegador la bloquee.
 */
export function useGoogleReady(): { online: boolean; gis: 'loading' | 'ready' | 'failed' } {
  const [online, setOnline] = useState(navigator.onLine);
  const [gis, setGis] = useState<'loading' | 'ready' | 'failed'>(gisReady() ? 'ready' : 'loading');
  useEffect(() => {
    if (!online || gisReady()) return;
    let alive = true;
    loadGis().then(
      () => alive && setGis('ready'),
      () => alive && setGis('failed'),
    );
    return () => {
      alive = false;
    };
  }, [online]);
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
  return { online, gis };
}
