import { useState, type ReactNode } from 'react';
import { FolderPlus, Share, SquareFunction, TriangleAlert, Lightbulb } from 'lucide-react';
import { useI18n } from '../i18n';
import { Button } from './Button';
import { BottomAction, Card, DetailHeader, Label, Screen } from './Layout';
import { useToast } from './Toast';
import { navigate } from '../app/router';

export interface Reading {
  /** Conclusión en una frase. */
  conclusion: ReactNode;
  warnings: ReactNode[];
  typicalError: ReactNode;
}

/**
 * Plantilla única de herramienta (CLAUDE.md): Datos → Resultado → Cómo leerlo → Acciones.
 * En pantallas anchas, datos a la izquierda y resultado a la derecha.
 */
export function ToolTemplate({
  name,
  subtitle,
  data,
  hasData,
  onLoadExample,
  result,
  reading,
  formula,
}: {
  name: string;
  subtitle?: string;
  data: ReactNode;
  hasData: boolean;
  onLoadExample: () => void;
  result: ReactNode | null;
  reading: Reading | null;
  formula: ReactNode;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [showFormula, setShowFormula] = useState(false);

  return (
    <Screen wide>
      <DetailHeader title={name} subtitle={subtitle} onBack={() => navigate('/herramientas')} backLabel={t.common.back} />
      <div className="grid items-start gap-4 md:grid-cols-2">
        <Card>
          <Label>1 · {t.template.data}</Label>
          {data}
        </Card>
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <Label>2 · {t.template.result}</Label>
            {result}
          </Card>
          {reading && (
            <Card>
              <Label>3 · {t.template.reading}</Label>
              <p className="text-[16.5px] leading-relaxed">{reading.conclusion}</p>
              {reading.warnings.map((w, i) => (
                <p key={i} className="flex items-start gap-2.5 rounded-[14px] bg-warn-soft p-3 text-[14px] text-text">
                  <TriangleAlert aria-hidden size={18} className="mt-0.5 shrink-0 text-warn" />
                  <span>{w}</span>
                </p>
              ))}
              <p className="flex items-start gap-2.5 rounded-[14px] bg-soft p-3 text-[14px] text-text">
                <Lightbulb aria-hidden size={18} className="mt-0.5 shrink-0 text-accent-ink" />
                <span>{reading.typicalError}</span>
              </p>
            </Card>
          )}
          {hasData && (
            <Card>
              <Label>4 · {t.template.actions}</Label>
              <div className="grid grid-cols-2 gap-2.5">
                <Button icon={Share} onClick={() => toast(t.template.exportLater)}>
                  {t.template.export}
                </Button>
                <Button icon={SquareFunction} aria-expanded={showFormula} onClick={() => setShowFormula((v) => !v)}>
                  {showFormula ? t.template.hideFormula : t.template.showFormula}
                </Button>
              </div>
              {showFormula && <div className="rounded-[14px] bg-surface-2 p-3.5 text-[14.5px]">{formula}</div>}
            </Card>
          )}
        </div>
      </div>
      <BottomAction>
        {hasData ? (
          <Button variant="primary" icon={FolderPlus} className="w-full" onClick={() => toast(t.template.saveLater)}>
            {t.template.saveToProject}
          </Button>
        ) : (
          <Button variant="primary" className="w-full" onClick={onLoadExample}>
            {t.common.loadExample}
          </Button>
        )}
      </BottomAction>
    </Screen>
  );
}
