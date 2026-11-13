import { useCallback, useId, useState, type ReactNode } from 'react';
import type { SheetDef } from '../sheet/types';
import { ExportPanel } from './ExportPanel';
import { BookOpenText, ChevronDown, FolderPlus, Share, SquareFunction, TriangleAlert, Lightbulb } from 'lucide-react';
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
  guide,
  sheet,
}: {
  name: string;
  subtitle?: string;
  data: ReactNode;
  hasData: boolean;
  onLoadExample: () => void;
  result: ReactNode | null;
  reading: Reading | null;
  formula: ReactNode;
  /** Pasos de «Cómo usarla», plegados al abrir la herramienta. */
  guide?: string[];
  /** Hoja de la herramienta con los datos actuales, para exportarla. */
  sheet?: () => SheetDef | null;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [showFormula, setShowFormula] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const closeExport = useCallback(() => setExportOpen(false), []);
  const [showGuide, setShowGuide] = useState(false);
  const guideId = useId();

  return (
    <Screen wide>
      <DetailHeader title={name} subtitle={subtitle} onBack={() => navigate('/herramientas')} backLabel={t.common.back} />
      {guide && guide.length > 0 && (
        <section className="raised overflow-hidden rounded-[20px]">
          <button
            type="button"
            aria-expanded={showGuide}
            aria-controls={guideId}
            onClick={() => setShowGuide((v) => !v)}
            className="grid min-h-14 w-full grid-cols-[22px_minmax(0,1fr)_22px] items-center gap-3 px-4 py-2 text-left"
          >
            <BookOpenText aria-hidden size={22} className="text-accent-ink" />
            <span className="text-[15.5px] font-semibold">{t.template.howTo}</span>
            <ChevronDown aria-hidden size={20} className={`text-muted transition-transform duration-200 ${showGuide ? 'rotate-180' : ''}`} />
          </button>
          {showGuide && (
            <ol id={guideId} className="flex flex-col gap-3 px-4 pb-4">
              {guide.map((step, i) => (
                <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3 text-[15px] leading-relaxed">
                  <span aria-hidden className="grid size-7 place-items-center rounded-full bg-soft text-[13px] font-bold text-accent-ink">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
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
                <Button icon={Share} onClick={() => (sheet ? setExportOpen(true) : toast(t.template.exportLater))}>
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
      {sheet && <ExportPanel open={exportOpen} onClose={closeExport} build={sheet} />}
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
