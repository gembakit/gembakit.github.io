import { useId } from 'react';
import { Check, X } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Analysis, Project } from '../data/db';
import { findTool } from '../tools/registry';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Field, inputClass } from './SaveSheet';
import { activeFilters, canSortByResult, filterMeasurements, filterOptions, fixSort, NO_FILTER, type MeasurementFilter, type SortBy } from './filter';

/**
 * Filtrar por herramienta, fase y contexto, y ordenar por fecha o resultado.
 * Los cambios se aplican al momento; el botón dice cuántas quedan.
 */
export function FilterSheet({
  open,
  onClose,
  project,
  list,
  filter,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  project: Project;
  list: Analysis[];
  filter: MeasurementFilter;
  onChange: (f: MeasurementFilter) => void;
}) {
  const { t } = useI18n();
  const fl = t.projects.filter;
  const ids = useId();
  const options = filterOptions(list, project.type, project.fields);
  const shown = filterMeasurements(list, filter);
  const byResult = canSortByResult(shown);
  const set = (patch: Partial<MeasurementFilter>) => onChange(fixSort(list, { ...filter, ...patch }));
  const sorts: SortBy[] = byResult ? ['date-desc', 'date-asc', 'result-desc', 'result-asc'] : ['date-desc', 'date-asc'];

  return (
    <Sheet open={open} onClose={onClose} title={fl.title}>
      {options.tools.length > 1 && (
        <Field label={fl.tool} htmlFor={`${ids}t`}>
          <select id={`${ids}t`} className={inputClass} value={filter.toolId} onChange={(e) => set({ toolId: e.target.value })}>
            <option value="">{fl.all}</option>
            {options.tools.map((id) => (
              <option key={id} value={id}>
                {findTool(id)?.text(t).name ?? id}
              </option>
            ))}
          </select>
        </Field>
      )}
      {options.phases.length > 1 && (
        <Field label={fl.phase} htmlFor={`${ids}p`}>
          <select id={`${ids}p`} className={inputClass} value={filter.phase} onChange={(e) => set({ phase: e.target.value })}>
            <option value="">{fl.all}</option>
            {options.phases.map((ph) => (
              <option key={ph} value={ph}>
                {t.projects.phases[ph] ?? ph}
              </option>
            ))}
          </select>
        </Field>
      )}
      {project.fields
        .filter((f) => options.context[f.id])
        .map((f) => (
          <Field key={f.id} label={f.label} htmlFor={`${ids}c${f.id}`}>
            <select
              id={`${ids}c${f.id}`}
              className={inputClass}
              value={filter.context[f.id] ?? ''}
              onChange={(e) => set({ context: { ...filter.context, [f.id]: e.target.value } })}
            >
              <option value="">{fl.any}</option>
              {options.context[f.id]!.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        ))}
      <Field label={fl.sort} htmlFor={`${ids}s`}>
        <select id={`${ids}s`} className={inputClass} value={filter.sort} onChange={(e) => set({ sort: e.target.value as SortBy })}>
          {sorts.map((s) => (
            <option key={s} value={s}>
              {fl.sorts[s]}
            </option>
          ))}
        </select>
      </Field>
      {!byResult && <p className="text-[13.5px] leading-relaxed text-muted">{fl.resultHint}</p>}
      <div className="flex flex-col gap-2">
        <Button variant="primary" icon={Check} className="w-full" onClick={onClose}>
          {fl.show(shown.length)}
        </Button>
        {activeFilters(filter) > 0 && (
          <Button variant="ghost" icon={X} className="self-start" onClick={() => onChange({ ...NO_FILTER, sort: fixSort(list, { ...NO_FILTER, sort: filter.sort }).sort })}>
            {fl.clear}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
