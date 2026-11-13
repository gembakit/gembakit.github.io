import { useCallback, useState } from 'react';
import { useI18n, type Messages } from '../i18n';
import { Sheet } from './Sheet';

export type GlossaryKey = keyof Messages['glossary'];

/** Sigla tocable: al tocarla se abre su definición (CLAUDE.md, diseño móvil). */
export function Acronym({ k }: { k: GlossaryKey }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const entry = t.glossary[k];
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline cursor-help font-[inherit] text-[inherit] underline decoration-dotted decoration-[1.5px] underline-offset-[3px]"
      >
        {entry.term}
      </button>
      <Sheet open={open} onClose={close} title={entry.term}>
        <p className="text-[16px] leading-relaxed">{entry.def}</p>
      </Sheet>
    </>
  );
}
