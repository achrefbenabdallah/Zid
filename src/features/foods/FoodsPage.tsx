import { useTranslation } from 'react-i18next';
import { Screen, Empty } from '@/components/Screen';

// Placeholder — implemented in a later build stage.
export default function FoodsPage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('foods.title')}>
      <Empty>Coming soon</Empty>
    </Screen>
  );
}
