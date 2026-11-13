import { normalInv } from '../calc/stats';
import type { Grid } from './layout';

// Evaluador mínimo de fórmulas de hoja de cálculo, solo para las pruebas que
// comparan las fórmulas de cada hoja con el módulo de cálculo (CLAUDE.md,
// calidad de los cálculos). Sigue las reglas de Excel y Google Sheets en lo
// que usan las hojas de la app: + − × ÷ ^ (el menos delante va antes que ^),
// comparaciones, texto entre comillas y las funciones de FUNCTIONS. Si una
// hoja usa algo que no está aquí, la prueba falla en lugar de inventarlo.

export type Value = number | string | boolean;

export class FormulaError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

type Node =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'ref'; v: string }
  | { t: 'neg'; e: Node }
  | { t: 'bin'; op: string; a: Node; b: Node }
  | { t: 'call'; name: string; args: Node[] };

const TOKEN = /\s*(?:(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|("(?:[^"]|"")*")|([A-Z]+\d+)\b|([A-Z][A-Z0-9.]*)(?=\()|(<=|>=|<>|[-+*/^&=<>(),]))/y;

function tokenize(src: string): string[] {
  const out: string[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < src.length) {
    if (/^\s*$/.test(src.slice(TOKEN.lastIndex))) break;
    const m = TOKEN.exec(src);
    if (!m) throw new FormulaError(`#PARSE! cerca de «${src.slice(TOKEN.lastIndex)}»`);
    out.push(m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5]!);
  }
  return out;
}

function parse(src: string): Node {
  const tokens = tokenize(src);
  let i = 0;
  const peek = () => tokens[i];
  const take = (expected?: string) => {
    const tok = tokens[i++];
    if (expected !== undefined && tok !== expected) throw new FormulaError(`#PARSE! se esperaba «${expected}»`);
    return tok!;
  };
  const levels = [['=', '<>', '<', '>', '<=', '>='], ['&'], ['+', '-'], ['*', '/'], ['^']];
  const binary = (level: number): Node => {
    if (level === levels.length) return unary();
    let a = binary(level + 1);
    while (peek() !== undefined && levels[level]!.includes(peek()!)) {
      const op = take();
      a = { t: 'bin', op, a, b: binary(level + 1) };
    }
    return a;
  };
  const unary = (): Node => {
    if (peek() === '-') {
      take();
      return { t: 'neg', e: unary() };
    }
    if (peek() === '+') {
      take();
      return unary();
    }
    return atom();
  };
  const atom = (): Node => {
    const tok = take();
    if (tok === undefined) throw new FormulaError('#PARSE! fórmula incompleta');
    if (tok === '(') {
      const e = binary(0);
      take(')');
      return e;
    }
    if (/^\d/.test(tok)) return { t: 'num', v: Number(tok) };
    if (tok.startsWith('"')) return { t: 'str', v: tok.slice(1, -1).replace(/""/g, '"') };
    if (/^[A-Z]+\d+$/.test(tok) && peek() !== '(') return { t: 'ref', v: tok };
    if (/^[A-Z][A-Z0-9.]*$/.test(tok)) {
      take('(');
      const args: Node[] = [];
      if (peek() !== ')') {
        args.push(binary(0));
        while (peek() === ',') {
          take();
          args.push(binary(0));
        }
      }
      take(')');
      return { t: 'call', name: tok, args };
    }
    throw new FormulaError(`#PARSE! «${tok}»`);
  };
  const node = binary(0);
  if (i !== tokens.length) throw new FormulaError(`#PARSE! sobra «${tokens[i]}»`);
  return node;
}

const num = (v: Value): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  throw new FormulaError('#VALUE!');
};

type Lazy = () => Value;
const FUNCTIONS: Record<string, (args: Lazy[]) => Value> = {
  IF: ([c, a, b]) => (num(c!()) !== 0 ? a!() : b ? b() : false),
  OR: (args) => args.some((x) => num(x()) !== 0),
  AND: (args) => args.every((x) => num(x()) !== 0),
  ISNUMBER: ([x]) => {
    try {
      return typeof x!() === 'number';
    } catch {
      return false;
    }
  },
  ABS: ([x]) => Math.abs(num(x!())),
  'NORM.S.INV': ([x]) => {
    const p = num(x!());
    if (!(p > 0 && p < 1)) throw new FormulaError('#NUM!');
    return normalInv(p);
  },
};

/** Calcula todas las celdas con fórmula de la cuadrícula. Devuelve dirección → valor. */
export function evaluateGrid(grid: Grid): Record<string, Value> {
  const cells = new Map<string, { number?: number; text?: string; formula?: string }>();
  grid.rows.forEach((row, r) => row.cells.forEach((c, col) => cells.set(`${'ABC'[col]}${r + 1}`, c)));
  const cache = new Map<string, Value>();
  const visiting = new Set<string>();

  const cellValue = (addr: string): Value => {
    if (cache.has(addr)) return cache.get(addr)!;
    if (visiting.has(addr)) throw new FormulaError(`#REF! circular en ${addr}`);
    const c = cells.get(addr);
    let v: Value = 0;
    if (c?.formula !== undefined) {
      visiting.add(addr);
      v = evalNode(parse(c.formula));
      visiting.delete(addr);
    } else if (c?.number !== undefined) v = c.number;
    else if (c?.text !== undefined) v = c.text;
    cache.set(addr, v);
    return v;
  };

  const evalNode = (n: Node): Value => {
    switch (n.t) {
      case 'num':
      case 'str':
        return n.v;
      case 'ref':
        return cellValue(n.v);
      case 'neg':
        return -num(evalNode(n.e));
      case 'call': {
        const fn = FUNCTIONS[n.name];
        if (!fn) throw new FormulaError(`#NAME? ${n.name} no está en el evaluador`);
        return fn(n.args.map((a) => () => evalNode(a)));
      }
      case 'bin': {
        const a = evalNode(n.a);
        const b = evalNode(n.b);
        switch (n.op) {
          case '+':
            return num(a) + num(b);
          case '-':
            return num(a) - num(b);
          case '*':
            return num(a) * num(b);
          case '/':
            if (num(b) === 0) throw new FormulaError('#DIV/0!');
            return num(a) / num(b);
          case '^':
            return num(a) ** num(b);
          case '&':
            return `${a}${b}`;
          case '=':
            return a === b;
          case '<>':
            return a !== b;
          case '<':
            return num(a) < num(b);
          case '>':
            return num(a) > num(b);
          case '<=':
            return num(a) <= num(b);
          case '>=':
            return num(a) >= num(b);
        }
        throw new FormulaError(`#PARSE! operador ${n.op}`);
      }
    }
  };

  const out: Record<string, Value> = {};
  for (const [addr, c] of cells) if (c.formula !== undefined) out[addr] = cellValue(addr);
  return out;
}
