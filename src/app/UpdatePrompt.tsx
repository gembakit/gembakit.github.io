import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useI18n } from '../i18n';
import { useToast } from '../ui/Toast';

/**
 * Registra el modo sin conexión y avisa cuando hay una versión nueva, para que
 * la app instalada no se quede en una versión antigua (riesgo en ESTADO.md).
 */
export function UpdatePrompt() {
  const { t } = useI18n();
  const toast = useToast();
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (offlineReady) toast(t.update.offlineReady, { tone: 'ok' });
  }, [offlineReady, toast, t]);

  useEffect(() => {
    if (needRefresh) toast(t.update.available, { action: { label: t.update.reload, onAction: () => void updateServiceWorker(true) } });
  }, [needRefresh, toast, t, updateServiceWorker]);

  return null;
}
