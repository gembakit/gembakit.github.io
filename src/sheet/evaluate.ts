import { normalInv } from '../calc/stats';
import { COLUMNS, type Grid } from './layout';

// Evaluador mínimo de fórmulas de hoja de cálculo. Lo usan las pruebas que
// comparan las fórmulas de cada hoja con el módulo de cálculo (CLAUDE.md,
// calidad de los cálculos) y la exportación, para saber cuántos decimales
// enseñar en cada celda. Sigue las reglas de Excel y Google Sheets en lo que
// usan las hojas de la app: + − × ÷ ^ (el menos delante va antes que ^),
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
  | { t: 'range'; v: string }
  | { t: 'neg'; e: Node }
  | { t: 'bin'; op: string; a: Node; b: Node }
  | { t: 'call'; name: string; args: Node[] };

const TOKEN = /\s*(?:(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|("(?:[^"]|"")*")|([A-Z]+\d+:[A-Z]+\d+)\b|([A-Z]+\d+)\b|([A-Z][A-Z0-9.]*)(?=\()|(<=|>=|<>|[-+*/^&=<>(),]))/y;

function tokenize(src: string): string[] {
  const out: string[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < src.length) {
    if (/^\s*$/.test(src.slice(TOKEN.lastIndex))) break;
    const m = TOKEN.exec(src);
    if (!m) throw new FormulaError(`#PARSE! cerca de «${src.slice(TOKEN.lastIndex)}»`);
    out.push(m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? m[6]!);
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
    if (tok.includes(':')) return { t: 'range', v: tok };
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

const num = (v: Value | Value[]): number => {
  if (Array.isArray(v)) throw new FormulaError('#VALUE! rango donde iba un valor');
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  throw new FormulaError('#VALUE!');
};

/** Un argumento: un valor o, si es un rango, la lista de sus celdas. */
type Lazy = () => Value | Value[];

/** Números de los argumentos; dentro de un rango, el texto se ignora (como en la hoja). */
const numbers = (args: Lazy[]): number[] =>
  args.flatMap((x) => {
    const v = x();
    return Array.isArray(v) ? v.filter((c): c is number => typeof c === 'number') : [num(v)];
  });

const list = (x: Lazy | undefined): Value[] => {
  const v = x?.();
  if (!Array.isArray(v)) throw new FormulaError('#VALUE! se esperaba un rango');
  return v;
};

const FUNCTIONS: Record<string, (args: Lazy[]) => Value> = {
  IF: ([c, a, b]) => {
    const v = num(c!()) !== 0 ? a!() : b ? b() : false;
    if (Array.isArray(v)) throw new FormulaError('#VALUE! rango donde iba un valor');
    return v;
  },
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
  PRODUCT: (args) => numbers(args).reduce((a, b) => a * b, 1),
  // Como en la hoja: sin ningún número, MIN da 0.
  MIN: (args) => {
    const n = numbers(args);
    return n.length ? Math.min(...n) : 0;
  },
  // Solo la coincidencia exacta (tercer argumento 0), que es la que usan las hojas de la app.
  MATCH: ([x, range, type]) => {
    if (!type || num(type()) !== 0) throw new FormulaError('#N/A solo se admite MATCH exacto');
    const v = x!() as Value;
    const i = list(range).findIndex((c) => c === v);
    if (i < 0) throw new FormulaError('#N/A');
    return i + 1;
  },
  INDEX: ([range, n]) => {
    const cells = list(range);
    const i = num(n!() as Value);
    if (!(Number.isInteger(i) && i >= 1 && i <= cells.length)) throw new FormulaError('#REF!');
    return cells[i - 1]!;
  },
  'NORM.S.INV': ([x]) => {
    const p = num(x!());
    if (!(p > 0 && p < 1)) throw new FormulaError('#NUM!');
    return normalInv(p);
  },
};

/** Calcula todas las celdas con fórmula de la cuadrícula. Devuelve dirección → valor. */
export function evaluateGrid(grid: Grid): Record<string, Value> {
  const cells = new Map<string, { number?: number; text?: string; formula?: string }>();
  grid.rows.forEach((row, r) => row.cells.forEach((c, col) => cells.set(`${COLUMNS[col]}${r + 1}`, c)));
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

  // Celdas de un rango, por filas: «C3:D4» → C3, D3, C4, D4.
  const rangeValues = (range: string): Value[] => {
    const [from, to] = range.split(':').map((a) => /^([A-Z]+)(\d+)$/.exec(a)!);
    const c0 = COLUMNS.indexOf(from![1]!);
    const c1 = COLUMNS.indexOf(to![1]!);
    if (c0 < 0 || c1 < 0) throw new FormulaError(`#REF! ${range}`);
    const out: Value[] = [];
    for (let r = Number(from![2]); r <= Number(to![2]); r++) for (let c = c0; c <= c1; c++) out.push(cellValue(`${COLUMNS[c]}${r}`));
    return out;
  };

  const evalNode = (n: Node): Value => {
    switch (n.t) {
      case 'num':
      case 'str':
        return n.v;
      case 'ref':
        return cellValue(n.v);
      case 'range':
        throw new FormulaError('#VALUE! rango donde iba un valor');
      case 'neg':
        return -num(evalNode(n.e));
      case 'call': {
        const fn = FUNCTIONS[n.name];
        if (!fn) throw new FormulaError(`#NAME? ${n.name} no está en el evaluador`);
        return fn(n.args.map((a) => (a.t === 'range' ? () => rangeValues(a.v) : () => evalNode(a))));
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
