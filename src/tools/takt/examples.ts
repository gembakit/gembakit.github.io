import type { Messages } from '../../i18n';
import type { TaktSaved } from './reading';

// Ejemplos cargables del takt (docs/fichas/takt-v2.md, apartado 7). Cuentas
// propias, comprobadas en las pruebas: los casos publicados siguen en
// src/calc/takt.test.ts.

const perHour = { measure: 'rate', unit: 'h', item: '', per: 1 } as const;
const seconds = { measure: 'time', unit: 's', item: '', per: 1 } as const;

/**
 * Embotelladora, máquinas en serie medidas en botellas por hora: turno de
 * 8 h menos 10 + 20 min, 3 turnos, 900.000 botellas → takt 0,09 s (40.000/h).
 * La llenadora (estándar 48.000/h, media real 44.500/h) es el cuello; con un
 * OEE del 75 % saca 810.000 y necesita al menos un 83,3 %. La etiquetadora
 * varía un 10,6 % entre medidas. La encajonadora cuenta cajas de 24 botellas,
 * en cajas por minuto: 42 cajas/min = 60.480 botellas/h; media 36,425 cajas/min
 * = 52.452 botellas/h.
 */
export const BOTTLING = (t: Messages): TaktSaved => {
  const x = t.tools.takt.exampleData;
  return {
    v: 3,
    shift: 8,
    shiftUnit: 'h',
    deductions: [
      { name: x.meeting, value: 10, unit: 'min' },
      { name: x.cleaning, value: 20, unit: 'min' },
    ],
    shifts: 3,
    demand: 900_000,
    unitName: x.bottles,
    stationUnit: { measure: 'rate', unit: 'h' },
    result: { measure: 'rate', unit: 'h' },
    balance: false,
    basis: 'mean',
    stations: [
      { name: x.depal, ...perHour, theoretical: 60_000, actual: [55_000, 56_500, 55_800, 56_200] },
      { name: x.filler, ...perHour, theoretical: 48_000, actual: [44_000, 45_500, 43_800, 44_700] },
      { name: x.labeler, ...perHour, theoretical: 54_000, actual: [48_500, 53_800, 51_200, 54_000] },
      { name: x.caser, measure: 'rate', unit: 'min', item: x.cases, per: 24, theoretical: 42, actual: [36, 36.5, 37, 36.2] },
    ],
    oee: 0.75,
  };
};

/**
 * Armado manual de packs promocionales, tres puestos medidos en segundos y
 * resultados en minutos: turno de 480 min menos 10 + 10 + 30 → 430 min,
 * 215 packs → takt 2 min (el caso del Lean Lexicon con los descansos
 * quitados). «Meter botellas y regalo» (media 140,2 s) pasa del takt.
 */
export const PACKS = (t: Messages): TaktSaved => {
  const x = t.tools.takt.exampleData;
  return {
    v: 3,
    shift: 480,
    shiftUnit: 'min',
    deductions: [
      { name: x.break1, value: 10, unit: 'min' },
      { name: x.break2, value: 10, unit: 'min' },
      { name: x.lunch, value: 30, unit: 'min' },
    ],
    shifts: 1,
    demand: 215,
    unitName: x.packs,
    stationUnit: { measure: 'time', unit: 's' },
    result: { measure: 'time', unit: 'min' },
    balance: true,
    basis: 'mean',
    stations: [
      { name: x.box, ...seconds, theoretical: 95, actual: [105, 98, 110, 102, 99] },
      { name: x.fill, ...seconds, theoretical: 125, actual: [142, 135, 146, 138, 140] },
      { name: x.close, ...seconds, theoretical: 85, actual: [88, 92, 85, 90, 87] },
    ],
    oee: null,
  };
};
