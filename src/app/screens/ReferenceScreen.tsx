import { useId, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useI18n } from '../../i18n';
import { BigHeader, Label, Screen } from '../../ui/Layout';
import { searchGlossary } from '../../reference/glossary';
import { guideFor } from '../../reference/guide';

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
  const [q, setQ] = useState('');
  const [openTerms, toggleTerm] = useOpenSet();
  const [openTopics, toggleTopic] = useOpenSet();
  const list = useMemo(() => searchGlossary(q, lang), [q, lang]);
  const guide = useMemo(() => guideFor(lang), [lang]);

  return (
    <Screen>
      <BigHeader title={t.reference.title} />

      <section className="flex flex-col gap-2.5">
        <Label>{t.reference.guide}</Label>
        <div className="raised overflow-hidden rounded-[20px]">
          {guide.map((g) => (
            <Fold key={g.id} title={g.text.title} open={openTopics.has(g.id)} onToggle={() => toggleTopic(g.id)}>
              {g.text.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </Fold>
          ))}
        </div>
        <p className="text-[13.5px] text-muted">{t.reference.guideMore}</p>
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label>{t.reference.glossary}</Label>
          <span className="text-[13px] text-muted">{t.reference.count(list.length)}</span>
        </div>
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
        {list.length === 0 ? (
          <p className="text-[15px] text-muted">{t.reference.noResults(q.trim())}</p>
        ) : (
          <div className="raised overflow-hidden rounded-[20px]">
            {list.map((g) => (
              <Fold
                key={g.id}
                title={g[lang].term}
                aside={t.reference.categories[g.category]}
                subtitle={g[lang].name}
                open={openTerms.has(g.id) || (q.trim() !== '' && list.length === 1)}
                onToggle={() => toggleTerm(g.id)}
              >
                <p>{g[lang].def}</p>
              </Fold>
            ))}
          </div>
        )}
        <p className="text-[13.5px] text-muted">{t.reference.more}</p>
      </section>
    </Screen>
  );
}
