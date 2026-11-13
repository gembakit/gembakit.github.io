import { useI18n } from '../../i18n';
import { BigHeader, Card, Label, Screen } from '../../ui/Layout';

export function ReferenceScreen() {
  const { t } = useI18n();
  const entries = Object.values(t.glossary);
  return (
    <Screen>
      <BigHeader title={t.reference.title} />
      <section className="flex flex-col gap-2.5">
        <Label>{t.reference.glossary}</Label>
        <Card className="gap-0 py-1">
          <dl>
            {entries.map((e) => (
              <div key={e.term} className="border-b border-line py-3.5 last:border-b-0">
                <dt className="font-display text-[17px] font-bold">{e.term}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-muted">{e.def}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <p className="text-[13.5px] text-muted">{t.reference.more}</p>
      </section>
    </Screen>
  );
}
