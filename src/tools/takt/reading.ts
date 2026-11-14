import type { Messages } from '../../i18n';
import { takt, type TaktResult, type TimeUnit } from '../../calc/takt';
import type { CalcWarning } from '../../calc/types';
import type { ReadingLine, SheetDef } from '../../sheet/types';
import { taktFormat, type NamedStation } from './explain';
import { taktSheet } from './sheet';

// «Cómo leerlo» del takt sin pantalla: la usan la herramienta y la hoja del
// proyecto, para que digan siempre lo mismo.

/** Datos del takt guardados en un proyecto. */
export interface TaktSaved {
  available: number;
  availableUnit: TimeUnit;
  demand: number;
  unit: TimeUnit;
  stations: { name: string; cycle: number }[];
}

export function taktWarnings(list: CalcWarning[], stationName: (i: number) => string, t: Messages): string[] {
  const w = t.tools.takt.warn;
  return list
    .map((x) => {
      switch (x.code) {
        case 'not-positive':
          return x.field === 'demand' ? w.demand : w.available;
        case 'step-not-positive':
          return w.station(stationName(x.step));
        case 'over-takt':
          return w.overTakt;
        default:
          return null;
      }
    })
    .filter((x): x is string => x !== null);
}

/** Conclusión: el takt y, con estaciones, el cuello de botella y el mínimo de estaciones. */
export function taktConclusion(r: TaktResult, input: { demand: number; unit: TimeUnit }, stations: NamedStation[], t: Messages, lang: 'es' | 'en'): string {
  const d = t.tools.takt;
  const f = taktFormat(lang, t, input.unit);
  const parts = [d.conclusion(f.time(r.takt))];
  const line = r.line;
  if (line) {
    const name = stations[line.bottleneck]?.name ?? d.stationName(line.bottleneck + 1);
    parts.push(
      line.bottleneckCycle > r.takt
        ? d.bottleneckOver(name, f.time(line.bottleneckCycle), f.pieces(line.capacity), f.num(input.demand, 2))
        : d.bottleneckOk(name, f.time(line.bottleneckCycle)),
      d.stationsNote(line.minStations, stations.length),
    );
  }
  return parts.join(' ');
}

export function taktReadingLines(conclusion: string, warnings: string[], t: Messages): ReadingLine[] {
  return [{ tone: 'conclusion', text: conclusion }, ...warnings.map((w) => ({ tone: 'warning' as const, text: w })), { tone: 'tip', text: t.tools.takt.typicalError }];
}

const UNITS = ['s', 'min', 'h'];
const isSaved = (x: unknown): x is TaktSaved => {
  const s = x as TaktSaved;
  return (
    typeof s === 'object' &&
    s !== null &&
    typeof s.available === 'number' &&
    typeof s.demand === 'number' &&
    UNITS.includes(s.unit) &&
    UNITS.includes(s.availableUnit) &&
    Array.isArray(s.stations)
  );
};

/** Estaciones con nombre (sin nombre: «Estación n»). */
export const namedStations = (s: TaktSaved, t: Messages): NamedStation[] =>
  s.stations.map((st, i) => ({ name: st.name.trim() || t.tools.takt.stationName(i + 1), cycle: st.cycle }));

/** Hoja de una medición guardada de takt; null si sus datos no dan resultado. */
export function taktSavedSheet(input: unknown, t: Messages, lang: 'es' | 'en', opts: { version: string; date: string }): SheetDef | null {
  if (!isSaved(input)) return null;
  const stations = namedStations(input, t);
  const calcInput = { available: input.available, availableUnit: input.availableUnit, demand: input.demand, unit: input.unit, cycles: stations.map((s) => s.cycle) };
  const out = takt(calcInput);
  if (!out.result) return null;
  const name = (i: number) => stations[i]?.name ?? t.tools.takt.stationName(i + 1);
  const reading = taktReadingLines(taktConclusion(out.result, input, stations, t, lang), taktWarnings(out.warnings, name, t), t);
  return taktSheet(calcInput, stations, t, { reading, ...opts });
}
