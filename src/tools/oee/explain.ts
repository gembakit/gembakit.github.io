import { utilization, type OeeResult } from '../../calc/oee';
import { fromCycle, SECONDS, type Measure, type TimeUnit } from '../../calc/takt';
import type { Messages } from '../../i18n';
import type { Derivation } from '../../ui/Explained';
import { frac, minus, times } from '../../ui/expr';
import { formatNumber } from '../../ui/number';
import { paceLabel, smartNumber } from '../takt/explain';
import { isOfficial, offSlices, sliceName, utilizationLabel, type OeeSaved } from './model';

/** Cómo se mide la línea: decide cómo se escribe el ciclo o la velocidad ideal. */
export interface OeeLook {
  measure: Measure;
  measureUnit: TimeUnit;
  unitName: string;
  /** Unidad completa de la velocidad estándar: «s/pieza», «botellas/h». */
  paceUnit: string;
}

export function oeeLook(s: Pick<OeeSaved, 'measure' | 'measureUnit' | 'unitName'>, t: Messages): OeeLook {
  const unitName = s.unitName.trim() || t.tools.oee.defaultUnit;
  return { measure: s.measure, measureUnit: s.measureUnit, unitName, paceUnit: paceLabel(t, { measure: s.measure, unit: s.measureUnit }, unitName) };
}

/** Cómo se muestra cada valor en pantalla: la ventana de «de dónde sale» usa exactamente lo mismo. */
export function oeeFormat(lang: 'es' | 'en', look: OeeLook) {
  const num = (x: number, d = 2) => formatNumber(x, lang, d);
  const u = look.measureUnit;
  return {
    num,
    // Espacio que no se parte: el «%» no se queda solo en la línea siguiente.
    // Siempre con dos decimales: 97,80 %, como 88,81 %.
    pct: (x: number) => `${formatNumber(x * 100, lang, 2, 2)}\u00a0%`,
    min: (x: number) => `${num(x, 1)} min`,
    /** Parte de un total, con un decimal: «74,8 %». */
    share: (x: number) => `${num(x * 100, 1)}\u00a0%`,
    count: (x: number) => num(x, 0),
    /** Ciclo ideal (s por unidad) en la forma en que se mide la línea: «1 s» o «48.000 botellas/h». */
    ideal: (cycleSec: number) => `${smartNumber(fromCycle(cycleSec, look.measure, u), lang)} ${look.paceUnit}`,
    /** Minutos pasados a la unidad de la medida (para que cuadren con el ciclo o la velocidad). */
    inUnit: (minutes: number) => `${smartNumber((minutes * 60) / SECONDS[u], lang)} ${u}`,
  };
}

export type OeeKey = 'availability' | 'performance' | 'quality' | 'oee' | 'useful' | 'speed' | 'qualityLoss';

/** De dónde sale cada valor del OEE, con los números del usuario. */
export function oeeExplain(
  s: OeeSaved,
  idealCycle: number,
  r: OeeResult,
  t: Messages,
  lang: 'es' | 'en',
): Record<OeeKey | 'utilization', Derivation> {
  const d = t.tools.oee;
  const x = d.explain;
  const look = oeeLook(s, t);
  const f = oeeFormat(lang, look);
  const isTime = s.measure === 'time';
  const Tp = f.min(r.planned);
  const Tm = f.min(r.run);
  const TmU = f.inUnit(r.run);
  const ideal = f.ideal(idealCycle);
  const N = f.count(s.total);
  const R = f.count(s.rejects);
  const good = f.count(r.good);
  const sym = isTime ? x.idealSym : x.idealRateSym;
  // De dónde salen el tiempo planificado y el de marcha, en su línea de «Donde»: 480 − 60 min; 420 − 47 min.
  const toMin = (v: number, unit: TimeUnit) => (v * SECONDS[unit]) / 60;
  const plannedParts = s.planned.map((p) => f.num(toMin(p.value, p.unit), 1));
  const wTp = {
    sym: x.plannedSym,
    label: plannedParts.length ? x.plannedFrom(f.num(toMin(s.shift, s.shiftUnit), 1), `${plannedParts.join(' − ')} min`) : x.plannedLabel,
    value: Tp,
  };
  const wTm = { sym: x.runSym, label: x.runFrom(Tp, f.min(r.minutes.downtime)), value: Tm };
  // En la unidad de la medida, para que cuadre con el ciclo o la velocidad; los minutos van en la etiqueta.
  const wTmU = { ...wTm, label: x.inUnit(x.runLabel, Tm), value: TmU };
  const wIdeal = { sym, label: d.ideal, value: ideal };
  const wN = { sym: x.totalSym, label: x.totalLabel, value: N };
  const wR = { sym: x.rejectsSym, label: x.rejectsLabel, value: R };
  const wGood = { sym: x.goodSym, label: x.goodLabel, value: good };
  const rounded = [t.explain.rounded];
  const u = utilization(r, s.off);
  const uLabel = utilizationLabel(s, r, t);
  const off = offSlices(s, r);
  const T = f.min(r.shift);
  const Tu = f.min(r.minutes.useful);
  const wT = { sym: x.shiftSym, label: x.shiftLabel, value: T };
  const wTu = { sym: x.usefulSym, label: d.losses.useful!, value: Tu };
  return {
    availability: {
      term: 'disponibilidad',
      lhs: d.availability,
      steps: [frac(x.runSym, x.plannedSym), frac(Tm, Tp), f.pct(r.availability)],
      where: [wTm, wTp],
      notes: rounded,
    },
    performance: {
      term: 'rendimiento',
      lhs: d.performance,
      steps: isTime
        ? [frac(times(sym, x.totalSym), x.runSym), frac(times(ideal, N), TmU), f.pct(r.performance)]
        : [frac(x.totalSym, times(sym, x.runSym)), frac(N, times(ideal, TmU)), f.pct(r.performance)],
      where: [wIdeal, wN, wTmU],
      notes: rounded,
    },
    quality: {
      title: d.quality,
      meaning: x.qualMeaning,
      lhs: d.quality,
      steps: [frac(minus(x.totalSym, x.rejectsSym), x.totalSym), frac(minus(N, R), N), frac(good, N), f.pct(r.quality)],
      where: [wN, wR, wGood],
      notes: rounded,
    },
    oee: {
      term: 'oee',
      lhs: 'OEE',
      steps: [times(x.availSym, x.perfSym, x.qualSym), times(f.pct(r.availability), f.pct(r.performance), f.pct(r.quality)), f.pct(r.oee)],
      where: [
        { sym: x.availSym, label: d.availability, value: f.pct(r.availability) },
        { sym: x.perfSym, label: d.performance, value: f.pct(r.performance) },
        { sym: x.qualSym, label: d.quality, value: f.pct(r.quality) },
      ],
      notes: rounded,
    },
    useful: {
      title: d.losses.useful,
      meaning: x.usefulMeaning,
      lhs: d.losses.useful!,
      steps: isTime
        ? [times(sym, minus(x.totalSym, x.rejectsSym)), times(ideal, good), f.min(r.minutes.useful)]
        : [frac(minus(x.totalSym, x.rejectsSym), sym), frac(good, ideal), f.min(r.minutes.useful)],
      where: [wIdeal, wN, wR, wGood],
      notes: rounded,
    },
    speed: {
      title: d.losses.speed,
      meaning: x.speedMeaning,
      lhs: d.losses.speed!,
      steps: isTime
        ? [minus(x.runSym, times(sym, x.totalSym)), minus(Tm, times(ideal, N)), f.min(r.minutes.speed)]
        : [minus(x.runSym, frac(x.totalSym, sym)), minus(Tm, frac(N, ideal)), f.min(r.minutes.speed)],
      where: [wTm, wIdeal, wN],
      notes: rounded,
    },
    qualityLoss: {
      title: d.losses.quality,
      meaning: x.qualityMeaning,
      lhs: d.losses.quality!,
      steps: isTime ? [times(sym, x.rejectsSym), times(ideal, R), f.min(r.minutes.quality)] : [frac(x.rejectsSym, sym), frac(R, ideal), f.min(r.minutes.quality)],
      where: [wIdeal, wR],
      notes: rounded,
    },
    utilization: {
      title: uLabel,
      meaning: x.utilMeaning,
      lhs: uLabel,
      steps: off.length
        ? [frac(x.usefulSym, minus(x.shiftSym, x.removedSym)), frac(Tu, minus(T, f.min(u.removed))), f.pct(u.value)]
        : [frac(x.usefulSym, x.shiftSym), frac(Tu, T), f.pct(u.value)],
      where: off.length
        ? [wTu, wT, { sym: x.removedSym, label: x.removedLabel(off.map((y) => `${sliceName(s, y.key, r, t)} ${f.min(y.minutes)}`).join(' + ')), value: f.min(u.removed) }]
        : [wTu, wT],
      notes: [isOfficial(s, r) ? d.pieIsOfficial : d.viewOfficial(f.pct(r.oee)), ...rounded],
    },
  };
}
