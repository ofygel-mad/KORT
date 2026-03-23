import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, RotateCcw, Trash2 } from 'lucide-react';
import { useDealsStore } from '../../model/deals.store';
import { useTileDealsUI } from '../../model/tile-ui.store';
import { LOST_REASONS } from '../../api/types';
import s from './Modals.module.css';

interface Props { tileId: string; }

export function LostModal({ tileId }: Props) {
  const { deals, markLost } = useDealsStore();
  const { lostModalId, closeLostModal } = useTileDealsUI(tileId);
  const deal = deals.find(d => d.id === lostModalId);

  const [reason,    setReason]    = useState('');
  const [comment,   setComment]   = useState('');
  const [returnTo,  setReturnTo]  = useState(false);
  const [submitting,setSubmitting]= useState(false);

  if (!lostModalId || !deal) return null;

  const handleClose = () => {
    closeLostModal();
    setReason(''); setComment(''); setReturnTo(false);
  };

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    await markLost(lostModalId, reason, comment, returnTo, closeLostModal);
    setSubmitting(false);
    setReason(''); setComment(''); setReturnTo(false);
  };

  return (
    <AnimatePresence>
      {lostModalId && (
        <>
          <motion.div className={s.backdrop}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }} onClick={handleClose}
          />
          <div className={s.shell}>
            <motion.div className={s.modal}
              initial={{ opacity: 0, scale: 0.93, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            >
              <div className={s.header}>
                <div className={`${s.iconWrap} ${s.iconDanger}`}>
                  <AlertCircle size={20} />
                </div>
                <div>
                  <div className={s.title}>Сделка проиграна</div>
                  <div className={s.sub}>{deal.fullName} · {new Intl.NumberFormat('ru-RU').format(deal.value)} ₸</div>
                </div>
                <button className={s.closeBtn} onClick={handleClose}><X size={15} /></button>
              </div>

              <div className={s.body}>
                {/* Reason picker */}
                <div className={s.field}>
                  <label className={s.fieldLabel}>Причина слива *</label>
                  <div className={s.reasonGrid}>
                    {LOST_REASONS.map(r => (
                      <button
                        key={r}
                        className={`${s.reasonBtn} ${reason === r ? s.reasonBtnActive : ''}`}
                        onClick={() => setReason(r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div className={s.field}>
                  <label className={s.fieldLabel}>Комментарий (необязательно)</label>
                  <textarea
                    className={s.textarea}
                    placeholder="Подробнее о причине..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Return to leads toggle */}
                <div className={s.returnToggle} onClick={() => setReturnTo(v => !v)}>
                  <div className={`${s.toggle} ${returnTo ? s.toggleOn : ''}`}>
                    <div className={s.toggleThumb} />
                  </div>
                  <div>
                    <div className={s.toggleLabel}>
                      <RotateCcw size={12} /> Вернуть клиента в воронку лидов
                    </div>
                    <div className={s.toggleHint}>
                      Лид появится в «Новые» для повторной квалификации
                    </div>
                  </div>
                </div>
              </div>

              <div className={s.footer}>
                <button className={s.cancelBtn} onClick={handleClose}>Отмена</button>
                <button
                  className={s.dangerBtn}
                  onClick={handleSubmit}
                  disabled={!reason || submitting}
                >
                  <Trash2 size={13} />
                  {submitting ? 'Обрабатываю...' : 'Закрыть как слив'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
