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

/**
 * Número como texto de un campo para volver a editarlo: sin separador de
 * miles (que se leería como decimales) y con la coma o el punto del idioma.
 */
export function toFieldText(v: number, lang: 'es' | 'en'): string {
  const s = String(Number(v.toPrecision(12)));
  return lang === 'es' ? s.replace('.', ',') : s;
}

/** Formato de número para mostrar según el idioma (coma en español, punto en inglés). */
export function formatNumber(n: number, lang: 'es' | 'en', maxDecimals = 2): string {
  return new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US', {
    maximumFractionDigits: maxDecimals,
    useGrouping: true,
  }).format(n);
}

/** Tamaño de archivo o de almacenamiento: «120 KB», «2,3 GB». */
export function formatBytes(n: number, lang: 'es' | 'en'): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${formatNumber(v, lang, i <= 1 ? 0 : 1)} ${units[i]}`;
}

/** Número con como mucho `digits` cifras significativas (0,036; 0,00123). */
export function formatSignificant(n: number, lang: 'es' | 'en', digits = 3): string {
  return new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-US', { maximumSignificantDigits: digits }).format(n);
}

/** Porcentaje (x de 0 a 1) con los decimales justos: nunca enseña 100 % ni 0 % si no lo es. Sin el signo «%». */
export function formatPercent(x: number, lang: 'es' | 'en'): string {
  let d = 1;
  const v = x * 100;
  while (d < 4 && ((v < 100 && Number(v.toFixed(d)) === 100) || (v > 0 && Number(v.toFixed(d)) === 0))) d++;
  return formatNumber(v, lang, d);
}
