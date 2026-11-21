import { useCallback } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n';
import { DocTool } from '../doc/DocTool';
import type { DocData } from '../doc/types';
import { PLAN_CONTROL, planControlAnalyze, planControlExample } from './model';

export default function PlanControlTool() {
  const { t, lang } = useI18n();
  const analyze = useCallback((d: DocData) => planControlAnalyze(d, t, lang), [t, lang]);
  return <DocTool toolId="plancontrol" schema={PLAN_CONTROL} texts={t.tools.plancontrol} exampleIcon={ShieldCheck} example={() => planControlExample(t)} analyze={analyze} />;
}
