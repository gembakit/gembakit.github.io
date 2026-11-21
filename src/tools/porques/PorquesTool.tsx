import { useCallback } from 'react';
import { ArrowDown, CircleHelp, Wrench } from 'lucide-react';
import { useI18n } from '../../i18n';
import { DocTool } from '../doc/DocTool';
import { field, filledRows, type DocData } from '../doc/types';
import { PORQUES, porquesAnalyze, porquesExample } from './model';

/** La cadena: problema → cada porqué → causa raíz → contramedida. */
function Chain({ data }: { data: DocData }) {
  const { t } = useI18n();
  const p = t.tools.porques;
  const whys = filledRows(data, 'whys');
  const box = 'rounded-[14px] px-3.5 py-2.5 text-[15px] leading-snug wrap-break-word';
  const arrow = (
    <span className="flex items-center gap-1.5 self-center py-1 text-[12.5px] font-semibold text-muted">
      <ArrowDown aria-hidden size={16} />
      {p.chainWhy}
    </span>
  );
  return (
    <ol className="flex flex-col">
      <li className={`${box} bg-surface-2`}>
        <span className="block text-[12.5px] font-semibold text-muted">{p.chainProblem}</span>
        {field(data, 'problem')}
      </li>
      {whys.map((w, i) => (
        <li key={i} className="flex flex-col">
          {arrow}
          <div className={`${box} bg-surface-2`}>
            <span className="block text-[12.5px] font-semibold text-muted">{p.lists.whys.item(i + 1)}</span>
            {w.answer}
          </div>
        </li>
      ))}
      {field(data, 'root') && (
        <li className="flex flex-col">
          {arrow}
          <div className={`${box} bg-soft shadow-[inset_0_0_0_2px_var(--accent)]`}>
            <span className="block text-[12.5px] font-bold text-accent-ink">{p.chainRoot}</span>
            <span className="font-semibold">{field(data, 'root')}</span>
          </div>
        </li>
      )}
      {field(data, 'action') && (
        <li className={`${box} mt-2.5 flex items-start gap-2.5 bg-ok-soft`}>
          <Wrench aria-hidden size={18} className="mt-0.5 shrink-0 text-ok" />
          <span>
            <span className="block text-[12.5px] font-bold">{p.chainAction}</span>
            {field(data, 'action')}
          </span>
        </li>
      )}
    </ol>
  );
}

export default function PorquesTool() {
  const { t } = useI18n();
  const analyze = useCallback((d: DocData) => porquesAnalyze(d, t), [t]);
  return <DocTool toolId="porques" schema={PORQUES} texts={t.tools.porques} exampleIcon={CircleHelp} example={() => porquesExample(t)} analyze={analyze} Visual={Chain} />;
}
