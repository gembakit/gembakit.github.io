import type { Messages } from '../../i18n';
import type { RoiResult } from '../../calc/roi';
import type { ReadingLine, SheetDef, SheetInput, SheetResult } from '../../sheet/types';
import { lineValue, sums, type RoiSaved } from './model';

// Hoja de ahorro, ROI y payback: los mismos cálculos que src/calc/roi.ts,
// como fórmulas vivas. El payback con ahorro distinto cada año (acumulado e
// interpolado) lo escribe la app como número, con su nota. La prueba
// sheet.test.ts comprueba que todo da lo mismo.

export function roiSheet(s: RoiSaved, r: RoiResult, t: Messages, opts: { reading: ReadingLine[]; version: string; date: string }): SheetDef {
  const d = t.tools.roi;
  const n = d.sheet.notes;
  const sh = t.sheet;
  const c = s.currency;
  const perYear = d.perYear(c);
  const yearly = s.mode === 'yearly';
  const { hard, soft } = sums(s);
  const inputs: SheetInput[] = [{ key: 'investment', label: d.investment, value: s.investment, note: c, format: 'decimal2' }];
  if (!yearly) {
    inputs.push({ key: 'hardAnnual', label: d.sheet.hardAnnual, value: hard, note: perYear, format: 'decimal2' });
    if (soft) inputs.push({ key: 'softAnnual', label: d.sheet.softAnnual, value: soft, note: `${perYear} · ${n.soft}`, format: 'decimal2' });
  }
  inputs.push({ key: 'newCosts', label: d.newCosts, value: s.newCosts, note: perYear, format: 'decimal2' });
  if (!yearly) inputs.push({ key: 'horizon', label: d.horizon, value: s.horizon, note: d.yearsUnit, format: 'auto' });

  const paybackFormula = yearly ? (r.payback === null ? '"—"' : String(r.payback)) : 'IF({net}>0,{investment}/{net},"—")';
  const results: SheetResult[] = [
    ...(!yearly ? [{ key: 'net', label: d.netAnnual, formula: '{hardAnnual}-{newCosts}', note: `${perYear} · ${n.net}`, format: 'decimal2', summary: true } as SheetResult] : []),
    {
      key: 'total',
      label: d.steps.total,
      formula: yearly ? 'SUM({net[]})' : '{net}*{horizon}',
      note: `${c} · ${yearly ? n.totalYearly : n.total}`,
      format: 'decimal2',
    },
    { key: 'payback', label: d.steps.payback, formula: paybackFormula, note: yearly ? n.paybackYearly : n.payback, format: r.payback === null ? 'text' : 'decimal2', main: true },
    { key: 'roi', label: 'ROI', formula: '({total}-{investment})/{investment}', note: n.roi, format: 'percent', summary: true },
  ];
  const lines = s.lines.map((l, i) => `${l.name.trim() || d.lineName(i + 1)} (${l.kind === 'hard' ? d.hard : d.soft}) ${lineValue(l)} ${perYear}`);
  return {
    fileTitle: `${d.sheet.file} · ${opts.date}`,
    tabTitle: d.sheet.tab,
    heading: d.name,
    subheading: sh.subheading(opts.version, opts.date),
    texts: {
      summary: sh.summary,
      inputs: sh.inputs,
      results: sh.results,
      reading: sh.reading,
      notes: sh.notes,
      inputHeads: [sh.inputHeads[0]!, sh.inputHeads[1]!, sh.inputHeads[2]!],
      resultHeads: [sh.resultHeads[0]!, sh.resultHeads[1]!, sh.resultHeads[2]!],
      editHint: sh.editHint,
      prefixes: sh.prefixes,
    },
    inputs,
    table: yearly
      ? {
          labelHead: d.sheet.yearHead,
          columns: [
            { key: 'saving', head: d.sheet.savingHead, format: 'decimal2' },
            { key: 'net', head: d.sheet.netHead, format: 'decimal2', formula: '{.saving}-{newCosts}' },
          ],
          rows: s.years.map((v, i) => ({ label: d.year(i + 1), values: { saving: v } })),
        }
      : undefined,
    results,
    reading: opts.reading,
    notes: [...(!yearly && lines.length ? [d.sheet.lines(lines.join('; '))] : []), d.undiscounted, sh.readingNote],
  };
}
