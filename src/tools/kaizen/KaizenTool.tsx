import { useCallback } from 'react';
import { Zap } from 'lucide-react';
import { useI18n } from '../../i18n';
import { DocTool } from '../doc/DocTool';
import type { DocData } from '../doc/types';
import { KAIZEN, kaizenAnalyze, kaizenExample } from './model';

export default function KaizenTool() {
  const { t } = useI18n();
  const analyze = useCallback((d: DocData) => kaizenAnalyze(d, t), [t]);
  return <DocTool toolId="kaizen" schema={KAIZEN} texts={t.tools.kaizen} exampleIcon={Zap} example={() => kaizenExample(t)} analyze={analyze} />;
}
