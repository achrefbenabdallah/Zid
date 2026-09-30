import { useTranslation } from 'react-i18next';

const EQUIPMENT_KEY: Record<string, string> = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  cable: 'cable',
  machine: 'machine',
  'body only': 'bodyOnly',
  'e-z curl bar': 'ezBar',
  kettlebells: 'kettlebells',
};

/** Dataset equipment names ("body only", "e-z curl bar"…) → translated label. */
export function useEquipmentLabel() {
  const { t } = useTranslation();
  return (eq: string) => t(`equipment.${EQUIPMENT_KEY[eq] ?? 'other'}`);
}
