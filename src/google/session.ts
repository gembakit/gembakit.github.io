import { getAccountEmail } from './api';
import { requestToken, type GoogleToken } from './gis';

// Sesión de Google de la app: el permiso vigente y la cuenta usada, guardados
// solo en este aparato. Con la cuenta indicada, renovar el permiso es un
// parpadeo sin elegir cuenta (prueba de viabilidad, ESTADO.md).

const KEY_TOKEN = 'gk.google.token';
const KEY_ACCOUNT = 'gk.google.account';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento: habrá que volver a pedir permiso la próxima vez.
  }
}

const listeners = new Set<() => void>();

/** Avisa cuando cambia la cuenta conectada (para `useSyncExternalStore`). */
export function subscribeAccount(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Correo de la cuenta de Google conectada en este aparato, o null. */
export function currentAccount(): string | null {
  return read<string>(KEY_ACCOUNT);
}

export function setAccount(email: string | null): void {
  write(KEY_ACCOUNT, email);
  listeners.forEach((fn) => fn());
}

/** Permiso guardado que todavía vale al menos un minuto más. */
export function currentToken(now = Date.now()): GoogleToken | null {
  const t = read<GoogleToken>(KEY_TOKEN);
  return t && t.expiresAt - now > 60_000 ? t : null;
}

/** Olvida el permiso (por ejemplo, cuando Google dice que ya no vale). */
export function forgetToken(): void {
  write(KEY_TOKEN, null);
}

/**
 * Devuelve un permiso válido, pidiéndolo a Google si hace falta. Hay que
 * llamarla directamente desde el toque del usuario, sin esperas antes.
 */
export function ensureToken(): Promise<GoogleToken> {
  const saved = currentToken();
  if (saved) return Promise.resolve(saved);
  const account = currentAccount() ?? undefined;
  return requestToken('', account).then((tk) => {
    write(KEY_TOKEN, tk);
    if (!account) {
      // Recordar la cuenta para las renovaciones; si falla, solo se pierde la comodidad.
      getAccountEmail(tk.accessToken).then(
        (email) => email && setAccount(email),
        () => undefined,
      );
    }
    return tk;
  });
}

/**
 * Conecta una cuenta: Google enseña la lista de cuentas (sin pista) y pide
 * el permiso. Devuelve el permiso y el correo, sin guardar todavía la cuenta
 * (eso lo hace `adoptAccount`, que sabe de las carpetas). Hay que llamarla
 * directamente desde el toque del usuario.
 */
export function signIn(): Promise<{ token: GoogleToken; email: string | null }> {
  return requestToken('').then(async (tk) => {
    write(KEY_TOKEN, tk);
    const email = await getAccountEmail(tk.accessToken).catch(() => null);
    return { token: tk, email };
  });
}
