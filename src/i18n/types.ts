import type { es } from './es';

// Convierte los literales de es.ts en string (y las funciones en funciones con
// los mismos argumentos que devuelven string), para que en.ts tenga que dar
// las mismas claves con su propio texto.
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => string
    ? (...args: A) => string
    : { [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof es>;

export const LANGUAGES = ['es', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
