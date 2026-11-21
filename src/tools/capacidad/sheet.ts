import type { Messages } from '../../i18n';
import type { CapabilityResult } from '../../calc/capability';
import { fixed, type ReadingLine, type SheetDef, type SheetInput, type SheetResult } from '../../sheet/types';
import { descriptivaFormat } from '../descriptiva/explain';
import { measuredName } from '../descriptiva/model';
import type { CapacidadSaved } from './model';

// Hoja de capacidad: datos editables (con su rango móvil si son sueltos),
// límites editables y los índices como fórmulas. La prueba comprueba que
// dan lo mismo que el cálculo.

export function capacidadSheet(s: CapacidadSaved, r: CapabilityResult, t: Messages, opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.capacidad;
  const sh = d.sheet;
  const n = sh.notes;
  const c = t.sheet;
  const unit = s.unit.trim();
  const name = measuredName(s.name, d.defaultName);
  const single = s.subgroup <= 1;
  const v = fixed(descriptivaFormat('es', s.values, s.unit).d);
  const inputs: SheetInput[] = [
    ...(s.lsl !== null ? [{ key: 'lsl', label: d.lsl, value: s.lsl, note: unit, format: 'auto' as const }] : []),
    ...(s.usl !== null ? [{ key: 'usl', label: d.usl, value: s.usl, note: unit, format: 'auto' as const }] : []),
    ...(s.target !== null ? [{ key: 'target', label: d.target, value: s.target, note: unit, format: 'auto' as const }] : []),
    ...(single ? [] : [{ key: 'sigmaWithin', label: sh.within, value: r.sigmaWithin, note: unit, format: v }]),
  ];
  const sides = (sigma: string) => {
    const parts = [...(s.usl !== null ? [`({usl}-{mean})/(3*${sigma})`] : []), ...(s.lsl !== null ? [`({mean}-{lsl})/(3*${sigma})`] : [])];
    return parts.length === 1 ? parts[0]! : `MIN(${parts.join(',')})`;
  };
  const both = s.lsl !== null && s.usl !== null;
  const ppmParts = [
    ...(s.lsl !== null ? ['NORM.S.DIST(({lsl}-{mean})/{sigmaOverall},1)'] : []),
    ...(s.usl !== null ? ['1-NORM.S.DIST(({usl}-{mean})/{sigmaOverall},1)'] : []),
  ];
  const results: SheetResult[] = [
    { key: 'mean', label: d.mean, formula: 'AVERAGE({x[]})', note: n.mean, format: v },
    { key: 'sigmaOverall', label: d.sigmaOverall, formula: 'STDEV.S({x[]})', note: n.sigmaOverall, format: v },
    ...(single ? [{ key: 'sigmaWithin', label: d.sigmaWithin, formula: 'AVERAGE({mr[]})/1.128', note: n.sigmaWithin, format: v }] : []),
    ...(both ? [{ key: 'cp', label: d.cp, formula: '({usl}-{lsl})/(6*{sigmaWithin})', note: n.cp, format: 'decimal2' as const, summary: true }] : []),
    { key: 'cpk', label: d.cpk, formula: sides('{sigmaWithin}'), note: n.cpk, format: 'decimal2', main: true },
    ...(both ? [{ key: 'pp', label: d.pp, formula: '({usl}-{lsl})/(6*{sigmaOverall})', note: n.pp, format: 'decimal2' as const }] : []),
    { key: 'ppk', label: d.ppk, formula: sides('{sigmaOverall}'), note: n.ppk, format: 'decimal2', summary: true },
    { key: 'ppm', label: d.ppmOverall, formula: `(${ppmParts.join('+')})*1000000`, note: n.ppm, format: 'auto' },
    ...(both && s.target !== null ? [{ key: 'cpm', label: d.cpm, formula: '({usl}-{lsl})/(6*SQRT({sigmaOverall}^2+({mean}-{target})^2))', note: n.cpm, format: 'decimal2' as const }] : []),
  ];
  return {
    fileTitle: `${sh.file} · ${name} · ${opts.date}`,
    tabTitle: sh.tab,
    heading: `${d.name} · ${name}`,
    subheading: c.subheading(opts.version, opts.date),
    texts: {
      summary: c.summary,
      inputs: c.inputs,
      results: c.results,
      reading: c.reading,
      notes: c.notes,
      inputHeads: [c.inputHeads[0]!, c.inputHeads[1]!, c.inputHeads[2]!],
      resultHeads: [c.resultHeads[0]!, c.resultHeads[1]!, c.resultHeads[2]!],
      editHint: c.editHint,
      prefixes: c.prefixes,
    },
    inputs,
    table: {
      labelHead: sh.valuesHead,
      columns: [
        { key: 'x', head: unit ? `${sh.valueHead} (${unit})` : sh.valueHead, format: 'auto' },
        ...(single ? [{ key: 'mr', head: sh.mrHead, format: 'auto' as const, formula: 'ABS({.x}-{^x})', formulaFirst: '' }] : []),
      ],
      rows: s.values.map((v, i) => ({ label: `${i + 1}`, values: { x: v } })),
    },
    results,
    reading: opts.reading,
    notes: [c.readingNote],
  };
}
