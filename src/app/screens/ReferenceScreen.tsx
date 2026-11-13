import { useId, useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useI18n } from '../../i18n';
import { BigHeader, Label, Screen } from '../../ui/Layout';
import { searchGlossary, type GlossaryEntry } from '../../reference/glossary';

function Term({ entry, open, onToggle }: { entry: GlossaryEntry; open: boolean; onToggle: () => void }) {
  const { lang, t } = useI18n();
  const e = entry[lang];
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
            <span className="font-display text-[17px] font-bold">{e.term}</span>
            <span className="text-[12px] font-semibold text-muted">{t.reference.categories[entry.category]}</span>
          </span>
          <span className="block text-[13.5px] leading-snug text-muted">{e.name}</span>
        </span>
        <ChevronDown aria-hidden size={20} className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p id={panelId} className="px-4 pb-4 text-[15.5px] leading-relaxed">
          {e.def}
        </p>
      )}
    </div>
  );
}

export function ReferenceScreen() {
  const { t, lang } = useI18n();
  const searchId = useId();
  const [q, setQ] = useState('');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const list = useMemo(() => searchGlossary(q, lang), [q, lang]);
  const toggle = (id: string) =>
    setOpenIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <Screen>
      <BigHeader title={t.reference.title} />
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
      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label>{t.reference.glossary}</Label>
          <span className="text-[13px] text-muted">{t.reference.count(list.length)}</span>
        </div>
        {list.length === 0 ? (
          <p className="text-[15px] text-muted">{t.reference.noResults(q.trim())}</p>
        ) : (
          <div className="raised overflow-hidden rounded-[20px]">
            {list.map((g) => (
              <Term key={g.id} entry={g} open={openIds.has(g.id) || (q.trim() !== '' && list.length === 1)} onToggle={() => toggle(g.id)} />
            ))}
          </div>
        )}
        <p className="text-[13.5px] text-muted">{t.reference.more}</p>
      </section>
    </Screen>
  );
}
