import { useCallback, useState } from 'react';
import { useI18n } from '../i18n';
import { findTerm } from '../reference/glossary';
import { Sheet } from './Sheet';

/** Sigla tocable: al tocarla se abre su definición (CLAUDE.md, diseño móvil). */
export function Acronym({ id }: { id: string }) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const entry = findTerm(id);
  if (!entry) return <>{id}</>;
  const e = entry[lang];
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline cursor-help font-[inherit] text-[inherit] underline decoration-dotted decoration-[1.5px] underline-offset-[3px]"
      >
        {e.term}
      </button>
      <Sheet open={open} onClose={close} title={e.term}>
        <p className="font-semibold text-muted">{e.name}</p>
        <p className="text-[16px] leading-relaxed">{e.def}</p>
      </Sheet>
    </>
  );
}
