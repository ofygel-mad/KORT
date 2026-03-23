import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy } from 'lucide-react';
import { useDealsStore } from '../../model/deals.store';
import { useTileDealsUI } from '../../model/tile-ui.store';
import s from './Modals.module.css';

interface Props { tileId: string; }

export function WonModal({ tileId }: Props) {
  const { deals, markWon } = useDealsStore();
  const { wonModalId, closeWonModal } = useTileDealsUI(tileId);
  const deal = deals.find(d => d.id === wonModalId);

  const [value,     setValue]     = useState('');
  const [submitting,setSubmitting]= useState(false);

  useEffect(() => {
    if (deal) setValue(String(deal.value));
  }, [wonModalId]);

  if (!wonModalId || !deal) return null;

  const handleClose = () => { closeWonModal(); setValue(''); };

  const handleSubmit = async () => {
    const finalValue = parseInt(value.replace(/\D/g, ''), 10) || deal.value;
    setSubmitting(true);
    await markWon(wonModalId, finalValue, closeWonModal);
    setSubmitting(false);
    setValue('');
  };

  return (
    <AnimatePresence>
      {wonModalId && (
        <>
          <motion.div className={s.backdrop}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }} onClick={handleClose}
          />
          <div className={s.shell}>
            <motion.div className={`${s.modal} ${s.modalWon}`}
              initial={{ opacity: 0, scale: 0.88, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              <div className={s.header}>
                <div className={`${s.iconWrap} ${s.iconSuccess}`}>
                  <Trophy size={22} />
                </div>
                <div>
                  <div className={`${s.title} ${s.titleSuccess}`}>Сделка закрыта!</div>
                  <div className={s.sub}>{deal.fullName}</div>
                </div>
                <button className={s.closeBtn} onClick={handleClose}><X size={15} /></button>
              </div>

              <div className={s.body}>
                <div className={s.wonMessage}>
                  Подтвердите финальную сумму сделки. После закрытия сделка попадёт в архив выигранных.
                </div>

                <div className={s.field}>
                  <label className={s.fieldLabel}>Финальная сумма сделки (₸)</label>
                  <input
                    className={s.input}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    placeholder="800 000"
                    autoFocus
                  />
                </div>
              </div>

              <div className={s.footer}>
                <button className={s.cancelBtn} onClick={handleClose}>Отмена</button>
                <button
                  className={s.wonBtn}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  <Trophy size={13} />
                  {submitting ? 'Закрываю...' : 'Подтвердить победу'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
