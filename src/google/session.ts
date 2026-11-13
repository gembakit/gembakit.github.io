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
  const account = read<string>(KEY_ACCOUNT) ?? undefined;
  return requestToken('', account).then((tk) => {
    write(KEY_TOKEN, tk);
    if (!account) {
      // Recordar la cuenta para las renovaciones; si falla, solo se pierde la comodidad.
      getAccountEmail(tk.accessToken).then(
        (email) => email && write(KEY_ACCOUNT, email),
        () => undefined,
      );
    }
    return tk;
  });
}
