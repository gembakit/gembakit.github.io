import { useCallback } from 'react';
import { FileText } from 'lucide-react';
import { useI18n } from '../../i18n';
import { DocTool } from '../doc/DocTool';
import type { DocData } from '../doc/types';
import { A3, a3Analyze, a3Example } from './model';

export default function A3Tool() {
  const { t, lang } = useI18n();
  const analyze = useCallback((d: DocData) => a3Analyze(d, t, lang), [t, lang]);
  return <DocTool toolId="a3" schema={A3} texts={t.tools.a3} exampleIcon={FileText} example={() => a3Example(t)} analyze={analyze} />;
}
