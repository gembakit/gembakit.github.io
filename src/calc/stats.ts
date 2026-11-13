import jStat from 'jstat';

// Distribuciones estadísticas con jStat (CLAUDE.md, tecnología). Todo lo que
// las herramientas necesiten de jStat pasa por aquí, para poder comprobarlo
// en un solo sitio.

/** Φ(x): probabilidad de que una normal estándar quede por debajo de x. */
export function normalCdf(x: number): number {
  return jStat.normal.cdf(x, 0, 1);
}

/** Φ⁻¹(p): punto de la normal estándar que deja por debajo la probabilidad p (0 < p < 1). */
export function normalInv(p: number): number {
  return jStat.normal.inv(p, 0, 1);
}
