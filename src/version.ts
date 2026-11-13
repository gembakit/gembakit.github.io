declare const __APP_VERSION__: string;

/** Versión visible en Ajustes (viene de package.json al compilar). */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';
