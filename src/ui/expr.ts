// Fórmulas como estructura (no como texto plano) para dibujarlas como en un
// libro: la división apilada con su raya, paréntesis solo donde hacen falta.
// `toText` da la versión en una línea, para lectores de pantalla y pruebas.

export type Expr =
  /** Una letra o un número ya formateado: «D», «2.500», «97 %». */
  | string
  | { frac: [Expr, Expr] }
  | { op: '×' | '+' | '−'; args: Expr[] }
  | { paren: Expr }
  /** Función con su argumento entre paréntesis: Φ⁻¹(…). */
  | { fn: string; arg: Expr };

export const frac = (num: Expr, den: Expr): Expr => ({ frac: [num, den] });
export const times = (...args: Expr[]): Expr => ({ op: '×', args });
export const plus = (...args: Expr[]): Expr => ({ op: '+', args });
export const minus = (a: Expr, b: Expr): Expr => ({ op: '−', args: [a, b] });
export const paren = (e: Expr): Expr => ({ paren: e });
export const fn = (name: string, arg: Expr): Expr => ({ fn: name, arg });

const isOp = (e: Expr): e is { op: '×' | '+' | '−'; args: Expr[] } => typeof e === 'object' && 'op' in e;

/** ¿Hay que poner paréntesis a `child` dentro de una operación `parent`? (sumas y restas dentro de un producto). */
export function needsParen(parent: '×' | '+' | '−', child: Expr, index: number): boolean {
  if (!isOp(child)) return false;
  if (parent === '×') return child.op !== '×';
  // a − (b + c) o a − (b − c): el segundo término de una resta.
  return parent === '−' && index > 0;
}

/** ¿Lleva una fracción dentro? (los paréntesis que la rodean se dibujan altos). */
export function hasFrac(e: Expr): boolean {
  if (typeof e === 'string') return false;
  if ('frac' in e) return true;
  if ('op' in e) return e.args.some(hasFrac);
  if ('paren' in e) return hasFrac(e.paren);
  return hasFrac(e.arg);
}

/** En una línea: «D ÷ (U × O) × 1.000.000». */
export function toText(e: Expr): string {
  if (typeof e === 'string') return e;
  if ('frac' in e) {
    const side = (x: Expr) => (isOp(x) ? `(${toText(x)})` : toText(x));
    return `${side(e.frac[0])} ÷ ${side(e.frac[1])}`;
  }
  if ('op' in e) return e.args.map((a, i) => (needsParen(e.op, a, i) ? `(${toText(a)})` : toText(a))).join(` ${e.op} `);
  if ('paren' in e) return `(${toText(e.paren)})`;
  return `${e.fn}(${toText(e.arg)})`;
}
