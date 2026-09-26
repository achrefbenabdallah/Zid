import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Screen } from '@/components/Screen';
import { useSession } from '@/features/auth/AuthProvider';
import { toggleFavorite } from '@/services/data';
import { FoodList } from './FoodList';
import { FoodForm, type FoodDraft } from './FoodForm';

export default function FoodsPage() {
  const { t } = useTranslation();
  const { uid } = useSession();
  const [editing, setEditing] = useState<FoodDraft | null>(null);

  return (
    <Screen
      title={t('foods.title')}
      actions={
        <button className="btn-primary py-2" onClick={() => setEditing({})}>
          <Plus size={16} /> {t('foods.add')}
        </button>
      }
    >
      <FoodList onSelect={(f) => setEditing(f)} onToggleFavorite={(f) => void toggleFavorite(uid, f.id, !f.favorite)} />
      <FoodForm initial={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}
