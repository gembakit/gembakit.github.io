// Lectura de números escritos o pegados por el usuario.
// Acepta coma o punto como separador decimal. No acepta separador de miles:
// "1.234" se lee como 1,234 y se marca como ambiguo para que el usuario lo
// revise en la vista previa (ver riesgos en ESTADO.md).

const DECIMAL = /^[+-]?(\d+([.,]\d+)?|[.,]\d+)$/;
const AMBIGUOUS = /^[+-]?\d{1,3}[.,]\d{3}$/;

/** Convierte "6,02", "6.02", "-0,5" o ",5" en número. Devuelve null si no es un número válido. */
export function parseDecimal(input: string): number | null {
  const s = input.trim().replace(/−/g, '-');
  if (!DECIMAL.test(s)) return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** "1.234" o "1,234": puede ser mil doscientos treinta y cuatro o uno coma dos tres cuatro. */
export function isAmbiguousThousands(input: string): boolean {
  return AMBIGUOUS.test(input.trim());
}

export interface ParsedColumn {
  values: number[];
  /** Líneas con texto que no es un número (número de línea empezando en 1). */
  invalid: { line: number; raw: string }[];
  /** Líneas que parecen llevar separador de miles. */
  ambiguous: { line: number; raw: string }[];
  /** Líneas vacías ignoradas. */
  empty: number;
}

/** Lee una columna pegada de Excel o Sheets, o escrita a mano, un valor por línea. */
export function parseColumn(text: string): ParsedColumn {
  const out: ParsedColumn = { values: [], invalid: [], ambiguous: [], empty: 0 };
  const lines = text.split(/\r\n|\r|\n/);
  // La última línea vacía de un pegado no cuenta.
  if (lines.length > 0 && lines[lines.length - 1]!.trim() === '') lines.pop();
  lines.forEach((raw, i) => {
    const cell = raw.split('\t')[0]!.trim();
    if (cell === '') {
      out.empty++;
      return;
    }
    const n = parseDecimal(cell);
    if (n === null) out.invalid.push({ line: i + 1, raw: cell });
    else {
      out.values.push(n);
      if (isAmbiguousThousands(cell)) out.ambiguous.push({ line: i + 1, raw: cell });
    }
  });
  return out;
}

/** Formato de número para mostrar según el idioma (coma en español, punto en inglés). */
export function formatNumber(n: number, lang: 'es' | 'en', maxDecimals = 2): string {
  return new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US', {
    maximumFractionDigits: maxDecimals,
    useGrouping: true,
  }).format(n);
}
