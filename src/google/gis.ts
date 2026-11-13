import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from './config';

// Inicio de sesión con Google Identity Services, modelo de token: sin servidor
// y sin secreto. El script de Google se carga solo cuando hace falta.

interface GisTokenResponse {
  access_token?: string;
  expires_in?: number | string;
  scope?: string;
  error?: string;
  error_description?: string;
}
interface GisError {
  type?: string;
  message?: string;
}
interface GisTokenClient {
  requestAccessToken(o?: { prompt?: string }): void;
}
interface GisOAuth2 {
  initTokenClient(c: {
    client_id: string;
    scope: string;
    callback: (r: GisTokenResponse) => void;
    error_callback?: (e: GisError) => void;
  }): GisTokenClient;
  hasGrantedAllScopes(r: GisTokenResponse, ...scopes: string[]): boolean;
  revoke(token: string, done?: () => void): void;
}

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GisOAuth2 } };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';
let loading: Promise<void> | null = null;

export function gisReady(): boolean {
  return !!window.google?.accounts?.oauth2;
}

export function loadGis(): Promise<void> {
  if (gisReady()) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    const fail = (code: string) => {
      loading = null;
      script.remove();
      reject(new GoogleAuthError(code));
    };
    script.onload = () => (gisReady() ? resolve() : fail('gis-missing'));
    script.onerror = () => fail('gis-load');
    document.head.appendChild(script);
  });
  return loading;
}

export interface GoogleToken {
  accessToken: string;
  /** Momento de caducidad, en milisegundos (Date.now()). */
  expiresAt: number;
  scopes: string[];
  allScopes: boolean;
}

export class GoogleAuthError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

/**
 * Pide un permiso de acceso a Google. Hay que llamarla directamente desde el
 * toque del usuario, sin esperas antes, para que el navegador no bloquee la
 * ventana de Google. `prompt: ''` solo enseña la ventana si hace falta.
 */
export function requestToken(prompt: '' | 'consent' = ''): Promise<GoogleToken> {
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) return Promise.reject(new GoogleAuthError('not-loaded'));
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES.join(' '),
      callback: (r) => {
        if (r.error || !r.access_token) {
          reject(new GoogleAuthError(r.error ?? 'no-token', r.error_description));
          return;
        }
        const seconds = Number(r.expires_in ?? 3600);
        resolve({
          accessToken: r.access_token,
          expiresAt: Date.now() + seconds * 1000,
          scopes: (r.scope ?? '').split(' ').filter(Boolean),
          allScopes: oauth2.hasGrantedAllScopes(r, ...GOOGLE_SCOPES),
        });
      },
      error_callback: (e) => reject(new GoogleAuthError(e.type ?? 'unknown', e.message)),
    });
    client.requestAccessToken({ prompt });
  });
}

/** Retira el permiso concedido a la app (la próxima conexión vuelve a preguntar). */
export function revokeToken(accessToken: string): Promise<void> {
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) return Promise.resolve();
  return new Promise((resolve) => oauth2.revoke(accessToken, () => resolve()));
}
