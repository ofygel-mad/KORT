import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { useDealsStore } from '../../model/deals.store';
import { useTileDealsUI } from '../../model/tile-ui.store';
import s from './Modals.module.css';

interface Props { tileId: string; }

export function DeleteConfirmModal({ tileId }: Props) {
  const { deals, deleteDeal } = useDealsStore();
  const { deleteConfirmId, closeDeleteConfirm, closeDrawer } = useTileDealsUI(tileId);
  const deal = deals.find(d => d.id === deleteConfirmId);

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    closeDrawer();
    await deleteDeal(deleteConfirmId, closeDeleteConfirm);
  };

  return (
    <AnimatePresence>
      {deleteConfirmId && deal && (
        <>
          <motion.div className={s.backdrop}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeDeleteConfirm}
          />
          <div className={s.shell}>
            <motion.div className={s.modal}
              initial={{ opacity: 0, scale: 0.93, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              style={{ maxWidth: 400 }}
            >
              <div className={s.header}>
                <div className={`${s.iconWrap} ${s.iconDanger}`}>
                  <Trash2 size={18} />
                </div>
                <div>
                  <div className={s.title}>Удалить сделку?</div>
                  <div className={s.sub}>{deal.fullName} · {new Intl.NumberFormat('ru-RU').format(deal.value)} ₸</div>
                </div>
                <button className={s.closeBtn} onClick={closeDeleteConfirm}><X size={14} /></button>
              </div>
              <div className={s.body}>
                <div className={`${s.wonMessage} ${s.warningMessage}`}>
                  Сделка будет удалена безвозвратно. Вся история активности и задачи будут потеряны.
                </div>
              </div>
              <div className={s.footer}>
                <button className={s.cancelBtn} onClick={closeDeleteConfirm}>Отмена</button>
                <button className={s.dangerBtn} onClick={handleDelete}>
                  <Trash2 size={12} /> Удалить
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
