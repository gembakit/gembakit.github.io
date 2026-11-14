import type { CalcOutput, CalcStep, CalcWarning } from './types';

// Ahorro, ROI y payback (docs/fichas/fase-1.md, ficha 6). Sin descontar: no
// se aplica tasa de interés. El ROI y el payback se calculan solo con el
// ahorro duro; el blando se enseña aparte (decisión E del dueño).

export interface RoiInput {
  investment: number;
  /**
   * Ahorro duro de cada año. Con `repeat`, el primero se repite todos los
   * años; si no, uno por año (el horizonte es el número de años).
   */
  savings: number[];
  repeat: boolean;
  /** Costes nuevos que añade la mejora cada año. */
  newCosts: number;
  /** Años para el ROI (con `repeat`). */
  horizon: number;
}

export interface RoiResult {
  /** Ahorro neto de cada año del horizonte (ahorro duro − costes nuevos). */
  net: number[];
  /** Payback en años; null si la inversión no se recupera (con los años dados). */
  payback: number | null;
  /** Ahorro neto acumulado en el horizonte. */
  total: number;
  /** ROI = (ahorro neto acumulado − inversión) ÷ inversión. */
  roi: number;
  horizon: number;
}

export function roi(i: RoiInput): CalcOutput<RoiResult> {
  const warnings: CalcWarning[] = [];
  if (!(i.investment > 0)) warnings.push({ code: 'not-positive', field: 'investment' });
  if (i.newCosts < 0) warnings.push({ code: 'negative', field: 'newCosts' });
  if (i.repeat && !(i.horizon > 0)) warnings.push({ code: 'not-positive', field: 'horizon' });
  if (!i.savings.length) warnings.push({ code: 'no-data' });
  if (warnings.length) return { result: null, steps: [], warnings };

  const horizon = i.repeat ? i.horizon : i.savings.length;
  const yearNet = (k: number) => (i.repeat ? i.savings[0]! : (i.savings[k] ?? 0)) - i.newCosts;
  const net = Array.from({ length: Math.ceil(horizon) }, (_, k) => yearNet(k));
  // Horizonte con decimales (1,5 años): el último año cuenta en parte.
  const total = i.repeat ? yearNet(0) * horizon : net.reduce((a, b) => a + b, 0);

  let payback: number | null = null;
  if (i.repeat) payback = yearNet(0) > 0 ? i.investment / yearNet(0) : null;
  else {
    // Se acumula año a año y se interpola dentro del año en que se recupera.
    let cum = 0;
    for (let k = 0; k < net.length; k++) {
      if (net[k]! > 0 && cum + net[k]! >= i.investment) {
        payback = k + (i.investment - cum) / net[k]!;
        break;
      }
      cum += net[k]!;
    }
  }
  if (payback === null) warnings.push({ code: 'no-payback' });
  else if (payback > horizon + 1e-9) warnings.push({ code: 'payback-beyond-horizon' });
  const value = (total - i.investment) / i.investment;
  const steps: CalcStep[] = [
    ...(i.repeat ? [{ key: 'net', value: yearNet(0) }] : []),
    { key: 'total', value: total },
    ...(payback === null ? [] : [{ key: 'payback', value: payback }]),
    { key: 'roi', value },
  ];
  return { result: { net, payback, total, roi: value, horizon }, steps, warnings };
}

/** «3 años y 8 meses»: años enteros y meses redondeados (12 meses pasan al año siguiente). */
export function yearsMonths(years: number): { years: number; months: number } {
  let y = Math.floor(years + 1e-9);
  let m = Math.round((years - y) * 12);
  if (m === 12) {
    y++;
    m = 0;
  }
  return { years: y, months: m };
}
