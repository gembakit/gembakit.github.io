import { oeeView, type OeeResult } from '../../calc/oee';
import { fromCycle, SECONDS, type Measure, type TimeUnit } from '../../calc/takt';
import type { Messages } from '../../i18n';
import type { Derivation } from '../../ui/Explained';
import { frac, minus, times } from '../../ui/expr';
import { formatNumber } from '../../ui/number';
import { smartNumber } from '../takt/explain';
import { viewLabel, type OeeSaved } from './model';

/** Cómo se mide la línea: decide cómo se escribe el ciclo o la velocidad ideal. */
export interface OeeLook {
  measure: Measure;
  measureUnit: TimeUnit;
  unitName: string;
}

export const oeeLook = (s: OeeSaved, t: Messages): OeeLook => ({ measure: s.measure, measureUnit: s.measureUnit, unitName: s.unitName.trim() || t.tools.oee.defaultUnit });

/** Cómo se muestra cada valor en pantalla: la ventana de «de dónde sale» usa exactamente lo mismo. */
export function oeeFormat(lang: 'es' | 'en', look: OeeLook = { measure: 'time', measureUnit: 's', unitName: '' }) {
  const num = (x: number, d = 2) => formatNumber(x, lang, d);
  const u = look.measureUnit;
  return {
    num,
    // Espacio que no se parte: el «%» no se queda solo en la línea siguiente.
    pct: (x: number) => `${num(x * 100, 2)}\u00a0%`,
    min: (x: number) => `${num(x, 1)} min`,
    /** Parte de un total, con un decimal: «74,8 %». */
    share: (x: number) => `${num(x * 100, 1)}\u00a0%`,
    count: (x: number) => num(x, 0),
    /** Ciclo ideal (s por unidad) en la forma en que se mide la línea: «1 s» o «48.000 botellas/h». */
    ideal: (cycleSec: number) =>
      look.measure === 'time' ? `${smartNumber(fromCycle(cycleSec, 'time', u), lang)} ${u}` : `${smartNumber(fromCycle(cycleSec, 'rate', u), lang)} ${look.unitName}/${u}`,
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
): Record<OeeKey, Derivation> & { view: Derivation | null } {
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
  const wTp = { sym: x.plannedSym, label: x.plannedLabel, value: Tp };
  const wTm = { sym: x.runSym, label: x.runLabel, value: Tm };
  // En la unidad de la medida, para que cuadre con el ciclo o la velocidad; los minutos van en la etiqueta.
  const wTmU = { ...wTm, label: x.inUnit(x.runLabel, Tm), value: TmU };
  const wIdeal = { sym, label: d.ideal[s.measure]!, value: ideal };
  const wN = { sym: x.totalSym, label: d.total, value: N };
  const wR = { sym: x.rejectsSym, label: d.rejects, value: R };
  const rounded = [t.explain.rounded];
  const label = viewLabel(s, r.standardByCategory, t);
  const v = label ? oeeView(r, s.views) : null;
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
      where: [wN, wR],
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
      where: [wIdeal, wN, wR],
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
    view:
      label && v
        ? {
            title: label,
            meaning: x.viewMeaning,
            lhs: label,
            steps: [frac(x.usefulSym, minus(x.plannedSym, x.removedSym)), frac(f.min(r.minutes.useful), minus(Tp, f.min(v.removed))), f.pct(v.oee)],
            where: [
              { sym: x.usefulSym, label: d.losses.useful!, value: f.min(r.minutes.useful) },
              wTp,
              { sym: x.removedSym, label: x.removedLabel, value: f.min(v.removed) },
            ],
            notes: [d.viewOfficial(f.pct(r.oee)), ...rounded],
          }
        : null,
  };
}
