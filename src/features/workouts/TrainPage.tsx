import { useTranslation } from 'react-i18next';
import { Screen, Empty } from '@/components/Screen';

// Placeholder — implemented in a later build stage.
export default function TrainPage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('nav.train')}>
      <Empty>Coming soon</Empty>
    </Screen>
  );
}
