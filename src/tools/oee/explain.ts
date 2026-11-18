import type { OeeInput, OeeResult } from '../../calc/oee';
import type { Messages } from '../../i18n';
import type { Derivation } from '../../ui/Explained';
import { frac, minus, times } from '../../ui/expr';
import { formatNumber } from '../../ui/number';

/** Cómo se muestra cada valor en pantalla: la ventana usa exactamente lo mismo. */
export function oeeFormat(lang: 'es' | 'en') {
  const num = (x: number, d = 2) => formatNumber(x, lang, d);
  return {
    num,
    pct: (x: number) => `${num(x * 100, 2)} %`,
    min: (x: number) => `${num(x, 1)} min`,
    /** Parte del tiempo planificado, con un decimal: «74,8 %». */
    share: (x: number) => `${num(x * 100, 1)} %`,
    s: (x: number) => `${num(x, 2)} s`,
    count: (x: number) => num(x, 0),
  };
}

export type OeeKey = 'availability' | 'performance' | 'quality' | 'oee' | 'useful' | 'speed' | 'qualityLoss';

/** De dónde sale cada valor del OEE, con los números del usuario. */
export function oeeExplain(i: OeeInput, r: OeeResult, t: Messages, lang: 'es' | 'en'): Record<OeeKey, Derivation> {
  const d = t.tools.oee;
  const x = d.explain;
  const f = oeeFormat(lang);
  const Tp = f.min(r.planned);
  const Tm = f.min(r.run);
  const TmS = f.s(r.run * 60);
  const TCi = f.s(i.idealCycle);
  const N = f.count(i.total);
  const R = f.count(i.rejects);
  const good = f.count(r.good);
  const wTp = { sym: x.plannedSym, label: x.plannedLabel, value: Tp };
  const wTm = { sym: x.runSym, label: x.runLabel, value: Tm };
  // En segundos, para que cuadre con el ciclo ideal; los minutos van en la etiqueta.
  const wTmS = { ...wTm, label: x.inSeconds(x.runLabel, Tm.replace(' ', ' ')), value: TmS };
  const wTCi = { sym: x.idealSym, label: d.idealCycle, value: TCi };
  const wN = { sym: x.totalSym, label: d.total, value: N };
  const wR = { sym: x.rejectsSym, label: d.rejects, value: R };
  const rounded = [t.explain.rounded];
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
      steps: [frac(times(x.idealSym, x.totalSym), x.runSym), frac(times(TCi, N), TmS), f.pct(r.performance)],
      where: [wTCi, wN, wTmS],
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
      steps: [times(x.idealSym, minus(x.totalSym, x.rejectsSym)), times(TCi, good), f.min(r.minutes.useful)],
      where: [wTCi, wN, wR],
      notes: rounded,
    },
    speed: {
      title: d.losses.speed,
      meaning: x.speedMeaning,
      lhs: d.losses.speed!,
      steps: [minus(x.runSym, times(x.idealSym, x.totalSym)), minus(Tm, times(TCi, N)), f.min(r.minutes.speed)],
      where: [wTm, wTCi, wN],
      notes: rounded,
    },
    qualityLoss: {
      title: d.losses.quality,
      meaning: x.qualityMeaning,
      lhs: d.losses.quality!,
      steps: [times(x.idealSym, x.rejectsSym), times(TCi, R), f.min(r.minutes.quality)],
      where: [wTCi, wR],
      notes: rounded,
    },
  };
}
