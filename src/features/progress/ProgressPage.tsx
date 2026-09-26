import { useTranslation } from 'react-i18next';
import { Screen, Empty } from '@/components/Screen';

// Placeholder — implemented in a later build stage.
export default function ProgressPage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('nav.progress')}>
      <Empty>Coming soon</Empty>
    </Screen>
  );
}
