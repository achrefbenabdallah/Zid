import { useTranslation } from 'react-i18next';
import { Screen, Empty } from '@/components/Screen';

// Placeholder — implemented in a later build stage.
export default function SessionPage() {
  const { t } = useTranslation();
  return (
    <Screen title={t('nav.train')} back>
      <Empty>Coming soon</Empty>
    </Screen>
  );
}
