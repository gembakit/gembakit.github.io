import { useId, useMemo, useState, type ReactNode } from 'react';
import { BookA, BookOpenText, ChevronDown, Factory, Search, Signpost, Sigma, type LucideIcon } from 'lucide-react';
import { useI18n } from '../../i18n';
import { BigHeader, Screen } from '../../ui/Layout';
import { GLOSSARY_CATEGORIES, normalize, searchGlossary, type GlossaryCategory } from '../../reference/glossary';
import { guideFor } from '../../reference/guide';
import { MyLines, useRecipeCount } from '../../recipes/RecipeUI';
import { NeedsList, ToolChip } from '../../projects/ProjectPanels';
import { NEEDS } from '../../projects/phaseGuide';
import { TOOLS } from '../../tools/registry';

// Qué bloques dejó abiertos el usuario: se recuerda mientras la app está abierta.
const remembered = { guide: false, glossary: false, lines: false, decide: false, formulas: false };

/** Fórmulas de cada herramienta que tiene cálculo (las de documento no tienen). */
function toolFormulas(tools: unknown): { id: string; lines: string[] }[] {
  const all = tools as Record<string, { formula?: unknown }>;
  return TOOLS.flatMap((tool) => {
    const f = all[tool.id]?.formula;
    return Array.isArray(f) && f.length > 0 ? [{ id: tool.id, lines: f as string[] }] : [];
  });
}

/** Bloque plegable de la pantalla (Guía de uso, Glosario): cerrado por defecto. */
function Block({ icon: Icon, title, count, open, onToggle, children }: { icon: LucideIcon; title: string; count: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  const panelId = useId();
  return (
    <section className="raised overflow-hidden rounded-[20px]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="grid min-h-16 w-full grid-cols-[24px_minmax(0,1fr)_22px] items-center gap-3 px-4 py-3 text-left"
      >
        <Icon aria-hidden size={23} className="text-accent-ink" />
        <span className="min-w-0">
          <span className="block font-display text-[19px] leading-tight font-bold">{title}</span>
          <span className="block text-[13.5px] text-muted">{count}</span>
        </span>
        <ChevronDown aria-hidden size={22} className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={panelId} className="border-t border-line">
          {children}
        </div>
      )}
    </section>
  );
}

/** Fila plegable: título (y subtítulo) siempre visibles, contenido al tocar. */
function Fold({ title, aside, subtitle, open, onToggle, children }: { title: string; aside?: string; subtitle?: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  const panelId = useId();
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="grid min-h-[60px] w-full grid-cols-[minmax(0,1fr)_24px] items-center gap-3 px-4 py-2.5 text-left"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-[17px] font-bold">{title}</span>
            {aside && <span className="text-[12px] font-semibold text-muted">{aside}</span>}
          </span>
          {subtitle && <span className="block text-[13.5px] leading-snug text-muted">{subtitle}</span>}
        </span>
        <ChevronDown aria-hidden size={20} className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-2.5 px-4 pb-4 text-[15.5px] leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

function useOpenSet() {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return [open, toggle] as const;
}

export function ReferenceScreen() {
  const { t, lang } = useI18n();
  const searchId = useId();
  const categoryId = useId();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<GlossaryCategory | ''>('');
  const [openTerms, toggleTerm] = useOpenSet();
  const [openTopics, toggleTopic] = useOpenSet();
  const list = useMemo(() => searchGlossary(q, lang, cat || undefined), [q, lang, cat]);
  // Se abre sola la definición si solo hay un resultado o si el primero es justo lo buscado.
  const autoOpen = q.trim() !== '' && list.length > 0 && (list.length === 1 || normalize(list[0]![lang].term) === normalize(q.trim())) ? list[0]!.id : null;
  // Búsqueda con la que el usuario cerró la definición abierta sola: así se puede volver a plegar.
  const [dismissed, setDismissed] = useState<string | null>(null);
  const termOpen = (id: string) => openTerms.has(id) || (id === autoOpen && dismissed !== q);
  const toggleOpenTerm = (id: string) => {
    if (termOpen(id) && id === autoOpen) {
      setDismissed(q);
      if (openTerms.has(id)) toggleTerm(id);
    } else toggleTerm(id);
  };
  const guide = useMemo(() => guideFor(lang), [lang]);
  const total = useMemo(() => searchGlossary('', lang).length, [lang]);
  const [openGuide, setOpenGuide] = useState(remembered.guide);
  const [openGlossary, setOpenGlossary] = useState(remembered.glossary);
  const toggleGuide = () => setOpenGuide((v) => (remembered.guide = !v));
  const toggleGlossary = () => setOpenGlossary((v) => (remembered.glossary = !v));
  const [openLines, setOpenLines] = useState(remembered.lines);
  const toggleLines = () => setOpenLines((v) => (remembered.lines = !v));
  const recipeCount = useRecipeCount();
  const [openDecide, setOpenDecide] = useState(remembered.decide);
  const toggleDecide = () => setOpenDecide((v) => (remembered.decide = !v));
  const [openFormulas, setOpenFormulas] = useState(remembered.formulas);
  const toggleFormulas = () => setOpenFormulas((v) => (remembered.formulas = !v));
  const [openTools, toggleTool] = useOpenSet();
  const formulas = useMemo(() => toolFormulas(t.tools), [t]);
  const r = t.projectPlus.ref;

  return (
    <Screen>
      <BigHeader title={t.reference.title} />

      <Block icon={Signpost} title={r.decide} count={r.decideCount(NEEDS.length)} open={openDecide} onToggle={toggleDecide}>
        <p className="border-b border-line px-4 py-3 text-[14.5px] leading-relaxed text-muted">{r.decideHint}</p>
        <div className="px-4">
          <NeedsList />
        </div>
      </Block>

      <Block icon={Sigma} title={r.formulas} count={r.formulasCount(formulas.length)} open={openFormulas} onToggle={toggleFormulas}>
        {formulas.map((f) => {
          const tool = TOOLS.find((x) => x.id === f.id)!;
          return (
            <Fold key={f.id} title={tool.text(t).name} open={openTools.has(f.id)} onToggle={() => toggleTool(f.id)}>
              <ul className="flex flex-col gap-1.5 rounded-[14px] bg-surface-2 p-3.5 text-[14.5px] font-semibold">
                {f.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <div>
                <ToolChip toolId={f.id} />
              </div>
            </Fold>
          );
        })}
        <p className="border-t border-line px-4 py-3 text-[13.5px] text-muted">{r.formulasMore}</p>
      </Block>

      <Block icon={Factory} title={t.recipes.title} count={t.recipes.count(recipeCount ?? 0)} open={openLines} onToggle={toggleLines}>
        <p className="border-b border-line px-4 py-3 text-[14.5px] leading-relaxed text-muted">{t.recipes.intro}</p>
        <MyLines />
      </Block>

      <Block icon={BookOpenText} title={t.reference.guide} count={t.reference.topics(guide.length)} open={openGuide} onToggle={toggleGuide}>
        {guide.map((g) => (
          <Fold key={g.id} title={g.text.title} open={openTopics.has(g.id)} onToggle={() => toggleTopic(g.id)}>
            {g.text.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </Fold>
        ))}
        <p className="border-t border-line px-4 py-3 text-[13.5px] text-muted">{t.reference.guideMore}</p>
      </Block>

      <Block icon={BookA} title={t.reference.glossary} count={t.reference.count(total)} open={openGlossary} onToggle={toggleGlossary}>
        <div className="flex flex-col gap-3 p-4">
          <label htmlFor={searchId} className="flex h-[50px] items-center gap-2.5 rounded-[15px] bg-surface-2 px-3.5 text-muted shadow-[inset_0_1px_2px_rgb(0_0_0/0.08)]">
            <Search aria-hidden size={20} />
            <input
              id={searchId}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.reference.search}
              className="min-w-0 flex-1 bg-transparent text-[16px] text-text outline-none placeholder:text-muted"
            />
          </label>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            <label htmlFor={categoryId} className="text-[14px] font-semibold text-muted">
              {t.reference.category}
            </label>
            <div className="relative">
              <select
                id={categoryId}
                value={cat}
                onChange={(e) => setCat(e.target.value as GlossaryCategory | '')}
                className="h-12 w-full appearance-none rounded-[15px] border-[1.5px] border-line bg-surface pr-10 pl-3.5 text-[16px] text-text outline-none focus:border-accent"
              >
                <option value="">{t.reference.allCategories}</option>
                {GLOSSARY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t.reference.categories[c]}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden size={20} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
            </div>
          </div>
          {list.length !== total && <p className="text-[13.5px] text-muted">{t.reference.count(list.length)}</p>}
          {list.length === 0 && <p className="text-[15px] text-muted">{t.reference.noResults(q.trim())}</p>}
        </div>
        {list.length > 0 && (
          <div className="border-t border-line">
            {list.map((g) => (
              <Fold
                key={g.id}
                title={g[lang].term}
                aside={t.reference.categories[g.category]}
                subtitle={g[lang].name}
                open={termOpen(g.id)}
                onToggle={() => toggleOpenTerm(g.id)}
              >
                <p>{g[lang].def}</p>
              </Fold>
            ))}
          </div>
        )}
        <p className="border-t border-line px-4 py-3 text-[13.5px] text-muted">{t.reference.more}</p>
      </Block>
    </Screen>
  );
}
