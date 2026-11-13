import { useId, useMemo, useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { useI18n } from '../../i18n';
import { BigHeader, Label, Screen } from '../../ui/Layout';
import { TOOLS } from '../../tools/registry';
import { CATEGORIES } from '../../tools/types';

function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function ToolsScreen() {
  const { t } = useI18n();
  const searchId = useId();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const nq = normalize(q.trim());
    return TOOLS.filter((tool) => {
      const { name, summary } = tool.text(t);
      return !nq || normalize(`${name} ${summary}`).includes(nq);
    });
  }, [q, t]);

  return (
    <Screen>
      <BigHeader title={t.tools.title} />
      <label htmlFor={searchId} className="flex h-[50px] items-center gap-2.5 rounded-[15px] bg-surface-2 px-3.5 text-muted shadow-[inset_0_1px_2px_rgb(0_0_0/0.08)]">
        <Search aria-hidden size={20} />
        <input
          id={searchId}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.tools.search}
          className="min-w-0 flex-1 bg-transparent text-[16px] text-text outline-none placeholder:text-muted"
        />
      </label>
      {list.length === 0 && <p className="text-[15px] text-muted">{t.tools.noResults(q.trim())}</p>}
      {CATEGORIES.map((cat) => {
        const tools = list.filter((x) => x.category === cat);
        if (tools.length === 0) return null;
        return (
          <section key={cat} className="flex flex-col gap-2.5">
            <Label>{t.tools.categories[cat]}</Label>
            {tools.map((tool) => {
              const { name, summary } = tool.text(t);
              return (
                <a key={tool.id} href={`#/herramientas/${tool.id}`} className="press raised grid grid-cols-[44px_minmax(0,1fr)_20px] items-center gap-3 rounded-[18px] p-3">
                  <span className="grid size-11 place-items-center rounded-[13px] bg-soft text-accent-ink">
                    <tool.icon aria-hidden size={21} strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15.5px] leading-snug font-semibold">{name}</span>
                    <span className="block text-[13px] leading-snug text-muted">{summary}</span>
                  </span>
                  <ChevronRight aria-hidden size={20} className="text-faint" />
                </a>
              );
            })}
          </section>
        );
      })}
    </Screen>
  );
}
