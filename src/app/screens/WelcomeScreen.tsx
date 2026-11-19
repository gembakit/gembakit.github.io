import { ArrowRight } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Button } from '../../ui/Button';
import { Card, Label, Screen } from '../../ui/Layout';
import { markWelcomeDone } from '../../google/account';
import { GoogleAccountPanel, useGoogleAccount } from '../GoogleAccount';

/**
 * Bienvenida: sale la primera vez que se abre la app sin cuenta conectada
 * (y en `#/bienvenida`). Conectar Google es opcional: la app funciona
 * entera sin cuenta (CLAUDE.md, restricción 1).
 */
export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const a = t.account;
  const account = useGoogleAccount();
  const finish = () => {
    markWelcomeDone();
    onDone();
  };
  return (
    <Screen>
      <header className="flex flex-col items-start gap-4 pt-6 pb-1">
        <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width={64} height={64} className="size-16 rounded-[18px]" />
        <div>
          <h1 className="font-display text-[30px] leading-[1.1] font-bold tracking-tight">{a.welcomeTitle}</h1>
          <p className="mt-2 text-[15.5px] leading-relaxed text-muted">{a.welcomeBody}</p>
        </div>
      </header>

      <section className="flex flex-col gap-2.5">
        <Label>{a.title}</Label>
        <Card>
          <p className="text-[15px] leading-relaxed">{a.why}</p>
          <GoogleAccountPanel onboarding />
        </Card>
      </section>

      {account ? (
        <Button variant="primary" icon={ArrowRight} onClick={finish} className="w-full">
          {a.start}
        </Button>
      ) : (
        <div className="flex flex-col items-center gap-1 text-center">
          <Button variant="ghost" onClick={finish}>
            {a.skip}
          </Button>
          <p className="text-[13.5px] leading-relaxed text-muted">{a.skipHint}</p>
        </div>
      )}
    </Screen>
  );
}
