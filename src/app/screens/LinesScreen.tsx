import { useI18n } from '../../i18n';
import { DetailHeader, Screen } from '../../ui/Layout';
import { MyLines } from '../../recipes/RecipeUI';
import { navigate } from '../router';

/** Ajustes › Mis líneas: las recetas de cada línea, por planta y línea. */
export function LinesScreen() {
  const { t } = useI18n();
  return (
    <Screen>
      <DetailHeader title={t.recipes.title} onBack={() => navigate('/ajustes')} backLabel={t.common.back} />
      <p className="px-1 text-[15px] leading-relaxed text-muted">{t.recipes.intro}</p>
      <section className="raised overflow-hidden rounded-[20px]">
        <MyLines />
      </section>
    </Screen>
  );
}
