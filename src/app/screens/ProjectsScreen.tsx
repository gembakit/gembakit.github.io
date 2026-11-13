import { FolderPlus, LayoutGrid } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Button, IconButton } from '../../ui/Button';
import { BigHeader, Card, Screen } from '../../ui/Layout';
import { useToast } from '../../ui/Toast';
import { navigate } from '../router';

export function ProjectsScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const soon = () => toast(t.common.comingInPhase(6));
  return (
    <Screen>
      <BigHeader title={t.projects.title} right={<IconButton icon={FolderPlus} label={t.projects.newProject} onClick={soon} />} />
      <Card className="items-start gap-3 py-6">
        <span className="grid size-14 place-items-center rounded-[16px] bg-soft text-accent-ink">
          <FolderPlus aria-hidden size={26} strokeWidth={1.8} />
        </span>
        <h2 className="font-display text-[20px] font-bold tracking-tight">{t.projects.emptyTitle}</h2>
        <p className="text-[15px] leading-relaxed text-muted">{t.projects.emptyBody}</p>
        <div className="mt-1 flex w-full flex-col gap-2.5 sm:flex-row">
          <Button variant="primary" icon={FolderPlus} onClick={soon} className="w-full sm:w-auto">
            {t.projects.newProject}
          </Button>
          <Button icon={LayoutGrid} onClick={() => navigate('/herramientas')} className="w-full sm:w-auto">
            {t.projects.openTools}
          </Button>
        </div>
      </Card>
    </Screen>
  );
}
